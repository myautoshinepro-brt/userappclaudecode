const express         = require('express');
const db              = require('../db/database');
const { requireAuth } = require('./auth');

const router     = express.Router();
const SLOT_TIMES = [
  '09:00 AM','09:30 AM','10:00 AM','10:30 AM','11:00 AM','11:30 AM',
  '12:00 PM','12:30 PM','01:00 PM','01:30 PM','02:00 PM','02:30 PM',
  '03:00 PM','03:30 PM','04:00 PM','04:30 PM','05:00 PM','05:30 PM',
];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// GET /api/slots?date=YYYY-MM-DD
// Returns each slot with: time, is_blocked, capacity, booked_count
router.get('/', requireAuth, (req, res) => {
  const date         = req.query.date || todayStr();
  const rows         = db.getSlots(req.center.id, date);
  const bookedCounts = db.getSlotBookingCounts(req.center.id, date);

  // Index slot overrides by "washType|time"
  const overrides = {};
  for (const r of rows) overrides[`${r.wash_type}|${r.slot_time}`] = r;

  const washTypes = (req.center.wash_types || 'water,dry').split(',');
  const grid = {};
  for (const wt of washTypes) {
    grid[wt] = SLOT_TIMES.map(time => {
      const key      = `${wt}|${time}`;
      const override = overrides[key];
      const capacity    = override ? override.capacity    : 1;
      const is_blocked  = override ? !!override.is_blocked : false;
      const booked_count = bookedCounts[key] || 0;
      return { time, is_blocked, capacity, booked_count };
    });
  }
  res.json({ success: true, date, grid });
});

// PATCH /api/slots  { wash_type, date, time, is_blocked, capacity }
router.patch('/', requireAuth, (req, res) => {
  const { wash_type, date, time, is_blocked, capacity } = req.body || {};
  if (!wash_type || !date || !time)
    return res.status(400).json({ error: 'wash_type, date, and time are required.' });

  const cap = Math.max(1, Math.min(20, parseInt(capacity) || 1));
  db.upsertSlot(req.center.id, wash_type, date, time, !!is_blocked, cap);
  res.json({ success: true, wash_type, date, time, is_blocked: !!is_blocked, capacity: cap });
});

module.exports = router;
