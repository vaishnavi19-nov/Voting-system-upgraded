import React, { useState, useEffect } from 'react';
import { Vote, LogOut, Clock, ShieldCheck } from 'lucide-react';

export default function Navbar({ admin, election, onAdminLogout, onShowAdminLogin, onShowResults, activeStage }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (!election) return;

    const updateTimer = () => {
      const now = new Date();
      const startTime = new Date(election.startTime);
      const endTime = new Date(election.endTime);

      if (election.status === 'NOT_STARTED' || now < startTime) {
        const diff = Math.max(0, startTime - now);
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const mins = Math.floor((diff / 1000 / 60) % 60);
        const secs = Math.floor((diff / 1000) % 60);
        setTimeLeft(`Starts in: ${days > 0 ? `${days}d ` : ''}${String(hours).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m ${String(secs).padStart(2, '0')}s`);
      } else if (election.status === 'ACTIVE' && now < endTime) {
        const diff = Math.max(0, endTime - now);
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const mins = Math.floor((diff / 1000 / 60) % 60);
        const secs = Math.floor((diff / 1000) % 60);
        setTimeLeft(`Voting closes in: ${String(hours).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m ${String(secs).padStart(2, '0')}s`);
      } else {
        setTimeLeft('Voting Closed');
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [election]);

  const getStatusClass = () => {
    if (!election) return '';
    if (election.status === 'ACTIVE') return 'active';
    if (election.status === 'CLOSED') return 'closed';
    return 'not-started';
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <div className="brand-icon">
          <Vote size={24} />
        </div>
        <div>
          <span>CSESA</span>
          <span style={{ fontSize: '0.75rem', display: 'block', color: 'var(--text-muted)', fontWeight: 600 }}>
            Election Poll 2026
          </span>
        </div>
      </div>

      <div className="nav-actions">
        {election && (
          <div className={`timer-pill ${getStatusClass()}`}>
            <span className="pulse-dot"></span>
            <Clock size={15} />
            <span>{timeLeft}</span>
          </div>
        )}

        {admin ? (
          /* Admin is logged in — show their info and logout */
          <>
            <div className="user-badge">
              <div className="avatar-circle" style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)' }}>
                {admin.name ? admin.name.charAt(0) : 'A'}
              </div>
              <div>
                <span style={{ fontWeight: 700, display: 'block', fontSize: '0.85rem' }}>{admin.name}</span>
                <span style={{ fontSize: '0.72rem', color: '#FBBF24' }}>⚡ Administrator</span>
              </div>
            </div>

            <button
              className="btn btn-secondary"
              onClick={onAdminLogout}
              title="Logout Admin"
              style={{ padding: '0.45rem 0.8rem', fontSize: '0.82rem' }}
            >
              <LogOut size={14} />
              <span>Logout</span>
            </button>
          </>
        ) : (
          /* No admin — show subtle admin access button for election officers */
          activeStage !== 'ADMIN_LOGIN' && (
            <button
              className="btn btn-secondary"
              onClick={onShowAdminLogin}
              title="Admin Access"
              style={{
                padding: '0.4rem 0.75rem',
                fontSize: '0.78rem',
                opacity: 0.55,
                border: '1px solid rgba(245,158,11,0.3)',
                color: '#FBBF24'
              }}
            >
              <ShieldCheck size={13} />
              <span>Admin</span>
            </button>
          )
        )}
      </div>
    </nav>
  );
}
