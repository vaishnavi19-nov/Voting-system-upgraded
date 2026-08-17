import React from 'react';
import { CheckCircle2, Clock, ShieldCheck, AlertCircle } from 'lucide-react';

export default function ElectionHeader({ election, votingStatus, onNavigateStage }) {
  if (!election) return null;

  const isPresDone = votingStatus?.president;
  const isVpDone = votingStatus?.vicePresident;
  const isFullyDone = isPresDone && isVpDone;

  return (
    <div style={{ marginBottom: '2rem' }}>
      {/* Top Banner Status */}
      <div className="status-banner">
        <div>
          <div style={{ fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 700 }}>
            YOUR VOTING STATUS
          </div>
          <div className="status-items" style={{ marginTop: '0.4rem' }}>
            <div className={`status-chip ${isPresDone ? 'done' : 'pending'}`}>
              <CheckCircle2 size={16} />
              <span>CSESA President: {isPresDone ? 'Vote Submitted ✓' : '⏳ Not Voted'}</span>
            </div>

            <div className={`status-chip ${isVpDone ? 'done' : 'pending'}`}>
              <CheckCircle2 size={16} />
              <span>CSESA Vice President: {isVpDone ? 'Vote Submitted ✓' : '⏳ Not Voted'}</span>
            </div>
          </div>
        </div>

        {/* Action Button for Navigation if Partial */}
        {!isFullyDone && election.status === 'ACTIVE' && (
          <div>
            {!isPresDone ? (
              <button className="btn btn-primary" onClick={() => onNavigateStage('PRESIDENT')}>
                Cast CSESA President Vote →
              </button>
            ) : !isVpDone ? (
              <button className="btn btn-primary" onClick={() => onNavigateStage('VICE_PRESIDENT')}>
                Continue CSESA Vice President Vote →
              </button>
            ) : null}
          </div>
        )}
      </div>

      {/* Header Info Card */}
      <div className="glass-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1.5rem', flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--primary)', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
            <ShieldCheck size={16} />
            CSESA Official Election
          </div>
          <h2 style={{ fontSize: '1.85rem', fontWeight: 800 }}>{election.title}</h2>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem', fontSize: '0.95rem' }}>
            {election.description}
          </p>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{
            display: 'inline-block',
            padding: '0.35rem 0.85rem',
            borderRadius: '999px',
            fontSize: '0.82rem',
            fontWeight: 800,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            background: election.status === 'ACTIVE' ? 'rgba(16, 185, 129, 0.15)' : election.status === 'CLOSED' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
            color: election.status === 'ACTIVE' ? '#10B981' : election.status === 'CLOSED' ? '#EF4444' : '#F59E0B',
            border: `1px solid ${election.status === 'ACTIVE' ? 'rgba(16, 185, 129, 0.4)' : election.status === 'CLOSED' ? 'rgba(239, 68, 68, 0.4)' : 'rgba(245, 158, 11, 0.4)'}`
          }}>
            Status: {election.status}
          </div>

          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
            Ends: {new Date(election.endTime).toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
}
