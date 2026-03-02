import { useState, useEffect, useRef } from 'react';
import { API_URL } from '../lib/supabase';
import ContentInput from '../components/ContentInput';

const DURATIONS = [
  { label: '1 hour', value: 60 },
  { label: '1.5 hrs', value: 90 },
  { label: '2 hours', value: 120 },
  { label: '2.5 hrs', value: 150 },
  { label: '3 hours', value: 180 },
];

// Section A: 5 Qs attempt 4, 6 marks each → max 24
// Section B: 3 Qs attempt 2, 10 marks each → max 20
// Section C: 1 compulsory Q, 16 marks → max 16
// Total = 60 marks. Pass = 33% = 20 marks

export default function ExamSimulator() {
  const [content, setContent] = useState('');
  const [syllabus, setSyllabus] = useState('');
  const [duration, setDuration] = useState(180);
  const [modules, setModules] = useState('');
  const [showSyllabusInput, setShowSyllabusInput] = useState(false);
  const [exam, setExam] = useState(null);
  const [answers, setAnswers] = useState({});
  const [mode, setMode] = useState('setup'); // setup | generating | exam | grading | results
  const [timeLeft, setTimeLeft] = useState(0);
  const [grading, setGrading] = useState(null);
  const [currentSection, setCurrentSection] = useState('A');
  const [currentQIdx, setCurrentQIdx] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    if (mode !== 'exam') return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timerRef.current); handleSubmit(); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [mode]);

  const generateExam = async () => {
    if (!content.trim()) return;
    setMode('generating');
    try {
      const moduleList = modules.trim() ? modules.split(',').map(m => m.trim()).filter(Boolean) : [];
      const res = await fetch(`${API_URL}/api/exam/generate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, syllabus, duration, modules: moduleList })
      });
      const data = await res.json();
      if (!data.sections) throw new Error('No sections');
      setExam(data);
      setAnswers({});
      setCurrentSection('A');
      setCurrentQIdx(0);
      setTimeLeft(duration * 60);
      setMode('exam');
    } catch {
      alert('Failed to generate exam. Try again.');
      setMode('setup');
    }
  };

  const handleSubmit = async () => {
    clearInterval(timerRef.current);
    setMode('grading');
    try {
      const res = await fetch(`${API_URL}/api/exam/grade`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions: exam.questions, answers, sections: exam.sections })
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

  const timerClass = timeLeft < 300 ? 'exam-timer danger' : timeLeft < 900 ? 'exam-timer warning' : 'exam-timer';

  const getAttemptedCount = (section) => {
    if (!exam) return 0;
    const sec = exam.sections.find(s => s.section === section);
    if (!sec) return 0;
    return sec.questions.filter(q => answers[q.id] && answers[q.id].trim()).length;
  };

  const getSectionStatus = (sec) => {
    const attempted = getAttemptedCount(sec.section);
    const required = sec.attempt;
    if (attempted >= required) return 'done';
    if (attempted > 0) return 'partial';
    return 'empty';
  };

  const gradeColors = {
    'O (Outstanding)': 'var(--violet)', 'A+ (Excellent)': 'var(--emerald)', 'A (Very Good)': 'var(--emerald)',
    'B+ (Good)': 'var(--cyan)', 'B (Above Average)': 'var(--cyan)', 'C (Average)': 'var(--amber)',
    'P (Pass)': 'var(--amber)', 'F (Fail)': 'var(--rose)'
  };

  const currentSectionData = exam?.sections?.find(s => s.section === currentSection);
  const currentQ = currentSectionData?.questions?.[currentQIdx];

  return (
    <div>
      <div className="page-header">
        <h1>Exam Simulator 📝</h1>
        <p>University-format semester paper · Section A, B, C · Pass at 33%</p>
      </div>

      {/* ── SETUP ── */}
      {mode === 'setup' && (
        <div style={{ maxWidth: 780 }}>

          {/* Exam format info */}
          <div className="card mb-16" style={{ background: 'var(--surface2)', border: '1px solid var(--border2)', padding: '16px 20px' }}>
            <p style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 14, marginBottom: 12 }}>📋 Fixed Exam Format</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              {[
                { sec: 'A', desc: '5 Questions — Attempt any 4', marks: '6 marks each', max: '24 marks', color: 'var(--indigo)' },
                { sec: 'B', desc: '3 Questions — Attempt any 2', marks: '10 marks each', max: '20 marks', color: 'var(--cyan)' },
                { sec: 'C', desc: '1 Compulsory Question', marks: '16 marks', max: '16 marks', color: 'var(--violet)' },
              ].map(({ sec, desc, marks, max, color }) => (
                <div key={sec} style={{ padding: '12px 14px', borderRadius: 'var(--radius-sm)', background: 'var(--surface)', border: `1px solid ${color}30` }}>
                  <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 18, color, marginBottom: 4 }}>Section {sec}</div>
                  <p style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 3 }}>{desc}</p>
                  <p style={{ fontSize: 12, color: 'var(--text3)' }}>{marks}</p>
                  <p style={{ fontSize: 13, fontWeight: 700, color, marginTop: 6 }}>{max}</p>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 20, marginTop: 12, padding: '10px 14px', background: 'var(--surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
              <p style={{ fontSize: 13, color: 'var(--text2)' }}>Total: <strong style={{ color: 'var(--text)' }}>60 marks</strong></p>
              <p style={{ fontSize: 13, color: 'var(--text2)' }}>Pass mark: <strong style={{ color: 'var(--emerald)' }}>20 marks (33%)</strong></p>
              <p style={{ fontSize: 13, color: 'var(--text2)' }}>No MCQ or True/False — written answers only</p>
            </div>
          </div>

          {/* Study material */}
          <div className="card mb-16">
            <p style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 15, marginBottom: 4 }}>📄 Study Material</p>
            <p className="text-muted mb-16" style={{ fontSize: 13 }}>Upload your notes or textbook — the AI will create a challenging exam from this</p>
            <ContentInput value={content} onChange={setContent} placeholder="Paste or upload your lecture notes, textbook chapters, or study material..." />
          </div>

          {/* Syllabus */}
          <div className="card mb-16">
            <div className="flex items-center justify-between mb-8">
              <div>
                <p style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 15, marginBottom: 2 }}>
                  📋 Syllabus <span style={{ color: 'var(--text3)', fontWeight: 400, fontSize: 12 }}>optional</span>
                </p>
                <p className="text-muted" style={{ fontSize: 12 }}>Helps the AI distribute questions across modules proportionally</p>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowSyllabusInput(s => !s)}>
                {showSyllabusInput ? 'Hide' : '+ Add Syllabus'}
              </button>
            </div>
            {showSyllabusInput && (
              <ContentInput value={syllabus} onChange={setSyllabus} label="Syllabus / Module Weightage"
                placeholder="Paste your syllabus — e.g. Unit 1: Thermodynamics (30%), Unit 2: Fluid Mechanics (25%)..." />
            )}
          </div>

          {/* Modules */}
          <div className="card mb-16">
            <p style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
              📦 Focus Modules <span style={{ color: 'var(--text3)', fontWeight: 400, fontSize: 12 }}>optional</span>
            </p>
            <p className="text-muted mb-10" style={{ fontSize: 12 }}>Comma-separated modules to target. Leave blank to cover everything.</p>
            <input type="text"
              style={{ width: '100%', padding: '10px 13px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', fontFamily: 'Outfit', fontSize: 14, outline: 'none' }}
              placeholder="e.g. Module 1, Unit 3, Chapter 5 — or leave blank"
              value={modules} onChange={e => setModules(e.target.value)} />
          </div>

          {/* Duration */}
          <div className="card mb-20">
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Exam Duration</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {DURATIONS.map(({ label, value }) => (
                <button key={value} onClick={() => setDuration(value)} style={{ padding: '9px 18px', borderRadius: 'var(--radius-sm)', border: '1px solid', cursor: 'pointer', fontFamily: 'Outfit', fontSize: 13, fontWeight: duration === value ? 600 : 400, borderColor: duration === value ? 'var(--indigo)' : 'var(--border)', background: duration === value ? 'var(--indigo-pale)' : 'var(--surface2)', color: duration === value ? 'var(--indigo-light)' : 'var(--text2)' }}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="card mb-20" style={{ background: 'rgba(244,63,94,0.05)', border: '1px solid rgba(244,63,94,0.2)', padding: '14px 16px' }}>
            <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7 }}>
              ⚠️ <strong style={{ color: 'var(--text)' }}>Real exam conditions:</strong> Questions are deliberately challenging and indirect — not simple recall. No MCQ. No True/False. You must write proper answers. No feedback until submission. Timer cannot be paused.
            </p>
          </div>

          <button className="btn btn-primary btn-lg" onClick={generateExam} disabled={!content.trim()}>
            📝 Generate Exam Paper
          </button>
        </div>
      )}

      {/* ── GENERATING ── */}
      {mode === 'generating' && (
        <div className="card text-center" style={{ maxWidth: 440, margin: '80px auto', padding: '56px' }}>
          <div className="spinner" style={{ margin: '0 auto 20px' }} />
          <p style={{ fontFamily: 'Syne', fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Setting the exam paper...</p>
          <p className="text-muted">Creating Section A, B, and C with challenging questions</p>
          <p className="text-muted mt-8" style={{ fontSize: 12 }}>This takes 25–35 seconds</p>
        </div>
      )}

      {/* ── EXAM MODE ── */}
      {mode === 'exam' && exam && (
        <div style={{ maxWidth: 800 }}>

          {/* Sticky header */}
          <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '12px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 4px 16px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', gap: 8 }}>
              {exam.sections.map(sec => {
                const status = getSectionStatus(sec);
                const isCurrent = currentSection === sec.section;
                return (
                  <button key={sec.section} onClick={() => { setCurrentSection(sec.section); setCurrentQIdx(0); }} style={{ padding: '7px 14px', borderRadius: 'var(--radius-sm)', border: '2px solid', cursor: 'pointer', fontFamily: 'Syne', fontWeight: 700, fontSize: 13, transition: 'all 0.15s', borderColor: isCurrent ? 'var(--indigo)' : status === 'done' ? 'var(--emerald)' : status === 'partial' ? 'var(--amber)' : 'var(--border)', background: isCurrent ? 'var(--indigo-pale)' : status === 'done' ? 'rgba(16,185,129,0.1)' : 'var(--surface2)', color: isCurrent ? 'var(--indigo-light)' : status === 'done' ? 'var(--emerald)' : status === 'partial' ? 'var(--amber)' : 'var(--text2)' }}>
                    {status === 'done' ? '✓ ' : ''} Sec {sec.section}
                    <span style={{ fontSize: 10, marginLeft: 4, opacity: 0.7 }}>{getAttemptedCount(sec.section)}/{sec.attempt}</span>
                  </button>
                );
              })}
            </div>
            <div className={timerClass}>{formatTime(timeLeft)}</div>
            <button className="btn btn-primary btn-sm" onClick={handleSubmit}>Submit Exam →</button>
          </div>

          {/* Section header */}
          {currentSectionData && (
            <div style={{ padding: '14px 18px', background: 'var(--surface2)', borderRadius: 'var(--radius)', marginBottom: 16, border: '1px solid var(--border2)' }}>
              <div className="flex items-center justify-between">
                <div>
                  <p style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 17 }}>Section {currentSectionData.section}</p>
                  <p style={{ color: 'var(--text2)', fontSize: 13, marginTop: 3 }}>{currentSectionData.instruction}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 12, color: 'var(--text3)' }}>Max for this section</p>
                  <p style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 18, color: 'var(--indigo-light)' }}>
                    {currentSectionData.attempt * currentSectionData.marks_each} marks
                  </p>
                </div>
              </div>
              {/* Question tabs within section */}
              <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
                {currentSectionData.questions.map((q, i) => {
                  const isAnswered = answers[q.id] && answers[q.id].trim();
                  const isCurrent = i === currentQIdx;
                  return (
                    <button key={q.id} onClick={() => setCurrentQIdx(i)} style={{ padding: '5px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid', cursor: 'pointer', fontFamily: 'Outfit', fontSize: 12, fontWeight: 600, borderColor: isCurrent ? 'var(--indigo)' : isAnswered ? 'var(--emerald)' : 'var(--border)', background: isCurrent ? 'var(--indigo-pale)' : isAnswered ? 'rgba(16,185,129,0.12)' : 'var(--surface)', color: isCurrent ? 'var(--indigo-light)' : isAnswered ? 'var(--emerald)' : 'var(--text3)' }}>
                      Q{q.id}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Current question */}
          {currentQ && (
            <div className="card mb-16">
              <div className="flex items-center gap-8 mb-14" style={{ flexWrap: 'wrap' }}>
                <span style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 16, color: 'var(--indigo-light)' }}>Q{currentQ.id}</span>
                <span className="badge badge-amber">{currentQ.marks} marks</span>
                {currentQ.topic && <span className="badge badge-cyan">{currentQ.topic}</span>}
                <span className="badge badge-rose">{currentQ.difficulty}</span>
              </div>

              <p style={{ fontSize: 15, fontWeight: 500, lineHeight: 1.7, marginBottom: currentQ.sub_parts ? 16 : 20 }}>{currentQ.question}</p>

              {/* Sub-parts display */}
              {currentQ.sub_parts && (
                <div style={{ marginBottom: 20 }}>
                  {currentQ.sub_parts.map((sp, si) => (
                    <div key={si} style={{ padding: '12px 16px', background: 'var(--surface2)', borderRadius: 'var(--radius-sm)', marginBottom: 8, border: '1px solid var(--border)', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <span style={{ fontFamily: 'Syne', fontWeight: 700, color: 'var(--indigo-light)', fontSize: 14, minWidth: 30, flexShrink: 0 }}>{sp.label}</span>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 14, lineHeight: 1.6 }}>{sp.text}</p>
                      </div>
                      <span className="badge badge-amber" style={{ flexShrink: 0 }}>{sp.marks}m</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Numerical hint */}
              {currentQ.type === 'numerical' && (
                <div style={{ padding: '9px 13px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 'var(--radius-sm)', marginBottom: 12 }}>
                  <p style={{ fontSize: 12, color: 'var(--amber)' }}>🔢 Show all working. Write formulas, substitutions, and final answer with units. Marks awarded for correct method even if final answer differs.</p>
                </div>
              )}

              <textarea
                className="content-area"
                style={{ minHeight: currentQ.sub_parts ? 180 : 130 }}
                placeholder={currentQ.sub_parts
                  ? `Answer all sub-parts:\n${currentQ.sub_parts.map(sp => sp.label + ' ').join('\n')}`
                  : 'Write your answer here...'}
                value={answers[currentQ.id] || ''}
                onChange={e => setAnswers(a => ({ ...a, [currentQ.id]: e.target.value }))}
              />

              <div className="flex justify-between mt-14">
                <button className="btn btn-secondary btn-sm" onClick={() => setCurrentQIdx(i => Math.max(0, i - 1))} disabled={currentQIdx === 0}>← Prev</button>
                <span style={{ fontSize: 12, color: answers[currentQ.id]?.trim() ? 'var(--emerald)' : 'var(--text3)' }}>
                  {answers[currentQ.id]?.trim() ? '✓ Answered' : 'Not answered'}
                </span>
                <button className="btn btn-secondary btn-sm" onClick={() => setCurrentQIdx(i => Math.min(currentSectionData.questions.length - 1, i + 1))} disabled={currentQIdx === currentSectionData.questions.length - 1}>Next →</button>
              </div>
            </div>
          )}

          {/* Attempt tracker */}
          <div className="card" style={{ background: 'var(--surface2)', padding: '14px 16px' }}>
            <p style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 8, fontWeight: 600 }}>Attempt Tracker</p>
            <div style={{ display: 'flex', gap: 16 }}>
              {exam.sections.map(sec => (
                <div key={sec.section}>
                  <span style={{ fontSize: 12, color: 'var(--text3)' }}>Sec {sec.section}: </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: getAttemptedCount(sec.section) >= sec.attempt ? 'var(--emerald)' : 'var(--amber)' }}>
                    {getAttemptedCount(sec.section)}/{sec.attempt} required
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── GRADING ── */}
      {mode === 'grading' && (
        <div className="card text-center" style={{ maxWidth: 440, margin: '80px auto', padding: '56px' }}>
          <div className="spinner" style={{ margin: '0 auto 20px' }} />
          <p style={{ fontFamily: 'Syne', fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Grading your answers...</p>
          <p className="text-muted">AI is evaluating all sections including numerical working</p>
        </div>
      )}

      {/* ── RESULTS ── */}
      {mode === 'results' && grading && (
        <div style={{ maxWidth: 800 }}>

          {/* Main result card */}
          <div className="card mb-20" style={{ textAlign: 'center', padding: '40px', background: grading.passed ? 'rgba(16,185,129,0.05)' : 'rgba(244,63,94,0.05)', border: `2px solid ${grading.passed ? 'rgba(16,185,129,0.3)' : 'rgba(244,63,94,0.3)'}` }}>
            <div style={{ width: 100, height: 100, borderRadius: '50%', background: grading.passed ? 'rgba(16,185,129,0.15)' : 'rgba(244,63,94,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', border: `3px solid ${grading.passed ? 'var(--emerald)' : 'var(--rose)'}` }}>
              <span style={{ fontSize: 36 }}>{grading.passed ? '🎓' : '📚'}</span>
            </div>
            <p style={{ fontFamily: 'Syne', fontSize: 32, fontWeight: 800, color: grading.passed ? 'var(--emerald)' : 'var(--rose)', marginBottom: 4 }}>
              {grading.passed ? 'PASS' : 'FAIL'}
            </p>
            <p style={{ fontFamily: 'Syne', fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
              {grading.total_marks} / {grading.max_marks || 60} marks
            </p>
            <p style={{ fontFamily: 'Syne', fontSize: 28, fontWeight: 800, color: grading.passed ? 'var(--emerald)' : 'var(--rose)', marginBottom: 8 }}>
              {grading.percentage}%
            </p>
            <p style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 6 }}>{grading.grade}</p>
            <p style={{ fontSize: 12, color: 'var(--text3)' }}>Pass mark: {grading.pass_mark || 20} marks (33%)</p>
            <div style={{ height: 1, background: 'var(--border)', margin: '20px 0' }} />
            <p style={{ color: 'var(--text2)', fontSize: 14, lineHeight: 1.7 }}>{grading.overall_feedback}</p>
          </div>

          {/* Section scores */}
          {grading.section_scores && (
            <div className="card mb-20">
              <p style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 15, marginBottom: 16 }}>📊 Section-wise Performance</p>
              <div className="grid-3">
                {Object.entries(grading.section_scores).map(([sec, data]) => {
                  const pct = Math.round((data.marks_awarded / data.max_marks) * 100);
                  const color = pct >= 60 ? 'var(--emerald)' : pct >= 40 ? 'var(--amber)' : 'var(--rose)';
                  const sectionInfo = { A: { marks: 24, attempt: 4, each: 6 }, B: { marks: 20, attempt: 2, each: 10 }, C: { marks: 16, attempt: 1, each: 16 } };
                  const info = sectionInfo[sec] || {};
                  return (
                    <div key={sec} style={{ padding: '18px', background: 'var(--surface2)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', textAlign: 'center' }}>
                      <p style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 22, color: 'var(--indigo-light)', marginBottom: 4 }}>Section {sec}</p>
                      <p style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 26, color, marginBottom: 2 }}>{pct}%</p>
                      <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 4 }}>{data.marks_awarded} / {data.max_marks} marks</p>
                      {info.attempt && <p style={{ fontSize: 11, color: 'var(--text3)' }}>Attempted: {data.attempted}/{info.attempt} required</p>}
                      <div className="progress-bar mt-8">
                        <div className="progress-fill" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}, ${color})` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Per question review */}
          <div className="card mb-20">
            <p style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 15, marginBottom: 16 }}>🔍 Question-by-Question Review</p>
            {exam.sections.map(sec => (
              <div key={sec.section} style={{ marginBottom: 20 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                  Section {sec.section} — {sec.instruction}
                </p>
                {sec.questions.map(q => {
                  const r = grading.results?.find(r => r.id === q.id);
                  if (!r) return null;
                  const attempted = answers[q.id]?.trim();
                  return (
                    <div key={q.id} style={{ padding: '14px 16px', background: 'var(--surface2)', borderRadius: 'var(--radius-sm)', marginBottom: 8, border: `1px solid ${r.marks_awarded >= q.marks * 0.5 ? 'rgba(16,185,129,0.2)' : attempted ? 'rgba(244,63,94,0.15)' : 'rgba(100,100,100,0.2)'}` }}>
                      <div className="flex items-center gap-10 mb-6" style={{ flexWrap: 'wrap' }}>
                        <span style={{ fontFamily: 'Syne', fontWeight: 700, color: 'var(--indigo-light)' }}>Q{q.id}</span>
                        <span style={{ fontSize: 13, flex: 1, color: 'var(--text)' }}>{q.question.slice(0, 90)}{q.question.length > 90 ? '...' : ''}</span>
                        <span style={{ fontWeight: 700, fontSize: 14, color: r.marks_awarded >= q.marks * 0.5 ? 'var(--emerald)' : 'var(--rose)' }}>
                          {attempted ? `${r.marks_awarded}/${r.max_marks}` : 'Not attempted'}
                        </span>
                      </div>
                      {attempted && r.feedback && (
                        <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.6, marginBottom: 8 }}>{r.feedback}</p>
                      )}
                      {/* Show model answer */}
                      <details style={{ marginTop: 6 }}>
                        <summary style={{ fontSize: 12, color: 'var(--indigo-light)', cursor: 'pointer', fontWeight: 600 }}>View model answer</summary>
                        <div style={{ marginTop: 8, padding: '10px 12px', background: 'var(--surface)', borderRadius: 6, border: '1px solid var(--border)' }}>
                          <p style={{ fontSize: 12, color: 'var(--emerald)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{q.correct_answer}</p>
                          {q.marking_scheme && (
                            <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 8, fontStyle: 'italic' }}>📋 {q.marking_scheme}</p>
                          )}
                        </div>
                      </details>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="flex gap-10">
            <button className="btn btn-primary" onClick={() => { setMode('setup'); setExam(null); setGrading(null); setContent(''); }}>New Exam</button>
            <button className="btn btn-secondary" onClick={() => { setAnswers({}); setCurrentSection('A'); setCurrentQIdx(0); setTimeLeft(duration * 60); setMode('exam'); }}>Retry Same Paper</button>
          </div>
        </div>
      )}
    </div>
  );
}
