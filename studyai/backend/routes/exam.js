const express = require('express');
const router = express.Router();
const Groq = require('groq-sdk');
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = 'llama-3.3-70b-versatile';

// Generate exam - with syllabus weighting, modules, numerical questions, tricky questions
router.post('/generate', async (req, res) => {
  const { content, syllabus, questionCount, duration, difficulty, modules, enabledTypes } = req.body;

  const syllabusSection = syllabus
    ? `\nSYLLABUS / WEIGHTAGE GUIDE:\n${syllabus.slice(0, 3000)}\nUse this syllabus to determine how many questions each module/unit should get. Higher weightage modules get more questions.`
    : '';

  const modulesSection = modules && modules.length > 0
    ? `\nFOCUS MODULES: Generate questions specifically covering these modules: ${modules.join(', ')}`
    : '';

  const activeTypes = (enabledTypes && enabledTypes.length > 0)
    ? enabledTypes
    : ['short', 'numerical', 'mcq', 'truefalse'];

  const typeLabels = { mcq: 'Multiple Choice (4 options A/B/C/D, plausible distractors)', short: 'Short Answer (require specific technical knowledge)', truefalse: 'True/False (non-obvious, test misconceptions)', numerical: 'Numerical/Calculation (real numbers, formulas, units required)' };

  const perType = Math.floor(questionCount / activeTypes.length);
  const remainder = questionCount % activeTypes.length;
  const distribution = activeTypes.map((t, i) => `${perType + (i < remainder ? 1 : 0)} × ${t}`).join(', ');

  const questionMix = `
QUESTION TYPE DISTRIBUTION (${questionCount} total): ${distribution}
ALLOWED TYPES:
${activeTypes.map(t => '- ' + typeLabels[t]).join('\n')}

CRITICAL — QUESTION QUALITY RULES:
1. MCQ distractors must be plausible — common mistakes, off-by-one errors, related but wrong concepts
2. True/False must NOT be trivially obvious — test common misconceptions
3. Short answers must require specific facts, not general waffle
4. Numerical questions MUST have actual numbers to calculate, with units where applicable
5. Every question should make a student think twice — no giveaways
6. Difficulty: ${difficulty}. For 'hard', add multi-step reasoning and edge cases.`;

  const prompt = `You are a university professor creating a rigorous examination paper.

STUDY MATERIAL:
${content.slice(0, 7000)}
${syllabusSection}
${modulesSection}

${questionMix}

Return ONLY a valid JSON array with no markdown:
[
  {
    "id": 1,
    "type": "mcq" | "short" | "truefalse" | "numerical",
    "question": "question text (for numerical, include all given values and what to find)",
    "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
    "correct_answer": "full correct answer with working for numerical",
    "explanation": "detailed explanation of why this is correct and why distractors are wrong",
    "difficulty": "easy|medium|hard",
    "topic": "specific concept being tested",
    "module": "module/unit name if applicable",
    "marks": 1-4,
    "hint": "optional hint for numerical questions only"
  }
]

For numerical questions: marks should be 3-4. For short answer: 2-3. For MCQ/TF: 1-2.`;

  try {
    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 6000,
      temperature: 0.4,
    });
    let raw = completion.choices[0]?.message?.content || '[]';
    raw = raw.replace(/```json|```/g, '').trim();
    const questions = JSON.parse(raw);
    const totalMarks = questions.reduce((a, q) => a + (q.marks || 1), 0);
    res.json({ questions, totalMarks, duration: duration || 60, generatedAt: new Date().toISOString() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate exam' });
  }
});

// Grade exam
router.post('/grade', async (req, res) => {
  const { questions, answers } = req.body;

  const prompt = `Grade this completed university exam. Be strict but fair.

EXAM ANSWERS:
${questions.map(q => `
Q${q.id} [${q.type}] [${q.topic}] [${q.marks} marks]: ${q.question}
Correct: ${q.correct_answer}
Student answered: ${answers[q.id] || '(no answer)'}
`).join('\n')}

For numerical questions: award partial marks if the method is correct but arithmetic is wrong.
For short answers: award partial marks for partially correct responses.

Return ONLY valid JSON:
{
  "results": [
    {
      "id": <question id>,
      "marks_awarded": <number>,
      "max_marks": <number>,
      "is_correct": <boolean — true if marks_awarded >= max_marks * 0.7>,
      "feedback": "specific feedback mentioning what was right/wrong",
      "topic": "topic name"
    }
  ],
  "total_marks": <sum>,
  "max_marks": <sum of all max_marks>,
  "percentage": <0-100>,
  "grade": "A+|A|B|C|D|F",
  "overall_feedback": "2-3 sentence honest assessment",
  "topic_breakdown": [
    { "topic": "topic", "correct": <bool>, "marks": <marks awarded> }
  ]
}`;

  try {
    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2500,
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
