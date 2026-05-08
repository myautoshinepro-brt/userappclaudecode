const express = require('express');
const db      = require('../db/database');

const router = express.Router();

function isMobile(val) {
  return /^[6-9]\d{9}$/.test((val || '').replace(/\s+/g, ''));
}

// POST /api/onboard/apply
router.post('/apply', (req, res) => {
  const { name, owner_name, mobile, email, city, address, gstin, bank_account, ifsc, account_name } = req.body || {};

  if (!name?.trim())       return res.status(400).json({ error: 'Center name is required.' });
  if (!owner_name?.trim()) return res.status(400).json({ error: 'Owner name is required.' });
  if (!isMobile(mobile))   return res.status(400).json({ error: 'Enter a valid 10-digit mobile number.' });
  if (!city?.trim())       return res.status(400).json({ error: 'City is required.' });
  if (!address?.trim())    return res.status(400).json({ error: 'Address is required.' });

  const norm = mobile.replace(/\s+/g, '');

  // Check if already an active center
  const existingCenter = db.findCenterByMobile(norm);
  if (existingCenter) return res.status(400).json({ error: 'This number is already registered as a center.' });

  // Check if application already exists
  const existingApp = db.getApplicationByMobile(norm);
  if (existingApp) {
    if (existingApp.status === 'pending')
      return res.status(400).json({
        error: 'An application with this number is already under review.',
        status: 'pending',
        appliedAt: existingApp.created_at,
      });
    if (existingApp.status === 'approved')
      return res.status(400).json({ error: 'This number is already approved. Try logging in.' });
    // rejected — allow re-apply by updating
    db.reapplyApplication(existingApp.id, { name, owner_name, email, city, address, gstin, bank_account, ifsc, account_name });
    console.log(`♻️  Re-application: ${name} (${norm})`);
    return res.json({ success: true, message: 'Application re-submitted successfully.', id: existingApp.id });
  }

  const info = db.createApplication({ name, owner_name, mobile: norm, email, city, address, gstin, bank_account, ifsc, account_name });
  console.log(`📋 New center application: ${name} (${norm})`);
  res.json({ success: true, message: 'Application submitted! SparkWash team will review and contact you within 24–48 hours.', id: info.lastInsertRowid });
});

// GET /api/onboard/status/:mobile
router.get('/status/:mobile', (req, res) => {
  const mobile = (req.params.mobile || '').replace(/\s+/g, '');
  if (!isMobile(mobile)) return res.status(400).json({ error: 'Invalid mobile number.' });

  const app = db.getApplicationByMobile(mobile);
  if (!app) return res.status(404).json({ error: 'No application found for this number.' });

  res.json({
    success: true,
    status:    app.status,
    name:      app.name,
    appliedAt: app.created_at,
    notes:     app.notes || null,
  });
});

module.exports = router;
