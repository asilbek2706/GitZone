import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import type { ApiResponse, User } from '../../types';

export function AuthPage({ mode, onAuth }: { mode: 'login' | 'register'; onAuth: (user: User) => void }) {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const result = await api<ApiResponse<{ user: User; accessToken: string }>>(
        mode === 'login' ? '/auth/login' : '/auth/register',
        { method: 'POST', body: JSON.stringify(data) },
      );
      localStorage.setItem('gitzone_access_token', result.data.accessToken);
      onAuth(result.data.user);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Xatolik yuz berdi');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="auth-page">
      <div className="auth-decoration">
        <Link className="brand light" to="/">
          <span className="logo-mark">G</span>
          <span>GitZone</span>
        </Link>
        <div className="auth-quote">
          <span>“</span>
          <h2>
            Build something
            <br />
            <strong>remarkable.</strong>
          </h2>
          <p>Collaborate, ship, and grow with your team — all in one place.</p>
          <div className="auth-circles">
            <i />
            <i />
            <i />
            <i />
          </div>
        </div>
        <small>© 2026 GitZone · Built for developers</small>
      </div>
      <div className="auth-card-wrap">
        <form className="auth-card" onSubmit={submit}>
          <div className="auth-mobile-logo">
            <span className="logo-mark">G</span> GitZone
          </div>
          <div className="eyebrow">{mode === 'login' ? 'WELCOME BACK' : 'GET STARTED'}</div>
          <h1>{mode === 'login' ? 'Sign in to GitZone' : 'Create your account'}</h1>
          <p className="muted">
            {mode === 'login'
              ? 'Your code. Your team. Your momentum.'
              : 'Join thousands of developers building the future.'}
          </p>
          {error && <div className="error-box">{error}</div>}
          {mode === 'register' && (
            <label>
              Full name
              <input name="name" placeholder="Alex Morgan" />
            </label>
          )}
          {mode === 'login' ? (
            <label>
              Email address
              <input required type="email" name="email" placeholder="you@example.com" />
            </label>
          ) : (
            <label>
              Username
              <input required name="username" placeholder="alexmorgan" />
            </label>
          )}
          {mode === 'register' && (
            <label>
              Email address
              <input required type="email" name="email" placeholder="you@example.com" />
            </label>
          )}
          <label>
            Password{mode === 'login' && <a href="/">Forgot password?</a>}
            <input required type="password" name="password" placeholder="••••••••" />
          </label>
          {mode === 'register' && (
            <label className="check">
              <input type="checkbox" required />{' '}
              <span>
                I agree to the <a href="/">Terms of Service</a> and <a href="/">Privacy Policy</a>
              </span>
            </label>
          )}
          <button className="button primary full" disabled={busy}>
            {busy ? 'Please wait...' : mode === 'login' ? 'Sign in  →' : 'Create account  →'}
          </button>
          <div className="auth-divider">
            <span>or continue with</span>
          </div>
          <button type="button" className="button github">
            ◉ &nbsp; Continue with GitHub
          </button>
          <p className="auth-switch">
            {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
            <Link to={mode === 'login' ? '/register' : '/login'}>
              {mode === 'login' ? 'Create one' : 'Sign in'}
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
