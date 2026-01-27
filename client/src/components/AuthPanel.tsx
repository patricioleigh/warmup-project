import { useState } from 'react';
import type { FormEvent } from 'react';

type AuthPanelProps = {
  apiBaseUrl: string;
  onAuthSuccess: (token: string) => void;
};

export function AuthPanel({ apiBaseUrl, onAuthSuccess }: AuthPanelProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    try {
      if (mode === 'register') {
        const registerRes = await fetch(`${apiBaseUrl}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });

        if (!registerRes.ok) {
          const payload = await registerRes.json().catch(() => ({}));
          throw new Error(payload?.message ?? 'Registration failed');
        }
      }

      const loginRes = await fetch(`${apiBaseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!loginRes.ok) {
        const payload = await loginRes.json().catch(() => ({}));
        throw new Error(payload?.message ?? 'Login failed');
      }

      const payload = await loginRes.json();
      if (!payload?.accessToken) {
        throw new Error('Missing access token');
      }

      onAuthSuccess(payload.accessToken);
      setPassword('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="auth-panel">
      <div className="auth-panel__tabs">
        <button
          type="button"
          className={mode === 'login' ? 'auth-tab is-active' : 'auth-tab'}
          onClick={() => setMode('login')}
        >
          Login
        </button>
        <button
          type="button"
          className={mode === 'register' ? 'auth-tab is-active' : 'auth-tab'}
          onClick={() => setMode('register')}
        >
          Register
        </button>
      </div>

      <form className="auth-panel__form" onSubmit={handleSubmit}>
        <label className="auth-field">
          <span>Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
          />
        </label>
        <label className="auth-field">
          <span>Password</span>
          <input
            type="password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Minimum 8 characters"
            minLength={8}
          />
        </label>
        <button type="submit" className="auth-submit" disabled={pending}>
          {pending ? 'Working...' : mode === 'login' ? 'Login' : 'Register & Login'}
        </button>
        {error ? <p className="auth-error">{error}</p> : null}
      </form>
    </section>
  );
}
