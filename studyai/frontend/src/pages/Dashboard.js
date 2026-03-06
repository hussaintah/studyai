import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { API_URL } from '../lib/supabase';

const DAYS = ['Mo','Tu','We','Th','Fr','Sa','Su'];
const STREAK = 5; // TODO: wire to real streak from backend

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [decks, setDecks] = useState([]);

  const name = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Student';
  const firstName = name.split(' ')[0];

  const hour = new Date().getHours();
  const greetingWord = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const dateStr = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const greeting = `${greetingWord} — ${dateStr}`;

  useEffect(() => {
    if (!user) return;
    fetch(`${API_URL}/api/flashcards/decks/${user.id}`)
      .then(r => r.json())
      .then(d => setDecks(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, [user]);

  const totalCards = decks.reduce((a, d) => a + (d.flashcards?.[0]?.count || 0), 0);

  return (
    <div className="page-content">

      {/* ── HERO ── */}
      <div className="hero-panel anim d1">
        <div className="accent-bar" />
        <div>
          <div className="greeting">{greeting}</div>
          <h1 className="hero-title">
            Welcome back,<br />
            <em>{firstName}.</em>
          </h1>
          <p className="hero-sub">
            {decks.length > 0
              ? `${decks.length} deck${decks.length > 1 ? 's' : ''} active · ${totalCards} cards ready. Keep up the momentum.`
              : 'Upload your notes to get started — generate flashcards, questions, and mock exams instantly.'}
          </p>
        </div>
        <button className="btn-primary" style={{ padding: '14px 28px', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
          onClick={() => navigate('/questions')}>
          Start Practising →
        </button>
      </div>

      {/* ── STATS ── */}
      <div className="stats-row anim d2">
        <div className="stat-card sc-orange">
          <div className="stat-label">Flashcard Decks</div>
          <div className="stat-num">{decks.length}</div>
          <div className="stat-delta">{decks.length > 0 ? '↑ Active deck' : '— No decks yet'}</div>
        </div>
        <div className="stat-card sc-cyan">
          <div className="stat-label">Total Cards</div>
          <div className="stat-num">{totalCards}</div>
          <div className="stat-delta">{totalCards > 0 ? '↑ Ready for review' : '— Upload to generate'}</div>
        </div>
        <div className="stat-card sc-lime">
          <div className="stat-label">AI Questions</div>
          <div className="stat-num">∞</div>
          <div className="stat-delta">On-demand generation</div>
        </div>
        <div className="stat-card sc-violet">
          <div className="stat-label">Study Streak</div>
          <div className="stat-num" style={{ fontSize: '2rem', paddingTop: 4 }}>{STREAK}d</div>
          <div className="stat-delta">● Keep it going</div>
        </div>
      </div>

      {/* ── BOTTOM GRID ── */}
      <div className="bottom-grid anim d3">

        {/* Study Tools */}
        <div className="panel panel-orange">
          <div>
            <div className="panel-title">Study Tools</div>
            <div className="panel-meta">4 modules available</div>
          </div>
          <div className="tool-list">
            <Link to="/flashcards" className="tool-item">
              <div className="tool-icon-wrap tiw-orange">
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="var(--orange)" strokeWidth="1.6" strokeLinecap="round">
                  <rect x="3" y="5" width="14" height="10" rx="1"/><path d="M7 5V3M13 5V3"/>
                </svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="tool-name">Flashcard Manager</div>
                <div className="tool-desc">PDF → spaced-repetition flashcards</div>
              </div>
              <div className="tool-num">01</div>
            </Link>
            <Link to="/questions" className="tool-item">
              <div className="tool-icon-wrap tiw-cyan">
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="var(--cyan)" strokeWidth="1.6" strokeLinecap="round">
                  <circle cx="10" cy="10" r="7"/><path d="M10 6v5M10 14v.5"/>
                </svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="tool-name">Question Engine</div>
                <div className="tool-desc">MCQ, short answer, numerical + AI feedback</div>
              </div>
              <div className="tool-num">02</div>
            </Link>
            <Link to="/exam" className="tool-item">
              <div className="tool-icon-wrap tiw-lime">
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="var(--lime)" strokeWidth="1.6" strokeLinecap="round">
                  <rect x="3" y="3" width="14" height="14" rx="1"/><path d="M7 7h6M7 11h4"/>
                </svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="tool-name">Exam Simulator</div>
                <div className="tool-desc">Timed · Section A/B/C · 33% pass mark</div>
              </div>
              <div className="tool-num">03</div>
            </Link>
            <Link to="/tutor" className="tool-item">
              <div className="tool-icon-wrap tiw-violet">
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="var(--violet)" strokeWidth="1.6" strokeLinecap="round">
                  <circle cx="10" cy="7" r="3.5"/><path d="M3 18c0-3.5 3.1-6 7-6s7 2.5 7 6"/>
                </svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="tool-name">AI Tutor</div>
                <div className="tool-desc">Chat grounded in your uploaded notes</div>
              </div>
              <div className="tool-num">04</div>
            </Link>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="panel panel-cyan">
          <div>
            <div className="panel-title">Recent Activity</div>
            <div className="panel-meta">Last 7 days</div>
          </div>
          <div className="act-list">
            {decks.length > 0 ? (
              decks.slice(0, 3).map((deck, i) => {
                const count = deck.flashcards?.[0]?.count || 0;
                const pips = ['pip-orange', 'pip-cyan', 'pip-lime'];
                return (
                  <div className="act-item" key={deck.id}>
                    <div className={`act-pip ${pips[i % 3]}`} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="act-main">
                        Deck <strong>"{deck.name}"</strong> — {count} card{count !== 1 ? 's' : ''}
                      </div>
                      <div className="act-sub">Flashcard Manager</div>
                    </div>
                    <div className="act-time">Active</div>
                  </div>
                );
              })
            ) : (
              <div className="act-item">
                <div className="act-pip pip-orange" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="act-main">No activity yet — <strong>upload your first PDF</strong> to begin</div>
                  <div className="act-sub">Flashcard Manager</div>
                </div>
              </div>
            )}
            <div className="act-item">
              <div className="act-pip pip-lime" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="act-main">Exam Simulator <strong>ready</strong> — take a mock anytime</div>
                <div className="act-sub">Exam Simulator</div>
              </div>
              <div className="act-time">Now</div>
            </div>
          </div>

          {/* Streak bar */}
          <div className="streak-bar">
            <div className="streak-num">{STREAK}</div>
            <div>
              <div className="streak-label">Day Streak</div>
              <div className="streak-sub">Keep it going</div>
              <div className="day-dots">
                {DAYS.map((day, i) => (
                  <div key={day} className={`day-dot${i < STREAK ? ' done' : ''}`}>
                    {i < STREAK ? (
                      <svg viewBox="0 0 10 10"><polyline points="2,5 4,8 8,2"/></svg>
                    ) : day}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="right-col">
          <div>
            <div className="panel-title">Quick Actions</div>
            <div className="panel-meta">Get started</div>
          </div>

          <div className="exam-card ec-orange">
            <div className="exam-blob" style={{ top: -28, right: -28, width: 90, height: 90, background: 'radial-gradient(circle,rgba(240,90,0,0.20) 0%,transparent 70%)' }} />
            <div className="exam-subject">Flashcards · Manager</div>
            <div className="exam-name">{decks.length > 0 ? `${decks.length} active deck${decks.length > 1 ? 's' : ''}` : 'No decks yet'}</div>
            <div className="exam-footer">
              <span>{totalCards} cards</span>
              <span>{decks.length > 0 ? 'Ready' : 'Upload PDF'}</span>
            </div>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${Math.min(decks.length * 20, 100)}%`, background: 'linear-gradient(90deg,var(--orange),var(--orange-2))' }} />
            </div>
          </div>

          <div className="exam-card ec-cyan">
            <div className="exam-blob" style={{ bottom: -18, right: -18, width: 76, height: 76, background: 'radial-gradient(circle,rgba(0,194,204,0.16) 0%,transparent 70%)' }} />
            <div className="exam-subject">Exam Simulator · Live</div>
            <div className="exam-name">Full Mock Exam</div>
            <div className="exam-footer">
              <span>90 min</span>
              <span>Section A / B / C</span>
            </div>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: '100%', background: 'linear-gradient(90deg,var(--cyan),#60e0e8)' }} />
            </div>
          </div>

          <div className="suggest-card">
            <div className="suggest-label">Suggested · Now</div>
            <div className="suggest-text">
              {decks.length > 0
                ? <>Review your <strong>flashcard decks</strong> — spaced repetition works best with daily sessions.</>
                : <>Upload a <strong>PDF or paste notes</strong> to generate flashcards, questions, and exams instantly.</>}
            </div>
            <button className="btn-primary" style={{ width: '100%', justifyContent: 'center', fontSize: '0.75rem', padding: '9px' }}
              onClick={() => navigate(decks.length > 0 ? '/flashcards' : '/flashcards')}>
              {decks.length > 0 ? 'Review Now →' : 'Get Started →'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
