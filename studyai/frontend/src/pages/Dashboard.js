import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { API_URL } from '../lib/supabase';

const FEATURES = [
  { icon: '🃏', title: 'Flashcard Manager', desc: 'Upload a PDF → AI generates flashcards. Study with spaced repetition that schedules reviews at the optimal time.', to: '/flashcards', color: '#6366f1' },
  { icon: '🧠', title: 'Question Engine', desc: 'Generate MCQ, short answer, true/false from your notes. Get AI feedback on each answer with weak topic detection.', to: '/questions', color: '#22d3ee' },
  { icon: '📝', title: 'Exam Simulator', desc: 'Full timed university-style exam with numerical questions, syllabus weighting, and topic-by-topic results.', to: '/exam', color: '#10b981' },
  { icon: '🤖', title: 'AI Tutor', desc: 'Chat with an AI that knows your study material. Ask anything, get step-by-step explanations.', to: '/tutor', color: '#f59e0b' },
];

export default function Dashboard() {
  const { user } = useAuth();
  const [decks, setDecks] = useState([]);
  const name = user?.user_metadata?.full_name?.split(' ')[0] || 'Student';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  useEffect(() => {
    if (!user) return;
    fetch(`${API_URL}/api/flashcards/decks/${user.id}`).then(r => r.json()).then(d => setDecks(Array.isArray(d) ? d : []));
  }, [user]);

  const totalCards = decks.reduce((a, d) => a + (d.flashcards?.[0]?.count || 0), 0);

  return (
    <div>
      {/* Hero */}
      <div style={{ marginBottom: 32, padding: '28px 32px', borderRadius: 'var(--radius-lg)', background: 'linear-gradient(135deg, var(--indigo-pale), var(--surface2))', border: '1px solid var(--border2)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: 24, top: 16, fontSize: 64, opacity: 0.12 }}>📚</div>
        <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 4 }}>{greeting} 👋</p>
        <h1 style={{ fontFamily: 'Syne', fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Welcome back, {name}</h1>
        <p style={{ color: 'var(--text2)', fontSize: 14, maxWidth: 480 }}>Your AI-powered study toolkit. Upload your notes, generate questions, and study smarter.</p>
        <div className="flex gap-8 mt-16">
          <Link to="/questions" className="btn btn-primary btn-sm">Start Practicing →</Link>
          <Link to="/exam" className="btn btn-secondary btn-sm">Take a Mock Exam</Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid-4 mb-28">
        {[
          { value: decks.length, label: 'Flashcard Decks', icon: '📦', color: 'var(--indigo-light)' },
          { value: totalCards, label: 'Total Cards', icon: '🃏', color: 'var(--cyan)' },
          { value: '∞', label: 'AI Questions', icon: '🧠', color: 'var(--emerald)' },
          { value: 'Live', label: 'Exam Simulator', icon: '📝', color: 'var(--amber)' },
        ].map(({ value, label, icon, color }) => (
          <div className="card" key={label} style={{ textAlign: 'center', padding: '22px 16px' }}>
            <div style={{ fontSize: 26, marginBottom: 8 }}>{icon}</div>
            <div style={{ fontFamily: 'Syne', fontSize: 28, fontWeight: 800, color, marginBottom: 4 }}>{value}</div>
            <div style={{ fontSize: 12, color: 'var(--text2)' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Feature cards */}
      <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>Study Tools</p>
      <div className="grid-2">
        {FEATURES.map(({ icon, title, desc, to, color }) => (
          <Link to={to} key={title} className="card card-hover" style={{ textDecoration: 'none' }}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0, border: `1px solid ${color}25` }}>{icon}</div>
              <div>
                <p style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 15, marginBottom: 5 }}>{title}</p>
                <p style={{ color: 'var(--text2)', fontSize: 13, lineHeight: 1.6 }}>{desc}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
