import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

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
      if (error) setError(error.message); else navigate('/');
    } else {
      const { error } = await signUp(email, password, name);
      if (error) setError(error.message);
      else setMsg('Account created! Sign in below.');
    }
    setLoading(false);
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div style={{ fontSize: 38, marginBottom: 6 }}>📚</div>
          <h1>StudyAI</h1>
          <p>Intelligent Study Assistant</p>
        </div>
        <div className="auth-tabs">
          <div className={`auth-tab ${tab === 'signin' ? 'active' : ''}`} onClick={() => setTab('signin')}>Sign In</div>
          <div className={`auth-tab ${tab === 'signup' ? 'active' : ''}`} onClick={() => setTab('signup')}>Sign Up</div>
        </div>
        <form onSubmit={submit}>
          {tab === 'signup' && (
            <div className="form-group"><label>Full Name</label><input type="text" placeholder="Your name" value={name} onChange={e => setName(e.target.value)} required /></div>
          )}
          <div className="form-group"><label>Email</label><input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required /></div>
          <div className="form-group"><label>Password</label><input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required /></div>
          {error && <p style={{ color: 'var(--rose)', fontSize: 13, marginBottom: 10 }}>{error}</p>}
          {msg && <p style={{ color: 'var(--emerald)', fontSize: 13, marginBottom: 10, padding: '8px', background: 'rgba(16,185,129,0.1)', borderRadius: 6 }}>{msg}</p>}
          <button className="btn btn-primary w-full" type="submit" disabled={loading} style={{ justifyContent: 'center', width: '100%' }}>
            {loading ? 'Please wait...' : tab === 'signin' ? 'Sign In' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
}
