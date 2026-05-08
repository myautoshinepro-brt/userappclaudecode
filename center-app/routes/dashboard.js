const express    = require('express');
const db         = require('../db/database');
const { requireAuth } = require('./auth');

const router = express.Router();

// GET /api/dashboard?date=YYYY-MM-DD
router.get('/', requireAuth, (req, res) => {
  const date  = req.query.date || new Date().toISOString().slice(0, 10);
  const stats = db.getDashboardStats(req.center.id, date);
  res.json({ success: true, date, ...stats });
});

module.exports = router;
