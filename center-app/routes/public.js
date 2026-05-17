const express = require('express');
const db      = require('../db/database');
const router  = express.Router();

const DEFAULT_RATING  = 4.5;
const DEFAULT_PRICE   = 149;
const MUMBAI_CENTROID = { lat: 19.076, lng: 72.877 };

// Stable per-id offset around Mumbai (~5km box) for centers without real coords.
// Used so map markers don't collapse to a single point.
function fallbackLatLng(id) {
  const seed = id * 9301 + 49297;
  const a = (seed % 233280) / 233280;
  const b = ((seed * 13) % 233280) / 233280;
  return {
    lat: MUMBAI_CENTROID.lat + (a - 0.5) * 0.10,
    lng: MUMBAI_CENTROID.lng + (b - 0.5) * 0.10,
  };
}

function shapeForCustomer(c) {
  const tags  = String(c.wash_types || '').split(',').map(t => t.trim()).filter(Boolean);
  const stats = db.getReviewsStats(c.id);
  const price = db.getMinPackagePrice(c.id);
  const area  = String(c.address || c.city || '').split(',').pop().trim() || c.city || '';

  const hasGeo = c.lat != null && c.lng != null;
  const geo    = hasGeo ? { lat: c.lat, lng: c.lng } : fallbackLatLng(c.id);

  return {
    id:        'c' + c.id,
    name:      c.name,
    area,
    city:      c.city || '',
    distance:  0,
    rating:    stats && stats.avg_rating ? stats.avg_rating : DEFAULT_RATING,
    reviews:   stats && stats.total     ? stats.total     : 0,
    open:      !!c.is_open,
    openTill:  c.close_time || '',
    priceFrom: price != null ? price : DEFAULT_PRICE,
    tags,
    hasD2D:    tags.includes('d2d'),
    hasSteam:  tags.includes('steam'),
    lat:       geo.lat,
    lng:       geo.lng,
  };
}

router.get('/centers', (req, res) => {
  const cityFilter = (req.query.city || '').trim().toLowerCase();
  // Hide centers the super admin has flipped off; order is already DESC by display_order from the DB.
  let visible = db.getAllCenters().filter(c => c.visible !== 0);
  if (cityFilter) {
    // Strict city match — if there are no centers in this city, the customer
    // app should show "We don't service <city> yet" rather than fall through
    // to centers in a different city, which is confusing.
    visible = visible.filter(c => (c.city || '').trim().toLowerCase() === cityFilter);
  }
  res.json({ success: true, data: visible.map(shapeForCustomer) });
});

router.get('/centers/:id', (req, res) => {
  const id = parseInt(String(req.params.id || '').replace(/^c/, ''), 10);
  if (!id) return res.status(400).json({ error: 'Invalid id' });
  const c = db.findCenterById(id);
  if (!c) return res.status(404).json({ error: 'Center not found' });
  res.json({ success: true, data: shapeForCustomer(c) });
});

// GET /api/public/centers/:id/packages — packages for one center, grouped by wash_type
router.get('/centers/:id/packages', (req, res) => {
  const id = parseInt(String(req.params.id || '').replace(/^c/, ''), 10);
  if (!id) return res.status(400).json({ error: 'Invalid id' });
  const rows = db.listActivePackages(id);
  const grouped = { water: [], dry: [], steam: [], d2d: [] };
  for (const p of rows) {
    let tasks = [];
    try { tasks = JSON.parse(p.tasks || '[]'); } catch { /* malformed */ }
    const bucket = grouped[p.wash_type] || (grouped[p.wash_type] = []);
    bucket.push({
      id:       p.id,
      name:     p.name,
      price:    p.price,
      duration: p.duration_minutes,
      tasks,
    });
  }
  res.json({ success: true, data: grouped });
});

// POST /api/public/bookings — customer creates a booking
// Body: { center_id, package_id, slot_date, slot_time,
//         customer_name, customer_phone, customer_email,
//         vehicle_plate, vehicle_model,
//         app_discount, center_discount }
router.post('/bookings', (req, res) => {
  const b = req.body || {};
  const centerId  = parseInt(String(b.center_id || '').replace(/^c/, ''), 10);
  const packageId = parseInt(b.package_id, 10);

  if (!centerId)              return res.status(400).json({ error: 'center_id required' });
  if (!packageId)             return res.status(400).json({ error: 'package_id required' });
  if (!b.slot_date)           return res.status(400).json({ error: 'slot_date required' });
  if (!b.slot_time)           return res.status(400).json({ error: 'slot_time required' });
  if (!b.customer_name)       return res.status(400).json({ error: 'customer_name required' });
  if (!b.customer_phone)      return res.status(400).json({ error: 'customer_phone required' });
  if (!b.vehicle_plate)       return res.status(400).json({ error: 'vehicle_plate required' });

  const center = db.findCenterById(centerId);
  if (!center) return res.status(404).json({ error: 'Center not found' });

  const pkg = db.getPackage(packageId);
  if (!pkg || pkg.center_id !== centerId)
    return res.status(404).json({ error: 'Package not found for this center' });

  // Promo code — validate server-side so client can't fake the discount.
  // Falls back to the discount the client computed if no code was sent
  // (lets existing flows keep working until the UI is fully promo-aware).
  let appDiscount = Number(b.app_discount) || 0;
  let promoUsed   = null;
  if (b.promo_code) {
    const result = db.validatePromo(String(b.promo_code).trim(), pkg.price);
    if (!result.ok) return res.status(400).json({ error: result.error });
    appDiscount = result.discount;
    promoUsed   = result.promo;
  }

  const booking = db.createCustomerBooking({
    center_id:        centerId,
    customer_name:    String(b.customer_name).trim(),
    customer_phone:   String(b.customer_phone).replace(/\s+/g, ''),
    customer_email:   b.customer_email ? String(b.customer_email).toLowerCase().trim() : null,
    vehicle_plate:    String(b.vehicle_plate).trim(),
    vehicle_model:    b.vehicle_model ? String(b.vehicle_model).trim() : null,
    wash_type:        pkg.wash_type,
    package_name:     pkg.name,
    package_price:    pkg.price,
    slot_date:        b.slot_date,
    slot_time:        b.slot_time,
    duration_minutes: pkg.duration_minutes,
    app_discount:     appDiscount,
    center_discount:  Number(b.center_discount) || 0,
  });
  if (promoUsed) db.incrementPromoUsage(promoUsed.id);

  console.log(`📥 Customer booking ${booking.booking_ref} for center #${centerId} (${center.name})`);
  res.status(201).json({ success: true, data: booking });
});

// GET /api/public/bookings?phone=... — a customer's booking history
router.get('/bookings', (req, res) => {
  const phone = String(req.query.phone || '').replace(/\s+/g, '');
  if (!/^[6-9]\d{9}$/.test(phone))
    return res.status(400).json({ error: 'valid 10-digit phone required' });
  res.json({ success: true, data: db.getCustomerBookings(phone) });
});

// POST /api/public/bookings/:ref/cancel  Body: { phone }
router.post('/bookings/:ref/cancel', (req, res) => {
  const phone = String((req.body || {}).phone || '').replace(/\s+/g, '');
  if (!/^[6-9]\d{9}$/.test(phone)) return res.status(400).json({ error: 'valid phone required' });
  const result = db.cancelCustomerBooking(req.params.ref, phone);
  if (!result.ok) return res.status(400).json({ error: result.error });
  res.json({ success: true });
});

// PATCH /api/public/bookings/:ref/reschedule  Body: { phone, slot_date, slot_time }
router.patch('/bookings/:ref/reschedule', (req, res) => {
  const b = req.body || {};
  const phone = String(b.phone || '').replace(/\s+/g, '');
  if (!/^[6-9]\d{9}$/.test(phone)) return res.status(400).json({ error: 'valid phone required' });
  const result = db.rescheduleCustomerBooking(req.params.ref, phone, b.slot_date, b.slot_time);
  if (!result.ok) return res.status(400).json({ error: result.error });
  res.json({ success: true });
});

// POST /api/public/bookings/:ref/review  Body: { phone, rating, comment }
router.post('/bookings/:ref/review', (req, res) => {
  const ref     = req.params.ref;
  const phone   = String((req.body || {}).phone || '').replace(/\s+/g, '');
  const rating  = parseInt((req.body || {}).rating, 10);
  const comment = (req.body || {}).comment || '';

  if (!/^[6-9]\d{9}$/.test(phone))      return res.status(400).json({ error: 'valid phone required' });
  if (!(rating >= 1 && rating <= 5))    return res.status(400).json({ error: 'rating must be 1-5' });

  const result = db.saveCustomerReview(ref, phone, rating, comment);
  if (!result.ok) return res.status(400).json({ error: result.error });
  res.json({ success: true });
});

// GET /api/public/promos — customer-facing: only active, non-expired promos
router.get('/promos', (_req, res) => {
  res.json({ success: true, data: db.listActivePromos() });
});

// ── CHAT ──────────────────────────────────────────────────────
// Customer endpoints. Every call must include the customer's phone so we can
// (a) scope to their threads and (b) verify thread ownership.

function _ownThreadOr403(thread, phone) {
  if (!thread) return { err: 404, msg: 'Thread not found' };
  if (thread.customer_phone !== phone) return { err: 403, msg: 'Not your thread' };
  return null;
}

// GET /api/public/chat/threads?phone=...
router.get('/chat/threads', (req, res) => {
  const phone = String(req.query.phone || '').replace(/\s+/g, '');
  if (!/^[6-9]\d{9}$/.test(phone)) return res.status(400).json({ error: 'valid phone required' });
  res.json({ success: true, data: db.listChatThreadsForCustomer(phone) });
});

// POST /api/public/chat/threads  Body: { phone, customer_name, type, booking_ref? }
router.post('/chat/threads', (req, res) => {
  const b = req.body || {};
  const phone = String(b.phone || '').replace(/\s+/g, '');
  if (!/^[6-9]\d{9}$/.test(phone)) return res.status(400).json({ error: 'valid phone required' });
  if (b.type !== 'general' && b.type !== 'booking') return res.status(400).json({ error: 'type must be general or booking' });
  if (b.type === 'booking' && !b.booking_ref) return res.status(400).json({ error: 'booking_ref required for booking type' });

  const thread = db.findOrCreateChatThread({
    customer_phone: phone,
    customer_name:  b.customer_name || null,
    booking_ref:    b.type === 'booking' ? b.booking_ref : null,
  });
  res.json({ success: true, data: thread });
});

// GET /api/public/chat/threads/:id/messages?phone=...
router.get('/chat/threads/:id/messages', (req, res) => {
  const phone = String(req.query.phone || '').replace(/\s+/g, '');
  const thread = db.getChatThread(parseInt(req.params.id, 10));
  const own = _ownThreadOr403(thread, phone);
  if (own) return res.status(own.err).json({ error: own.msg });
  // Include the thread row so the customer can render read receipts
  // (admin_last_read_message_id) and any other thread metadata.
  res.json({ success: true, thread, data: db.listChatMessages(thread.id) });
});

// POST /api/public/chat/threads/:id/messages  Body: { phone, customer_name, text }
router.post('/chat/threads/:id/messages', (req, res) => {
  const b = req.body || {};
  const phone = String(b.phone || '').replace(/\s+/g, '');
  const thread = db.getChatThread(parseInt(req.params.id, 10));
  const own = _ownThreadOr403(thread, phone);
  if (own) return res.status(own.err).json({ error: own.msg });
  if (!b.text || !String(b.text).trim()) return res.status(400).json({ error: 'text required' });
  const msg = db.sendChatMessage(thread.id, 'customer', b.customer_name || thread.customer_name || null, b.text);
  res.status(201).json({ success: true, data: msg });
});

// POST /api/public/chat/threads/:id/read  Body: { phone }
router.post('/chat/threads/:id/read', (req, res) => {
  const phone = String((req.body || {}).phone || '').replace(/\s+/g, '');
  const thread = db.getChatThread(parseInt(req.params.id, 10));
  const own = _ownThreadOr403(thread, phone);
  if (own) return res.status(own.err).json({ error: own.msg });
  db.markChatThreadRead(thread.id, 'customer');
  res.json({ success: true });
});

module.exports = router;
