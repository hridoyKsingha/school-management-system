import 'dotenv/config';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import mongoose from 'mongoose';

const databaseName = `school_uat_${new Date().toISOString().slice(0, 10).replaceAll('-', '')}_${crypto.randomBytes(4).toString('hex')}`;
let server;
let cleanupComplete = false;
let passed = 0;
let cloudinary;
let cloudinaryPublicId;
let cloudinaryTestFailure = false;

function pass(label) {
  passed += 1;
  console.log(`PASS ${label}`);
}

async function connectToIsolatedDatabase() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not configured.');
  await mongoose.connect(process.env.MONGODB_URI, {
    dbName: databaseName,
    serverSelectionTimeoutMS: 15000,
  });
  if (mongoose.connection.db.databaseName !== databaseName || !databaseName.startsWith('school_uat_')) {
    throw new Error('Refusing to run UAT against a non-isolated database.');
  }
}

async function main() {
  await connectToIsolatedDatabase();
  process.env.JWT_SECRET = crypto.randomBytes(32).toString('hex');

  const { default: Admin } = await import('../src/models/Admin.js');
  const { default: Student } = await import('../src/models/Student.js');
  const { default: Teacher } = await import('../src/models/Teacher.js');
  const { default: SchoolClass } = await import('../src/models/SchoolClass.js');
  const { default: Attendance } = await import('../src/models/Attendance.js');
  const { default: Result } = await import('../src/models/Result.js');
  const { default: Subject } = await import('../src/models/Subject.js');
  const { default: Routine } = await import('../src/models/Routine.js');
  const { default: Notice } = await import('../src/models/Notice.js');
  const { default: Notification } = await import('../src/models/Notification.js');
  const { default: AuditLog } = await import('../src/models/AuditLog.js');
  await Promise.all([
    Admin.init(), Student.init(), Teacher.init(), SchoolClass.init(), Attendance.init(), Result.init(),
    Subject.init(), Routine.init(), Notice.init(), Notification.init(), AuditLog.init(),
  ]);

  const { default: app } = await import('../src/app.js');
  server = app.listen(0);
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });

  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const api = async (method, path, { token, body } = {}) => {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    let data = null;
    try { data = await response.json(); } catch { /* Preserve status for non-JSON failures. */ }
    return { status: response.status, data };
  };
  const expect = async (label, method, path, status, options) => {
    const result = await api(method, path, options);
    assert.equal(result.status, status, `${label}: unexpected HTTP status`);
    pass(label);
    return result.data;
  };

  const suffix = crypto.randomBytes(4).toString('hex').toUpperCase();
  const adminPassword = crypto.randomBytes(18).toString('base64url');
  let currentAdminPassword = adminPassword;
  let adminEmail = `uat-admin-${suffix.toLowerCase()}@example.invalid`;
  await expect('health endpoint', 'GET', '/api/health', 200);
  await expect('initial admin registration', 'POST', '/api/auth/register', 201, {
    body: { name: 'UAT Administrator', email: adminEmail, password: adminPassword },
  });
  const adminLogin = await expect('admin login', 'POST', '/api/auth/login', 200, {
    body: { email: adminEmail, password: adminPassword },
  });
  assert.ok(adminLogin.token);
  let adminToken = adminLogin.token;
  await expect('duplicate administrator registration disabled', 'POST', '/api/auth/register', 403, {
    body: { name: 'Second UAT Administrator', email: `second-${adminEmail}`, password: adminPassword },
  });
  await expect('invalid credentials rejected', 'POST', '/api/auth/login', 401, {
    body: { email: adminEmail, password: 'incorrect-uat-password' },
  });
  await expect('protected endpoint rejects missing token', 'GET', '/api/students', 401);
  await expect('administrator profile', 'GET', '/api/admin/profile', 200, { token: adminToken });
  const nextAdminPassword = crypto.randomBytes(18).toString('base64url');
  await expect('administrator change password', 'PUT', '/api/auth/change-password', 200, {
    token: adminToken,
    body: { currentPassword: currentAdminPassword, newPassword: nextAdminPassword },
  });
  currentAdminPassword = nextAdminPassword;
  await expect('old administrator password rejected', 'POST', '/api/auth/login', 401, {
    body: { email: adminEmail, password: adminPassword },
  });
  const renamedAdminEmail = `uat-admin-renamed-${suffix.toLowerCase()}@example.invalid`;
  await expect('administrator change email', 'PUT', '/api/auth/change-email', 200, {
    token: adminToken,
    body: { currentPassword: currentAdminPassword, newEmail: renamedAdminEmail },
  });
  adminEmail = renamedAdminEmail;
  const updatedAdminLogin = await expect('login with updated administrator credentials', 'POST', '/api/auth/login', 200, {
    body: { email: adminEmail, password: currentAdminPassword },
  });
  adminToken = updatedAdminLogin.token;
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    await expect('password reset reports missing SMTP configuration', 'POST', '/api/auth/request-password-reset', 503, {
      body: { email: adminEmail },
    });
  }

  const className = `UAT-${suffix}`;
  const createdClass = await expect('class create', 'POST', '/api/classes', 201, {
    token: adminToken,
    body: { className, section: 'A', classTeacher: 'UAT Teacher', roomNumber: 'UAT-1' },
  });
  const classId = createdClass.schoolClass._id;
  await expect('class duplicate validation', 'POST', '/api/classes', 409, {
    token: adminToken,
    body: { className, section: 'A' },
  });
  await expect('class update', 'PUT', `/api/classes/${classId}`, 200, {
    token: adminToken,
    body: { className, section: 'A', classTeacher: 'UAT Teacher', roomNumber: 'UAT-2' },
  });
  await expect('class listing', 'GET', '/api/classes', 200, { token: adminToken });

  const studentId = `UAT-STU-${suffix}`;
  const studentBody = {
    studentId,
    name: 'UAT Student',
    className,
    section: 'A',
    rollNumber: 'UAT-01',
    dateOfBirth: '2010-01-01',
    guardianPhone: '+8800000000000',
    address: 'Synthetic UAT record',
  };
  const createdStudent = await expect('student create', 'POST', '/api/students', 201, {
    token: adminToken,
    body: studentBody,
  });
  const studentObjectId = createdStudent.student._id;
  await expect('student duplicate validation', 'POST', '/api/students', 409, {
    token: adminToken,
    body: studentBody,
  });
  const studentSearch = await expect('student search and pagination', 'GET', `/api/students?search=${studentId}&page=1&limit=10`, 200, { token: adminToken });
  assert.equal(studentSearch.students.length, 1);
  await expect('student update', 'PUT', `/api/students/${studentObjectId}`, 200, {
    token: adminToken,
    body: { ...studentBody, name: 'UAT Student Updated', rollNumber: 'UAT-02' },
  });

  const { default: cloudinaryClient, isCloudinaryConfigured } = await import('../src/config/cloudinary.js');
  if (isCloudinaryConfigured) {
    cloudinary = cloudinaryClient;
    await expect('photo upload rejects missing image', 'POST', '/api/uploads/profile-image', 400, { token: adminToken });
    const form = new FormData();
    const onePixelPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+nmNcAAAAASUVORK5CYII=', 'base64');
    form.append('image', new Blob([onePixelPng], { type: 'image/png' }), `uat-${suffix}.png`);
    const response = await fetch(`${baseUrl}/api/uploads/profile-image`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: form,
    });
    let uploadData = null;
    try { uploadData = await response.json(); } catch { /* Status assertion below gives a safe failure. */ }
    if (response.status === 502) {
      assert.match(uploadData?.message || '', /Cloudinary rejected the configured credentials/i);
      pass('Cloudinary configuration error is actionable');
      cloudinaryTestFailure = true;
      console.log('FAIL Cloudinary upload: provider rejected the configured credentials or service request.');
    } else {
      assert.equal(response.status, 201, 'Cloudinary profile upload returned an unexpected status.');
      assert.match(uploadData.imageUrl, /^https:\/\//);
      const cloudinaryPath = new URL(uploadData.imageUrl).pathname.split('/upload/')[1];
      cloudinaryPublicId = cloudinaryPath.replace(/^v\d+\//, '').replace(/\.[^/.]+$/, '');
      assert.ok(cloudinaryPublicId.includes(`uat-${suffix}`));
      pass('Cloudinary profile image upload');
      await expect('student photo URL update', 'PUT', `/api/students/${studentObjectId}`, 200, {
        token: adminToken,
        body: { ...studentBody, name: 'UAT Student Updated', rollNumber: 'UAT-02', photoUrl: uploadData.imageUrl },
      });
      const destroyResult = await cloudinary.uploader.destroy(cloudinaryPublicId, { resource_type: 'image' });
      assert.equal(destroyResult.result, 'ok');
      cloudinaryPublicId = undefined;
      pass('temporary Cloudinary asset cleanup');
    }
  } else {
    await expect('photo upload reports missing Cloudinary configuration', 'POST', '/api/uploads/profile-image', 503, { token: adminToken });
    console.log('SKIP Cloudinary upload: credentials are not configured.');
  }

  const teacherId = `UAT-TEA-${suffix}`;
  const teacherBody = {
    teacherId,
    name: 'UAT Teacher',
    subject: 'UAT Subject',
    assignedClass: `${className} - A`,
    phone: '+8800000000000',
  };
  const createdTeacher = await expect('teacher create', 'POST', '/api/teachers', 201, {
    token: adminToken,
    body: teacherBody,
  });
  const teacherObjectId = createdTeacher.teacher._id;
  const teacherSearch = await expect('teacher search and pagination', 'GET', `/api/teachers?search=${teacherId}&page=1&limit=10`, 200, { token: adminToken });
  assert.equal(teacherSearch.teachers.length, 1);
  await expect('teacher update', 'PUT', `/api/teachers/${teacherObjectId}`, 200, {
    token: adminToken,
    body: { ...teacherBody, name: 'UAT Teacher Updated' },
  });

  const subjectCode = `UAT-${suffix}`;
  const subjectBody = { name: 'UAT Subject', code: subjectCode, className, teacher: 'UAT Teacher Updated', fullMarks: 100 };
  const createdSubject = await expect('subject create', 'POST', '/api/subjects', 201, { token: adminToken, body: subjectBody });
  const subjectId = createdSubject.subject._id;
  await expect('subject duplicate validation', 'POST', '/api/subjects', 409, { token: adminToken, body: subjectBody });
  await expect('subject update', 'PUT', `/api/subjects/${subjectId}`, 200, {
    token: adminToken,
    body: { ...subjectBody, name: 'UAT Subject Updated' },
  });
  const routineBody = {
    className,
    section: 'A',
    day: 'Sunday',
    subject: 'UAT Subject Updated',
    teacher: 'UAT Teacher Updated',
    startTime: '09:00',
    endTime: '09:45',
    room: 'UAT-2',
  };
  const createdRoutine = await expect('routine create', 'POST', '/api/routines', 201, { token: adminToken, body: routineBody });
  const routineId = createdRoutine.routine._id;
  await expect('routine duplicate validation', 'POST', '/api/routines', 409, { token: adminToken, body: routineBody });
  await expect('routine update', 'PUT', `/api/routines/${routineId}`, 200, {
    token: adminToken,
    body: { ...routineBody, room: 'UAT-3' },
  });

  const noticeBody = { title: `UAT Notice ${suffix}`, body: 'Synthetic test notice.', audience: 'All', priority: 'Normal' };
  const createdNotice = await expect('notice create', 'POST', '/api/notices', 201, { token: adminToken, body: noticeBody });
  const noticeId = createdNotice.notice._id;
  const publicNotices = await expect('public notice read', 'GET', '/api/notices/public', 200);
  assert.ok(publicNotices.notices.some((notice) => notice._id === noticeId));
  await expect('notice update', 'PUT', `/api/notices/${noticeId}`, 200, {
    token: adminToken,
    body: { ...noticeBody, title: `${noticeBody.title} Updated` },
  });
  await expect('admin notice list', 'GET', '/api/notices', 200, { token: adminToken });
  const updatedNoticeTitle = `${noticeBody.title} Updated`;

  const summary = await expect('dashboard totals', 'GET', '/api/dashboard/summary', 200, { token: adminToken });
  assert.deepEqual([summary.totalStudents, summary.totalTeachers, summary.totalClasses], [1, 1, 1]);
  const invalidAttendance = await api('POST', '/api/attendance/mark', {
    token: adminToken,
    body: { date: '2026-11-07', records: [{ student: studentObjectId, status: 'Invalid' }] },
  });
  assert.equal(invalidAttendance.status, 400);
  pass('attendance status validation');
  await expect('attendance mark', 'POST', '/api/attendance/mark', 200, {
    token: adminToken,
    body: { date: '2026-11-07', records: [{ student: studentObjectId, status: 'Present', note: 'UAT' }] },
  });
  const attendance = await expect('attendance read', 'GET', `/api/attendance?date=2026-11-07&studentId=${studentId}`, 200, { token: adminToken });
  assert.equal(attendance.attendance.length, 1);
  assert.equal(attendance.attendance[0].status, 'Present');

  const invalidResult = await api('POST', '/api/results', {
    token: adminToken,
    body: { student: studentObjectId, subject: 'UAT Subject', examType: 'Boundary', fullMarks: 100, obtainedMarks: 101 },
  });
  assert.equal(invalidResult.status, 400);
  pass('result marks boundary validation');
  const createdResult = await expect('result create and grade calculation', 'POST', '/api/results', 201, {
    token: adminToken,
    body: { student: studentObjectId, subject: 'UAT Subject', examType: 'Final', fullMarks: 100, obtainedMarks: 87 },
  });
  const resultId = createdResult.result._id;
  assert.equal(createdResult.result.percentage, 87);
  assert.equal(createdResult.result.grade, 'A+');
  await expect('result update', 'PUT', `/api/results/${resultId}`, 200, {
    token: adminToken,
    body: { student: studentObjectId, subject: 'UAT Subject', examType: 'Final', fullMarks: 100, obtainedMarks: 91 },
  });
  const report = await expect('student report card', 'GET', `/api/reports/report-card/${studentId}`, 200, { token: adminToken });
  assert.equal(report.summary.subjects, 1);

  const roleUsers = [
    { role: 'teacher', name: 'UAT Teacher', email: `uat-teacher-${suffix.toLowerCase()}@example.invalid`, linkedTeacherId: teacherObjectId },
    { role: 'student', name: 'UAT Student', email: `uat-student-${suffix.toLowerCase()}@example.invalid`, linkedStudentId: studentObjectId },
    { role: 'guardian', name: 'UAT Guardian', email: `uat-guardian-${suffix.toLowerCase()}@example.invalid`, linkedStudentId: studentObjectId },
  ];
  for (const account of roleUsers) {
    const accountPassword = crypto.randomBytes(18).toString('base64url');
    await expect(`${account.role} account create`, 'POST', '/api/auth/users', 201, {
      token: adminToken,
      body: { ...account, password: accountPassword },
    });
    const login = await expect(`${account.role} login`, 'POST', '/api/auth/login', 200, {
      body: { email: account.email, password: accountPassword },
    });
    assert.equal(login.admin.role, account.role);
    const portal = await expect(`${account.role} linked portal`, 'GET', '/api/portal/overview', 200, { token: login.token });
    assert.equal(portal.user.role, account.role);
    assert.ok(portal.notices.some((notice) => notice.title === updatedNoticeTitle));
    if (account.role === 'teacher') {
      assert.ok(portal.teaching);
      assert.equal(portal.teaching.students.length, 1);
      assert.equal(portal.teaching.routines.length, 1);
      assert.equal(portal.teaching.subjects.length, 1);
    } else {
      assert.ok(portal.academic);
      assert.equal(portal.academic.results.length, 1);
      assert.equal(portal.academic.routines.length, 1);
      assert.equal(portal.academic.attendance.total, 1);
    }
    await expect(`${account.role} denied student administration`, 'GET', '/api/students', 403, { token: login.token });
    await expect(`${account.role} denied dashboard administration`, 'GET', '/api/dashboard/summary', 403, { token: login.token });
  }

  const promotedClassName = `${className} Next`;
  const promotion = await expect('bulk student promotion', 'POST', '/api/promotions', 200, {
    token: adminToken,
    body: { studentIds: [studentObjectId], className: promotedClassName, section: 'B' },
  });
  assert.equal(promotion.total, 1);
  const promotedStudents = await expect('promoted student filter', 'GET', `/api/students?className=${encodeURIComponent(promotedClassName)}&section=B`, 200, { token: adminToken });
  assert.equal(promotedStudents.students.length, 1);

  const users = await expect('admin role-account listing', 'GET', '/api/auth/users', 200, { token: adminToken });
  assert.equal(users.users.length, 4);
  const notifications = await expect('notification list', 'GET', '/api/notifications', 200, { token: adminToken });
  assert.ok(notifications.notifications.length > 0);
  await expect('mark notification read', 'PUT', `/api/notifications/${notifications.notifications[0]._id}/read`, 200, { token: adminToken });
  await expect('mark all notifications read', 'PUT', '/api/notifications/read-all', 200, { token: adminToken });
  const auditLogs = await expect('audit history list', 'GET', '/api/audit-logs?page=1&limit=20', 200, { token: adminToken });
  assert.ok(auditLogs.logs.length > 0);
  await expect('linked student deletion protection', 'DELETE', `/api/students/${studentObjectId}`, 409, { token: adminToken });
  await expect('linked teacher deletion protection', 'DELETE', `/api/teachers/${teacherObjectId}`, 409, { token: adminToken });
  for (const user of users.users.filter((account) => account.role !== 'admin')) {
    await expect('temporary role account delete', 'DELETE', `/api/auth/users/${user._id}`, 200, { token: adminToken });
  }
  await expect('result delete', 'DELETE', `/api/results/${resultId}`, 200, { token: adminToken });
  await expect('subject delete', 'DELETE', `/api/subjects/${subjectId}`, 200, { token: adminToken });
  await expect('routine delete', 'DELETE', `/api/routines/${routineId}`, 200, { token: adminToken });
  await expect('notice delete', 'DELETE', `/api/notices/${noticeId}`, 200, { token: adminToken });
  await expect('student delete', 'DELETE', `/api/students/${studentObjectId}`, 200, { token: adminToken });
  await expect('teacher delete', 'DELETE', `/api/teachers/${teacherObjectId}`, 200, { token: adminToken });
  await expect('class delete', 'DELETE', `/api/classes/${classId}`, 200, { token: adminToken });
}

try {
  await main();
  console.log(`UAT_CHECKS_PASSED=${passed}`);
  if (cloudinaryTestFailure) {
    console.error('CLOUDINARY_TEST_FAILED=true');
    process.exitCode = 1;
  }
} catch (error) {
  console.error(`UAT_FAILED=${error.name || 'Error'}: ${error.message}`);
  process.exitCode = 1;
} finally {
  if (server) await new Promise((resolve) => server.close(resolve));
  if (cloudinary && cloudinaryPublicId) {
    try {
      const result = await cloudinary.uploader.destroy(cloudinaryPublicId, { resource_type: 'image' });
      if (result.result !== 'ok') throw new Error('Temporary Cloudinary asset was not removed.');
      cloudinaryPublicId = undefined;
      console.log('TEMPORARY_CLOUDINARY_ASSET_CLEANED=true');
    } catch (error) {
      console.error(`CLOUDINARY_CLEANUP_FAILED=${error.name || 'Error'}`);
      process.exitCode = 1;
    }
  }
  try {
    if (mongoose.connection.readyState === 1) {
      if (mongoose.connection.db.databaseName !== databaseName || !databaseName.startsWith('school_uat_')) {
        throw new Error('Refusing cleanup outside the isolated UAT database.');
      }
      await mongoose.connection.dropDatabase();
      cleanupComplete = true;
    }
  } catch (error) {
    console.error(`UAT_CLEANUP_FAILED=${error.name || 'Error'}: ${error.message}`);
    process.exitCode = 1;
  }
  await mongoose.disconnect();
  console.log(`ISOLATED_UAT_DB_CLEANED=${cleanupComplete}`);
}
