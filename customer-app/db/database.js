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

  CREATE INDEX IF NOT EXISTS idx_otps_identifier ON otps(identifier);
  CREATE INDEX IF NOT EXISTS idx_users_mobile    ON users(mobile);
  CREATE INDEX IF NOT EXISTS idx_users_email     ON users(email);
`);

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
};
