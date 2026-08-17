import React, { useState, useEffect } from 'react';
import { ShieldCheck, Vote, Lock, UserCheck, KeyRound, Sparkles, ArrowRight, ShieldAlert } from 'lucide-react';

export default function LandingLogin({ onLoginSuccess, apiBaseUrl }) {
  const [activeTab, setActiveTab] = useState('VOTER'); // 'VOTER' | 'ADMIN'
  
  // Voter form state
  const [voterIdInput, setVoterIdInput] = useState('');
  const [voterPasswordInput, setVoterPasswordInput] = useState('');
  
  // Admin form state
  const [adminIdentifierInput, setAdminIdentifierInput] = useState('');
  const [adminPasswordInput, setAdminPasswordInput] = useState('');

  const [demoAccounts, setDemoAccounts] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetch(`${apiBaseUrl}/api/auth/demo-accounts`)
      .then(res => res.json())
      .then(data => setDemoAccounts(data))
      .catch(err => console.error('Failed to fetch demo accounts:', err));
  }, [apiBaseUrl]);

  const handleVoterLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch(`${apiBaseUrl}/api/auth/voter-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voterId: voterIdInput, password: voterPasswordInput })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      onLoginSuccess(data.token, data.user);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch(`${apiBaseUrl}/api/auth/admin-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: adminIdentifierInput, password: adminPasswordInput })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Admin login failed');
      onLoginSuccess(data.token, data.user);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const quickFillVoter = (voterId) => {
    setVoterIdInput(voterId);
    setVoterPasswordInput('voter123');
    setActiveTab('VOTER');
  };

  const quickFillAdmin = () => {
    setAdminIdentifierInput('ADMIN-001');
    setAdminPasswordInput('admin123');
    setActiveTab('ADMIN');
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '1.5rem auto' }}>
      {/* Hero Header */}
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          background: 'rgba(99, 102, 241, 0.12)',
          border: '1px solid rgba(99, 102, 241, 0.3)',
          padding: '0.4rem 1rem',
          borderRadius: '999px',
          color: '#A5B4FC',
          fontSize: '0.85rem',
          fontWeight: 600,
          marginBottom: '1rem'
        }}>
          <Sparkles size={16} />
          <span>Cryptographically Secured Dual Election Platform</span>
        </div>

        <h1 style={{ fontSize: '2.75rem', fontWeight: 800, marginBottom: '0.75rem' }}>
          Dual Election Voting System
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', maxWidth: '680px', margin: '0 auto' }}>
          Cast 1 vote for <strong style={{ color: 'var(--text-main)' }}>President</strong> and 1 vote for <strong style={{ color: 'var(--text-main)' }}>Vice President</strong>. Live tallies remain strictly confidential until election closure.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '2rem' }}>
        {/* Left Side: System Highlights */}
        <div className="glass-card">
          <h3 style={{ fontSize: '1.25rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <ShieldCheck style={{ color: 'var(--primary)' }} />
            Official Election Parameters & Rules
          </h3>

          <div style={{ display: 'grid', gap: '1rem' }}>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--primary)', marginBottom: '0.2rem' }}>
                1. Dual Position Voting
              </div>
              <div style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                Every voter can cast 1 Presidential vote and 1 Vice Presidential vote (max 2 votes total). Voting for each position is independent.
              </div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--secondary)', marginBottom: '0.2rem' }}>
                2. Partial Voting Support
              </div>
              <div style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                You can cast one vote, leave, and return later to complete the remaining position before the deadline.
              </div>
            </div>

            <div style={{ background: 'rgba(239, 68, 68, 0.08)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(239, 68, 68, 0.25)' }}>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#FCA5A5', marginBottom: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Lock size={15} />
                3. Strict Results Masking
              </div>
              <div style={{ fontSize: '0.88rem', color: '#FECACA' }}>
                No live counts, percentages, or standings are exposed during voting. Final results are automatically unlocked when the election closes.
              </div>
            </div>
          </div>

          {/* Quick Demo Switcher Section */}
          <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              ⚡ Quick Demo Credentials (Click to Autofill)
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {demoAccounts?.sampleVoters?.slice(0, 4).map((v, idx) => (
                <button
                  key={v.voter_id}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
                  onClick={() => quickFillVoter(v.voter_id)}
                >
                  <UserCheck size={13} />
                  <span>Voter {idx + 1} ({v.voter_id})</span>
                </button>
              ))}

              <button
                className="btn btn-secondary"
                style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem', borderColor: 'rgba(245, 158, 11, 0.4)', color: '#FBBF24' }}
                onClick={quickFillAdmin}
              >
                <KeyRound size={13} />
                <span>Admin (ADMIN-001)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Login Form */}
        <div className="glass-card" style={{ padding: '2rem' }}>
          <div className="tabs-container" style={{ marginBottom: '1.5rem' }}>
            <button
              className={`tab-btn ${activeTab === 'VOTER' ? 'active' : ''}`}
              onClick={() => setActiveTab('VOTER')}
              style={{ flex: 1, textAlign: 'center' }}
            >
              Voter Login
            </button>
            <button
              className={`tab-btn ${activeTab === 'ADMIN' ? 'active' : ''}`}
              onClick={() => setActiveTab('ADMIN')}
              style={{ flex: 1, textAlign: 'center' }}
            >
              Admin Access
            </button>
          </div>

          {errorMsg && (
            <div className="toast-msg toast-error">
              <ShieldAlert size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {activeTab === 'VOTER' ? (
            <form onSubmit={handleVoterLogin}>
              <div className="form-group">
                <label className="form-label">Voter ID or Registered Email</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. VTR-1001 or voter1@election.org"
                  value={voterIdInput}
                  onChange={e => setVoterIdInput(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="Enter password"
                  value={voterPasswordInput}
                  onChange={e => setVoterPasswordInput(e.target.value)}
                  required
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'block', marginTop: '0.25rem' }}>
                  Default password for demo voters: <code>voter123</code>
                </span>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} disabled={loading}>
                {loading ? 'Authenticating...' : 'Enter Voting Booth'}
                <ArrowRight size={16} />
              </button>
            </form>
          ) : (
            <form onSubmit={handleAdminLogin}>
              <div className="form-group">
                <label className="form-label">Admin ID or Email</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. ADMIN-001 or admin@election.org"
                  value={adminIdentifierInput}
                  onChange={e => setAdminIdentifierInput(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Admin Password</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="Enter admin password"
                  value={adminPasswordInput}
                  onChange={e => setAdminPasswordInput(e.target.value)}
                  required
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'block', marginTop: '0.25rem' }}>
                  Default admin password: <code>admin123</code>
                </span>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem', background: 'linear-gradient(135deg, #F59E0B, #D97706)' }} disabled={loading}>
                {loading ? 'Authenticating...' : 'Access Admin Dashboard'}
                <ArrowRight size={16} />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
