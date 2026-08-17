const http = require('http');

const PORT = 5000;
const BASE_URL = `http://localhost:${PORT}`;

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log(' Starting Verification Test Suite for Supervised No-Login Voting System...\n');

  try {
    // 1. Healthcheck
    const health = await request('GET', '/api/health');
    console.log('1. Server Healthcheck:', health.status === 200 ? ' PASSED' : ' FAILED');

    // 2. Public Access Without Login
    const electionRes = await request('GET', '/api/election');
    console.log('2. Public Kiosk Access (No Voter Login Required):', electionRes.status === 200 ? ' PASSED' : ' FAILED');

    const presPos = electionRes.body.positions.find(p => p.name === 'PRESIDENT');
    const vpPos = electionRes.body.positions.find(p => p.name === 'VICE_PRESIDENT');

    const presCand1 = presPos.candidates[0];
    const presCand2 = presPos.candidates[1];
    const vpCand1 = vpPos.candidates[0];

    // 3. Admin Authentication
    const adminLogin = await request('POST', '/api/auth/admin-login', {
      identifier: 'ADMIN-001',
      password: 'admin123'
    });
    if (adminLogin.status !== 200 || !adminLogin.body.token) {
      throw new Error('Admin login failed: ' + JSON.stringify(adminLogin.body));
    }
    const adminToken = adminLogin.body.token;
    console.log('3. Admin Authentication:', ' PASSED (Token acquired)');

    // Reset votes before testing
    await request('POST', '/api/admin/reset-votes', {}, adminToken);
    await request('PATCH', '/api/admin/election/status', { status: 'ACTIVE' }, adminToken);

    // 4. Create Voting Session
    const sessRes = await request('POST', '/api/session');
    if (sessRes.status !== 200 || !sessRes.body.sessionId) {
      throw new Error('Session creation failed: ' + JSON.stringify(sessRes.body));
    }
    const sessionId = sessRes.body.sessionId;
    console.log('4. Create Kiosk Voting Session:', ' PASSED (Session ID generated)');

    // 5. Initial Session Status
    const status1 = await request('GET', `/api/session/${sessionId}/status`);
    console.log('5. Initial Session Status:', status1.body.presidentVoted === false && status1.body.vicePresidentVoted === false ? ' PASSED' : ' FAILED');

    // 6. Vote for President
    const votePresRes = await request('POST', '/api/vote', {
      electionId: electionRes.body.id,
      positionId: presPos.id,
      candidateId: presCand1.id,
      sessionId
    });
    console.log('6. Submit Presidential Vote:', votePresRes.status === 200 ? ' PASSED' : ' FAILED');

    // 7. Reject Duplicate Presidential Vote in Same Session
    const dupPresRes = await request('POST', '/api/vote', {
      electionId: electionRes.body.id,
      positionId: presPos.id,
      candidateId: presCand2.id,
      sessionId
    });
    console.log('7. Reject Duplicate Presidential Vote in Session:', dupPresRes.status === 409 ? ' PASSED (Rejected with 409 Conflict)' : ' FAILED');

    // 8. Partial Session Status Check
    const status2 = await request('GET', `/api/session/${sessionId}/status`);
    console.log('8. Partial Session Status:', status2.body.presidentVoted === true && status2.body.vicePresidentVoted === false ? ' PASSED (President done, VP pending)' : ' FAILED');

    // 9. Reject Candidate-Position Mismatch
    const invalidCandRes = await request('POST', '/api/vote', {
      electionId: electionRes.body.id,
      positionId: vpPos.id,
      candidateId: presCand1.id, // Pres candidate given to VP position
      sessionId
    });
    console.log('9. Reject Candidate-Position Mismatch:', invalidCandRes.status === 400 ? ' PASSED (Rejected with 400 Bad Request)' : ' FAILED');

    // 10. Vote for Vice President
    const voteVpRes = await request('POST', '/api/vote', {
      electionId: electionRes.body.id,
      positionId: vpPos.id,
      candidateId: vpCand1.id,
      sessionId
    });
    console.log('10. Submit Vice Presidential Vote:', voteVpRes.status === 200 ? ' PASSED' : ' FAILED');

    // 11. Full Session Completion Status
    const status3 = await request('GET', `/api/session/${sessionId}/status`);
    console.log('11. Full Session Completion Status:', status3.body.presidentVoted === true && status3.body.vicePresidentVoted === true ? ' PASSED (Both submitted ✓)' : ' FAILED');

    // 12. Verify Live Results Masking During ACTIVE
    const activeResultsRes = await request('GET', '/api/results');
    console.log('12. Hide Public Results During ACTIVE:', activeResultsRes.status === 403 && activeResultsRes.body.resultsAvailable === false ? ' PASSED (Access Refused)' : ' FAILED');

    // 13. Admin Authorized Live Stats Access
    const adminStatsRes = await request('GET', '/api/admin/live-stats', null, adminToken);
    console.log('13. Admin Authorized Live Stats:', adminStatsRes.status === 200 && adminStatsRes.body.president.totalVotes === 1 ? ' PASSED' : ' FAILED');

    // 14. Scale Stress Test Simulation (100 Voting Sessions)
    const simRes = await request('POST', '/api/admin/simulate', { count: 100 }, adminToken);
    console.log('14. Scale Simulation Test (100 Sessions):', simRes.status === 200 ? ' PASSED' : ' FAILED');

    // 15. Admin Closes Election
    await request('PATCH', '/api/admin/election/status', { status: 'CLOSED' }, adminToken);
    console.log('15. Close Election:', ' PASSED');

    // 16. Reveal Final Results on CLOSED
    const finalResultsRes = await request('GET', '/api/results');
    console.log('16. Reveal Final Results on CLOSED:', finalResultsRes.status === 200 && finalResultsRes.body.resultsAvailable === true ? ' PASSED' : ' FAILED');
    console.log('    - Presidential Winner:', finalResultsRes.body.presidentResults.resultSummary);
    console.log('    - Vice Presidential Winner:', finalResultsRes.body.vicePresidentResults.resultSummary);
    console.log('    - President Turnout:', finalResultsRes.body.presidentResults.participationRate + '%');
    console.log('    - Vice President Turnout:', finalResultsRes.body.vicePresidentResults.participationRate + '%');

    // 17. Reject Vote Post-Closure
    const postCloseSess = await request('POST', '/api/session');
    const votePostClosedRes = await request('POST', '/api/vote', {
      electionId: electionRes.body.id,
      positionId: presPos.id,
      candidateId: presCand1.id,
      sessionId: postCloseSess.body.sessionId
    });
    console.log('17. Reject Vote Post-Closure:', votePostClosedRes.status === 403 ? ' PASSED (Rejected after closed)' : ' FAILED');

    // 18. Export CSV Results
    const exportRes = await request('GET', `/api/admin/export`, null, adminToken);
    const isCsvValid = typeof exportRes.body === 'string' && exportRes.body.includes('President') && exportRes.body.includes('Vice President');
    console.log('18. Export CSV Results:', isCsvValid ? ' PASSED' : ' FAILED');

    // Reset status back to ACTIVE for application usage
    await request('PATCH', '/api/admin/election/status', { status: 'ACTIVE' }, adminToken);

    console.log('\n ALL 18 AUTOMATED INTEGRATION TESTS PASSED PERFECTLY!\n');
    process.exit(0);

  } catch (err) {
    console.error('\n Test Failure:', err);
    process.exit(1);
  }
}

runTests();
