const express = require('express');
const router = express.Router();
const Groq = require('groq-sdk');
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = 'llama-3.3-70b-versatile';

// Generate questions from study content
router.post('/generate-questions', async (req, res) => {
  const { content, type, count = 5, difficulty = 'medium', topics } = req.body;
  if (!content) return res.status(400).json({ error: 'Content required' });

  const typeInstructions = {
    mcq: `Generate ${count} multiple choice questions. Each must have exactly 4 options labeled A, B, C, D.`,
    short: `Generate ${count} short answer questions requiring 2-4 sentence answers.`,
    truefalse: `Generate ${count} true/false questions. Make them non-obvious — avoid questions where the answer is trivially obvious.`,
    mixed: `Generate ${count} questions: mix of multiple choice (with 4 options A/B/C/D), short answer, and true/false.`,
  };

  const topicFocus = topics && topics.length > 0
    ? `IMPORTANT: Focus specifically on these weak topics the student is struggling with: ${topics.join(', ')}`
    : '';

  const prompt = `You are an expert educator creating exam-quality practice questions.

STUDY MATERIAL:
${content.slice(0, 7000)}

TASK: ${typeInstructions[type] || typeInstructions.mixed}
DIFFICULTY: ${difficulty}
${topicFocus}

Return ONLY a valid JSON array with no markdown or explanation:
[
  {
    "id": 1,
    "type": "mcq" | "short" | "truefalse",
    "question": "clear question text",
    "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
    "correct_answer": "full correct answer text",
    "explanation": "clear explanation of why this is correct",
    "difficulty": "easy|medium|hard",
    "topic": "specific concept being tested (2-5 words)"
  }
]`;

  try {
    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 4000,
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

// Evaluate answer AND detect weak topics
router.post('/evaluate-answer', async (req, res) => {
  const { question, correctAnswer, studentAnswer, questionType, topic } = req.body;
  if (!question || !studentAnswer) return res.status(400).json({ error: 'Required fields missing' });

  const prompt = `You are an expert teacher evaluating a student's answer. Be honest but encouraging.

QUESTION: ${question}
TOPIC: ${topic || 'general'}
CORRECT ANSWER: ${correctAnswer}
STUDENT'S ANSWER: ${studentAnswer}
QUESTION TYPE: ${questionType || 'short'}

Evaluate carefully. Return ONLY valid JSON:
{
  "score": <0-100>,
  "grade": "Excellent|Good|Partial|Incorrect",
  "is_correct": <true if score >= 70>,
  "feedback": "2-3 sentences of specific, personalized feedback mentioning what they got right and wrong",
  "key_concepts_missed": ["specific concept 1", "specific concept 2"],
  "improvement_tip": "one specific, actionable thing they should review or practice"
}`;

  try {
    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 500,
      temperature: 0.2,
    });
    let raw = completion.choices[0]?.message?.content || '{}';
    raw = raw.replace(/```json|```/g, '').trim();
    const evaluation = JSON.parse(raw);
    res.json(evaluation);
  } catch (err) {
    res.status(500).json({ error: 'Evaluation failed' });
  }
});

// Analyze weak topics from a set of answers
router.post('/analyze-weaknesses', async (req, res) => {
  const { results } = req.body;
  // results = [{ question, topic, score, is_correct, key_concepts_missed }]
  if (!results || results.length === 0) return res.status(400).json({ error: 'Results required' });

  const wrongAnswers = results.filter(r => !r.is_correct);
  if (wrongAnswers.length === 0) return res.json({ weakTopics: [], summary: "Perfect score! You've mastered all topics in this session." });

  const prompt = `A student just completed a practice quiz. Analyze their performance and identify specific weak areas.

WRONG ANSWERS:
${wrongAnswers.map(r => `- Topic: "${r.topic}" | Question: "${r.question}" | Concepts missed: ${(r.key_concepts_missed || []).join(', ')}`).join('\n')}

CORRECT ANSWERS (topics): ${results.filter(r => r.is_correct).map(r => r.topic).join(', ')}

Return ONLY valid JSON:
{
  "weakTopics": [
    {
      "topic": "topic name",
      "why": "1 sentence explaining specifically what the student misunderstands",
      "studyTip": "1 concrete, actionable tip to improve on this topic"
    }
  ],
  "strongTopics": ["topic1", "topic2"],
  "summary": "2-3 sentence overall assessment of the student's performance and what to focus on next",
  "priorityAction": "The single most important thing they should do before their next study session"
}`;

  try {
    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 800,
      temperature: 0.2,
    });
    let raw = completion.choices[0]?.message?.content || '{}';
    raw = raw.replace(/```json|```/g, '').trim();
    res.json(JSON.parse(raw));
  } catch (err) {
    res.status(500).json({ error: 'Analysis failed' });
  }
});

// Explanation mode - teach the concept when student gets it wrong
router.post('/explain', async (req, res) => {
  const { question, correctAnswer, studentAnswer, topic, content } = req.body;

  const prompt = `A student got this question wrong and needs the concept explained clearly.

QUESTION: ${question}
TOPIC: ${topic}
CORRECT ANSWER: ${correctAnswer}
WHAT STUDENT ANSWERED: ${studentAnswer}
${content ? `STUDY MATERIAL CONTEXT:\n${content.slice(0, 2000)}` : ''}

Teach this concept from scratch. Your response should:
1. Start by acknowledging what they got right (if anything)
2. Clearly explain WHY the correct answer is right, in simple language
3. Use an analogy or real-world example to make it memorable
4. End with a follow-up question to check understanding

Keep the total response under 200 words. Be warm and encouraging.`;

  try {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');

    const stream = await groq.chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 400,
      temperature: 0.5,
      stream: true
    });

    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content || '';
      if (text) res.write(`data: ${JSON.stringify({ text })}\n\n`);
    }
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    res.status(500).json({ error: 'Explanation failed' });
  }
});

// Generate flashcards from content
router.post('/generate-flashcards', async (req, res) => {
  const { content, count = 10 } = req.body;
  if (!content) return res.status(400).json({ error: 'Content required' });

  const prompt = `Create ${count} high-quality flashcards from this study material. Focus on key terms, concepts, definitions, formulas, and important relationships. Each card should test one clear concept.

STUDY MATERIAL:
${content.slice(0, 7000)}

Return ONLY a valid JSON array:
[{ "front": "concise question or term", "back": "clear complete answer", "topic": "topic tag" }]`;

  try {
    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 3000,
      temperature: 0.3,
    });
    let raw = completion.choices[0]?.message?.content || '[]';
    raw = raw.replace(/```json|```/g, '').trim();
    res.json({ flashcards: JSON.parse(raw) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate flashcards' });
  }
});

// AI Tutor chat
router.post('/tutor', async (req, res) => {
  const { messages, context } = req.body;

  const systemPrompt = `You are an expert AI tutor helping a student understand their study material. 
${context ? `STUDENT'S STUDY MATERIAL:\n${context.slice(0, 4000)}` : ''}

Be clear, patient, and pedagogical. When explaining:
- Break complex ideas into steps
- Use examples and analogies
- Check understanding with follow-up questions
- Keep responses focused (3-5 sentences unless a full explanation is needed)
- If asked something outside the material, say so and redirect`;

  try {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');

    const stream = await groq.chat.completions.create({
      model: MODEL,
      messages: [{ role: 'system', content: systemPrompt }, ...messages.slice(-12)],
      max_tokens: 600,
      temperature: 0.5,
      stream: true
    });

    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content || '';
      if (text) res.write(`data: ${JSON.stringify({ text })}\n\n`);
    }
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    res.status(500).json({ error: 'Tutor unavailable' });
  }
});

module.exports = router;
