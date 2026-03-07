import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { API_URL } from '../lib/supabase';
import ContentInput from '../components/ContentInput';

const RATINGS = [
  { label: 'Again', value: 0, color: '#f43f5e' },
  { label: 'Hard',  value: 2, color: 'var(--orange)' },
  { label: 'Good',  value: 4, color: 'var(--lime)' },
  { label: 'Easy',  value: 5, color: 'var(--cyan)' },
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

  const fetchCards = async () => { const res = await fetch(`${API_URL}/api/flashcards/${deckId}`); setCards(await res.json()); };
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
    setResults(r => [...r, { quality }]); setFlipped(false);
    setTimeout(() => { if (studyIdx + 1 >= dueCards.length) setMode('done'); else setStudyIdx(i => i + 1); }, 80);
  };

  const card = dueCards[studyIdx];

  return (
    <div className="page-inner">
      {/* Header */}
      <div className="page-hdr">
        <div className="flex items-center gap-12">
          <Link to="/flashcards" style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.82rem', color: 'var(--text-3)', textDecoration: 'none', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Flashcards
          </Link>
          <span style={{ color: 'var(--text-4)' }}>›</span>
          <h1 style={{ fontSize: '1.6rem', marginBottom: 0 }}>Deck</h1>
          <span className="badge badge-orange">{cards.length} cards</span>
          {dueCards.length > 0 && <span className="badge badge-cyan">{dueCards.length} due today</span>}
        </div>
      </div>

      <div className="tabs">
        {[['list', 'All Cards'], ['add', '+ Add Card'], ['ai', 'AI Generate']].map(([m, l]) => (
          <div key={m} className={`tab${mode === m ? ' active' : ''}`} onClick={() => setMode(m)}>{l}</div>
        ))}
        {dueCards.length > 0 && (
          <div className={`tab${mode === 'study' ? ' active' : ''}`}
            style={{ color: mode === 'study' ? 'var(--lime)' : undefined, borderBottomColor: mode === 'study' ? 'var(--lime)' : undefined }}
            onClick={() => { setStudyIdx(0); setFlipped(false); setResults([]); setMode('study'); }}>
            Study Now ({dueCards.length})
          </div>
        )}
      </div>

      {/* LIST */}
      {mode === 'list' && (
        cards.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><svg viewBox="0 0 20 20"><rect x="2" y="4" width="16" height="12" rx="1"/><path d="M6 4V2M14 4V2"/></svg></div>
            <h3>No cards yet</h3>
            <p>Add cards manually or generate them from your notes with AI.</p>
            <div className="flex gap-8" style={{ justifyContent: 'center' }}>
              <button className="btn-primary" onClick={() => setMode('add')}>Add Manually</button>
              <button className="btn-secondary" onClick={() => setMode('ai')}>Generate with AI</button>
            </div>
          </div>
        ) : (
          <div>
            {cards.map((c, i) => (
              <div key={c.id} className="card-list-item">
                <span className="card-side-label">Q</span>
                <div style={{ flex: 1 }}>
                  <div className="card-side-text" style={{ fontWeight: 500, color: 'var(--text)', marginBottom: 8 }}>{c.front}</div>
                  <div className="card-divider" style={{ width: '100%', height: 1, background: 'var(--panel-bdr)', margin: '8px 0' }} />
                  <div className="card-side-text">{c.back}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end', flexShrink: 0 }}>
                  {c.topic && <span className="badge badge-cyan">{c.topic}</span>}
                  <span className="badge badge-violet">×{c.repetitions} reviews</span>
                  {new Date(c.next_review) <= new Date() && <span className="badge badge-orange">Due</span>}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* ADD */}
      {mode === 'add' && (
        <div style={{ maxWidth: 560 }}>
          <div className="cpanel">
            <div className="cpanel-title">Add a Card</div>
            <div className="form-group">
              <label>Front — Question or Term</label>
              <textarea className="content-area" style={{ minHeight: 80 }} value={front} onChange={e => setFront(e.target.value)} placeholder="e.g. What is mitosis?" />
            </div>
            <div className="form-group">
              <label>Back — Answer or Definition</label>
              <textarea className="content-area" style={{ minHeight: 90 }} value={back} onChange={e => setBack(e.target.value)} placeholder="e.g. Cell division that produces two identical daughter cells..." />
            </div>
            <button className="btn-primary" onClick={addCard} disabled={!front.trim() || !back.trim()}>Add Card</button>
          </div>
        </div>
      )}

      {/* AI GENERATE */}
      {mode === 'ai' && (
        <div style={{ maxWidth: 680 }}>
          <div className="cpanel">
            <div className="cpanel-title">Generate Flashcards with AI</div>
            <p style={{ fontSize: '0.92rem', color: 'var(--text-3)', marginBottom: 20 }}>Upload a PDF or paste your study material — AI will create flashcards from it</p>
            <ContentInput value={aiContent} onChange={setAiContent} placeholder="Paste your lecture notes, textbook content, or any study material..." />
            <div style={{ marginTop: 20 }}>
              <span className="sec-label">Number of Cards</span>
              <div className="pill-row">
                {[5, 10, 15, 20].map(n => (
                  <button key={n} className={`pill${aiCount === n ? ' active-orange' : ''}`} onClick={() => setAiCount(n)}>{n}</button>
                ))}
              </div>
            </div>
            <button className="btn-primary" style={{ marginTop: 20 }} onClick={generateAI} disabled={!aiContent.trim() || aiLoading}>
              {aiLoading ? 'Generating...' : 'Generate Cards'}
            </button>
          </div>
        </div>
      )}

      {/* STUDY */}
      {mode === 'study' && card && (
        <div className="flashcard-wrap">
          <div className="flex items-center justify-between" style={{ width: '100%', maxWidth: 560, marginBottom: 16 }}>
            <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.80rem', color: 'var(--text-3)' }}>{studyIdx + 1} / {dueCards.length}</span>
            <button className="btn-secondary btn-sm" onClick={() => setMode('list')}>Exit</button>
          </div>

          <div className="exam-progress-bar" style={{ width: '100%', maxWidth: 560, marginBottom: 24 }}>
            <div className="exam-progress-fill" style={{ width: `${(studyIdx / dueCards.length) * 100}%` }} />
          </div>

          <div className="flashcard" onClick={() => setFlipped(f => !f)}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, var(--orange), var(--orange-2))' }} />
            <div>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.14em', color: flipped ? 'var(--lime)' : 'var(--orange)', marginBottom: 16, textAlign: 'center' }}>
                {flipped ? 'Answer' : 'Question'}
              </div>
              {card.topic && (
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.68rem', color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.10em', marginBottom: 12, textAlign: 'center' }}>{card.topic}</div>
              )}
              <div className="flashcard-text">{flipped ? card.back : card.front}</div>
            </div>
            {!flipped && <div className="flashcard-hint">Click to reveal answer</div>}
          </div>

          {flipped && (
            <div className="rating-row" style={{ width: '100%', maxWidth: 560 }}>
              {RATINGS.map(({ label, value, color }) => (
                <button key={value} className="rating-btn" style={{ borderColor: color, color }}
                  onClick={() => rateCard(value)}>{label}</button>
              ))}
            </div>
          )}
          {!flipped && <div style={{ height: 64 }} />}
        </div>
      )}

      {/* DONE */}
      {mode === 'done' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 20px', textAlign: 'center' }}>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.72rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 12 }}>Session Complete</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 28, maxWidth: 320, width: '100%' }}>
            <div className="stat-card sc-lime" style={{ textAlign: 'center', padding: '20px' }}>
              <div className="stat-num" style={{ fontSize: '2.2rem' }}>{results.filter(r => r.quality >= 3).length}</div>
              <div className="stat-label">Correct</div>
            </div>
            <div className="stat-card sc-orange" style={{ textAlign: 'center', padding: '20px' }}>
              <div className="stat-num" style={{ fontSize: '2.2rem' }}>{results.filter(r => r.quality < 3).length}</div>
              <div className="stat-label">Review</div>
            </div>
          </div>
          <div className="flex gap-10">
            <button className="btn-primary" onClick={() => { setStudyIdx(0); setFlipped(false); setResults([]); setMode('study'); }}>Study Again</button>
            <button className="btn-secondary" onClick={() => setMode('list')}>Back to Deck</button>
          </div>
        </div>
      )}
    </div>
  );
}
