import { useEffect, useState } from 'react';

// Empty by default for the same-origin Vercel deployment. Set this at build time
// when the Vite client is hosted separately from the Express API (for example Render).
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
const fetch = (input, init) => globalThis.fetch(
  typeof input === 'string' && input.startsWith('/') ? `${API_BASE_URL}${input}` : input,
  init,
);

function getStoredAdmin() {
  const storedAdmin = sessionStorage.getItem('schoolAdmin');
  return storedAdmin ? JSON.parse(storedAdmin) : null;
}

async function readApiResponse(response) {
  const raw = await response.text();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    const detail = raw.replace(/\s+/g, ' ').trim().slice(0, 180);
    return { message: detail || `The server returned an invalid response (HTTP ${response.status}).` };
  }
}

function PaginationControls({ pagination, onPageChange }) {
  if (!pagination || pagination.pages <= 1) return null;
  const first = (pagination.page - 1) * pagination.limit + 1;
  const last = Math.min(pagination.page * pagination.limit, pagination.total);
  return <nav className="pagination-controls" aria-label="Records pages"><span>Showing {first}–{last} of {pagination.total}</span><div><button type="button" className="logout-button" disabled={!pagination.hasPreviousPage} onClick={() => onPageChange(pagination.page - 1)}>Previous</button><span className="page-count">Page {pagination.page} of {pagination.pages}</span><button type="button" className="logout-button" disabled={!pagination.hasNextPage} onClick={() => onPageChange(pagination.page + 1)}>Next</button></div></nav>;
}

function ProfilePhotoField({ value, onChange }) {
  const [status, setStatus] = useState('');
  async function uploadImage(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setStatus('Uploading image...');
    try {
      const payload = new FormData();
      payload.append('image', file);
      const token = sessionStorage.getItem('schoolAdminToken');
      const response = await fetch('/api/uploads/profile-image', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: payload });
      const rawBody = await response.text();
      const data = rawBody ? JSON.parse(rawBody) : {};
      if (!response.ok) throw new Error(data.message || `Image upload failed (server status ${response.status}).`);
      onChange(data.imageUrl);
      setStatus('Photo uploaded successfully.');
    } catch (error) { setStatus(error.message); }
  }
  return <label className="full-width">Profile photo <input type="file" accept="image/*" onChange={uploadImage} />{value && <img className="profile-preview" src={value} alt="Profile preview" />}{status && <small className="upload-status">{status}</small>}</label>;
}

function BangladeshClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const timer = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(timer); }, []);
  return <p className="bd-clock">🇧🇩 Dhaka, Bangladesh · {new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Dhaka', dateStyle: 'full', timeStyle: 'medium' }).format(now)}</p>;
}

function PublicNotices() {
  const [notices, setNotices] = useState([]);
  useEffect(() => { fetch('/api/notices/public').then((response) => readApiResponse(response)).then((data) => setNotices(data.notices || [])).catch(() => setNotices([])); }, []);
  if (!notices.length) return <section className="login-notice"><p className="card-kicker">Welcome</p><strong>One place for every school record.</strong><span>Sign in to manage students, teachers, attendance, results, and academic operations securely.</span></section>;
  return <section className="login-notice"><p className="card-kicker">Notice board</p>{notices.slice(0, 2).map((notice) => <article key={notice._id}><strong>{notice.title}</strong><span>{notice.body}</span></article>)}</section>;
}

function RolePortal({ admin, onLogout, darkMode, onToggleTheme }) {
  const [notices, setNotices] = useState([]);
  const [academic, setAcademic] = useState(null);
  const [teaching, setTeaching] = useState(null);
  const [message, setMessage] = useState('');
  useEffect(() => { const token = sessionStorage.getItem('schoolAdminToken'); fetch('/api/portal/overview', { headers: { Authorization: `Bearer ${token}` } }).then((response) => readApiResponse(response)).then((data) => { setNotices(data.notices || []); setAcademic(data.academic || null); setTeaching(data.teaching || null); if (!data.teaching && admin.role === 'teacher') setMessage('Your teacher profile is not linked yet. Please contact the school administrator.'); }).catch((error) => setMessage(error.message || 'Unable to load your workspace.')); }, [admin.role]);
  const label = admin.role === 'teacher' ? 'Teacher workspace' : admin.role === 'guardian' ? 'Guardian portal' : 'Student workspace';
  return <main className="dashboard-page"><header className="dashboard-header"><div><p className="eyebrow">School Management System</p><h1>Welcome, {admin.name}.</h1><p className="intro-copy">{label} · Your account has secure, role-based access.</p></div><div className="header-actions"><button className="logout-button" type="button" onClick={onToggleTheme}>{darkMode ? 'Light mode' : 'Dark mode'}</button><button className="logout-button" type="button" onClick={onLogout}>Sign out</button></div></header>{message && <p className="form-message" role="status">{message}</p>}<section className="portal-hero"><p className="card-kicker">Your workspace</p><h2>{label}</h2><p>School announcements relevant to your role appear below.</p></section>{teaching && <section className="academic-snapshot"><div><p className="card-kicker">Teaching assignment</p><h2>{teaching.teacher.name}</h2><p>{teaching.teacher.teacherId} · {teaching.teacher.subject} · {teaching.teacher.assignedClass}</p></div><div className="summary-grid"><article className="summary-card"><p>Assigned students</p><strong>{teaching.students.length}</strong></article><article className="summary-card"><p>Subjects</p><strong>{teaching.subjects.length}</strong></article><article className="summary-card"><p>Class routine entries</p><strong>{teaching.routines.length}</strong></article></div><h2>Class roster</h2><DataTable rows={teaching.students} fields={['studentId', 'name', 'className', 'section', 'rollNumber']} /><h2>Class schedule</h2><DataTable rows={teaching.routines} fields={['day', 'startTime', 'endTime', 'subject', 'room']} /><h2>Assigned subjects</h2><DataTable rows={teaching.subjects} fields={['name', 'code', 'className', 'fullMarks']} /></section>}{academic && <section className="academic-snapshot"><div><p className="card-kicker">Linked learner</p><h2>{academic.student.name}</h2><p>{academic.student.studentId} · {academic.student.className}-{academic.student.section} · Roll {academic.student.rollNumber}</p></div><div className="summary-grid"><article className="summary-card"><p>Attendance</p><strong>{academic.attendance.percentage}%</strong></article><article className="summary-card"><p>Present days</p><strong>{academic.attendance.present}</strong></article><article className="summary-card"><p>Results</p><strong>{academic.results.length}</strong></article></div><h2>Academic results</h2><DataTable rows={academic.results} fields={['subject', 'examType', 'obtainedMarks', 'fullMarks', 'percentage', 'grade']} /><h2>Class routine</h2><DataTable rows={academic.routines || []} fields={['day', 'startTime', 'endTime', 'subject', 'teacher', 'room']} /></section>}<section className="notice-grid">{notices.length ? notices.map((notice) => <article className={`notice-card priority-${notice.priority.toLowerCase()}`} key={notice._id}><p>{notice.priority}</p><h2>{notice.title}</h2><span>{notice.body}</span></article>) : <p className="empty-search">No announcements are available right now.</p>}</section></main>;
}

function OperationsHub({ onBack }) {
  const [tab, setTab] = useState('subjects');
  const [editingId, setEditingId] = useState(null);
  const [items, setItems] = useState([]);
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [message, setMessage] = useState('');
  const [subject, setSubject] = useState({ name: '', code: '', className: '', teacher: '', fullMarks: 100 });
  const [routine, setRoutine] = useState({ className: '', section: '', day: 'Sunday', subject: '', teacher: '', startTime: '', endTime: '', room: '' });
  const [notice, setNotice] = useState({ title: '', body: '', audience: 'All', priority: 'Normal', expiresAt: '' });
  const [userForm, setUserForm] = useState({ name: '', email: '', password: '', role: 'teacher', linkedStudentId: '', linkedTeacherId: '' });
  const [auditPagination, setAuditPagination] = useState(null);
  const [auditPage, setAuditPage] = useState(1);
  const [auditFilter, setAuditFilter] = useState({ entity: '', action: '', from: '', to: '' });
  const [promotion, setPromotion] = useState({ studentIds: [], className: '', section: '' });
  const [reportId, setReportId] = useState(''); const [report, setReport] = useState(null);
  const token = () => sessionStorage.getItem('schoolAdminToken');
  async function load() {
    const path = tab === 'subjects' ? '/api/subjects' : tab === 'routines' ? '/api/routines' : tab === 'notices' ? '/api/notices' : tab === 'users' ? '/api/auth/users' : tab === 'audit' ? '/api/audit-logs' : '/api/students';
    try {
      let requestPath = path;
      if (tab === 'audit') {
        const params = new URLSearchParams({ page: String(auditPage), limit: '20' });
        Object.entries(auditFilter).forEach(([key, value]) => { if (value) params.set(key, value); });
        requestPath = `${path}?${params}`;
      }
      const response = await fetch(requestPath, { headers: { Authorization: `Bearer ${token()}` } });
      const data = await readApiResponse(response);
      if (!response.ok) throw new Error(data.message || 'Unable to load data.');
      setItems(data.subjects || data.routines || data.notices || data.users || data.logs || data.students || []);
      setAuditPagination(data.pagination || null);
      if (['promotion', 'reports', 'users'].includes(tab)) {
        const studentData = tab === 'users' ? null : await fetch('/api/students', { headers: { Authorization: `Bearer ${token()}` } }).then(readApiResponse);
        if (studentData) setStudents(studentData.students || []);
        if (tab === 'users') {
          const [studentResponse, teacherResponse] = await Promise.all([
            fetch('/api/students', { headers: { Authorization: `Bearer ${token()}` } }),
            fetch('/api/teachers', { headers: { Authorization: `Bearer ${token()}` } }),
          ]);
          const [studentsData, teachersData] = await Promise.all([readApiResponse(studentResponse), readApiResponse(teacherResponse)]);
          if (!studentResponse.ok || !teacherResponse.ok) throw new Error(studentsData.message || teachersData.message || 'Unable to load linked records.');
          setStudents(studentsData.students || []);
          setTeachers(teachersData.teachers || []);
        }
      }
      setMessage('');
    } catch (error) { setMessage(error.message); }
  }
  useEffect(() => { setItems([]); setReport(null); setEditingId(null); load(); }, [tab, auditPage, auditFilter]);
  async function save(path, payload, clear) { try { const editing = Boolean(editingId); const response = await fetch(editing ? `${path}/${editingId}` : path, { method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` }, body: JSON.stringify(payload) }); const data = await readApiResponse(response); if (!response.ok) throw new Error(data.message || 'Unable to save.'); setMessage(data.message); setEditingId(null); clear(); await load(); } catch (error) { setMessage(error.message); } }
  async function remove(path, id) { if (!window.confirm('Delete this record?')) return; try { const response = await fetch(`${path}/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token()}` } }); const data = await readApiResponse(response); if (!response.ok) throw new Error(data.message); setMessage(data.message); load(); } catch (error) { setMessage(error.message); } }
  async function loadReport() { if (!reportId) return; try { const response = await fetch(`/api/reports/report-card/${reportId}`, { headers: { Authorization: `Bearer ${token()}` } }); const data = await readApiResponse(response); if (!response.ok) throw new Error(data.message); setReport(data); setMessage(''); } catch (error) { setMessage(error.message); } }
  const tabs = [['subjects', 'Subjects'], ['routines', 'Routine'], ['notices', 'Notices'], ['promotion', 'Promotion'], ['reports', 'Report card']];
  return <main className="records-page"><header className="dashboard-header"><div><p className="eyebrow">Academic operations</p><h1>School control center</h1><p className="intro-copy">Plan learning, publish notices, promote students, and produce report cards.</p></div><button type="button" className="logout-button" onClick={onBack}>Back to dashboard</button></header><nav className="module-tabs">{tabs.map(([id, label]) => <button type="button" className={tab === id ? 'active' : ''} onClick={() => setTab(id)} key={id}>{label}</button>)}</nav>{message && <p className="form-message" role="status">{message}</p>}
  {tab === 'subjects' && <><form className="compact-form" onSubmit={(event) => { event.preventDefault(); save('/api/subjects', { ...subject, fullMarks: Number(subject.fullMarks) }, () => setSubject({ name: '', code: '', className: '', teacher: '', fullMarks: 100 })); }}><label>Subject<input value={subject.name} onChange={(event) => setSubject({ ...subject, name: event.target.value })} required /></label><label>Code<input value={subject.code} onChange={(event) => setSubject({ ...subject, code: event.target.value })} required /></label><label>Class<input value={subject.className} onChange={(event) => setSubject({ ...subject, className: event.target.value })} required /></label><label>Teacher<input value={subject.teacher} onChange={(event) => setSubject({ ...subject, teacher: event.target.value })} /></label><label>Full marks<input type="number" min="1" value={subject.fullMarks} onChange={(event) => setSubject({ ...subject, fullMarks: event.target.value })} /></label><button>{editingId ? 'Save subject' : 'Add subject'}</button>{editingId && <button type="button" className="logout-button" onClick={() => { setEditingId(null); setSubject({ name: '', code: '', className: '', teacher: '', fullMarks: 100 }); }}>Cancel edit</button>}</form><DataTable rows={items} fields={['name', 'code', 'className', 'teacher', 'fullMarks']} onEdit={(item) => { setEditingId(item._id); setSubject({ name: item.name, code: item.code, className: item.className, teacher: item.teacher || '', fullMarks: item.fullMarks }); }} onDelete={(id) => remove('/api/subjects', id)} /></>}
  {tab === 'routines' && <><form className="compact-form" onSubmit={(event) => { event.preventDefault(); save('/api/routines', routine, () => setRoutine({ className: '', section: '', day: 'Sunday', subject: '', teacher: '', startTime: '', endTime: '', room: '' })); }}><label>Class<input value={routine.className} onChange={(event) => setRoutine({ ...routine, className: event.target.value })} required /></label><label>Section<input value={routine.section} onChange={(event) => setRoutine({ ...routine, section: event.target.value })} required /></label><label>Day<select value={routine.day} onChange={(event) => setRoutine({ ...routine, day: event.target.value })}>{['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'].map((day) => <option key={day}>{day}</option>)}</select></label><label>Subject<input value={routine.subject} onChange={(event) => setRoutine({ ...routine, subject: event.target.value })} required /></label><label>Teacher<input value={routine.teacher} onChange={(event) => setRoutine({ ...routine, teacher: event.target.value })} /></label><label>Start<input type="time" value={routine.startTime} onChange={(event) => setRoutine({ ...routine, startTime: event.target.value })} required /></label><label>End<input type="time" value={routine.endTime} onChange={(event) => setRoutine({ ...routine, endTime: event.target.value })} required /></label><label>Room<input value={routine.room} onChange={(event) => setRoutine({ ...routine, room: event.target.value })} /></label><button>{editingId ? 'Save routine' : 'Add routine'}</button>{editingId && <button type="button" className="logout-button" onClick={() => { setEditingId(null); setRoutine({ className: '', section: '', day: 'Sunday', subject: '', teacher: '', startTime: '', endTime: '', room: '' }); }}>Cancel edit</button>}</form><DataTable rows={items} fields={['className', 'section', 'day', 'subject', 'teacher', 'startTime', 'endTime', 'room']} onEdit={(item) => { setEditingId(item._id); setRoutine({ className: item.className, section: item.section, day: item.day, subject: item.subject, teacher: item.teacher || '', startTime: item.startTime, endTime: item.endTime, room: item.room || '' }); }} onDelete={(id) => remove('/api/routines', id)} /></>}
  {tab === 'notices' && <><form className="notice-form" onSubmit={(event) => { event.preventDefault(); save('/api/notices', notice, () => setNotice({ title: '', body: '', audience: 'All', priority: 'Normal', expiresAt: '' })); }}><label>Title<input value={notice.title} onChange={(event) => setNotice({ ...notice, title: event.target.value })} required /></label><label>Audience<select value={notice.audience} onChange={(event) => setNotice({ ...notice, audience: event.target.value })}>{['All', 'Admin', 'Teacher', 'Student', 'Guardian'].map((value) => <option key={value}>{value}</option>)}</select></label><label>Priority<select value={notice.priority} onChange={(event) => setNotice({ ...notice, priority: event.target.value })}>{['Normal', 'Important', 'Urgent'].map((value) => <option key={value}>{value}</option>)}</select></label><label>Expiry<input type="date" value={notice.expiresAt ? String(notice.expiresAt).slice(0, 10) : ''} onChange={(event) => setNotice({ ...notice, expiresAt: event.target.value })} /></label><label className="full-width">Message<textarea value={notice.body} onChange={(event) => setNotice({ ...notice, body: event.target.value })} required /></label><button className="full-width">{editingId ? 'Save notice' : 'Publish notice'}</button>{editingId && <button type="button" className="logout-button full-width" onClick={() => { setEditingId(null); setNotice({ title: '', body: '', audience: 'All', priority: 'Normal', expiresAt: '' }); }}>Cancel edit</button>}</form><div className="notice-grid">{items.map((item) => <article className={`notice-card priority-${item.priority.toLowerCase()}`} key={item._id}><p>{item.priority} · {item.audience}</p><h2>{item.title}</h2><span>{item.body}</span><div className="table-actions"><button type="button" className="table-button" onClick={() => { setEditingId(item._id); setNotice({ title: item.title, body: item.body, audience: item.audience, priority: item.priority, expiresAt: item.expiresAt || '' }); }}>Edit</button><button type="button" className="table-button danger-button" onClick={() => remove('/api/notices', item._id)}>Delete</button></div></article>)}</div></>}
  {tab === 'promotion' && <section className="promotion-card"><h2>Promote selected students</h2><p>Select students, then enter the destination class and section.</p><div className="promotion-controls"><input placeholder="Next class" value={promotion.className} onChange={(event) => setPromotion({ ...promotion, className: event.target.value })} /><input placeholder="Next section" value={promotion.section} onChange={(event) => setPromotion({ ...promotion, section: event.target.value })} /><button type="button" onClick={() => save('/api/promotions', promotion, () => setPromotion({ studentIds: [], className: '', section: '' }))}>Promote selected ({promotion.studentIds.length})</button></div><div className="check-list">{students.map((student) => <label key={student._id}><input type="checkbox" checked={promotion.studentIds.includes(student._id)} onChange={() => setPromotion({ ...promotion, studentIds: promotion.studentIds.includes(student._id) ? promotion.studentIds.filter((id) => id !== student._id) : [...promotion.studentIds, student._id] })} />{student.name} · {student.studentId} · {student.className}-{student.section}</label>)}</div></section>}
  {tab === 'reports' && <section className="report-card-panel"><div className="report-selector"><select value={reportId} onChange={(event) => setReportId(event.target.value)}><option value="">Select a student</option>{students.map((student) => <option value={student.studentId} key={student._id}>{student.name} ({student.studentId})</option>)}</select><button type="button" onClick={loadReport}>Generate report card</button>{report && <button type="button" className="logout-button" onClick={() => window.print()}>Print / Save PDF</button>}</div>{report && <article className="official-report"><p className="eyebrow">Official academic report</p><h2>{report.student.name}</h2><p>{report.student.studentId} · {report.student.className}-{report.student.section} · Roll {report.student.rollNumber}</p><div className="summary-grid"><article className="summary-card"><p>Average score</p><strong>{report.summary.average}%</strong></article><article className="summary-card"><p>Attendance</p><strong>{report.summary.attendance.percentage}%</strong></article><article className="summary-card"><p>Subjects</p><strong>{report.summary.subjects}</strong></article></div><DataTable rows={report.results} fields={['subject', 'examType', 'obtainedMarks', 'fullMarks', 'percentage', 'grade']} /></article>}</section>}
  {tab === 'users' && <><form className="compact-form" onSubmit={(event) => { event.preventDefault(); save('/api/auth/users', userForm, () => setUserForm({ name: '', email: '', password: '', role: 'teacher', linkedStudentId: '' })); }}><label>Full name<input value={userForm.name} onChange={(event) => setUserForm({ ...userForm, name: event.target.value })} required /></label><label>Email<input type="email" value={userForm.email} onChange={(event) => setUserForm({ ...userForm, email: event.target.value })} required /></label><label>Temporary password<input type="password" minLength="8" value={userForm.password} onChange={(event) => setUserForm({ ...userForm, password: event.target.value })} required /></label><label>Role<select value={userForm.role} onChange={(event) => setUserForm({ ...userForm, role: event.target.value })}>{['teacher', 'student', 'guardian'].map((role) => <option key={role} value={role}>{role}</option>)}</select></label><label>Linked student (student/guardian)<select value={userForm.linkedStudentId} onChange={(event) => setUserForm({ ...userForm, linkedStudentId: event.target.value })}><option value="">No linked student</option>{students.map((student) => <option key={student._id} value={student._id}>{student.name} ({student.studentId})</option>)}</select></label><button>Create account</button></form><DataTable rows={items.map((user) => ({ ...user, linkedStudent: user.linkedStudent ? `${user.linkedStudent.name} (${user.linkedStudent.studentId})` : '—' }))} fields={['name', 'email', 'role', 'linkedStudent']} /></>}</main>;
}

function DataTable({ rows, fields, onDelete, onEdit }) { return <div className="table-wrap"><table><thead><tr>{fields.map((field) => <th key={field}>{field.replace(/([A-Z])/g, ' $1')}</th>)}{(onDelete || onEdit) && <th>Action</th>}</tr></thead><tbody>{rows.map((row) => <tr key={row._id || row.occurredAt}>{fields.map((field) => <td key={field}>{row[field] ?? '—'}</td>)}{(onDelete || onEdit) && <td className="table-actions">{onEdit && <button type="button" className="table-button" onClick={() => onEdit(row)}>Edit</button>}{onDelete && <button type="button" className="table-button danger-button" onClick={() => onDelete(row._id)}>Delete</button>}</td>}</tr>)}</tbody></table>{!rows.length && <p className="empty-search">No records yet.</p>}</div>; }

function Dashboard({ admin, onLogout, onViewStudents, onViewTeachers, onViewClasses, onViewAttendance, onViewResults, onViewSettings, onViewOperations, onViewUsers, onViewAudit, darkMode, onToggleTheme }) {
  const [summary, setSummary] = useState(null);
  const [message, setMessage] = useState('Loading dashboard summary...');
  const [notifications, setNotifications] = useState([]);

  async function loadSummary() {
    try {
      setMessage('Loading dashboard summary...');
      const token = sessionStorage.getItem('schoolAdminToken');
      const response = await fetch('/api/dashboard/summary', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await readApiResponse(response);

      if (!response.ok) {
        throw new Error(data.message || 'Unable to load dashboard summary.');
      }

      setSummary(data);
      setMessage('');
    } catch (error) {
      setMessage(error.message);
    }
  }

  useEffect(() => {
    loadSummary();
    const token = sessionStorage.getItem('schoolAdminToken');
    fetch('/api/notifications', { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => readApiResponse(response))
      .then((data) => setNotifications(data.notifications || []))
      .catch(() => setNotifications([]));
  }, []);

  const cards = summary && [
    ['Students', summary.totalStudents],
    ['Teachers', summary.totalTeachers],
    ['Classes', summary.totalClasses],
  ];

  return (
    <main className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">School Management System</p>
          <h1>Welcome back, {admin.name}.</h1>
        </div>
        <div className="header-actions">
          <button type="button" className="students-button" onClick={onViewStudents}>Students</button>
          <button type="button" className="students-button" onClick={onViewTeachers}>Teachers</button>
          <button type="button" className="students-button" onClick={onViewClasses}>Classes</button>
          <button type="button" className="students-button" onClick={onViewAttendance}>Attendance</button>
          <button type="button" className="students-button" onClick={onViewResults}>Results</button>
          <button type="button" className="students-button" onClick={onViewOperations}>Academics</button>
          <button type="button" className="logout-button" onClick={onViewUsers}>User accounts</button>
          <button type="button" className="logout-button" onClick={onViewAudit}>Audit history</button>
          <button type="button" className="logout-button" onClick={onToggleTheme}>{darkMode ? 'Light mode' : 'Dark mode'}</button>
          <button type="button" className="logout-button" onClick={onViewSettings}>Settings</button>
          <button type="button" className="logout-button" onClick={() => window.print()}>Save PDF</button>
          <button type="button" className="logout-button" onClick={onLogout}>Sign out</button>
        </div>
      </header>

      <section className="dashboard-overview" aria-labelledby="overview-title">
        <div className="overview-heading"><p className="card-kicker">Dashboard overview</p><button type="button" className="refresh-button" onClick={loadSummary}>Refresh</button></div>
        <h2 id="overview-title">Your school at a glance</h2>
        {message && <p className="form-message" role="status">{message}</p>}
        {cards && (
          <div className="summary-grid">
            {cards.map(([label, value]) => (
              <article className="summary-card" key={label}>
                <p>{label}</p>
                <strong>{value}</strong>
              </article>
            ))}
          </div>
        )}
        {summary?.classDistribution?.length > 0 && <section className="analytics-section" aria-labelledby="distribution-title"><div><p className="card-kicker">Enrollment insights</p><h2 id="distribution-title">Students by class and section</h2></div><div className="bar-chart">{summary.classDistribution.map((item) => <div className="bar-row" key={item.label}><span>{item.label}</span><div className="bar-track"><i style={{ width: `${Math.max(8, (item.total / Math.max(...summary.classDistribution.map((value) => value.total))) * 100)}%` }} /></div><strong>{item.total}</strong></div>)}</div></section>}
        {notifications.length > 0 && <section className="notification-panel"><div className="overview-heading"><div><p className="card-kicker">Activity · {notifications.filter((item) => !item.isRead).length} unread</p><h2>Recent notifications</h2></div><button type="button" className="refresh-button" onClick={async () => { const token = sessionStorage.getItem('schoolAdminToken'); const response = await fetch('/api/notifications/read-all', { method: 'PUT', headers: { Authorization: `Bearer ${token}` } }); const data = await readApiResponse(response); if (response.ok) setNotifications((items) => items.map((item) => ({ ...item, isRead: true }))); else setMessage(data.message || 'Unable to update notifications.'); }}>Mark all read</button></div>{notifications.map((item) => <article className={`notification-item ${item.isRead ? 'is-read' : ''}`} key={item._id}><div><strong>{item.title}</strong><p>{item.message}</p></div>{!item.isRead && <button type="button" className="table-button" onClick={async () => { const token = sessionStorage.getItem('schoolAdminToken'); const response = await fetch(`/api/notifications/${item._id}/read`, { method: 'PUT', headers: { Authorization: `Bearer ${token}` } }); const data = await readApiResponse(response); if (response.ok) setNotifications((items) => items.map((notice) => notice._id === item._id ? { ...notice, isRead: true } : notice)); else setMessage(data.message || 'Unable to update notification.'); }}>Mark read</button>}</article>)}</section>}
        {(summary?.attendanceSummary?.Present || summary?.attendanceSummary?.Absent) && <section className="attendance-summary"><p><strong>{summary.attendanceSummary.Present || 0}</strong> attendance records marked present</p><p><strong>{summary.attendanceSummary.Absent || 0}</strong> attendance records marked absent</p></section>}
      </section>
    </main>
  );
}

function AuditHistory({ onBack }) {
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [message, setMessage] = useState('Loading audit history...');
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ entity: '', action: '', from: '', to: '', search: '' });

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const params = new URLSearchParams({ page: String(page), limit: '20' });
        Object.entries(filters).forEach(([key, value]) => { if (value) params.set(key, value); });
        const token = sessionStorage.getItem('schoolAdminToken');
        const response = await fetch(`/api/audit-logs?${params}`, { headers: { Authorization: `Bearer ${token}` } });
        const data = await readApiResponse(response);
        if (!response.ok) throw new Error(data.message || 'Unable to load audit history.');
        if (active) { setLogs(data.logs || []); setPagination(data.pagination); setMessage(''); }
      } catch (error) { if (active) setMessage(error.message); }
    }
    load();
    return () => { active = false; };
  }, [page, filters]);

  function updateFilter(key, value) { setPage(1); setFilters((current) => ({ ...current, [key]: value })); }
  const rows = logs.map((log) => ({ ...log, occurredAt: new Date(log.createdAt).toLocaleString('en-GB', { timeZone: 'Asia/Dhaka' }), summary: `${log.action} · ${log.entity}${log.details ? ` — ${log.details}` : ''}` }));

  return <main className="records-page"><header className="dashboard-header"><div><p className="eyebrow">Security & accountability</p><h1>Audit history</h1><p className="intro-copy">Review administrative changes without storing password values or other secrets.</p></div><button type="button" className="logout-button" onClick={onBack}>Back to dashboard</button></header><div className="record-filters audit-filters"><label>Search<input value={filters.search} placeholder="Actor, action, record, or details" onChange={(event) => updateFilter('search', event.target.value)} /></label><label>Record type<select value={filters.entity} onChange={(event) => updateFilter('entity', event.target.value)}><option value="">All record types</option>{['Student', 'Teacher', 'Class', 'Attendance', 'Result', 'Subject', 'Routine', 'Notice', 'Students', 'User account', 'Account'].map((entity) => <option key={entity}>{entity}</option>)}</select></label><label>Action<input value={filters.action} placeholder="e.g. Created" onChange={(event) => updateFilter('action', event.target.value)} /></label><label>From<input type="date" value={filters.from} onChange={(event) => updateFilter('from', event.target.value)} /></label><label>To<input type="date" value={filters.to} onChange={(event) => updateFilter('to', event.target.value)} /></label></div>{message && <p className="form-message" role="status">{message}</p>}<DataTable rows={rows} fields={['occurredAt', 'actor', 'summary']} /><PaginationControls pagination={pagination} onPageChange={setPage} /></main>;
}

function UsersManagement({ onBack }) {
  const [users, setUsers] = useState([]);
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [message, setMessage] = useState('Loading account records...');
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'teacher', linkedStudentId: '', linkedTeacherId: '' });

  async function load() {
    try {
      const token = sessionStorage.getItem('schoolAdminToken');
      const headers = { Authorization: `Bearer ${token}` };
      const [userResponse, studentResponse, teacherResponse] = await Promise.all([
        fetch('/api/auth/users', { headers }), fetch('/api/students', { headers }), fetch('/api/teachers', { headers }),
      ]);
      const [userData, studentData, teacherData] = await Promise.all([readApiResponse(userResponse), readApiResponse(studentResponse), readApiResponse(teacherResponse)]);
      if (!userResponse.ok || !studentResponse.ok || !teacherResponse.ok) throw new Error(userData.message || studentData.message || teacherData.message || 'Unable to load account records.');
      setUsers(userData.users || []); setStudents(studentData.students || []); setTeachers(teacherData.teachers || []); setMessage('');
    } catch (error) { setMessage(error.message); }
  }

  useEffect(() => { load(); }, []);

  async function createAccount(event) {
    event.preventDefault(); setMessage('');
    try {
      const response = await fetch('/api/auth/users', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionStorage.getItem('schoolAdminToken')}` }, body: JSON.stringify(form) });
      const data = await readApiResponse(response);
      if (!response.ok) throw new Error(data.message || 'Unable to create account.');
      const successMessage = data.message; setForm({ name: '', email: '', password: '', role: 'teacher', linkedStudentId: '', linkedTeacherId: '' }); await load(); setMessage(successMessage);
    } catch (error) { setMessage(error.message); }
  }

  async function deleteAccount(id) {
    if (!window.confirm('Delete this user account? The linked student or teacher record will remain unchanged.')) return;
    try {
      const response = await fetch(`/api/auth/users/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${sessionStorage.getItem('schoolAdminToken')}` } });
      const data = await readApiResponse(response);
      if (!response.ok) throw new Error(data.message || 'Unable to delete account.');
      const successMessage = data.message; await load(); setMessage(successMessage);
    } catch (error) { setMessage(error.message); }
  }

  const rows = users.map((user) => ({ ...user, linkedStudent: user.linkedStudent ? `${user.linkedStudent.name} (${user.linkedStudent.studentId})` : '—', linkedTeacher: user.linkedTeacher ? `${user.linkedTeacher.name} (${user.linkedTeacher.teacherId})` : '—' }));
  return <main className="records-page"><header className="dashboard-header"><div><p className="eyebrow">Access administration</p><h1>User accounts</h1><p className="intro-copy">Create role-based accounts linked to real school records. Temporary passwords are never shown again.</p></div><button type="button" className="logout-button" onClick={onBack}>Back to dashboard</button></header><form className="compact-form" onSubmit={createAccount}><label>Full name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label><label>Email address<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required /></label><label>Temporary password<input type="password" minLength="8" autoComplete="new-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required /></label><label>Role<select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value, linkedStudentId: '', linkedTeacherId: '' })}>{['teacher', 'student', 'guardian'].map((role) => <option key={role}>{role}</option>)}</select></label>{form.role === 'teacher' ? <label>Teacher record<select value={form.linkedTeacherId} onChange={(event) => setForm({ ...form, linkedTeacherId: event.target.value })} required><option value="">Select teacher</option>{teachers.map((teacher) => <option key={teacher._id} value={teacher._id}>{teacher.name} ({teacher.teacherId}) — {teacher.assignedClass}</option>)}</select></label> : <label>Student record<select value={form.linkedStudentId} onChange={(event) => setForm({ ...form, linkedStudentId: event.target.value })} required><option value="">Select student</option>{students.map((student) => <option key={student._id} value={student._id}>{student.name} ({student.studentId})</option>)}</select></label>}<button type="submit">Create account</button></form>{message && <p className="form-message" role="status">{message}</p>}<DataTable rows={rows.filter((user) => user.role !== 'admin')} fields={['name', 'email', 'role', 'linkedStudent', 'linkedTeacher']} onDelete={deleteAccount} /></main>;
}

function ResultPage({ onBack }) {
  const [students, setStudents] = useState([]);
  const [results, setResults] = useState([]);
  const [form, setForm] = useState({ student: '', subject: '', examType: 'Final', fullMarks: 100, obtainedMarks: '' });
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState('Loading results...');
  const [searchTerm, setSearchTerm] = useState('');

  async function loadData() {
    try {
      const token = sessionStorage.getItem('schoolAdminToken');
      const [studentResponse, resultResponse] = await Promise.all([fetch('/api/students', { headers: { Authorization: `Bearer ${token}` } }), fetch('/api/results', { headers: { Authorization: `Bearer ${token}` } })]);
      const studentData = await readApiResponse(studentResponse); const resultData = await readApiResponse(resultResponse);
      if (!studentResponse.ok) throw new Error(studentData.message || 'Unable to load students.');
      if (!resultResponse.ok) throw new Error(resultData.message || 'Unable to load results.');
      setStudents(studentData.students); setResults(resultData.results); setMessage('');
    } catch (error) { setMessage(error.message); }
  }

  useEffect(() => { loadData(); }, []);

  async function submitResult(event) {
    event.preventDefault();
    try {
      const token = sessionStorage.getItem('schoolAdminToken');
      const response = await fetch(editingId ? `/api/results/${editingId}` : '/api/results', { method: editingId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ ...form, fullMarks: Number(form.fullMarks), obtainedMarks: Number(form.obtainedMarks) }) });
      const data = await readApiResponse(response);
      if (!response.ok) throw new Error(data.message || 'Unable to save result.');
      setForm({ student: '', subject: '', examType: 'Final', fullMarks: 100, obtainedMarks: '' }); setEditingId(null); setMessage(data.message); loadData();
    } catch (error) { setMessage(error.message); }
  }

  async function deleteResult(result) {
    if (!window.confirm(`Delete ${result.subject} result for ${result.student?.name}?`)) return;
    try { const token = sessionStorage.getItem('schoolAdminToken'); const response = await fetch(`/api/results/${result._id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }); const data = await readApiResponse(response); if (!response.ok) throw new Error(data.message || 'Unable to delete result.'); setResults((items) => items.filter((item) => item._id !== result._id)); setMessage(data.message); } catch (error) { setMessage(error.message); }
  }

  const visibleResults = results.filter((result) => `${result.student?.name || ''} ${result.student?.studentId || ''} ${result.subject}`.toLowerCase().includes(searchTerm.toLowerCase()));
  return <main className="records-page"><header className="dashboard-header"><div><p className="eyebrow">School Management System</p><h1>Result & grade management</h1></div><button type="button" className="logout-button" onClick={onBack}>Back to dashboard</button></header><form className="result-form" onSubmit={submitResult}><label>Student<select value={form.student} onChange={(event) => setForm({ ...form, student: event.target.value })} required><option value="">Select student</option>{students.map((student) => <option key={student._id} value={student._id}>{student.name} ({student.studentId})</option>)}</select></label><label>Subject<input value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })} required /></label><label>Exam<select value={form.examType} onChange={(event) => setForm({ ...form, examType: event.target.value })}><option>Final</option><option>Midterm</option><option>Class Test</option></select></label><label>Full marks<input type="number" min="1" value={form.fullMarks} onChange={(event) => setForm({ ...form, fullMarks: event.target.value })} required /></label><label>Obtained marks<input type="number" min="0" max={form.fullMarks} value={form.obtainedMarks} onChange={(event) => setForm({ ...form, obtainedMarks: event.target.value })} required /></label><button type="submit">{editingId ? 'Update result' : 'Add result'}</button>{editingId && <button type="button" className="logout-button" onClick={() => { setEditingId(null); setForm({ student: '', subject: '', examType: 'Final', fullMarks: 100, obtainedMarks: '' }); }}>Cancel edit</button>}</form>{message && <p className="form-message" role="status">{message}</p>}<input className="search-input" type="search" placeholder="Search by student, ID, or subject" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} />{!message && <div className="table-wrap"><table><thead><tr><th>Student</th><th>Subject</th><th>Exam</th><th>Marks</th><th>Percentage</th><th>Grade</th><th>Action</th></tr></thead><tbody>{visibleResults.map((result) => <tr key={result._id}><td>{result.student?.name}<br /><small>{result.student?.studentId}</small></td><td>{result.subject}</td><td>{result.examType}</td><td>{result.obtainedMarks}/{result.fullMarks}</td><td>{result.percentage}%</td><td><strong className={`grade grade-${result.grade.replace('+', 'plus').replace('-', 'minus')}`}>{result.grade}</strong></td><td className="table-actions"><button type="button" className="table-button" onClick={() => { setEditingId(result._id); setForm({ student: result.student?._id, subject: result.subject, examType: result.examType, fullMarks: result.fullMarks, obtainedMarks: result.obtainedMarks }); }}>Edit</button><button type="button" className="table-button danger-button" onClick={() => deleteResult(result)}>Delete</button></td></tr>)}</tbody></table>{visibleResults.length === 0 && <p className="empty-search">No result records found.</p>}</div>}</main>;
}

function AttendancePage({ onBack }) {
  const [students, setStudents] = useState([]);
  const [records, setRecords] = useState({});
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [message, setMessage] = useState('Loading students...');
  const [classFilter, setClassFilter] = useState('');

  useEffect(() => {
    async function loadStudentsAndAttendance() {
      try {
        setMessage('Loading attendance...');
        const token = sessionStorage.getItem('schoolAdminToken');
        const [studentResponse, attendanceResponse] = await Promise.all([
          fetch('/api/students', { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`/api/attendance?date=${date}`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        const studentData = await readApiResponse(studentResponse);
        const attendanceData = await readApiResponse(attendanceResponse);
        if (!studentResponse.ok) throw new Error(studentData.message || 'Unable to load students.');
        if (!attendanceResponse.ok) throw new Error(attendanceData.message || 'Unable to load attendance.');
        setStudents(studentData.students);
        setRecords(Object.fromEntries(attendanceData.attendance.map((item) => [item.student?._id, item.status])));
        setMessage('');
      } catch (error) { setMessage(error.message); }
    }
    loadStudentsAndAttendance();
  }, [date]);

  const classOptions = [...new Set(students.map((student) => `${student.className} - ${student.section}`))].sort();
  const visibleStudents = students.filter((student) => !classFilter || `${student.className} - ${student.section}` === classFilter);

  async function saveAttendance() {
    if (visibleStudents.length === 0) return;
    try {
      const token = sessionStorage.getItem('schoolAdminToken');
      const response = await fetch('/api/attendance/mark', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ date, records: visibleStudents.map((student) => ({ student: student._id, status: records[student._id] || 'Present' })) }) });
      const data = await readApiResponse(response);
      if (!response.ok) throw new Error(data.message || 'Unable to save attendance.');
      setMessage(data.message);
    } catch (error) { setMessage(error.message); }
  }

  return <main className="records-page"><header className="dashboard-header"><div><p className="eyebrow">School Management System</p><h1>Daily attendance</h1></div><button type="button" className="logout-button" onClick={onBack}>Back to dashboard</button></header><section className="attendance-controls"><label>Date<input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label><label>Class filter<select value={classFilter} onChange={(event) => setClassFilter(event.target.value)}><option value="">All classes</option>{classOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label><button type="button" onClick={saveAttendance} disabled={visibleStudents.length === 0}>Save attendance</button></section>{message && <p className="form-message" role="status">{message}</p>}{!message && <div className="table-wrap"><table><thead><tr><th>Student</th><th>ID</th><th>Class</th><th>Roll</th><th>Attendance status</th></tr></thead><tbody>{visibleStudents.map((student) => <tr key={student._id}><td>{student.name}</td><td>{student.studentId}</td><td>{student.className} - {student.section}</td><td>{student.rollNumber}</td><td><select className="status-select" value={records[student._id] || 'Present'} onChange={(event) => setRecords({ ...records, [student._id]: event.target.value })}><option>Present</option><option>Absent</option></select></td></tr>)}</tbody></table>{visibleStudents.length === 0 && <p className="empty-search">No students found for this selection.</p>}</div>}</main>;
}

function ClassList({ onBack, onAddClass, onEditClass }) {
  const [classes, setClasses] = useState([]);
  const [message, setMessage] = useState('Loading classes...');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function loadClasses() {
      try {
        const token = sessionStorage.getItem('schoolAdminToken');
        const response = await fetch('/api/classes', { headers: { Authorization: `Bearer ${token}` } });
        const data = await readApiResponse(response);
        if (!response.ok) throw new Error(data.message || 'Unable to load classes.');
        setClasses(data.classes);
        setMessage('');
      } catch (error) {
        setMessage(error.message);
      }
    }
    loadClasses();
  }, []);

  async function handleDelete(schoolClass) {
    if (!window.confirm(`Delete ${schoolClass.className} - ${schoolClass.section}?`)) return;
    try {
      const token = sessionStorage.getItem('schoolAdminToken');
      const response = await fetch(`/api/classes/${schoolClass._id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      const data = await readApiResponse(response);
      if (!response.ok) throw new Error(data.message || 'Unable to delete class.');
      setClasses((items) => items.filter((item) => item._id !== schoolClass._id));
      setMessage('Class deleted successfully.');
    } catch (error) {
      setMessage(error.message);
    }
  }

  const filteredClasses = classes.filter((item) => `${item.className} ${item.section} ${item.classTeacher}`.toLowerCase().includes(searchTerm.trim().toLowerCase()));

  return (
    <main className="records-page">
      <header className="dashboard-header">
        <div><p className="eyebrow">School Management System</p><h1>Class & section management</h1></div>
        <div className="header-actions"><button type="button" className="students-button" onClick={onAddClass}>Add class</button><button type="button" className="logout-button" onClick={onBack}>Back to dashboard</button></div>
      </header>
      {message && <p className="form-message" role="status">{message}</p>}
      <input className="search-input" type="search" placeholder="Search class, section, or teacher" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} />
      {classes.length > 0 && <div className="table-wrap"><table><thead><tr><th>Class</th><th>Section</th><th>Class teacher</th><th>Room</th><th>Action</th></tr></thead><tbody>{filteredClasses.map((item) => <tr key={item._id}><td>{item.className}</td><td>{item.section}</td><td>{item.classTeacher || '—'}</td><td>{item.roomNumber || '—'}</td><td className="table-actions"><button type="button" className="table-button" onClick={() => onEditClass(item)}>Edit</button><button type="button" className="table-button danger-button" onClick={() => handleDelete(item)}>Delete</button></td></tr>)}</tbody></table>{filteredClasses.length === 0 && <p className="empty-search">No matching class found.</p>}</div>}
      {!message && classes.length === 0 && <section className="empty-state"><h2>No classes yet</h2><p>Add the first class and section to organize school records.</p><button type="button" onClick={onAddClass}>Add class</button></section>}
    </main>
  );
}

function ClassForm({ onBack, schoolClass }) {
  const isEditing = Boolean(schoolClass);
  const [form, setForm] = useState(() => schoolClass ? { className: schoolClass.className, section: schoolClass.section, classTeacher: schoolClass.classTeacher || '', roomNumber: schoolClass.roomNumber || '' } : { className: '', section: '', classTeacher: '', roomNumber: '' });
  const [message, setMessage] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    try {
      const token = sessionStorage.getItem('schoolAdminToken');
      const response = await fetch(isEditing ? `/api/classes/${schoolClass._id}` : '/api/classes', { method: isEditing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(form) });
      const data = await readApiResponse(response);
      if (!response.ok) throw new Error(data.message || 'Unable to save class.');
      setMessage(isEditing ? 'Class updated successfully.' : 'Class added successfully.');
      if (!isEditing) setForm({ className: '', section: '', classTeacher: '', roomNumber: '' });
    } catch (error) { setMessage(error.message); }
  }

  return <main className="records-page"><header className="dashboard-header"><div><p className="eyebrow">School Management System</p><h1>{isEditing ? 'Edit class' : 'Add class'}</h1></div><button type="button" className="logout-button" onClick={onBack}>Back to classes</button></header><form className="record-form" onSubmit={handleSubmit}><label>Class name<input value={form.className} onChange={(event) => setForm({ ...form, className: event.target.value })} placeholder="Example: Class 10" required /></label><label>Section<input value={form.section} onChange={(event) => setForm({ ...form, section: event.target.value.toUpperCase() })} placeholder="Example: A" required /></label><label>Class teacher<input value={form.classTeacher} onChange={(event) => setForm({ ...form, classTeacher: event.target.value })} placeholder="Optional" /></label><label>Room number<input value={form.roomNumber} onChange={(event) => setForm({ ...form, roomNumber: event.target.value })} placeholder="Optional" /></label><button type="submit" className="full-width">{isEditing ? 'Save changes' : 'Add class'}</button></form>{message && <p className="form-message" role="status">{message}</p>}</main>;
}

function AccountSettings({ admin, onBack, onAdminUpdated }) {
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [emailForm, setEmailForm] = useState({ currentPassword: '', newEmail: admin.email });
  const [passwordMessage, setPasswordMessage] = useState('');
  const [emailMessage, setEmailMessage] = useState('');

  async function changePassword(event) {
    event.preventDefault();
    setPasswordMessage('');
    if (passwordForm.newPassword !== passwordForm.confirmPassword) return setPasswordMessage('New passwords do not match.');
    try {
      const token = sessionStorage.getItem('schoolAdminToken');
      const response = await fetch('/api/auth/change-password', { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword }) });
      const data = await readApiResponse(response);
      if (!response.ok) throw new Error(data.message || 'Unable to change password.');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPasswordMessage(data.message);
    } catch (error) { setPasswordMessage(error.message); }
  }

  async function changeEmail(event) {
    event.preventDefault();
    setEmailMessage('');
    try {
      const token = sessionStorage.getItem('schoolAdminToken');
      const response = await fetch('/api/auth/change-email', { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ currentPassword: emailForm.currentPassword, newEmail: emailForm.newEmail }) });
      const data = await readApiResponse(response);
      if (!response.ok) throw new Error(data.message || 'Unable to change email.');
      onAdminUpdated(data.admin);
      setEmailForm({ currentPassword: '', newEmail: data.admin.email });
      setEmailMessage(data.message);
    } catch (error) { setEmailMessage(error.message); }
  }

  return <main className="records-page"><header className="dashboard-header"><div><p className="eyebrow">School Management System</p><h1>Account settings</h1></div><button type="button" className="logout-button" onClick={onBack}>Back to dashboard</button></header><section className="settings-grid"><form className="record-form" onSubmit={changePassword}><div className="full-width"><h2>Change password</h2><p className="card-copy">Use a strong password with at least 8 characters.</p></div><label className="full-width">Current password<input type="password" value={passwordForm.currentPassword} onChange={(event) => setPasswordForm({ ...passwordForm, currentPassword: event.target.value })} autoComplete="current-password" required /></label><label>New password<input type="password" value={passwordForm.newPassword} onChange={(event) => setPasswordForm({ ...passwordForm, newPassword: event.target.value })} autoComplete="new-password" minLength="8" required /></label><label>Confirm password<input type="password" value={passwordForm.confirmPassword} onChange={(event) => setPasswordForm({ ...passwordForm, confirmPassword: event.target.value })} autoComplete="new-password" minLength="8" required /></label><button type="submit" className="full-width">Update password</button>{passwordMessage && <p className="form-message full-width" role="status">{passwordMessage}</p>}</form><form className="record-form" onSubmit={changeEmail}><div className="full-width"><h2>Change email</h2><p className="card-copy">Your current password is required to update the sign-in email.</p></div><label className="full-width">New email address<input type="email" value={emailForm.newEmail} onChange={(event) => setEmailForm({ ...emailForm, newEmail: event.target.value })} autoComplete="email" required /></label><label className="full-width">Current password<input type="password" value={emailForm.currentPassword} onChange={(event) => setEmailForm({ ...emailForm, currentPassword: event.target.value })} autoComplete="current-password" required /></label><button type="submit" className="full-width">Update email</button>{emailMessage && <p className="form-message full-width" role="status">{emailMessage}</p>}</form></section></main>;
}

function StudentList({ onBack, onAddStudent, onEditStudent }) {
  const [students, setStudents] = useState([]);
  const [message, setMessage] = useState('Loading students...');
  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      try {
        if (active) setMessage('Loading students...');
        const token = sessionStorage.getItem('schoolAdminToken');
        const params = new URLSearchParams({ page: String(currentPage), limit: '15' });
        if (searchTerm.trim()) params.set('search', searchTerm.trim());
        if (classFilter.trim()) params.set('className', classFilter.trim());
        if (sectionFilter.trim()) params.set('section', sectionFilter.trim());
        const response = await fetch(`/api/students?${params}`, { headers: { Authorization: `Bearer ${token}` } });
        const data = await readApiResponse(response);
        if (!response.ok) throw new Error(data.message || 'Unable to load students.');
        if (active) { setStudents(data.students || []); setPagination(data.pagination); setMessage(''); }
      } catch (error) { if (active) setMessage(error.message); }
    }, 250);
    return () => { active = false; clearTimeout(timer); };
  }, [currentPage, searchTerm, classFilter, sectionFilter, reloadKey]);

  async function handleDelete(student) {
    const confirmed = window.confirm(`Delete ${student.name}? This cannot be undone.`);
    if (!confirmed) return;

    try {
      const token = sessionStorage.getItem('schoolAdminToken');
      const response = await fetch(`/api/students/${student._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await readApiResponse(response);

      if (!response.ok) {
        throw new Error(data.message || 'Unable to delete student.');
      }

      if (students.length === 1 && currentPage > 1) setCurrentPage((page) => page - 1);
      else setReloadKey((key) => key + 1);
      setMessage(data.message || 'Student deleted successfully.');
    } catch (error) {
      setMessage(error.message);
    }
  }

  return (
    <main className="records-page">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">School Management System</p>
          <h1>Student records</h1>
        </div>
        <div className="header-actions">
          <button type="button" className="students-button" onClick={onAddStudent}>Add student</button>
          <button type="button" className="logout-button" onClick={onBack}>Back to dashboard</button>
        </div>
      </header>

      {message && <p className="form-message" role="status">{message}</p>}
      <div className="record-filters"><label>Search<input className="search-input" type="search" placeholder="Student name or ID" value={searchTerm} onChange={(event) => { setSearchTerm(event.target.value); setCurrentPage(1); }} /></label><label>Class<input value={classFilter} placeholder="e.g. Class 10" onChange={(event) => { setClassFilter(event.target.value); setCurrentPage(1); }} /></label><label>Section<input value={sectionFilter} placeholder="Any" onChange={(event) => { setSectionFilter(event.target.value); setCurrentPage(1); }} /></label></div>
      {students.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Photo</th><th>ID</th><th>Name</th><th>Class</th><th>Section</th><th>Roll</th><th>Guardian phone</th><th>Action</th></tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student._id}>
                  <td>{student.photoUrl ? <img className="record-avatar" src={student.photoUrl} alt={`${student.name} profile`} /> : <span className="record-avatar avatar-fallback" aria-label={`No profile photo for ${student.name}`}>{student.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</span>}</td><td>{student.studentId}</td><td>{student.name}</td><td>{student.className}</td>
                  <td>{student.section}</td><td>{student.rollNumber}</td><td>{student.guardianPhone}</td>
                  <td className="table-actions">
                    <button type="button" className="table-button" onClick={() => onEditStudent(student)}>Edit</button>
                    <button type="button" className="table-button danger-button" onClick={() => handleDelete(student)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <PaginationControls pagination={pagination} onPageChange={setCurrentPage} />
      {!message && students.length === 0 && (
        <section className="empty-state"><h2>{searchTerm || classFilter || sectionFilter ? 'No matching students' : 'No student records yet'}</h2><p>{searchTerm || classFilter || sectionFilter ? 'Try another search or clear your class and section filters.' : 'Add the first student to begin managing school records.'}</p>{!(searchTerm || classFilter || sectionFilter) && <button type="button" onClick={onAddStudent}>Add student</button>}</section>
      )}
    </main>
  );
}

function TeacherList({ onBack, onAddTeacher, onEditTeacher }) {
  const [teachers, setTeachers] = useState([]);
  const [message, setMessage] = useState('Loading teachers...');
  const [searchTerm, setSearchTerm] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      try {
        if (active) setMessage('Loading teachers...');
        const token = sessionStorage.getItem('schoolAdminToken');
        const params = new URLSearchParams({ page: String(currentPage), limit: '15' });
        if (searchTerm.trim()) params.set('search', searchTerm.trim());
        if (subjectFilter.trim()) params.set('subject', subjectFilter.trim());
        if (classFilter.trim()) params.set('assignedClass', classFilter.trim());
        const response = await fetch(`/api/teachers?${params}`, { headers: { Authorization: `Bearer ${token}` } });
        const data = await readApiResponse(response);
        if (!response.ok) throw new Error(data.message || 'Unable to load teachers.');
        if (active) { setTeachers(data.teachers || []); setPagination(data.pagination); setMessage(''); }
      } catch (error) { if (active) setMessage(error.message); }
    }, 250);
    return () => { active = false; clearTimeout(timer); };
  }, [currentPage, searchTerm, subjectFilter, classFilter, reloadKey]);

  async function handleDelete(teacher) {
    const confirmed = window.confirm(`Delete ${teacher.name}? This cannot be undone.`);
    if (!confirmed) return;

    try {
      const token = sessionStorage.getItem('schoolAdminToken');
      const response = await fetch(`/api/teachers/${teacher._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await readApiResponse(response);
      if (!response.ok) throw new Error(data.message || 'Unable to delete teacher.');
      if (teachers.length === 1 && currentPage > 1) setCurrentPage((page) => page - 1);
      else setReloadKey((key) => key + 1);
      setMessage(data.message || 'Teacher deleted successfully.');
    } catch (error) {
      setMessage(error.message);
    }
  }

  return (
    <main className="records-page">
      <header className="dashboard-header">
        <div><p className="eyebrow">School Management System</p><h1>Teacher records</h1></div>
        <div className="header-actions">
          <button type="button" className="students-button" onClick={onAddTeacher}>Add teacher</button>
          <button type="button" className="logout-button" onClick={onBack}>Back to dashboard</button>
        </div>
      </header>
      {message && <p className="form-message" role="status">{message}</p>}
      <div className="record-filters"><label>Search<input className="search-input" type="search" placeholder="Name, ID, subject, or class" value={searchTerm} onChange={(event) => { setSearchTerm(event.target.value); setCurrentPage(1); }} /></label><label>Subject<input value={subjectFilter} placeholder="Any subject" onChange={(event) => { setSubjectFilter(event.target.value); setCurrentPage(1); }} /></label><label>Assigned class<input value={classFilter} placeholder="Any class" onChange={(event) => { setClassFilter(event.target.value); setCurrentPage(1); }} /></label></div>
      {teachers.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Photo</th><th>ID</th><th>Name</th><th>Subject</th><th>Assigned class</th><th>Phone</th><th>Action</th></tr></thead>
            <tbody>{teachers.map((teacher) => (
              <tr key={teacher._id}><td>{teacher.photoUrl ? <img className="record-avatar" src={teacher.photoUrl} alt={`${teacher.name} profile`} /> : <span className="record-avatar avatar-fallback" aria-label={`No profile photo for ${teacher.name}`}>{teacher.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</span>}</td><td>{teacher.teacherId}</td><td>{teacher.name}</td><td>{teacher.subject}</td><td>{teacher.assignedClass}</td><td>{teacher.phone}</td><td className="table-actions"><button type="button" className="table-button" onClick={() => onEditTeacher(teacher)}>Edit</button><button type="button" className="table-button danger-button" onClick={() => handleDelete(teacher)}>Delete</button></td></tr>
            ))}</tbody>
          </table>
        </div>
      )}
      <PaginationControls pagination={pagination} onPageChange={setCurrentPage} />
      {!message && teachers.length === 0 && (
        <section className="empty-state"><h2>{searchTerm || subjectFilter || classFilter ? 'No matching teachers' : 'No teacher records yet'}</h2><p>{searchTerm || subjectFilter || classFilter ? 'Try another search or clear the subject and class filters.' : 'Add the first teacher to begin managing school records.'}</p>{!(searchTerm || subjectFilter || classFilter) && <button type="button" onClick={onAddTeacher}>Add teacher</button>}</section>
      )}
    </main>
  );
}

function TeacherForm({ onBack, teacher }) {
  const isEditing = Boolean(teacher);
  const [form, setForm] = useState(() => teacher ? {
    teacherId: teacher.teacherId, name: teacher.name, subject: teacher.subject, assignedClass: teacher.assignedClass, phone: teacher.phone, photoUrl: teacher.photoUrl || '',
  } : { teacherId: '', name: '', subject: '', assignedClass: '', phone: '', photoUrl: '' });
  const [message, setMessage] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    try {
      const token = sessionStorage.getItem('schoolAdminToken');
      const response = await fetch(isEditing ? `/api/teachers/${teacher._id}` : '/api/teachers', {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const data = await readApiResponse(response);
      if (!response.ok) throw new Error(data.message || 'Unable to add teacher.');
      setMessage(isEditing ? 'Teacher updated successfully.' : 'Teacher added successfully.');
      if (!isEditing) setForm({ teacherId: '', name: '', subject: '', assignedClass: '', phone: '', photoUrl: '' });
    } catch (error) {
      setMessage(error.message);
    }
  }

  return (
    <main className="records-page">
      <header className="dashboard-header">
        <div><p className="eyebrow">School Management System</p><h1>{isEditing ? 'Edit teacher' : 'Add teacher'}</h1></div>
        <button type="button" className="logout-button" onClick={onBack}>Back to teachers</button>
      </header>
      <form className="record-form" onSubmit={handleSubmit}>
        <label>Teacher ID<input value={form.teacherId} onChange={(event) => setForm({ ...form, teacherId: event.target.value })} required /></label>
        <label>Full name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label>
        <label>Subject<input value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })} required /></label>
        <label>Assigned class<input value={form.assignedClass} onChange={(event) => setForm({ ...form, assignedClass: event.target.value })} required /></label>
        <label className="full-width">Phone<input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} required /></label>
        <ProfilePhotoField value={form.photoUrl} onChange={(photoUrl) => setForm({ ...form, photoUrl })} />
        <button type="submit" className="full-width">{isEditing ? 'Save changes' : 'Add teacher'}</button>
      </form>
      {message && <p className="form-message" role="status">{message}</p>}
    </main>
  );
}

function StudentForm({ onBack, student }) {
  const isEditing = Boolean(student);
  const [form, setForm] = useState(() => student ? {
    studentId: student.studentId, name: student.name, className: student.className, section: student.section,
    rollNumber: student.rollNumber, dateOfBirth: student.dateOfBirth.slice(0, 10), guardianPhone: student.guardianPhone, address: student.address, photoUrl: student.photoUrl || '',
  } : {
    studentId: '', name: '', className: '', section: '', rollNumber: '', dateOfBirth: '', guardianPhone: '', address: '', photoUrl: '',
  });
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage('');
    setIsSubmitting(true);

    try {
      const token = sessionStorage.getItem('schoolAdminToken');
      const response = await fetch(isEditing ? `/api/students/${student._id}` : '/api/students', {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const data = await readApiResponse(response);

      if (!response.ok) {
        throw new Error(data.message || 'Unable to add student.');
      }

      setMessage(isEditing ? 'Student updated successfully.' : 'Student added successfully.');
      if (!isEditing) {
        setForm({ studentId: '', name: '', className: '', section: '', rollNumber: '', dateOfBirth: '', guardianPhone: '', address: '', photoUrl: '' });
      }
    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="records-page">
      <header className="dashboard-header">
        <div><p className="eyebrow">School Management System</p><h1>{isEditing ? 'Edit student' : 'Add student'}</h1></div>
        <button type="button" className="logout-button" onClick={onBack}>Back to students</button>
      </header>
      <form className="record-form" onSubmit={handleSubmit}>
        <label>Student ID<input name="studentId" value={form.studentId} onChange={updateField} required /></label>
        <label>Full name<input name="name" value={form.name} onChange={updateField} required /></label>
        <label>Class<input name="className" value={form.className} onChange={updateField} required /></label>
        <label>Section<input name="section" value={form.section} onChange={updateField} required /></label>
        <label>Roll number<input name="rollNumber" value={form.rollNumber} onChange={updateField} required /></label>
        <label>Date of birth<input type="date" name="dateOfBirth" value={form.dateOfBirth} onChange={updateField} required /></label>
        <label>Guardian phone<input name="guardianPhone" value={form.guardianPhone} onChange={updateField} required /></label>
        <label className="full-width">Address<input name="address" value={form.address} onChange={updateField} required /></label>
        <ProfilePhotoField value={form.photoUrl} onChange={(photoUrl) => setForm({ ...form, photoUrl })} />
        <button type="submit" className="full-width" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : isEditing ? 'Save changes' : 'Add student'}</button>
      </form>
      {message && <p className="form-message" role="status">{message}</p>}
    </main>
  );
}

export default function App() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState(null);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [resetStep, setResetStep] = useState('request');
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [admin, setAdmin] = useState(getStoredAdmin);
  const [page, setPage] = useState('dashboard');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [selectedClass, setSelectedClass] = useState(null);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('schoolTheme') === 'dark');

  useEffect(() => {
    document.documentElement.classList.toggle('dark-theme', darkMode);
    localStorage.setItem('schoolTheme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage('');
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await readApiResponse(response);

      if (!response.ok) {
        throw new Error(data.message || 'Unable to sign in.');
      }

      if ((data.admin?.role || 'admin') !== selectedRole) {
        throw new Error('This account does not match the selected sign-in type. Please choose the correct account type.');
      }

      sessionStorage.setItem('schoolAdminToken', data.token);
      sessionStorage.setItem('schoolAdmin', JSON.stringify(data.admin));
      setAdmin(data.admin);
      setPage('dashboard');
      setPassword('');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleLogout() {
    sessionStorage.removeItem('schoolAdminToken');
    sessionStorage.removeItem('schoolAdmin');
    setAdmin(null);
    setPage('dashboard');
    setMessage('');
  }

  async function handlePasswordReset(event) {
    event.preventDefault(); setMessage(''); setIsSubmitting(true);
    const endpoint = resetStep === 'request' ? '/api/auth/request-password-reset' : '/api/auth/reset-password';
    const body = resetStep === 'request' ? { email: resetEmail } : { email: resetEmail, code: resetCode, newPassword: resetPassword };
    try { const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); const data = await readApiResponse(response); if (!response.ok) throw new Error(data.message || 'Unable to continue.'); setMessage(data.message); if (resetStep === 'request') setResetStep('confirm'); else { setResetMode(false); setResetStep('request'); setResetCode(''); setResetPassword(''); } } catch (error) { setMessage(error.message); } finally { setIsSubmitting(false); }
  }

  if (admin) {
    if (admin.role && admin.role !== 'admin') {
      return <RolePortal admin={admin} onLogout={handleLogout} darkMode={darkMode} onToggleTheme={() => setDarkMode((value) => !value)} />;
    }
    if (page === 'students') {
      return <StudentList onBack={() => setPage('dashboard')} onAddStudent={() => setPage('studentAdd')} onEditStudent={(student) => { setSelectedStudent(student); setPage('studentEdit'); }} />;
    }
    if (page === 'studentAdd') {
      return <StudentForm onBack={() => setPage('students')} />;
    }
    if (page === 'studentEdit') {
      return <StudentForm student={selectedStudent} onBack={() => { setSelectedStudent(null); setPage('students'); }} />;
    }
    if (page === 'teachers') {
      return <TeacherList onBack={() => setPage('dashboard')} onAddTeacher={() => setPage('teacherAdd')} onEditTeacher={(teacher) => { setSelectedTeacher(teacher); setPage('teacherEdit'); }} />;
    }
    if (page === 'classes') {
      return <ClassList onBack={() => setPage('dashboard')} onAddClass={() => setPage('classAdd')} onEditClass={(schoolClass) => { setSelectedClass(schoolClass); setPage('classEdit'); }} />;
    }
    if (page === 'classAdd') {
      return <ClassForm onBack={() => setPage('classes')} />;
    }
    if (page === 'classEdit') {
      return <ClassForm schoolClass={selectedClass} onBack={() => { setSelectedClass(null); setPage('classes'); }} />;
    }
    if (page === 'settings') {
      return <AccountSettings admin={admin} onBack={() => setPage('dashboard')} onAdminUpdated={(updatedAdmin) => { sessionStorage.setItem('schoolAdmin', JSON.stringify(updatedAdmin)); setAdmin(updatedAdmin); }} />;
    }
    if (page === 'users') return <UsersManagement onBack={() => setPage('dashboard')} />;
    if (page === 'audit') return <AuditHistory onBack={() => setPage('dashboard')} />;
    if (page === 'attendance') {
      return <AttendancePage onBack={() => setPage('dashboard')} />;
    }
    if (page === 'results') {
      return <ResultPage onBack={() => setPage('dashboard')} />;
    }
    if (page === 'operations') {
      return <OperationsHub onBack={() => setPage('dashboard')} />;
    }
    if (page === 'teacherAdd') {
      return <TeacherForm onBack={() => setPage('teachers')} />;
    }
    if (page === 'teacherEdit') {
      return <TeacherForm teacher={selectedTeacher} onBack={() => { setSelectedTeacher(null); setPage('teachers'); }} />;
    }
    return <Dashboard admin={admin} onLogout={handleLogout} onViewStudents={() => setPage('students')} onViewTeachers={() => setPage('teachers')} onViewClasses={() => setPage('classes')} onViewAttendance={() => setPage('attendance')} onViewResults={() => setPage('results')} onViewOperations={() => setPage('operations')} onViewSettings={() => setPage('settings')} onViewUsers={() => setPage('users')} onViewAudit={() => setPage('audit')} darkMode={darkMode} onToggleTheme={() => setDarkMode((value) => !value)} />;
  }

  return (
    <main className="login-page">
      <button type="button" className="login-theme-toggle" onClick={() => setDarkMode((value) => !value)} aria-label="Toggle color theme">
        {darkMode ? '☀ Light mode' : '◐ Dark mode'}
      </button>
      <section className="login-intro" aria-label="School Management System introduction">
        <p className="eyebrow">School Management System</p>
        <h1>Manage School records with confidence.</h1>
        <p className="intro-copy">
          A secure workspace for administrators to organize student and teacher information.
        </p>
        <BangladeshClock />
        <PublicNotices />
      </section>

      <section className={`login-card${!selectedRole && !resetMode ? ' role-picker-card' : ''}`} aria-labelledby="login-title">
        {!selectedRole && !resetMode ? <>
          <div className="role-picker-heading">
            <p className="card-kicker">Secure portal access</p>
            <h2 id="login-title">Welcome to your school portal</h2>
            <p className="card-copy">Choose your account type to continue to the right sign-in page.</p>
          </div>
          <div className="role-options" aria-label="Choose account type">
            {[
              ['admin', 'Administrator', 'Manage school records and academic operations.', 'AD'],
              ['teacher', 'Teacher', 'Open your teaching workspace and assigned class details.', 'TE'],
              ['student', 'Student', 'View your academic profile, attendance, and results.', 'ST'],
              ['guardian', 'Parent / Guardian', 'Follow the linked learner’s school progress.', 'GU'],
            ].map(([role, title, description, initials]) => <button type="button" className="role-option" key={role} onClick={() => { setSelectedRole(role); setMessage(''); }}>
              <span className="role-icon" aria-hidden="true">{initials}</span>
              <span className="role-option-copy"><strong>{title}</strong><small>{description}</small></span>
              <span className="role-arrow" aria-hidden="true">→</span>
            </button>)}
          </div>
          <p className="role-picker-note"><span aria-hidden="true">✓</span> Sign in with the account provided by your school.</p>
        </> : <>
          <div className="login-card-heading">
            {!resetMode && <button type="button" className="login-back-button" onClick={() => { setSelectedRole(null); setEmail(''); setPassword(''); setMessage(''); }}>← All account types</button>}
            <p className="card-kicker">{resetMode ? 'Account recovery' : `${selectedRole === 'admin' ? 'Administrator' : selectedRole === 'teacher' ? 'Teacher' : selectedRole === 'guardian' ? 'Parent / Guardian' : 'Student'} access`}</p>
            <h2 id="login-title">{resetMode ? 'Reset password' : `${selectedRole === 'admin' ? 'Administrator' : selectedRole === 'teacher' ? 'Teacher' : selectedRole === 'guardian' ? 'Parent / Guardian' : 'Student'} sign in`}</h2>
            <p className="card-copy">{resetMode ? 'Use your email verification code to set a new password.' : `Sign in with the ${selectedRole === 'admin' ? 'administrator' : selectedRole === 'teacher' ? 'teacher' : selectedRole === 'guardian' ? 'parent or guardian' : 'student'} account provided by your school.`}</p>
          </div>

        {!resetMode ? <form onSubmit={handleSubmit} className="login-form">
          <label htmlFor="email">Email address</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
          />

          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </button>
          <button type="button" className="text-button" onClick={() => { setResetMode(true); setMessage(''); }}>Forgot password?</button>
        </form> : <form onSubmit={handlePasswordReset} className="login-form"><label>Email address<input type="email" value={resetEmail} onChange={(event) => setResetEmail(event.target.value)} required /></label>{resetStep === 'confirm' && <><label>Six-digit code<input value={resetCode} onChange={(event) => setResetCode(event.target.value)} inputMode="numeric" required /></label><label>New password<input type="password" minLength="8" value={resetPassword} onChange={(event) => setResetPassword(event.target.value)} required /></label></>}<button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Please wait...' : resetStep === 'request' ? 'Send reset code' : 'Reset password'}</button><button type="button" className="text-button" onClick={() => { setResetMode(false); setResetStep('request'); setMessage(''); }}>Back to sign in</button></form>}

        </>}

        {message && <p className="form-message" role="status">{message}</p>}
      </section>
    </main>
  );
}
