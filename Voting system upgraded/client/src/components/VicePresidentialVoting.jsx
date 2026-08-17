import React, { useState } from 'react';
import { Vote, CheckCircle2, ShieldAlert, AlertTriangle, ArrowLeft } from 'lucide-react';

export default function VicePresidentialVoting({ positionData, onVoteSubmitted, electionId, apiBaseUrl, sessionId }) {
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!positionData) return null;

  const candidates = positionData.candidates || [];

  const handleSelectCandidate = (cand) => {
    setSelectedCandidate(cand);
    setShowConfirmModal(true);
    setErrorMsg('');
  };

  const handleConfirmVote = async () => {
    if (!selectedCandidate) return;
    setSubmitting(true);
    setErrorMsg('');

    try {
      const res = await fetch(`${apiBaseUrl}/api/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          electionId,
          positionId: positionData.id,
          candidateId: selectedCandidate.id,
          sessionId
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit vote');
      }

      setShowConfirmModal(false);
      onVoteSubmitted('VICE_PRESIDENT');
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {/* Section Title */}
      <div className="section-header">
        <div style={{ display: 'inline-block', color: 'var(--secondary)', fontWeight: 800, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          STEP 2 OF 2
        </div>
        <h2 className="section-title">Vote for Vice President</h2>
        <p className="section-subtitle">
          Examine the official Vice Presidential candidates below and cast your vote for Vice President.
        </p>
      </div>

      {/* Strict Results Hiding Banner */}
      <div className="privacy-alert">
        <ShieldAlert size={20} style={{ flexShrink: 0 }} />
        <div>
          <strong>Privacy Protocol Active:</strong> Candidate vote tallies and leaderboards are strictly hidden during active voting. Your vote choice is encrypted and confidential.
        </div>
      </div>

      {/* Candidate Cards Grid */}
      <div className="candidate-grid">
        {candidates.map((cand) => (
          <div
            key={cand.id}
            className={`candidate-card ${selectedCandidate?.id === cand.id ? 'selected' : ''}`}
          >
            <div className="candidate-header">
              <img
                src={cand.photo_url || cand.photoUrl}
                alt={cand.name}
                className="candidate-img"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80';
                }}
              />
              <div className="candidate-number-badge">
                Candidate #{cand.candidate_number || cand.candidateNumber}
              </div>
              <div className="candidate-party-badge" style={{ background: 'linear-gradient(135deg, var(--secondary), var(--primary))' }}>
                {cand.party_affiliation || cand.partyAffiliation || 'Independent'}
              </div>
            </div>

            <div className="candidate-body">
              <h3 className="candidate-name">{cand.name}</h3>
              <p className="candidate-desc">{cand.description}</p>

              <button
                className="btn btn-primary"
                style={{ width: '100%', background: 'linear-gradient(135deg, var(--secondary), #0284C7)' }}
                onClick={() => handleSelectCandidate(cand)}
              >
                <Vote size={18} />
                <span>Vote for {cand.name.split(' ')[0]}</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Confirmation Dialog Modal */}
      {showConfirmModal && selectedCandidate && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(6, 182, 212, 0.15)',
                border: '1px solid rgba(6, 182, 212, 0.3)',
                color: 'var(--secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Vote size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Confirm Vice Presidential Vote</h3>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Action cannot be undone</span>
              </div>
            </div>

            {errorMsg && (
              <div className="toast-msg toast-error">
                <ShieldAlert size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            <div style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '1.25rem',
              marginBottom: '1.5rem',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                You are casting your vote for:
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--secondary)' }}>
                {selectedCandidate.name}
              </div>
              <div style={{ fontSize: '0.88rem', color: 'var(--primary)', fontWeight: 600, marginTop: '0.2rem' }}>
                Candidate #{selectedCandidate.candidate_number || selectedCandidate.candidateNumber} — {selectedCandidate.party_affiliation || selectedCandidate.partyAffiliation}
              </div>

              <div style={{
                marginTop: '1rem',
                fontSize: '0.88rem',
                color: '#FBBF24',
                fontWeight: 600,
                background: 'rgba(245, 158, 11, 0.1)',
                padding: '0.6rem 0.8rem',
                borderRadius: 'var(--radius-sm)'
              }}>
                Are you sure you want to vote for <strong>{selectedCandidate.name}</strong> for Vice President? You cannot change your vote after submission.
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                className="btn btn-secondary"
                style={{ flex: 1 }}
                onClick={() => setShowConfirmModal(false)}
                disabled={submitting}
              >
                <ArrowLeft size={16} />
                <span>Go Back</span>
              </button>

              <button
                className="btn btn-primary"
                style={{ flex: 1, background: 'linear-gradient(135deg, var(--secondary), #0284C7)' }}
                onClick={handleConfirmVote}
                disabled={submitting}
              >
                {submitting ? 'Recording Vote...' : 'Confirm Vote'}
                <CheckCircle2 size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
