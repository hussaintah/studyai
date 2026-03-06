import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';

const NAV_WORKSPACE = [
  {
    to: '/',
    label: 'Dashboard',
    icon: (
      <svg className="nav-icon" viewBox="0 0 20 20">
        <rect x="2" y="2" width="7" height="7" rx="1"/>
        <rect x="11" y="2" width="7" height="7" rx="1"/>
        <rect x="2" y="11" width="7" height="7" rx="1"/>
        <rect x="11" y="11" width="7" height="7" rx="1"/>
      </svg>
    ),
  },
  {
    to: '/questions',
    label: 'Question Engine',
    icon: (
      <svg className="nav-icon" viewBox="0 0 20 20">
        <circle cx="10" cy="10" r="7"/>
        <path d="M10 6.5v4M10 13.5v.5"/>
      </svg>
    ),
  },
  {
    to: '/exam',
    label: 'Exam Simulator',
    icon: (
      <svg className="nav-icon" viewBox="0 0 20 20">
        <rect x="3" y="2" width="14" height="16" rx="1"/>
        <path d="M6 6h8M6 10h8M6 14h4"/>
      </svg>
    ),
  },
  {
    to: '/flashcards',
    label: 'Flashcards',
    icon: (
      <svg className="nav-icon" viewBox="0 0 20 20">
        <rect x="2" y="4" width="16" height="12" rx="1"/>
        <path d="M6 4V2M14 4V2"/>
      </svg>
    ),
  },
];

const NAV_TOOLS = [
  {
    to: '/tutor',
    label: 'AI Tutor',
    icon: (
      <svg className="nav-icon" viewBox="0 0 20 20">
        <circle cx="10" cy="8" r="4"/>
        <path d="M3 18c0-3.5 3.1-6 7-6s7 2.5 7 6"/>
      </svg>
    ),
  },
];

// Page name map for breadcrumb
const PAGE_NAMES = {
  '/': 'Dashboard',
  '/flashcards': 'Flashcards',
  '/questions': 'Question Engine',
  '/exam': 'Exam Simulator',
  '/tutor': 'AI Tutor',
};

export default function Layout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [theme, setTheme] = useState(() => localStorage.getItem('studyai_theme') || 'dark');

  const name = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Student';
  const firstName = name.split(' ')[0];
  const initial = firstName[0]?.toUpperCase();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('studyai_theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  // Get current page label for breadcrumb
  const pageName = PAGE_NAMES[location.pathname] ||
    (location.pathname.startsWith('/flashcards/') ? 'Flashcards' : 'Page');

  return (
    <div className="app-layout">
      {/* ── SIDEBAR ── */}
      <aside className="sidebar">
        <div className="logo-zone">
          <div className="sidebar-logo">
            <div className="logo-pip" />
            Study<em style={{ fontStyle: 'italic', fontWeight: 300 }}>AI</em>
            <span className="logo-beta">beta</span>
          </div>
          <button className="theme-toggle" onClick={toggleTheme} title="Toggle theme">
            {/* Moon — shown in dark mode */}
            <svg className="icon-moon" viewBox="0 0 24 24">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
            {/* Sun — shown in light mode */}
            <svg className="icon-sun" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="5"/>
              <line x1="12" y1="1" x2="12" y2="3"/>
              <line x1="12" y1="21" x2="12" y2="23"/>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
              <line x1="1" y1="12" x2="3" y2="12"/>
              <line x1="21" y1="12" x2="23" y2="12"/>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </svg>
          </button>
        </div>

        <nav className="sidebar-nav">
          <span className="nav-label">Workspace</span>
          {NAV_WORKSPACE.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            >
              {icon}
              {label}
            </NavLink>
          ))}

          <span className="nav-label" style={{ marginTop: 10 }}>Tools</span>
          {NAV_TOOLS.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            >
              {icon}
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-chip">
            <div className="user-avatar">{initial}</div>
            <div>
              <div className="user-name">{firstName}</div>
              <div className="user-plan">Free plan</div>
            </div>
          </div>
          <button className="sign-out-btn" onClick={async () => { await signOut(); navigate('/auth'); }}>
            Sign out
          </button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <main className="main-content">
        <div className="topbar">
          <div className="breadcrumb">
            StudyAI <span style={{ opacity: 0.3, margin: '0 4px' }}>›</span>
            <strong>{pageName}</strong>
          </div>
          <div className="topbar-actions">
            <NavLink to="/exam" className="btn-ghost">Take Mock Exam</NavLink>
            <NavLink to="/flashcards" className="btn-primary">
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <path d="M5.5 1v9M1 5.5h9"/>
              </svg>
              Upload Notes
            </NavLink>
          </div>
        </div>

        <Outlet />
      </main>
    </div>
  );
}
