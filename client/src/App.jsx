import { useEffect, useState } from 'react';

function getStoredAdmin() {
  const storedAdmin = sessionStorage.getItem('schoolAdmin');
  return storedAdmin ? JSON.parse(storedAdmin) : null;
}

function Dashboard({ admin, onLogout, onViewStudents, onViewTeachers, onViewClasses, onViewAttendance, onViewResults, onViewSettings }) {
  const [summary, setSummary] = useState(null);
  const [message, setMessage] = useState('Loading dashboard summary...');

  async function loadSummary() {
    try {
      setMessage('Loading dashboard summary...');
      const token = sessionStorage.getItem('schoolAdminToken');
      const response = await fetch('/api/dashboard/summary', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();

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
          <button type="button" className="logout-button" onClick={onViewSettings}>Settings</button>
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
      </section>
    </main>
  );
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
      const studentData = await studentResponse.json(); const resultData = await resultResponse.json();
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
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to save result.');
      setForm({ student: '', subject: '', examType: 'Final', fullMarks: 100, obtainedMarks: '' }); setEditingId(null); setMessage(data.message); loadData();
    } catch (error) { setMessage(error.message); }
  }

  async function deleteResult(result) {
    if (!window.confirm(`Delete ${result.subject} result for ${result.student?.name}?`)) return;
    try { const token = sessionStorage.getItem('schoolAdminToken'); const response = await fetch(`/api/results/${result._id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }); const data = await response.json(); if (!response.ok) throw new Error(data.message || 'Unable to delete result.'); setResults((items) => items.filter((item) => item._id !== result._id)); setMessage(data.message); } catch (error) { setMessage(error.message); }
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
        const studentData = await studentResponse.json();
        const attendanceData = await attendanceResponse.json();
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
      const data = await response.json();
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
        const data = await response.json();
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
      const data = await response.json();
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
      const data = await response.json();
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
      const data = await response.json();
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
      const data = await response.json();
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

  useEffect(() => {
    async function loadStudents() {
      try {
        const token = sessionStorage.getItem('schoolAdminToken');
        const response = await fetch('/api/students', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Unable to load students.');
        }

        setStudents(data.students);
        setMessage('');
      } catch (error) {
        setMessage(error.message);
      }
    }

    loadStudents();
  }, []);

  async function handleDelete(student) {
    const confirmed = window.confirm(`Delete ${student.name}? This cannot be undone.`);
    if (!confirmed) return;

    try {
      const token = sessionStorage.getItem('schoolAdminToken');
      const response = await fetch(`/api/students/${student._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Unable to delete student.');
      }

      setStudents(students.filter((item) => item._id !== student._id));
      setMessage('Student deleted successfully.');
    } catch (error) {
      setMessage(error.message);
    }
  }

  const filteredStudents = students.filter((student) => {
    const query = searchTerm.trim().toLowerCase();
    return !query || student.name.toLowerCase().includes(query) || student.studentId.toLowerCase().includes(query);
  });

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
      <input className="search-input" type="search" placeholder="Search by student name or ID" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} />
      {students.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>ID</th><th>Name</th><th>Class</th><th>Section</th><th>Roll</th><th>Guardian phone</th><th>Action</th></tr>
            </thead>
            <tbody>
              {filteredStudents.map((student) => (
                <tr key={student._id}>
                  <td>{student.studentId}</td><td>{student.name}</td><td>{student.className}</td>
                  <td>{student.section}</td><td>{student.rollNumber}</td><td>{student.guardianPhone}</td>
                  <td className="table-actions">
                    <button type="button" className="table-button" onClick={() => onEditStudent(student)}>Edit</button>
                    <button type="button" className="table-button danger-button" onClick={() => handleDelete(student)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredStudents.length === 0 && <p className="empty-search">No matching student found.</p>}
        </div>
      )}
      {!message && students.length === 0 && (
        <section className="empty-state"><h2>No student records yet</h2><p>Add the first student to begin managing school records.</p><button type="button" onClick={onAddStudent}>Add student</button></section>
      )}
    </main>
  );
}

function TeacherList({ onBack, onAddTeacher, onEditTeacher }) {
  const [teachers, setTeachers] = useState([]);
  const [message, setMessage] = useState('Loading teachers...');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function loadTeachers() {
      try {
        const token = sessionStorage.getItem('schoolAdminToken');
        const response = await fetch('/api/teachers', { headers: { Authorization: `Bearer ${token}` } });
        const data = await response.json();

        if (!response.ok) throw new Error(data.message || 'Unable to load teachers.');

        setTeachers(data.teachers);
        setMessage('');
      } catch (error) {
        setMessage(error.message);
      }
    }

    loadTeachers();
  }, []);

  async function handleDelete(teacher) {
    const confirmed = window.confirm(`Delete ${teacher.name}? This cannot be undone.`);
    if (!confirmed) return;

    try {
      const token = sessionStorage.getItem('schoolAdminToken');
      const response = await fetch(`/api/teachers/${teacher._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to delete teacher.');
      setTeachers(teachers.filter((item) => item._id !== teacher._id));
      setMessage('Teacher deleted successfully.');
    } catch (error) {
      setMessage(error.message);
    }
  }

  const filteredTeachers = teachers.filter((teacher) => {
    const query = searchTerm.trim().toLowerCase();
    return !query || teacher.name.toLowerCase().includes(query) || teacher.teacherId.toLowerCase().includes(query);
  });

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
      <input className="search-input" type="search" placeholder="Search by teacher name or ID" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} />
      {teachers.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead><tr><th>ID</th><th>Name</th><th>Subject</th><th>Assigned class</th><th>Phone</th><th>Action</th></tr></thead>
            <tbody>{filteredTeachers.map((teacher) => (
              <tr key={teacher._id}><td>{teacher.teacherId}</td><td>{teacher.name}</td><td>{teacher.subject}</td><td>{teacher.assignedClass}</td><td>{teacher.phone}</td><td className="table-actions"><button type="button" className="table-button" onClick={() => onEditTeacher(teacher)}>Edit</button><button type="button" className="table-button danger-button" onClick={() => handleDelete(teacher)}>Delete</button></td></tr>
            ))}</tbody>
          </table>
          {filteredTeachers.length === 0 && <p className="empty-search">No matching teacher found.</p>}
        </div>
      )}
      {!message && teachers.length === 0 && (
        <section className="empty-state"><h2>No teacher records yet</h2><p>Add the first teacher to begin managing school records.</p><button type="button" onClick={onAddTeacher}>Add teacher</button></section>
      )}
    </main>
  );
}

function TeacherForm({ onBack, teacher }) {
  const isEditing = Boolean(teacher);
  const [form, setForm] = useState(() => teacher ? {
    teacherId: teacher.teacherId, name: teacher.name, subject: teacher.subject, assignedClass: teacher.assignedClass, phone: teacher.phone,
  } : { teacherId: '', name: '', subject: '', assignedClass: '', phone: '' });
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
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to add teacher.');
      setMessage(isEditing ? 'Teacher updated successfully.' : 'Teacher added successfully.');
      if (!isEditing) setForm({ teacherId: '', name: '', subject: '', assignedClass: '', phone: '' });
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
    rollNumber: student.rollNumber, dateOfBirth: student.dateOfBirth.slice(0, 10), guardianPhone: student.guardianPhone, address: student.address,
  } : {
    studentId: '', name: '', className: '', section: '', rollNumber: '', dateOfBirth: '', guardianPhone: '', address: '',
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
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Unable to add student.');
      }

      setMessage(isEditing ? 'Student updated successfully.' : 'Student added successfully.');
      if (!isEditing) {
        setForm({ studentId: '', name: '', className: '', section: '', rollNumber: '', dateOfBirth: '', guardianPhone: '', address: '' });
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
        <button type="submit" className="full-width" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : isEditing ? 'Save changes' : 'Add student'}</button>
      </form>
      {message && <p className="form-message" role="status">{message}</p>}
    </main>
  );
}

export default function App() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [admin, setAdmin] = useState(getStoredAdmin);
  const [page, setPage] = useState('dashboard');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [selectedClass, setSelectedClass] = useState(null);

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
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Unable to sign in.');
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

  if (admin) {
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
    if (page === 'attendance') {
      return <AttendancePage onBack={() => setPage('dashboard')} />;
    }
    if (page === 'results') {
      return <ResultPage onBack={() => setPage('dashboard')} />;
    }
    if (page === 'teacherAdd') {
      return <TeacherForm onBack={() => setPage('teachers')} />;
    }
    if (page === 'teacherEdit') {
      return <TeacherForm teacher={selectedTeacher} onBack={() => { setSelectedTeacher(null); setPage('teachers'); }} />;
    }
    return <Dashboard admin={admin} onLogout={handleLogout} onViewStudents={() => setPage('students')} onViewTeachers={() => setPage('teachers')} onViewClasses={() => setPage('classes')} onViewAttendance={() => setPage('attendance')} onViewResults={() => setPage('results')} onViewSettings={() => setPage('settings')} />;
  }

  return (
    <main className="login-page">
      <section className="login-intro" aria-label="School Management System introduction">
        <p className="eyebrow">School Management System</p>
        <h1>Manage school records with confidence.</h1>
        <p className="intro-copy">
          A secure workspace for administrators to organize student and teacher information.
        </p>
      </section>

      <section className="login-card" aria-labelledby="login-title">
        <div>
          <p className="card-kicker">Administrator access</p>
          <h2 id="login-title">Sign in</h2>
          <p className="card-copy">Use your administrator account to continue.</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
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
        </form>

        {message && <p className="form-message" role="status">{message}</p>}
      </section>
    </main>
  );
}
