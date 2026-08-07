import { useState } from 'react';

export default function App() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      setMessage(`Welcome, ${data.admin.name}. Login successful.`);
      setPassword('');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsSubmitting(false);
    }
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
