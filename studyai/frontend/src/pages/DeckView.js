import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { API_URL } from '../lib/supabase';
import ContentInput from '../components/ContentInput';

const RATINGS = [
  { label: 'Again', value: 0, color: 'var(--rose)' },
  { label: 'Hard', value: 2, color: 'var(--amber)' },
  { label: 'Good', value: 4, color: 'var(--emerald)' },
  { label: 'Easy', value: 5, color: 'var(--cyan)' },
];

export default function DeckView() {
  const { deckId } = useParams();
  const { user } = useAuth();
  const [cards, setCards] = useState([]);
  const [mode, setMode] = useState('list');
  const [flipped, setFlipped] = useState(false);
  const [studyIdx, setStudyIdx] = useState(0);
  const [results, setResults] = useState([]);
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [aiContent, setAiContent] = useState('');
  const [aiCount, setAiCount] = useState(10);
  const [aiLoading, setAiLoading] = useState(false);

  const fetchCards = async () => {
    const res = await fetch(`${API_URL}/api/flashcards/${deckId}`);
    setCards(await res.json());
  };

  useEffect(() => { fetchCards(); }, [deckId]);

  const dueCards = cards.filter(c => new Date(c.next_review) <= new Date());

  const addCard = async () => {
    if (!front.trim() || !back.trim()) return;
    await fetch(`${API_URL}/api/flashcards`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ deckId, userId: user.id, front, back }) });
    setFront(''); setBack(''); fetchCards();
  };

  const generateAI = async () => {
    if (!aiContent.trim()) return;
    setAiLoading(true);
    const res = await fetch(`${API_URL}/api/ai/generate-flashcards`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: aiContent, count: aiCount }) });
    const data = await res.json();
    if (data.flashcards) {
      await fetch(`${API_URL}/api/flashcards/bulk`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ deckId, userId: user.id, cards: data.flashcards }) });
      fetchCards(); setAiContent(''); setMode('list');
    }
    setAiLoading(false);
  };

  const rateCard = async (quality) => {
    const card = dueCards[studyIdx];
    await fetch(`${API_URL}/api/flashcards/${card.id}/review`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ quality }) });
    setResults(r => [...r, { quality }]);
    setFlipped(false);
    setTimeout(() => {
      if (studyIdx + 1 >= dueCards.length) setMode('done');
      else setStudyIdx(i => i + 1);
    }, 80);
  };

  const card = dueCards[studyIdx];

  return (
    <div>
      <div className="flex items-center gap-12 mb-20">
        <Link to="/flashcards" style={{ color: 'var(--text2)', textDecoration: 'none', fontSize: 13 }}>← Decks</Link>
        <h1 style={{ fontFamily: 'Syne', fontSize: 22, fontWeight: 700 }}>Deck</h1>
        <span className="badge badge-indigo">{cards.length} cards</span>
        {dueCards.length > 0 && <span className="badge badge-amber">{dueCards.length} due today</span>}
      </div>

      <div className="tabs">
        {[['list', '📋 All Cards'], ['add', '+ Add Card'], ['ai', '✨ AI Generate']].map(([m, l]) => (
          <div key={m} className={`tab ${mode === m ? 'active' : ''}`} onClick={() => setMode(m)}>{l}</div>
        ))}
        {dueCards.length > 0 && (
          <div className={`tab ${mode === 'study' ? 'active' : ''}`} onClick={() => { setStudyIdx(0); setFlipped(false); setResults([]); setMode('study'); }} style={{ background: mode === 'study' ? 'var(--emerald)' : '' }}>
            🎯 Study Now ({dueCards.length})
          </div>
        )}
      </div>

      {/* LIST */}
      {mode === 'list' && (
        cards.length === 0 ? (
          <div className="card text-center" style={{ padding: '44px' }}>
            <p style={{ fontSize: 36, marginBottom: 10 }}>🃏</p>
            <p style={{ fontFamily: 'Syne', fontSize: 15, marginBottom: 6 }}>No cards yet</p>
            <div className="flex gap-8" style={{ justifyContent: 'center', marginTop: 12 }}>
              <button className="btn btn-primary btn-sm" onClick={() => setMode('add')}>Add Manually</button>
              <button className="btn btn-secondary btn-sm" onClick={() => setMode('ai')}>Generate with AI</button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {cards.map((c, i) => (
              <div key={c.id} className="card" style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--text3)', fontSize: 11, minWidth: 20, marginTop: 2 }}>#{i + 1}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 500, marginBottom: 5, fontSize: 14 }}>{c.front}</p>
                  <p style={{ color: 'var(--text2)', fontSize: 13 }}>{c.back}</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end', flexShrink: 0 }}>
                  {c.topic && <span className="badge badge-cyan" style={{ fontSize: 10 }}>{c.topic}</span>}
                  <span className="badge badge-indigo" style={{ fontSize: 10 }}>×{c.repetitions} reviews</span>
                  {new Date(c.next_review) <= new Date() && <span className="badge badge-amber" style={{ fontSize: 10 }}>Due</span>}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* ADD */}
      {mode === 'add' && (
        <div className="card" style={{ maxWidth: 540 }}>
          <h3 style={{ fontFamily: 'Syne', fontWeight: 600, marginBottom: 16 }}>Add a Card</h3>
          <div className="form-group"><label>Front — Question or Term</label><textarea className="content-area" style={{ minHeight: 80 }} value={front} onChange={e => setFront(e.target.value)} placeholder="e.g. What is mitosis?" /></div>
          <div className="form-group"><label>Back — Answer or Definition</label><textarea className="content-area" style={{ minHeight: 90 }} value={back} onChange={e => setBack(e.target.value)} placeholder="e.g. Cell division that produces two identical daughter cells..." /></div>
          <button className="btn btn-primary" onClick={addCard} disabled={!front.trim() || !back.trim()}>Add Card</button>
        </div>
      )}

      {/* AI GENERATE */}
      {mode === 'ai' && (
        <div className="card" style={{ maxWidth: 680 }}>
          <h3 style={{ fontFamily: 'Syne', fontWeight: 600, marginBottom: 4 }}>✨ Generate Flashcards with AI</h3>
          <p className="text-muted mb-16">Upload a PDF or paste your study material — AI will create flashcards from it</p>
          <ContentInput value={aiContent} onChange={setAiContent} placeholder="Paste your lecture notes, textbook content, or any study material..." />
          <div className="form-group mt-16">
            <label>Number of Cards</label>
            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
              {[5, 10, 15, 20].map(n => (
                <button key={n} onClick={() => setAiCount(n)} style={{ padding: '7px 16px', borderRadius: 'var(--radius-sm)', border: '1px solid', cursor: 'pointer', fontFamily: 'Outfit', fontSize: 13, borderColor: aiCount === n ? 'var(--indigo)' : 'var(--border)', background: aiCount === n ? 'var(--indigo-pale)' : 'var(--surface2)', color: aiCount === n ? 'var(--indigo-light)' : 'var(--text2)' }}>{n}</button>
              ))}
            </div>
          </div>
          <button className="btn btn-primary mt-16" onClick={generateAI} disabled={!aiContent.trim() || aiLoading}>
            {aiLoading ? '⏳ Generating flashcards...' : '✨ Generate Cards'}
          </button>
        </div>
      )}

      {/* STUDY */}
      {mode === 'study' && card && (
        <div style={{ maxWidth: 580, margin: '0 auto' }}>
          <div className="flex items-center justify-between mb-12">
            <span className="text-muted">{studyIdx + 1} / {dueCards.length}</span>
            <button className="btn btn-secondary btn-sm" onClick={() => setMode('list')}>Exit</button>
          </div>
          <div className="progress-bar mb-20">
            <div className="progress-fill" style={{ width: `${(studyIdx / dueCards.length) * 100}%` }} />
          </div>

          <div className="flashcard-wrap" onClick={() => setFlipped(f => !f)}>
            <div className={`flashcard ${flipped ? 'flipped' : ''}`}>
              <div className="flashcard-face flashcard-front">
                <span className="flashcard-label">QUESTION</span>
                {card.topic && <span style={{ position: 'absolute', top: 12, right: 14, fontSize: 10, color: 'var(--text3)', background: 'var(--surface2)', padding: '2px 8px', borderRadius: 50 }}>{card.topic}</span>}
                <p className="flashcard-text">{card.front}</p>
                {!flipped && <p style={{ position: 'absolute', bottom: 12, color: 'var(--text3)', fontSize: 11 }}>Click to flip</p>}
              </div>
              <div className="flashcard-face flashcard-back">
                <span className="flashcard-label">ANSWER</span>
                <p className="flashcard-text">{card.back}</p>
              </div>
            </div>
          </div>

          {flipped && (
            <div style={{ marginTop: 20 }}>
              <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text2)', marginBottom: 10 }}>How well did you know this?</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                {RATINGS.map(({ label, value, color }) => (
                  <button key={value} onClick={() => rateCard(value)} style={{ padding: '11px 8px', borderRadius: 'var(--radius-sm)', border: `1px solid ${color}40`, background: `${color}10`, color, cursor: 'pointer', fontFamily: 'Outfit', fontWeight: 600, fontSize: 13, transition: 'all 0.15s' }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* DONE */}
      {mode === 'done' && (
        <div className="card text-center" style={{ maxWidth: 440, margin: '0 auto', padding: '40px' }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>🎉</div>
          <h2 style={{ fontFamily: 'Syne', fontWeight: 700, marginBottom: 6 }}>Session Complete!</h2>
          <p className="text-muted mb-20">You reviewed {results.length} cards</p>
          <div className="grid-2 mb-20">
            <div className="card" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid var(--emerald)', padding: '16px', textAlign: 'center' }}>
              <div style={{ fontFamily: 'Syne', fontSize: 26, color: 'var(--emerald)' }}>{results.filter(r => r.quality >= 3).length}</div>
              <div style={{ fontSize: 12, color: 'var(--emerald)' }}>Correct</div>
            </div>
            <div className="card" style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid var(--rose)', padding: '16px', textAlign: 'center' }}>
              <div style={{ fontFamily: 'Syne', fontSize: 26, color: 'var(--rose)' }}>{results.filter(r => r.quality < 3).length}</div>
              <div style={{ fontSize: 12, color: 'var(--rose)' }}>Needs Review</div>
            </div>
          </div>
          <div className="flex gap-8" style={{ justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={() => { setStudyIdx(0); setFlipped(false); setResults([]); setMode('study'); }}>Study Again</button>
            <button className="btn btn-secondary" onClick={() => setMode('list')}>Back to Deck</button>
          </div>
        </div>
      )}
    </div>
  );
}
