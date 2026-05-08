const express         = require('express');
const db              = require('../db/database');
const { requireAuth } = require('./auth');

const router = express.Router();

const VALID_WASH = new Set(['water', 'dry', 'steam', 'd2d']);
const VALID_DURATIONS = new Set([15, 30, 45, 60, 75, 90, 105, 120]);

function parseTasks(input) {
  if (Array.isArray(input)) {
    return input.map(t => String(t).trim()).filter(Boolean).slice(0, 20);
  }
  return [];
}

function validate(body) {
  const name  = String(body.name || '').trim();
  const wt    = String(body.wash_type || '').trim();
  const price = parseInt(body.price, 10);
  const dur   = parseInt(body.duration_minutes, 10);

  if (!name)              return 'Package name is required.';
  if (name.length > 60)   return 'Package name is too long (max 60 chars).';
  if (!VALID_WASH.has(wt)) return 'Invalid wash type.';
  if (!Number.isFinite(price) || price < 0 || price > 100000)
    return 'Price must be between ₹0 and ₹1,00,000.';
  if (!VALID_DURATIONS.has(dur))
    return 'Duration must be 15, 30, 45, 60, 75, 90, 105, or 120 minutes.';
  return null;
}

function shape(p) {
  if (!p) return null;
  let tasks = [];
  try { tasks = JSON.parse(p.tasks || '[]'); } catch { tasks = []; }
  return {
    id: p.id, wash_type: p.wash_type, name: p.name,
    price: p.price, duration_minutes: p.duration_minutes,
    tasks, sort_order: p.sort_order,
  };
}

// GET /api/packages
router.get('/', requireAuth, (req, res) => {
  const rows = db.listPackages(req.center.id).map(shape);
  res.json({ success: true, packages: rows });
});

// POST /api/packages
router.post('/', requireAuth, (req, res) => {
  const err = validate(req.body || {});
  if (err) return res.status(400).json({ error: err });

  const pkg = db.createPackage(req.center.id, {
    wash_type:        req.body.wash_type,
    name:             req.body.name.trim(),
    price:            parseInt(req.body.price, 10),
    duration_minutes: parseInt(req.body.duration_minutes, 10),
    tasks:            parseTasks(req.body.tasks),
  });
  res.json({ success: true, package: shape(pkg) });
});

// PATCH /api/packages/:id
router.patch('/:id', requireAuth, (req, res) => {
  const id      = Number(req.params.id);
  const existing = db.getPackage(id);
  if (!existing || existing.center_id !== req.center.id)
    return res.status(404).json({ error: 'Package not found.' });

  const err = validate(req.body || {});
  if (err) return res.status(400).json({ error: err });

  const pkg = db.updatePackage(id, req.center.id, {
    wash_type:        req.body.wash_type,
    name:             req.body.name.trim(),
    price:            parseInt(req.body.price, 10),
    duration_minutes: parseInt(req.body.duration_minutes, 10),
    tasks:            parseTasks(req.body.tasks),
    sort_order:       existing.sort_order,
  });
  res.json({ success: true, package: shape(pkg) });
});

// DELETE /api/packages/:id  (soft delete)
router.delete('/:id', requireAuth, (req, res) => {
  const id       = Number(req.params.id);
  const existing = db.getPackage(id);
  if (!existing || existing.center_id !== req.center.id)
    return res.status(404).json({ error: 'Package not found.' });
  db.deletePackage(id, req.center.id);
  res.json({ success: true });
});

module.exports = router;
