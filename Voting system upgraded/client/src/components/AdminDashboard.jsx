import React, { useState, useEffect } from 'react';
import { ShieldCheck, Users, Vote, Plus, Trash2, Edit3, Play, Download, RotateCcw, AlertTriangle, CheckCircle2, BarChart2 } from 'lucide-react';

export default function AdminDashboard({ adminToken, apiBaseUrl, onStatusChanged }) {
  const [activeTab, setActiveTab] = useState('LIVE_STATS'); // 'LIVE_STATS' | 'PRESIDENT_CANDS' | 'VP_CANDS' | 'VOTERS' | 'SIMULATION'
  const [liveStats, setLiveStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  // Candidate Modal State
  const [showCandModal, setShowCandModal] = useState(false);
  const [candPosition, setCandPosition] = useState('PRESIDENT');
  const [candName, setCandName] = useState('');
  const [candNumber, setCandNumber] = useState('');
  const [candPhoto, setCandPhoto] = useState('');
  const [candDesc, setCandDesc] = useState('');
  const [candParty, setCandParty] = useState('');

  // Simulation State
  const [simCount, setSimCount] = useState(100);
  const [simulating, setSimulating] = useState(false);

  useEffect(() => {
    fetchLiveStats();
  }, []);

  const fetchLiveStats = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/api/admin/live-stats`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      const data = await res.json();
      if (res.ok) {
        setLiveStats(data);
      }
    } catch (err) {
      console.error('Failed to load admin stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/admin/election/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMsg({ type: 'success', text: `Election status updated to ${newStatus}` });
      fetchLiveStats();
      if (onStatusChanged) onStatusChanged();
    } catch (e) {
      setMsg({ type: 'error', text: e.message });
    }
  };

  const handleAddCandidate = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${apiBaseUrl}/api/admin/candidates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          position: candPosition,
          name: candName,
          number: parseInt(candNumber),
          photoUrl: candPhoto,
          description: candDesc,
          partyAffiliation: candParty
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMsg({ type: 'success', text: `Candidate ${candName} added successfully!` });
      setShowCandModal(false);
      resetCandForm();
      fetchLiveStats();
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    }
  };

  const handleDeleteCandidate = async (candId) => {
    if (!window.confirm('Are you sure you want to remove this candidate?')) return;
    try {
      const res = await fetch(`${apiBaseUrl}/api/admin/candidates/${candId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMsg({ type: 'success', text: 'Candidate deleted.' });
      fetchLiveStats();
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    }
  };

  const handleRunSimulation = async () => {
    setSimulating(true);
    setMsg({ type: '', text: '' });
    try {
      const res = await fetch(`${apiBaseUrl}/api/admin/simulate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({ count: simCount })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMsg({ type: 'success', text: data.message });
      fetchLiveStats();
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setSimulating(false);
    }
  };

  const handleResetVotes = async () => {
    if (!window.confirm('WARNING: This will wipe all recorded votes for testing. Continue?')) return;
    try {
      const res = await fetch(`${apiBaseUrl}/api/admin/reset-votes`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      const data = await res.json();
      setMsg({ type: 'success', text: data.message });
      fetchLiveStats();
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    }
  };

  const handleExportCsv = () => {
    window.open(`${apiBaseUrl}/api/admin/export?token=${adminToken}`, '_blank');
  };

  const resetCandForm = () => {
    setCandName('');
    setCandNumber('');
    setCandPhoto('');
    setCandDesc('');
    setCandParty('');
  };

  return (
    <div style={{ maxWidth: '1150px', margin: '0 auto' }}>
      {/* Admin Command Bar */}
      <div className="glass-card" style={{ marginBottom: '1.5rem', background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(17, 24, 39, 0.9) 100%)', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ color: '#FBBF24', fontWeight: 800, fontSize: '0.85rem', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <ShieldCheck size={16} />
              ADMIN CONTROL CENTER
            </div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Election Command Dashboard</h2>
          </div>

          {/* Status Controls */}
          {liveStats && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Set Election State:</span>
              
              <button
                className={`btn ${liveStats.status === 'NOT_STARTED' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                onClick={() => handleStatusChange('NOT_STARTED')}
              >
                NOT_STARTED
              </button>

              <button
                className={`btn ${liveStats.status === 'ACTIVE' ? 'btn-success' : 'btn-secondary'}`}
                style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                onClick={() => handleStatusChange('ACTIVE')}
              >
                ACTIVE
              </button>

              <button
                className={`btn ${liveStats.status === 'CLOSED' ? 'btn-danger' : 'btn-secondary'}`}
                style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                onClick={() => handleStatusChange('CLOSED')}
              >
                CLOSED
              </button>
            </div>
          )}
        </div>
      </div>

      {msg.text && (
        <div className={`toast-msg ${msg.type === 'error' ? 'toast-error' : 'toast-success'}`}>
          {msg.type === 'error' ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
          <span>{msg.text}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs-container">
        <button
          className={`tab-btn ${activeTab === 'LIVE_STATS' ? 'active' : ''}`}
          onClick={() => setActiveTab('LIVE_STATS')}
        >
          Real-Time Analytics (Admin Only)
        </button>
        <button
          className={`tab-btn ${activeTab === 'PRESIDENT_CANDS' ? 'active' : ''}`}
          onClick={() => setActiveTab('PRESIDENT_CANDS')}
        >
          President Candidates
        </button>
        <button
          className={`tab-btn ${activeTab === 'VP_CANDS' ? 'active' : ''}`}
          onClick={() => setActiveTab('VP_CANDS')}
        >
          Vice President Candidates
        </button>
        <button
          className={`tab-btn ${activeTab === 'SIMULATION' ? 'active' : ''}`}
          onClick={() => setActiveTab('SIMULATION')}
        >
          1,000 Voter Stress Test Suite
        </button>
      </div>

      {/* TAB 1: REAL TIME ADMIN STATS */}
      {activeTab === 'LIVE_STATS' && liveStats && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
            <div className="glass-card" style={{ padding: '1.25rem' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total Eligible Voters</div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, marginTop: '0.25rem' }}>{liveStats.eligibleVoters}</div>
            </div>

            <div className="glass-card" style={{ padding: '1.25rem' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>President Turnout</div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--primary)', marginTop: '0.25rem' }}>
                {liveStats.president.totalVotes} ({liveStats.president.participationRate}%)
              </div>
            </div>

            <div className="glass-card" style={{ padding: '1.25rem' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Vice President Turnout</div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--secondary)', marginTop: '0.25rem' }}>
                {liveStats.vicePresident.totalVotes} ({liveStats.vicePresident.participationRate}%)
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            {/* President Tally */}
            <div className="glass-card">
              <h3 style={{ fontSize: '1.2rem', color: 'var(--primary)', marginBottom: '1rem' }}>Presidential Live Tally</h3>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Candidate</th>
                    <th style={{ textAlign: 'right' }}>Votes</th>
                  </tr>
                </thead>
                <tbody>
                  {liveStats.president.candidates.map(c => (
                    <tr key={c.id}>
                      <td>#{c.candidate_number} {c.name}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700 }}>{c.vote_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* VP Tally */}
            <div className="glass-card">
              <h3 style={{ fontSize: '1.2rem', color: 'var(--secondary)', marginBottom: '1rem' }}>Vice Presidential Live Tally</h3>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Candidate</th>
                    <th style={{ textAlign: 'right' }}>Votes</th>
                  </tr>
                </thead>
                <tbody>
                  {liveStats.vicePresident.candidates.map(c => (
                    <tr key={c.id}>
                      <td>#{c.candidate_number} {c.name}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700 }}>{c.vote_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2 & 3: CANDIDATE MANAGEMENT */}
      {(activeTab === 'PRESIDENT_CANDS' || activeTab === 'VP_CANDS') && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3>Manage {activeTab === 'PRESIDENT_CANDS' ? 'Presidential' : 'Vice Presidential'} Candidates</h3>
            <button
              className="btn btn-primary"
              onClick={() => {
                setCandPosition(activeTab === 'PRESIDENT_CANDS' ? 'PRESIDENT' : 'VICE_PRESIDENT');
                setShowCandModal(true);
              }}
            >
              <Plus size={16} />
              <span>Add Candidate</span>
            </button>
          </div>

          <div className="candidate-grid">
            {(activeTab === 'PRESIDENT_CANDS' ? liveStats?.president?.candidates : liveStats?.vicePresident?.candidates)?.map(c => (
              <div key={c.id} className="candidate-card" style={{ padding: '1rem' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <img src={c.photo_url || c.photoUrl} alt={c.name} style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{c.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Candidate #{c.candidate_number} • {c.party_affiliation}</div>
                  </div>
                  <button
                    className="btn btn-danger"
                    style={{ padding: '0.4rem 0.6rem' }}
                    onClick={() => handleDeleteCandidate(c.id)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: SIMULATION STRESS TEST SUITE */}
      {activeTab === 'SIMULATION' && (
        <div className="glass-card">
          <h3 style={{ fontSize: '1.4rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Play style={{ color: 'var(--primary)' }} />
            1,000 Voter Scale Simulation Suite
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', marginBottom: '1.5rem' }}>
            Simulate realistic voting patterns across ~1,000 voters to test database unique constraints, atomic transactions, turnout calculations, and tie-handling.
          </p>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Number of Voters to Simulate</label>
              <select className="form-select" value={simCount} onChange={e => setSimCount(parseInt(e.target.value))}>
                <option value={50}>50 Simulated Voters</option>
                <option value={200}>200 Simulated Voters</option>
                <option value={500}>500 Simulated Voters</option>
                <option value={1000}>1,000 Full Scale Voters</option>
              </select>
            </div>

            <button
              className="btn btn-primary"
              style={{ marginTop: '1.4rem' }}
              onClick={handleRunSimulation}
              disabled={simulating}
            >
              {simulating ? 'Simulating Votes...' : 'Run Vote Simulation'}
            </button>

            <button
              className="btn btn-secondary"
              style={{ marginTop: '1.4rem', borderColor: 'rgba(239, 68, 68, 0.4)', color: '#FCA5A5' }}
              onClick={handleResetVotes}
            >
              <RotateCcw size={16} />
              <span>Reset All Votes</span>
            </button>

            <button
              className="btn btn-secondary"
              style={{ marginTop: '1.4rem' }}
              onClick={handleExportCsv}
            >
              <Download size={16} />
              <span>Export CSV Results</span>
            </button>
          </div>
        </div>
      )}

      {/* Add Candidate Modal */}
      {showCandModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '1rem' }}>
              Add {candPosition === 'PRESIDENT' ? 'Presidential' : 'Vice Presidential'} Candidate
            </h3>

            <form onSubmit={handleAddCandidate}>
              <div className="form-group">
                <label className="form-label">Candidate Full Name</label>
                <input type="text" className="form-input" required value={candName} onChange={e => setCandName(e.target.value)} />
              </div>

              <div className="form-group">
                <label className="form-label">Candidate Ballot Number</label>
                <input type="number" className="form-input" required value={candNumber} onChange={e => setCandNumber(e.target.value)} />
              </div>

              <div className="form-group">
                <label className="form-label">Party Affiliation</label>
                <input type="text" className="form-input" placeholder="e.g. Progressive Vision Party" value={candParty} onChange={e => setCandParty(e.target.value)} />
              </div>

              <div className="form-group">
                <label className="form-label">Photo URL</label>
                <input type="url" className="form-input" placeholder="https://..." value={candPhoto} onChange={e => setCandPhoto(e.target.value)} />
              </div>

              <div className="form-group">
                <label className="form-label">Profile / Platform Statement</label>
                <textarea className="form-textarea" rows="3" value={candDesc} onChange={e => setCandDesc(e.target.value)} />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowCandModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  Save Candidate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
