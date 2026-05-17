const express = require('express');
const db      = require('../db/database');
const { requireAuth } = require('./auth');
const { sendOtpEmail } = require('../utils/email');
const { sendOtpSms }   = require('../utils/sms');

const router = express.Router();

const OTP_MINUTES = parseInt(process.env.OTP_EXPIRES_MINUTES || '5', 10);
const DEV_MODE    = process.env.DEV_MODE !== 'false';

function isValidMobile(v) { return /^[6-9]\d{9}$/.test(String(v || '').replace(/\s+/g, '')); }
function isValidEmail(v)  { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || '').trim()); }
function generateOtp()    { return String(Math.floor(100000 + Math.random() * 900000)); }

// ── PROFILE (name + email) ────────────────────────────────────

router.get('/me', requireAuth, (req, res) => {
  const { id, full_name, mobile, email } = req.user;
  res.json({ success: true, data: { id, full_name, mobile, email } });
});

router.patch('/me', requireAuth, (req, res) => {
  const { full_name, email } = req.body || {};
  if (full_name != null && (!full_name.trim() || full_name.trim().length < 2)) {
    return res.status(400).json({ error: 'Name must be at least 2 characters.' });
  }
  if (email != null) {
    if (!isValidEmail(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
    const owner = db.findUserByEmail(email);
    if (owner && owner.id !== req.user.id) {
      return res.status(409).json({ error: 'That email is already in use.' });
    }
  }
  try {
    const updated = db.updateUserProfile(req.user.id, { full_name, email });
    res.json({ success: true, data: {
      id: updated.id, full_name: updated.full_name, mobile: updated.mobile, email: updated.email,
    }});
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ── CHANGE PHONE — OTP to NEW mobile, then swap ──────────────

router.post('/change-phone/send-otp', requireAuth, async (req, res) => {
  const newMobile = String(req.body?.mobile || '').replace(/\s+/g, '');
  if (!isValidMobile(newMobile)) {
    return res.status(400).json({ error: 'Enter a valid 10-digit mobile number.' });
  }
  if (newMobile === req.user.mobile) {
    return res.status(400).json({ error: 'New mobile is the same as the current one.' });
  }
  const owner = db.findUserByMobile(newMobile);
  if (owner && owner.id !== req.user.id) {
    return res.status(409).json({ error: 'That mobile is already registered to another account.' });
  }

  const otp = generateOtp();
  // Scope the OTP to "this user changing TO this mobile" so a leaked OTP
  // for a different change-phone request can't be reused.
  const key = `change-phone:${req.user.id}:${newMobile}`;
  db.saveOtp(key, otp, OTP_MINUTES);
  console.log(`\n🔐 Change-phone OTP for user ${req.user.id} → ${newMobile}: ${otp} (expires in ${OTP_MINUTES} min)\n`);

  const payload = { success: true, message: `OTP sent to ${newMobile}.` };
  if (DEV_MODE) payload.devOtp = otp;
  res.json(payload);

  // Fire-and-forget delivery so the UI isn't blocked on SMS/email cold-starts.
  setImmediate(async () => {
    try { await sendOtpSms(newMobile, otp, OTP_MINUTES); }
    catch (e) {
      console.error('📱 SMS send error:', e.message);
      // Best-effort fallback: copy to the user's email if SMS fails.
      if (req.user.email) {
        try { await sendOtpEmail(req.user.email, otp, req.user.full_name, OTP_MINUTES); }
        catch (e2) { console.error('📧 email fallback failed:', e2.message); }
      }
    }
  });
});

router.post('/change-phone/verify', requireAuth, (req, res) => {
  const newMobile = String(req.body?.mobile || '').replace(/\s+/g, '');
  const otp       = String(req.body?.otp    || '').trim();
  if (!isValidMobile(newMobile) || !otp) {
    return res.status(400).json({ error: 'Mobile and OTP are required.' });
  }
  // Re-check uniqueness at verify time too — someone could have registered
  // the same number between send-otp and verify.
  const owner = db.findUserByMobile(newMobile);
  if (owner && owner.id !== req.user.id) {
    return res.status(409).json({ error: 'That mobile is already registered to another account.' });
  }
  const key = `change-phone:${req.user.id}:${newMobile}`;
  if (!db.verifyOtp(key, otp)) {
    return res.status(400).json({ error: 'Invalid or expired OTP.' });
  }
  const updated = db.updateUserMobile(req.user.id, newMobile);
  res.json({ success: true, data: {
    id: updated.id, full_name: updated.full_name, mobile: updated.mobile, email: updated.email,
  }});
});

// ── VEHICLES ──────────────────────────────────────────────────

router.get('/vehicles', requireAuth, (req, res) => {
  res.json({ success: true, data: db.listVehicles(req.user.id) });
});

router.post('/vehicles', requireAuth, (req, res) => {
  const { plate, model, colour, icon } = req.body || {};
  if (!plate || !plate.trim())
    return res.status(400).json({ error: 'Plate is required.' });
  try {
    const v = db.addVehicle(req.user.id, { plate, model, colour, icon });
    res.status(201).json({ success: true, data: v });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.delete('/vehicles/:id', requireAuth, (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ error: 'Invalid id' });
  const removed = db.removeVehicle(req.user.id, id);
  if (!removed) return res.status(404).json({ error: 'Vehicle not found' });
  res.json({ success: true });
});

router.patch('/vehicles/:id/primary', requireAuth, (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ error: 'Invalid id' });
  const v = db.setPrimaryVehicle(req.user.id, id);
  if (!v) return res.status(404).json({ error: 'Vehicle not found' });
  res.json({ success: true, data: v });
});

// ── ADDRESSES ─────────────────────────────────────────────────

router.get('/addresses', requireAuth, (req, res) => {
  res.json({ success: true, data: db.listAddresses(req.user.id) });
});

router.post('/addresses', requireAuth, (req, res) => {
  const { label, icon, address, pincode, lat, lng, city } = req.body || {};
  try {
    const a = db.addAddress(req.user.id, { label, icon, address, pincode, lat, lng, city });
    res.status(201).json({ success: true, data: a });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.put('/addresses/:id', requireAuth, (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ error: 'Invalid id' });
  const { label, icon, address, pincode, lat, lng, city } = req.body || {};
  try {
    const a = db.updateAddress(req.user.id, id, { label, icon, address, pincode, lat, lng, city });
    if (!a) return res.status(404).json({ error: 'Address not found' });
    res.json({ success: true, data: a });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.delete('/addresses/:id', requireAuth, (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ error: 'Invalid id' });
  const removed = db.removeAddress(req.user.id, id);
  if (!removed) return res.status(404).json({ error: 'Address not found' });
  res.json({ success: true });
});

router.patch('/addresses/:id/default', requireAuth, (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ error: 'Invalid id' });
  const a = db.setDefaultAddress(req.user.id, id);
  if (!a) return res.status(404).json({ error: 'Address not found' });
  res.json({ success: true, data: a });
});

module.exports = router;
