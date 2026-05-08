const express         = require('express');
const db              = require('../db/database');
const { requireAuth } = require('./auth');

const router = express.Router();

// GET /api/reviews  — stats + full review list for this center
router.get('/', requireAuth, (req, res) => {
  const centerId = req.center.id;
  const stats    = db.getReviewsStats(centerId);
  const reviews  = db.getReviews(centerId);
  res.json({ success: true, stats, reviews });
});

// POST /api/reviews/:bookingId/reply  — save / update center reply
router.post('/:bookingId/reply', requireAuth, (req, res) => {
  const bookingId = parseInt(req.params.bookingId, 10);
  if (!bookingId) return res.status(400).json({ error: 'Invalid booking id.' });

  const reply = String(req.body.reply ?? '').trim();
  if (!reply) return res.status(400).json({ error: 'Reply cannot be empty.' });
  if (reply.length > 500) return res.status(400).json({ error: 'Reply too long (max 500 chars).' });

  const result = db.saveReviewReply(bookingId, req.center.id, reply);
  if (result.changes === 0) return res.status(404).json({ error: 'Review not found.' });

  res.json({ success: true, reply });
});

// DELETE /api/reviews/:bookingId/reply  — remove center reply
router.delete('/:bookingId/reply', requireAuth, (req, res) => {
  const bookingId = parseInt(req.params.bookingId, 10);
  if (!bookingId) return res.status(400).json({ error: 'Invalid booking id.' });

  const result = db.saveReviewReply(bookingId, req.center.id, null);
  if (result.changes === 0) return res.status(404).json({ error: 'Review not found.' });

  res.json({ success: true });
});

module.exports = router;
