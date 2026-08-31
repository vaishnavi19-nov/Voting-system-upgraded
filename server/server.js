const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const { initDb } = require('./db/database');
const authRoutes = require('./routes/authRoutes');
const electionRoutes = require('./routes/electionRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '200mb' }));
app.use(express.urlencoded({ limit: '200mb', extended: true }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api', electionRoutes);
app.use('/api/admin', adminRoutes);

// Healthcheck
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve frontend static build if available
const clientBuildPath = path.join(__dirname, '../client/dist');
app.use(express.static(clientBuildPath));

app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  const indexPath = path.join(clientBuildPath, 'index.html');
  if (require('fs').existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.send('Dual Election Voting System API Backend Running on Port ' + PORT);
  }
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({ error: 'An internal server error occurred.' });
});

// Prevent server crash on unhandled errors — log and keep running
process.on('uncaughtException', (err) => {
  console.error('[CRITICAL] Uncaught Exception — server kept alive:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[CRITICAL] Unhandled Promise Rejection — server kept alive:', reason);
});

// Start server after DB initialization
initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`===================================================`);
    console.log(` Dual Election Voting System Server Active `);
    console.log(` Server URL: http://localhost:${PORT} `);
    console.log(`===================================================`);
  });
}).catch(err => {
  console.error('Database initialization failed:', err);
});
