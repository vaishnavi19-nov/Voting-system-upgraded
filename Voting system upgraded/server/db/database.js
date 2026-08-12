const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbFilePath = path.join(__dirname, 'voting_system.sqlite');

let db = null;
let SQL = null;
let saveTimer = null;

// Debounced save — batches rapid writes into a single disk flush (max 500ms delay)
function saveDb(immediate = false) {
  if (!db) return;

  if (immediate) {
    // Flush right now (used on process exit)
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
    try {
      const data = db.export();
      fs.writeFileSync(dbFilePath, Buffer.from(data));
    } catch (err) {
      console.error('Error writing DB to disk:', err);
    }
    return;
  }

  // Debounce: cancel any pending save and schedule a new one
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    try {
      const data = db.export();
      fs.writeFileSync(dbFilePath, Buffer.from(data));
    } catch (err) {
      console.error('Error writing DB to disk:', err);
    }
  }, 500);
}

// Guarantee final save on process exit
process.on('exit', () => saveDb(true));
process.on('SIGINT', () => { saveDb(true); process.exit(0); });
process.on('SIGTERM', () => { saveDb(true); process.exit(0); });

async function initDb() {
  SQL = await initSqlJs();
  
  if (fs.existsSync(dbFilePath)) {
    try {
      const filebuffer = fs.readFileSync(dbFilePath);
      db = new SQL.Database(filebuffer);
    } catch (e) {
      console.warn('Failed to load existing db file, creating fresh database...', e);
      db = new SQL.Database();
    }
  } else {
    db = new SQL.Database();
  }

  db.exec('PRAGMA foreign_keys = ON;');
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA synchronous = NORMAL;');
  db.exec('PRAGMA cache_size = -8000;'); // 8MB cache

  // Create schema for Supervised No-Voter-Login Voting System
  db.exec(`
    CREATE TABLE IF NOT EXISTS admins (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'ADMIN',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS elections (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      start_time DATETIME NOT NULL,
      end_time DATETIME NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('NOT_STARTED', 'ACTIVE', 'CLOSED')),
      voting_station_mode INTEGER DEFAULT 1,
      eligible_voters_count INTEGER DEFAULT 1000,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS positions (
      id TEXT PRIMARY KEY,
      election_id TEXT NOT NULL,
      name TEXT NOT NULL CHECK(name IN ('PRESIDENT', 'VICE_PRESIDENT')),
      display_name TEXT NOT NULL,
      display_order INTEGER DEFAULT 1,
      FOREIGN KEY (election_id) REFERENCES elections(id) ON DELETE CASCADE,
      UNIQUE(election_id, name)
    );

    CREATE TABLE IF NOT EXISTS candidates (
      id TEXT PRIMARY KEY,
      election_id TEXT NOT NULL,
      position_id TEXT NOT NULL,
      name TEXT NOT NULL,
      candidate_number INTEGER NOT NULL,
      photo_url TEXT,
      description TEXT,
      party_affiliation TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (election_id) REFERENCES elections(id) ON DELETE CASCADE,
      FOREIGN KEY (position_id) REFERENCES positions(id) ON DELETE CASCADE,
      UNIQUE(position_id, candidate_number)
    );

    CREATE TABLE IF NOT EXISTS voting_sessions (
      id TEXT PRIMARY KEY,
      election_id TEXT NOT NULL,
      president_voted INTEGER DEFAULT 0,
      vice_president_voted INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('ACTIVE', 'COMPLETED', 'EXPIRED')),
      FOREIGN KEY (election_id) REFERENCES elections(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS votes (
      id TEXT PRIMARY KEY,
      election_id TEXT NOT NULL,
      position_id TEXT NOT NULL,
      candidate_id TEXT NOT NULL,
      voting_session_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (election_id) REFERENCES elections(id) ON DELETE CASCADE,
      FOREIGN KEY (position_id) REFERENCES positions(id) ON DELETE CASCADE,
      FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE,
      FOREIGN KEY (voting_session_id) REFERENCES voting_sessions(id) ON DELETE CASCADE,
      UNIQUE(election_id, position_id, voting_session_id)
    );

    CREATE INDEX IF NOT EXISTS idx_votes_session ON votes(voting_session_id);
    CREATE INDEX IF NOT EXISTS idx_votes_lookup ON votes(election_id, position_id, voting_session_id);
    CREATE INDEX IF NOT EXISTS idx_votes_candidate ON votes(candidate_id);
    CREATE INDEX IF NOT EXISTS idx_candidates_position ON candidates(position_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_election ON voting_sessions(election_id);
  `);

  await seedDefaultData();
  saveDb();
  console.log('Supervised Voting Database initialized successfully.');
}

// Helper functions
function queryGet(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params && params.length > 0) {
    stmt.bind(params);
  }
  let row = null;
  if (stmt.step()) {
    row = stmt.getAsObject();
  }
  stmt.free();
  return row;
}

function queryAll(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params && params.length > 0) {
    stmt.bind(params);
  }
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

function queryRun(sql, params = []) {
  db.run(sql, params);
  saveDb();
  return { success: true };
}

async function seedDefaultData() {
  const existingElection = queryGet('SELECT id FROM elections LIMIT 1');

  if (!existingElection) {
    console.log('Seeding initial election data for Supervised Voting Event...');

    const electionId = 'election-001';
    const now = new Date();
    const startTime = new Date(now.getTime() - 1000 * 60 * 60); // 1 hr ago
    const endTime = new Date(now.getTime() + 1000 * 60 * 60 * 24); // 24 hrs from now

    db.run(
      `INSERT INTO elections (id, title, description, start_time, end_time, status, voting_station_mode, eligible_voters_count) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        electionId,
        'Supervised General Leadership Election 2026',
        'Official supervised voting kiosk system for President & Vice President contests.',
        startTime.toISOString(),
        endTime.toISOString(),
        'ACTIVE',
        1,
        1000
      ]
    );

    const posPresId = 'pos-president';
    const posVpId = 'pos-vice-president';

    db.run(
      `INSERT INTO positions (id, election_id, name, display_name, display_order) VALUES (?, ?, ?, ?, ?)`,
      [posPresId, electionId, 'PRESIDENT', 'President', 1]
    );
    db.run(
      `INSERT INTO positions (id, election_id, name, display_name, display_order) VALUES (?, ?, ?, ?, ?)`,
      [posVpId, electionId, 'VICE_PRESIDENT', 'Vice President', 2]
    );

    // Presidential Candidates
    const presCandidates = [
      {
        id: 'cand-pres-1',
        name: 'Eleanor Vance',
        number: 1,
        photo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
        desc: 'Championing digital innovation, sustainable economic growth, and education reform.',
        party: 'Progressive Vision Party'
      },
      {
        id: 'cand-pres-2',
        name: 'Marcus Sterling',
        number: 2,
        photo: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=400&q=80',
        desc: 'Focusing on fiscal responsibility, infrastructure modernization, and national security.',
        party: 'Unity Alliance'
      },
      {
        id: 'cand-pres-3',
        name: 'Sophia Rodriguez',
        number: 3,
        photo: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=400&q=80',
        desc: 'Advocating for healthcare access, renewable energy initiatives, and civic empowerment.',
        party: 'Forward Coalition'
      },
      {
        id: 'cand-pres-4',
        name: 'David Chen',
        number: 4,
        photo: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=400&q=80',
        desc: 'Pioneering technology governance, SME support, and global trade partnerships.',
        party: 'Innovators Front'
      },
      {
        id: 'cand-pres-5',
        name: 'Amina Al-Mansoor',
        number: 5,
        photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
        desc: 'Promoting social justice, public transparency, and youth leadership programs.',
        party: 'Civic Renewal Party'
      }
    ];

    for (const c of presCandidates) {
      db.run(
        `INSERT INTO candidates (id, election_id, position_id, name, candidate_number, photo_url, description, party_affiliation) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [c.id, electionId, posPresId, c.name, c.number, c.photo, c.desc, c.party]
      );
    }

    // Vice Presidential Candidates
    const vpCandidates = [
      {
        id: 'cand-vp-1',
        name: 'Arthur Pendelton',
        number: 1,
        photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
        desc: 'Expert in public policy, urban development, and cross-party consensus building.',
        party: 'Progressive Vision Party'
      },
      {
        id: 'cand-vp-2',
        name: 'Elena Rostova',
        number: 2,
        photo: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80',
        desc: 'Dedicated to economic stability, veterans support, and industrial revitalisation.',
        party: 'Unity Alliance'
      },
      {
        id: 'cand-vp-3',
        name: 'Jonathan Hayes',
        number: 3,
        photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
        desc: 'Environmental advocate, clean technology investor, and education reformer.',
        party: 'Forward Coalition'
      },
      {
        id: 'cand-vp-4',
        name: 'Maya Patel',
        number: 4,
        photo: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=400&q=80',
        desc: 'Champion for public health systems, community resilience, and digital privacy.',
        party: 'Innovators Front'
      },
      {
        id: 'cand-vp-5',
        name: 'Lucas Wright',
        number: 5,
        photo: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=400&q=80',
        desc: 'Constitutional law specialist, anti-corruption campaigner, and grassroots organizer.',
        party: 'Civic Renewal Party'
      }
    ];

    for (const c of vpCandidates) {
      db.run(
        `INSERT INTO candidates (id, election_id, position_id, name, candidate_number, photo_url, description, party_affiliation) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [c.id, electionId, posVpId, c.name, c.number, c.photo, c.desc, c.party]
      );
    }

    // Admin Account Only
    const defaultPasswordHash = bcrypt.hashSync('admin123', 10);
    db.run(
      `INSERT INTO admins (id, username, email, password_hash, role) VALUES (?, ?, ?, ?, ?)`,
      ['admin-001', 'ADMIN-001', 'admin@election.org', defaultPasswordHash, 'ADMIN']
    );

    console.log('Successfully seeded election, candidates, and admin account!');
  }
}

module.exports = {
  initDb,
  queryGet,
  queryAll,
  queryRun,
  saveDb
};
