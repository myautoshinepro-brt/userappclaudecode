require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';

// Surface key startup info in logs so Railway deploy failures are diagnosable
// (no secrets — just whether they were set).
console.log('[boot] node', process.version, 'PORT=' + PORT, 'HOST=' + HOST);
console.log('[boot] env: DB_PATH=' + (process.env.DB_PATH ? '(set)' : '(default ./db/...)')
          + ' JWT_SECRET=' + (process.env.JWT_SECRET ? '(set)' : '(default DEV)')
          + ' RESEND_API_KEY=' + (process.env.RESEND_API_KEY ? '(set)' : '(unset)')
          + ' CORS_ORIGIN=' + (process.env.CORS_ORIGIN || '*'));

// Crash visibility — without these, an unhandled rejection silently exits the
// process and Railway's "deploy failed" message has no detail.
process.on('uncaughtException',  err => console.error('[fatal] uncaughtException:',  err));
process.on('unhandledRejection', err => console.error('[fatal] unhandledRejection:', err));

const corsOrigin = process.env.CORS_ORIGIN || '*';
app.use(cors({ origin: corsOrigin }));
// 10mb limit — needed for base64 before/after wash photos
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname)));

// Health check — must respond fast and require no auth so Railway's deploy
// phase healthcheck always succeeds even if route modules are slow to load.
app.get('/health',  (_req, res) => res.status(200).json({ ok: true, ts: Date.now() }));
app.get('/healthz', (_req, res) => res.status(200).send('ok'));

app.use('/api/auth',      require('./routes/auth'));
app.use('/api/onboard',   require('./routes/onboard'));
app.use('/api/admin',     require('./routes/admin'));
app.use('/api/public',    require('./routes/public'));
app.use('/api/bookings',  require('./routes/bookings'));
app.use('/api/slots',     require('./routes/slots'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/packages',  require('./routes/packages'));
app.use('/api/reports',   require('./routes/reports'));
app.use('/api/reviews',   require('./routes/reviews'));

app.get(/^(?!\/api).*$/, (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Explicit 0.0.0.0 bind — Node's default ('::') works in most containers but
// Railway occasionally requires the explicit IPv4 host. Cheap insurance.
app.listen(PORT, HOST, () => {
  console.log(`🚿 Pitbay Center App listening on http://${HOST}:${PORT}`);
});
