const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { queryGet, queryAll, queryRun } = require('../db/database');

// Helper to determine active election state based on server time
function getActiveElection() {
  const election = queryGet(`SELECT * FROM elections ORDER BY created_at DESC LIMIT 1`);
  if (!election) return null;

  // We now rely exclusively on the manual status set by the Admin (NOT_STARTED, ACTIVE, CLOSED)
  return { ...election, currentStatus: election.status };
}

// 1. Get Election Details & Candidates (NO VOTE COUNTS EXPOSED)
router.get('/election', (req, res) => {
  const election = getActiveElection();
  if (!election) {
    return res.status(404).json({ error: 'No active election found.' });
  }

  const positions = queryAll(
    `SELECT id, name, display_name, display_order FROM positions WHERE election_id = ? ORDER BY display_order ASC`,
    [election.id]
  );

  const positionsWithCandidates = positions.map(pos => {
    const candidates = queryAll(
      `SELECT id, name, candidate_number, photo_url, description, party_affiliation 
       FROM candidates 
       WHERE election_id = ? AND position_id = ? 
       ORDER BY candidate_number ASC`,
      [election.id, pos.id]
    );

    return {
      id: pos.id,
      name: pos.name,
      displayName: pos.display_name,
      displayOrder: pos.display_order,
      candidates
    };
  });

  res.json({
    id: election.id,
    title: election.title,
    description: election.description,
    startTime: election.start_time,
    endTime: election.end_time,
    status: election.status,
    votingStationMode: !!election.voting_station_mode,
    eligibleVotersCount: election.eligible_voters_count || 1000,
    positions: positionsWithCandidates
  });
});

// 2. Start a New Voting Session (NO VOTER LOGIN REQUIRED)
router.post('/session', (req, res) => {
  const election = getActiveElection();
  if (!election) {
    return res.status(404).json({ error: 'No active election found.' });
  }

  if (election.status !== 'ACTIVE') {
    return res.status(403).json({ error: `Voting is unavailable. Election status: ${election.status}` });
  }

  const activeSession = queryGet(`SELECT * FROM voting_sessions WHERE election_id = ? AND status = 'ACTIVE'`, [election.id]);
  
  if (activeSession) {
    if (new Date(activeSession.expires_at) < new Date()) {
      // It's expired, update it
      queryRun(`UPDATE voting_sessions SET status = 'EXPIRED' WHERE id = ?`, [activeSession.id]);
    } else {
      // Resume the active session
      return res.json({
        sessionId: activeSession.id,
        electionId: election.id,
        electionStatus: election.status,
        presidentVoted: !!activeSession.president_voted,
        vicePresidentVoted: !!activeSession.vice_president_voted,
        expiresAt: activeSession.expires_at,
        message: 'Resumed existing active session'
      });
    }
  }

  const sessionId = `sess-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 mins session lifetime

  queryRun(
    `INSERT INTO voting_sessions (id, election_id, president_voted, vice_president_voted, expires_at, status)
     VALUES (?, ?, 0, 0, ?, 'ACTIVE')`,
    [sessionId, election.id, expiresAt]
  );

  res.json({
    sessionId,
    electionId: election.id,
    electionStatus: election.status,
    presidentVoted: false,
    vicePresidentVoted: false,
    expiresAt
  });
});

// 3. Get Voting Session Status
router.get('/session/:sessionId/status', (req, res) => {
  const { sessionId } = req.params;
  const session = queryGet(`SELECT * FROM voting_sessions WHERE id = ?`, [sessionId]);

  if (!session) {
    return res.status(404).json({ error: 'Voting session not found.' });
  }

  res.json({
    sessionId: session.id,
    electionId: session.election_id,
    presidentVoted: !!session.president_voted,
    vicePresidentVoted: !!session.vice_president_voted,
    status: session.status
  });
});

// 4. Submit Vote using Session ID
router.post('/vote', (req, res) => {
  const { electionId, positionId, candidateId, sessionId } = req.body;

  if (!electionId || !positionId || !candidateId || !sessionId) {
    return res.status(400).json({ error: 'Missing required parameters (electionId, positionId, candidateId, sessionId).' });
  }

  // Check 1: Is election active? We only rely on manual status.
  const election = getActiveElection();
  if (!election || election.id !== electionId) {
    return res.status(400).json({ error: 'Invalid election specified.' });
  }

  if (election.status !== 'ACTIVE') {
    return res.status(403).json({ error: `Voting is closed. Current election status: ${election.status}` });
  }

  // Check 2: Check Session Validity
  const session = queryGet(`SELECT * FROM voting_sessions WHERE id = ? AND election_id = ?`, [sessionId, election.id]);
  if (!session || session.status === 'EXPIRED') {
    return res.status(403).json({ error: 'Voting session is invalid or expired.' });
  }

  // Check 3: Resolve Target Position
  const targetPosition = queryGet(`SELECT * FROM positions WHERE election_id = ? AND (id = ? OR name = ?)`, [election.id, positionId, positionId.toUpperCase()]);
  if (!targetPosition) {
    return res.status(400).json({ error: 'Invalid voting position.' });
  }

  const isPres = targetPosition.name === 'PRESIDENT';
  const alreadyVotedKey = isPres ? session.president_voted : session.vice_president_voted;

  if (alreadyVotedKey) {
    return res.status(409).json({ error: `A vote for ${targetPosition.display_name} has already been recorded in this voting session.` });
  }

  // Check 4: Check if candidate belongs to position
  const candidate = queryGet(
    `SELECT * FROM candidates WHERE id = ? AND election_id = ? AND position_id = ?`,
    [candidateId, election.id, targetPosition.id]
  );
  if (!candidate) {
    return res.status(400).json({ error: 'Selected candidate does not belong to this position.' });
  }

  // Check 5: Atomic insertion with UNIQUE constraint protection
  try {
    const voteId = `vote-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;

    // Insert Vote Record
    queryRun(
      `INSERT INTO votes (id, election_id, position_id, candidate_id, voting_session_id) VALUES (?, ?, ?, ?, ?)`,
      [voteId, election.id, targetPosition.id, candidateId, sessionId]
    );

    // Update Session State
    const updateColumn = isPres ? 'president_voted' : 'vice_president_voted';
    queryRun(`UPDATE voting_sessions SET ${updateColumn} = 1 WHERE id = ?`, [sessionId]);

    // Check if session is fully completed
    const updatedSession = queryGet(`SELECT * FROM voting_sessions WHERE id = ?`, [sessionId]);
    const isFullyCompleted = updatedSession.president_voted && updatedSession.vice_president_voted;

    if (isFullyCompleted) {
      queryRun(`UPDATE voting_sessions SET status = 'COMPLETED' WHERE id = ?`, [sessionId]);
    }

    res.json({
      success: true,
      message: `Your vote for ${targetPosition.display_name} has been successfully recorded.`,
      position: targetPosition.name,
      presidentVoted: !!updatedSession.president_voted,
      vicePresidentVoted: !!updatedSession.vice_president_voted,
      isFullyCompleted
    });

  } catch (err) {
    if (err.message && err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: `A vote for ${targetPosition.display_name} has already been recorded in this session.` });
    }
    console.error('Vote submission error:', err);
    res.status(500).json({ error: 'Failed to record vote. Please try again.' });
  }
});

// 5. Finish Voting Session (Resets session for next voter)
router.post('/session/:sessionId/finish', (req, res) => {
  const { sessionId } = req.params;
  queryRun(`UPDATE voting_sessions SET status = 'COMPLETED' WHERE id = ?`, [sessionId]);
  res.json({ success: true, message: 'Voting session finished. Ready for next voter.' });
});

// 6. Get Results (STRICT HIDING UNLESS CLOSED)
router.get('/results', (req, res) => {
  const election = getActiveElection();
  if (!election) {
    return res.status(404).json({ error: 'No election found.' });
  }

  // CRITICAL REQUIREMENT: HIDE LIVE RESULTS UNTIL CLOSED
  if (election.status !== 'CLOSED') {
    return res.status(403).json({
      resultsAvailable: false,
      message: 'Results are strictly confidential while voting is active. Final standings will be revealed after voting officially closes.',
      electionStatus: election.status,
      endTime: election.end_time
    });
  }

  const eligibleVoters = election.eligible_voters_count || 1000;

  const presPos = queryGet(`SELECT id FROM positions WHERE election_id = ? AND name = 'PRESIDENT'`, [election.id]);
  const vpPos = queryGet(`SELECT id FROM positions WHERE election_id = ? AND name = 'VICE_PRESIDENT'`, [election.id]);

  function getPositionResults(posId, posTitle) {
    if (!posId) return null;

    const totalVotesObj = queryGet(`SELECT COUNT(*) as count FROM votes WHERE election_id = ? AND position_id = ?`, [election.id, posId]);
    const totalVotes = totalVotesObj ? totalVotesObj.count : 0;
    const participationRate = eligibleVoters > 0 ? parseFloat(((totalVotes / eligibleVoters) * 100).toFixed(1)) : 0;

    const candidates = queryAll(
      `SELECT c.id, c.name, c.candidate_number, c.photo_url, c.description, c.party_affiliation,
              COUNT(v.id) as vote_count
       FROM candidates c
       LEFT JOIN votes v ON c.id = v.candidate_id AND v.position_id = c.position_id
       WHERE c.election_id = ? AND c.position_id = ?
       GROUP BY c.id
       ORDER BY vote_count DESC, c.candidate_number ASC`,
      [election.id, posId]
    );

    const candidatesWithPercentage = candidates.map(c => ({
      id: c.id,
      name: c.name,
      candidateNumber: c.candidate_number,
      photoUrl: c.photo_url,
      description: c.description,
      partyAffiliation: c.party_affiliation,
      votes: c.vote_count,
      percentage: totalVotes > 0 ? parseFloat(((c.vote_count / totalVotes) * 100).toFixed(1)) : 0
    }));

    // Calculate Rank
    let currentRank = 1;
    for (let i = 0; i < candidatesWithPercentage.length; i++) {
      if (i > 0 && candidatesWithPercentage[i].votes < candidatesWithPercentage[i - 1].votes) {
        currentRank = i + 1;
      }
      candidatesWithPercentage[i].rank = currentRank;
    }

    // Winner / Tie Detection
    let winner = null;
    let isTie = false;
    let tiedCandidates = [];
    let resultSummary = 'No votes cast.';

    if (totalVotes > 0 && candidatesWithPercentage.length > 0) {
      const maxVotes = candidatesWithPercentage[0].votes;
      const topCandidates = candidatesWithPercentage.filter(c => c.votes === maxVotes);

      if (topCandidates.length === 1) {
        winner = topCandidates[0];
        resultSummary = `${posTitle} Winner: ${winner.name}`;
      } else {
        isTie = true;
        tiedCandidates = topCandidates;
        const names = topCandidates.map(c => c.name).join(' and ');
        resultSummary = `${posTitle} — Tie between ${names} (${maxVotes} votes each)`;
      }
    }

    return {
      positionTitle: posTitle,
      totalVotes,
      eligibleVoters,
      participationRate,
      candidates: candidatesWithPercentage,
      winner,
      isTie,
      tiedCandidates,
      resultSummary
    };
  }

  const presidentResults = getPositionResults(presPos ? presPos.id : null, 'President');
  const vicePresidentResults = getPositionResults(vpPos ? vpPos.id : null, 'Vice President');

  res.json({
    resultsAvailable: true,
    electionId: election.id,
    electionTitle: election.title,
    electionStatus: election.status,
    closedAt: election.end_time,
    eligibleVoters,
    presidentResults,
    vicePresidentResults
  });
});

module.exports = router;
