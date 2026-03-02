import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';

const NAV = [
  { to: '/', icon: '⚡', label: 'Dashboard' },
  { to: '/flashcards', icon: '🃏', label: 'Flashcards' },
  { to: '/questions', icon: '🧠', label: 'Question Engine' },
  { to: '/exam', icon: '📝', label: 'Exam Simulator' },
  { to: '/tutor', icon: '🤖', label: 'AI Tutor' },
];

export default function Layout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [theme, setTheme] = useState(() => localStorage.getItem('studyai_theme') || 'dark');
  const name = user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Student';

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('studyai_theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  return (
    <div className="app-layout">
      <nav className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-icon">📚</div>
          <span>StudyAI</span>
        </div>
        {NAV.map(({ to, icon, label }) => (
          <NavLink key={to} to={to} end={to === '/'}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <span className="icon">{icon}</span>
            <span>{label}</span>
          </NavLink>
        ))}
        <div className="sidebar-bottom">
          <div className="user-info">
            <div className="user-avatar">{name[0]?.toUpperCase()}</div>
            <span className="user-name">{name}</span>
          </div>
          <button className="theme-toggle" onClick={toggleTheme}>
            <span>{theme === 'dark' ? '☀️' : '🌙'}</span>
            <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
          <button className="sign-out-btn" onClick={async () => { await signOut(); navigate('/auth'); }}>Sign out</button>
        </div>
      </nav>
      <main className="main-content"><Outlet /></main>
    </div>
  );
}
