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

// SMTP diagnostic route — remove once connection is confirmed working
app.use('/api/test', require('./routes/test'));

// Catch-all: always serve index.html for any non-API route
app.get(/^(?!\/api).*$/, (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n🚿 SparkWash server running at http://localhost:${PORT}`);
  console.log('   OTPs will be printed here in development mode.\n');
});
