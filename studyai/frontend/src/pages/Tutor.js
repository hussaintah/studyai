import { useState, useRef, useEffect } from 'react';
import { API_URL } from '../lib/supabase';
import ContentInput from '../components/ContentInput';

export default function Tutor() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hi! I'm your AI tutor 🤖\n\nPaste your study material in the panel on the right, then ask me anything. I'll explain concepts, work through problems step by step, and help you prepare for your exam." }
  ]);
  const [input, setInput] = useState('');
  const [context, setContext] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showContext, setShowContext] = useState(true);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isTyping]);

  const send = async (text) => {
    const msg = text || input.trim();
    if (!msg) return;
    setInput('');
    const newMessages = [...messages, { role: 'user', content: msg }];
    setMessages(newMessages);
    setIsTyping(true);

    try {
      const res = await fetch(`${API_URL}/api/ai/tutor`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages.map(m => ({ role: m.role, content: m.content })), context })
      });
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = '';
      setIsTyping(false);
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value).split('\n')) {
          if (line.startsWith('data: ')) {
            try {
              const d = JSON.parse(line.slice(6));
              if (d.text) { full += d.text; setMessages(prev => { const u = [...prev]; u[u.length - 1] = { role: 'assistant', content: full }; return u; }); }
            } catch {}
          }
        }
      }
    } catch {
      setIsTyping(false);
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I'm having trouble connecting. Try again in a moment." }]);
    }
  };

  const STARTERS = ["Explain the most important concepts", "What would likely appear on an exam?", "I'm confused about this topic, explain it simply", "Give me 5 key things to remember"];

  return (
    <div>
      <div className="flex items-center justify-between mb-20">
        <div>
          <h1 style={{ fontFamily: 'Syne', fontSize: 24, fontWeight: 700 }}>AI Tutor 🤖</h1>
          <p className="text-muted">Ask me anything about your study material</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => setShowContext(c => !c)}>
          {showContext ? 'Hide' : 'Show'} Notes Panel
        </button>
      </div>

      <div style={{ display: 'flex', gap: 16, height: 'calc(100vh - 175px)' }}>
        {/* Chat */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div className="card" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: 0 }}>
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
              <div className="chat-messages">
                {messages.map((msg, i) => (
                  <div key={i} className={`chat-msg ${msg.role === 'user' ? 'user' : 'ai'}`}>
                    {msg.role === 'assistant' && <div className="chat-avatar">🤖</div>}
                    <div className="chat-bubble">{msg.content || <span style={{ opacity: 0.4 }}>...</span>}</div>
                  </div>
                ))}
                {isTyping && (
                  <div className="chat-msg ai">
                    <div className="chat-avatar">🤖</div>
                    <div className="chat-bubble"><div className="typing"><div className="typing-dot" /><div className="typing-dot" /><div className="typing-dot" /></div></div>
                  </div>
                )}
                <div ref={endRef} />
              </div>
            </div>

            {messages.length <= 1 && (
              <div style={{ padding: '0 16px 10px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {STARTERS.map(s => (
                  <button key={s} onClick={() => send(s)} style={{ padding: '6px 12px', borderRadius: 50, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text2)', cursor: 'pointer', fontFamily: 'Outfit', fontSize: 12, transition: 'all 0.15s' }}>{s}</button>
                ))}
              </div>
            )}

            <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
              <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder="Ask about your study material..." style={{ flex: 1, padding: '9px 14px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontFamily: 'Outfit', fontSize: 14, outline: 'none' }} disabled={isTyping} />
              <button className="btn btn-primary" onClick={() => send()} disabled={!input.trim() || isTyping} style={{ padding: '9px 14px' }}>↑</button>
            </div>
          </div>
        </div>

        {/* Context panel */}
        {showContext && (
          <div style={{ width: 290, flexShrink: 0 }}>
            <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <p style={{ fontFamily: 'Syne', fontWeight: 600, marginBottom: 4, fontSize: 14 }}>📄 Your Study Notes</p>
              <p className="text-muted mb-12" style={{ fontSize: 12 }}>Upload or paste your material — I'll answer questions specifically about it</p>
              <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <ContentInput value={context} onChange={setContext} label="Study Material" placeholder="Paste notes here..." />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
