# 📚 StudyAI — Rebuilt with 5 Genuinely Useful Features

---

## Features

### 1. 📄 PDF & File Upload (everywhere)
Upload a PDF or TXT file on any page — the backend extracts the text automatically using pdf-parse. Works on Flashcard generator, Question Engine, Exam Simulator, and AI Tutor. No more copy-pasting entire textbooks.

### 2. 🧠 Weak Topic Detection
After completing a practice session, click "Analyze My Weak Topics". The AI:
- Identifies specifically which concepts you misunderstood (not just "you got 3 wrong")
- Explains WHY you got each one wrong
- Gives a concrete study tip for each weak area
- Tells you your #1 priority action before the next session
- Next session, click "Focus on Weak Topics" to generate questions targeting exactly those areas

### 3. 📖 Explanation Mode
When you get a question wrong, a button appears: "Explain this concept to me". The AI:
- Acknowledges anything you got right
- Explains WHY the correct answer is right in simple language
- Uses an analogy or real-world example to make it memorable
- Ends with a follow-up question to confirm you understood
This is streamed in real-time so it appears word by word.

### 4. 📝 Exam Simulator (full mock exam experience)
- Full timed exam (you choose: 5/10/15/20 questions, 10/15/20/30 minutes)
- Mixed question types (MCQ, short answer, true/false) like a real exam
- Question navigation panel — jump between questions, see which are answered
- Timer turns amber at 5 minutes left, red at 2 minutes, auto-submits at 0
- NO feedback during the exam — just like the real thing
- After submission: grade (A/B/C/D/F), percentage, topic-by-topic breakdown, per-question feedback with correct answers

### 5. 🌐 Shared Decks
- When creating a flashcard deck, toggle "Make deck public"
- All public decks appear in the "Shared by Others" tab
- Any student can click "Import Deck" to clone it into their own account
- Perfect for study groups — one person makes the deck, everyone imports it

---

## Supabase SQL — Run this in SQL Editor

```sql
CREATE TABLE decks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#6366f1',
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE flashcards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  deck_id UUID REFERENCES decks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  front TEXT NOT NULL,
  back TEXT NOT NULL,
  topic TEXT,
  ease_factor DECIMAL DEFAULT 2.5,
  interval INTEGER DEFAULT 1,
  repetitions INTEGER DEFAULT 0,
  next_review TIMESTAMPTZ DEFAULT NOW(),
  last_reviewed TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;

-- Users manage their own decks
CREATE POLICY "Users own decks" ON decks FOR ALL USING (auth.uid() = user_id);
-- Anyone can read public decks
CREATE POLICY "Public decks readable" ON decks FOR SELECT USING (is_public = true OR auth.uid() = user_id);
-- Users manage their own cards
CREATE POLICY "Users own flashcards" ON flashcards FOR ALL USING (auth.uid() = user_id);
-- Anyone can read cards from public decks
CREATE POLICY "Public deck cards readable" ON flashcards FOR SELECT USING (
  EXISTS (SELECT 1 FROM decks WHERE decks.id = flashcards.deck_id AND (decks.is_public = true OR decks.user_id = auth.uid()))
);
```

---

## Deployment

### Backend (Render)
- Root: `backend/`
- Build: `npm install`
- Start: `node server.js`
- Env vars: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `GROQ_API_KEY`

### Frontend (Vercel)
- Root: `frontend/`
- Env vars: `REACT_APP_SUPABASE_URL`, `REACT_APP_SUPABASE_ANON_KEY`, `REACT_APP_API_URL`
