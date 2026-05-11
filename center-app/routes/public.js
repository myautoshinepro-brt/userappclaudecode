const express = require('express');
const db      = require('../db/database');
const router  = express.Router();

const DEFAULT_RATING  = 4.5;
const DEFAULT_PRICE   = 149;
const MUMBAI_CENTROID = { lat: 19.076, lng: 72.877 };

// Stable per-id offset around Mumbai (~5km box) for centers without real coords.
// Used so map markers don't collapse to a single point.
function fallbackLatLng(id) {
  const seed = id * 9301 + 49297;
  const a = (seed % 233280) / 233280;
  const b = ((seed * 13) % 233280) / 233280;
  return {
    lat: MUMBAI_CENTROID.lat + (a - 0.5) * 0.10,
    lng: MUMBAI_CENTROID.lng + (b - 0.5) * 0.10,
  };
}

function shapeForCustomer(c) {
  const tags  = String(c.wash_types || '').split(',').map(t => t.trim()).filter(Boolean);
  const stats = db.getReviewsStats(c.id);
  const price = db.getMinPackagePrice(c.id);
  const area  = String(c.address || c.city || '').split(',').pop().trim() || c.city || '';

  const hasGeo = c.lat != null && c.lng != null;
  const geo    = hasGeo ? { lat: c.lat, lng: c.lng } : fallbackLatLng(c.id);

  return {
    id:        'c' + c.id,
    name:      c.name,
    area,
    distance:  0,
    rating:    stats && stats.avg_rating ? stats.avg_rating : DEFAULT_RATING,
    reviews:   stats && stats.total     ? stats.total     : 0,
    open:      !!c.is_open,
    openTill:  c.close_time || '',
    priceFrom: price != null ? price : DEFAULT_PRICE,
    tags,
    hasD2D:    tags.includes('d2d'),
    hasSteam:  tags.includes('steam'),
    lat:       geo.lat,
    lng:       geo.lng,
  };
}

router.get('/centers', (_req, res) => {
  res.json({ success: true, data: db.getAllCenters().map(shapeForCustomer) });
});

router.get('/centers/:id', (req, res) => {
  const id = parseInt(String(req.params.id || '').replace(/^c/, ''), 10);
  if (!id) return res.status(400).json({ error: 'Invalid id' });
  const c = db.findCenterById(id);
  if (!c) return res.status(404).json({ error: 'Center not found' });
  res.json({ success: true, data: shapeForCustomer(c) });
});

module.exports = router;
