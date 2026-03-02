const express = require('express');
const router = express.Router();
const Groq = require('groq-sdk');
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = 'llama-3.3-70b-versatile';

// Fixed exam format:
// Section A: 5 questions (attempt any 4), 6 marks each → max 24 marks
// Section B: 3 questions (attempt any 2), 10 marks each → max 20 marks
// Section C: 1 compulsory question, 16 marks → max 16 marks
// Total max = 60 marks. Pass mark = 33% of 60 = 19.8 → round to 20
// Student answers: 4 + 2 + 1 = 7 questions

router.post('/generate', async (req, res) => {
  const { content, syllabus, duration, modules } = req.body;

  const syllabusSection = syllabus
    ? `\nSYLLABUS:\n${syllabus.slice(0, 3000)}`
    : '';

  const modulesSection = modules && modules.length > 0
    ? `\nFOCUS ON THESE MODULES: ${modules.join(', ')}`
    : '';

  const prompt = `You are a strict university professor setting a challenging semester examination paper.

STUDY MATERIAL:
${content.slice(0, 8000)}
${syllabusSection}
${modulesSection}

EXAM STRUCTURE — follow EXACTLY:
- SECTION A: Generate 5 questions of 6 marks each. Student will attempt ANY 4.
- SECTION B: Generate 3 questions of 10 marks each. Student will attempt ANY 2.
- SECTION C: Generate 1 compulsory question of 16 marks. All students must answer this.

QUESTION DIFFICULTY MANDATE — THIS IS CRITICAL:
- Do NOT ask direct definition or recall questions
- Questions must require ANALYSIS, APPLICATION, or EVALUATION (Bloom's higher order)
- Section A: Applied short-answer — ask students to apply concepts to scenarios, explain WHY, compare, analyse tradeoffs
- Section B: Extended problems — multi-part, require connecting multiple concepts, case-based or problem-solving
- Section C: Complex integrative question — multi-part (a, b, c sub-parts), tests deep understanding across topics, numerical OR extended analytical problem
- Every question should make even a prepared student think hard — no easy wins
- Use statements that are partially true to test precision of understanding
- For numerical questions: include realistic multi-step calculations with given data
- Avoid: "Define X", "List 3 advantages", "What is X?" — these are too simple

QUESTION TYPES ALLOWED: short_answer, numerical, case_study
(Do NOT generate MCQ or True/False — this is a written university exam)

Return ONLY a valid JSON object, no markdown:
{
  "sections": [
    {
      "section": "A",
      "instruction": "Attempt any FOUR questions. Each question carries 6 marks.",
      "marks_each": 6,
      "total_questions": 5,
      "attempt": 4,
      "questions": [
        {
          "id": "A1",
          "type": "short_answer",
          "question": "full question text — include all context needed",
          "sub_parts": null,
          "marks": 6,
          "correct_answer": "model answer with key points that must be covered",
          "marking_scheme": "e.g. 2 marks for X, 2 marks for Y, 2 marks for Z",
          "topic": "concept tested",
          "difficulty": "hard"
        }
      ]
    },
    {
      "section": "B",
      "instruction": "Attempt any TWO questions. Each question carries 10 marks.",
      "marks_each": 10,
      "total_questions": 3,
      "attempt": 2,
      "questions": [
        {
          "id": "B1",
          "type": "case_study",
          "question": "scenario/problem introduction",
          "sub_parts": [
            { "label": "(a)", "text": "sub-question a", "marks": 4 },
            { "label": "(b)", "text": "sub-question b", "marks": 6 }
          ],
          "marks": 10,
          "correct_answer": "model answer covering all sub-parts",
          "marking_scheme": "marks breakdown per sub-part",
          "topic": "concept tested",
          "difficulty": "hard"
        }
      ]
    },
    {
      "section": "C",
      "instruction": "Compulsory Question. Answer ALL parts. This question carries 16 marks.",
      "marks_each": 16,
      "total_questions": 1,
      "attempt": 1,
      "questions": [
        {
          "id": "C1",
          "type": "numerical",
          "question": "main question introduction with full context/given data",
          "sub_parts": [
            { "label": "(i)", "text": "sub-question i", "marks": 4 },
            { "label": "(ii)", "text": "sub-question ii", "marks": 6 },
            { "label": "(iii)", "text": "sub-question iii", "marks": 6 }
          ],
          "marks": 16,
          "correct_answer": "full working model answer",
          "marking_scheme": "marks per sub-part",
          "topic": "concept tested",
          "difficulty": "hard"
        }
      ]
    }
  ],
  "total_max_marks": 60,
  "pass_marks": 20,
  "pass_percentage": 33,
  "duration_minutes": ${duration || 180}
}`;

  try {
    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 7000,
      temperature: 0.5,
    });
    let raw = completion.choices[0]?.message?.content || '{}';
    raw = raw.replace(/```json|```/g, '').trim();
    const examData = JSON.parse(raw);

    // Flatten questions for compatibility
    const allQuestions = examData.sections.flatMap(s => s.questions);
    res.json({ ...examData, questions: allQuestions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate exam' });
  }
});

// Grade - sections-aware, 33% pass mark
router.post('/grade', async (req, res) => {
  const { questions, answers, sections } = req.body;

  const gradingPrompt = `You are a strict but fair university examiner grading a semester exam.
Pass mark: 33% of total max marks.

IMPORTANT GRADING RULES:
- Short answer (6 marks): Award marks based on the marking scheme. Partial marks for partially correct answers. Require specific accurate content — vague general answers get 0-1 mark only.
- Case study/extended (10 marks): Grade each sub-part separately. Multi-part answers must address all parts.
- Numerical (16 marks): Award method marks even if final answer wrong. Check units and working shown.
- Be strict: half-knowledge should not get full marks. Students must demonstrate understanding, not just recollection.

QUESTIONS AND STUDENT ANSWERS:
${questions.map(q => `
[${q.id}] [${q.type}] [${q.marks} marks] TOPIC: ${q.topic}
QUESTION: ${q.question}
${q.sub_parts ? 'SUB-PARTS:\n' + q.sub_parts.map(sp => `  ${sp.label} (${sp.marks}m): ${sp.text}`).join('\n') : ''}
MODEL ANSWER: ${q.correct_answer}
MARKING SCHEME: ${q.marking_scheme || 'Award marks for accuracy and completeness'}
STUDENT ANSWER: ${answers[q.id] || '(not attempted)'}
`).join('\n---\n')}

Return ONLY valid JSON:
{
  "results": [
    {
      "id": "A1",
      "marks_awarded": <number>,
      "max_marks": <number>,
      "percentage": <marks_awarded/max_marks*100>,
      "is_correct": <true if marks_awarded >= max_marks * 0.5>,
      "feedback": "specific feedback — what was good, what was missing, what key points were needed",
      "sub_part_marks": {"(a)": 3, "(b)": 5} 
    }
  ],
  "section_scores": {
    "A": { "marks_awarded": <number>, "max_marks": 24, "attempted": <count> },
    "B": { "marks_awarded": <number>, "max_marks": 20, "attempted": <count> },
    "C": { "marks_awarded": <number>, "max_marks": 16, "attempted": <count> }
  },
  "total_marks": <sum of all marks_awarded>,
  "max_marks": 60,
  "percentage": <total_marks/60*100 rounded to 1dp>,
  "pass_mark": 20,
  "passed": <true if total_marks >= 20>,
  "grade": "O (Outstanding)|A+ (Excellent)|A (Very Good)|B+ (Good)|B (Above Average)|C (Average)|P (Pass)|F (Fail)",
  "overall_feedback": "2-3 honest sentences on overall performance and key areas to improve",
  "topic_breakdown": [
    { "topic": "topic name", "marks": <awarded>, "max": <possible> }
  ]
}`;

  try {
    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: gradingPrompt }],
      max_tokens: 3500,
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
