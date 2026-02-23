const express = require('express');
const router = express.Router();
const Groq = require('groq-sdk');
const { createClient } = require('@supabase/supabase-js');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const MODEL = 'llama-3.3-70b-versatile';

// Generate a full exam from content
router.post('/generate', async (req, res) => {
  const { content, duration, questionCount, difficulty } = req.body;

  const prompt = `You are creating a realistic exam paper for a student. This should feel like an actual test.

STUDY MATERIAL:
${content.slice(0, 7000)}

Create a ${questionCount || 10}-question exam at ${difficulty || 'medium'} difficulty.
Mix question types naturally like a real exam:
- ~40% Multiple choice (4 options A/B/C/D)
- ~40% Short answer  
- ~20% True/False

Make questions that genuinely test understanding, not just memorization. Include a range of topics from the material.

Return ONLY a valid JSON array:
[
  {
    "id": 1,
    "type": "mcq" | "short" | "truefalse",
    "question": "question text",
    "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
    "correct_answer": "correct answer",
    "explanation": "why this is correct",
    "topic": "concept being tested",
    "marks": <1 for tf/mcq, 2-3 for short>,
    "difficulty": "easy|medium|hard"
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

    const totalMarks = questions.reduce((a, q) => a + (q.marks || 1), 0);

    res.json({
      questions,
      totalMarks,
      duration: duration || Math.max(15, questions.length * 2),
      generatedAt: new Date().toISOString()
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate exam' });
  }
});

// Grade a completed exam
router.post('/grade', async (req, res) => {
  const { questions, answers } = req.body;
  // answers = { questionId: "student answer" }

  const prompt = `Grade this completed exam. Evaluate each answer carefully.

EXAM ANSWERS TO GRADE:
${questions.map(q => `
Q${q.id} [${q.topic}] [${q.marks} marks]: ${q.question}
Correct: ${q.correct_answer}
Student answered: ${answers[q.id] || '(no answer)'}
`).join('\n')}

Grade each question. Return ONLY valid JSON:
{
  "results": [
    {
      "id": <question id>,
      "marks_awarded": <number>,
      "max_marks": <number>,
      "is_correct": <boolean>,
      "feedback": "brief specific feedback on this answer",
      "topic": "topic name"
    }
  ],
  "total_marks": <sum of marks_awarded>,
  "max_marks": <sum of all max_marks>,
  "percentage": <0-100>,
  "grade": "A|B|C|D|F",
  "overall_feedback": "2-3 sentences summarizing exam performance",
  "topic_breakdown": [
    { "topic": "topic name", "correct": <bool>, "marks": <marks awarded> }
  ]
}`;

  try {
    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2000,
      temperature: 0.1,
    });
    let raw = completion.choices[0]?.message?.content || '{}';
    raw = raw.replace(/```json|```/g, '').trim();
    res.json(JSON.parse(raw));
  } catch (err) {
    res.status(500).json({ error: 'Grading failed' });
  }
});

module.exports = router;
