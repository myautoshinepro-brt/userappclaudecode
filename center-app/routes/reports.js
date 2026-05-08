const express         = require('express');
const db              = require('../db/database');
const { requireAuth } = require('./auth');

const router = express.Router();

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function offsetISO(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// GET /api/reports/revenue?period=today|week|month|custom&from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/revenue', requireAuth, (req, res) => {
  const period = String(req.query.period || 'week').toLowerCase();

  let from, to;
  if (period === 'today') {
    from = to = todayISO();
  } else if (period === 'week') {
    from = offsetISO(-6);
    to   = todayISO();
  } else if (period === 'month') {
    from = offsetISO(-29);
    to   = todayISO();
  } else if (period === 'custom') {
    from = String(req.query.from || '');
    to   = String(req.query.to   || '');
    if (!ISO_DATE.test(from) || !ISO_DATE.test(to))
      return res.status(400).json({ error: 'from and to must be YYYY-MM-DD.' });
    if (from > to) [from, to] = [to, from];
  } else {
    return res.status(400).json({ error: 'Invalid period.' });
  }

  const data = db.getRevenueReport(req.center.id, from, to);
  res.json({ success: true, period, from, to, ...data });
});

module.exports = router;
