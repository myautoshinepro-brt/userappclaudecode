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

module.exports = router;
