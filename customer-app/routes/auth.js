const express        = require('express');
const jwt            = require('jsonwebtoken');
const db             = require('../db/database');
const { sendOtpEmail } = require('../utils/email');

const router          = express.Router();
const JWT_SECRET      = process.env.JWT_SECRET || 'sparkwash_dev_secret';
const JWT_EXPIRES_IN  = process.env.JWT_EXPIRES_IN || '30d';
const OTP_MINUTES     = parseInt(process.env.OTP_EXPIRES_MINUTES || '5', 10);
const DEV_MODE        = process.env.DEV_MODE !== 'false'; // default ON; set DEV_MODE=false in prod to hide

// ── HELPERS ─────────────────────────────────────────────────

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function isMobile(val) {
  return /^[6-9]\d{9}$/.test(val.replace(/\s+/g, ''));
}

function isEmail(val) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
}

function normaliseIdentifier(val) {
  const clean = val.trim();
  if (isMobile(clean)) return { type: 'mobile', value: clean.replace(/\s+/g, '') };
  if (isEmail(clean))  return { type: 'email',  value: clean.toLowerCase() };
  return null;
}

function makeToken(userId) {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// Middleware: validate Bearer JWT
function requireAuth(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Unauthorised' });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = db.findUserById(payload.sub);
    if (!user) return res.status(401).json({ error: 'User not found' });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Token expired or invalid' });
  }
}

// ── ROUTES ──────────────────────────────────────────────────

/**
 * POST /api/auth/register
 * Body: { full_name, mobile, email }
 */
router.post('/register', (req, res) => {
  const { full_name, mobile, email } = req.body || {};

  if (!full_name || !full_name.trim())
    return res.status(400).json({ error: 'Full name is required.' });

  if (!mobile || !isMobile(mobile.replace(/\s+/g, '')))
    return res.status(400).json({ error: 'Enter a valid 10-digit mobile number.' });

  if (!email || !isEmail(email))
    return res.status(400).json({ error: 'Enter a valid email address.' });

  const normMobile = mobile.replace(/\s+/g, '');
  const normEmail  = email.toLowerCase().trim();

  if (db.findUserByMobile(normMobile))
    return res.status(409).json({ error: 'This mobile number is already registered. Please log in.' });

  if (db.findUserByEmail(normEmail))
    return res.status(409).json({ error: 'This email is already registered. Please log in.' });

  const user = db.createUser(full_name, normMobile, normEmail);

  console.log(`✅ New user registered: ${user.full_name} (${user.mobile} / ${user.email})`);
  res.status(201).json({ success: true, message: 'Account created! Please log in.' });
});

/**
 * POST /api/auth/send-otp
 * Body: { identifier }  — mobile number or email address
 */
router.post('/send-otp', (req, res) => {
  const { identifier } = req.body || {};
  if (!identifier || !identifier.trim())
    return res.status(400).json({ error: 'Enter your mobile number or email.' });

  const parsed = normaliseIdentifier(identifier);
  if (!parsed)
    return res.status(400).json({ error: 'Enter a valid mobile number or email address.' });

  const user = parsed.type === 'mobile'
    ? db.findUserByMobile(parsed.value)
    : db.findUserByEmail(parsed.value);

  if (!user)
    return res.status(404).json({ error: 'No account found. Please sign up first.' });

  const otp = generateOtp();
  db.saveOtp(parsed.value, otp, OTP_MINUTES);

  console.log(`\n🔐 OTP for ${parsed.value}: ${otp}  (expires in ${OTP_MINUTES} min)\n`);

  // Always send OTP to user's registered email
  if (user.email) {
    sendOtpEmail(user.email, otp, user.full_name, OTP_MINUTES).catch(err => {
      console.error(`📧 OTP email error for ${user.email}:`, err.message);
    });
  }

  const responsePayload = {
    success: true,
    message: `OTP sent to your ${parsed.type === 'mobile' ? 'mobile number' : 'email address'}.`,
    userName: user.full_name,
  };

  if (DEV_MODE) responsePayload.devOtp = otp;

  res.json(responsePayload);
});

/**
 * POST /api/auth/verify-otp
 * Body: { identifier, otp }
 */
router.post('/verify-otp', (req, res) => {
  const { identifier, otp } = req.body || {};

  if (!identifier || !otp)
    return res.status(400).json({ error: 'Identifier and OTP are required.' });

  const parsed = normaliseIdentifier(identifier);
  if (!parsed)
    return res.status(400).json({ error: 'Invalid identifier format.' });

  const user = parsed.type === 'mobile'
    ? db.findUserByMobile(parsed.value)
    : db.findUserByEmail(parsed.value);

  if (!user)
    return res.status(404).json({ error: 'User not found.' });

  const valid = db.verifyOtp(parsed.value, otp.trim());
  if (!valid)
    return res.status(400).json({ error: 'Invalid or expired OTP. Try again.' });

  const token = makeToken(user.id);
  console.log(`✅ User logged in: ${user.full_name} (${parsed.value})`);

  res.json({
    success: true,
    token,
    user: {
      id:        user.id,
      full_name: user.full_name,
      mobile:    user.mobile,
      email:     user.email,
    },
  });
});

/**
 * GET /api/auth/me
 * Header: Authorization: Bearer <token>
 */
router.get('/me', requireAuth, (req, res) => {
  const { id, full_name, mobile, email } = req.user;
  res.json({ id, full_name, mobile, email });
});

/**
 * POST /api/auth/logout
 * (Client-side logout — just confirm. JWT is stateless; client deletes token.)
 */
router.post('/logout', requireAuth, (_req, res) => {
  res.json({ success: true, message: 'Logged out.' });
});

/**
 * GET /api/auth/email-diag?to=someone@example.com
 * Diagnostic: connects to SMTP, verifies, sends a test email, and returns
 * the full result (or error code/message) so we can see exactly what is
 * failing on Railway. Uses the transporter directly to surface raw errors.
 */
router.get('/email-diag', async (req, res) => {
  const to = (req.query.to || '').toString().trim();
  if (!to) return res.status(400).json({ error: 'Missing ?to=email parameter' });

  const env = {
    resend: {
      hasKey: !!process.env.RESEND_API_KEY,
      from:   process.env.RESEND_FROM || 'SparkWash <onboarding@resend.dev>',
    },
    smtp: {
      host:    process.env.SMTP_HOST   || null,
      port:    process.env.SMTP_PORT   || null,
      user:    process.env.SMTP_USER   || null,
      hasPass: !!process.env.SMTP_PASS,
      passLen: (process.env.SMTP_PASS || '').length,
    },
  };

  // Try Resend first if configured
  if (process.env.RESEND_API_KEY) {
    const started = Date.now();
    try {
      const from = env.resend.from;
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization:  `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: [to],
          subject: 'SparkWash diag (Resend) — ' + new Date().toISOString(),
          html:    '<p>If you received this, Resend from Railway is working.</p>',
        }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) {
        return res.status(500).json({ ok: false, via: 'resend', ms: Date.now() - started, env, status: r.status, body });
      }
      return res.json({ ok: true, via: 'resend', ms: Date.now() - started, env, id: body.id });
    } catch (err) {
      return res.status(500).json({ ok: false, via: 'resend', ms: Date.now() - started, env, error: err.message });
    }
  }

  // Fall back to SMTP diagnostic
  const nodemailer = require('nodemailer');
  if (!env.smtp.host || !env.smtp.user || !env.smtp.hasPass) {
    return res.status(500).json({ ok: false, via: 'none', env, error: 'No RESEND_API_KEY and SMTP env vars missing' });
  }

  const t = nodemailer.createTransport({
    host:   env.smtp.host,
    port:   parseInt(env.smtp.port || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth:   { user: env.smtp.user, pass: process.env.SMTP_PASS },
    family: 4,
    connectionTimeout: 10000,
    greetingTimeout:   10000,
    socketTimeout:     15000,
  });

  const started = Date.now();
  try {
    await t.verify();
    const info = await t.sendMail({
      from:    process.env.SMTP_FROM || `"SparkWash Diag" <${env.smtp.user}>`,
      to,
      subject: 'SparkWash diag (SMTP) — ' + new Date().toISOString(),
      text:    'If you received this, SMTP from Railway is working.',
    });
    res.json({ ok: true, via: 'smtp', ms: Date.now() - started, env, messageId: info.messageId });
  } catch (err) {
    res.status(500).json({
      ok: false, via: 'smtp', ms: Date.now() - started, env,
      error:   err.message,
      code:    err.code    || null,
      command: err.command || null,
      response: err.response || null,
    });
  }
});

module.exports = router;
