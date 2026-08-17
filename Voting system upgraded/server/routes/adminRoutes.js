const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { queryGet, queryAll, queryRun } = require('../db/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Protect all admin routes
router.use(authenticateToken, requireAdmin);

// 1. Get Live Admin Statistics (Admin ONLY)
router.get('/live-stats', (req, res) => {
  const election = queryGet(`SELECT * FROM elections ORDER BY created_at DESC LIMIT 1`);
  if (!election) return res.status(404).json({ error: 'No election found.' });

  const eligibleVoters = election.eligible_voters_count || 1000;

  const presPos = queryGet(`SELECT id FROM positions WHERE election_id = ? AND name = 'PRESIDENT'`, [election.id]);
  const vpPos = queryGet(`SELECT id FROM positions WHERE election_id = ? AND name = 'VICE_PRESIDENT'`, [election.id]);

  const presVotesObj = presPos ? queryGet(`SELECT COUNT(*) as count FROM votes WHERE election_id = ? AND position_id = ?`, [election.id, presPos.id]) : { count: 0 };
  const vpVotesObj = vpPos ? queryGet(`SELECT COUNT(*) as count FROM votes WHERE election_id = ? AND position_id = ?`, [election.id, vpPos.id]) : { count: 0 };

  const totalSessionsObj = queryGet(`SELECT COUNT(*) as count FROM voting_sessions WHERE election_id = ?`, [election.id]);

  const presVotes = presVotesObj ? presVotesObj.count : 0;
  const vpVotes = vpVotesObj ? vpVotesObj.count : 0;
  const totalSessions = totalSessionsObj ? totalSessionsObj.count : 0;

  const presCandidates = presPos ? queryAll(
    `SELECT c.id, c.name, c.candidate_number, c.photo_url, c.party_affiliation,
            COUNT(v.id) as vote_count
     FROM candidates c
     LEFT JOIN votes v ON c.id = v.candidate_id AND v.position_id = c.position_id
     WHERE c.election_id = ? AND c.position_id = ?
     GROUP BY c.id
     ORDER BY vote_count DESC, c.candidate_number ASC`,
    [election.id, presPos.id]
  ) : [];

  const vpCandidates = vpPos ? queryAll(
    `SELECT c.id, c.name, c.candidate_number, c.photo_url, c.party_affiliation,
            COUNT(v.id) as vote_count
     FROM candidates c
     LEFT JOIN votes v ON c.id = v.candidate_id AND v.position_id = c.position_id
     WHERE c.election_id = ? AND c.position_id = ?
     GROUP BY c.id
     ORDER BY vote_count DESC, c.candidate_number ASC`,
    [election.id, vpPos.id]
  ) : [];

  res.json({
    electionId: election.id,
    electionTitle: election.title,
    status: election.status,
    votingStationMode: !!election.voting_station_mode,
    startTime: election.start_time,
    endTime: election.end_time,
    eligibleVoters,
    totalSessionsCreated: totalSessions,
    president: {
      totalVotes: presVotes,
      participationRate: eligibleVoters > 0 ? parseFloat(((presVotes / eligibleVoters) * 100).toFixed(1)) : 0,
      candidates: presCandidates
    },
    vicePresident: {
      totalVotes: vpVotes,
      participationRate: eligibleVoters > 0 ? parseFloat(((vpVotes / eligibleVoters) * 100).toFixed(1)) : 0,
      candidates: vpCandidates
    }
  });
});

// 2. Change Election Status
router.patch('/election/status', (req, res) => {
  const { status } = req.body;
  if (!['NOT_STARTED', 'ACTIVE', 'CLOSED'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status. Must be NOT_STARTED, ACTIVE, or CLOSED.' });
  }

  const election = queryGet(`SELECT id FROM elections ORDER BY created_at DESC LIMIT 1`);
  if (!election) return res.status(404).json({ error: 'No election found.' });

  queryRun(`UPDATE elections SET status = ? WHERE id = ?`, [status, election.id]);
  res.json({ success: true, message: `Election status updated to ${status}.` });
});

// 3. Toggle Voting Station Mode
router.patch('/election/station-mode', (req, res) => {
  const { enabled } = req.body;
  const election = queryGet(`SELECT id FROM elections ORDER BY created_at DESC LIMIT 1`);
  if (!election) return res.status(404).json({ error: 'No election found.' });

  queryRun(`UPDATE elections SET voting_station_mode = ? WHERE id = ?`, [enabled ? 1 : 0, election.id]);
  res.json({ success: true, message: `Voting Station Mode ${enabled ? 'Enabled' : 'Disabled'}.` });
});

// 4. Update Election Configuration
router.put('/election', (req, res) => {
  const { title, description, startTime, endTime, status, eligibleVotersCount } = req.body;
  
  const election = queryGet(`SELECT id FROM elections ORDER BY created_at DESC LIMIT 1`);
  if (!election) return res.status(404).json({ error: 'No election found.' });

  queryRun(
    `UPDATE elections SET title = ?, description = ?, start_time = ?, end_time = ?, status = ?, eligible_voters_count = ? WHERE id = ?`,
    [title, description, startTime, endTime, status, parseInt(eligibleVotersCount) || 1000, election.id]
  );

  res.json({ success: true, message: 'Election configuration updated successfully.' });
});

// 5. Candidate Management (Add, Edit, Delete)
router.post('/candidates', (req, res) => {
  const { position, name, number, photoUrl, description, partyAffiliation } = req.body;
  
  if (!position || !name || !number) {
    return res.status(400).json({ error: 'Position, Candidate Name, and Candidate Number are required.' });
  }

  const election = queryGet(`SELECT id FROM elections ORDER BY created_at DESC LIMIT 1`);
  const posObj = queryGet(`SELECT id FROM positions WHERE election_id = ? AND name = ?`, [election.id, position.toUpperCase()]);

  if (!posObj) {
    return res.status(400).json({ error: 'Invalid position specified.' });
  }

  const candId = `cand-${position.toLowerCase().slice(0, 4)}-${Date.now()}`;

  try {
    queryRun(
      `INSERT INTO candidates (id, election_id, position_id, name, candidate_number, photo_url, description, party_affiliation)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [candId, election.id, posObj.id, name, parseInt(number), photoUrl || '', description || '', partyAffiliation || 'Independent']
    );

    res.json({ success: true, message: 'Candidate added successfully.', candidateId: candId });
  } catch (e) {
    if (e.message && e.message.includes('UNIQUE')) {
      return res.status(409).json({ error: `Candidate number ${number} is already assigned in this contest.` });
    }
    res.status(500).json({ error: 'Failed to add candidate.' });
  }
});

router.put('/candidates/:id', (req, res) => {
  const { id } = req.params;
  const { name, number, photoUrl, description, partyAffiliation } = req.body;

  const cand = queryGet(`SELECT id FROM candidates WHERE id = ?`, [id]);
  if (!cand) return res.status(404).json({ error: 'Candidate not found.' });

  queryRun(
    `UPDATE candidates SET name = ?, candidate_number = ?, photo_url = ?, description = ?, party_affiliation = ? WHERE id = ?`,
    [name, parseInt(number), photoUrl, description, partyAffiliation, id]
  );

  res.json({ success: true, message: 'Candidate updated successfully.' });
});

router.delete('/candidates/:id', (req, res) => {
  const { id } = req.params;
  
  const voteCountObj = queryGet(`SELECT COUNT(*) as count FROM votes WHERE candidate_id = ?`, [id]);
  if (voteCountObj && voteCountObj.count > 0) {
    return res.status(400).json({ error: 'Cannot delete candidate after votes have been submitted for them.' });
  }

  queryRun(`DELETE FROM candidates WHERE id = ?`, [id]);
  res.json({ success: true, message: 'Candidate deleted.' });
});

// 6. Simulation Runner for N Supervised Voting Sessions
router.post('/simulate', (req, res) => {
  const count = parseInt(req.body.count) || 100;
  const election = queryGet(`SELECT id FROM elections ORDER BY created_at DESC LIMIT 1`);
  if (!election) return res.status(404).json({ error: 'No election found.' });

  const presPos = queryGet(`SELECT id FROM positions WHERE election_id = ? AND name = 'PRESIDENT'`, [election.id]);
  const vpPos = queryGet(`SELECT id FROM positions WHERE election_id = ? AND name = 'VICE_PRESIDENT'`, [election.id]);

  const presCandidates = queryAll(`SELECT id FROM candidates WHERE position_id = ?`, [presPos.id]);
  const vpCandidates = queryAll(`SELECT id FROM candidates WHERE position_id = ?`, [vpPos.id]);

  if (presCandidates.length === 0 || vpCandidates.length === 0) {
    return res.status(400).json({ error: 'Candidates must exist for both positions before running simulation.' });
  }

  let presVotesAdded = 0;
  let vpVotesAdded = 0;

  for (let i = 1; i <= count; i++) {
    const sessionId = `sim-sess-${Date.now()}-${i}-${crypto.randomBytes(2).toString('hex')}`;
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    queryRun(
      `INSERT INTO voting_sessions (id, election_id, president_voted, vice_president_voted, expires_at, status)
       VALUES (?, ?, 1, 1, ?, 'COMPLETED')`,
      [sessionId, election.id, expiresAt]
    );

    const randomPresCand = presCandidates[Math.floor(Math.random() * presCandidates.length)];
    queryRun(
      `INSERT INTO votes (id, election_id, position_id, candidate_id, voting_session_id) VALUES (?, ?, ?, ?, ?)`,
      [`vote-sim-pres-${i}-${Date.now()}`, election.id, presPos.id, randomPresCand.id, sessionId]
    );
    presVotesAdded++;

    const randomVpCand = vpCandidates[Math.floor(Math.random() * vpCandidates.length)];
    queryRun(
      `INSERT INTO votes (id, election_id, position_id, candidate_id, voting_session_id) VALUES (?, ?, ?, ?, ?)`,
      [`vote-sim-vp-${i}-${Date.now()}`, election.id, vpPos.id, randomVpCand.id, sessionId]
    );
    vpVotesAdded++;
  }

  res.json({
    success: true,
    message: `Simulation completed. Created ${count} supervised voting sessions and recorded ${presVotesAdded + vpVotesAdded} votes.`,
    sessionsCreated: count,
    presVotesAdded,
    vpVotesAdded
  });
});

// 7. Reset All Votes & Sessions
router.post('/reset-votes', (req, res) => {
  queryRun(`DELETE FROM votes`);
  queryRun(`DELETE FROM voting_sessions`);
  res.json({ success: true, message: 'All votes and voting sessions have been reset.' });
});

// 8. Export Final CSV Results
router.get('/export', (req, res) => {
  const election = queryGet(`SELECT id, title FROM elections ORDER BY created_at DESC LIMIT 1`);
  if (!election) return res.status(404).json({ error: 'No election found.' });

  const eligibleVoters = election.eligible_voters_count || 1000;
  const presPos = queryGet(`SELECT id FROM positions WHERE election_id = ? AND name = 'PRESIDENT'`, [election.id]);
  const vpPos = queryGet(`SELECT id FROM positions WHERE election_id = ? AND name = 'VICE_PRESIDENT'`, [election.id]);

  const presVotes = queryAll(
    `SELECT c.candidate_number, c.name, c.party_affiliation, COUNT(v.id) as votes
     FROM candidates c LEFT JOIN votes v ON c.id = v.candidate_id
     WHERE c.position_id = ? GROUP BY c.id ORDER BY votes DESC`,
    [presPos.id]
  );

  const vpVotes = queryAll(
    `SELECT c.candidate_number, c.name, c.party_affiliation, COUNT(v.id) as votes
     FROM candidates c LEFT JOIN votes v ON c.id = v.candidate_id
     WHERE c.position_id = ? GROUP BY c.id ORDER BY votes DESC`,
    [vpPos.id]
  );

  let csvContent = `Position,Candidate ID,Candidate Name,Party,Total Votes,Percentage,Rank\n`;

  const totalPresVotes = presVotes.reduce((sum, r) => sum + r.votes, 0);
  let rank = 1;
  for (let i = 0; i < presVotes.length; i++) {
    if (i > 0 && presVotes[i].votes < presVotes[i - 1].votes) rank = i + 1;
    const pct = totalPresVotes > 0 ? ((presVotes[i].votes / totalPresVotes) * 100).toFixed(1) : '0.0';
    csvContent += `President,C${presVotes[i].candidate_number},"${presVotes[i].name}","${presVotes[i].party_affiliation}",${presVotes[i].votes},${pct}%,${rank}\n`;
  }

  const totalVpVotes = vpVotes.reduce((sum, r) => sum + r.votes, 0);
  rank = 1;
  for (let i = 0; i < vpVotes.length; i++) {
    if (i > 0 && vpVotes[i].votes < vpVotes[i - 1].votes) rank = i + 1;
    const pct = totalVpVotes > 0 ? ((vpVotes[i].votes / totalVpVotes) * 100).toFixed(1) : '0.0';
    csvContent += `Vice President,VP${vpVotes[i].candidate_number},"${vpVotes[i].name}","${vpVotes[i].party_affiliation}",${vpVotes[i].votes},${pct}%,${rank}\n`;
  }

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="election_results_${Date.now()}.csv"`);
  res.send(csvContent);
});

module.exports = router;
