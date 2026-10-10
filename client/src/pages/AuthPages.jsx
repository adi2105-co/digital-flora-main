import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/Auth.jsx';
import { useLang } from '../context/Lang.jsx';
import { Logo } from '../components/Navbar.jsx';

function Shell({ title, sub, children }) {
  return (
    <div className="auth-wrap">
      <div className="auth-art"><div className="orb o1" /><div className="orb o2" /><div className="orb o3" /><div className="auth-art-in"><Logo /><h2>Welcome to the living garden</h2><p>Save plants, keep study notes, ask advisors - or grow the garden by adding new plants.</p></div></div>
      <div className="auth-card glass-lite"><h1>{title}</h1><p className="muted">{sub}</p>{children}</div>
    </div>
  );
}

export function Login() {
  const { login } = useAuth(); const { t } = useLang(); const nav = useNavigate();
  const [role, setRole] = useState('user'); const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const submit = async (e) => { e.preventDefault(); setBusy(true); setErr(''); try { await login({ email, password, role }); nav('/dashboard'); } catch (x) { setErr(x.message); } finally { setBusy(false); } };
  return (
    <Shell title="Welcome back" sub="Log in to continue">
      <div className="seg"><button type="button" className={role === 'user' ? 'on' : ''} onClick={() => setRole('user')}>🙂 {t('asUser')}</button><button type="button" className={role === 'advisor' ? 'on' : ''} onClick={() => setRole('advisor')}>🧑‍⚕️ {t('asAdvisor')}</button></div>
      <form onSubmit={submit}>
        <label>{t('email')}<input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></label>
        <label>{t('password')}<input className="input" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" /></label>
        {err && <p className="error">{err}</p>}
        <button className="btn btn-block" disabled={busy}>{busy ? '…' : t('login')}</button>
      </form>
      <p className="muted small demo">Demo: <button type="button" className="link" onClick={() => { setRole('user'); setEmail('user@flora.com'); setPassword('user123'); }}>user@flora.com / user123</button> · <button type="button" className="link" onClick={() => { setRole('advisor'); setEmail('advisor@flora.com'); setPassword('advisor123'); }}>advisor@flora.com / advisor123</button></p>
      <p className="muted">{t('noAccount')} <Link to="/register">{t('register')}</Link></p>
    </Shell>
  );
}

export function Register() {
  const { register } = useAuth(); const { t } = useLang(); const nav = useNavigate();
  const [f, setF] = useState({ name: '', email: '', password: '', role: 'user', advisorCode: '', specialty: '' }); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => { e.preventDefault(); setBusy(true); setErr(''); try { await register(f); nav('/dashboard'); } catch (x) { setErr(x.message); } finally { setBusy(false); } };
  return (
    <Shell title="Create your account" sub="Free, takes ten seconds">
      <div className="seg"><button type="button" className={f.role === 'user' ? 'on' : ''} onClick={() => setF({ ...f, role: 'user' })}>🙂 {t('asUser')}</button><button type="button" className={f.role === 'advisor' ? 'on' : ''} onClick={() => setF({ ...f, role: 'advisor' })}>🧑‍⚕️ {t('asAdvisor')}</button></div>
      <form onSubmit={submit}>
        <label>{t('name')}<input className="input" required value={f.name} onChange={set('name')} autoComplete="name" /></label>
        <label>{t('email')}<input className="input" type="email" required value={f.email} onChange={set('email')} autoComplete="email" /></label>
        <label>{t('password')} <small>(6+ characters)</small><input className="input" type="password" required minLength={6} value={f.password} onChange={set('password')} autoComplete="new-password" /></label>
        {f.role === 'advisor' && <><label>{t('advisorCode')}<input className="input" required value={f.advisorCode} onChange={set('advisorCode')} placeholder="Given by the administrator" /></label><label>Specialty<input className="input" value={f.specialty} onChange={set('specialty')} placeholder="e.g. Ayurvedic physician" /></label></>}
        {err && <p className="error">{err}</p>}
        <button className="btn btn-block" disabled={busy}>{busy ? '…' : t('register')}</button>
      </form>
      <p className="muted">{t('haveAccount')} <Link to="/login">{t('login')}</Link></p>
    </Shell>
  );
}
