import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import AdminLogin from './components/AdminLogin';
import ElectionHeader from './components/ElectionHeader';
import PresidentialVoting from './components/PresidentialVoting';
import VicePresidentialVoting from './components/VicePresidentialVoting';
import VotingComplete from './components/VotingComplete';
import ResultsDashboard from './components/ResultsDashboard';
import AdminDashboard from './components/AdminDashboard';
import { BarChart3 } from 'lucide-react';

const API_BASE_URL = 'https://voting-system-upgraded.onrender.com';

export default function App() {
  // Admin state
  const [admin, setAdmin] = useState(() => {
    const saved = localStorage.getItem('admin_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [adminToken, setAdminToken] = useState(() => localStorage.getItem('admin_token') || null);

  // Voting session state (no login required for voters)
  const [sessionId, setSessionId] = useState(null);
  const [votingStatus, setVotingStatus] = useState({ president: false, vicePresident: false });

  const [election, setElection] = useState(null);
  // Stages: 'VOTING_STATION' | 'PRESIDENT' | 'VICE_PRESIDENT' | 'COMPLETE' | 'RESULTS' | 'ADMIN' | 'ADMIN_LOGIN'
  const [activeStage, setActiveStage] = useState('VOTING_STATION');
  const [electionLoading, setElectionLoading] = useState(true);

  // Fetch election data on mount and periodically
  useEffect(() => {
    fetchElectionData();
    const interval = setInterval(fetchElectionData, 10000);
    return () => clearInterval(interval);
  }, []);

  // Handle admin session restore
  useEffect(() => {
    if (adminToken && admin) {
      setActiveStage('ADMIN');
    }
  }, []);

  const fetchElectionData = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/election`);
      const data = await res.json();
      if (res.ok) {
        setElection(data);
      }
    } catch (err) {
      console.error('Failed to fetch election:', err);
    } finally {
      setElectionLoading(false);
    }
  };

  // Create a new voting session for each voter (or resume an active one)
  const startNewVotingSession = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/session`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setSessionId(data.sessionId);
        setVotingStatus({ president: data.presidentVoted, vicePresident: data.vicePresidentVoted });

        if (data.presidentVoted && !data.vicePresidentVoted) {
          setActiveStage('VICE_PRESIDENT');
        } else if (data.presidentVoted && data.vicePresidentVoted) {
          setActiveStage('COMPLETE');
        } else {
          setActiveStage('PRESIDENT');
        }
      } else {
        console.error('Failed to start session:', data.error);
      }
    } catch (err) {
      console.error('Session creation error:', err);
    }
  };

  const handleAdminLoginSuccess = (token, loggedInAdmin) => {
    setAdminToken(token);
    setAdmin(loggedInAdmin);
    localStorage.setItem('admin_token', token);
    localStorage.setItem('admin_user', JSON.stringify(loggedInAdmin));
    setActiveStage('ADMIN');
  };

  const handleAdminLogout = () => {
    setAdmin(null);
    setAdminToken(null);
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    setActiveStage('VOTING_STATION');
  };

  const handleVoteSubmitted = async (positionName) => {
    if (!sessionId) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/session/${sessionId}/status`);
      const data = await res.json();
      if (res.ok) {
        const newStatus = {
          president: data.presidentVoted,
          vicePresident: data.vicePresidentVoted
        };
        setVotingStatus(newStatus);

        if (positionName === 'PRESIDENT' && !data.vicePresidentVoted) {
          setActiveStage('VICE_PRESIDENT');
        } else if (data.presidentVoted && data.vicePresidentVoted) {
          setActiveStage('COMPLETE');
        }
      }
    } catch (err) {
      console.error('Failed to fetch session status:', err);
    }
  };

  // Reset for the next voter
  const handleNextVoter = () => {
    setSessionId(null);
    setVotingStatus({ president: false, vicePresident: false });
    setActiveStage('VOTING_STATION');
  };

  const getPresPositionData = () => {
    return election?.positions?.find(p => p.name === 'PRESIDENT');
  };

  const getVpPositionData = () => {
    return election?.positions?.find(p => p.name === 'VICE_PRESIDENT');
  };

  const isElectionActive = election?.status === 'ACTIVE';
  const isElectionClosed = election?.status === 'CLOSED';

  return (
    <div className="app-container">
      <Navbar
        admin={admin}
        election={election}
        onAdminLogout={handleAdminLogout}
        onShowAdminLogin={() => setActiveStage('ADMIN_LOGIN')}
        onShowAdminDashboard={() => setActiveStage('ADMIN')}
        onShowResults={() => setActiveStage('RESULTS')}
        activeStage={activeStage}
      />

      <main className="main-content">
        {/* Results banner when election is closed */}
        {isElectionClosed && activeStage !== 'ADMIN' && activeStage !== 'ADMIN_LOGIN' && (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
            <button
              className={`btn ${activeStage === 'RESULTS' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveStage('RESULTS')}
            >
              <BarChart3 size={18} />
              <span>View Final Election Results</span>
            </button>
          </div>
        )}

        {/* ── VOTING STATION (Welcome Screen) ── */}
        {activeStage === 'VOTING_STATION' && (
          <VotingStationWelcome
            election={election}
            electionLoading={electionLoading}
            isElectionActive={isElectionActive}
            isElectionClosed={isElectionClosed}
            onStartVoting={startNewVotingSession}
            onViewResults={() => setActiveStage('RESULTS')}
          />
        )}

        {/* ── VOTING FLOW ── */}
        {(activeStage === 'PRESIDENT' || activeStage === 'VICE_PRESIDENT') && (
          <>
            <ElectionHeader
              election={election}
              votingStatus={votingStatus}
              onNavigateStage={(stg) => setActiveStage(stg)}
            />

            {activeStage === 'PRESIDENT' && (
              <PresidentialVoting
                positionData={getPresPositionData()}
                onVoteSubmitted={handleVoteSubmitted}
                electionId={election?.id}
                apiBaseUrl={API_BASE_URL}
                sessionId={sessionId}
              />
            )}

            {activeStage === 'VICE_PRESIDENT' && (
              <VicePresidentialVoting
                positionData={getVpPositionData()}
                onVoteSubmitted={handleVoteSubmitted}
                electionId={election?.id}
                apiBaseUrl={API_BASE_URL}
                sessionId={sessionId}
              />
            )}
          </>
        )}

        {/* ── VOTING COMPLETE ── */}
        {activeStage === 'COMPLETE' && (
          <VotingComplete
            votingStatus={votingStatus}
            onNextVoter={handleNextVoter}
          />
        )}

        {/* ── RESULTS ── */}
        {activeStage === 'RESULTS' && (
          <ResultsDashboard
            apiBaseUrl={API_BASE_URL}
            onBack={() => setActiveStage('VOTING_STATION')}
          />
        )}

        {/* ── ADMIN LOGIN ── */}
        {activeStage === 'ADMIN_LOGIN' && (
          <AdminLogin
            onLoginSuccess={handleAdminLoginSuccess}
            apiBaseUrl={API_BASE_URL}
            onCancel={() => setActiveStage('VOTING_STATION')}
          />
        )}

        {/* ── ADMIN DASHBOARD ── */}
        {activeStage === 'ADMIN' && admin && (
          <AdminDashboard
            adminToken={adminToken}
            apiBaseUrl={API_BASE_URL}
            onStatusChanged={fetchElectionData}
          />
        )}
      </main>

      <footer style={{
        textAlign: 'center',
        padding: '1.5rem',
        borderTop: '1px solid var(--border-color)',
        color: 'var(--text-dim)',
        fontSize: '0.85rem'
      }}>
        CSESA Election Poll 2026 &bull; CSESA President &amp; Vice President &bull; Cryptographically Verified
      </footer>
    </div>
  );
}

// ── Voting Station Welcome Screen ──
function VotingStationWelcome({ election, electionLoading, isElectionActive, isElectionClosed, onStartVoting, onViewResults }) {
  return (
    <div style={{ maxWidth: '720px', margin: '2rem auto', textAlign: 'center' }}>
      <div className="glass-card" style={{ padding: '3.5rem 2.5rem' }}>

        {/* Icon */}
        <div style={{
          width: '90px',
          height: '90px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.75rem',
          boxShadow: '0 12px 35px rgba(99,102,241,0.45)',
          fontSize: '2.5rem'
        }}>
          🗳️
        </div>

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
          marginBottom: '1.25rem'
        }}>
          ✦ CSESA Official Voting Station
        </div>

        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '0.75rem', lineHeight: 1.2 }}>
          {election?.title || 'CSESA Election Poll 2026'}
        </h1>

        <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', maxWidth: '520px', margin: '0 auto 2rem' }}>
          {election?.description || 'Cast your official votes for CSESA President and Vice President. Supervised by election officials.'}
        </p>

        {/* Election Status Info */}
        {electionLoading ? (
          <div style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Loading election data...</div>
        ) : isElectionActive ? (
          <>
            <div style={{
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.25rem 2rem',
              marginBottom: '2rem',
              fontSize: '0.95rem',
              color: '#34D399',
              fontWeight: 600
            }}>
              🟢 Election is Active &mdash; Voting is Open
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2.5rem', textAlign: 'left' }}>
              <div style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem'
              }}>
                <div style={{ fontWeight: 700, color: 'var(--primary)', marginBottom: '0.3rem', fontSize: '0.95rem' }}>📋 Step 1</div>
                <div style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>Vote for <strong style={{ color: 'var(--text-main)' }}>CSESA President</strong> — choose 1 candidate</div>
              </div>
              <div style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem'
              }}>
                <div style={{ fontWeight: 700, color: 'var(--secondary)', marginBottom: '0.3rem', fontSize: '0.95rem' }}>📋 Step 2</div>
                <div style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>Vote for <strong style={{ color: 'var(--text-main)' }}>CSESA Vice President</strong> — choose 1 candidate</div>
              </div>
            </div>

            <button
              className="btn btn-primary"
              style={{ fontSize: '1.1rem', padding: '0.9rem 3rem', width: '100%', maxWidth: '380px' }}
              onClick={onStartVoting}
            >
              🗳️ Begin Voting
            </button>
          </>
        ) : isElectionClosed ? (
          <>
            <div style={{
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.25rem 2rem',
              marginBottom: '2rem',
              fontSize: '0.95rem',
              color: '#FCA5A5',
              fontWeight: 600
            }}>
              🔴 Voting is Closed &mdash; Election has ended
            </div>
            <button
              className="btn btn-primary"
              style={{ fontSize: '1.1rem', padding: '0.9rem 3rem' }}
              onClick={onViewResults}
            >
              <BarChart3 size={20} />
              View Final Results
            </button>
          </>
        ) : (
          <div style={{
            background: 'rgba(245, 158, 11, 0.08)',
            border: '1px solid rgba(245, 158, 11, 0.25)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.25rem 2rem',
            marginBottom: '2rem',
            fontSize: '0.95rem',
            color: '#FBBF24',
            fontWeight: 600
          }}>
            ⏳ Election has not started yet. Please wait for the election to begin.
          </div>
        )}


      </div>
    </div>
  );
}
