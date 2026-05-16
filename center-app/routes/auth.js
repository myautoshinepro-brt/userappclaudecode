const express            = require('express');
const jwt                = require('jsonwebtoken');
const db                 = require('../db/database');
const { sendOtpEmail }   = require('../utils/email');
const { sendOtpSms }     = require('../utils/sms');

const router         = express.Router();
const JWT_SECRET     = process.env.JWT_SECRET || 'sparkwash_center_dev_secret';
// Long-lived JWT — center stays logged in across restarts on the same device.
// /me re-issues a fresh token on every call (sliding window), so an active
// center never expires; only a switched device or explicit logout forces login.
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '365d';
const OTP_MINUTES    = parseInt(process.env.OTP_EXPIRES_MINUTES || '5', 10);
const DEV_MODE       = process.env.DEV_MODE !== 'false'; // default ON; set DEV_MODE=false in prod to hide

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function isMobile(val) {
  return /^[6-9]\d{9}$/.test(val.replace(/\s+/g, ''));
}

function makeToken(centerId) {
  return jwt.sign({ sub: centerId, role: 'center' }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function requireAuth(req, res, next) {
  const auth  = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Unauthorised' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const center  = db.findCenterById(payload.sub);
    if (!center) return res.status(401).json({ error: 'Center not found' });
    req.center = center;
    next();
  } catch {
    return res.status(401).json({ error: 'Token expired or invalid' });
  }
}

// POST /api/auth/send-otp  { mobile }
router.post('/send-otp', async (req, res) => {
  const { mobile } = req.body || {};
  if (!mobile || !isMobile(mobile.replace(/\s+/g, '')))
    return res.status(400).json({ error: 'Enter a valid 10-digit mobile number.' });

  const norm   = mobile.replace(/\s+/g, '');
  const center = db.findCenterByMobile(norm);
  if (!center)
    return res.status(404).json({ error: 'No center found for this number. Contact Pitbay support.' });

  const otp = generateOtp();
  db.saveOtp(norm, otp, OTP_MINUTES);
  console.log(`\n🔐 OTP for ${norm}: ${otp}  (expires in ${OTP_MINUTES} min)\n`);

  // Centers log in by mobile, so the primary channel is SMS. Email is a
  // secondary copy when the center has one on file.
  let primaryDelivery = null;
  try { await sendOtpSms(norm, otp, OTP_MINUTES); primaryDelivery = 'sms'; }
  catch (e) { console.error('📱 SMS send error:', e.message); }

  // Always copy the email if available — useful when the owner isn't holding
  // their phone but is at the desk with their laptop open.
  if (center.email) {
    sendOtpEmail(center.email, otp, center.owner_name, OTP_MINUTES)
      .then(() => { if (!primaryDelivery) primaryDelivery = 'email'; })
      .catch(err => console.error('📧 OTP email error:', err.message));
  }

  const dest = primaryDelivery === 'sms'
    ? `your mobile (••${norm.slice(-2)})`
    : center.email
      ? `your registered email (${center.email})`
      : 'your registered contact';

  res.json({
    success:    true,
    message:    `OTP sent to ${dest}.`,
    centerName: center.name,
    ownerName:  center.owner_name,
    deliveredVia: primaryDelivery || 'log',
    ...(DEV_MODE ? { devOtp: otp } : {}),
  });
});

// POST /api/auth/verify-otp  { mobile, otp }
router.post('/verify-otp', (req, res) => {
  const { mobile, otp } = req.body || {};
  if (!mobile || !otp)
    return res.status(400).json({ error: 'Mobile and OTP are required.' });

  const norm   = mobile.replace(/\s+/g, '');
  const center = db.findCenterByMobile(norm);
  if (!center) return res.status(404).json({ error: 'Center not found.' });

  const valid = db.verifyOtp(norm, otp.trim());
  if (!valid)  return res.status(400).json({ error: 'Invalid or expired OTP. Try again.' });

  const token = makeToken(center.id);
  console.log(`✅ Center logged in: ${center.name} (${norm})`);
  res.json({
    success: true,
    token,
    center: {
      id: center.id, name: center.name, owner_name: center.owner_name,
      mobile: center.mobile, email: center.email, address: center.address,
      city: center.city || null, pincode: center.pincode || null,
      city_pending: center.city_pending || null,
      wash_types: center.wash_types, open_time: center.open_time,
      close_time: center.close_time, is_open: center.is_open,
      bank_account: center.bank_account || null,
      ifsc: center.ifsc || null,
      account_name: center.account_name || null,
      bank_name: center.bank_name || null,
      gstin: center.gstin || null,
    },
  });
});

// GET /api/auth/me — also re-issues a fresh token (sliding window).
router.get('/me', requireAuth, (req, res) => {
  const c = req.center;
  res.json({
    id: c.id, name: c.name, owner_name: c.owner_name,
    mobile: c.mobile, email: c.email, address: c.address,
    city: c.city || null, pincode: c.pincode || null,
    city_pending: c.city_pending || null,
    wash_types: c.wash_types, open_time: c.open_time,
    close_time: c.close_time, is_open: c.is_open,
    bank_account: c.bank_account || null,
    ifsc: c.ifsc || null,
    account_name: c.account_name || null,
    bank_name: c.bank_name || null,
    gstin: c.gstin || null,
    token: makeToken(c.id),
  });
});

// PATCH /api/auth/bank-details  { bank_account, ifsc, account_name, bank_name }
router.patch('/bank-details', requireAuth, (req, res) => {
  const { bank_account, ifsc, account_name, bank_name } = req.body || {};
  if (!bank_account?.trim()) return res.status(400).json({ error: 'Account number is required.' });
  if (!ifsc?.trim())         return res.status(400).json({ error: 'IFSC code is required.' });
  if (!account_name?.trim()) return res.status(400).json({ error: 'Account holder name is required.' });
  if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test((ifsc || '').toUpperCase()))
    return res.status(400).json({ error: 'Enter a valid 11-character IFSC code.' });

  db.updateBankDetails(req.center.id, {
    bank_account: bank_account.trim(),
    ifsc: ifsc.trim().toUpperCase(),
    account_name: account_name.trim(),
    bank_name: (bank_name || '').trim(),
  });
  const updated = db.findCenterById(req.center.id);
  console.log(`🏦 Bank details updated for center: ${req.center.name}`);
  res.json({
    success: true,
    bank_account: updated.bank_account,
    ifsc: updated.ifsc,
    account_name: updated.account_name,
    bank_name: updated.bank_name,
  });
});

// PATCH /api/auth/open-status  { is_open }
router.patch('/open-status', requireAuth, (req, res) => {
  const { is_open } = req.body || {};
  db.setCenterOpenStatus(req.center.id, is_open);
  res.json({ success: true, is_open: !!is_open });
});

// PATCH /api/auth/center  { name, owner_name, email, address, gstin, wash_types, open_time, close_time, city?, pincode? }
router.patch('/center', requireAuth, (req, res) => {
  const { name, owner_name, email, address, gstin, wash_types, open_time, close_time, city, pincode } = req.body || {};
  if (!name?.trim()) return res.status(400).json({ error: 'Center name is required.' });

  let cityChangePending = null;
  if (city?.trim()) {
    const normalizedCity = city.trim().replace(/\S+/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
    if (normalizedCity.toLowerCase() !== (req.center.city || '').toLowerCase()) {
      db.requestCityChange(req.center.id, normalizedCity);
      cityChangePending = normalizedCity;
    }
  }

  db.updateCenterInfo(req.center.id, { name, owner_name, email, address, gstin, wash_types, open_time, close_time, pincode });
  const updated = db.findCenterById(req.center.id);
  console.log(`✅ Center info updated: ${updated.name}`);
  res.json({
    success: true,
    center: updated,
    ...(cityChangePending ? { cityChangePending, cityChangeMessage: 'City change submitted for super admin approval.' } : {}),
  });
});

// POST /api/auth/logout
router.post('/logout', requireAuth, (_req, res) => {
  res.json({ success: true });
});

module.exports = router;
module.exports.requireAuth = requireAuth;
