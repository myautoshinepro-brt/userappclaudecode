const Database = require('better-sqlite3');
const path     = require('path');
const fs       = require('fs');

// In production (Railway) set DB_PATH=/data/sparkwash-center.sqlite pointing to a persistent volume
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'sparkwash-center.sqlite');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db      = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function toTitleCase(str) {
  if (!str) return str;
  return String(str).trim().replace(/\S+/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

// Day-grid slot times (30-min granularity). Used for fan-out math when computing
// how many slot windows a booking with a given duration_minutes occupies.
const SLOT_TIMES = [
  '09:00 AM','09:30 AM','10:00 AM','10:30 AM','11:00 AM','11:30 AM',
  '12:00 PM','12:30 PM','01:00 PM','01:30 PM','02:00 PM','02:30 PM',
  '03:00 PM','03:30 PM','04:00 PM','04:30 PM','05:00 PM','05:30 PM',
];

db.exec(`
  CREATE TABLE IF NOT EXISTS centers (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    name         TEXT    NOT NULL,
    owner_name   TEXT    NOT NULL,
    mobile       TEXT    NOT NULL UNIQUE,
    email        TEXT    UNIQUE,
    address      TEXT,
    city         TEXT    DEFAULT 'Mumbai',
    gstin        TEXT,
    wash_types   TEXT    NOT NULL DEFAULT 'water,dry',
    open_time    TEXT    NOT NULL DEFAULT '09:00',
    close_time   TEXT    NOT NULL DEFAULT '18:00',
    is_open      INTEGER NOT NULL DEFAULT 1,
    created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS otps (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    identifier TEXT    NOT NULL,
    otp        TEXT    NOT NULL,
    expires_at TEXT    NOT NULL,
    used       INTEGER NOT NULL DEFAULT 0,
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_ref   TEXT    NOT NULL UNIQUE,
    center_id     INTEGER NOT NULL REFERENCES centers(id),
    customer_name TEXT    NOT NULL,
    customer_phone TEXT   NOT NULL,
    vehicle_plate TEXT    NOT NULL,
    vehicle_model TEXT,
    wash_type     TEXT    NOT NULL,
    package_name  TEXT    NOT NULL,
    package_price INTEGER NOT NULL,
    slot_date     TEXT    NOT NULL,
    slot_time     TEXT    NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 30,
    status        TEXT    NOT NULL DEFAULT 'new',
    rating        INTEGER,
    notes         TEXT,
    created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS slots (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    center_id  INTEGER NOT NULL REFERENCES centers(id),
    wash_type  TEXT    NOT NULL,
    slot_date  TEXT    NOT NULL,
    slot_time  TEXT    NOT NULL,
    is_blocked INTEGER NOT NULL DEFAULT 0,
    capacity   INTEGER NOT NULL DEFAULT 1,
    UNIQUE(center_id, wash_type, slot_date, slot_time)
  );

  CREATE TABLE IF NOT EXISTS packages (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    center_id        INTEGER NOT NULL REFERENCES centers(id),
    wash_type        TEXT    NOT NULL,
    name             TEXT    NOT NULL,
    price            INTEGER NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 30,
    tasks            TEXT    NOT NULL DEFAULT '[]',
    sort_order       INTEGER NOT NULL DEFAULT 0,
    is_active        INTEGER NOT NULL DEFAULT 1,
    created_at       TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at       TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_otps_identifier      ON otps(identifier);
  CREATE INDEX IF NOT EXISTS idx_centers_mobile       ON centers(mobile);
  CREATE INDEX IF NOT EXISTS idx_bookings_center_date ON bookings(center_id, slot_date);
  CREATE INDEX IF NOT EXISTS idx_bookings_status      ON bookings(status);
  CREATE INDEX IF NOT EXISTS idx_slots_center_date    ON slots(center_id, slot_date);
  CREATE INDEX IF NOT EXISTS idx_packages_center      ON packages(center_id, wash_type, is_active);
`);

// ── Migration: backfill duration_minutes on bookings if column was just added ──
let _addedDurationCol = false;
try {
  db.exec("ALTER TABLE bookings ADD COLUMN duration_minutes INTEGER NOT NULL DEFAULT 30");
  _addedDurationCol = true;
} catch { /* column already exists */ }
if (_addedDurationCol) {
  db.exec(`
    UPDATE bookings SET duration_minutes = 60
      WHERE package_name LIKE '%Full Body%' OR package_name LIKE '%Premium%' OR package_name LIKE '%D2D Standard%';
    UPDATE bookings SET duration_minutes = 90
      WHERE package_name LIKE '%D2D Premium%';
    UPDATE bookings SET duration_minutes = 75
      WHERE package_name LIKE '%Steam Full Body%';
  `);
}

// ── Migration: review_comment and review_reply columns ──
try { db.exec("ALTER TABLE bookings ADD COLUMN review_comment TEXT"); } catch { /* exists */ }
try { db.exec("ALTER TABLE bookings ADD COLUMN review_reply   TEXT"); } catch { /* exists */ }

// ── Migration: payment fields ──
try { db.exec("ALTER TABLE bookings ADD COLUMN app_discount      INTEGER NOT NULL DEFAULT 0"); } catch { /* exists */ }
try { db.exec("ALTER TABLE bookings ADD COLUMN center_discount   INTEGER NOT NULL DEFAULT 0"); } catch { /* exists */ }
try { db.exec("ALTER TABLE bookings ADD COLUMN payment_collected INTEGER NOT NULL DEFAULT 0"); } catch { /* exists */ }

// ── Migration: customer email on bookings ──
try { db.exec("ALTER TABLE bookings ADD COLUMN customer_email TEXT"); } catch { /* exists */ }

// ── Migration: before/after wash photos ──
try { db.exec("ALTER TABLE bookings ADD COLUMN photo_before TEXT"); } catch { /* exists */ }
try { db.exec("ALTER TABLE bookings ADD COLUMN photo_after  TEXT"); } catch { /* exists */ }

// ── Migration: center bank account for settlements ──
try { db.exec("ALTER TABLE centers ADD COLUMN bank_account  TEXT"); } catch { /* exists */ }
try { db.exec("ALTER TABLE centers ADD COLUMN ifsc          TEXT"); } catch { /* exists */ }
try { db.exec("ALTER TABLE centers ADD COLUMN account_name  TEXT"); } catch { /* exists */ }
try { db.exec("ALTER TABLE centers ADD COLUMN bank_name     TEXT"); } catch { /* exists */ }

// ── Migration: center geo coordinates (used by customer-app map) ──
try { db.exec("ALTER TABLE centers ADD COLUMN lat REAL"); } catch { /* exists */ }
try { db.exec("ALTER TABLE centers ADD COLUMN lng REAL"); } catch { /* exists */ }

// ── Migration: super-admin controls (visibility in customer app + sort order) ──
try { db.exec("ALTER TABLE centers ADD COLUMN visible       INTEGER NOT NULL DEFAULT 1"); }   catch { /* exists */ }
try { db.exec("ALTER TABLE centers ADD COLUMN display_order INTEGER NOT NULL DEFAULT 999"); } catch { /* exists */ }
// Existing rows that came in before the migration get NULLs from SQLite even
// with a DEFAULT clause on ADD COLUMN — backfill display_order from id so each
// center has a stable, deterministic slot until the super admin reorders.
try {
  db.prepare("UPDATE centers SET display_order = id WHERE display_order IS NULL OR display_order = 999").run();
} catch { /* table empty or no-op */ }

// ── Migration: pincode and pending city change approval ──
try { db.exec("ALTER TABLE centers ADD COLUMN pincode      TEXT"); } catch { /* exists */ }
try { db.exec("ALTER TABLE centers ADD COLUMN city_pending TEXT"); } catch { /* exists */ }

// ── Data fix: normalize all existing city names to Title Case ──
try {
  const _cityRows = db.prepare("SELECT id, city FROM centers WHERE city IS NOT NULL").all();
  for (const r of _cityRows) {
    const norm = toTitleCase(r.city);
    if (norm !== r.city) db.prepare("UPDATE centers SET city=? WHERE id=?").run(norm, r.id);
  }
} catch { /* no-op if table empty */ }
try {
  const _appRows = db.prepare("SELECT id, city FROM applications WHERE city IS NOT NULL").all();
  for (const r of _appRows) {
    const norm = toTitleCase(r.city);
    if (norm !== r.city) db.prepare("UPDATE applications SET city=? WHERE id=?").run(norm, r.id);
  }
} catch { /* applications table may not exist yet on first run */ }

// ── Migration: enhanced application fields ──
try { db.exec("ALTER TABLE applications ADD COLUMN geo_lat       REAL"); } catch { /* exists */ }
try { db.exec("ALTER TABLE applications ADD COLUMN geo_lng       REAL"); } catch { /* exists */ }
try { db.exec("ALTER TABLE applications ADD COLUMN center_images TEXT"); } catch { /* exists */ }
try { db.exec("ALTER TABLE applications ADD COLUMN certificates  TEXT"); } catch { /* exists */ }
try { db.exec("ALTER TABLE applications ADD COLUMN wash_types    TEXT"); } catch { /* exists */ }
try { db.exec("ALTER TABLE applications ADD COLUMN bank_name     TEXT"); } catch { /* exists */ }

// ── Chat tables ──
db.exec(`
  CREATE TABLE IF NOT EXISTS chat_threads (
    id                   INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_phone       TEXT    NOT NULL,
    customer_name        TEXT,
    booking_ref          TEXT,
    subject              TEXT,
    status               TEXT    NOT NULL DEFAULT 'open',
    last_message_at      TEXT,
    last_message_preview TEXT,
    last_message_sender  TEXT,
    unread_customer      INTEGER NOT NULL DEFAULT 0,
    unread_admin         INTEGER NOT NULL DEFAULT 0,
    created_at           TEXT    NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS chat_messages (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    thread_id   INTEGER NOT NULL REFERENCES chat_threads(id),
    sender      TEXT    NOT NULL,           -- 'customer' | 'admin' | 'system'
    sender_name TEXT,
    text        TEXT    NOT NULL,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_chat_threads_phone   ON chat_threads(customer_phone);
  CREATE INDEX IF NOT EXISTS idx_chat_threads_booking ON chat_threads(booking_ref);
  CREATE INDEX IF NOT EXISTS idx_chat_messages_thread ON chat_messages(thread_id, id);
`);

// Migration: read-receipt cursor — highest message id each side has read.
// Customer-side ticks turn blue when admin_last_read_message_id >= message id.
try { db.exec("ALTER TABLE chat_threads ADD COLUMN admin_last_read_message_id    INTEGER NOT NULL DEFAULT 0"); } catch { /* exists */ }
try { db.exec("ALTER TABLE chat_threads ADD COLUMN customer_last_read_message_id INTEGER NOT NULL DEFAULT 0"); } catch { /* exists */ }

// ── Settlements ──
// One row per booking-and-discount that Pitbay owes the center. Pending
// until super admin marks it settled.
db.exec(`
  CREATE TABLE IF NOT EXISTS settlements (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_id    INTEGER NOT NULL REFERENCES bookings(id),
    center_id     INTEGER NOT NULL REFERENCES centers(id),
    amount        INTEGER NOT NULL,
    status        TEXT    NOT NULL DEFAULT 'pending',   -- 'pending' | 'settled'
    settled_at    TEXT,
    credited_on   TEXT,                                  -- yyyy-mm-dd
    notes         TEXT,
    created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_settlements_status ON settlements(status);
  CREATE INDEX IF NOT EXISTS idx_settlements_center ON settlements(center_id, status);
  CREATE UNIQUE INDEX IF NOT EXISTS idx_settlements_booking ON settlements(booking_id);
`);

// ── Audit log (admin actions across the platform) ──
db.exec(`
  CREATE TABLE IF NOT EXISTS audit_log (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    source     TEXT    NOT NULL,        -- 'admin' | 'superadmin' | 'center' | 'customer' | 'system'
    actor      TEXT,                    -- name / email of who acted
    center_id  INTEGER,                 -- nullable: not all actions are center-scoped
    action     TEXT    NOT NULL,
    detail     TEXT,
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_audit_log_ts ON audit_log(id DESC);
`);

// ── Booking status history ──
db.exec(`
  CREATE TABLE IF NOT EXISTS booking_status_log (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_id      INTEGER NOT NULL REFERENCES bookings(id),
    from_status     TEXT,
    to_status       TEXT    NOT NULL,
    changed_by      TEXT    NOT NULL,    -- 'customer' | 'admin' | 'center' | 'system'
    changed_by_name TEXT,
    notes           TEXT,
    created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_booking_status_log_booking ON booking_status_log(booking_id, id);
`);

// ── Promo codes table ──
db.exec(`
  CREATE TABLE IF NOT EXISTS promos (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    code        TEXT    NOT NULL UNIQUE,
    type        TEXT    NOT NULL,                  -- 'percent' | 'flat'
    value       INTEGER NOT NULL,
    min_order   INTEGER NOT NULL DEFAULT 0,
    max_uses    INTEGER,
    used_count  INTEGER NOT NULL DEFAULT 0,
    active      INTEGER NOT NULL DEFAULT 1,
    description TEXT,
    expires_at  TEXT,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_promos_code ON promos(code);
`);

// Seed a couple of demo promos if the table is empty so the customer app has
// something to show on first launch.
if (db.prepare('SELECT COUNT(*) as n FROM promos').get().n === 0) {
  const ins = db.prepare(`INSERT INTO promos (code, type, value, min_order, max_uses, active, description, expires_at) VALUES (?,?,?,?,?,?,?,?)`);
  ins.run('SPARKFIRST10', 'percent', 10, 0,    null, 1, '10% off your first wash',     null);
  ins.run('MUMBAI30',     'flat',    30, 0,    null, 1, '₹30 off — Mumbai launch',     null);
  ins.run('WASH20',       'percent', 20, 200,  null, 1, '20% off water wash',           null);
}

// ── Applications table for center onboarding ──
db.exec(`
  CREATE TABLE IF NOT EXISTS applications (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    name         TEXT    NOT NULL,
    owner_name   TEXT    NOT NULL,
    mobile       TEXT    NOT NULL UNIQUE,
    email        TEXT,
    city         TEXT    NOT NULL DEFAULT 'Mumbai',
    address      TEXT    NOT NULL,
    gstin        TEXT,
    bank_account TEXT,
    ifsc         TEXT,
    account_name TEXT,
    status       TEXT    NOT NULL DEFAULT 'pending',
    notes        TEXT,
    created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at   TEXT    NOT NULL DEFAULT (datetime('now'))
  );
`);

// ── SEED demo center if empty ─────────────────────────────────
const centerCount = db.prepare('SELECT COUNT(*) as n FROM centers').get();
if (centerCount.n === 0) {
  db.prepare(`
    INSERT INTO centers (name, owner_name, mobile, email, address, city, wash_types)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    'Shine Auto Wash',
    'Rajesh Sharma',
    '9876543210',
    'shine@pitbay.in',
    'Shop 4, Lokhandwala Complex, Andheri West',
    'Mumbai',
    'water,dry,steam,d2d'
  );

  function dateOffset(days) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  }
  const TODAY     = dateOffset(0);
  const YESTERDAY = dateOffset(-1);
  const DAY2      = dateOffset(-2);
  const TOMORROW  = dateOffset(1);

  // ref, centerId, customer, phone, plate, model, washType, package, price, date, time, status, rating
  const sampleBookings = [
    // ── TODAY ──────────────────────────────────────────────────
    ['#SW10001', 1, 'Rahul Kumar',     '9000000001', 'MH01AB1234', 'Honda City',       'water', 'Exterior Wash',        199, TODAY, '09:00 AM', 'done',      5],
    ['#SW10002', 1, 'Priya Singh',     '9000000002', 'MH02CD5678', 'Maruti Swift',     'dry',   'Dry Clean Basic',      199, TODAY, '09:30 AM', 'done',      4],
    ['#SW10003', 1, 'Amit Patel',      '9000000003', 'MH03EF9012', 'Toyota Innova',    'steam', 'Steam Interior',       499, TODAY, '10:00 AM', 'done',      5],
    ['#SW10004', 1, 'Sonal Mehta',     '9000000004', 'MH04GH3456', 'Hyundai i20',      'water', 'Full Body Wash',       299, TODAY, '10:30 AM', 'done',      3],
    ['#SW10005', 1, 'Ravi Desai',      '9000000005', 'MH05IJ7890', 'Tata Nexon',       'd2d',   'D2D Standard',         399, TODAY, '11:00 AM', 'done',      5],
    ['#SW10006', 1, 'Neha Gupta',      '9000000006', 'MH06KL2345', 'Mahindra XUV500',  'steam', 'Steam Full Body',      699, TODAY, '11:30 AM', 'done',      4],
    ['#SW10007', 1, 'Karan Joshi',     '9000000007', 'MH07MN6789', 'Honda Jazz',       'water', 'Exterior Wash',        199, TODAY, '11:30 AM', 'cancelled', null],
    ['#SW10008', 1, 'Aisha Khan',      '9000000008', 'MH08OP1234', 'Ford EcoSport',    'dry',   'Dry Clean Premium',    349, TODAY, '12:00 PM', 'washing',   null],
    ['#SW10009', 1, 'Vijay Nair',      '9000000009', 'MH09QR5678', 'Suzuki Baleno',    'water', 'Full Body Wash',       299, TODAY, '12:30 PM', 'washing',   null],
    ['#SW10010', 1, 'Deepa Iyer',      '9000000010', 'MH10ST9012', 'Kia Seltos',       'steam', 'Steam Interior',       499, TODAY, '01:00 PM', 'arrived',   null],
    ['#SW10011', 1, 'Suresh Reddy',    '9000000011', 'MH11UV3456', 'Hyundai Creta',    'd2d',   'D2D Premium',          599, TODAY, '01:30 PM', 'arrived',   null],
    ['#SW10012', 1, 'Kavita Sharma',   '9000000012', 'MH12WX7890', 'Maruti Ertiga',    'water', 'Exterior Wash',        199, TODAY, '02:00 PM', 'confirmed', null],
    ['#SW10013', 1, 'Arjun Mehta',     '9000000013', 'MH13YZ1234', 'Toyota Fortuner',  'steam', 'Steam Full Body',      699, TODAY, '02:30 PM', 'confirmed', null],
    ['#SW10014', 1, 'Sunita Patil',    '9000000014', 'MH14AB5678', 'Honda Amaze',      'dry',   'Dry Clean Basic',      199, TODAY, '03:00 PM', 'new',       null],
    ['#SW10015', 1, 'Manish Verma',    '9000000015', 'MH15CD9012', 'Tata Harrier',     'water', 'Full Body Wash',       299, TODAY, '03:00 PM', 'new',       null],
    ['#SW10016', 1, 'Pooja Jain',      '9000000016', 'MH16EF3456', 'Renault Kwid',     'd2d',   'D2D Standard',         399, TODAY, '03:30 PM', 'new',       null],
    ['#SW10017', 1, 'Dinesh Kumar',    '9000000017', 'MH17GH7890', 'Volkswagen Polo',  'steam', 'Steam Interior',       499, TODAY, '04:00 PM', 'new',       null],
    ['#SW10018', 1, 'Anita Desai',     '9000000018', 'MH18IJ1234', 'Maruti Dzire',     'water', 'Exterior Wash',        199, TODAY, '04:30 PM', 'new',       null],
    ['#SW10019', 1, 'Rohit Sharma',    '9000000019', 'MH19KL5678', 'Hyundai Verna',    'dry',   'Dry Clean Premium',    349, TODAY, '05:00 PM', 'new',       null],
    ['#SW10020', 1, 'Geeta Pillai',    '9000000020', 'MH20MN9012', 'Honda WR-V',       'water', 'Full Body Wash',       299, TODAY, '05:30 PM', 'new',       null],

    // ── YESTERDAY ───────────────────────────────────────────────
    ['#SW09001', 1, 'Farhan Sheikh',   '9100000001', 'MH01FA1111', 'Skoda Rapid',      'water', 'Full Body Wash',       299, YESTERDAY, '09:00 AM', 'done', 5],
    ['#SW09002', 1, 'Lakshmi Nair',    '9100000002', 'MH02LA2222', 'Toyota Glanza',    'dry',   'Dry Clean Basic',      199, YESTERDAY, '09:30 AM', 'done', 4],
    ['#SW09003', 1, 'Suraj Tiwari',    '9100000003', 'MH03SU3333', 'Mahindra Thar',    'steam', 'Steam Full Body',      699, YESTERDAY, '10:00 AM', 'done', 5],
    ['#SW09004', 1, 'Rekha Joshi',     '9100000004', 'MH04RE4444', 'Hyundai Tucson',   'water', 'Exterior Wash',        199, YESTERDAY, '10:30 AM', 'done', 3],
    ['#SW09005', 1, 'Pratik Shah',     '9100000005', 'MH05PR5555', 'Tata Tiago',       'd2d',   'D2D Standard',         399, YESTERDAY, '11:00 AM', 'done', 4],
    ['#SW09006', 1, 'Nisha Kapoor',    '9100000006', 'MH06NI6666', 'Honda City',       'steam', 'Steam Interior',       499, YESTERDAY, '11:30 AM', 'done', 5],
    ['#SW09007', 1, 'Varun Bose',      '9100000007', 'MH07VA7777', 'Maruti Baleno',    'water', 'Full Body Wash',       299, YESTERDAY, '12:00 PM', 'done', 4],
    ['#SW09008', 1, 'Tanvi Rao',       '9100000008', 'MH08TA8888', 'Kia Sonet',        'dry',   'Dry Clean Premium',    349, YESTERDAY, '12:30 PM', 'done', 5],
    ['#SW09009', 1, 'Mohit Agarwal',   '9100000009', 'MH09MO9999', 'Toyota Camry',     'steam', 'Steam Full Body',      699, YESTERDAY, '01:00 PM', 'cancelled', null],
    ['#SW09010', 1, 'Shruti Malhotra', '9100000010', 'MH10SH0000', 'Skoda Kushaq',     'water', 'Exterior Wash',        199, YESTERDAY, '02:00 PM', 'done', 4],
    ['#SW09011', 1, 'Arun Pillai',     '9100000011', 'MH11AR1212', 'Ford Figo',        'd2d',   'D2D Premium',          599, YESTERDAY, '02:30 PM', 'done', 5],
    ['#SW09012', 1, 'Divya Singh',     '9100000012', 'MH12DI3434', 'Hyundai Aura',     'water', 'Full Body Wash',       299, YESTERDAY, '03:00 PM', 'done', 3],

    // ── DAY BEFORE YESTERDAY ────────────────────────────────────
    ['#SW08001', 1, 'Vikram Malhotra', '9200000001', 'MH01VI1010', 'BMW 3 Series',     'steam', 'Steam Full Body',      699, DAY2, '09:00 AM', 'done', 5],
    ['#SW08002', 1, 'Seema Tiwari',    '9200000002', 'MH02SE2020', 'Maruti Swift',     'water', 'Exterior Wash',        199, DAY2, '09:30 AM', 'done', 4],
    ['#SW08003', 1, 'Nitin Bansal',    '9200000003', 'MH03NI3030', 'Hyundai i20',      'dry',   'Dry Clean Basic',      199, DAY2, '10:00 AM', 'done', 5],
    ['#SW08004', 1, 'Preeti Sinha',    '9200000004', 'MH04PR4040', 'Tata Nexon EV',    'd2d',   'D2D Premium',          599, DAY2, '10:30 AM', 'done', 4],
    ['#SW08005', 1, 'Ganesh Murthy',   '9200000005', 'MH05GA5050', 'Honda Amaze',      'water', 'Full Body Wash',       299, DAY2, '11:00 AM', 'done', 3],
    ['#SW08006', 1, 'Harsha Reddy',    '9200000006', 'MH06HA6060', 'Maruti Ertiga',    'steam', 'Steam Interior',       499, DAY2, '11:30 AM', 'done', 5],
    ['#SW08007', 1, 'Pallavi More',    '9200000007', 'MH07PA7070', 'Toyota Urban',     'water', 'Exterior Wash',        199, DAY2, '12:00 PM', 'cancelled', null],
    ['#SW08008', 1, 'Sachin Deshpande','9200000008', 'MH08SA8080', 'Kia Seltos',       'steam', 'Steam Full Body',      699, DAY2, '01:00 PM', 'done', 4],
    ['#SW08009', 1, 'Meera Krishnan',  '9200000009', 'MH09ME9090', 'Renault Triber',   'dry',   'Dry Clean Premium',    349, DAY2, '02:00 PM', 'done', 5],
    ['#SW08010', 1, 'Rahul Patil',     '9200000010', 'MH10RA0101', 'Honda Jazz',       'water', 'Full Body Wash',       299, DAY2, '03:00 PM', 'done', 4],

    // ── TOMORROW (advance bookings) ─────────────────────────────
    ['#SW11001', 1, 'Ishaan Khanna',   '9300000001', 'MH01IS1111', 'Mercedes C-Class', 'steam', 'Steam Full Body',      699, TOMORROW, '10:00 AM', 'confirmed', null],
    ['#SW11002', 1, 'Tara Singhania',  '9300000002', 'MH02TA2222', 'Hyundai Venue',    'water', 'Full Body Wash',       299, TOMORROW, '11:00 AM', 'confirmed', null],
    ['#SW11003', 1, 'Dev Chopra',      '9300000003', 'MH03DE3333', 'Maruti Brezza',    'dry',   'Dry Clean Premium',    349, TOMORROW, '12:00 PM', 'new',       null],
    ['#SW11004', 1, 'Zara Mirza',      '9300000004', 'MH04ZA4444', 'Tata Punch',       'd2d',   'D2D Standard',         399, TOMORROW, '02:00 PM', 'new',       null],
    ['#SW11005', 1, 'Kabir Verma',     '9300000005', 'MH05KA5555', 'Toyota Corolla',   'steam', 'Steam Interior',       499, TOMORROW, '03:00 PM', 'new',       null],
  ];

  const insBooking = db.prepare(`
    INSERT INTO bookings
      (booking_ref, center_id, customer_name, customer_phone, vehicle_plate, vehicle_model,
       wash_type, package_name, package_price, slot_date, slot_time, status, rating)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
  `);
  for (const b of sampleBookings) {
    insBooking.run(b[0],b[1],b[2],b[3],b[4],b[5],b[6],b[7],b[8],b[9],b[10],b[11],b[12]??null);
  }

  // ── SEED some blocked slots for today ────────────────────────
  const insSlot = db.prepare(`
    INSERT OR IGNORE INTO slots (center_id, wash_type, slot_date, slot_time, is_blocked)
    VALUES (?,?,?,?,1)
  `);
  [
    [1, 'water', TODAY, '01:00 PM'],
    [1, 'water', TODAY, '01:30 PM'],
    [1, 'dry',   TODAY, '02:00 PM'],
    [1, 'steam', TODAY, '09:30 AM'],
    [1, 'd2d',   TODAY, '05:00 PM'],
    [1, 'd2d',   TODAY, '05:30 PM'],
  ].forEach(s => insSlot.run(...s));
}

// ── Seed review comments (idempotent — runs every startup, bookings must exist first) ──
{
  const _sc = db.prepare("UPDATE bookings SET review_comment=? WHERE booking_ref=?");
  [
    ['#SW10001', 'Honestly blown away by the result. My City had mud caked around the wheel arches from the highway drive and they got every bit of it. The team was super polite and finished before time. Will be my regular wash place from now on!'],
    ['#SW10002', 'Service was decent. Swift came out clean and the interior wipe was nice. Took about 15 minutes longer than the slot time but staff apologised and were friendly. Would come again.'],
    ['#SW10003', 'The steam interior on my Innova was absolutely fantastic. Three kids, snack crumbs everywhere — after the wash it smelled like a new car. Genuinely impressed. 5 stars without hesitation!'],
    ['#SW10004', 'Expected a bit more for Rs 299. The exterior was clean but they missed the door sills and the boot lid edge. Staff were polite so I did not make a fuss. Average experience overall.'],
    ['#SW10005', 'D2D agent arrived exactly on time which was a pleasant surprise. Did a thorough job on the Nexon, wiped the dashboard and even cleaned the cup holders without being asked. Brilliant service, already referred two colleagues!'],
    ['#SW10006', 'Full body steam on the XUV500 — what a difference! Every crevice was cleaned, the leather seats look conditioned and fresh. Bit on the pricier side but totally worth it for this kind of finish.'],
    ['#SW09001', 'The Skoda Rapid had water stains on the bonnet that three regular washes could not remove. Shine Auto Wash got them out completely! Really impressed with their attention to detail. Five stars all the way.'],
    ['#SW09002', 'Dry clean was fine, car smells fresh. The dashboard wipe felt a bit rushed and they missed one of the AC vents. Still reasonably satisfied for the price. Might try the premium next time.'],
    ['#SW09003', 'My Thar is a beast and it gets filthy. They handled it like pros — underbody, wheel arches, even the spare tyre cover. Steam full body was worth every paisa. Booking again next weekend!'],
    ['#SW09004', 'Just a basic exterior wash, nothing special. Car was clean when I picked it up but I noticed a small swirl mark on the bonnet which was not there before. A bit careless with the microfibre.'],
    ['#SW09005', 'So convenient to have the agent come home! The Tiago was spotless when he was done. He even called 10 minutes before arrival. Great experience, totally recommend the D2D Standard.'],
    ['#SW09006', 'Second time using Shine Auto Wash and they keep delivering. City dashboard, door trims, gear knob — everything looks showroom fresh. The steam interior package is genuinely the best I have tried in Mumbai.'],
    ['#SW09007', 'Friendly staff, good communication. Full body wash on the Baleno came out nice. Nothing extraordinary but solid, consistent work. I appreciate that they did not rush.'],
    ['#SW09008', 'I have used car wash services all across the city and this is by far the best. The Kia Sonet looks incredible — even the boot carpet was vacuumed. Premium dry clean lived up to its name. Worth every rupee!'],
    ['#SW09010', 'Quick exterior wash, in and out in 25 minutes. Skoda Kushaq looks clean and shiny. Good value for a weekday wash. Staff were no-nonsense and efficient.'],
    ['#SW09011', 'D2D Premium on the Ford Figo — the agent was incredibly thorough. Polished the dashboard, shampooed the mats, shined the tyres. Car looked better than when I bought it second-hand. Absolutely recommend!'],
    ['#SW09012', 'The full body wash was okay but I felt the interior cleaning was half-hearted. Paid Rs 299 and expected the rear seat pockets to be cleaned too. Staff were polite when I mentioned it but it was already too late.'],
    ['#SW08001', 'Brought my BMW 3 Series in and was nervous about how they would handle a premium car. Absolutely no need to worry — the steam full body was meticulous, zero scratches, finish is flawless. Will exclusively use Shine Auto Wash for the BMW going forward.'],
    ['#SW08002', 'Simple exterior wash on the Swift, no fuss. Car came out clean and shiny for just Rs 199. Great value. Staff handed it back quickly. Will use for regular weekly washes.'],
    ['#SW08003', 'Dry clean basic on the i20 was surprisingly thorough — vacuumed the boot, wiped every panel, cleaned the steering wheel. Really happy with the quality. Felt like a premium service at a budget price.'],
    ['#SW08004', 'D2D Premium for the Nexon EV. Agent was careful with the charging port area which I always worry about. Polished the dashboard, cleaned the tyres, returned the car smelling beautiful. Great service!'],
    ['#SW08005', 'Full body wash on the Amaze. Car came out clean, no complaints. Nothing went wrong but nothing blew me away either. Decent average service for the price. Would use again if convenient.'],
    ['#SW08006', 'Steam interior on the Ertiga — we had a long road trip last week and the car interior was a disaster. They transformed it completely. Seven seats all cleaned, carpets fresh, even the sun visor pockets. Outstanding!'],
    ['#SW08008', 'Steam full body on the Seltos was a treat. The paint looks like it was just polished, the engine bay was cleaned (bonus!), and the interior smells amazing. Totally worth Rs 699. One of the best car washes I have ever had.'],
    ['#SW08009', 'Dry clean premium on the Renault Triber — the leather conditioner they used on the seats made such a difference. Staff explained everything they were doing which gave me confidence. Will definitely return.'],
    ['#SW08010', 'Reliable and on-time. Jazz came back clean and they even removed a stubborn bird dropping stain from the roof without being asked. Simple full body wash but excellent attention to detail. Good job!'],
  ].forEach(([ref, comment]) => _sc.run(comment, ref));
}

// ── Default package template + helper ─────────────────────────
// Used by initial seed, application-approval flow, and a startup backfill
// that gives any center with zero packages a sensible starting catalogue.
const DEFAULT_PACKAGE_TEMPLATE = [
  // [washType, name, price, durMin, tasks, sort]
  ['water', 'Exterior Wash',     199, 30, ['Foam wash', 'Rinse', 'Tyre dressing'],                                         1],
  ['water', 'Full Body Wash',    299, 60, ['Foam wash', 'Rinse', 'Microfibre dry', 'Tyre dressing', 'Dashboard wipe'],     2],
  ['dry',   'Dry Clean Basic',   199, 30, ['Vacuum', 'Dashboard wipe', 'Door panels'],                                     3],
  ['dry',   'Dry Clean Premium', 349, 60, ['Vacuum', 'Steam interior', 'Leather conditioner', 'Window polish'],            4],
  ['steam', 'Steam Interior',    499, 45, ['Steam seats', 'Steam carpet', 'AC vent clean'],                                5],
  ['steam', 'Steam Full Body',   699, 75, ['Steam interior', 'Engine bay', 'Underbody', 'Wheel arches'],                   6],
  ['d2d',   'D2D Standard',      399, 60, ['Travel to location', 'Foam wash', 'Microfibre dry'],                           7],
  ['d2d',   'D2D Premium',       599, 90, ['Travel to location', 'Foam wash', 'Interior vacuum', 'Polish', 'Tyre shine'],  8],
];
function _seedDefaultPackages(centerId) {
  const ins = db.prepare(`
    INSERT INTO packages (center_id, wash_type, name, price, duration_minutes, tasks, sort_order)
    VALUES (?,?,?,?,?,?,?)
  `);
  for (const [washType, name, price, dur, tasks, sort] of DEFAULT_PACKAGE_TEMPLATE) {
    ins.run(centerId, washType, name, price, dur, JSON.stringify(tasks), sort);
  }
}

// Initial demo seed for center 1.
if (db.prepare('SELECT COUNT(*) as n FROM packages').get().n === 0) {
  _seedDefaultPackages(1);
}

// Backfill: every center should have at least the default catalogue so the
// customer app can render real (integer-id) packages. Without this, newly
// approved centers like Flight wash had zero packages and the customer-app
// fell back to demo string-ids, breaking the booking POST.
{
  const emptyCenters = db.prepare(`
    SELECT c.id
    FROM centers c
    LEFT JOIN packages p ON p.center_id = c.id AND p.is_active = 1
    WHERE p.id IS NULL
    GROUP BY c.id
  `).all();
  for (const row of emptyCenters) {
    _seedDefaultPackages(row.id);
    console.log(`📦 Seeded default packages for center #${row.id}`);
  }
}

// ── SEED demo applications for admin review (idempotent) ─────
const _demoAppInsert = db.prepare(`
  INSERT OR IGNORE INTO applications
    (name, owner_name, mobile, email, city, address, gstin, wash_types, bank_account, ifsc, account_name, bank_name, status)
  VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
`);
[
  ['AutoSpa Powai',    'Rohan Mehta',   '9888000101', 'autospa@gmail.com',   'Mumbai', 'Shop 3, Hiranandani Gardens, Powai',          '27AABCR1234A1Z5', 'water,dry,steam',  '00112233445566', 'HDFC0001234', 'Rohan Mehta', 'HDFC Bank',  'pending'],
  ['CarCare Juhu',     'Meera Pillai',  '9888000102', 'carcare@gmail.com',   'Mumbai', 'Plot 7, Juhu Tara Road, Juhu',                null,               'water,dry',        null,             null,          null,          null,         'pending'],
  ['WashPro Dadar',    'Sunil Kadam',   '9888000103', 'washpro@gmail.com',   'Mumbai', '14, Gokhale Road, Dadar West',                '27AABCS9876B2Z3', 'water,dry,steam,d2d', '00998877665544', 'ICIC0002345', 'Sunil Kadam', 'ICICI Bank', 'rejected'],
].forEach(a => _demoAppInsert.run(...a));

// ── SEED additional demo centers (idempotent) ─────────────────
const _demoCenterInsert = db.prepare('INSERT OR IGNORE INTO centers (name, owner_name, mobile, email, address, city, wash_types) VALUES (?,?,?,?,?,?,?)');
[
  ['Pitbay Bandra', 'Kiran Nair',  '9876543211', 'bandra@pitbay.in', 'Unit 12, Hill Road, Bandra West',   'Mumbai', 'water,dry,steam'],
  ['QuickWash Thane',  'Deepak Rao',  '9876543212', 'thane@pitbay.in',  'Plot 3, Pokhran Road, Thane West',  'Mumbai', 'water,dry,steam,d2d'],
].forEach(c => _demoCenterInsert.run(...c));

// ── PREPARED STATEMENTS ──────────────────────────────────────

const centerByMobile = db.prepare('SELECT * FROM centers WHERE mobile = ?');
const centerById     = db.prepare('SELECT * FROM centers WHERE id = ?');
const updateCenter   = db.prepare(`
  UPDATE centers SET name=?, owner_name=?, email=?, address=?, gstin=?,
    wash_types=?, open_time=?, close_time=?, pincode=?
  WHERE id=?
`);
const setOpenStatus = db.prepare("UPDATE centers SET is_open=? WHERE id=?");

const insertOtp     = db.prepare('INSERT INTO otps (identifier, otp, expires_at) VALUES (?, ?, ?)');
const latestValidOtp = db.prepare(`
  SELECT * FROM otps
  WHERE identifier = ? AND used = 0 AND expires_at > datetime('now')
  ORDER BY created_at DESC LIMIT 1
`);
const markOtpUsed   = db.prepare('UPDATE otps SET used = 1 WHERE id = ?');
const deleteOldOtps = db.prepare("DELETE FROM otps WHERE identifier=? AND (used=1 OR expires_at<=datetime('now'))");

const bookingsByCenter = db.prepare(`
  SELECT * FROM bookings WHERE center_id=? AND slot_date=? ORDER BY slot_time ASC
`);
const bookingsByCenterStatus = db.prepare(`
  SELECT * FROM bookings WHERE center_id=? AND slot_date=? AND status=? ORDER BY slot_time ASC
`);
const bookingById   = db.prepare('SELECT * FROM bookings WHERE id=?');
const updateBookingStatus = db.prepare(`
  UPDATE bookings SET status=?, updated_at=datetime('now') WHERE id=? AND center_id=?
`);
const rejectBooking = db.prepare(`
  UPDATE bookings SET status='cancelled', updated_at=datetime('now') WHERE id=? AND center_id=?
`);

const slotsByDate   = db.prepare('SELECT * FROM slots WHERE center_id=? AND slot_date=? ORDER BY wash_type, slot_time');
const upsertSlot    = db.prepare(`
  INSERT INTO slots (center_id, wash_type, slot_date, slot_time, is_blocked, capacity)
  VALUES (?,?,?,?,?,?)
  ON CONFLICT(center_id, wash_type, slot_date, slot_time)
  DO UPDATE SET is_blocked=excluded.is_blocked, capacity=excluded.capacity
`);
// Each booking row: how many 30-min windows it occupies (driven by duration_minutes).
const slotBookingRows = db.prepare(`
  SELECT wash_type, slot_time, duration_minutes
  FROM bookings
  WHERE center_id=? AND slot_date=? AND status NOT IN ('cancelled')
`);

// ── Packages ──
const pkgListByCenter = db.prepare(`
  SELECT * FROM packages WHERE center_id=? AND is_active=1
  ORDER BY wash_type, sort_order, id
`);
const pkgById         = db.prepare('SELECT * FROM packages WHERE id=? AND is_active=1');
const pkgInsert       = db.prepare(`
  INSERT INTO packages (center_id, wash_type, name, price, duration_minutes, tasks, sort_order)
  VALUES (?,?,?,?,?,?,?)
`);
const pkgUpdate       = db.prepare(`
  UPDATE packages SET wash_type=?, name=?, price=?, duration_minutes=?, tasks=?,
    sort_order=?, updated_at=datetime('now')
  WHERE id=? AND center_id=?
`);
const pkgSoftDelete   = db.prepare(`
  UPDATE packages SET is_active=0, updated_at=datetime('now')
  WHERE id=? AND center_id=?
`);
const pkgMaxSort      = db.prepare(`SELECT COALESCE(MAX(sort_order),0) as m FROM packages WHERE center_id=?`);

// ── Revenue report queries ──
const revAggregate = db.prepare(`
  SELECT
    COALESCE(SUM(CASE WHEN status='done'      THEN package_price ELSE 0 END), 0) as total_revenue,
    COALESCE(SUM(CASE WHEN status='done'      THEN 1 ELSE 0 END), 0) as completed_count,
    COALESCE(SUM(CASE WHEN status='cancelled' THEN 1 ELSE 0 END), 0) as cancelled_count,
    COALESCE(SUM(CASE WHEN status='cancelled' THEN package_price ELSE 0 END), 0) as cancelled_value,
    COUNT(*) as total_bookings
  FROM bookings WHERE center_id=? AND slot_date BETWEEN ? AND ?
`);
const revByWashType = db.prepare(`
  SELECT wash_type, COUNT(*) as count, SUM(package_price) as revenue
  FROM bookings
  WHERE center_id=? AND status='done' AND slot_date BETWEEN ? AND ?
  GROUP BY wash_type ORDER BY revenue DESC
`);
const revByPackage = db.prepare(`
  SELECT package_name, wash_type, COUNT(*) as count, SUM(package_price) as revenue
  FROM bookings
  WHERE center_id=? AND status='done' AND slot_date BETWEEN ? AND ?
  GROUP BY package_name ORDER BY revenue DESC LIMIT 8
`);
const revDaily = db.prepare(`
  SELECT slot_date as date, COUNT(*) as count, SUM(package_price) as revenue
  FROM bookings
  WHERE center_id=? AND status='done' AND slot_date BETWEEN ? AND ?
  GROUP BY slot_date ORDER BY slot_date
`);
const revAvgRating = db.prepare(`
  SELECT ROUND(AVG(rating), 2) as avg_rating, COUNT(rating) as rated_count
  FROM bookings
  WHERE center_id=? AND status='done' AND rating IS NOT NULL AND slot_date BETWEEN ? AND ?
`);

// ── Reviews queries ──
const reviewsList = db.prepare(`
  SELECT id, booking_ref, customer_name, customer_phone, vehicle_plate, vehicle_model,
         wash_type, package_name, package_price, slot_date, slot_time,
         rating, review_comment, review_reply, updated_at
  FROM bookings
  WHERE center_id=? AND status='done' AND rating IS NOT NULL
  ORDER BY slot_date DESC, updated_at DESC
`);
const reviewsStats = db.prepare(`
  SELECT
    ROUND(AVG(rating), 1)                                     AS avg_rating,
    COUNT(*)                                                  AS total,
    SUM(CASE WHEN rating=5 THEN 1 ELSE 0 END)                 AS r5,
    SUM(CASE WHEN rating=4 THEN 1 ELSE 0 END)                 AS r4,
    SUM(CASE WHEN rating=3 THEN 1 ELSE 0 END)                 AS r3,
    SUM(CASE WHEN rating=2 THEN 1 ELSE 0 END)                 AS r2,
    SUM(CASE WHEN rating=1 THEN 1 ELSE 0 END)                 AS r1,
    SUM(CASE WHEN review_reply IS NOT NULL THEN 1 ELSE 0 END) AS replied
  FROM bookings
  WHERE center_id=? AND status='done' AND rating IS NOT NULL
`);
const saveReviewReply = db.prepare(`
  UPDATE bookings
  SET review_reply=?, updated_at=datetime('now')
  WHERE id=? AND center_id=? AND status='done'
`);

module.exports = {
  // Centers
  findCenterByMobile(mobile)  { return centerByMobile.get(mobile); },
  findCenterById(id)          { return centerById.get(id); },
  updateCenterInfo(id, data) {
    return updateCenter.run(
      data.name, data.owner_name, data.email, data.address,
      data.gstin, data.wash_types, data.open_time, data.close_time,
      data.pincode || null, id
    );
  },

  requestCityChange(id, newCity) {
    const normalized = toTitleCase(newCity);
    db.prepare("UPDATE centers SET city_pending=? WHERE id=?").run(normalized, id);
    return normalized;
  },
  approveCityChange(id) {
    db.prepare("UPDATE centers SET city=city_pending, city_pending=NULL WHERE id=? AND city_pending IS NOT NULL").run(id);
    return db.prepare('SELECT * FROM centers WHERE id=?').get(id);
  },
  rejectCityChange(id) {
    db.prepare("UPDATE centers SET city_pending=NULL WHERE id=?").run(id);
  },
  getPendingCityChanges() {
    return db.prepare(`
      SELECT id, name, owner_name, mobile, city, city_pending, created_at
      FROM centers WHERE city_pending IS NOT NULL ORDER BY id
    `).all();
  },
  setCenterOpenStatus(id, isOpen) { return setOpenStatus.run(isOpen ? 1 : 0, id); },
  updateBankDetails(id, data) {
    return db.prepare(`
      UPDATE centers SET bank_account=?, ifsc=?, account_name=?, bank_name=? WHERE id=?
    `).run(data.bank_account || null, data.ifsc || null, data.account_name || null, data.bank_name || null, id);
  },

  // OTPs
  saveOtp(identifier, otp, expiresMinutes = 5) {
    deleteOldOtps.run(identifier);
    const expiresAt = new Date(Date.now() + expiresMinutes * 60 * 1000)
      .toISOString().replace('T', ' ').slice(0, 19);
    insertOtp.run(identifier, otp, expiresAt);
  },
  verifyOtp(identifier, otp) {
    const row = latestValidOtp.get(identifier);
    if (!row || row.otp !== otp) return false;
    markOtpUsed.run(row.id);
    return true;
  },

  // Bookings
  getBookings(centerId, date, status = null) {
    return status
      ? bookingsByCenterStatus.all(centerId, date, status)
      : bookingsByCenter.all(centerId, date);
  },
  getBookingById(id) { return bookingById.get(id); },
  updateBookingStatus(id, centerId, status) {
    const prev = bookingById.get(id);
    const r = updateBookingStatus.run(status, id, centerId);
    if (prev && prev.status !== status) {
      this.logBookingStatus(id, {
        from_status: prev.status, to_status: status,
        changed_by: 'center', changed_by_name: null,
        notes: 'Status changed by center',
      });
    }
    // When a booking is marked 'done' AND has an app_discount, create a
    // pending settlement row so super admin can mark it settled later.
    if (status === 'done' && prev && prev.app_discount > 0) {
      try {
        db.prepare(`
          INSERT OR IGNORE INTO settlements (booking_id, center_id, amount, status)
          VALUES (?, ?, ?, 'pending')
        `).run(id, centerId, prev.app_discount);
      } catch (e) { console.error('settlement insert:', e.message); }
    }
    return r;
  },
  rejectBooking(id, centerId) {
    const prev = bookingById.get(id);
    const r = rejectBooking.run(id, centerId);
    if (prev && prev.status !== 'cancelled') {
      this.logBookingStatus(id, {
        from_status: prev.status, to_status: 'cancelled',
        changed_by: 'center', changed_by_name: null,
        notes: 'Rejected by center',
      });
    }
    return r;
  },

  // Dashboard stats
  getDashboardStats(centerId, date) {
    const all = db.prepare('SELECT * FROM bookings WHERE center_id=? AND slot_date=?').all(centerId, date);
    const total     = all.length;
    const completed = all.filter(b => b.status === 'done').length;
    const active    = all.filter(b => ['arrived','washing'].includes(b.status)).length;
    const pending   = all.filter(b => ['new','confirmed'].includes(b.status)).length;
    const cancelled = all.filter(b => b.status === 'cancelled').length;
    const revenue   = all.filter(b => b.status === 'done').reduce((s, b) => s + b.package_price, 0);
    const queue     = all.filter(b => ['arrived','washing'].includes(b.status));
    const rated     = all.filter(b => b.status === 'done' && b.rating != null);
    const avg_rating = rated.length
      ? Math.round((rated.reduce((s, b) => s + b.rating, 0) / rated.length) * 10) / 10
      : null;
    return { total, completed, active, pending, cancelled, revenue, queue, avg_rating, rated_count: rated.length };
  },

  // Slots
  getSlots(centerId, date) { return slotsByDate.all(centerId, date); },
  // Each booking occupies ceil(duration_minutes / 30) consecutive 30-min windows
  // starting at its slot_time. Capacity displayed in the slot grid reflects this fan-out.
  getSlotBookingCounts(centerId, date) {
    const rows = slotBookingRows.all(centerId, date);
    const map  = {};
    for (const r of rows) {
      const span = Math.max(1, Math.ceil((r.duration_minutes || 30) / 30));
      const idx  = SLOT_TIMES.indexOf(r.slot_time);
      if (idx === -1) {
        const key = `${r.wash_type}|${r.slot_time}`;
        map[key] = (map[key] || 0) + 1;
        continue;
      }
      for (let i = 0; i < span && idx + i < SLOT_TIMES.length; i++) {
        const key = `${r.wash_type}|${SLOT_TIMES[idx + i]}`;
        map[key] = (map[key] || 0) + 1;
      }
    }
    return map;
  },
  upsertSlot(centerId, washType, date, time, blocked, capacity = 1) {
    return upsertSlot.run(centerId, washType, date, time, blocked ? 1 : 0, capacity);
  },

  // Revenue report — aggregates bookings between fromDate and toDate (inclusive).
  // Returns totals, daily trend, breakdown by wash type, top packages, avg rating.
  getRevenueReport(centerId, fromDate, toDate) {
    const agg     = revAggregate.get(centerId, fromDate, toDate);
    const byWash  = revByWashType.all(centerId, fromDate, toDate);
    const byPkg   = revByPackage.all(centerId, fromDate, toDate);
    const daily   = revDaily.all(centerId, fromDate, toDate);
    const rating  = revAvgRating.get(centerId, fromDate, toDate);
    return {
      total_revenue:    agg.total_revenue    || 0,
      completed_count:  agg.completed_count  || 0,
      cancelled_count:  agg.cancelled_count  || 0,
      cancelled_value:  agg.cancelled_value  || 0,
      total_bookings:   agg.total_bookings   || 0,
      avg_per_wash:     agg.completed_count > 0 ? Math.round(agg.total_revenue / agg.completed_count) : 0,
      avg_rating:       rating?.avg_rating  || null,
      rated_count:      rating?.rated_count || 0,
      by_wash_type:     byWash,
      by_package:       byPkg,
      daily,
    };
  },

  // Reviews
  getReviewsStats(centerId) { return reviewsStats.get(centerId); },
  getReviews(centerId)      { return reviewsList.all(centerId); },
  saveReviewReply(bookingId, centerId, reply) {
    return saveReviewReply.run(reply || null, bookingId, centerId);
  },

  // Packages
  listPackages(centerId) { return pkgListByCenter.all(centerId); },
  getPackage(id)         { return pkgById.get(id); },
  createPackage(centerId, data) {
    const sort = (pkgMaxSort.get(centerId).m || 0) + 1;
    const info = pkgInsert.run(
      centerId, data.wash_type, data.name, data.price,
      data.duration_minutes, JSON.stringify(data.tasks || []), sort
    );
    return pkgById.get(info.lastInsertRowid);
  },
  updatePackage(id, centerId, data) {
    pkgUpdate.run(
      data.wash_type, data.name, data.price, data.duration_minutes,
      JSON.stringify(data.tasks || []), data.sort_order ?? 0, id, centerId
    );
    return pkgById.get(id);
  },
  deletePackage(id, centerId) { return pkgSoftDelete.run(id, centerId); },

  // Booking photos
  saveBookingPhoto(id, centerId, type, data) {
    const col = type === 'before' ? 'photo_before' : 'photo_after';
    return db.prepare(`UPDATE bookings SET ${col}=?, updated_at=datetime('now') WHERE id=? AND center_id=?`)
      .run(data, id, centerId);
  },

  // Applications
  getApplicationByMobile(mobile) {
    return db.prepare('SELECT * FROM applications WHERE mobile=?').get(mobile);
  },
  getApplicationById(id) {
    return db.prepare('SELECT * FROM applications WHERE id=?').get(id);
  },
  createApplication(data) {
    return db.prepare(`
      INSERT INTO applications (name, owner_name, mobile, email, city, address, gstin, bank_account, ifsc, account_name, bank_name, geo_lat, geo_lng, center_images, certificates, wash_types)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.name, data.owner_name, data.mobile, data.email || null, toTitleCase(data.city) || data.city, data.address,
      data.gstin || null, data.bank_account || null, data.ifsc || null, data.account_name || null,
      data.bank_name || null, data.geo_lat || null, data.geo_lng || null,
      data.center_images ? JSON.stringify(data.center_images) : null,
      data.certificates  ? JSON.stringify(data.certificates)  : null,
      data.wash_types || null
    );
  },
  updateApplicationStatus(id, status, notes) {
    return db.prepare(`UPDATE applications SET status=?, notes=?, updated_at=datetime('now') WHERE id=?`)
      .run(status, notes || null, id);
  },
  reapplyApplication(id, data) {
    return db.prepare(`
      UPDATE applications SET
        name=?, owner_name=?, email=?, city=?, address=?, gstin=?,
        bank_account=?, ifsc=?, account_name=?, bank_name=?,
        geo_lat=?, geo_lng=?, center_images=?, certificates=?, wash_types=?,
        status='pending', notes=NULL, updated_at=datetime('now')
      WHERE id=?
    `).run(
      data.name, data.owner_name, data.email || null, toTitleCase(data.city) || data.city, data.address,
      data.gstin || null, data.bank_account || null, data.ifsc || null,
      data.account_name || null, data.bank_name || null,
      data.geo_lat || null, data.geo_lng || null,
      data.center_images ? JSON.stringify(data.center_images) : null,
      data.certificates  ? JSON.stringify(data.certificates)  : null,
      data.wash_types || null, id
    );
  },
  approveApplication(id) {
    const app = db.prepare('SELECT * FROM applications WHERE id=?').get(id);
    if (!app) return null;
    const normalizedCity = toTitleCase(app.city) || app.city;
    const info = db.prepare(`
      INSERT INTO centers (name, owner_name, mobile, email, address, city, gstin, wash_types, bank_account, ifsc, account_name, bank_name, lat, lng)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      app.name, app.owner_name, app.mobile, app.email,
      app.address, normalizedCity, app.gstin || null,
      app.wash_types || 'water,dry',
      app.bank_account || null, app.ifsc || null,
      app.account_name || null, app.bank_name || null,
      app.geo_lat || null, app.geo_lng || null
    );
    db.prepare(`UPDATE applications SET status='approved', notes='Documents verified', updated_at=datetime('now') WHERE id=?`).run(id);
    // Give the new center a default package catalogue so customers can book immediately.
    try { _seedDefaultPackages(info.lastInsertRowid); } catch (e) { console.error('seedDefaultPackages:', e.message); }
    return { app, centerId: info.lastInsertRowid };
  },
  getAllApplications() {
    return db.prepare('SELECT * FROM applications ORDER BY created_at DESC').all();
  },
  getAllCenters() {
    return db.prepare(`
      SELECT id, name, owner_name, mobile, email, address, city, pincode, gstin, wash_types,
             open_time, close_time, is_open, lat, lng, visible, display_order, city_pending, created_at
      FROM centers
      ORDER BY display_order ASC, id ASC
    `).all();
  },
  setCenterVisibility(id, visible) {
    return db.prepare("UPDATE centers SET visible=? WHERE id=?").run(visible ? 1 : 0, id);
  },
  setCenterDisplayOrder(id, order) {
    return db.prepare("UPDATE centers SET display_order=? WHERE id=?").run(parseInt(order, 10) || 999, id);
  },
  // Swap display_order between two centers (used by admin "move up / down").
  swapDisplayOrder(centerAId, centerBId) {
    const a = db.prepare("SELECT display_order FROM centers WHERE id=?").get(centerAId);
    const b = db.prepare("SELECT display_order FROM centers WHERE id=?").get(centerBId);
    if (!a || !b) return false;
    const t = db.transaction(() => {
      db.prepare("UPDATE centers SET display_order=? WHERE id=?").run(b.display_order, centerAId);
      db.prepare("UPDATE centers SET display_order=? WHERE id=?").run(a.display_order, centerBId);
    });
    t();
    return true;
  },
  // ── SETTLEMENTS ──
  listSettlements({ status, center_id } = {}) {
    const where = [];
    const args  = [];
    if (status)    { where.push('s.status = ?');    args.push(status); }
    if (center_id) { where.push('s.center_id = ?'); args.push(center_id); }
    return db.prepare(`
      SELECT s.*, b.booking_ref, b.customer_name, b.wash_type, b.package_name,
             b.package_price, b.slot_date,
             c.name AS center_name, c.bank_account, c.ifsc, c.account_name, c.bank_name
      FROM settlements s
      JOIN bookings b ON b.id = s.booking_id
      JOIN centers  c ON c.id = s.center_id
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY s.id DESC
      LIMIT 500
    `).all(...args);
  },
  markSettlementsSettled(centerId, creditedOn) {
    const t = db.transaction(() => {
      db.prepare(`
        UPDATE settlements
        SET status = 'settled',
            settled_at = datetime('now'),
            credited_on = ?
        WHERE center_id = ? AND status = 'pending'
      `).run(creditedOn || null, centerId);
    });
    t();
    return db.prepare(
      "SELECT COUNT(*) AS n, COALESCE(SUM(amount),0) AS total FROM settlements WHERE center_id=? AND status='settled' AND credited_on=?"
    ).get(centerId, creditedOn || null);
  },

  // ── AUDIT LOG ──
  appendAuditLog(entry) {
    db.prepare(`
      INSERT INTO audit_log (source, actor, center_id, action, detail)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      entry.source || 'admin',
      entry.actor  || null,
      entry.center_id || null,
      entry.action || 'Action',
      entry.detail || null
    );
  },
  listAuditLog({ source, center_id, limit = 200 } = {}) {
    const where = [];
    const args  = [];
    if (source)    { where.push('source=?');    args.push(source); }
    if (center_id) { where.push('center_id=?'); args.push(center_id); }
    return db.prepare(`
      SELECT id, source, actor, center_id, action, detail, created_at
      FROM audit_log
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY id DESC
      LIMIT ?
    `).all(...args, parseInt(limit, 10));
  },

  // Admin: all bookings across all centers, joined with the center name.
  // Optional filters: date (YYYY-MM-DD), status, center_id.
  getAllBookings({ date, status, center_id } = {}) {
    const where = [];
    const args  = [];
    if (date)      { where.push('b.slot_date = ?'); args.push(date); }
    if (status)    { where.push('b.status = ?');    args.push(status); }
    if (center_id) { where.push('b.center_id = ?'); args.push(center_id); }
    const sql = `
      SELECT b.*, c.name AS center_name
      FROM bookings b
      JOIN centers c ON c.id = b.center_id
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY b.slot_date DESC, b.slot_time DESC
      LIMIT 500
    `;
    return db.prepare(sql).all(...args);
  },
  getMinPackagePrice(centerId) {
    const row = db.prepare("SELECT MIN(price) AS p FROM packages WHERE center_id=? AND is_active=1").get(centerId);
    return row && row.p != null ? row.p : null;
  },

  // Public/customer-facing helpers ──────────────────────────────

  // List active packages for a center, grouped-ready (frontend groups by wash_type).
  listActivePackages(centerId) {
    return db.prepare(`
      SELECT id, center_id, wash_type, name, price, duration_minutes, tasks, sort_order
      FROM packages
      WHERE center_id=? AND is_active=1
      ORDER BY wash_type, sort_order, id
    `).all(centerId);
  },

  // Insert a booking submitted by the customer app. Status starts as 'new'.
  // Returns the inserted row.
  createCustomerBooking(data) {
    const ref = '#SW' + Math.floor(100000 + Math.random() * 900000);
    const info = db.prepare(`
      INSERT INTO bookings (
        booking_ref, center_id, customer_name, customer_phone, customer_email,
        vehicle_plate, vehicle_model, wash_type, package_name, package_price,
        slot_date, slot_time, duration_minutes,
        app_discount, center_discount, status
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?, 'new')
    `).run(
      ref, data.center_id, data.customer_name, data.customer_phone, data.customer_email || null,
      data.vehicle_plate, data.vehicle_model || null, data.wash_type, data.package_name, data.package_price,
      data.slot_date, data.slot_time, data.duration_minutes || 30,
      data.app_discount || 0, data.center_discount || 0
    );
    // Initial history entry — booking creation.
    db.prepare(`
      INSERT INTO booking_status_log (booking_id, from_status, to_status, changed_by, changed_by_name, notes)
      VALUES (?, NULL, 'new', 'customer', ?, ?)
    `).run(info.lastInsertRowid, data.customer_name || null, `Booking created · ${data.slot_date} ${data.slot_time}`);
    return db.prepare('SELECT * FROM bookings WHERE id=?').get(info.lastInsertRowid);
  },

  // Append a history entry to a booking. Used by every status change path.
  logBookingStatus(bookingId, { from_status, to_status, changed_by, changed_by_name, notes }) {
    db.prepare(`
      INSERT INTO booking_status_log (booking_id, from_status, to_status, changed_by, changed_by_name, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      bookingId, from_status || null, to_status,
      changed_by || 'system', changed_by_name || null, notes || null
    );
  },

  listBookingHistory(bookingId) {
    return db.prepare(`
      SELECT id, from_status, to_status, changed_by, changed_by_name, notes, created_at
      FROM booking_status_log
      WHERE booking_id = ?
      ORDER BY id ASC
    `).all(bookingId);
  },

  // Get a customer's bookings across all centers, joined with center name.
  getCustomerBookings(phone) {
    return db.prepare(`
      SELECT b.*, c.name AS center_name, c.address AS center_address
      FROM bookings b
      JOIN centers c ON c.id = b.center_id
      WHERE b.customer_phone = ?
      ORDER BY b.slot_date DESC, b.slot_time DESC
    `).all(phone);
  },

  // Customer cancels their own booking. Only allowed for bookings that haven't started.
  cancelCustomerBooking(bookingRef, phone) {
    const b = db.prepare('SELECT id, customer_name, customer_phone, status FROM bookings WHERE booking_ref=?').get(bookingRef);
    if (!b)                              return { ok: false, error: 'Booking not found' };
    if (b.customer_phone !== phone)      return { ok: false, error: 'Not your booking' };
    if (['done', 'cancelled', 'washing', 'arrived'].includes(b.status))
      return { ok: false, error: `Cannot cancel a ${b.status} booking` };
    db.prepare("UPDATE bookings SET status='cancelled', updated_at=datetime('now') WHERE id=?").run(b.id);
    this.logBookingStatus(b.id, {
      from_status: b.status, to_status: 'cancelled',
      changed_by: 'customer', changed_by_name: b.customer_name,
      notes: 'Customer cancelled the booking',
    });
    return { ok: true };
  },

  // Customer reschedules their own booking. Same status guard.
  rescheduleCustomerBooking(bookingRef, phone, slotDate, slotTime) {
    if (!slotDate || !slotTime) return { ok: false, error: 'slot_date and slot_time required' };
    const b = db.prepare('SELECT id, customer_name, customer_phone, status, slot_date, slot_time FROM bookings WHERE booking_ref=?').get(bookingRef);
    if (!b)                              return { ok: false, error: 'Booking not found' };
    if (b.customer_phone !== phone)      return { ok: false, error: 'Not your booking' };
    if (['done', 'cancelled', 'washing', 'arrived'].includes(b.status))
      return { ok: false, error: `Cannot reschedule a ${b.status} booking` };
    db.prepare("UPDATE bookings SET slot_date=?, slot_time=?, updated_at=datetime('now') WHERE id=?")
      .run(slotDate, slotTime, b.id);
    this.logBookingStatus(b.id, {
      from_status: b.status, to_status: b.status,
      changed_by: 'customer', changed_by_name: b.customer_name,
      notes: `Rescheduled · ${b.slot_date} ${b.slot_time} → ${slotDate} ${slotTime}`,
    });
    return { ok: true };
  },

  // ── CHAT ──
  listChatThreadsForCustomer(phone) {
    return db.prepare(`
      SELECT * FROM chat_threads
      WHERE customer_phone = ?
      ORDER BY datetime(COALESCE(last_message_at, created_at)) DESC
    `).all(phone);
  },
  listAllChatThreads() {
    return db.prepare(`
      SELECT * FROM chat_threads
      ORDER BY datetime(COALESCE(last_message_at, created_at)) DESC
      LIMIT 200
    `).all();
  },
  getChatThread(id) {
    return db.prepare('SELECT * FROM chat_threads WHERE id=?').get(id);
  },
  listChatMessages(threadId) {
    return db.prepare(`
      SELECT id, thread_id, sender, sender_name, text, created_at
      FROM chat_messages
      WHERE thread_id=?
      ORDER BY id ASC
    `).all(threadId);
  },
  // Idempotent: returns existing thread for (phone, booking_ref) or (phone, NULL+open) if found,
  // else creates a new one. Reopens closed threads.
  findOrCreateChatThread({ customer_phone, customer_name, booking_ref }) {
    const phone = String(customer_phone || '').replace(/\s+/g, '');
    if (!phone) return null;

    let existing;
    if (booking_ref) {
      existing = db.prepare(
        "SELECT * FROM chat_threads WHERE customer_phone=? AND booking_ref=? ORDER BY id DESC LIMIT 1"
      ).get(phone, booking_ref);
    } else {
      existing = db.prepare(
        "SELECT * FROM chat_threads WHERE customer_phone=? AND booking_ref IS NULL ORDER BY id DESC LIMIT 1"
      ).get(phone);
    }

    if (existing) {
      if (existing.status !== 'open') {
        db.prepare("UPDATE chat_threads SET status='open' WHERE id=?").run(existing.id);
        existing.status = 'open';
      }
      return existing;
    }

    const subject = booking_ref ? `Booking ${booking_ref}` : 'General support';
    const info = db.prepare(`
      INSERT INTO chat_threads (customer_phone, customer_name, booking_ref, subject, status)
      VALUES (?, ?, ?, ?, 'open')
    `).run(phone, customer_name || null, booking_ref || null, subject);

    // Auto-insert a system message so the admin immediately sees context.
    const systemText = booking_ref
      ? `Customer opened chat about booking ${booking_ref}.`
      : `Customer opened a general support chat.`;
    db.prepare(`
      INSERT INTO chat_messages (thread_id, sender, sender_name, text)
      VALUES (?, 'system', 'Pitbay', ?)
    `).run(info.lastInsertRowid, systemText);
    db.prepare(`
      UPDATE chat_threads
      SET last_message_at = datetime('now'),
          last_message_preview = ?,
          last_message_sender = 'system',
          unread_admin = unread_admin + 1
      WHERE id = ?
    `).run(systemText.slice(0, 120), info.lastInsertRowid);

    return db.prepare('SELECT * FROM chat_threads WHERE id=?').get(info.lastInsertRowid);
  },
  // sender: 'customer' | 'admin' | 'system'
  sendChatMessage(threadId, sender, senderName, text) {
    const trimmed = String(text || '').trim();
    if (!trimmed) return null;
    const t = db.prepare('SELECT * FROM chat_threads WHERE id=?').get(threadId);
    if (!t) return null;
    db.prepare(`
      INSERT INTO chat_messages (thread_id, sender, sender_name, text)
      VALUES (?, ?, ?, ?)
    `).run(threadId, sender, senderName || null, trimmed);

    // Increment unread for the OTHER side; reopen if closed.
    const incCol = sender === 'customer' ? 'unread_admin' : 'unread_customer';
    db.prepare(`
      UPDATE chat_threads
      SET last_message_at = datetime('now'),
          last_message_preview = ?,
          last_message_sender = ?,
          ${incCol} = ${incCol} + 1,
          status = 'open'
      WHERE id = ?
    `).run(trimmed.slice(0, 120), sender, threadId);

    return db.prepare("SELECT * FROM chat_messages WHERE id = last_insert_rowid()").get();
  },
  markChatThreadRead(threadId, side /* 'customer' | 'admin' */) {
    const isAdmin   = side === 'admin';
    const unreadCol = isAdmin ? 'unread_admin' : 'unread_customer';
    const readCol   = isAdmin ? 'admin_last_read_message_id' : 'customer_last_read_message_id';
    const maxRow = db.prepare("SELECT COALESCE(MAX(id), 0) AS m FROM chat_messages WHERE thread_id=?").get(threadId);
    db.prepare(`UPDATE chat_threads SET ${unreadCol} = 0, ${readCol} = ? WHERE id = ?`)
      .run(maxRow.m, threadId);
    return true;
  },

  // ── PROMOS ──
  listActivePromos() {
    return db.prepare(`
      SELECT * FROM promos
      WHERE active = 1
        AND (expires_at IS NULL OR expires_at > datetime('now'))
        AND (max_uses  IS NULL OR used_count < max_uses)
      ORDER BY id ASC
    `).all();
  },
  listAllPromos() { return db.prepare('SELECT * FROM promos ORDER BY id DESC').all(); },
  findPromoByCode(code) {
    return db.prepare('SELECT * FROM promos WHERE upper(code) = upper(?)').get(String(code || '').trim());
  },
  createPromo(data) {
    const info = db.prepare(`
      INSERT INTO promos (code, type, value, min_order, max_uses, active, description, expires_at)
      VALUES (?,?,?,?,?,?,?,?)
    `).run(
      String(data.code).trim().toUpperCase(),
      data.type === 'flat' ? 'flat' : 'percent',
      parseInt(data.value, 10),
      parseInt(data.min_order || 0, 10),
      data.max_uses ? parseInt(data.max_uses, 10) : null,
      data.active === false ? 0 : 1,
      data.description || null,
      data.expires_at || null
    );
    return db.prepare('SELECT * FROM promos WHERE id=?').get(info.lastInsertRowid);
  },
  updatePromo(id, fields) {
    const sets = [];
    const args = [];
    if (fields.active != null)       { sets.push('active=?');      args.push(fields.active ? 1 : 0); }
    if (fields.value != null)        { sets.push('value=?');       args.push(parseInt(fields.value, 10)); }
    if (fields.min_order != null)    { sets.push('min_order=?');   args.push(parseInt(fields.min_order, 10)); }
    if (fields.max_uses !== undefined){ sets.push('max_uses=?');   args.push(fields.max_uses == null ? null : parseInt(fields.max_uses, 10)); }
    if (fields.description != null)  { sets.push('description=?'); args.push(fields.description); }
    if (fields.expires_at !== undefined){ sets.push('expires_at=?'); args.push(fields.expires_at || null); }
    if (!sets.length) return false;
    args.push(id);
    db.prepare(`UPDATE promos SET ${sets.join(', ')} WHERE id=?`).run(...args);
    return true;
  },
  incrementPromoUsage(id) {
    db.prepare("UPDATE promos SET used_count = used_count + 1 WHERE id=?").run(id);
  },
  // Validate a promo code against a base price. Returns { ok, promo, discount } or { ok: false, error }.
  validatePromo(code, basePrice) {
    const p = this.findPromoByCode(code);
    if (!p)                         return { ok: false, error: 'Promo not found' };
    if (!p.active)                  return { ok: false, error: 'Promo not active' };
    if (p.expires_at && new Date(p.expires_at) < new Date())
                                    return { ok: false, error: 'Promo expired' };
    if (p.max_uses != null && p.used_count >= p.max_uses)
                                    return { ok: false, error: 'Promo fully used' };
    if (p.min_order && basePrice < p.min_order)
                                    return { ok: false, error: `Min order ₹${p.min_order} required` };
    const discount = p.type === 'flat'
      ? Math.min(p.value, basePrice)
      : Math.round(basePrice * p.value / 100);
    return { ok: true, promo: p, discount };
  },

  // Admin override: change booking status / slot / center without ownership check.
  adminUpdateBooking(bookingId, fields = {}) {
    const b = db.prepare('SELECT * FROM bookings WHERE id=?').get(bookingId);
    if (!b) return { ok: false, error: 'Booking not found' };
    const sets = [];
    const args = [];
    const changeNotes = [];
    if (fields.status)    {
      sets.push('status=?');    args.push(fields.status);
      changeNotes.push(`status: ${b.status} → ${fields.status}`);
    }
    if (fields.slot_date) {
      sets.push('slot_date=?'); args.push(fields.slot_date);
      if (fields.slot_date !== b.slot_date) changeNotes.push(`date: ${b.slot_date} → ${fields.slot_date}`);
    }
    if (fields.slot_time) {
      sets.push('slot_time=?'); args.push(fields.slot_time);
      if (fields.slot_time !== b.slot_time) changeNotes.push(`time: ${b.slot_time} → ${fields.slot_time}`);
    }
    if (fields.center_id) {
      const newCid = parseInt(fields.center_id, 10);
      sets.push('center_id=?'); args.push(newCid);
      if (newCid !== b.center_id) changeNotes.push(`center: #${b.center_id} → #${newCid}`);
    }
    if (fields.package_price != null) {
      const newPrice = parseInt(fields.package_price, 10);
      sets.push('package_price=?'); args.push(newPrice);
      if (newPrice !== b.package_price) changeNotes.push(`price: ₹${b.package_price} → ₹${newPrice}`);
    }
    if (!sets.length) return { ok: false, error: 'No updatable fields supplied' };
    sets.push("updated_at=datetime('now')");
    args.push(bookingId);
    db.prepare(`UPDATE bookings SET ${sets.join(', ')} WHERE id=?`).run(...args);
    if (changeNotes.length) {
      this.logBookingStatus(bookingId, {
        from_status: b.status,
        to_status:   fields.status || b.status,
        changed_by:  'admin',
        changed_by_name: 'Pitbay Admin',
        notes: changeNotes.join(' · '),
      });
    }
    return { ok: true };
  },

  // Save a customer review on a booking. Idempotent — overwrites prior rating/comment.
  saveCustomerReview(bookingRef, phone, rating, comment) {
    const b = db.prepare('SELECT id, customer_phone, status FROM bookings WHERE booking_ref=?').get(bookingRef);
    if (!b) return { ok: false, error: 'Booking not found' };
    if (b.customer_phone !== phone) return { ok: false, error: 'Not your booking' };
    if (b.status !== 'done') return { ok: false, error: 'Can only review completed wash' };
    db.prepare(`
      UPDATE bookings SET rating=?, review_comment=?, updated_at=datetime('now')
      WHERE id=?
    `).run(rating, (comment || '').trim() || null, b.id);
    return { ok: true };
  },
};
