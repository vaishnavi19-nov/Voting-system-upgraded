import React, { useState, useEffect } from 'react';
import { Trophy, Award, Users, BarChart3, Lock, ShieldCheck, AlertCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function ResultsDashboard({ apiBaseUrl }) {
  const [resultsData, setResultsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchResults();
  }, []);

  const fetchResults = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(`${apiBaseUrl}/api/results`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Results not available.');
      }
      setResultsData(data);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <div className="pulse-dot" style={{ width: '20px', height: '20px', margin: '0 auto 1rem' }}></div>
        <p style={{ color: 'var(--text-muted)' }}>Loading final election results...</p>
      </div>
    );
  }

  if (errorMsg || !resultsData || !resultsData.resultsAvailable) {
    return (
      <div style={{ maxWidth: '600px', margin: '3rem auto', textAlign: 'center' }}>
        <div className="glass-card" style={{ padding: '3rem 2rem' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'rgba(239, 68, 68, 0.15)',
            color: '#EF4444',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1rem'
          }}>
            <Lock size={32} />
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem' }}>Results Hidden</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '1rem', marginBottom: '1.5rem' }}>
            {errorMsg || 'Results will be available after voting closes.'}
          </p>
          <button className="btn btn-secondary" onClick={fetchResults}>
            Refresh Status
          </button>
        </div>
      </div>
    );
  }

  const { presidentResults, vicePresidentResults, eligibleVoters } = resultsData;

  const COLORS = ['#6366F1', '#06B6D4', '#8B5CF6', '#10B981', '#F59E0B', '#EC4899', '#3B82F6'];

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
      {/* Title Banner */}
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          background: 'rgba(16, 185, 129, 0.12)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          padding: '0.4rem 1rem',
          borderRadius: '999px',
          color: '#34D399',
          fontSize: '0.85rem',
          fontWeight: 700,
          marginBottom: '0.75rem'
        }}>
          <ShieldCheck size={16} />
          <span>OFFICIAL VERIFIED RESULTS</span>
        </div>
        <h1 style={{ fontSize: '2.75rem', fontWeight: 800 }}>ELECTION RESULTS</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>
          Voting Closed • Calculated directly from immutable database records
        </p>
      </div>

      <div className="results-grid">
        {/* ================= PRESIDENTIAL RESULTS ================= */}
        {presidentResults && (
          <div className="glass-card" style={{ borderTop: '4px solid var(--primary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <span style={{ color: 'var(--primary)', fontWeight: 800, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  CONTEST 1 OF 2
                </span>
                <h2 style={{ fontSize: '1.85rem', fontWeight: 800 }}>FINAL PRESIDENTIAL RESULTS</h2>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ background: 'rgba(255,255,255,0.04)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Pres Votes</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)' }}>{presidentResults.totalVotes}</div>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.04)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Turnout</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#10B981' }}>{presidentResults.participationRate}%</div>
                </div>
              </div>
            </div>

            {/* Winner / Tie Banner */}
            <div className="winner-banner">
              <div className="winner-trophy">
                <Trophy size={30} />
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: '#FBBF24', letterSpacing: '0.05em' }}>
                  {presidentResults.isTie ? 'ELECTION TIE DECLARED' : 'PRESIDENT ELECT'}
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'white' }}>
                  {presidentResults.resultSummary}
                </div>
                {presidentResults.winner && (
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    {presidentResults.winner.partyAffiliation} • {presidentResults.winner.votes} Votes ({presidentResults.winner.percentage}%)
                  </div>
                )}
              </div>
            </div>

            {/* Standings Table */}
            <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem' }}>Presidential Standings Table</h4>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Candidate</th>
                    <th>Party</th>
                    <th style={{ textAlign: 'right' }}>Votes</th>
                    <th style={{ textAlign: 'right' }}>Percentage</th>
                  </tr>
                </thead>
                <tbody>
                  {presidentResults.candidates.map((c) => (
                    <tr key={c.id} style={{ fontWeight: c.rank === 1 ? 700 : 400, background: c.rank === 1 ? 'rgba(99, 102, 241, 0.08)' : 'transparent' }}>
                      <td>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '26px',
                          height: '26px',
                          borderRadius: '50%',
                          background: c.rank === 1 ? 'linear-gradient(135deg, #F59E0B, #D97706)' : 'rgba(255,255,255,0.08)',
                          color: c.rank === 1 ? 'white' : 'var(--text-main)',
                          fontSize: '0.85rem'
                        }}>
                          {c.rank}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <img src={c.photoUrl} alt={c.name} style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} />
                          <div>
                            <div>{c.name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Candidate #{c.candidateNumber}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-muted)' }}>{c.partyAffiliation}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700 }}>{c.votes}</td>
                      <td style={{ textAlign: 'right', color: 'var(--primary)', fontWeight: 700 }}>{c.percentage}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bar Chart */}
            <div style={{ marginTop: '2rem', height: '260px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={presidentResults.candidates} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
                  <XAxis dataKey="name" stroke="#64748B" fontSize={12} tickLine={false} />
                  <YAxis stroke="#64748B" fontSize={12} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: '#111827', borderColor: '#374151', borderRadius: '8px', color: '#fff' }}
                    formatter={(value) => [`${value} Votes`, 'Votes']}
                  />
                  <Bar dataKey="votes" radius={[8, 8, 0, 0]}>
                    {presidentResults.candidates.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* ================= VICE PRESIDENTIAL RESULTS ================= */}
        {vicePresidentResults && (
          <div className="glass-card" style={{ borderTop: '4px solid var(--secondary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <span style={{ color: 'var(--secondary)', fontWeight: 800, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  CONTEST 2 OF 2
                </span>
                <h2 style={{ fontSize: '1.85rem', fontWeight: 800 }}>FINAL VICE PRESIDENTIAL RESULTS</h2>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ background: 'rgba(255,255,255,0.04)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total VP Votes</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--secondary)' }}>{vicePresidentResults.totalVotes}</div>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.04)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Turnout</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#10B981' }}>{vicePresidentResults.participationRate}%</div>
                </div>
              </div>
            </div>

            {/* Winner / Tie Banner */}
            <div className="winner-banner" style={{ background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.15) 0%, rgba(14, 165, 233, 0.05) 100%)', borderColor: 'rgba(6, 182, 212, 0.35)' }}>
              <div className="winner-trophy" style={{ background: 'linear-gradient(135deg, var(--secondary), #0284C7)' }}>
                <Trophy size={30} />
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--secondary)', letterSpacing: '0.05em' }}>
                  {vicePresidentResults.isTie ? 'ELECTION TIE DECLARED' : 'VICE PRESIDENT ELECT'}
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'white' }}>
                  {vicePresidentResults.resultSummary}
                </div>
                {vicePresidentResults.winner && (
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    {vicePresidentResults.winner.partyAffiliation} • {vicePresidentResults.winner.votes} Votes ({vicePresidentResults.winner.percentage}%)
                  </div>
                )}
              </div>
            </div>

            {/* Standings Table */}
            <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem' }}>Vice Presidential Standings Table</h4>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Candidate</th>
                    <th>Party</th>
                    <th style={{ textAlign: 'right' }}>Votes</th>
                    <th style={{ textAlign: 'right' }}>Percentage</th>
                  </tr>
                </thead>
                <tbody>
                  {vicePresidentResults.candidates.map((c) => (
                    <tr key={c.id} style={{ fontWeight: c.rank === 1 ? 700 : 400, background: c.rank === 1 ? 'rgba(6, 182, 212, 0.08)' : 'transparent' }}>
                      <td>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '26px',
                          height: '26px',
                          borderRadius: '50%',
                          background: c.rank === 1 ? 'linear-gradient(135deg, var(--secondary), #0284C7)' : 'rgba(255,255,255,0.08)',
                          color: 'white',
                          fontSize: '0.85rem'
                        }}>
                          {c.rank}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <img src={c.photoUrl} alt={c.name} style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} />
                          <div>
                            <div>{c.name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Candidate #{c.candidateNumber}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-muted)' }}>{c.partyAffiliation}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700 }}>{c.votes}</td>
                      <td style={{ textAlign: 'right', color: 'var(--secondary)', fontWeight: 700 }}>{c.percentage}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bar Chart */}
            <div style={{ marginTop: '2rem', height: '260px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={vicePresidentResults.candidates} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
                  <XAxis dataKey="name" stroke="#64748B" fontSize={12} tickLine={false} />
                  <YAxis stroke="#64748B" fontSize={12} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: '#111827', borderColor: '#374151', borderRadius: '8px', color: '#fff' }}
                    formatter={(value) => [`${value} Votes`, 'Votes']}
                  />
                  <Bar dataKey="votes" radius={[8, 8, 0, 0]}>
                    {vicePresidentResults.candidates.map((entry, index) => (
                      <Cell key={`cell-vp-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
