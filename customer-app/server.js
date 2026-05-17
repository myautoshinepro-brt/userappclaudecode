require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// Surface key startup info in logs so Railway deploy failures are diagnosable
// (no secrets — just whether they were set).
console.log('[boot] node', process.version, 'PORT=' + PORT, 'HOST=' + HOST);
console.log('[boot] env: DB_PATH=' + (process.env.DB_PATH ? '(set)' : '(default)')
          + ' JWT_SECRET=' + (process.env.JWT_SECRET ? '(set)' : '(default DEV)')
          + ' CENTER_APP_URL=' + (process.env.CENTER_APP_URL || '(default localhost:3001)')
          + ' RESEND_API_KEY=' + (process.env.RESEND_API_KEY ? '(set)' : '(unset)'));

// Don't let unhandled errors kill the process silently — Railway then reports
// "deploy failed" with zero detail. Logging surfaces them in the runtime log.
process.on('uncaughtException',  err => console.error('[fatal] uncaughtException:',  err));
process.on('unhandledRejection', err => console.error('[fatal] unhandledRejection:', err));

// Allow Capacitor origin + same-origin + any explicit CORS_ORIGIN override
const allowedOrigins = [
  'https://localhost',
  'capacitor://localhost',
  'http://localhost:3000',
  'http://localhost:3001'
];
if (process.env.CORS_ORIGIN) allowedOrigins.push(process.env.CORS_ORIGIN);

app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.CORS_ORIGIN === '*') {
      callback(null, true);
    } else {
      callback(null, true); // Fallback to true for dev, but log it
      console.warn('CORS origin not explicitly allowed:', origin);
    }
  },
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Serve the entire project as static files
app.use(express.static(path.join(__dirname)));

// Log all requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Health check — first thing so Railway's deploy phase always gets a fast
// 200 even if a downstream route or the DB init is slow. Without this Railway
// times out the healthcheck and marks the deploy as failed.
app.get('/health', (_req, res) => res.status(200).json({ ok: true, ts: Date.now() }));
app.get('/healthz', (_req, res) => res.status(200).send('ok'));

// Auth routes
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);
const { requireAuth } = authRoutes;

// Profile routes (vehicles, addresses) — stored locally in customer-app DB.
app.use('/api/profile', require('./routes/profile'));

// ── Centers / packages / bookings — proxied to center-app ─────────────
// Set CENTER_APP_URL on the customer-app Railway service to the center-app's URL.
const CENTER_APP_URL = (process.env.CENTER_APP_URL || 'http://localhost:3001').replace(/\/$/, '');
console.log('[boot] proxying upstream calls to CENTER_APP_URL =', CENTER_APP_URL);

// Diagnostic endpoint — returns what the server thinks its upstream is +
// whether it can actually reach it. Lets us debug 502s without trawling logs.
app.get('/api/_diag', async (_req, res) => {
  const target = `${CENTER_APP_URL}/api/public/centers`;
  let reach = { ok: false, error: null, status: null, ms: null };
  const t0 = Date.now();
  try {
    const r = await fetch(target);
    reach = { ok: r.ok, status: r.status, error: null, ms: Date.now() - t0 };
  } catch (e) {
    reach = { ok: false, status: null, error: e.message, ms: Date.now() - t0 };
  }
  res.json({
    CENTER_APP_URL,
    upstream_test: { target, ...reach },
    node: process.version,
  });
});

async function relayJson(res, url, init = {}) {
  try {
    const r = await fetch(url, init);
    const body = await r.json().catch(() => ({}));
    res.status(r.status).json(body);
  } catch (e) {
    console.error('[proxy] error →', url, '·', e.message);
    res.status(502).json({
      success: false,
      error: 'Upstream center-app unavailable',
      upstream: url,
      reason: e.message,
    });
  }
}

// Public: list & lookup centers — pass optional ?city= through to center-app
app.get('/api/centers', (req, res) => {
  const city = req.query.city ? `?city=${encodeURIComponent(req.query.city)}` : '';
  relayJson(res, `${CENTER_APP_URL}/api/public/centers${city}`);
});

app.get('/api/centers/:id/packages', (req, res) =>
  relayJson(res, `${CENTER_APP_URL}/api/public/centers/${encodeURIComponent(req.params.id)}/packages`));

// Public: list active promos
app.get('/api/promos', (_req, res) =>
  relayJson(res, `${CENTER_APP_URL}/api/public/promos`));

// Authed: create a booking. We inject customer_name/phone/email from the JWT user.
app.post('/api/bookings', requireAuth, (req, res) => {
  const payload = {
    ...req.body,
    customer_name:  req.user.full_name,
    customer_phone: req.user.mobile,
    customer_email: req.user.email,
  };
  relayJson(res, `${CENTER_APP_URL}/api/public/bookings`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  });
});

// Authed: customer's own booking history.
app.get('/api/bookings', requireAuth, (req, res) =>
  relayJson(res, `${CENTER_APP_URL}/api/public/bookings?phone=${encodeURIComponent(req.user.mobile)}`));

// Authed: submit a rating + comment on a completed booking.
app.post('/api/bookings/:ref/review', requireAuth, (req, res) => {
  const payload = { ...req.body, phone: req.user.mobile };
  relayJson(res, `${CENTER_APP_URL}/api/public/bookings/${encodeURIComponent(req.params.ref)}/review`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  });
});

// Authed: customer cancels their own booking.
app.post('/api/bookings/:ref/cancel', requireAuth, (req, res) => {
  relayJson(res, `${CENTER_APP_URL}/api/public/bookings/${encodeURIComponent(req.params.ref)}/cancel`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ phone: req.user.mobile }),
  });
});

// Authed: customer reschedules their own booking.
app.patch('/api/bookings/:ref/reschedule', requireAuth, (req, res) => {
  const payload = { ...req.body, phone: req.user.mobile };
  relayJson(res, `${CENTER_APP_URL}/api/public/bookings/${encodeURIComponent(req.params.ref)}/reschedule`, {
    method:  'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  });
});

// ── CHAT (authed; phone + name injected from JWT) ────────────────────
app.get('/api/chat/threads', requireAuth, (req, res) =>
  relayJson(res, `${CENTER_APP_URL}/api/public/chat/threads?phone=${encodeURIComponent(req.user.mobile)}`));

app.post('/api/chat/threads', requireAuth, (req, res) => {
  const payload = { ...req.body, phone: req.user.mobile, customer_name: req.user.full_name };
  relayJson(res, `${CENTER_APP_URL}/api/public/chat/threads`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  });
});

app.get('/api/chat/threads/:id/messages', requireAuth, (req, res) =>
  relayJson(res, `${CENTER_APP_URL}/api/public/chat/threads/${encodeURIComponent(req.params.id)}/messages?phone=${encodeURIComponent(req.user.mobile)}`));

app.post('/api/chat/threads/:id/messages', requireAuth, (req, res) => {
  const payload = { ...req.body, phone: req.user.mobile, customer_name: req.user.full_name };
  relayJson(res, `${CENTER_APP_URL}/api/public/chat/threads/${encodeURIComponent(req.params.id)}/messages`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  });
});

app.post('/api/chat/threads/:id/read', requireAuth, (req, res) =>
  relayJson(res, `${CENTER_APP_URL}/api/public/chat/threads/${encodeURIComponent(req.params.id)}/read`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ phone: req.user.mobile }),
  }));

// Catch-all: always serve index.html for any non-API route
app.get(/^(?!\/api).*$/, (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Explicit 0.0.0.0 bind — Node's default ('::') works in most containers but
// Railway occasionally requires the explicit IPv4 host. Cheap insurance.
app.listen(PORT, HOST, () => {
  console.log(`🚿 Pitbay customer-app listening on http://${HOST}:${PORT}`);
});
