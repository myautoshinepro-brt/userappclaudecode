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
app.use('/api/auth', require('./routes/auth'));

// Centers — proxied from center-app so the frontend stays same-origin.
// Set CENTER_APP_URL on the customer-app Railway service to the center-app's URL.
const CENTER_APP_URL = (process.env.CENTER_APP_URL || 'http://localhost:3001').replace(/\/$/, '');
app.get('/api/centers', async (_req, res) => {
  try {
    const r = await fetch(`${CENTER_APP_URL}/api/public/centers`);
    if (!r.ok) throw new Error(`center-app returned ${r.status}`);
    res.json(await r.json());
  } catch (e) {
    console.error('GET /api/centers proxy error:', e.message);
    res.status(502).json({ success: false, error: 'Could not fetch centers' });
  }
});

// Catch-all: always serve index.html for any non-API route
app.get(/^(?!\/api).*$/, (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n🚿 SparkWash server running at http://localhost:${PORT}`);
  console.log('   OTPs will be printed here in development mode.\n');
});
