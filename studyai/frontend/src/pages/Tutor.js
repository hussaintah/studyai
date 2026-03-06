import { useState, useRef, useEffect } from 'react';
import { API_URL } from '../lib/supabase';
import ContentInput from '../components/ContentInput';

const STARTERS = [
  'Explain the most important concepts',
  'What would likely appear on an exam?',
  'I am confused about this topic, explain it simply',
  'Give me 5 key things to remember',
];

export default function Tutor() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi, I\'m your AI tutor.\n\nPaste your study material in the panel on the right, then ask me anything. I\'ll explain concepts, work through problems step by step, and help you prepare for your exam.' }
  ]);
  const [input, setInput] = useState('');
  const [context, setContext] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showContext, setShowContext] = useState(true);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isTyping]);

  const send = async (text) => {
    const msg = text || input.trim(); if (!msg) return;
    setInput('');
    const newMessages = [...messages, { role: 'user', content: msg }];
    setMessages(newMessages); setIsTyping(true);
    try {
      const res = await fetch(`${API_URL}/api/ai/tutor`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages.map(m => ({ role: m.role, content: m.content })), context })
      });
      const reader = res.body.getReader(); const decoder = new TextDecoder(); let full = '';
      setIsTyping(false);
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
      while (true) {
        const { value, done } = await reader.read(); if (done) break;
        for (const line of decoder.decode(value).split('\n')) {
          if (line.startsWith('data: ')) {
            try { const d = JSON.parse(line.slice(6)); if (d.text) { full += d.text; setMessages(prev => { const u = [...prev]; u[u.length-1] = { role: 'assistant', content: full }; return u; }); } } catch {}
          }
        }
      }
    } catch {
      setIsTyping(false);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I\'m having trouble connecting. Try again in a moment.' }]);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '24px 40px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div>
          <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '2rem', letterSpacing: '-0.025em', color: 'var(--text)', marginBottom: 4 }}>AI Tutor</h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-2)' }}>Ask me anything about your study material</p>
        </div>
        <button className="btn-secondary btn-sm" onClick={() => setShowContext(c => !c)}>
          {showContext ? 'Hide' : 'Show'} Notes Panel
        </button>
      </div>

      <div className="chat-layout" style={{ padding: '0 40px 24px', flex: 1, minHeight: 0 }}>
        {/* Chat */}
        <div className="chat-main">
          <div className="chat-messages-wrap">
            {messages.map((msg, i) => (
              <div key={i} className={`chat-msg${msg.role === 'user' ? ' user' : ''}`}>
                <div className={`chat-avatar-wrap${msg.role === 'user' ? ' chat-avatar-user' : ' chat-avatar-ai'}`}>
                  {msg.role === 'user' ? 'U' : 'AI'}
                </div>
                <div className={`chat-bubble${msg.role === 'user' ? ' chat-bubble-user' : ' chat-bubble-ai'}`}>
                  {msg.content || <span style={{ opacity: 0.4 }}>...</span>}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="chat-msg">
                <div className="chat-avatar-wrap chat-avatar-ai">AI</div>
                <div className="chat-bubble chat-bubble-ai">
                  <div className="typing-dots">
                    <div className="typing-dot"/><div className="typing-dot"/><div className="typing-dot"/>
                  </div>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {messages.length <= 1 && (
            <div className="starter-btns">
              {STARTERS.map(s => <button key={s} className="starter-btn" onClick={() => send(s)}>{s}</button>)}
            </div>
          )}

          <div className="chat-input-row">
            <input
              className="chat-input"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Ask about your study material..."
              disabled={isTyping}
            />
            <button className="chat-send" onClick={() => send()} disabled={!input.trim() || isTyping}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <path d="M7 1v12M1 7l6-6 6 6"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Context panel */}
        {showContext && (
          <div className="context-panel">
            <div className="context-panel-hdr">
              <h3>Your Study Notes</h3>
              <p>Upload or paste your material — I'll answer questions specifically about it</p>
            </div>
            <div className="context-panel-body">
              <ContentInput value={context} onChange={setContext} label="Study Material" placeholder="Paste notes here..." />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
