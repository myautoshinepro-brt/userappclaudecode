require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3001;

const corsOrigin = process.env.CORS_ORIGIN || '*';
app.use(cors({ origin: corsOrigin }));
// 10mb limit — needed for base64 before/after wash photos
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname)));

app.use('/api/auth',      require('./routes/auth'));
app.use('/api/onboard',   require('./routes/onboard'));
app.use('/api/bookings',  require('./routes/bookings'));
app.use('/api/slots',     require('./routes/slots'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/packages',  require('./routes/packages'));
app.use('/api/reports',   require('./routes/reports'));
app.use('/api/reviews',   require('./routes/reviews'));

app.get(/^(?!\/api).*$/, (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n🚿 SparkWash Center App running at http://localhost:${PORT}`);
  console.log('   OTPs will be printed here in development mode.\n');
});
