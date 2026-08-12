const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { queryGet } = require('../db/database');
const { JWT_SECRET, authenticateToken } = require('../middleware/auth');

// Admin Login Only
router.post('/admin-login', (req, res) => {
  const { identifier, password } = req.body;

  if (!identifier || !password) {
    return res.status(400).json({ error: 'Please provide Admin Identifier and Password.' });
  }

  const admin = queryGet(
    `SELECT * FROM admins WHERE (username = ? OR LOWER(email) = LOWER(?))`,
    [identifier.trim(), identifier.trim()]
  );

  if (!admin) {
    return res.status(401).json({ error: 'Invalid Admin credentials.' });
  }

  const passwordMatch = bcrypt.compareSync(password, admin.password_hash);
  if (!passwordMatch) {
    return res.status(401).json({ error: 'Invalid Admin credentials.' });
  }

  const token = jwt.sign(
    { id: admin.id, username: admin.username, email: admin.email, role: admin.role },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  res.json({
    message: 'Admin login successful',
    token,
    user: {
      id: admin.id,
      name: admin.username,
      email: admin.email,
      role: admin.role
    }
  });
});

// Verify Current Admin Token
router.get('/me', authenticateToken, (req, res) => {
  const admin = queryGet(`SELECT id, username, email, role FROM admins WHERE id = ?`, [req.user.id]);
  if (!admin) {
    return res.status(404).json({ error: 'Admin session expired or invalid' });
  }
  res.json({ user: admin });
});

module.exports = router;
