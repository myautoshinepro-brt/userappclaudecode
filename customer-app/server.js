require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

// Allow same-origin (app serves its own frontend) + any explicit CORS_ORIGIN override
const corsOrigin = process.env.CORS_ORIGIN || '*';
app.use(cors({ origin: corsOrigin }));
app.use(express.json({ limit: '10mb' }));

// Serve the entire project as static files
app.use(express.static(path.join(__dirname)));

// Auth routes
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);
const { requireAuth } = authRoutes;

// Profile routes (vehicles, addresses) — stored locally in customer-app DB.
app.use('/api/profile', require('./routes/profile'));

// ── Centers / packages / bookings — proxied to center-app ─────────────
// Set CENTER_APP_URL on the customer-app Railway service to the center-app's URL.
const CENTER_APP_URL = (process.env.CENTER_APP_URL || 'http://localhost:3001').replace(/\/$/, '');

async function relayJson(res, url, init = {}) {
  try {
    const r = await fetch(url, init);
    const body = await r.json().catch(() => ({}));
    res.status(r.status).json(body);
  } catch (e) {
    console.error('Proxy error →', url, e.message);
    res.status(502).json({ success: false, error: 'Upstream center-app unavailable' });
  }
}

// Public: list & lookup centers
app.get('/api/centers', (_req, res) =>
  relayJson(res, `${CENTER_APP_URL}/api/public/centers`));

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

app.listen(PORT, () => {
  console.log(`\n🚿 Pitbay server running at http://localhost:${PORT}`);
  console.log('   OTPs will be printed here in development mode.\n');
});
