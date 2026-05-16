const Database = require('better-sqlite3');
const path     = require('path');
const fs       = require('fs');

// In production (Railway) set DB_PATH=/data/sparkwash.sqlite pointing to a persistent volume
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'sparkwash.sqlite');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db      = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── SCHEMA ──────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name  TEXT    NOT NULL,
    mobile     TEXT    NOT NULL UNIQUE,
    email      TEXT    NOT NULL UNIQUE,
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS otps (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    identifier TEXT    NOT NULL,
    otp        TEXT    NOT NULL,
    expires_at TEXT    NOT NULL,
    used       INTEGER NOT NULL DEFAULT 0,
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS vehicles (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plate      TEXT    NOT NULL,
    model      TEXT,
    colour     TEXT,
    icon       TEXT    DEFAULT '🚗',
    is_primary INTEGER NOT NULL DEFAULT 0,
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS addresses (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    label      TEXT    NOT NULL,
    icon       TEXT    DEFAULT '📍',
    address    TEXT    NOT NULL,
    pincode    TEXT,
    is_default INTEGER NOT NULL DEFAULT 0,
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_otps_identifier  ON otps(identifier);
  CREATE INDEX IF NOT EXISTS idx_users_mobile     ON users(mobile);
  CREATE INDEX IF NOT EXISTS idx_users_email      ON users(email);
  CREATE INDEX IF NOT EXISTS idx_vehicles_user    ON vehicles(user_id);
  CREATE INDEX IF NOT EXISTS idx_addresses_user   ON addresses(user_id);
`);

// Migrate: add columns to addresses (safe to run multiple times — fails silently if columns exist)
try { db.exec('ALTER TABLE addresses ADD COLUMN lat  REAL'); } catch (_) {}
try { db.exec('ALTER TABLE addresses ADD COLUMN lng  REAL'); } catch (_) {}
try { db.exec('ALTER TABLE addresses ADD COLUMN city TEXT'); } catch (_) {}

// ── HELPERS ─────────────────────────────────────────────────

const userByMobile   = db.prepare('SELECT * FROM users WHERE mobile = ?');
const userByEmail    = db.prepare('SELECT * FROM users WHERE email  = ?');
const userById       = db.prepare('SELECT * FROM users WHERE id     = ?');
const insertUser     = db.prepare(
  'INSERT INTO users (full_name, mobile, email) VALUES (?, ?, ?)'
);

const insertOtp      = db.prepare(
  'INSERT INTO otps (identifier, otp, expires_at) VALUES (?, ?, ?)'
);
const latestValidOtp = db.prepare(`
  SELECT * FROM otps
  WHERE identifier = ? AND used = 0 AND expires_at > datetime('now')
  ORDER BY created_at DESC LIMIT 1
`);
const markOtpUsed    = db.prepare('UPDATE otps SET used = 1 WHERE id = ?');
const deleteOldOtps  = db.prepare(
  "DELETE FROM otps WHERE identifier = ? AND (used = 1 OR expires_at <= datetime('now'))"
);

// ── SEED demo users (idempotent) ─────────────────────────────
const _demoInsert = db.prepare('INSERT OR IGNORE INTO users (full_name, mobile, email) VALUES (?, ?, ?)');
[
  ['Ravi Teja',   '9999000001', 'demo1@pitbay.in'],
  ['Priya Singh', '9999000002', 'demo2@pitbay.in'],
  ['Amit Kumar',  '9999000003', 'demo3@pitbay.in'],
].forEach(u => _demoInsert.run(...u));

module.exports = {
  findUserByMobile(mobile)     { return userByMobile.get(mobile); },
  findUserByEmail(email)       { return userByEmail.get(email.toLowerCase()); },
  findUserById(id)             { return userById.get(id); },

  createUser(full_name, mobile, email) {
    const result = insertUser.run(full_name.trim(), mobile.trim(), email.toLowerCase().trim());
    return userById.get(result.lastInsertRowid);
  },

  saveOtp(identifier, otp, expiresMinutes = 5) {
    deleteOldOtps.run(identifier);
    const expiresAt = new Date(Date.now() + expiresMinutes * 60 * 1000)
      .toISOString()
      .replace('T', ' ')
      .slice(0, 19);
    insertOtp.run(identifier, otp, expiresAt);
  },

  verifyOtp(identifier, otp) {
    const row = latestValidOtp.get(identifier);
    if (!row || row.otp !== otp) return false;
    markOtpUsed.run(row.id);
    return true;
  },

  // ── VEHICLES ──
  listVehicles(userId) {
    return db.prepare("SELECT * FROM vehicles WHERE user_id=? ORDER BY is_primary DESC, id ASC").all(userId);
  },
  addVehicle(userId, { plate, model, colour, icon }) {
    const norm = String(plate || '').trim().toUpperCase();
    if (!norm) throw new Error('Plate is required');
    const existingPrimary = db.prepare("SELECT id FROM vehicles WHERE user_id=? AND is_primary=1").get(userId);
    const isPrimary = existingPrimary ? 0 : 1;  // first vehicle becomes primary
    const info = db.prepare(`
      INSERT INTO vehicles (user_id, plate, model, colour, icon, is_primary)
      VALUES (?,?,?,?,?,?)
    `).run(userId, norm, (model || '').trim() || null, (colour || '').trim() || null, icon || '🚗', isPrimary);
    return db.prepare("SELECT * FROM vehicles WHERE id=?").get(info.lastInsertRowid);
  },
  removeVehicle(userId, vehicleId) {
    const info = db.prepare("DELETE FROM vehicles WHERE id=? AND user_id=?").run(vehicleId, userId);
    return info.changes > 0;
  },
  setPrimaryVehicle(userId, vehicleId) {
    const t = db.transaction(() => {
      db.prepare("UPDATE vehicles SET is_primary=0 WHERE user_id=?").run(userId);
      db.prepare("UPDATE vehicles SET is_primary=1 WHERE id=? AND user_id=?").run(vehicleId, userId);
    });
    t();
    return db.prepare("SELECT * FROM vehicles WHERE id=? AND user_id=?").get(vehicleId, userId);
  },

  // ── ADDRESSES ──
  listAddresses(userId) {
    return db.prepare("SELECT * FROM addresses WHERE user_id=? ORDER BY is_default DESC, id ASC").all(userId);
  },
  addAddress(userId, { label, icon, address, pincode, lat, lng, city }) {
    if (!label?.trim())   throw new Error('Label is required');
    if (!address?.trim()) throw new Error('Address is required');
    const existingDefault = db.prepare("SELECT id FROM addresses WHERE user_id=? AND is_default=1").get(userId);
    const isDefault = existingDefault ? 0 : 1;
    const info = db.prepare(`
      INSERT INTO addresses (user_id, label, icon, address, pincode, is_default, lat, lng, city)
      VALUES (?,?,?,?,?,?,?,?,?)
    `).run(userId, label.trim(), icon || '📍', address.trim(), (pincode || '').trim() || null, isDefault,
           lat != null ? parseFloat(lat) : null, lng != null ? parseFloat(lng) : null, city || null);
    return db.prepare("SELECT * FROM addresses WHERE id=?").get(info.lastInsertRowid);
  },
  updateAddress(userId, addrId, { label, icon, address, pincode, lat, lng, city }) {
    if (!label?.trim())   throw new Error('Label is required');
    if (!address?.trim()) throw new Error('Address is required');
    const info = db.prepare(`
      UPDATE addresses SET label=?, icon=?, address=?, pincode=?, lat=?, lng=?, city=?
      WHERE id=? AND user_id=?
    `).run(label.trim(), icon || '📍', address.trim(), (pincode || '').trim() || null,
           lat != null ? parseFloat(lat) : null, lng != null ? parseFloat(lng) : null,
           city || null, addrId, userId);
    if (!info.changes) return null;
    return db.prepare("SELECT * FROM addresses WHERE id=?").get(addrId);
  },
  removeAddress(userId, addrId) {
    const info = db.prepare("DELETE FROM addresses WHERE id=? AND user_id=?").run(addrId, userId);
    return info.changes > 0;
  },
  setDefaultAddress(userId, addrId) {
    const t = db.transaction(() => {
      db.prepare("UPDATE addresses SET is_default=0 WHERE user_id=?").run(userId);
      db.prepare("UPDATE addresses SET is_default=1 WHERE id=? AND user_id=?").run(addrId, userId);
    });
    t();
    return db.prepare("SELECT * FROM addresses WHERE id=? AND user_id=?").get(addrId, userId);
  },
};
