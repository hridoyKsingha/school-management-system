import { useEffect, useState } from 'react';

function getStoredAdmin() {
  const storedAdmin = sessionStorage.getItem('schoolAdmin');
  return storedAdmin ? JSON.parse(storedAdmin) : null;
}

function Dashboard({ admin, onLogout }) {
  const [summary, setSummary] = useState(null);
  const [message, setMessage] = useState('Loading dashboard summary...');

  useEffect(() => {
    async function loadSummary() {
      try {
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
        <button type="button" className="logout-button" onClick={onLogout}>Sign out</button>
      </header>

      <section className="dashboard-overview" aria-labelledby="overview-title">
        <p className="card-kicker">Dashboard overview</p>
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

export default function App() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [admin, setAdmin] = useState(getStoredAdmin);

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
    setMessage('');
  }

  if (admin) {
    return <Dashboard admin={admin} onLogout={handleLogout} />;
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
