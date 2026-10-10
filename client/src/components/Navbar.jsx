import React, { useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/Auth.jsx';
import { useLang } from '../context/Lang.jsx';

export const Logo = () => (
  <span className="logo"><svg viewBox="0 0 64 64" width="30" height="30" aria-hidden="true"><defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#b9f28a" /><stop offset="1" stopColor="#2a9d5c" /></linearGradient></defs><path d="M32 56C32 56 10 44 12 20C26 17 36 26 32 56Z" fill="url(#lg)" /><path d="M32 56C32 56 54 42 52 16C38 16 28 26 32 56Z" fill="#f2d98a" opacity=".95" /><path d="M32 56V24" stroke="#0e3b2e" strokeWidth="2" fill="none" /></svg><b>Digital<em>Flora</em></b></span>
);

export default function Navbar({ transparent }) {
  const { user, logout } = useAuth();
  const { t, lang, setLang } = useLang();
  const [open, setOpen] = useState(false);
  const nav = useNavigate();
  const links = [['/', 'home'], ['/garden', 'garden'], ['/plants', 'plants'], ['/advisor', 'advisor'], ['/identify', 'identify'], ['/map', 'map'], ['/quiz', 'learn']];
  return (
    <header className={`nav ${transparent ? 'nav-clear' : ''}`}>
      <Link to="/" className="nav-logo" onClick={() => setOpen(false)}><Logo /></Link>
      <button className="nav-burger" aria-label="Menu" onClick={() => setOpen((o) => !o)}><span /><span /><span /></button>
      <nav className={`nav-links ${open ? 'open' : ''}`} onClick={() => setOpen(false)}>
        {links.map(([to, k]) => <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => (isActive ? 'on' : '')}>{t(k)}</NavLink>)}
        <select className="lang" value={lang} onChange={(e) => setLang(e.target.value)} aria-label="Language">
          <option value="en">English</option><option value="hi">हिन्दी</option><option value="mr">मराठी</option>
        </select>
        {user ? (
          <span className="nav-user">
            <Link to="/dashboard" className="btn btn-sm">{user.role === 'advisor' ? '🌿 ' : ''}{user.name.split(' ')[0]}</Link>
            <button className="btn btn-sm btn-ghost" onClick={() => { logout(); nav('/'); }}>{t('logout')}</button>
          </span>
        ) : <Link to="/login" className="btn btn-sm">{t('login')}</Link>}
      </nav>
    </header>
  );
}
