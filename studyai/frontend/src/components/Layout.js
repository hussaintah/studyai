import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

const NAV = [
  {
    to: '/',
    label: 'Dashboard',
    icon: (
      <svg viewBox="0 0 18 18" fill="currentColor" width="16" height="16">
        <rect x="1" y="1" width="7" height="7" rx="1.5"/>
        <rect x="10" y="1" width="7" height="7" rx="1.5"/>
        <rect x="1" y="10" width="7" height="7" rx="1.5"/>
        <rect x="10" y="10" width="7" height="7" rx="1.5"/>
      </svg>
    ),
  },
  {
    to: '/flashcards',
    label: 'Flashcards',
    icon: (
      <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" width="16" height="16">
        <rect x="1" y="4" width="16" height="11" rx="2"/>
        <path d="M5 4V3M13 4V3"/>
      </svg>
    ),
  },
  {
    to: '/questions',
    label: 'Question Engine',
    icon: (
      <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" width="16" height="16">
        <circle cx="9" cy="9" r="7"/>
        <path d="M9 5.5c0 0 1.5.5 1.5 2S9 9 9 10M9 12.5v.5"/>
      </svg>
    ),
  },
  {
    to: '/exam',
    label: 'Exam Simulator',
    icon: (
      <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" width="16" height="16">
        <rect x="3" y="1" width="12" height="16" rx="1.5"/>
        <path d="M6 6h6M6 9h6M6 12h3"/>
      </svg>
    ),
  },
  {
    to: '/tutor',
    label: 'AI Tutor',
    icon: (
      <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" width="16" height="16">
        <circle cx="9" cy="6.5" r="3.5"/>
        <path d="M2 17c0-3.5 3.1-6 7-6s7 2.5 7 6"/>
      </svg>
    ),
  },
];

export default function Layout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  // KEY FIX: was 'studyai_theme' (underscore) — must match 'studyai-theme' (hyphen) used in index.js
  const [theme, setTheme] = useState(
    () => localStorage.getItem('studyai-theme') || 'dark'
  );

  const name =
    user?.user_metadata?.full_name?.split(' ')[0] ||
    user?.email?.split('@')[0] ||
    'Student';

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('studyai-theme', next);
    setTheme(next);
  };

  return (
    <div className="app-layout">
      <nav className="sidebar">

        {/* Logo */}
        <div className="sidebar-logo">
          <div className="logo-icon">
            <svg viewBox="0 0 20 20" fill="white" width="17" height="17">
              <rect x="2" y="2" width="7" height="7" rx="1.5"/>
              <rect x="11" y="2" width="7" height="7" rx="1.5"/>
              <rect x="2" y="11" width="7" height="7" rx="1.5"/>
              <rect x="11" y="11" width="7" height="7" rx="1.5"/>
            </svg>
          </div>
          <span>StudyAI</span>
        </div>

        {/* Nav items */}
        <div className="nav-section">
          {NAV.map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            >
              <span className="nav-icon">{icon}</span>
              <span>{label}</span>
            </NavLink>
          ))}
        </div>

        {/* Bottom controls */}
        <div className="sidebar-bottom">
          <div className="user-info">
            <div className="user-avatar">{name[0]?.toUpperCase()}</div>
            <span className="user-name">{name}</span>
          </div>

          <button className="theme-toggle" onClick={toggleTheme}>
            {theme === 'dark' ? (
              /* Sun — shown in dark mode, click to go light */
              <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" width="14" height="14">
                <circle cx="9" cy="9" r="3.5"/>
                <line x1="9" y1="1" x2="9" y2="3"/>
                <line x1="9" y1="15" x2="9" y2="17"/>
                <line x1="3.1" y1="3.1" x2="4.5" y2="4.5"/>
                <line x1="13.5" y1="13.5" x2="14.9" y2="14.9"/>
                <line x1="1" y1="9" x2="3" y2="9"/>
                <line x1="15" y1="9" x2="17" y2="9"/>
                <line x1="3.1" y1="14.9" x2="4.5" y2="13.5"/>
                <line x1="13.5" y1="4.5" x2="14.9" y2="3.1"/>
              </svg>
            ) : (
              /* Moon — shown in light mode, click to go dark */
              <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" width="14" height="14">
                <path d="M15 10.5A7 7 0 1 1 7.5 3a5 5 0 0 0 7.5 7.5z"/>
              </svg>
            )}
            <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </button>

          <button
            className="sign-out-btn"
            onClick={async () => { await signOut(); navigate('/auth'); }}
          >
            <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" width="13" height="13">
              <path d="M7 3H3a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h4"/>
              <path d="M12 13l4-4-4-4M16 9H7"/>
            </svg>
            Sign out
          </button>
        </div>

      </nav>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
