import { useState, useEffect, useRef } from 'react';
import { API_URL } from '../lib/supabase';
import ContentInput from '../components/ContentInput';

const DURATIONS = [
  { label: '15 min', value: 15 },
  { label: '30 min', value: 30 },
  { label: '45 min', value: 45 },
  { label: '1 hour', value: 60 },
  { label: '1.5 hrs', value: 90 },
  { label: '2 hours', value: 120 },
  { label: '2.5 hrs', value: 150 },
  { label: '3 hours', value: 180 },
];

const QCOUNTS = [5, 10, 15, 20, 30, 40, 50];

export default function ExamSimulator() {
  const [content, setContent] = useState('');
  const [syllabus, setSyllabus] = useState('');
  const [questionCount, setQuestionCount] = useState(20);
  const [duration, setDuration] = useState(60);
  const [difficulty, setDifficulty] = useState('hard');
  const [modules, setModules] = useState('');
  const [exam, setExam] = useState(null);
  const [answers, setAnswers] = useState({});
  const [mode, setMode] = useState('setup');
  const [timeLeft, setTimeLeft] = useState(0);
  const [grading, setGrading] = useState(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [showSyllabusInput, setShowSyllabusInput] = useState(false);
  const [enabledTypes, setEnabledTypes] = useState(['short', 'numerical', 'mcq', 'truefalse']);

  const toggleType = (id) => setEnabledTypes(prev => prev.includes(id) ? prev.length > 1 ? prev.filter(t => t !== id) : prev : [...prev, id]);
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
    setMode('generating');
    setGrading(null);
    try {
      const moduleList = modules.trim() ? modules.split(',').map(m => m.trim()).filter(Boolean) : [];
      const res = await fetch(`${API_URL}/api/exam/generate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, syllabus, questionCount, duration, difficulty, modules: moduleList, enabledTypes })
      });
      const data = await res.json();
      if (!data.questions) throw new Error('No questions');
      setExam(data);
      setAnswers({});
      setCurrentQ(0);
      setTimeLeft(duration * 60);
      setMode('exam');
    } catch (e) {
      alert('Failed to generate exam. Try again.');
      setMode('setup');
    }
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
    } catch { setMode('exam'); }
  };

  const formatTime = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2,'0')}:${sec.toString().padStart(2,'0')}`;
    return `${m.toString().padStart(2,'0')}:${sec.toString().padStart(2,'0')}`;
  };

  const timerClass = timeLeft < 120 ? 'exam-timer danger' : timeLeft < 300 ? 'exam-timer warning' : 'exam-timer';
  const getGradeColor = g => ({ 'A+': 'var(--emerald)', A: 'var(--emerald)', B: 'var(--cyan)', C: 'var(--amber)', D: 'var(--amber)', F: 'var(--rose)' }[g] || 'var(--text2)');

  const typeIcon = t => ({ mcq: '🔘', short: '✍️', truefalse: '⚖️', numerical: '🔢' }[t] || '❓');
  const typeBadge = t => ({ mcq: 'badge-indigo', short: 'badge-cyan', truefalse: 'badge-violet', numerical: 'badge-amber' }[t] || 'badge-indigo');

  return (
    <div>
      <div className="page-header">
        <h1>Exam Simulator 📝</h1>
        <p>University-style timed exam — no feedback until you submit</p>
      </div>

      {/* ── SETUP ── */}
      {mode === 'setup' && (
        <div style={{ maxWidth: 780 }}>

          {/* Study material */}
          <div className="card mb-16">
            <p style={{ fontFamily:'Syne', fontWeight:700, fontSize:15, marginBottom:4 }}>📄 Study Material</p>
            <p className="text-muted mb-16">Upload your notes or paste the content you want to be examined on</p>
            <ContentInput value={content} onChange={setContent} placeholder="Paste lecture notes, textbook content, or any study material..." />
          </div>

          {/* Syllabus (optional) */}
          <div className="card mb-16">
            <div className="flex items-center justify-between mb-8">
              <div>
                <p style={{ fontFamily:'Syne', fontWeight:700, fontSize:15, marginBottom:2 }}>📋 Syllabus / Weightage Guide <span style={{ color:'var(--text3)', fontWeight:400, fontSize:12 }}>optional</span></p>
                <p className="text-muted" style={{ fontSize:12 }}>Upload your syllabus so the AI knows how many questions each module should carry</p>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowSyllabusInput(s => !s)}>
                {showSyllabusInput ? 'Hide' : '+ Add Syllabus'}
              </button>
            </div>
            {showSyllabusInput && (
              <ContentInput value={syllabus} onChange={setSyllabus} label="Syllabus / Module Weightage" placeholder="Paste your syllabus here — e.g. Unit 1: 30%, Unit 2: 25%, Unit 3: 20%, Unit 4: 25% — or just paste the syllabus text and the AI will figure out the weightage..." />
            )}
          </div>

          {/* Modules */}
          <div className="card mb-16">
            <p style={{ fontFamily:'Syne', fontWeight:700, fontSize:15, marginBottom:4 }}>📦 Module Selection <span style={{ color:'var(--text3)', fontWeight:400, fontSize:12 }}>optional</span></p>
            <p className="text-muted mb-12" style={{ fontSize:12 }}>Specify which modules to cover (comma separated). Leave blank to cover everything.</p>
            <input
              type="text"
              style={{ width:'100%', padding:'10px 13px', background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', color:'var(--text)', fontFamily:'Outfit', fontSize:14, outline:'none' }}
              placeholder="e.g. Module 1, Module 3, Unit 4 — or leave blank for full syllabus"
              value={modules}
              onChange={e => setModules(e.target.value)}
            />
          </div>


          {/* Question type toggles */}
          <div className="card mb-16">
            <div className="flex items-center justify-between mb-12">
              <div>
                <p style={{ fontFamily:'Syne', fontWeight:700, fontSize:15, marginBottom:2 }}>🎛️ Question Types</p>
                <p className="text-muted" style={{ fontSize:12 }}>Toggle which question types to include in the exam</p>
              </div>
              <p style={{ fontSize:11, color:'var(--text3)' }}>{enabledTypes.length} selected</p>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              {[
                { id:'short', label:'Short Answer', icon:'✍️', desc:'Written response' },
                { id:'numerical', label:'Numerical', icon:'🔢', desc:'Calculation problems' },
                { id:'mcq', label:'Multiple Choice', icon:'🔘', desc:'4-option questions' },
                { id:'truefalse', label:'True / False', icon:'⚖️', desc:'Statement verification' },
              ].map(t => {
                const on = enabledTypes.includes(t.id);
                return (
                  <button key={t.id} onClick={() => toggleType(t.id)} style={{ padding:'11px 13px', borderRadius:'var(--radius-sm)', border:'2px solid', cursor:'pointer', textAlign:'left', transition:'all 0.15s', fontFamily:'Outfit', borderColor: on ? 'var(--indigo)' : 'var(--border)', background: on ? 'var(--indigo-pale)' : 'var(--surface2)', opacity: on ? 1 : 0.5 }}>
                    <div className="flex items-center gap-8 mb-2">
                      <span style={{ fontSize:15 }}>{t.icon}</span>
                      <span style={{ fontWeight:600, fontSize:13, color: on ? 'var(--indigo-light)' : 'var(--text2)' }}>{t.label}</span>
                      <span style={{ marginLeft:'auto', fontSize:10, fontWeight:700, color: on ? 'var(--emerald)' : 'var(--text3)' }}>{on ? 'ON' : 'OFF'}</span>
                    </div>
                    <p style={{ fontSize:11, color:'var(--text3)', paddingLeft:23 }}>{t.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Exam config */}
          <div className="card mb-16">
            <p style={{ fontFamily:'Syne', fontWeight:700, fontSize:15, marginBottom:16 }}>⚙️ Exam Configuration</p>
            <div className="grid-3" style={{ gap:20 }}>

              {/* Questions */}
              <div>
                <p style={{ fontSize:11, fontWeight:700, color:'var(--text2)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:10 }}>No. of Questions</p>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                  {QCOUNTS.map(n => (
                    <button key={n} onClick={() => setQuestionCount(n)} style={{ padding:'7px 13px', borderRadius:'var(--radius-sm)', border:'1px solid', cursor:'pointer', fontFamily:'Outfit', fontSize:13, borderColor: questionCount === n ? 'var(--indigo)' : 'var(--border)', background: questionCount === n ? 'var(--indigo-pale)' : 'var(--surface2)', color: questionCount === n ? 'var(--indigo-light)' : 'var(--text2)', fontWeight: questionCount === n ? 600 : 400 }}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Duration */}
              <div>
                <p style={{ fontSize:11, fontWeight:700, color:'var(--text2)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:10 }}>Duration</p>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                  {DURATIONS.map(({ label, value }) => (
                    <button key={value} onClick={() => setDuration(value)} style={{ padding:'7px 13px', borderRadius:'var(--radius-sm)', border:'1px solid', cursor:'pointer', fontFamily:'Outfit', fontSize:13, borderColor: duration === value ? 'var(--indigo)' : 'var(--border)', background: duration === value ? 'var(--indigo-pale)' : 'var(--surface2)', color: duration === value ? 'var(--indigo-light)' : 'var(--text2)', fontWeight: duration === value ? 600 : 400 }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Difficulty */}
              <div>
                <p style={{ fontSize:11, fontWeight:700, color:'var(--text2)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:10 }}>Difficulty</p>
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  {[
                    { id:'medium', label:'Medium', desc:'Moderate challenge' },
                    { id:'hard', label:'Hard', desc:'University exam level' },
                    { id:'expert', label:'Expert', desc:'Tricky, multi-step' },
                  ].map(({ id, label, desc }) => (
                    <button key={id} onClick={() => setDifficulty(id)} style={{ padding:'9px 13px', borderRadius:'var(--radius-sm)', border:'1px solid', cursor:'pointer', fontFamily:'Outfit', fontSize:13, textAlign:'left', borderColor: difficulty === id ? 'var(--cyan)' : 'var(--border)', background: difficulty === id ? 'rgba(34,211,238,0.08)' : 'var(--surface2)', color: difficulty === id ? 'var(--cyan)' : 'var(--text2)' }}>
                      <span style={{ fontWeight:600 }}>{label}</span>
                      <span style={{ fontSize:11, opacity:0.7, marginLeft:6 }}>{desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Question type preview */}
          <div className="card mb-20" style={{ background:'var(--surface2)', border:'1px solid var(--border2)' }}>
            <p style={{ fontFamily:'Syne', fontWeight:600, fontSize:13, marginBottom:10 }}>📊 Question Mix (approximate)</p>
            <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
              {[
                { icon:'🔘', type:'Multiple Choice', count: Math.round(questionCount * 0.30), color:'var(--indigo-light)' },
                { icon:'✍️', type:'Short Answer', count: Math.round(questionCount * 0.25), color:'var(--cyan)' },
                { icon:'⚖️', type:'True / False', count: Math.round(questionCount * 0.20), color:'var(--violet)' },
                { icon:'🔢', type:'Numerical', count: Math.round(questionCount * 0.25), color:'var(--amber)' },
              ].map(({ icon, type, count, color }) => (
                <div key={type} style={{ padding:'8px 14px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', display:'flex', alignItems:'center', gap:8 }}>
                  <span>{icon}</span>
                  <span style={{ fontSize:13, color:'var(--text2)' }}>{type}</span>
                  <span style={{ fontWeight:700, color, fontSize:14 }}>~{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Warning */}
          <div className="card mb-20" style={{ background:'rgba(245,158,11,0.06)', border:'1px solid rgba(245,158,11,0.25)', padding:'14px 16px' }}>
            <p style={{ fontSize:13, color:'var(--text2)', lineHeight:1.7 }}>
              ⚠️ <strong style={{ color:'var(--text)' }}>Exam conditions apply:</strong> Once started, no correct answers are shown until submission. Timer cannot be paused. Questions include tricky MCQs, short answers, numerical problems, and true/false — just like a real university exam.
            </p>
          </div>

          <button className="btn btn-primary btn-lg" onClick={generateExam} disabled={!content.trim()}>
            📝 Generate & Start Exam
          </button>
        </div>
      )}

      {/* ── GENERATING ── */}
      {mode === 'generating' && (
        <div className="card text-center" style={{ maxWidth:420, margin:'80px auto', padding:'52px' }}>
          <div className="spinner" style={{ margin:'0 auto 20px' }} />
          <p style={{ fontFamily:'Syne', fontSize:17, fontWeight:700, marginBottom:8 }}>Generating your exam...</p>
          <p className="text-muted">Creating {questionCount} questions including numerical problems.</p>
          <p className="text-muted mt-8" style={{ fontSize:12 }}>This takes 20-30 seconds</p>
        </div>
      )}

      {/* ── EXAM MODE ── */}
      {mode === 'exam' && exam && (() => {
        const q = exam.questions[currentQ];
        return (
          <div style={{ maxWidth:720 }}>
            {/* Sticky header */}
            <div style={{ position:'sticky', top:0, zIndex:10, background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'12px 16px', marginBottom:16, display:'flex', alignItems:'center', justifyContent:'space-between', boxShadow:'0 2px 12px rgba(0,0,0,0.15)' }}>
              <div>
                <p style={{ fontSize:12, color:'var(--text2)', marginBottom:4 }}>Question {currentQ + 1} of {exam.questions.length}</p>
                <div className="progress-bar" style={{ width:160 }}>
                  <div className="progress-fill" style={{ width:`${((currentQ + 1) / exam.questions.length) * 100}%` }} />
                </div>
              </div>
              <div className={timerClass}>{formatTime(timeLeft)}</div>
              <div className="flex gap-8 items-center">
                <span style={{ fontSize:12, color:'var(--text2)' }}>{Object.keys(answers).length}/{exam.questions.length} answered</span>
                <button className="btn btn-primary btn-sm" onClick={submitExam}>Submit →</button>
              </div>
            </div>

            {/* Question grid navigation */}
            <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginBottom:16 }}>
              {exam.questions.map((qn, i) => (
                <button key={i} onClick={() => setCurrentQ(i)} style={{ width:30, height:30, borderRadius:6, border:'1px solid', cursor:'pointer', fontSize:11, fontWeight:600, transition:'all 0.15s', borderColor: answers[qn.id] ? 'var(--emerald)' : i === currentQ ? 'var(--indigo)' : 'var(--border)', background: answers[qn.id] ? 'rgba(16,185,129,0.15)' : i === currentQ ? 'var(--indigo-pale)' : 'var(--surface2)', color: answers[qn.id] ? 'var(--emerald)' : i === currentQ ? 'var(--indigo-light)' : 'var(--text3)' }}>
                  {i + 1}
                </button>
              ))}
            </div>

            {/* Question card */}
            <div className="card mb-16">
              <div className="flex items-center gap-8 mb-12" style={{ flexWrap:'wrap' }}>
                <span className={`badge ${typeBadge(q.type)}`}>{typeIcon(q.type)} {q.type}</span>
                <span className="badge badge-amber">{q.marks} mark{q.marks > 1 ? 's' : ''}</span>
                {q.topic && <span className="badge badge-cyan">{q.topic}</span>}
                {q.module && <span className="badge badge-violet">{q.module}</span>}
                <span className={`badge ${q.difficulty === 'easy' ? 'badge-green' : q.difficulty === 'hard' || q.difficulty === 'expert' ? 'badge-rose' : 'badge-amber'}`}>{q.difficulty}</span>
              </div>

              <p style={{ fontSize:15, fontWeight:500, lineHeight:1.65, marginBottom:16 }}>{q.question}</p>

              {q.type === 'mcq' && q.options?.map((opt, oi) => (
                <button key={oi} className={`option-btn ${answers[q.id] === opt ? 'selected' : ''}`} onClick={() => setAnswers(a => ({ ...a, [q.id]: opt }))}>{opt}</button>
              ))}

              {q.type === 'truefalse' && (
                <div style={{ display:'flex', gap:10 }}>
                  {['True', 'False'].map(opt => (
                    <button key={opt} onClick={() => setAnswers(a => ({ ...a, [q.id]: opt }))} style={{ flex:1, padding:'12px', borderRadius:'var(--radius-sm)', border:`1px solid ${answers[q.id] === opt ? 'var(--indigo)' : 'var(--border)'}`, background: answers[q.id] === opt ? 'var(--indigo-pale)' : 'var(--surface2)', color: answers[q.id] === opt ? 'var(--indigo-light)' : 'var(--text)', cursor:'pointer', fontFamily:'Outfit', fontWeight:600, fontSize:15, transition:'all 0.15s' }}>{opt}</button>
                  ))}
                </div>
              )}

              {(q.type === 'short' || q.type === 'numerical') && (
                <div>
                  {q.type === 'numerical' && (
                    <div style={{ padding:'10px 14px', background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.2)', borderRadius:'var(--radius-sm)', marginBottom:10 }}>
                      <p style={{ fontSize:12, color:'var(--amber)' }}>🔢 Show your working. Write the formula, substitution, and final answer with units.</p>
                    </div>
                  )}
                  <textarea className="content-area" style={{ minHeight: q.type === 'numerical' ? 120 : 90 }}
                    placeholder={q.type === 'numerical' ? 'Show your working step by step...' : 'Write your answer here...'}
                    value={answers[q.id] || ''} onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))} />
                </div>
              )}

              <div className="flex justify-between mt-16">
                <button className="btn btn-secondary btn-sm" onClick={() => setCurrentQ(i => Math.max(0, i - 1))} disabled={currentQ === 0}>← Prev</button>
                <span style={{ fontSize:12, color:'var(--text3)' }}>{answers[q.id] ? '✓ Answered' : 'Not answered'}</span>
                <button className="btn btn-secondary btn-sm" onClick={() => setCurrentQ(i => Math.min(exam.questions.length - 1, i + 1))} disabled={currentQ === exam.questions.length - 1}>Next →</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── GRADING ── */}
      {mode === 'grading' && (
        <div className="card text-center" style={{ maxWidth:420, margin:'80px auto', padding:'52px' }}>
          <div className="spinner" style={{ margin:'0 auto 20px' }} />
          <p style={{ fontFamily:'Syne', fontSize:17, fontWeight:700, marginBottom:8 }}>Grading your exam...</p>
          <p className="text-muted">AI is evaluating all answers including numerical working</p>
        </div>
      )}

      {/* ── RESULTS ── */}
      {mode === 'results' && grading && (
        <div style={{ maxWidth:720 }}>
          {/* Score card */}
          <div className="card mb-20" style={{ textAlign:'center', padding:'36px', background:`${getGradeColor(grading.grade)}08`, border:`1px solid ${getGradeColor(grading.grade)}35` }}>
            <div className="score-circle" style={{ background:`${getGradeColor(grading.grade)}18`, color:getGradeColor(grading.grade) }}>{grading.grade}</div>
            <p style={{ fontFamily:'Syne', fontSize:26, fontWeight:800, color:getGradeColor(grading.grade), margin:'8px 0' }}>{grading.percentage}%</p>
            <p style={{ fontFamily:'Syne', fontSize:16, fontWeight:600, marginBottom:8 }}>{grading.total_marks} / {grading.max_marks} marks</p>
            <p style={{ color:'var(--text2)', fontSize:14, lineHeight:1.6 }}>{grading.overall_feedback}</p>
          </div>

          {/* Type breakdown */}
          {exam && (
            <div className="card mb-20">
              <p style={{ fontFamily:'Syne', fontWeight:700, fontSize:15, marginBottom:14 }}>📊 Performance by Question Type</p>
              <div className="grid-4">
                {['mcq','short','truefalse','numerical'].map(type => {
                  const typeQs = exam.questions.filter(q => q.type === type);
                  if (typeQs.length === 0) return null;
                  const typeResults = grading.results?.filter(r => {
                    const q = exam.questions.find(q => q.id === r.id);
                    return q?.type === type;
                  }) || [];
                  const scored = typeResults.reduce((a, r) => a + (r.marks_awarded || 0), 0);
                  const max = typeResults.reduce((a, r) => a + (r.max_marks || 0), 0);
                  const pct = max > 0 ? Math.round((scored / max) * 100) : 0;
                  return (
                    <div key={type} className="card" style={{ textAlign:'center', padding:'14px', background:'var(--surface2)' }}>
                      <div style={{ fontSize:22, marginBottom:6 }}>{typeIcon(type)}</div>
                      <p style={{ fontSize:11, color:'var(--text2)', textTransform:'capitalize', marginBottom:4 }}>{type === 'truefalse' ? 'True/False' : type}</p>
                      <p style={{ fontFamily:'Syne', fontWeight:700, fontSize:18, color: pct >= 70 ? 'var(--emerald)' : pct >= 50 ? 'var(--amber)' : 'var(--rose)' }}>{pct}%</p>
                      <p style={{ fontSize:11, color:'var(--text3)' }}>{scored}/{max} marks</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Topic breakdown */}
          {grading.topic_breakdown?.length > 0 && (
            <div className="card mb-20">
              <p style={{ fontFamily:'Syne', fontWeight:700, fontSize:15, marginBottom:14 }}>📚 Topic Breakdown</p>
              {Array.from(new Set(grading.topic_breakdown.map(t => t.topic))).map(topic => {
                const items = grading.topic_breakdown.filter(t => t.topic === topic);
                const scored = items.reduce((a, t) => a + (t.marks || 0), 0);
                const correct = items.filter(t => t.correct).length;
                return (
                  <div key={topic} style={{ display:'flex', alignItems:'center', gap:12, marginBottom:10 }}>
                    <span style={{ fontSize:14 }}>{correct === items.length ? '✅' : correct > 0 ? '🟡' : '❌'}</span>
                    <span style={{ fontSize:13, flex:1 }}>{topic}</span>
                    <span className={`badge ${correct === items.length ? 'badge-green' : correct > 0 ? 'badge-amber' : 'badge-rose'}`}>{scored} pts</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Per question review */}
          <div className="card mb-20">
            <p style={{ fontFamily:'Syne', fontWeight:700, fontSize:15, marginBottom:14 }}>🔍 Question Review</p>
            {grading.results?.map((r, i) => {
              const q = exam.questions.find(q => q.id === r.id) || exam.questions[i];
              return (
                <div key={i} style={{ padding:'14px', borderRadius:'var(--radius-sm)', background:'var(--surface2)', marginBottom:8, border:`1px solid ${r.is_correct ? 'rgba(16,185,129,0.2)' : 'rgba(244,63,94,0.15)'}` }}>
                  <div className="flex items-center gap-8 mb-6" style={{ flexWrap:'wrap' }}>
                    <span>{r.is_correct ? '✅' : r.marks_awarded > 0 ? '🟡' : '❌'}</span>
                    <span className={`badge ${typeBadge(q?.type)}`}>{typeIcon(q?.type)} {q?.type}</span>
                    <span style={{ fontSize:13, fontWeight:500, flex:1, color:'var(--text)' }}>Q{i + 1}: {q?.question?.slice(0, 80)}{q?.question?.length > 80 ? '...' : ''}</span>
                    <span style={{ fontSize:13, fontWeight:700, color: r.is_correct ? 'var(--emerald)' : r.marks_awarded > 0 ? 'var(--amber)' : 'var(--rose)' }}>{r.marks_awarded}/{r.max_marks}</span>
                  </div>
                  <p style={{ fontSize:12, color:'var(--text2)', marginLeft:24, marginBottom:4 }}>{r.feedback}</p>
                  {!r.is_correct && q && (
                    <p style={{ fontSize:12, color:'var(--emerald)', marginLeft:24, fontStyle:'italic' }}>✓ {q.correct_answer}</p>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex gap-10">
            <button className="btn btn-primary" onClick={() => { setMode('setup'); setExam(null); setGrading(null); setContent(''); setSyllabus(''); }}>New Exam</button>
            <button className="btn btn-secondary" onClick={() => { setAnswers({}); setCurrentQ(0); setTimeLeft(duration * 60); setMode('exam'); }}>Retry Same Exam</button>
          </div>
        </div>
      )}
    </div>
  );
}
