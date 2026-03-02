import { useState, useRef, useEffect } from 'react';
import { API_URL } from '../lib/supabase';
import ContentInput from '../components/ContentInput';

const ALL_TYPES = [
  { id: 'short', label: 'Short Answer', icon: '✍️', desc: 'Written response questions' },
  { id: 'numerical', label: 'Numerical', icon: '🔢', desc: 'Calculation-based problems' },
  { id: 'mcq', label: 'Multiple Choice', icon: '🔘', desc: '4-option questions' },
  { id: 'truefalse', label: 'True / False', icon: '⚖️', desc: 'Statement verification' },
];

export default function QuestionEngine() {
  const [content, setContent] = useState('');
  const [enabledTypes, setEnabledTypes] = useState(['short', 'numerical']);
  const [count, setCount] = useState(5);
  const [difficulty, setDifficulty] = useState('medium');
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [answers, setAnswers] = useState({});
  const [evaluations, setEvaluations] = useState({});
  const [evalLoading, setEvalLoading] = useState({});
  const [submitted, setSubmitted] = useState({});
  const [explanations, setExplanations] = useState({});
  const [explainLoading, setExplainLoading] = useState({});
  const [analysis, setAnalysis] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [weakTopics, setWeakTopics] = useState([]);
  const [mode, setMode] = useState('setup');
  const [retryLoading, setRetryLoading] = useState(false);

  const toggleType = (id) => {
    setEnabledTypes(prev =>
      prev.includes(id)
        ? prev.length > 1 ? prev.filter(t => t !== id) : prev // always keep at least 1
        : [...prev, id]
    );
  };

  const generate = async (focusWeakTopics = false) => {
    if (!content.trim() || enabledTypes.length === 0) return;
    setLoading(true);
    setQuestions([]); setAnswers({}); setEvaluations({}); setSubmitted({});
    setExplanations({}); setAnalysis(null);
    try {
      const res = await fetch(`${API_URL}/api/ai/generate-questions`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content, enabledTypes, count, difficulty,
          topics: focusWeakTopics ? weakTopics.map(t => t.topic) : []
        })
      });
      const data = await res.json();
      setQuestions(data.questions || []);
      setMode('quiz');
    } catch { alert('Failed to generate questions'); }
    setLoading(false);
  };

  const submitAnswer = async (q) => {
    const studentAnswer = answers[q.id];
    if (!studentAnswer) return;
    setSubmitted(s => ({ ...s, [q.id]: true }));
    setEvalLoading(l => ({ ...l, [q.id]: true }));
    try {
      const res = await fetch(`${API_URL}/api/ai/evaluate-answer`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q.question, correctAnswer: q.correct_answer, studentAnswer, questionType: q.type, topic: q.topic })
      });
      const ev = await res.json();
      setEvaluations(e => ({ ...e, [q.id]: ev }));
    } catch {}
    setEvalLoading(l => ({ ...l, [q.id]: false }));
  };

  const explainConcept = async (q) => {
    setExplainLoading(l => ({ ...l, [q.id]: true }));
    setExplanations(e => ({ ...e, [q.id]: '' }));
    const res = await fetch(`${API_URL}/api/ai/explain`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: q.question, correctAnswer: q.correct_answer, studentAnswer: answers[q.id], topic: q.topic, content })
    });
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let full = '';
    setExplainLoading(l => ({ ...l, [q.id]: false }));
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      for (const line of decoder.decode(value).split('\n')) {
        if (line.startsWith('data: ')) {
          try { const d = JSON.parse(line.slice(6)); if (d.text) { full += d.text; setExplanations(e => ({ ...e, [q.id]: full })); } } catch {}
        }
      }
    }
  };

  const analyzeWeaknesses = async () => {
    setAnalysisLoading(true);
    const results = questions.map(q => ({
      question: q.question, topic: q.topic,
      score: evaluations[q.id]?.score || 0,
      is_correct: evaluations[q.id]?.is_correct || false,
      key_concepts_missed: evaluations[q.id]?.key_concepts_missed || []
    }));
    const res = await fetch(`${API_URL}/api/ai/analyze-weaknesses`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ results })
    });
    const data = await res.json();
    setAnalysis(data);
    setWeakTopics(data.weakTopics || []);
    setAnalysisLoading(false);
  };

  const answeredAll = questions.length > 0 && questions.every(q => submitted[q.id] && !evalLoading[q.id]);
  const avgScore = answeredAll ? Math.round(Object.values(evaluations).reduce((a, e) => a + (e.score || 0), 0) / questions.length) : null;
  const getScoreColor = s => s >= 80 ? 'var(--emerald)' : s >= 60 ? 'var(--amber)' : 'var(--rose)';
  const typeIcon = t => ({ mcq: '🔘', short: '✍️', truefalse: '⚖️', numerical: '🔢' }[t] || '❓');

  return (
    <div>
      <div className="flex items-center justify-between mb-20">
        <div>
          <h1 style={{ fontFamily: 'Syne', fontSize: 24, fontWeight: 700 }}>Question Engine 🧠</h1>
          <p className="text-muted">Generate practice questions · Get AI feedback on every answer</p>
        </div>
        {mode === 'quiz' && <button className="btn btn-secondary" onClick={() => setMode('setup')}>← New Session</button>}
      </div>

      {/* SETUP */}
      {mode === 'setup' && (
        <div style={{ maxWidth: 700 }}>
          <div className="card mb-16">
            <ContentInput value={content} onChange={setContent} placeholder="Paste lecture notes, textbook content, or any study material..." />
          </div>

          {/* Question type toggles */}
          <div className="card mb-16">
            <div className="flex items-center justify-between mb-12">
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Question Types</p>
              <p style={{ fontSize: 11, color: 'var(--text3)' }}>Click to enable / disable</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {ALL_TYPES.map(t => {
                const on = enabledTypes.includes(t.id);
                return (
                  <button key={t.id} onClick={() => toggleType(t.id)} style={{
                    padding: '12px 14px', borderRadius: 'var(--radius-sm)', border: '2px solid',
                    cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s', fontFamily: 'Outfit',
                    borderColor: on ? 'var(--indigo)' : 'var(--border)',
                    background: on ? 'var(--indigo-pale)' : 'var(--surface2)',
                    opacity: on ? 1 : 0.55
                  }}>
                    <div className="flex items-center gap-8 mb-3">
                      <span style={{ fontSize: 16 }}>{t.icon}</span>
                      <span style={{ fontWeight: 600, fontSize: 13, color: on ? 'var(--indigo-light)' : 'var(--text2)' }}>{t.label}</span>
                      <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: on ? 'var(--emerald)' : 'var(--text3)' }}>{on ? 'ON' : 'OFF'}</span>
                    </div>
                    <p style={{ fontSize: 11, color: 'var(--text3)', paddingLeft: 24 }}>{t.desc}</p>
                  </button>
                );
              })}
            </div>
            <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 8 }}>
              {enabledTypes.length} type{enabledTypes.length !== 1 ? 's' : ''} selected — questions will be distributed evenly
            </p>
          </div>

          {/* Count + difficulty */}
          <div className="card mb-20">
            <div className="grid-2">
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Number of Questions</p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {[3, 5, 8, 10, 15, 20].map(n => (
                    <button key={n} onClick={() => setCount(n)} style={{ padding: '7px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid', cursor: 'pointer', fontFamily: 'Outfit', fontSize: 13, fontWeight: count === n ? 600 : 400, borderColor: count === n ? 'var(--indigo)' : 'var(--border)', background: count === n ? 'var(--indigo-pale)' : 'var(--surface2)', color: count === n ? 'var(--indigo-light)' : 'var(--text2)' }}>{n}</button>
                  ))}
                </div>
              </div>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Difficulty</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  {['easy', 'medium', 'hard'].map(d => (
                    <button key={d} onClick={() => setDifficulty(d)} style={{ padding: '7px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid', cursor: 'pointer', fontFamily: 'Outfit', fontSize: 13, textTransform: 'capitalize', fontWeight: difficulty === d ? 600 : 400, borderColor: difficulty === d ? 'var(--cyan)' : 'var(--border)', background: difficulty === d ? 'rgba(34,211,238,0.1)' : 'var(--surface2)', color: difficulty === d ? 'var(--cyan)' : 'var(--text2)' }}>{d}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-10">
            <button className="btn btn-primary btn-lg" onClick={() => generate(false)} disabled={!content.trim() || loading || enabledTypes.length === 0}>
              {loading ? '⏳ Generating...' : '🧠 Generate Questions'}
            </button>
            {weakTopics.length > 0 && (
              <button className="btn btn-secondary btn-lg" onClick={() => { setRetryLoading(true); generate(true).finally(() => setRetryLoading(false)); }} disabled={retryLoading}>
                {retryLoading ? '⏳ Generating...' : `🎯 Focus Weak Topics (${weakTopics.length})`}
              </button>
            )}
          </div>
        </div>
      )}

      {/* QUIZ */}
      {mode === 'quiz' && (
        <div style={{ maxWidth: 700 }}>
          {/* Score summary */}
          {answeredAll && avgScore !== null && (
            <div className="card mb-20" style={{ background: `${getScoreColor(avgScore)}0f`, border: `1px solid ${getScoreColor(avgScore)}40`, textAlign: 'center', padding: '24px' }}>
              <div className="score-circle" style={{ background: `${getScoreColor(avgScore)}20`, color: getScoreColor(avgScore) }}>{avgScore}%</div>
              <p style={{ fontFamily: 'Syne', fontSize: 18, fontWeight: 700 }}>
                {avgScore >= 80 ? '🎉 Excellent!' : avgScore >= 60 ? '👍 Good effort' : '📚 Needs more review'}
              </p>
              <p className="text-muted mt-8">{Object.values(evaluations).filter(e => e.is_correct).length} of {questions.length} correct</p>
              {!analysis && (
                <button className="btn btn-primary btn-sm" style={{ marginTop: 14 }} onClick={analyzeWeaknesses} disabled={analysisLoading}>
                  {analysisLoading ? '⏳ Analyzing...' : '🔍 Analyze My Weak Topics'}
                </button>
              )}
            </div>
          )}

          {/* Weakness analysis */}
          {analysis && (
            <div className="card mb-20" style={{ border: '1px solid var(--border2)' }}>
              <p style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 15, marginBottom: 8 }}>📊 Performance Analysis</p>
              <p style={{ color: 'var(--text2)', fontSize: 14, lineHeight: 1.6, marginBottom: 14 }}>{analysis.summary}</p>
              {analysis.weakTopics?.length > 0 && (
                <>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--rose)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Needs Work</p>
                  {analysis.weakTopics.map((t, i) => (
                    <div key={i} className="weakness-card">
                      <p style={{ fontWeight: 600, fontSize: 13, marginBottom: 3 }}>{t.topic}</p>
                      <p style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 4 }}>{t.why}</p>
                      <p style={{ fontSize: 12, color: 'var(--amber)' }}>💡 {t.studyTip}</p>
                    </div>
                  ))}
                </>
              )}
              {analysis.strongTopics?.length > 0 && (
                <>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--emerald)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8, marginTop: 14 }}>Strong Areas</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {analysis.strongTopics.map((t, i) => <span key={i} className="badge badge-green">{t}</span>)}
                  </div>
                </>
              )}
              {analysis.priorityAction && (
                <div style={{ marginTop: 14, padding: '12px 14px', background: 'var(--surface2)', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--indigo)' }}>
                  <p style={{ fontSize: 13, color: 'var(--indigo-light)' }}>⚡ <strong>Priority:</strong> {analysis.priorityAction}</p>
                </div>
              )}
              {weakTopics.length > 0 && (
                <button className="btn btn-primary btn-sm mt-16" onClick={() => setMode('setup')}>🎯 Practice Weak Topics</button>
              )}
            </div>
          )}

          {/* Questions list */}
          {questions.map((q, i) => (
            <div key={q.id} className="card mb-16">
              <div className="flex items-center gap-8 mb-10" style={{ flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 700 }}>Q{i + 1}</span>
                <span className={`badge ${q.type === 'numerical' ? 'badge-amber' : q.type === 'short' ? 'badge-cyan' : q.type === 'truefalse' ? 'badge-violet' : 'badge-indigo'}`}>
                  {typeIcon(q.type)} {q.type}
                </span>
                {q.topic && <span className="badge badge-cyan">{q.topic}</span>}
                <span className={`badge ${q.difficulty === 'easy' ? 'badge-green' : q.difficulty === 'hard' ? 'badge-rose' : 'badge-amber'}`}>{q.difficulty}</span>
              </div>

              <p style={{ fontSize: 15, fontWeight: 500, marginBottom: 14, lineHeight: 1.55 }}>{q.question}</p>

              {/* MCQ */}
              {q.type === 'mcq' && q.options?.map((opt, oi) => {
                let cls = 'option-btn';
                if (submitted[q.id]) {
                  const isCorrect = opt === q.correct_answer || opt.startsWith(q.correct_answer?.split('.')[0]);
                  if (isCorrect) cls += ' correct';
                  else if (answers[q.id] === opt) cls += ' wrong';
                } else if (answers[q.id] === opt) cls += ' selected';
                return <button key={oi} className={cls} onClick={() => !submitted[q.id] && setAnswers(a => ({ ...a, [q.id]: opt }))} disabled={submitted[q.id]}>{opt}</button>;
              })}

              {/* True/False */}
              {q.type === 'truefalse' && (
                <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                  {['True', 'False'].map(opt => {
                    let bg = 'var(--surface2)', border = 'var(--border)', color = 'var(--text)';
                    if (submitted[q.id]) {
                      if (opt === q.correct_answer) { bg = 'rgba(16,185,129,0.1)'; border = 'var(--emerald)'; color = 'var(--emerald)'; }
                      else if (answers[q.id] === opt) { bg = 'rgba(244,63,94,0.1)'; border = 'var(--rose)'; color = 'var(--rose)'; }
                    } else if (answers[q.id] === opt) { bg = 'var(--indigo-pale)'; border = 'var(--indigo)'; color = 'var(--indigo-light)'; }
                    return <button key={opt} onClick={() => !submitted[q.id] && setAnswers(a => ({ ...a, [q.id]: opt }))} disabled={submitted[q.id]} style={{ flex: 1, padding: '11px', borderRadius: 'var(--radius-sm)', border: `1px solid ${border}`, background: bg, color, cursor: 'pointer', fontFamily: 'Outfit', fontWeight: 600, fontSize: 14, transition: 'all 0.15s' }}>{opt}</button>;
                  })}
                </div>
              )}

              {/* Short answer */}
              {q.type === 'short' && (
                <textarea className="content-area" style={{ minHeight: 80, marginBottom: 12 }} placeholder="Write your answer..." value={answers[q.id] || ''} onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))} disabled={submitted[q.id]} />
              )}

              {/* Numerical */}
              {q.type === 'numerical' && (
                <div>
                  <div style={{ padding: '9px 13px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 'var(--radius-sm)', marginBottom: 10 }}>
                    <p style={{ fontSize: 12, color: 'var(--amber)' }}>🔢 Show your working — write formula, substitution, and final answer with units</p>
                  </div>
                  <textarea className="content-area" style={{ minHeight: 110, marginBottom: 12 }} placeholder="Formula: &#10;Substitution: &#10;Answer: " value={answers[q.id] || ''} onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))} disabled={submitted[q.id]} />
                </div>
              )}

              {!submitted[q.id] && (
                <button className="btn btn-primary btn-sm" onClick={() => submitAnswer(q)} disabled={!answers[q.id] || evalLoading[q.id]}>
                  {evalLoading[q.id] ? 'Evaluating...' : 'Submit Answer'}
                </button>
              )}

              {/* Evaluation result */}
              {evaluations[q.id] && (
                <div style={{ marginTop: 14, padding: 14, borderRadius: 'var(--radius-sm)', background: evaluations[q.id].is_correct ? 'rgba(16,185,129,0.07)' : 'rgba(244,63,94,0.07)', border: `1px solid ${evaluations[q.id].is_correct ? 'var(--emerald)' : 'var(--rose)'}30` }}>
                  <div className="flex items-center gap-8 mb-8">
                    <span style={{ fontSize: 16 }}>{evaluations[q.id].is_correct ? '✅' : evaluations[q.id].score >= 40 ? '🟡' : '❌'}</span>
                    <span style={{ fontWeight: 600, color: evaluations[q.id].is_correct ? 'var(--emerald)' : 'var(--rose)', fontSize: 13 }}>
                      {evaluations[q.id].grade} — {evaluations[q.id].score}/100
                    </span>
                  </div>
                  <p style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 8 }}>{evaluations[q.id].feedback}</p>
                  {evaluations[q.id].improvement_tip && (
                    <p style={{ fontSize: 12, color: 'var(--cyan)', fontStyle: 'italic' }}>💡 {evaluations[q.id].improvement_tip}</p>
                  )}
                  <div style={{ marginTop: 10, padding: '10px 12px', background: 'var(--surface2)', borderRadius: 6 }}>
                    <p style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 3, fontWeight: 600 }}>Correct Answer:</p>
                    <p style={{ fontSize: 13, color: 'var(--emerald)', whiteSpace: 'pre-wrap' }}>{q.correct_answer}</p>
                  </div>
                  {!evaluations[q.id].is_correct && (
                    <div style={{ marginTop: 10 }}>
                      {!explanations[q.id] ? (
                        <button className="btn btn-secondary btn-sm" onClick={() => explainConcept(q)} disabled={explainLoading[q.id]}>
                          {explainLoading[q.id] ? '⏳ Explaining...' : '📖 Explain this to me'}
                        </button>
                      ) : (
                        <div className="explanation-box">
                          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--cyan)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>📖 Explanation</p>
                          <p style={{ fontSize: 14, lineHeight: 1.7 }}>{explanations[q.id]}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {answeredAll && !analysis && (
            <div className="flex gap-8">
              <button className="btn btn-primary" onClick={analyzeWeaknesses} disabled={analysisLoading}>{analysisLoading ? '⏳ Analyzing...' : '🔍 Analyze Weak Topics'}</button>
              <button className="btn btn-secondary" onClick={() => { setMode('setup'); setQuestions([]); }}>New Session</button>
            </div>
          )}
          {analysis && (
            <div className="flex gap-8 mt-8">
              <button className="btn btn-secondary" onClick={() => { setMode('setup'); setQuestions([]); }}>New Session</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
