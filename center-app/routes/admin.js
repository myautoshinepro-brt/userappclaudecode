const express = require('express');
const db      = require('../db/database');
const { sendApplicationStatusEmail } = require('../utils/email');

const router = express.Router();

function adminAuth(req, res, next) {
  const key      = req.headers['x-admin-key'] || req.query.key;
  const expected = process.env.ADMIN_API_KEY || 'sparkwash-admin-2026';
  if (key !== expected) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

// GET /api/admin/applications
router.get('/applications', adminAuth, (req, res) => {
  const apps = db.getAllApplications();
  res.json({ success: true, data: apps });
});

// POST /api/admin/applications/:id/approve
router.post('/applications/:id/approve', adminAuth, async (req, res) => {
  const id = parseInt(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid ID' });

  const app = db.getApplicationById(id);
  if (!app)                      return res.status(404).json({ error: 'Application not found' });
  if (app.status !== 'pending')  return res.status(400).json({ error: 'Application is not pending' });

  const result = db.approveApplication(id);

  sendApplicationStatusEmail(app, 'approved').catch(e =>
    console.error('Approval email error:', e.message)
  );

  console.log(`✅ Application approved: ${app.name} (${app.mobile}) → center #${result.centerId}`);
  res.json({ success: true, message: `${app.name} approved`, centerId: result.centerId });
});

// POST /api/admin/applications/:id/reject
router.post('/applications/:id/reject', adminAuth, async (req, res) => {
  const id    = parseInt(req.params.id);
  const notes = (req.body || {}).notes || 'Application rejected by admin';
  if (!id) return res.status(400).json({ error: 'Invalid ID' });

  const app = db.getApplicationById(id);
  if (!app)                     return res.status(404).json({ error: 'Application not found' });
  if (app.status !== 'pending') return res.status(400).json({ error: 'Application is not pending' });

  db.updateApplicationStatus(id, 'rejected', notes);

  sendApplicationStatusEmail({ ...app, notes }, 'rejected').catch(e =>
    console.error('Rejection email error:', e.message)
  );

  console.log(`❌ Application rejected: ${app.name} (${app.mobile})`);
  res.json({ success: true, message: 'Application rejected' });
});

// GET /api/admin/centers
router.get('/centers', adminAuth, (req, res) => {
  res.json({ success: true, data: db.getAllCenters() });
});

// GET /api/admin/bookings?date=YYYY-MM-DD&status=&center_id=
router.get('/bookings', adminAuth, (req, res) => {
  const date      = req.query.date      || null;
  const status    = req.query.status    || null;
  const centerId  = req.query.center_id ? parseInt(req.query.center_id, 10) : null;
  res.json({ success: true, data: db.getAllBookings({ date, status, center_id: centerId }) });
});

// ── PROMOS ────────────────────────────────────────────────
// GET /api/admin/promos
router.get('/promos', adminAuth, (_req, res) => {
  res.json({ success: true, data: db.listAllPromos() });
});

// POST /api/admin/promos  Body: { code, type, value, min_order, max_uses, description, expires_at }
router.post('/promos', adminAuth, (req, res) => {
  const b = req.body || {};
  if (!b.code)               return res.status(400).json({ error: 'code required' });
  if (b.value == null)       return res.status(400).json({ error: 'value required' });
  if (!['percent','flat'].includes(b.type)) return res.status(400).json({ error: 'type must be percent or flat' });
  try {
    const promo = db.createPromo(b);
    res.status(201).json({ success: true, data: promo });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// PATCH /api/admin/promos/:id
router.patch('/promos/:id', adminAuth, (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ error: 'Invalid id' });
  const ok = db.updatePromo(id, req.body || {});
  if (!ok) return res.status(400).json({ error: 'No updatable fields supplied' });
  res.json({ success: true });
});

// GET /api/admin/bookings/:id — full booking row + center info
router.get('/bookings/:id', adminAuth, (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ error: 'Invalid id' });
  const b = db.getBookingById(id);
  if (!b) return res.status(404).json({ error: 'Booking not found' });
  const center = db.findCenterById(b.center_id);
  res.json({ success: true, data: b, center });
});

// GET /api/admin/bookings/:id/history — full status history
router.get('/bookings/:id/history', adminAuth, (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ error: 'Invalid id' });
  res.json({ success: true, data: db.listBookingHistory(id) });
});

// PATCH /api/admin/bookings/:id  Body: { status?, slot_date?, slot_time?, center_id?, package_price? }
router.patch('/bookings/:id', adminAuth, (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ error: 'Invalid id' });
  const result = db.adminUpdateBooking(id, req.body || {});
  if (!result.ok) return res.status(400).json({ error: result.error });
  console.log(`🛠️  Admin updated booking #${id}:`, Object.keys(req.body || {}).join(', '));
  res.json({ success: true });
});

// ── PACKAGES (super-admin override of the center-auth /api/packages flow) ──
router.get('/centers/:id/packages', adminAuth, (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ error: 'Invalid id' });
  res.json({ success: true, data: db.listPackages(id) });
});

router.post('/centers/:id/packages', adminAuth, (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ error: 'Invalid id' });
  const b = req.body || {};
  if (!b.wash_type || !b.name || b.price == null)
    return res.status(400).json({ error: 'wash_type, name, price required' });
  const pkg = db.createPackage(id, {
    wash_type:        b.wash_type,
    name:             String(b.name).trim(),
    price:            parseInt(b.price, 10),
    duration_minutes: parseInt(b.duration_minutes || 30, 10),
    tasks:            Array.isArray(b.tasks) ? b.tasks : [],
  });
  res.status(201).json({ success: true, data: pkg });
});

router.patch('/centers/:id/packages/:pkgId', adminAuth, (req, res) => {
  const id    = parseInt(req.params.id, 10);
  const pkgId = parseInt(req.params.pkgId, 10);
  if (!id || !pkgId) return res.status(400).json({ error: 'Invalid id' });
  const cur = db.getPackage(pkgId);
  if (!cur || cur.center_id !== id) return res.status(404).json({ error: 'Package not found' });
  const b = req.body || {};
  const merged = {
    wash_type:        b.wash_type        ?? cur.wash_type,
    name:             b.name             ?? cur.name,
    price:            b.price            ?? cur.price,
    duration_minutes: b.duration_minutes ?? cur.duration_minutes,
    tasks:            b.tasks            ?? JSON.parse(cur.tasks || '[]'),
    sort_order:       b.sort_order       ?? cur.sort_order,
  };
  const updated = db.updatePackage(pkgId, id, merged);
  res.json({ success: true, data: updated });
});

router.delete('/centers/:id/packages/:pkgId', adminAuth, (req, res) => {
  const id    = parseInt(req.params.id, 10);
  const pkgId = parseInt(req.params.pkgId, 10);
  if (!id || !pkgId) return res.status(400).json({ error: 'Invalid id' });
  db.deletePackage(pkgId, id);
  res.json({ success: true });
});

// PATCH /api/admin/centers/:id  Body: { name?, owner_name?, mobile?, email?, address?, gstin?, wash_types?, open_time?, close_time?, lat?, lng? }
router.patch('/centers/:id', adminAuth, (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ error: 'Invalid id' });
  const b = req.body || {};
  // Use the existing updateCenterInfo path for the common fields; bank fields stay on a separate endpoint.
  if (b.name || b.owner_name || b.email != null || b.address != null || b.gstin != null || b.wash_types != null || b.open_time != null || b.close_time != null) {
    const cur = db.findCenterById(id);
    if (!cur) return res.status(404).json({ error: 'Center not found' });
    db.updateCenterInfo(id, {
      name:       b.name        ?? cur.name,
      owner_name: b.owner_name  ?? cur.owner_name,
      email:      b.email       ?? cur.email,
      address:    b.address     ?? cur.address,
      gstin:      b.gstin       ?? cur.gstin,
      wash_types: b.wash_types  ?? cur.wash_types,
      open_time:  b.open_time   ?? cur.open_time,
      close_time: b.close_time  ?? cur.close_time,
    });
  }
  // Optional bank patch in the same call.
  if (b.bank_account != null || b.ifsc != null || b.account_name != null || b.bank_name != null) {
    db.updateBankDetails(id, {
      bank_account: b.bank_account ?? null,
      ifsc:         b.ifsc         ?? null,
      account_name: b.account_name ?? null,
      bank_name:    b.bank_name    ?? null,
    });
  }
  res.json({ success: true, data: db.findCenterById(id) });
});

// PATCH /api/admin/centers/:id/visibility  Body: { visible: true | false }
router.patch('/centers/:id/visibility', adminAuth, (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ error: 'Invalid id' });
  const visible = !!(req.body || {}).visible;
  db.setCenterVisibility(id, visible);
  console.log(`👁️ Center #${id} visibility set to ${visible}`);
  res.json({ success: true, id, visible });
});

// PATCH /api/admin/centers/:id/display-order
// Body: { display_order: N }  OR  { swap_with: otherCenterId } for relative moves
router.patch('/centers/:id/display-order', adminAuth, (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ error: 'Invalid id' });
  const body = req.body || {};
  if (body.swap_with) {
    const other = parseInt(body.swap_with, 10);
    if (!other) return res.status(400).json({ error: 'Invalid swap_with' });
    const ok = db.swapDisplayOrder(id, other);
    if (!ok) return res.status(404).json({ error: 'Center(s) not found' });
    console.log(`📋 Swapped display order: #${id} <→ #${other}`);
    return res.json({ success: true });
  }
  const order = parseInt(body.display_order, 10);
  if (!order) return res.status(400).json({ error: 'display_order required' });
  db.setCenterDisplayOrder(id, order);
  console.log(`📋 Center #${id} display_order set to ${order}`);
  res.json({ success: true, id, display_order: order });
});

// PATCH /api/admin/centers/:id/open-status  Body: { is_open: true | false }
// Super-admin override for when the center owner can't toggle their own status.
router.patch('/centers/:id/open-status', adminAuth, (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ error: 'Invalid id' });
  const isOpen = !!(req.body || {}).is_open;
  db.setCenterOpenStatus(id, isOpen);
  console.log(`🔆 Center #${id} is_open set to ${isOpen} (admin override)`);
  res.json({ success: true, id, is_open: isOpen });
});

// ── ADMIN CHAT ────────────────────────────────────────────────
router.get('/chat/threads', adminAuth, (_req, res) => {
  res.json({ success: true, data: db.listAllChatThreads() });
});

router.get('/chat/threads/:id/messages', adminAuth, (req, res) => {
  const t = db.getChatThread(parseInt(req.params.id, 10));
  if (!t) return res.status(404).json({ error: 'Thread not found' });
  res.json({ success: true, thread: t, data: db.listChatMessages(t.id) });
});

router.post('/chat/threads/:id/messages', adminAuth, (req, res) => {
  const t = db.getChatThread(parseInt(req.params.id, 10));
  if (!t) return res.status(404).json({ error: 'Thread not found' });
  const b = req.body || {};
  if (!b.text || !String(b.text).trim()) return res.status(400).json({ error: 'text required' });
  const msg = db.sendChatMessage(t.id, 'admin', b.sender_name || 'SparkWash Support', b.text);
  res.status(201).json({ success: true, data: msg });
});

router.post('/chat/threads/:id/read', adminAuth, (req, res) => {
  const t = db.getChatThread(parseInt(req.params.id, 10));
  if (!t) return res.status(404).json({ error: 'Thread not found' });
  db.markChatThreadRead(t.id, 'admin');
  res.json({ success: true });
});

// ── SETTLEMENTS ────────────────────────────────────────────
// GET /api/admin/settlements?status=pending|settled&center_id=
router.get('/settlements', adminAuth, (req, res) => {
  const status   = req.query.status   || null;
  const centerId = req.query.center_id ? parseInt(req.query.center_id, 10) : null;
  res.json({ success: true, data: db.listSettlements({ status, center_id: centerId }) });
});

// POST /api/admin/settlements/:center_id/settle  Body: { credited_on }
router.post('/settlements/:center_id/settle', adminAuth, (req, res) => {
  const cid = parseInt(req.params.center_id, 10);
  if (!cid) return res.status(400).json({ error: 'Invalid center id' });
  const creditedOn = (req.body || {}).credited_on || new Date().toISOString().slice(0, 10);
  const summary    = db.markSettlementsSettled(cid, creditedOn);
  console.log(`💸 Settled ${summary.n} item(s) for center #${cid} (₹${summary.total})`);
  db.appendAuditLog({
    source: 'superadmin', actor: 'Super Admin', center_id: cid,
    action: 'Settlements marked settled',
    detail: `${summary.n} settlement(s) · ₹${summary.total} · credited on ${creditedOn}`,
  });
  res.json({ success: true, settled: summary.n, total: summary.total, credited_on: creditedOn });
});

// ── AUDIT LOG ──────────────────────────────────────────────
// GET /api/admin/audit?source=&center_id=&limit=
router.get('/audit', adminAuth, (req, res) => {
  res.json({ success: true, data: db.listAuditLog({
    source: req.query.source, center_id: req.query.center_id, limit: req.query.limit,
  })});
});

// POST /api/admin/audit  Body: { source, actor, center_id, action, detail }
router.post('/audit', adminAuth, (req, res) => {
  const b = req.body || {};
  if (!b.action) return res.status(400).json({ error: 'action required' });
  db.appendAuditLog(b);
  res.status(201).json({ success: true });
});

module.exports = router;
