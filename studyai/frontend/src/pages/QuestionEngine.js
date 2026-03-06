import { useState } from 'react';
import { API_URL } from '../lib/supabase';
import ContentInput from '../components/ContentInput';

const TYPES = [
  { id: 'short',      label: 'Short Answer',   desc: 'Written response questions',   color: 'var(--orange)',  icon: <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M4 6h12M4 10h8M4 14h5"/></svg> },
  { id: 'numerical',  label: 'Numerical',       desc: 'Calculation-based problems',   color: 'var(--cyan)',    icon: <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M5 5h4M7 3v4M11 5h4M13 3v4M5 15h4M11 13l4 4M15 13l-4 4"/></svg> },
  { id: 'mcq',        label: 'Multiple Choice', desc: '4-option questions',           color: 'var(--lime)',    icon: <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><circle cx="10" cy="10" r="7"/><circle cx="10" cy="10" r="3"/></svg> },
  { id: 'truefalse',  label: 'True / False',    desc: 'Statement verification',       color: 'var(--violet)', icon: <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M4 10l4 4 8-8"/></svg> },
];

const TYPE_CLASS = { short: '', numerical: 'on-cyan', mcq: 'on-lime', truefalse: 'on-violet' };
const COUNTS = [3, 5, 8, 10, 15, 20];
const DIFFICULTIES = [
  { id: 'easy', label: 'Easy', cls: 'active-lime' },
  { id: 'medium', label: 'Medium', cls: 'active-cyan' },
  { id: 'hard', label: 'Hard', cls: 'active-orange' },
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

  const toggleType = id => setEnabledTypes(p => p.includes(id) ? (p.length > 1 ? p.filter(t => t !== id) : p) : [...p, id]);

  const generate = async (focusWeak = false) => {
    if (!content.trim()) return;
    setLoading(true); setQuestions([]); setAnswers({}); setEvaluations({}); setSubmitted({}); setExplanations({}); setAnalysis(null);
    try {
      const res = await fetch(`${API_URL}/api/ai/generate-questions`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, enabledTypes, count, difficulty, topics: focusWeak ? weakTopics.map(t => t.topic) : [] })
      });
      const data = await res.json();
      setQuestions(data.questions || []); setMode('quiz');
    } catch { alert('Failed to generate questions'); }
    setLoading(false);
  };

  const submitAnswer = async (q) => {
    if (!answers[q.id]) return;
    setSubmitted(s => ({ ...s, [q.id]: true }));
    setEvalLoading(l => ({ ...l, [q.id]: true }));
    try {
      const res = await fetch(`${API_URL}/api/ai/evaluate-answer`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q.question, correctAnswer: q.correct_answer, studentAnswer: answers[q.id], questionType: q.type, topic: q.topic })
      });
      setEvaluations(e => ({ ...e, [q.id]: await res.json() }));
    } catch {}
    setEvalLoading(l => ({ ...l, [q.id]: false }));
  };

  const explainConcept = async (q) => {
    setExplainLoading(l => ({ ...l, [q.id]: true })); setExplanations(e => ({ ...e, [q.id]: '' }));
    const res = await fetch(`${API_URL}/api/ai/explain`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: q.question, correctAnswer: q.correct_answer, studentAnswer: answers[q.id], topic: q.topic, content })
    });
    const reader = res.body.getReader(); const decoder = new TextDecoder(); let full = '';
    setExplainLoading(l => ({ ...l, [q.id]: false }));
    while (true) {
      const { value, done } = await reader.read(); if (done) break;
      for (const line of decoder.decode(value).split('\n')) {
        if (line.startsWith('data: ')) { try { const d = JSON.parse(line.slice(6)); if (d.text) { full += d.text; setExplanations(e => ({ ...e, [q.id]: full })); } } catch {} }
      }
    }
  };

  const analyzeWeaknesses = async () => {
    setAnalysisLoading(true);
    const results = questions.map(q => ({ question: q.question, topic: q.topic, score: evaluations[q.id]?.score || 0, is_correct: evaluations[q.id]?.is_correct || false, key_concepts_missed: evaluations[q.id]?.key_concepts_missed || [] }));
    const res = await fetch(`${API_URL}/api/ai/analyze-weaknesses`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ results }) });
    const data = await res.json(); setAnalysis(data); setWeakTopics(data.weakTopics || []); setAnalysisLoading(false);
  };

  const answeredAll = questions.length > 0 && questions.every(q => submitted[q.id] && !evalLoading[q.id]);
  const avgScore = answeredAll ? Math.round(Object.values(evaluations).reduce((a, e) => a + (e.score || 0), 0) / questions.length) : null;

  return (
    <div>
      {/* HEADER */}
      <div style={{ padding: '24px 40px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 0 }}>
        <div className="page-hdr" style={{ marginBottom: 0, borderBottom: 'none', paddingBottom: 0 }}>
          <h1>Question Engine</h1>
          <p>Generate practice questions · Get AI feedback on every answer</p>
        </div>
        {mode === 'quiz' && <button className="btn-secondary" onClick={() => setMode('setup')}>New Session</button>}
      </div>

      {/* SETUP */}
      {mode === 'setup' && (
        <>
          <div className="page-inner">
            {/* Content */}
            <div className="cpanel">
              <ContentInput value={content} onChange={setContent} placeholder="Paste lecture notes, textbook content, or any study material..." />
            </div>

            {/* Question types */}
            <span className="sec-label">Question Types — click to enable / disable</span>
            <div className="type-grid">
              {TYPES.map(t => {
                const on = enabledTypes.includes(t.id);
                return (
                  <button key={t.id} className={`type-btn${on ? ' on ' + TYPE_CLASS[t.id] : ''}`} onClick={() => toggleType(t.id)}>
                    <div className="type-icon" style={{ background: on ? `${t.color}18` : 'transparent', border: `1px solid ${on ? t.color : 'var(--panel-bdr)'}` }}>
                      <svg viewBox="0 0 20 20" fill="none" stroke={on ? t.color : 'var(--text-3)'} strokeWidth="1.6" strokeLinecap="round">
                        {t.icon.props.children}
                      </svg>
                    </div>
                    <div>
                      <div className="type-name">{t.label}</div>
                      <div className="type-desc">{t.desc}</div>
                    </div>
                    <span className={`type-status ${on ? 'on' : 'off'}`} style={on ? { background: t.color } : {}}>
                      {on ? 'ON' : 'OFF'}
                    </span>
                  </button>
                );
              })}
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-3)', marginBottom: 24, fontFamily: 'DM Mono, monospace' }}>
              {enabledTypes.length} type{enabledTypes.length !== 1 ? 's' : ''} selected — questions will be distributed evenly
            </p>

            {/* Count */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, marginBottom: 8 }}>
              <div>
                <span className="sec-label">Number of Questions</span>
                <div className="pill-row">
                  {COUNTS.map(n => (
                    <button key={n} className={`pill${count === n ? ' active-orange' : ''}`} onClick={() => setCount(n)}>{n}</button>
                  ))}
                </div>
              </div>
              <div>
                <span className="sec-label">Difficulty</span>
                <div className="pill-row">
                  {DIFFICULTIES.map(d => (
                    <button key={d.id} className={`pill${difficulty === d.id ? ' ' + d.cls : ''}`} onClick={() => setDifficulty(d.id)}>{d.label}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="generate-bar">
            <button className="btn-primary" onClick={() => generate()} disabled={loading || !content.trim()} style={{ padding: '12px 28px', fontSize: '0.9rem' }}>
              {loading ? 'Generating...' : 'Generate Questions'}
            </button>
            {weakTopics.length > 0 && (
              <button className="btn-secondary" onClick={() => generate(true)} disabled={loading}>
                Focus on Weak Topics ({weakTopics.length})
              </button>
            )}
            {!content.trim() && <span style={{ fontSize: '0.78rem', color: 'var(--text-3)', fontFamily: 'DM Mono, monospace' }}>Paste content above to get started</span>}
          </div>
        </>
      )}

      {/* QUIZ */}
      {mode === 'quiz' && (
        <div className="page-inner">
          {questions.map((q, idx) => {
            const ev = evaluations[q.id];
            const isCorrect = ev?.is_correct;
            return (
              <div key={q.id} className={`q-card anim${ev ? (isCorrect ? ' correct' : ' incorrect') : ''}`} style={{ animationDelay: `${idx * 0.05}s` }}>
                <div className="q-num">Question {idx + 1} · {q.type?.toUpperCase()}</div>
                {q.topic && <div className="q-topic">{q.topic}</div>}
                <div className="q-text">{q.question}</div>

                {q.type === 'mcq' && q.options && !submitted[q.id] && (
                  <div className="mcq-opts">
                    {q.options.map((opt, i) => (
                      <button key={i} className={`mcq-opt${answers[q.id] === opt ? ' selected' : ''}`}
                        onClick={() => setAnswers(a => ({ ...a, [q.id]: opt }))}>
                        <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.72rem', color: 'var(--text-3)', marginRight: 10 }}>
                          {String.fromCharCode(65 + i)}.
                        </span>
                        {opt}
                      </button>
                    ))}
                  </div>
                )}

                {q.type === 'mcq' && submitted[q.id] && q.options && (
                  <div className="mcq-opts">
                    {q.options.map((opt, i) => {
                      let cls = 'mcq-opt';
                      if (opt === q.correct_answer) cls += ' correct-opt';
                      else if (opt === answers[q.id]) cls += ' wrong-opt';
                      return <div key={i} className={cls}><span style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.72rem', marginRight: 10 }}>{String.fromCharCode(65 + i)}.</span>{opt}</div>;
                    })}
                  </div>
                )}

                {q.type === 'truefalse' && !submitted[q.id] && (
                  <div className="flex gap-10" style={{ marginBottom: 16 }}>
                    {['True', 'False'].map(opt => (
                      <button key={opt} className={`pill${answers[q.id] === opt ? ' active-orange' : ''}`}
                        style={{ flex: 1, textAlign: 'center', padding: '12px' }}
                        onClick={() => setAnswers(a => ({ ...a, [q.id]: opt }))}>
                        {opt}
                      </button>
                    ))}
                  </div>
                )}

                {q.type !== 'mcq' && q.type !== 'truefalse' && (
                  <textarea className="content-area" style={{ minHeight: 80, marginBottom: 12 }}
                    placeholder="Type your answer here..."
                    value={answers[q.id] || ''}
                    onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))}
                    disabled={submitted[q.id]} />
                )}

                {!submitted[q.id] && (
                  <button className="btn-primary btn-sm" onClick={() => submitAnswer(q)}
                    disabled={!answers[q.id] || evalLoading[q.id]}
                    style={{ padding: '9px 20px' }}>
                    {evalLoading[q.id] ? 'Evaluating...' : 'Submit Answer'}
                  </button>
                )}

                {ev && (
                  <div className={`eval-box${ev.is_correct ? ' correct' : ' incorrect'}`}>
                    <div className="flex items-center gap-12" style={{ marginBottom: 8 }}>
                      <div className="eval-score" style={{ color: ev.is_correct ? 'var(--lime)' : '#f43f5e' }}>{ev.score}%</div>
                      <div>
                        <div className="eval-verdict">{ev.is_correct ? 'Correct' : 'Incorrect'}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-3)', fontFamily: 'DM Mono, monospace' }}>
                          Correct answer: {q.correct_answer}
                        </div>
                      </div>
                    </div>
                    <div className="eval-feedback">{ev.feedback}</div>
                    {!explanations[q.id] && (
                      <button className="btn-secondary btn-sm" style={{ marginTop: 10 }}
                        onClick={() => explainConcept(q)} disabled={explainLoading[q.id]}>
                        {explainLoading[q.id] ? 'Loading explanation...' : 'Explain this concept'}
                      </button>
                    )}
                    {explanations[q.id] && <div className="explain-box">{explanations[q.id]}</div>}
                  </div>
                )}
              </div>
            );
          })}

          {answeredAll && (
            <div className="cpanel anim" style={{ textAlign: 'center', padding: '32px' }}>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.60rem', color: 'var(--text-3)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>Session Complete</div>
              <div className="result-score-big" style={{ color: avgScore >= 80 ? 'var(--lime)' : avgScore >= 60 ? 'var(--orange)' : '#f43f5e', marginBottom: 16 }}>{avgScore}%</div>
              <div className="flex gap-10" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
                <button className="btn-primary" onClick={() => setMode('setup')}>New Session</button>
                {!analysis && <button className="btn-secondary" onClick={analyzeWeaknesses} disabled={analysisLoading}>{analysisLoading ? 'Analyzing...' : 'Analyze Weaknesses'}</button>}
              </div>
              {analysis && (
                <div style={{ marginTop: 24, textAlign: 'left' }}>
                  <span className="sec-label">Weak Topics</span>
                  {analysis.weakTopics?.map((t, i) => (
                    <div key={i} style={{ padding: '10px 14px', background: 'rgba(244,63,94,0.06)', border: '1px solid rgba(244,63,94,0.15)', marginBottom: 8 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text)', marginBottom: 2 }}>{t.topic}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>{t.recommendation}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
