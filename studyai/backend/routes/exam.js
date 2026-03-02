const express = require('express');
const router = express.Router();
const Groq = require('groq-sdk');
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = 'llama-3.3-70b-versatile';

// Generate questions — supports enabledTypes array (mcq, short, truefalse, numerical)
router.post('/generate-questions', async (req, res) => {
  const { content, type, enabledTypes, count = 5, difficulty = 'medium', topics } = req.body;
  if (!content) return res.status(400).json({ error: 'Content required' });

  // enabledTypes takes priority over legacy 'type' field
  const activeTypes = enabledTypes && enabledTypes.length > 0
    ? enabledTypes
    : (type === 'mcq' ? ['mcq'] : type === 'short' ? ['short'] : type === 'truefalse' ? ['truefalse'] : type === 'numerical' ? ['numerical'] : ['mcq', 'short', 'truefalse', 'numerical']);

  const typeLabels = { mcq: 'Multiple Choice (4 options A/B/C/D)', short: 'Short Answer (2-4 sentences)', truefalse: 'True/False (non-obvious, test misconceptions)', numerical: 'Numerical/Calculation (show formula and working, include numbers and units)' };

  const typeList = activeTypes.map(t => `- ${typeLabels[t] || t}`).join('\n');

  // Distribute questions across enabled types
  const perType = Math.floor(count / activeTypes.length);
  const remainder = count % activeTypes.length;
  const distribution = activeTypes.map((t, i) => `${perType + (i < remainder ? 1 : 0)} × ${t}`).join(', ');

  const topicFocus = topics && topics.length > 0
    ? `IMPORTANT: Focus specifically on these weak topics: ${topics.join(', ')}`
    : '';

  const prompt = `You are a university professor creating exam-quality practice questions.

STUDY MATERIAL:
${content.slice(0, 8000)}

TASK: Generate exactly ${count} questions (${distribution}).
ALLOWED QUESTION TYPES:
${typeList}
DIFFICULTY: ${difficulty}
${topicFocus}

RULES:
- Numerical questions MUST contain actual numbers and require calculation. Include units.
- MCQ distractors must be plausible — not obviously wrong
- True/False must test misconceptions, not trivial facts
- Short answers require specific knowledge, not vague responses
- For difficulty "${difficulty}": ${difficulty === 'hard' || difficulty === 'expert' ? 'make questions tricky, multi-step, and test deeper understanding' : 'balance challenge and clarity'}

Return ONLY a valid JSON array, no markdown:
[
  {
    "id": 1,
    "type": "mcq" | "short" | "truefalse" | "numerical",
    "question": "question text — for numerical include all given values",
    "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
    "correct_answer": "full answer — for numerical include full working and final answer with units",
    "explanation": "why this is correct",
    "difficulty": "easy|medium|hard",
    "topic": "concept being tested (3-5 words)"
  }
]`;

  try {
    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 5000,
      temperature: 0.3,
    });
    let raw = completion.choices[0]?.message?.content || '[]';
    raw = raw.replace(/```json|```/g, '').trim();
    const questions = JSON.parse(raw);
    res.json({ questions, count: questions.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate questions' });
  }
});

// Evaluate answer
router.post('/evaluate-answer', async (req, res) => {
  const { question, correctAnswer, studentAnswer, questionType, topic } = req.body;
  if (!question || !studentAnswer) return res.status(400).json({ error: 'Required fields missing' });

  const numericNote = questionType === 'numerical'
    ? 'For numerical questions: award partial credit if method is correct but arithmetic is slightly wrong. Check units.'
    : '';

  const prompt = `You are an expert teacher evaluating a student's answer. Be honest but encouraging.
${numericNote}

QUESTION: ${question}
TOPIC: ${topic || 'general'}
CORRECT ANSWER: ${correctAnswer}
STUDENT'S ANSWER: ${studentAnswer}
QUESTION TYPE: ${questionType || 'short'}

Return ONLY valid JSON:
{
  "score": <0-100>,
  "grade": "Excellent|Good|Partial|Incorrect",
  "is_correct": <true if score >= 70>,
  "feedback": "2-3 sentences of specific feedback mentioning what they got right and wrong",
  "key_concepts_missed": ["concept 1", "concept 2"],
  "improvement_tip": "one specific actionable thing to review"
}`;

  try {
    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 500, temperature: 0.2,
    });
    let raw = completion.choices[0]?.message?.content || '{}';
    raw = raw.replace(/```json|```/g, '').trim();
    res.json(JSON.parse(raw));
  } catch {
    res.status(500).json({ error: 'Evaluation failed' });
  }
});

// Analyze weak topics
router.post('/analyze-weaknesses', async (req, res) => {
  const { results } = req.body;
  if (!results || results.length === 0) return res.status(400).json({ error: 'Results required' });

  const wrong = results.filter(r => !r.is_correct);
  if (wrong.length === 0) return res.json({ weakTopics: [], summary: "Perfect score! You've mastered all topics in this session." });

  const prompt = `A student just completed a practice quiz. Analyze their performance.

WRONG ANSWERS:
${wrong.map(r => `- Topic: "${r.topic}" | Q: "${r.question}" | Missed: ${(r.key_concepts_missed || []).join(', ')}`).join('\n')}

CORRECT: ${results.filter(r => r.is_correct).map(r => r.topic).join(', ')}

Return ONLY valid JSON:
{
  "weakTopics": [{ "topic": "name", "why": "what they misunderstand", "studyTip": "concrete tip" }],
  "strongTopics": ["topic1"],
  "summary": "2-3 sentence overall assessment",
  "priorityAction": "single most important next step"
}`;

  try {
    const completion = await groq.chat.completions.create({
      model: MODEL, messages: [{ role: 'user', content: prompt }],
      max_tokens: 800, temperature: 0.2,
    });
    let raw = completion.choices[0]?.message?.content || '{}';
    raw = raw.replace(/```json|```/g, '').trim();
    res.json(JSON.parse(raw));
  } catch {
    res.status(500).json({ error: 'Analysis failed' });
  }
});

// Explanation mode
router.post('/explain', async (req, res) => {
  const { question, correctAnswer, studentAnswer, topic, content } = req.body;
  const prompt = `A student got this question wrong. Teach the concept clearly.

QUESTION: ${question}
TOPIC: ${topic}
CORRECT ANSWER: ${correctAnswer}
STUDENT ANSWERED: ${studentAnswer}
${content ? `CONTEXT:\n${content.slice(0, 2000)}` : ''}

Your response:
1. Acknowledge what they got right (if anything)
2. Clearly explain WHY the correct answer is right
3. Use an analogy or real-world example
4. End with a follow-up question to check understanding

Under 200 words. Be warm and encouraging.`;

  try {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    const stream = await groq.chat.completions.create({
      model: MODEL, messages: [{ role: 'user', content: prompt }],
      max_tokens: 400, temperature: 0.5, stream: true
    });
    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content || '';
      if (text) res.write(`data: ${JSON.stringify({ text })}\n\n`);
    }
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch {
    res.status(500).json({ error: 'Explanation failed' });
  }
});

// Generate flashcards
router.post('/generate-flashcards', async (req, res) => {
  const { content, count = 10 } = req.body;
  if (!content) return res.status(400).json({ error: 'Content required' });
  const prompt = `Create ${count} high-quality flashcards from this study material. Focus on key terms, concepts, definitions, formulas, and important relationships.

${content.slice(0, 7000)}

Return ONLY a valid JSON array:
[{ "front": "concise question or term", "back": "clear complete answer", "topic": "topic tag" }]`;
  try {
    const completion = await groq.chat.completions.create({
      model: MODEL, messages: [{ role: 'user', content: prompt }],
      max_tokens: 3000, temperature: 0.3,
    });
    let raw = completion.choices[0]?.message?.content || '[]';
    raw = raw.replace(/```json|```/g, '').trim();
    res.json({ flashcards: JSON.parse(raw) });
  } catch {
    res.status(500).json({ error: 'Failed to generate flashcards' });
  }
});

// AI Tutor
router.post('/tutor', async (req, res) => {
  const { messages, context } = req.body;
  const systemPrompt = `You are an expert AI tutor helping a student understand their study material.
${context ? `STUDY MATERIAL:\n${context.slice(0, 4000)}` : ''}
Be clear, patient, and pedagogical. Break complex ideas into steps. Use examples. Keep responses focused.`;
  try {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    const stream = await groq.chat.completions.create({
      model: MODEL, messages: [{ role: 'system', content: systemPrompt }, ...messages.slice(-12)],
      max_tokens: 600, temperature: 0.5, stream: true
    });
    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content || '';
      if (text) res.write(`data: ${JSON.stringify({ text })}\n\n`);
    }
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch {
    res.status(500).json({ error: 'Tutor unavailable' });
  }
});

module.exports = router;
