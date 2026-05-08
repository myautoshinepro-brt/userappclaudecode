const express    = require('express');
const db         = require('../db/database');
const { requireAuth }     = require('./auth');
const { sendWashDoneEmail } = require('../utils/email');

const router = express.Router();

const VALID_STATUSES = ['new', 'confirmed', 'arrived', 'washing', 'done', 'cancelled'];
const TRANSITIONS   = {
  new:       ['confirmed', 'cancelled'],
  confirmed: ['arrived',   'cancelled'],
  arrived:   ['washing',   'cancelled'],
  washing:   ['done'],
  done:      [],
  cancelled: [],
};

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// GET /api/bookings?date=YYYY-MM-DD&status=new
router.get('/', requireAuth, (req, res) => {
  const date   = req.query.date   || todayStr();
  const status = req.query.status || null;
  const rows   = db.getBookings(req.center.id, date, status);
  res.json({ success: true, bookings: rows, date });
});

// GET /api/bookings/:id
router.get('/:id', requireAuth, (req, res) => {
  const booking = db.getBookingById(Number(req.params.id));
  if (!booking || booking.center_id !== req.center.id)
    return res.status(404).json({ error: 'Booking not found.' });
  res.json({ success: true, booking });
});

// PATCH /api/bookings/:id/status  { status }
router.patch('/:id/status', requireAuth, (req, res) => {
  const { status } = req.body || {};
  if (!VALID_STATUSES.includes(status))
    return res.status(400).json({ error: 'Invalid status value.' });

  const booking = db.getBookingById(Number(req.params.id));
  if (!booking || booking.center_id !== req.center.id)
    return res.status(404).json({ error: 'Booking not found.' });

  const allowed = TRANSITIONS[booking.status] || [];
  if (!allowed.includes(status))
    return res.status(400).json({
      error: `Cannot move from "${booking.status}" to "${status}".`,
    });

  db.updateBookingStatus(booking.id, req.center.id, status);

  // Auto-mark payment_collected when wash is done + send order summary email
  if (status === 'done') {
    try {
      db.prepare('UPDATE bookings SET payment_collected = 1, updated_at = datetime(\'now\') WHERE id = ?')
        .run(booking.id);
    } catch { /* non-critical */ }
    // Send email non-blockingly — fetch updated booking so email has fresh data
    const updatedBooking = db.getBookingById(booking.id);
    sendWashDoneEmail(updatedBooking || booking, req.center).catch(() => {});
  }

  console.log(`📋 Booking ${booking.booking_ref}: ${booking.status} → ${status}`);
  res.json({ success: true, id: booking.id, status });
});

// PATCH /api/bookings/:id/email  { email }
router.patch('/:id/email', requireAuth, (req, res) => {
  const { email } = req.body || {};
  const emailTrimmed = (email || '').trim().toLowerCase();
  if (emailTrimmed && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed))
    return res.status(400).json({ error: 'Invalid email address.' });

  const booking = db.getBookingById(Number(req.params.id));
  if (!booking || booking.center_id !== req.center.id)
    return res.status(404).json({ error: 'Booking not found.' });

  db.prepare('UPDATE bookings SET customer_email=?, updated_at=datetime(\'now\') WHERE id=?')
    .run(emailTrimmed || null, booking.id);
  console.log(`📧 Email ${emailTrimmed ? 'set to ' + emailTrimmed : 'cleared'} for booking ${booking.booking_ref}`);
  res.json({ success: true, email: emailTrimmed || null });
});

// PATCH /api/bookings/:id/photo  { type: 'before'|'after', data: base64DataUrl }
router.patch('/:id/photo', requireAuth, (req, res) => {
  const { type, data } = req.body || {};
  if (!['before', 'after'].includes(type))
    return res.status(400).json({ error: 'type must be "before" or "after".' });
  if (!data || !data.startsWith('data:image/'))
    return res.status(400).json({ error: 'data must be a base64 image data URL.' });

  const booking = db.getBookingById(Number(req.params.id));
  if (!booking || booking.center_id !== req.center.id)
    return res.status(404).json({ error: 'Booking not found.' });

  // Only allow photos for active/done bookings
  if (!['arrived', 'washing', 'done'].includes(booking.status))
    return res.status(400).json({ error: 'Photos can only be added after customer arrives.' });

  db.saveBookingPhoto(booking.id, req.center.id, type, data);
  console.log(`📷 ${type} photo saved for booking ${booking.booking_ref}`);
  res.json({ success: true, type });
});

// PATCH /api/bookings/:id/discount  { app_discount, center_discount }
// Called when booking is created via customer app (future integration)
router.patch('/:id/discount', requireAuth, (req, res) => {
  const { app_discount = 0, center_discount = 0 } = req.body || {};
  const booking = db.getBookingById(Number(req.params.id));
  if (!booking || booking.center_id !== req.center.id)
    return res.status(404).json({ error: 'Booking not found.' });

  db.prepare('UPDATE bookings SET app_discount = ?, center_discount = ?, updated_at = datetime(\'now\') WHERE id = ?')
    .run(app_discount, center_discount, booking.id);
  res.json({ success: true });
});

module.exports = router;
