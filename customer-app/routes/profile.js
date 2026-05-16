const express = require('express');
const db      = require('../db/database');
const { requireAuth } = require('./auth');

const router = express.Router();

// ── VEHICLES ──────────────────────────────────────────────────

router.get('/vehicles', requireAuth, (req, res) => {
  res.json({ success: true, data: db.listVehicles(req.user.id) });
});

router.post('/vehicles', requireAuth, (req, res) => {
  const { plate, model, colour, icon } = req.body || {};
  if (!plate || !plate.trim())
    return res.status(400).json({ error: 'Plate is required.' });
  try {
    const v = db.addVehicle(req.user.id, { plate, model, colour, icon });
    res.status(201).json({ success: true, data: v });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.delete('/vehicles/:id', requireAuth, (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ error: 'Invalid id' });
  const removed = db.removeVehicle(req.user.id, id);
  if (!removed) return res.status(404).json({ error: 'Vehicle not found' });
  res.json({ success: true });
});

router.patch('/vehicles/:id/primary', requireAuth, (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ error: 'Invalid id' });
  const v = db.setPrimaryVehicle(req.user.id, id);
  if (!v) return res.status(404).json({ error: 'Vehicle not found' });
  res.json({ success: true, data: v });
});

// ── ADDRESSES ─────────────────────────────────────────────────

router.get('/addresses', requireAuth, (req, res) => {
  res.json({ success: true, data: db.listAddresses(req.user.id) });
});

router.post('/addresses', requireAuth, (req, res) => {
  const { label, icon, address, pincode, lat, lng, city } = req.body || {};
  try {
    const a = db.addAddress(req.user.id, { label, icon, address, pincode, lat, lng, city });
    res.status(201).json({ success: true, data: a });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.put('/addresses/:id', requireAuth, (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ error: 'Invalid id' });
  const { label, icon, address, pincode, lat, lng, city } = req.body || {};
  try {
    const a = db.updateAddress(req.user.id, id, { label, icon, address, pincode, lat, lng, city });
    if (!a) return res.status(404).json({ error: 'Address not found' });
    res.json({ success: true, data: a });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.delete('/addresses/:id', requireAuth, (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ error: 'Invalid id' });
  const removed = db.removeAddress(req.user.id, id);
  if (!removed) return res.status(404).json({ error: 'Address not found' });
  res.json({ success: true });
});

router.patch('/addresses/:id/default', requireAuth, (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ error: 'Invalid id' });
  const a = db.setDefaultAddress(req.user.id, id);
  if (!a) return res.status(404).json({ error: 'Address not found' });
  res.json({ success: true, data: a });
});

module.exports = router;
