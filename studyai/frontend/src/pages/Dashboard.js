import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { API_URL } from '../lib/supabase';

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [decks, setDecks] = useState([]);
  const [decksLoading, setDecksLoading] = useState(true);

  const name = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Student';
  const firstName = name.split(' ')[0];

  const hour = new Date().getHours();
  const greetingWord = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const dateStr = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;
    setDecksLoading(true);
    fetch(`${API_URL}/api/flashcards/decks/${user.id}`)
      .then(r => r.json())
      .then(d => setDecks(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setDecksLoading(false));
  }, [user, authLoading]);

  const totalCards = decks.reduce((a, d) => a + (d.flashcards?.[0]?.count || 0), 0);

  return (
    <div className="page-content">

      {/* HERO */}
      <div className="hero-panel anim d1">
        <div className="accent-bar" />
        <div>
          <div className="greeting">{greetingWord} — {dateStr}</div>
          <h1 className="hero-title">
            Welcome back,<br /><em>{firstName}.</em>
          </h1>
          <p className="hero-sub">
            {decks.length > 0
              ? `${decks.length} active deck${decks.length > 1 ? 's' : ''} · ${totalCards} cards ready. Keep up the momentum.`
              : 'Upload your notes to get started — generate flashcards, questions, and mock exams instantly.'}
          </p>
        </div>
        <button className="btn-primary" style={{ padding: '14px 28px', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
          onClick={() => navigate('/questions')}>
          Start Practising →
        </button>
      </div>

      {/* STATS */}
      <div className="stats-row anim d2">
        <div className="stat-card sc-orange">
          <div className="stat-label">Flashcard Decks</div>
          <div className="stat-num">{decksLoading ? '—' : decks.length}</div>
          <div className="stat-delta">{decksLoading ? '...' : decks.length > 0 ? '↑ Active' : '— None yet'}</div>
        </div>
        <div className="stat-card sc-cyan">
          <div className="stat-label">Total Cards</div>
          <div className="stat-num">{decksLoading ? '—' : totalCards}</div>
          <div className="stat-delta">{decksLoading ? '...' : totalCards > 0 ? '↑ Ready for review' : '— Upload to generate'}</div>
        </div>
        <div className="stat-card sc-lime">
          <div className="stat-label">AI Questions</div>
          <div className="stat-num">∞</div>
          <div className="stat-delta">On-demand generation</div>
        </div>
        <div className="stat-card sc-violet">
          <div className="stat-label">Exam Simulator</div>
          <div className="stat-num" style={{ fontSize: '1.6rem', paddingTop: 6 }}>Live</div>
          <div className="stat-delta">Section A / B / C</div>
        </div>
      </div>

      {/* BOTTOM GRID */}
      <div className="bottom-grid anim d3">

        {/* Study Tools */}
        <div className="panel panel-orange">
          <div>
            <div className="panel-title">Study Tools</div>
            <div className="panel-meta">4 modules available</div>
          </div>
          <div className="tool-list">
            {[
              { to: '/flashcards', label: 'Flashcard Manager', desc: 'PDF → spaced-repetition flashcards', cls: 'tiw-orange', color: 'var(--orange)', num: '01',
                icon: <svg viewBox="0 0 20 20" fill="none" stroke="var(--orange)" strokeWidth="1.6" strokeLinecap="round"><rect x="3" y="5" width="14" height="10" rx="1"/><path d="M7 5V3M13 5V3"/></svg> },
              { to: '/questions', label: 'Question Engine', desc: 'MCQ, short answer, numerical + AI feedback', cls: 'tiw-cyan', color: 'var(--cyan)', num: '02',
                icon: <svg viewBox="0 0 20 20" fill="none" stroke="var(--cyan)" strokeWidth="1.6" strokeLinecap="round"><circle cx="10" cy="10" r="7"/><path d="M10 6v5M10 14v.5"/></svg> },
              { to: '/exam', label: 'Exam Simulator', desc: 'Timed · Section A/B/C · 33% pass mark', cls: 'tiw-lime', color: 'var(--lime)', num: '03',
                icon: <svg viewBox="0 0 20 20" fill="none" stroke="var(--lime)" strokeWidth="1.6" strokeLinecap="round"><rect x="3" y="3" width="14" height="14" rx="1"/><path d="M7 7h6M7 11h4"/></svg> },
              { to: '/tutor', label: 'AI Tutor', desc: 'Chat grounded in your uploaded notes', cls: 'tiw-violet', color: 'var(--violet)', num: '04',
                icon: <svg viewBox="0 0 20 20" fill="none" stroke="var(--violet)" strokeWidth="1.6" strokeLinecap="round"><circle cx="10" cy="7" r="3.5"/><path d="M3 18c0-3.5 3.1-6 7-6s7 2.5 7 6"/></svg> },
            ].map(({ to, label, desc, cls, num, icon }) => (
              <Link to={to} key={to} className="tool-item" style={{ textDecoration: 'none' }}>
                <div className={`tool-icon-wrap ${cls}`}>{icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="tool-name">{label}</div>
                  <div className="tool-desc">{desc}</div>
                </div>
                <div className="tool-num">{num}</div>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="panel panel-cyan">
          <div>
            <div className="panel-title">Recent Activity</div>
            <div className="panel-meta">{decks.length > 0 ? `${decks.length} deck${decks.length > 1 ? 's' : ''} active` : 'Nothing yet'}</div>
          </div>
          <div className="act-list">
            {decks.length > 0 ? decks.slice(0, 4).map((deck, i) => {
              const count = deck.flashcards?.[0]?.count || 0;
              const pips = ['pip-orange', 'pip-cyan', 'pip-lime', 'pip-orange'];
              return (
                <div className="act-item" key={deck.id}>
                  <div className={`act-pip ${pips[i]}`} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="act-main">Deck <strong>"{deck.name}"</strong> — {count} card{count !== 1 ? 's' : ''}</div>
                    <div className="act-sub">Flashcard Manager</div>
                  </div>
                  <div className="act-time">Active</div>
                </div>
              );
            }) : (
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
                <div className="act-main">Exam Simulator <strong>ready</strong></div>
                <div className="act-sub">Section A / B / C · 90 min default</div>
              </div>
              <div className="act-time">Now</div>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="right-col">
          <div>
            <div className="panel-title">Quick Actions</div>
            <div className="panel-meta">Jump right in</div>
          </div>

          <Link to="/flashcards" style={{ textDecoration: 'none' }}>
            <div className="exam-card ec-orange" style={{ cursor: 'pointer' }}>
              <div className="exam-blob" style={{ top: -28, right: -28, width: 90, height: 90, background: 'radial-gradient(circle,rgba(240,90,0,0.20) 0%,transparent 70%)' }} />
              <div className="exam-subject">Flashcards · Manager</div>
              <div className="exam-name">{decks.length > 0 ? `${decks.length} active deck${decks.length > 1 ? 's' : ''}` : 'Create a deck'}</div>
              <div className="exam-footer">
                <span>{totalCards} cards</span>
                <span>{decks.length > 0 ? 'Open →' : 'Get started →'}</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${Math.min(decks.length * 20, 100)}%`, background: 'linear-gradient(90deg,var(--orange),var(--orange-2))' }} />
              </div>
            </div>
          </Link>

          <Link to="/exam" style={{ textDecoration: 'none' }}>
            <div className="exam-card ec-cyan" style={{ cursor: 'pointer' }}>
              <div className="exam-blob" style={{ bottom: -18, right: -18, width: 76, height: 76, background: 'radial-gradient(circle,rgba(0,194,204,0.16) 0%,transparent 70%)' }} />
              <div className="exam-subject">Exam Simulator · Live</div>
              <div className="exam-name">Take a Full Mock Exam</div>
              <div className="exam-footer">
                <span>90 min default</span>
                <span>Go →</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: '100%', background: 'linear-gradient(90deg,var(--cyan),#60e0e8)' }} />
              </div>
            </div>
          </Link>

          <div className="suggest-card">
            <div className="suggest-label">Suggested · Now</div>
            <div className="suggest-text">
              {decks.length > 0
                ? <>Your <strong>flashcard decks</strong> are active — spaced repetition works best with daily sessions.</>
                : <>Upload a <strong>PDF or paste notes</strong> to generate flashcards, questions, and exams instantly.</>}
            </div>
            <Link to={decks.length > 0 ? '/flashcards' : '/flashcards'} className="btn-primary" style={{ width: '100%', justifyContent: 'center', fontSize: '0.75rem', padding: '9px', display: 'flex' }}>
              {decks.length > 0 ? 'Review Flashcards →' : 'Get Started →'}
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
