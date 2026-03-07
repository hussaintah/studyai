import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { API_URL } from '../lib/supabase';

const PALETTE = [
  { bg: '#f05a00', label: 'orange' },
  { bg: '#00c2cc', label: 'cyan' },
  { bg: '#7ec800', label: 'lime' },
  { bg: '#7c3aff', label: 'violet' },
  { bg: '#f43f5e', label: 'rose' },
  { bg: '#0ea5e9', label: 'sky' },
  { bg: '#f59e0b', label: 'amber' },
  { bg: '#10b981', label: 'emerald' },
];

function randomColor() { return PALETTE[Math.floor(Math.random() * PALETTE.length)].bg; }

export default function Flashcards() {
  const { user, loading: authLoading } = useAuth();
  const [decks, setDecks] = useState([]);
  const [sharedDecks, setSharedDecks] = useState([]);
  const [decksLoading, setDecksLoading] = useState(true);
  const [tab, setTab] = useState('mine');
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(PALETTE[0].bg);
  const [isPublic, setIsPublic] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cloning, setCloning] = useState(null);

  const fetchDecks = () => {
    setDecksLoading(true);
    Promise.all([
      fetch(`${API_URL}/api/flashcards/decks/${user.id}`).then(r => r.json()).then(d => setDecks(Array.isArray(d) ? d : [])),
      fetch(`${API_URL}/api/flashcards/shared?userId=${user.id}`).then(r => r.json()).then(d => setSharedDecks(Array.isArray(d) ? d : []))
    ]).finally(() => setDecksLoading(false));
  };

  useEffect(() => { if (!authLoading && user) fetchDecks(); }, [user, authLoading]);

  const openModal = () => { setColor(randomColor()); setShowModal(true); };

  const createDeck = async () => {
    if (!name.trim()) return;
    setLoading(true);
    await fetch(`${API_URL}/api/flashcards/decks`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, name, description, color, isPublic })
    });
    setName(''); setDescription(''); setColor(randomColor()); setIsPublic(false);
    setShowModal(false); setLoading(false); fetchDecks();
  };

  const deleteDeck = async (e, id) => {
    e.preventDefault();
    if (!window.confirm('Delete this deck and all its cards?')) return;
    await fetch(`${API_URL}/api/flashcards/decks/${id}`, { method: 'DELETE' });
    fetchDecks();
  };

  const cloneDeck = async (deckId) => {
    setCloning(deckId);
    await fetch(`${API_URL}/api/flashcards/decks/${deckId}/clone`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id })
    });
    setCloning(null); setTab('mine'); fetchDecks();
  };

  const DeckCard = ({ deck, isShared }) => {
    const count = deck.flashcards?.[0]?.count || 0;
    const inner = (
      <div className="deck-card" style={{ borderColor: `${deck.color}30` }}>
        <div className="deck-accent" style={{ background: `linear-gradient(90deg, ${deck.color}, ${deck.color}88)` }} />
        <div className="deck-initial" style={{ background: deck.color }}>
          {deck.name[0]?.toUpperCase()}
        </div>
        <div className="deck-name">{deck.name}</div>
        {deck.description && <div className="deck-desc">{deck.description}</div>}
        <div className="deck-footer">
          <span className="badge badge-orange" style={{ borderColor: `${deck.color}40`, color: deck.color, background: `${deck.color}15` }}>
            {count} card{count !== 1 ? 's' : ''}
          </span>
          {isShared ? (
            <button className="btn-primary btn-sm" style={{ padding: '5px 12px', fontSize: '0.72rem' }}
              onClick={e => { e.preventDefault(); cloneDeck(deck.id); }}
              disabled={cloning === deck.id}>
              {cloning === deck.id ? 'Importing...' : '+ Import'}
            </button>
          ) : (
            <button className="btn-danger btn-sm"
              onClick={e => deleteDeck(e, deck.id)}>
              Delete
            </button>
          )}
        </div>
      </div>
    );
    return isShared ? <div>{inner}</div> : <Link to={`/flashcards/${deck.id}`} style={{ textDecoration: 'none' }}>{inner}</Link>;
  };

  return (
    <div className="page-inner">
      <div className="page-hdr flex items-center justify-between">
        <div>
          <h1>Flashcards</h1>
          <p>Spaced repetition — study less, remember more</p>
        </div>
        <button className="btn-primary" onClick={openModal}>+ New Deck</button>
      </div>

      <div className="tabs">
        <div className={`tab${tab === 'mine' ? ' active' : ''}`} onClick={() => setTab('mine')}>My Decks ({decks.length})</div>
        <div className={`tab${tab === 'shared' ? ' active' : ''}`} onClick={() => setTab('shared')}>Shared by Others ({sharedDecks.length})</div>
      </div>

      {tab === 'mine' && (
        decksLoading ? (
          <div className="empty-state" style={{ border: 'none' }}>
            <div className="spinner" style={{ margin: '0 auto' }} />
          </div>
        ) : decks.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <svg viewBox="0 0 20 20"><rect x="2" y="4" width="16" height="12" rx="1"/><path d="M6 4V2M14 4V2"/></svg>
            </div>
            <h3>No decks yet</h3>
            <p>Create a deck and add cards manually, or generate them from your notes with AI.</p>
            <button className="btn-primary" onClick={openModal}>Create Your First Deck</button>
          </div>
        ) : (
          <div className="deck-grid">
            {decks.map(deck => <DeckCard key={deck.id} deck={deck} isShared={false} />)}
          </div>
        )
      )}

      {tab === 'shared' && (
        sharedDecks.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <svg viewBox="0 0 20 20"><circle cx="10" cy="10" r="7"/><path d="M10 6.5v4M10 13.5v.5"/></svg>
            </div>
            <h3>No public decks yet</h3>
            <p>When other students make their decks public, they'll appear here for you to import.</p>
          </div>
        ) : (
          <div className="deck-grid">
            {sharedDecks.map(deck => <DeckCard key={deck.id} deck={deck} isShared={true} />)}
          </div>
        )
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Create New Deck</h3>
            <div className="form-group">
              <label>Deck Name</label>
              <input type="text" placeholder="e.g. Thermodynamics Chapter 3" value={name} onChange={e => setName(e.target.value)} autoFocus />
            </div>
            <div className="form-group">
              <label>Description (optional)</label>
              <input type="text" placeholder="Brief description" value={description} onChange={e => setDescription(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Deck Color</label>
              <div className="color-swatches">
                {PALETTE.map(c => (
                  <div key={c.bg} className={`color-swatch${color === c.bg ? ' selected' : ''}`}
                    style={{ background: c.bg }} onClick={() => setColor(c.bg)} />
                ))}
              </div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: 'rgba(240,90,0,0.05)', border: '1px solid rgba(240,90,0,0.15)', cursor: 'pointer', marginBottom: 20 }}>
              <input type="checkbox" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} style={{ width: 16, height: 16, accentColor: 'var(--orange)' }} />
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)' }}>Make deck public</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>Other students can find and import this deck</div>
              </div>
            </label>
            <div className="flex gap-8">
              <button className="btn-primary" onClick={createDeck} disabled={!name.trim() || loading}>{loading ? 'Creating...' : 'Create Deck'}</button>
              <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
