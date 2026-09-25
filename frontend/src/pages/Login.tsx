import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { useNotice } from '../hooks';
import type { AuthResponse } from '../types';
import { Notice, Trip } from '../ui';

const empty = { email: '', password: '', fullName: '', enrollmentNo: '', phone: '' };

export default function Login() {
  const { user, signIn } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);
  const { notice, err, clear } = useNotice();

  if (user) return <Navigate to="/find" replace />;

  const set = (key: keyof typeof empty) => (e: ChangeEvent<HTMLInputElement>) => setForm({ ...form, [key]: e.target.value });

  async function submit(e: FormEvent) {
    e.preventDefault();
    clear();
    setBusy(true);
    try {
      const res = mode === 'login'
        ? await api.post<AuthResponse>('/auth/login', { email: form.email, password: form.password })
        : await api.post<AuthResponse>('/auth/register', form);
      signIn(res);
    } catch (ex) {
      err(ex);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login">
      <section className="login-hero">
        <h1>Share the ride to campus.</h1>
        <p>Post your route or say where you need to go. We match you by stops and pickup time, and hold the seat until the driver confirms.</p>
        <Trip stops={[
          { name: 'Gulshan-e-Iqbal', note: '7:30' },
          { name: 'Johar Chowrangi', note: '7:40' },
          { name: 'Safoora Chowrangi', note: '7:45' },
          { name: 'UBIT Campus', note: '7:55' },
        ]} />
      </section>

      <form className="login-form" onSubmit={submit}>
        <h2>{mode === 'login' ? 'Sign in' : 'Create your account'}</h2>
        <Notice notice={notice} />
        {mode === 'register' && (
          <>
            <label>Full name<input required maxLength={100} value={form.fullName} onChange={set('fullName')} /></label>
            <label>Enrollment number<input required maxLength={20} value={form.enrollmentNo} onChange={set('enrollmentNo')} /></label>
            <label>Phone (optional)<input type="tel" maxLength={20} value={form.phone} onChange={set('phone')} /></label>
          </>
        )}
        <label>University email<input type="email" required autoComplete="email" value={form.email} onChange={set('email')} /></label>
        <label>Password<input type="password" required minLength={mode === 'register' ? 8 : 1} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={form.password} onChange={set('password')} /></label>
        {mode === 'register' && <p className="hint">At least 8 characters.</p>}
        <button className="btn btn-primary" disabled={busy}>{mode === 'login' ? 'Sign in' : 'Create account'}</button>
        <button type="button" className="btn btn-ghost" onClick={() => { clear(); setMode(mode === 'login' ? 'register' : 'login'); }}>
          {mode === 'login' ? 'New here? Create an account' : 'Already registered? Sign in'}
        </button>
      </form>
    </div>
  );
}
