import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const friendlyError = (msg) => {
  if (!msg) return msg;
  if (msg.includes('Invalid login credentials')) return 'Incorrect email or password.';
  if (msg.includes('Email not confirmed')) return 'Please confirm your email before signing in.';
  if (msg.includes('already registered')) return 'An account with this email already exists.';
  if (msg.includes('Password should be') || msg.includes('password')) return 'Password must be at least 6 characters.';
  if (msg.includes('rate limit') || msg.includes('429')) return 'Too many attempts — please wait a moment.';
  return msg;
};

export default function Auth() {
  const [tab, setTab] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setMsg(''); setLoading(true);
    if (tab === 'signin') {
      const { error } = await signIn(email, password);
      if (error) setError(friendlyError(error.message)); else navigate('/');
    } else {
      const { error } = await signUp(email, password, name);
      if (error) setError(friendlyError(error.message));
      else { setMsg('Account created! Sign in below.'); setTab('signin'); }
    }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      backgroundImage: 'var(--bg-grad)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Instrument Sans', sans-serif",
      padding: '24px',
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>

        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            width: 44, height: 44,
            background: 'var(--orange)',
            boxShadow: '0 0 28px rgba(240,90,0,0.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <svg viewBox="0 0 20 20" fill="white" width="22" height="22">
              <rect x="2" y="2" width="7" height="7"/>
              <rect x="11" y="2" width="7" height="7"/>
              <rect x="2" y="11" width="7" height="7"/>
              <rect x="11" y="11" width="7" height="7"/>
            </svg>
          </div>
          <h1 style={{
            fontFamily: "'DM Serif Display', serif",
            fontSize: '2rem',
            letterSpacing: '-0.025em',
            color: 'var(--text)',
            marginBottom: 6,
          }}>StudyAI</h1>
          <p style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: '0.60rem',
            textTransform: 'uppercase',
            letterSpacing: '0.18em',
            color: 'var(--text-3)',
          }}>Intelligent Study Assistant</p>
        </div>

        {/* Card */}
        <div style={{
          background: 'var(--panel-bg)',
          backdropFilter: 'blur(24px) saturate(1.4)',
          WebkitBackdropFilter: 'blur(24px) saturate(1.4)',
          border: '1px solid var(--panel-bdr-o)',
          padding: '32px 36px',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* left accent bar */}
          <div style={{
            position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
            background: 'linear-gradient(180deg, var(--orange) 0%, var(--orange-2) 60%, transparent 100%)',
          }} />

          {/* Tab switcher */}
          <div style={{
            display: 'flex',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid var(--panel-bdr)',
            marginBottom: 28,
          }}>
            {['signin', 'signup'].map(t => (
              <button
                key={t}
                onClick={() => { setTab(t); setError(''); setMsg(''); }}
                style={{
                  flex: 1,
                  padding: '9px 0',
                  background: tab === t ? 'var(--orange)' : 'transparent',
                  border: 'none',
                  color: tab === t ? '#fff' : 'var(--text-3)',
                  fontFamily: "'DM Mono', monospace",
                  fontSize: '0.65rem',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  fontWeight: tab === t ? 600 : 400,
                }}
              >
                {t === 'signin' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>

          <form onSubmit={submit}>
            {tab === 'signup' && (
              <div className="form-group">
                <label>Full Name</label>
                <input type="text" placeholder="Your name" value={name}
                  onChange={e => setName(e.target.value)} required autoFocus />
              </div>
            )}

            <div className="form-group">
              <label>Email</label>
              <input type="email" placeholder="you@university.ac.uk" value={email}
                onChange={e => setEmail(e.target.value)} required
                autoFocus={tab === 'signin'} />
            </div>

            <div className="form-group" style={{ marginBottom: error || msg ? 12 : 24 }}>
              <label>Password</label>
              <input type="password"
                placeholder={tab === 'signup' ? 'Min. 6 characters' : 'Password'}
                value={password} onChange={e => setPassword(e.target.value)} required />
            </div>

            {error && (
              <div style={{
                padding: '10px 14px', marginBottom: 18,
                background: 'rgba(244,63,94,0.08)',
                borderLeft: '3px solid #f43f5e',
              }}>
                <p style={{ fontSize: '0.80rem', color: '#f43f5e', lineHeight: 1.5 }}>{error}</p>
              </div>
            )}

            {msg && (
              <div style={{
                padding: '10px 14px', marginBottom: 18,
                background: 'rgba(126,200,0,0.08)',
                borderLeft: '3px solid var(--lime)',
              }}>
                <p style={{ fontSize: '0.80rem', color: 'var(--lime)', lineHeight: 1.5 }}>{msg}</p>
              </div>
            )}

            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '13px',
              background: loading ? 'rgba(240,90,0,0.5)' : 'var(--orange)',
              border: 'none', color: '#fff',
              fontFamily: "'Instrument Sans', sans-serif",
              fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.03em',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s',
              boxShadow: loading ? 'none' : '0 0 22px rgba(240,90,0,0.35)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              {loading ? (
                <>
                  <span style={{
                    width: 13, height: 13,
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: '#fff', borderRadius: '50%',
                    display: 'inline-block',
                    animation: 'spin 0.7s linear infinite',
                  }} />
                  Please wait...
                </>
              ) : (
                tab === 'signin' ? 'Sign In →' : 'Create Account →'
              )}
            </button>
          </form>

          {/* Switch hint */}
          <p style={{
            textAlign: 'center', marginTop: 20,
            fontFamily: "'DM Mono', monospace",
            fontSize: '0.60rem', letterSpacing: '0.06em',
            color: 'var(--text-3)',
          }}>
            {tab === 'signin' ? 'No account? ' : 'Already have one? '}
            <span
              onClick={() => { setTab(tab === 'signin' ? 'signup' : 'signin'); setError(''); setMsg(''); }}
              style={{ color: 'var(--orange)', cursor: 'pointer', textDecoration: 'underline' }}
            >
              {tab === 'signin' ? 'Sign up free' : 'Sign in'}
            </span>
          </p>
        </div>

        {/* Footer */}
        <p style={{
          textAlign: 'center', marginTop: 20,
          fontFamily: "'DM Mono', monospace",
          fontSize: '0.55rem', letterSpacing: '0.10em',
          textTransform: 'uppercase', color: 'var(--text-4)',
        }}>
          AI-powered · Supabase auth · Your data stays yours
        </p>

      </div>
    </div>
  );
}
