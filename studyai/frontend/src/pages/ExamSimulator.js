import { useState, useEffect, useRef } from 'react';
import { API_URL } from '../lib/supabase';
import ContentInput from '../components/ContentInput';

export default function ExamSimulator() {
  const [content, setContent] = useState('');
  const [questionCount, setQuestionCount] = useState(10);
  const [duration, setDuration] = useState(20);
  const [difficulty, setDifficulty] = useState('medium');
  const [exam, setExam] = useState(null);
  const [answers, setAnswers] = useState({});
  const [mode, setMode] = useState('setup'); // setup | exam | grading | results
  const [timeLeft, setTimeLeft] = useState(0);
  const [grading, setGrading] = useState(null);
  const [currentQ, setCurrentQ] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    if (mode !== 'exam') return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timerRef.current); submitExam(); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [mode]);

  const generateExam = async () => {
    if (!content.trim()) return;
    setMode('grading');
    setGrading(null);
    try {
      const res = await fetch(`${API_URL}/api/exam/generate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, questionCount, duration, difficulty })
      });
      const data = await res.json();
      setExam(data);
      setAnswers({});
      setCurrentQ(0);
      setTimeLeft(data.duration * 60);
      setMode('exam');
    } catch { alert('Failed to generate exam'); setMode('setup'); }
  };

  const submitExam = async () => {
    clearInterval(timerRef.current);
    setMode('grading');
    try {
      const res = await fetch(`${API_URL}/api/exam/grade`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions: exam.questions, answers })
      });
      const data = await res.json();
      setGrading(data);
      setMode('results');
    } catch { alert('Grading failed'); setMode('exam'); }
  };

  const formatTime = (s) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
  const timerClass = timeLeft < 120 ? 'exam-timer danger' : timeLeft < 300 ? 'exam-timer warning' : 'exam-timer';
  const getGradeColor = g => ({ A: 'var(--emerald)', B: 'var(--cyan)', C: 'var(--amber)', D: 'var(--amber)', F: 'var(--rose)' }[g] || 'var(--text2)');

  return (
    <div>
      <div className="page-header">
        <h1>Exam Simulator 📝</h1>
        <p>A full timed mock exam — no feedback until you submit, just like the real thing</p>
      </div>

      {/* SETUP */}
      {mode === 'setup' && (
        <div style={{ maxWidth: 700 }}>
          <div className="card mb-16">
            <ContentInput value={content} onChange={setContent} placeholder="Paste the study material you want to be examined on..." />
          </div>
          <div className="card mb-20">
            <div className="grid-3">
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Questions</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {[5, 10, 15, 20].map(n => (
                    <button key={n} onClick={() => { setQuestionCount(n); setDuration(Math.max(10, n * 2)); }} style={{ padding: '8px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid', cursor: 'pointer', fontFamily: 'Outfit', fontSize: 13, textAlign: 'left', borderColor: questionCount === n ? 'var(--indigo)' : 'var(--border)', background: questionCount === n ? 'var(--indigo-pale)' : 'var(--surface2)', color: questionCount === n ? 'var(--indigo-light)' : 'var(--text2)' }}>
                      {n} questions
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Duration</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {[10, 15, 20, 30].map(n => (
                    <button key={n} onClick={() => setDuration(n)} style={{ padding: '8px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid', cursor: 'pointer', fontFamily: 'Outfit', fontSize: 13, textAlign: 'left', borderColor: duration === n ? 'var(--indigo)' : 'var(--border)', background: duration === n ? 'var(--indigo-pale)' : 'var(--surface2)', color: duration === n ? 'var(--indigo-light)' : 'var(--text2)' }}>
                      {n} minutes
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Difficulty</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {['easy', 'medium', 'hard'].map(d => (
                    <button key={d} onClick={() => setDifficulty(d)} style={{ padding: '8px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid', cursor: 'pointer', fontFamily: 'Outfit', fontSize: 13, textAlign: 'left', textTransform: 'capitalize', borderColor: difficulty === d ? 'var(--cyan)' : 'var(--border)', background: difficulty === d ? 'rgba(34,211,238,0.1)' : 'var(--surface2)', color: difficulty === d ? 'var(--cyan)' : 'var(--text2)' }}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="card mb-20" style={{ background: 'var(--surface2)', border: '1px solid var(--border2)', padding: '14px 16px' }}>
            <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>
              ⚠️ <strong style={{ color: 'var(--text)' }}>Exam conditions:</strong> Once you start, you cannot see correct answers until you submit. The timer cannot be paused. Questions are mixed type just like a real exam.
            </p>
          </div>
          <button className="btn btn-primary btn-lg" onClick={generateExam} disabled={!content.trim() || mode === 'grading'}>
            {mode === 'grading' ? '⏳ Generating exam...' : '📝 Start Exam'}
          </button>
        </div>
      )}

      {/* GENERATING */}
      {mode === 'grading' && !grading && (
        <div className="card text-center" style={{ maxWidth: 400, margin: '60px auto', padding: '48px' }}>
          <div className="spinner" style={{ margin: '0 auto 20px' }} />
          <p style={{ fontFamily: 'Syne', fontSize: 16, marginBottom: 6 }}>Generating your exam...</p>
          <p className="text-muted">This takes 15-20 seconds</p>
        </div>
      )}

      {/* EXAM MODE */}
      {mode === 'exam' && exam && (
        <div style={{ maxWidth: 680 }}>
          {/* Header */}
          <div className="flex items-center justify-between mb-20" style={{ padding: '14px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', position: 'sticky', top: 0, zIndex: 10 }}>
            <div>
              <span style={{ fontSize: 12, color: 'var(--text2)' }}>Question {currentQ + 1} of {exam.questions.length}</span>
              <div className="progress-bar mt-8" style={{ width: 160 }}>
                <div className="progress-fill" style={{ width: `${((currentQ + 1) / exam.questions.length) * 100}%` }} />
              </div>
            </div>
            <div className={timerClass}>{formatTime(timeLeft)}</div>
            <div className="flex gap-8">
              <span style={{ fontSize: 12, color: 'var(--text2)' }}>{Object.keys(answers).length}/{exam.questions.length} answered</span>
              <button className="btn btn-primary btn-sm" onClick={submitExam}>Submit Exam</button>
            </div>
          </div>

          {/* Question navigation */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
            {exam.questions.map((q, i) => (
              <button key={i} onClick={() => setCurrentQ(i)} style={{ width: 32, height: 32, borderRadius: 6, border: '1px solid', cursor: 'pointer', fontFamily: 'Outfit', fontSize: 12, fontWeight: 600, borderColor: answers[q.id] ? 'var(--emerald)' : i === currentQ ? 'var(--indigo)' : 'var(--border)', background: answers[q.id] ? 'rgba(16,185,129,0.15)' : i === currentQ ? 'var(--indigo-pale)' : 'var(--surface2)', color: answers[q.id] ? 'var(--emerald)' : i === currentQ ? 'var(--indigo-light)' : 'var(--text3)' }}>
                {i + 1}
              </button>
            ))}
          </div>

          {/* Current question */}
          {(() => {
            const q = exam.questions[currentQ];
            return (
              <div className="card mb-16">
                <div className="flex items-center gap-8 mb-12">
                  <span className="badge badge-indigo">{q.type}</span>
                  <span className="badge badge-amber">{q.marks} mark{q.marks > 1 ? 's' : ''}</span>
                  {q.topic && <span className="badge badge-cyan">{q.topic}</span>}
                </div>
                <p style={{ fontSize: 15, fontWeight: 500, marginBottom: 16, lineHeight: 1.55 }}>{q.question}</p>

                {q.type === 'mcq' && q.options?.map((opt, oi) => (
                  <button key={oi} className={`option-btn ${answers[q.id] === opt ? 'selected' : ''}`} onClick={() => setAnswers(a => ({ ...a, [q.id]: opt }))}>{opt}</button>
                ))}

                {q.type === 'truefalse' && (
                  <div style={{ display: 'flex', gap: 10 }}>
                    {['True', 'False'].map(opt => (
                      <button key={opt} onClick={() => setAnswers(a => ({ ...a, [q.id]: opt }))} style={{ flex: 1, padding: '12px', borderRadius: 'var(--radius-sm)', border: `1px solid ${answers[q.id] === opt ? 'var(--indigo)' : 'var(--border)'}`, background: answers[q.id] === opt ? 'var(--indigo-pale)' : 'var(--surface2)', color: answers[q.id] === opt ? 'var(--indigo-light)' : 'var(--text)', cursor: 'pointer', fontFamily: 'Outfit', fontWeight: 500 }}>{opt}</button>
                    ))}
                  </div>
                )}

                {q.type === 'short' && (
                  <textarea className="content-area" style={{ minHeight: 90 }} placeholder="Write your answer here..." value={answers[q.id] || ''} onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))} />
                )}

                <div className="flex justify-between mt-16">
                  <button className="btn btn-secondary btn-sm" onClick={() => setCurrentQ(i => Math.max(0, i - 1))} disabled={currentQ === 0}>← Previous</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => setCurrentQ(i => Math.min(exam.questions.length - 1, i + 1))} disabled={currentQ === exam.questions.length - 1}>Next →</button>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* RESULTS */}
      {mode === 'results' && grading && (
        <div style={{ maxWidth: 700 }}>
          {/* Score header */}
          <div className="card mb-20" style={{ textAlign: 'center', padding: '32px', background: `${getGradeColor(grading.grade)}0d`, border: `1px solid ${getGradeColor(grading.grade)}40` }}>
            <div className="score-circle" style={{ background: `${getGradeColor(grading.grade)}20`, color: getGradeColor(grading.grade) }}>
              {grading.grade}
            </div>
            <p style={{ fontFamily: 'Syne', fontSize: 22, fontWeight: 700, marginBottom: 6 }}>
              {grading.total_marks} / {grading.max_marks} marks
            </p>
            <p style={{ fontFamily: 'Syne', fontSize: 36, fontWeight: 800, color: getGradeColor(grading.grade) }}>{grading.percentage}%</p>
            <p style={{ color: 'var(--text2)', marginTop: 10, fontSize: 14, lineHeight: 1.6 }}>{grading.overall_feedback}</p>
          </div>

          {/* Topic breakdown */}
          {grading.topic_breakdown?.length > 0 && (
            <div className="card mb-20">
              <p style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 15, marginBottom: 14 }}>Topic Breakdown</p>
              {Array.from(new Set(grading.topic_breakdown.map(t => t.topic))).map(topic => {
                const topicResults = grading.topic_breakdown.filter(t => t.topic === topic);
                const topicScore = topicResults.reduce((a, t) => a + t.marks, 0);
                const topicMax = grading.results?.filter(r => r.id && exam.questions.find(q => q.id === r.id)?.topic === topic).reduce((a, r) => a + r.max_marks, 0) || topicResults.length;
                const allCorrect = topicResults.every(t => t.correct);
                return (
                  <div key={topic} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                    <span style={{ fontSize: 14 }}>{allCorrect ? '✅' : '❌'}</span>
                    <span style={{ fontSize: 14, flex: 1 }}>{topic}</span>
                    <span className={`badge ${allCorrect ? 'badge-green' : 'badge-rose'}`}>{topicScore} pts</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Per-question results */}
          <div className="card mb-20">
            <p style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 15, marginBottom: 14 }}>Question Review</p>
            {grading.results?.map((r, i) => {
              const q = exam.questions.find(q => q.id === r.id) || exam.questions[i];
              return (
                <div key={i} style={{ padding: '12px', borderRadius: 'var(--radius-sm)', background: 'var(--surface2)', marginBottom: 8 }}>
                  <div className="flex items-center gap-8 mb-6">
                    <span>{r.is_correct ? '✅' : '❌'}</span>
                    <span style={{ fontSize: 13, fontWeight: 500, flex: 1 }}>Q{i + 1}: {q?.question?.slice(0, 70)}...</span>
                    <span style={{ fontSize: 12, color: r.is_correct ? 'var(--emerald)' : 'var(--rose)', fontWeight: 600 }}>{r.marks_awarded}/{r.max_marks}</span>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text2)', marginLeft: 24 }}>{r.feedback}</p>
                  {!r.is_correct && q && (
                    <p style={{ fontSize: 12, color: 'var(--emerald)', marginLeft: 24, marginTop: 4 }}>✓ {q.correct_answer}</p>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex gap-10">
            <button className="btn btn-primary" onClick={() => { setMode('setup'); setExam(null); setGrading(null); }}>Take Another Exam</button>
            <button className="btn btn-secondary" onClick={() => { setAnswers({}); setCurrentQ(0); setTimeLeft(exam.duration * 60); setMode('exam'); }}>Retry Same Exam</button>
          </div>
        </div>
      )}
    </div>
  );
}
