import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { API_URL } from '../lib/supabase';

const COLORS = ['#6366f1','#22d3ee','#10b981','#f59e0b','#f43f5e','#a855f7','#f97316'];

export default function Flashcards() {
  const { user } = useAuth();
  const [decks, setDecks] = useState([]);
  const [sharedDecks, setSharedDecks] = useState([]);
  const [tab, setTab] = useState('mine');
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [isPublic, setIsPublic] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cloning, setCloning] = useState(null);

  const fetchDecks = () => {
    fetch(`${API_URL}/api/flashcards/decks/${user.id}`).then(r => r.json()).then(d => setDecks(Array.isArray(d) ? d : []));
    fetch(`${API_URL}/api/flashcards/shared?userId=${user.id}`).then(r => r.json()).then(d => setSharedDecks(Array.isArray(d) ? d : []));
  };

  useEffect(() => { if (user) fetchDecks(); }, [user]);

  const createDeck = async () => {
    if (!name.trim()) return;
    setLoading(true);
    await fetch(`${API_URL}/api/flashcards/decks`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, name, description, color, isPublic })
    });
    setName(''); setDescription(''); setColor(COLORS[0]); setIsPublic(false);
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

  const DeckCard = ({ deck, isShared }) => (
    <div style={{ position: 'relative' }}>
      {isShared ? (
        <div className="card" style={{ cursor: 'default' }}>
          <div style={{ width: 38, height: 38, borderRadius: 9, marginBottom: 10, background: `${deck.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, borderLeft: `3px solid ${deck.color}` }}>🃏</div>
          <p style={{ fontFamily: 'Syne', fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{deck.name}</p>
          {deck.description && <p className="text-muted mb-12" style={{ fontSize: 12 }}>{deck.description}</p>}
          <div className="flex items-center justify-between mt-12">
            <span className="badge badge-indigo">{deck.flashcards?.[0]?.count || 0} cards</span>
            <button className="btn btn-primary btn-sm" onClick={() => cloneDeck(deck.id)} disabled={cloning === deck.id}>
              {cloning === deck.id ? 'Cloning...' : '+ Import Deck'}
            </button>
          </div>
        </div>
      ) : (
        <Link to={`/flashcards/${deck.id}`} style={{ textDecoration: 'none' }}>
          <div className="card card-hover">
            <div style={{ width: 38, height: 38, borderRadius: 9, marginBottom: 10, background: `${deck.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, borderLeft: `3px solid ${deck.color}` }}>🃏</div>
            <p style={{ fontFamily: 'Syne', fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{deck.name}</p>
            {deck.description && <p className="text-muted mb-12" style={{ fontSize: 12 }}>{deck.description}</p>}
            <div className="flex items-center justify-between mt-12">
              <div className="flex gap-6">
                <span className="badge badge-indigo">{deck.flashcards?.[0]?.count || 0} cards</span>
                {deck.is_public && <span className="badge badge-cyan">Public</span>}
              </div>
              <button className="btn btn-danger btn-sm" onClick={e => deleteDeck(e, deck.id)}>Delete</button>
            </div>
          </div>
        </Link>
      )}
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-20">
        <div>
          <h1 style={{ fontFamily: 'Syne', fontSize: 24, fontWeight: 700 }}>Flashcards 🃏</h1>
          <p className="text-muted">Spaced repetition — study less, remember more</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ New Deck</button>
      </div>

      <div className="tabs">
        <div className={`tab ${tab === 'mine' ? 'active' : ''}`} onClick={() => setTab('mine')}>My Decks ({decks.length})</div>
        <div className={`tab ${tab === 'shared' ? 'active' : ''}`} onClick={() => setTab('shared')}>Shared by Others ({sharedDecks.length})</div>
      </div>

      {tab === 'mine' && (
        decks.length === 0 ? (
          <div className="card text-center" style={{ padding: '48px 20px' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📦</div>
            <p style={{ fontFamily: 'Syne', fontSize: 16, marginBottom: 6 }}>No decks yet</p>
            <p className="text-muted mb-16">Create a deck and add cards manually or generate them from your notes with AI</p>
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>Create Your First Deck</button>
          </div>
        ) : (
          <div className="grid-3">
            {decks.map(deck => <DeckCard key={deck.id} deck={deck} isShared={false} />)}
          </div>
        )
      )}

      {tab === 'shared' && (
        sharedDecks.length === 0 ? (
          <div className="card text-center" style={{ padding: '40px' }}>
            <p style={{ fontSize: 32, marginBottom: 10 }}>🌐</p>
            <p style={{ fontFamily: 'Syne', fontSize: 15, marginBottom: 6 }}>No public decks yet</p>
            <p className="text-muted">When other students make their decks public, they'll appear here. You can import them into your own account.</p>
          </div>
        ) : (
          <div className="grid-3">
            {sharedDecks.map(deck => <DeckCard key={deck.id} deck={deck} isShared={true} />)}
          </div>
        )
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 style={{ fontFamily: 'Syne', fontWeight: 700, marginBottom: 18 }}>Create New Deck</h3>
            <div className="form-group"><label>Deck Name</label><input type="text" placeholder="e.g. Biology Chapter 3" value={name} onChange={e => setName(e.target.value)} autoFocus /></div>
            <div className="form-group"><label>Description (optional)</label><input type="text" placeholder="Brief description" value={description} onChange={e => setDescription(e.target.value)} /></div>
            <div className="form-group">
              <label>Color</label>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                {COLORS.map(c => (
                  <div key={c} onClick={() => setColor(c)} style={{ width: 26, height: 26, borderRadius: '50%', background: c, cursor: 'pointer', border: color === c ? '3px solid white' : '3px solid transparent', outline: color === c ? `2px solid ${c}` : 'none' }} />
                ))}
              </div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px', background: 'var(--surface2)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', marginBottom: 16 }}>
              <input type="checkbox" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} style={{ width: 16, height: 16, accentColor: 'var(--indigo)' }} />
              <div>
                <p style={{ fontSize: 13, fontWeight: 500 }}>Make deck public</p>
                <p style={{ fontSize: 12, color: 'var(--text2)' }}>Other students can find and import this deck</p>
              </div>
            </label>
            <div className="flex gap-8">
              <button className="btn btn-primary" onClick={createDeck} disabled={!name.trim() || loading}>{loading ? 'Creating...' : 'Create Deck'}</button>
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
