import React, { useState } from 'react';
import { ShieldCheck, KeyRound, ArrowRight, ShieldAlert, X } from 'lucide-react';

export default function AdminLogin({ onLoginSuccess, apiBaseUrl, onCancel }) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch(`${apiBaseUrl}/api/auth/admin-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password })
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

  return (
    <div style={{ maxWidth: '460px', margin: '3rem auto' }}>
      <div className="glass-card" style={{ padding: '2.5rem' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(217, 119, 6, 0.2))',
              border: '1px solid rgba(245, 158, 11, 0.4)',
              color: '#FBBF24',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <ShieldCheck size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '0.1rem' }}>Admin Access</h2>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Restricted — Authorized Personnel Only</span>
            </div>
          </div>

          {onCancel && (
            <button
              className="btn btn-secondary"
              style={{ padding: '0.4rem 0.7rem' }}
              onClick={onCancel}
              title="Back to Voting Station"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {errorMsg && (
          <div className="toast-msg toast-error" style={{ marginBottom: '1.25rem' }}>
            <ShieldAlert size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleAdminLogin}>
          <div className="form-group">
            <label className="form-label">Admin ID or Email</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. ADMIN-001 or admin@election.org"
              value={identifier}
              onChange={e => setIdentifier(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">Admin Password</label>
            <input
              type="password"
              className="form-input"
              placeholder="Enter admin password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{
              width: '100%',
              marginTop: '1.25rem',
              background: 'linear-gradient(135deg, #F59E0B, #D97706)',
              padding: '0.85rem'
            }}
            disabled={loading}
          >
            <KeyRound size={16} />
            {loading ? 'Authenticating...' : 'Access Admin Dashboard'}
            <ArrowRight size={16} />
          </button>
        </form>

        <div style={{
          marginTop: '1.5rem',
          padding: '0.85rem 1rem',
          background: 'rgba(245, 158, 11, 0.06)',
          border: '1px solid rgba(245, 158, 11, 0.2)',
          borderRadius: 'var(--radius-md)',
          fontSize: '0.8rem',
          color: 'var(--text-dim)',
          textAlign: 'center'
        }}>
          🔐 This area is restricted to election administrators only.<br />
          Unauthorized access is prohibited.
        </div>
      </div>
    </div>
  );
}
