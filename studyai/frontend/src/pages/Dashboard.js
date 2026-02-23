import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { API_URL } from '../lib/supabase';

export default function Dashboard() {
  const { user } = useAuth();
  const [decks, setDecks] = useState([]);
  const name = user?.user_metadata?.full_name?.split(' ')[0] || 'Student';

  useEffect(() => {
    if (!user) return;
    fetch(`${API_URL}/api/flashcards/decks/${user.id}`).then(r => r.json()).then(d => setDecks(Array.isArray(d) ? d : []));
  }, [user]);

  const totalCards = decks.reduce((a, d) => a + (d.flashcards?.[0]?.count || 0), 0);

  return (
    <div>
      <div className="page-header">
        <h1>Welcome, {name} ⚡</h1>
        <p>Your AI-powered study assistant</p>
      </div>

      <div className="grid-4 mb-24">
        {[
          { v: decks.length, l: 'Flashcard Decks', i: '📦' },
          { v: totalCards, l: 'Total Cards', i: '🃏' },
          { v: '∞', l: 'Questions Available', i: '🧠' },
          { v: 'Ready', l: 'Exam Simulator', i: '📝' },
        ].map(({ v, l, i }) => (
          <div className="card" key={l} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 26, marginBottom: 6 }}>{i}</div>
            <div style={{ fontFamily: 'Syne', fontSize: 26, fontWeight: 700, color: 'var(--indigo-light)' }}>{v}</div>
            <div className="text-muted mt-8">{l}</div>
          </div>
        ))}
      </div>

      <div className="grid-2 mb-24">
        {[
          { icon: '🃏', title: 'Flashcard Manager', desc: 'Upload a PDF or paste notes → AI creates flashcards instantly. Study with spaced repetition that schedules reviews at the optimal time.', to: '/flashcards', color: 'var(--indigo)' },
          { icon: '🧠', title: 'AI Question Engine', desc: 'Generate MCQ, short answer, and true/false questions from your material. Get instant AI evaluation with specific feedback on each answer.', to: '/questions', color: 'var(--cyan)' },
          { icon: '📝', title: 'Exam Simulator', desc: 'Take a full timed mock exam. No feedback until the end — just like a real test. Get a detailed topic-by-topic breakdown when done.', to: '/exam', color: 'var(--emerald)' },
          { icon: '🤖', title: 'AI Tutor', desc: 'Got a concept you don\'t understand? Paste your notes and chat with an AI that knows your material and explains things clearly.', to: '/tutor', color: 'var(--amber)' },
        ].map(({ icon, title, desc, to, color }) => (
          <Link to={to} key={title} className="card card-hover" style={{ textDecoration: 'none' }}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <div style={{ width: 42, height: 42, borderRadius: 10, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0, border: `1px solid ${color}30` }}>{icon}</div>
              <div>
                <p style={{ fontFamily: 'Syne', fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{title}</p>
                <p className="text-muted" style={{ lineHeight: 1.55 }}>{desc}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="card" style={{ background: 'var(--indigo-pale)', border: '1px solid rgba(99,102,241,0.3)' }}>
        <p style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 15, marginBottom: 6 }}>💡 How to get started</p>
        <p style={{ color: 'var(--text2)', fontSize: 14, lineHeight: 1.65 }}>
          Upload a PDF or paste your lecture notes into the <strong style={{ color: 'var(--text)' }}>Question Engine</strong>. 
          The AI will generate practice questions tailored to your content. Answer them, and get specific feedback on what you understand and what you need to review more. 
          Your weak topics are automatically identified so you can focus your study time where it matters.
        </p>
        <div className="flex gap-8 mt-16">
          <Link to="/questions" className="btn btn-primary btn-sm">Start Practicing →</Link>
          <Link to="/exam" className="btn btn-secondary btn-sm">Take a Mock Exam →</Link>
        </div>
      </div>
    </div>
  );
}
