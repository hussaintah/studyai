import { useState, useEffect, useRef } from 'react';
import { API_URL } from '../lib/supabase';
import ContentInput from '../components/ContentInput';

const DURATIONS = [
  { label: '1 hour', value: 60 }, { label: '1.5 hrs', value: 90 },
  { label: '2 hours', value: 120 }, { label: '2.5 hrs', value: 150 }, { label: '3 hours', value: 180 },
];

export default function ExamSimulator() {
  const [content, setContent] = useState('');
  const [syllabus, setSyllabus] = useState('');
  const [duration, setDuration] = useState(180);
  const [modules, setModules] = useState('');
  const [showSyllabusInput, setShowSyllabusInput] = useState(false);
  const [exam, setExam] = useState(null);
  const [answers, setAnswers] = useState({});
  const [mode, setMode] = useState('setup');
  const [timeLeft, setTimeLeft] = useState(0);
  const [grading, setGrading] = useState(null);
  const [currentSection, setCurrentSection] = useState('A');
  const [currentQIdx, setCurrentQIdx] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    if (mode !== 'exam') return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => { if (t <= 1) { clearInterval(timerRef.current); handleSubmit(); return 0; } return t - 1; });
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
      setExam(data); setAnswers({}); setCurrentSection('A'); setCurrentQIdx(0); setTimeLeft(duration * 60); setMode('exam');
    } catch { alert('Failed to generate exam. Try again.'); setMode('setup'); }
  };

  const handleSubmit = async () => {
    clearInterval(timerRef.current); setMode('grading');
    try {
      const res = await fetch(`${API_URL}/api/exam/grade`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions: exam.questions, answers, sections: exam.sections })
      });
      setGrading(await res.json()); setMode('results');
    } catch { setMode('exam'); }
  };

  const formatTime = s => {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2,'0')}:${sec.toString().padStart(2,'0')}`;
    return `${m.toString().padStart(2,'0')}:${sec.toString().padStart(2,'0')}`;
  };

  const getAttemptedCount = section => {
    const sec = exam?.sections?.find(s => s.section === section);
    return sec?.questions?.filter(q => answers[q.id]?.trim()).length || 0;
  };

  const currentSectionData = exam?.sections?.find(s => s.section === currentSection);
  const currentQ = currentSectionData?.questions?.[currentQIdx];
  const timerCls = timeLeft < 300 ? 'exam-timer danger' : timeLeft < 900 ? 'exam-timer warning' : 'exam-timer';

  return (
    <div>
      {/* HEADER */}
      <div style={{ padding: '24px 40px 0' }}>
        <div className="page-hdr" style={{ borderBottom: mode === 'setup' ? undefined : 'none', paddingBottom: mode === 'setup' ? undefined : 0 }}>
          <h1>Exam Simulator</h1>
          <p>University-format semester paper · Section A, B, C · Pass at 33%</p>
        </div>
      </div>

      {/* SETUP */}
      {mode === 'setup' && (
        <>
          <div className="page-inner">
            {/* Format info */}
            <span className="sec-label">Fixed Exam Format</span>
            <div className="section-cards" style={{ marginBottom: 16 }}>
              <div className="section-card section-card-a">
                <div className="section-label section-label-a">Section A</div>
                <div className="section-detail">5 Questions — Attempt any 4<br/>6 marks each</div>
                <div className="section-marks section-marks-a">24 marks</div>
              </div>
              <div className="section-card section-card-b">
                <div className="section-label section-label-b">Section B</div>
                <div className="section-detail">3 Questions — Attempt any 2<br/>10 marks each</div>
                <div className="section-marks section-marks-b">20 marks</div>
              </div>
              <div className="section-card section-card-c">
                <div className="section-label section-label-c">Section C</div>
                <div className="section-detail">1 Compulsory Question<br/>16 marks</div>
                <div className="section-marks section-marks-c">16 marks</div>
              </div>
            </div>
            <div style={{ padding: '12px 18px', background: 'var(--panel-bg)', border: '1px solid var(--panel-bdr)', marginBottom: 24, display: 'flex', gap: 24 }}>
              <span style={{ fontSize: '0.84rem', color: 'var(--text-2)' }}>Total: <strong style={{ color: 'var(--text)' }}>60 marks</strong></span>
              <span style={{ fontSize: '0.84rem', color: 'var(--text-2)' }}>Pass mark: <strong style={{ color: 'var(--lime)' }}>20 marks (33%)</strong></span>
              <span style={{ fontSize: '0.84rem', color: 'var(--text-3)' }}>No MCQ or True/False — written answers only</span>
            </div>

            {/* Content */}
            <span className="sec-label">Study Material</span>
            <div className="cpanel" style={{ marginBottom: 24 }}>
              <ContentInput value={content} onChange={setContent} placeholder="Paste or upload your lecture notes, textbook chapters, or study material..." />
            </div>

            {/* Syllabus */}
            <div className="cpanel" style={{ marginBottom: 16 }}>
              <div className="flex items-center justify-between" style={{ marginBottom: showSyllabusInput ? 16 : 0 }}>
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>
                    Syllabus <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.58rem', color: 'var(--text-4)', letterSpacing: '0.10em', textTransform: 'uppercase' }}>optional</span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>Helps the AI distribute questions across modules proportionally</div>
                </div>
                <button className="btn-secondary btn-sm" onClick={() => setShowSyllabusInput(s => !s)}>
                  {showSyllabusInput ? 'Hide' : '+ Add Syllabus'}
                </button>
              </div>
              {showSyllabusInput && <ContentInput value={syllabus} onChange={setSyllabus} label="Syllabus / Module Weightage" placeholder="e.g. Unit 1: Thermodynamics (30%), Unit 2: Fluid Mechanics (25%)..." />}
            </div>

            {/* Focus modules */}
            <div className="cpanel" style={{ marginBottom: 16 }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
                Focus Modules <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.58rem', color: 'var(--text-4)', letterSpacing: '0.10em', textTransform: 'uppercase' }}>optional</span>
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-3)', marginBottom: 12 }}>Comma-separated modules to target. Leave blank to cover everything.</div>
              <input type="text" placeholder="e.g. Module 1, Unit 3, Chapter 5 — or leave blank" value={modules} onChange={e => setModules(e.target.value)} />
            </div>

            {/* Duration */}
            <span className="sec-label">Exam Duration</span>
            <div className="pill-row" style={{ marginBottom: 24 }}>
              {DURATIONS.map(({ label, value }) => (
                <button key={value} className={`pill${duration === value ? ' active-violet' : ''}`} onClick={() => setDuration(value)}>{label}</button>
              ))}
            </div>

            {/* Warning */}
            <div style={{ padding: '14px 18px', background: 'rgba(244,63,94,0.05)', border: '1px solid rgba(244,63,94,0.18)', marginBottom: 8 }}>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-2)', lineHeight: 1.7 }}>
                <strong style={{ color: 'var(--text)' }}>Real exam conditions:</strong> Questions are deliberately challenging and indirect — not simple recall. No MCQ. No True/False. You must write proper answers. No feedback until submission. Timer cannot be paused.
              </p>
            </div>
          </div>

          <div className="generate-bar">
            <button className="btn-primary" style={{ padding: '12px 28px', fontSize: '0.9rem' }} onClick={generateExam} disabled={!content.trim()}>
              Generate Exam Paper
            </button>
            {!content.trim() && <span style={{ fontSize: '0.78rem', color: 'var(--text-3)', fontFamily: 'DM Mono, monospace' }}>Paste content above to get started</span>}
          </div>
        </>
      )}

      {/* GENERATING */}
      {mode === 'generating' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '100px 40px', textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto 24px' }} />
          <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '1.6rem', color: 'var(--text)', marginBottom: 8 }}>Setting the exam paper...</h2>
          <p style={{ color: 'var(--text-2)', fontSize: '0.9rem' }}>Creating Section A, B, and C with challenging questions</p>
          <p style={{ color: 'var(--text-3)', fontSize: '0.78rem', marginTop: 8, fontFamily: 'DM Mono, monospace' }}>This takes 25–35 seconds</p>
        </div>
      )}

      {/* EXAM MODE */}
      {mode === 'exam' && exam && (
        <div style={{ padding: '0 40px 40px' }}>
          {/* Sticky bar */}
          <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--topbar-bg)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--topbar-bdr)', padding: '10px 0 10px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              {exam.sections.map(sec => {
                const attempted = getAttemptedCount(sec.section);
                const done = attempted >= sec.attempt;
                const isCurrent = currentSection === sec.section;
                const colors = { A: 'var(--orange)', B: 'var(--cyan)', C: 'var(--violet)' };
                return (
                  <button key={sec.section} onClick={() => { setCurrentSection(sec.section); setCurrentQIdx(0); }}
                    className="pill" style={{ borderColor: isCurrent ? colors[sec.section] : done ? 'var(--lime)' : undefined, color: isCurrent ? colors[sec.section] : done ? 'var(--lime)' : undefined, background: isCurrent ? `${colors[sec.section]}15` : undefined }}>
                    Sec {sec.section} · {attempted}/{sec.attempt}
                  </button>
                );
              })}
            </div>
            <div className={timerCls}>{formatTime(timeLeft)}</div>
            <button className="btn-primary btn-sm" onClick={handleSubmit}>Submit Exam</button>
          </div>

          {/* Section header */}
          {currentSectionData && (
            <div style={{ padding: '16px 20px', background: 'var(--panel-bg)', border: '1px solid var(--panel-bdr)', marginBottom: 16 }}>
              <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
                <div>
                  <div style={{ fontFamily: 'DM Serif Display, serif', fontSize: '1.2rem', color: 'var(--text)' }}>Section {currentSectionData.section}</div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-2)', marginTop: 2 }}>{currentSectionData.instruction}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.58rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.10em', marginBottom: 4 }}>Max marks</div>
                  <div style={{ fontFamily: 'DM Serif Display, serif', fontSize: '1.4rem', color: { A: 'var(--orange)', B: 'var(--cyan)', C: 'var(--violet)' }[currentSectionData.section] }}>
                    {currentSectionData.attempt * currentSectionData.marks_each}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {currentSectionData.questions.map((q, i) => {
                  const answered = answers[q.id]?.trim();
                  const isCur = i === currentQIdx;
                  return (
                    <button key={q.id} onClick={() => setCurrentQIdx(i)}
                      className={`pill${isCur ? ' active-orange' : answered ? ' active-lime' : ''}`}
                      style={{ padding: '5px 12px', fontSize: '0.72rem' }}>
                      Q{q.id}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Question */}
          {currentQ && (
            <div className="cpanel">
              <div className="flex gap-8 mb-16" style={{ flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontFamily: 'DM Serif Display, serif', fontSize: '1rem', color: 'var(--text)' }}>Q{currentQ.id}</span>
                <span className="badge badge-orange">{currentQ.marks} marks</span>
                {currentQ.topic && <span className="badge badge-cyan">{currentQ.topic}</span>}
                {currentQ.difficulty && <span className="badge badge-violet">{currentQ.difficulty}</span>}
              </div>

              <div style={{ fontSize: '1rem', fontWeight: 500, lineHeight: 1.7, color: 'var(--text)', marginBottom: 16 }}>{currentQ.question}</div>

              {currentQ.sub_parts && (
                <div style={{ marginBottom: 20 }}>
                  {currentQ.sub_parts.map((sp, si) => (
                    <div key={si} style={{ padding: '12px 16px', background: 'rgba(0,194,204,0.05)', border: '1px solid rgba(0,194,204,0.15)', marginBottom: 8, display: 'flex', gap: 14 }}>
                      <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.78rem', color: 'var(--cyan)', minWidth: 32, flexShrink: 0 }}>{sp.label}</span>
                      <div style={{ flex: 1, fontSize: '0.9rem', color: 'var(--text-2)', lineHeight: 1.6 }}>{sp.text}</div>
                      <span className="badge badge-cyan" style={{ flexShrink: 0, alignSelf: 'flex-start' }}>{sp.marks}m</span>
                    </div>
                  ))}
                </div>
              )}

              {currentQ.type === 'numerical' && (
                <div style={{ padding: '10px 14px', background: 'rgba(240,90,0,0.06)', border: '1px solid rgba(240,90,0,0.15)', marginBottom: 14, fontSize: '0.80rem', color: 'var(--orange)' }}>
                  Show all working. Write formulas, substitutions, and final answer with units. Marks awarded for correct method even if final answer differs.
                </div>
              )}

              <textarea className="content-area" style={{ minHeight: currentQ.sub_parts ? 180 : 130 }}
                placeholder={currentQ.sub_parts ? `Answer all sub-parts:\n${currentQ.sub_parts.map(sp => sp.label + ' ').join('\n')}` : 'Write your answer here...'}
                value={answers[currentQ.id] || ''} onChange={e => setAnswers(a => ({ ...a, [currentQ.id]: e.target.value }))} />

              <div className="flex justify-between mt-16">
                <button className="btn-secondary btn-sm" onClick={() => setCurrentQIdx(i => Math.max(0, i - 1))} disabled={currentQIdx === 0}>Prev</button>
                <span style={{ fontSize: '0.78rem', fontFamily: 'DM Mono, monospace', color: answers[currentQ.id]?.trim() ? 'var(--lime)' : 'var(--text-3)' }}>
                  {answers[currentQ.id]?.trim() ? 'Answered' : 'Not answered'}
                </span>
                <button className="btn-secondary btn-sm" onClick={() => setCurrentQIdx(i => Math.min(currentSectionData.questions.length - 1, i + 1))} disabled={currentQIdx === currentSectionData.questions.length - 1}>Next</button>
              </div>
            </div>
          )}

          {/* Attempt tracker */}
          <div style={{ padding: '14px 20px', background: 'var(--panel-bg)', border: '1px solid var(--panel-bdr)', marginTop: 14, display: 'flex', gap: 24 }}>
            {exam.sections.map(sec => {
              const attempted = getAttemptedCount(sec.section);
              return (
                <span key={sec.section} style={{ fontSize: '0.82rem', fontFamily: 'DM Mono, monospace' }}>
                  <span style={{ color: 'var(--text-3)' }}>Sec {sec.section}: </span>
                  <span style={{ color: attempted >= sec.attempt ? 'var(--lime)' : 'var(--orange)' }}>{attempted}/{sec.attempt}</span>
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* GRADING */}
      {mode === 'grading' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '100px 40px', textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto 24px' }} />
          <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '1.6rem', color: 'var(--text)', marginBottom: 8 }}>Grading your answers...</h2>
          <p style={{ color: 'var(--text-2)' }}>AI is evaluating all sections including numerical working</p>
        </div>
      )}

      {/* RESULTS */}
      {mode === 'results' && grading && (
        <div style={{ padding: '0 40px 48px', maxWidth: 820 }}>
          {/* Main result */}
          <div className="cpanel" style={{ textAlign: 'center', padding: '40px', marginBottom: 16, borderColor: grading.passed ? 'rgba(126,200,0,0.30)' : 'rgba(244,63,94,0.25)', background: grading.passed ? 'rgba(126,200,0,0.04)' : 'rgba(244,63,94,0.04)' }}>
            <div className={`result-score-big ${grading.passed ? 'result-pass' : 'result-fail'}`} style={{ marginBottom: 8 }}>
              {grading.percentage}%
            </div>
            <div style={{ fontFamily: 'DM Serif Display, serif', fontSize: '1.4rem', color: 'var(--text)', marginBottom: 4 }}>
              {grading.total_marks} / {grading.max_marks || 60} marks
            </div>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.14em', color: grading.passed ? 'var(--lime)' : '#f43f5e', marginBottom: 16 }}>
              {grading.passed ? 'Pass' : 'Fail'} · {grading.grade}
            </div>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-2)', lineHeight: 1.7, maxWidth: 480, margin: '0 auto' }}>{grading.overall_feedback}</p>
          </div>

          {/* Section scores */}
          {grading.section_scores && (
            <div className="section-cards" style={{ marginBottom: 16 }}>
              {Object.entries(grading.section_scores).map(([sec, data]) => {
                const pct = Math.round((data.marks_awarded / data.max_marks) * 100);
                const clsMap = { A: 'section-card-a', B: 'section-card-b', C: 'section-card-c' };
                const lblMap = { A: 'section-label-a', B: 'section-label-b', C: 'section-label-c' };
                const mrkMap = { A: 'section-marks-a', B: 'section-marks-b', C: 'section-marks-c' };
                return (
                  <div key={sec} className={`section-card ${clsMap[sec]}`} style={{ textAlign: 'center' }}>
                    <div className={`section-label ${lblMap[sec]}`}>Section {sec}</div>
                    <div className={`section-marks ${mrkMap[sec]}`} style={{ fontSize: '2rem' }}>{pct}%</div>
                    <div style={{ fontSize: '0.80rem', color: 'var(--text-2)', marginTop: 4 }}>{data.marks_awarded} / {data.max_marks} marks</div>
                    <div className="progress-track" style={{ marginTop: 10 }}>
                      <div className="progress-fill" style={{ width: `${pct}%`, background: pct >= 60 ? 'var(--lime)' : pct >= 40 ? 'var(--orange)' : '#f43f5e' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Per-question review */}
          <span className="sec-label">Question-by-Question Review</span>
          {exam.sections.map(sec => (
            <div key={sec.section} style={{ marginBottom: 20 }}>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.60rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 10, padding: '8px 0', borderBottom: '1px solid var(--panel-bdr)' }}>
                Section {sec.section} — {sec.instruction}
              </div>
              {sec.questions.map(q => {
                const r = grading.results?.find(r => r.id === q.id);
                if (!r) return null;
                const attempted = answers[q.id]?.trim();
                const good = r.marks_awarded >= q.marks * 0.5;
                return (
                  <div key={q.id} style={{ padding: '14px 18px', background: 'var(--panel-bg)', border: `1px solid ${good ? 'rgba(126,200,0,0.18)' : attempted ? 'rgba(244,63,94,0.15)' : 'var(--panel-bdr)'}`, marginBottom: 8 }}>
                    <div className="flex items-center gap-10 mb-6" style={{ flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.70rem', color: 'var(--orange)' }}>Q{q.id}</span>
                      <span style={{ fontSize: '0.88rem', flex: 1, color: 'var(--text)' }}>{q.question.slice(0, 100)}{q.question.length > 100 ? '...' : ''}</span>
                      <span style={{ fontWeight: 700, color: good ? 'var(--lime)' : '#f43f5e', fontFamily: 'DM Mono, monospace', fontSize: '0.80rem' }}>
                        {attempted ? `${r.marks_awarded}/${r.max_marks}` : 'Not attempted'}
                      </span>
                    </div>
                    {attempted && r.feedback && <p style={{ fontSize: '0.82rem', color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 8 }}>{r.feedback}</p>}
                    <details style={{ marginTop: 6 }}>
                      <summary style={{ fontSize: '0.78rem', color: 'var(--cyan)', cursor: 'pointer', fontFamily: 'DM Mono, monospace', letterSpacing: '0.04em' }}>View model answer</summary>
                      <div style={{ marginTop: 10, padding: '12px 16px', background: 'rgba(126,200,0,0.05)', border: '1px solid rgba(126,200,0,0.15)' }}>
                        <p style={{ fontSize: '0.84rem', color: 'var(--lime)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{q.correct_answer}</p>
                        {q.marking_scheme && <p style={{ fontSize: '0.76rem', color: 'var(--text-3)', marginTop: 8 }}>{q.marking_scheme}</p>}
                      </div>
                    </details>
                  </div>
                );
              })}
            </div>
          ))}

          <div className="flex gap-10">
            <button className="btn-primary" onClick={() => { setMode('setup'); setExam(null); setGrading(null); setContent(''); }}>New Exam</button>
            <button className="btn-secondary" onClick={() => { setAnswers({}); setCurrentSection('A'); setCurrentQIdx(0); setTimeLeft(duration * 60); setMode('exam'); }}>Retry Same Paper</button>
          </div>
        </div>
      )}
    </div>
  );
}
