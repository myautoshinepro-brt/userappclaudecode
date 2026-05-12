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

module.exports = router;
