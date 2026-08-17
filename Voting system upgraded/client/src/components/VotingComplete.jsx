import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { CheckCircle2, Lock, Award, RotateCcw } from 'lucide-react';

export default function VotingComplete({ votingStatus, onNextVoter }) {
  useEffect(() => {
    // Fire celebratory confetti effect on voting complete!
    confetti({
      particleCount: 100,
      spread: 80,
      origin: { y: 0.6 }
    });
  }, []);

  return (
    <div style={{ maxWidth: '680px', margin: '2rem auto', textAlign: 'center' }}>
      <div className="glass-card" style={{ padding: '3rem 2rem' }}>
        <div style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #10B981, #059669)',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.5rem',
          boxShadow: '0 8px 25px rgba(16, 185, 129, 0.4)'
        }}>
          <CheckCircle2 size={48} />
        </div>

        <h2 style={{ fontSize: '2.25rem', fontWeight: 800, marginBottom: '0.5rem' }}>
          Voting Complete <span style={{ color: '#10B981' }}>✓</span>
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', marginBottom: '2rem' }}>
          Thank you for participating in the official election. Your votes have been securely recorded.
        </p>

        {/* Voting Status Receipt Checklist */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.5rem',
          marginBottom: '2rem',
          textAlign: 'left'
        }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>
            OFFICIAL ELECTION RECEIPT
          </div>

          <div style={{ display: 'grid', gap: '0.85rem' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.85rem 1rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              color: '#34D399',
              fontWeight: 700
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Award size={18} />
                CSESA President Vote
              </span>
              <span>Submitted ✓</span>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.85rem 1rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              color: '#34D399',
              fontWeight: 700
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Award size={18} />
                CSESA Vice President Vote
              </span>
              <span>Submitted ✓</span>
            </div>
          </div>

          <div style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--text-dim)', textAlign: 'center' }}>
            Votes cryptographically recorded &bull; Server timestamp applied
          </div>
        </div>

        {/* Privacy Note */}
        <div style={{
          background: 'rgba(99, 102, 241, 0.08)',
          border: '1px solid rgba(99, 102, 241, 0.25)',
          borderRadius: 'var(--radius-md)',
          padding: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          fontSize: '0.88rem',
          color: '#A5B4FC',
          textAlign: 'left',
          marginBottom: '2rem'
        }}>
          <Lock size={20} style={{ flexShrink: 0 }} />
          <div>
            <strong>Strict Confidentiality Enforced:</strong> Per election rules, no candidate vote counts or standings are displayed until the election officially closes. Final results will be available automatically after closure.
          </div>
        </div>

        {/* Next Voter Button */}
        <button
          className="btn btn-primary"
          style={{ fontSize: '1.05rem', padding: '0.85rem 2.5rem', width: '100%' }}
          onClick={onNextVoter}
        >
          <RotateCcw size={18} />
          Ready for Next Voter
        </button>
        <p style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
          Click above to reset the voting booth for the next voter
        </p>
      </div>
    </div>
  );
}
