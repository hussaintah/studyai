const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Get all decks for a user
router.get('/decks/:userId', async (req, res) => {
  const { data, error } = await supabase
    .from('decks')
    .select('*, flashcards(count)')
    .eq('user_id', req.params.userId)
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Get public/shared decks (not owned by user)
router.get('/shared', async (req, res) => {
  const { userId } = req.query;
  const { data, error } = await supabase
    .from('decks')
    .select('*, flashcards(count), profiles(full_name)')
    .eq('is_public', true)
    .neq('user_id', userId || '')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Create deck
router.post('/decks', async (req, res) => {
  const { userId, name, description, color, isPublic } = req.body;
  const { data, error } = await supabase
    .from('decks')
    .insert({ user_id: userId, name, description, color: color || '#6366f1', is_public: isPublic || false })
    .select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Update deck (toggle public)
router.put('/decks/:deckId', async (req, res) => {
  const { name, description, is_public } = req.body;
  const { data, error } = await supabase
    .from('decks')
    .update({ name, description, is_public })
    .eq('id', req.params.deckId)
    .select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Delete deck
router.delete('/decks/:deckId', async (req, res) => {
  const { error } = await supabase.from('decks').delete().eq('id', req.params.deckId);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// Clone a shared deck into user's account
router.post('/decks/:deckId/clone', async (req, res) => {
  const { userId } = req.body;
  const { deckId } = req.params;

  // Get original deck + cards
  const { data: deck } = await supabase.from('decks').select('*').eq('id', deckId).single();
  const { data: cards } = await supabase.from('flashcards').select('*').eq('deck_id', deckId);

  if (!deck) return res.status(404).json({ error: 'Deck not found' });

  // Create new deck
  const { data: newDeck } = await supabase.from('decks')
    .insert({ user_id: userId, name: `${deck.name} (copy)`, description: deck.description, color: deck.color, is_public: false })
    .select().single();

  // Clone cards
  if (cards && cards.length > 0) {
    const newCards = cards.map(c => ({
      deck_id: newDeck.id, user_id: userId,
      front: c.front, back: c.back,
      ease_factor: 2.5, interval: 1, repetitions: 0,
      next_review: new Date().toISOString()
    }));
    await supabase.from('flashcards').insert(newCards);
  }

  res.json({ success: true, deck: newDeck });
});

// Get flashcards in a deck
router.get('/:deckId', async (req, res) => {
  const { data, error } = await supabase
    .from('flashcards')
    .select('*')
    .eq('deck_id', req.params.deckId)
    .order('next_review', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Create flashcard
router.post('/', async (req, res) => {
  const { deckId, front, back, userId, topic } = req.body;
  const { data, error } = await supabase
    .from('flashcards')
    .insert({ deck_id: deckId, user_id: userId, front, back, topic: topic || null, ease_factor: 2.5, interval: 1, repetitions: 0, next_review: new Date().toISOString() })
    .select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Bulk create
router.post('/bulk', async (req, res) => {
  const { deckId, userId, cards } = req.body;
  const rows = cards.map(c => ({
    deck_id: deckId, user_id: userId,
    front: c.front, back: c.back, topic: c.topic || null,
    ease_factor: 2.5, interval: 1, repetitions: 0,
    next_review: new Date().toISOString()
  }));
  const { data, error } = await supabase.from('flashcards').insert(rows).select();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Review card with SM-2
router.post('/:cardId/review', async (req, res) => {
  const { quality } = req.body;
  const { data: card } = await supabase.from('flashcards').select('*').eq('id', req.params.cardId).single();
  if (!card) return res.status(404).json({ error: 'Card not found' });

  let { ease_factor, interval, repetitions } = card;
  if (quality >= 3) {
    if (repetitions === 0) interval = 1;
    else if (repetitions === 1) interval = 6;
    else interval = Math.round(interval * ease_factor);
    repetitions += 1;
  } else {
    repetitions = 0;
    interval = 1;
  }
  ease_factor = Math.max(1.3, ease_factor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));

  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + interval);

  const { data, error } = await supabase.from('flashcards')
    .update({ ease_factor, interval, repetitions, next_review: nextReview.toISOString(), last_reviewed: new Date().toISOString() })
    .eq('id', req.params.cardId).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Update card
router.put('/:cardId', async (req, res) => {
  const { front, back } = req.body;
  const { data, error } = await supabase.from('flashcards').update({ front, back }).eq('id', req.params.cardId).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Delete card
router.delete('/:cardId', async (req, res) => {
  const { error } = await supabase.from('flashcards').delete().eq('id', req.params.cardId);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

module.exports = router;
