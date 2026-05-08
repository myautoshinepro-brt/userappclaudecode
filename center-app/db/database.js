const Database = require('better-sqlite3');
const path     = require('path');

// In production (Railway) set DB_PATH=/data/sparkwash-center.sqlite pointing to a persistent volume
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'sparkwash-center.sqlite');
const db      = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

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
    'shine@sparkwash.in',
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

// ── SEED default packages if none exist ─────────────────────────
const pkgCount = db.prepare('SELECT COUNT(*) as n FROM packages').get();
if (pkgCount.n === 0) {
  const insPkg = db.prepare(`
    INSERT INTO packages (center_id, wash_type, name, price, duration_minutes, tasks, sort_order)
    VALUES (?,?,?,?,?,?,?)
  `);
  // [centerId, washType, name, price, durMin, tasks(JSON), sort]
  const defaults = [
    [1, 'water', 'Exterior Wash',     199, 30, JSON.stringify(['Foam wash', 'Rinse', 'Tyre dressing']),                              1],
    [1, 'water', 'Full Body Wash',    299, 60, JSON.stringify(['Foam wash', 'Rinse', 'Microfibre dry', 'Tyre dressing', 'Dashboard wipe']), 2],
    [1, 'dry',   'Dry Clean Basic',   199, 30, JSON.stringify(['Vacuum', 'Dashboard wipe', 'Door panels']),                            3],
    [1, 'dry',   'Dry Clean Premium', 349, 60, JSON.stringify(['Vacuum', 'Steam interior', 'Leather conditioner', 'Window polish']),   4],
    [1, 'steam', 'Steam Interior',    499, 45, JSON.stringify(['Steam seats', 'Steam carpet', 'AC vent clean']),                       5],
    [1, 'steam', 'Steam Full Body',   699, 75, JSON.stringify(['Steam interior', 'Engine bay', 'Underbody', 'Wheel arches']),          6],
    [1, 'd2d',   'D2D Standard',      399, 60, JSON.stringify(['Travel to location', 'Foam wash', 'Microfibre dry']),                  7],
    [1, 'd2d',   'D2D Premium',       599, 90, JSON.stringify(['Travel to location', 'Foam wash', 'Interior vacuum', 'Polish', 'Tyre shine'])  , 8],
  ];
  for (const p of defaults) insPkg.run(...p);
}

// ── PREPARED STATEMENTS ──────────────────────────────────────

const centerByMobile = db.prepare('SELECT * FROM centers WHERE mobile = ?');
const centerById     = db.prepare('SELECT * FROM centers WHERE id = ?');
const updateCenter   = db.prepare(`
  UPDATE centers SET name=?, owner_name=?, email=?, address=?, gstin=?,
    wash_types=?, open_time=?, close_time=?
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
      data.gstin, data.wash_types, data.open_time, data.close_time, id
    );
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
    return updateBookingStatus.run(status, id, centerId);
  },
  rejectBooking(id, centerId) { return rejectBooking.run(id, centerId); },

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
  createApplication(data) {
    return db.prepare(`
      INSERT INTO applications (name, owner_name, mobile, email, city, address, gstin, bank_account, ifsc, account_name)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(data.name, data.owner_name, data.mobile, data.email || null, data.city,
           data.address, data.gstin || null, data.bank_account || null,
           data.ifsc || null, data.account_name || null);
  },
  updateApplicationStatus(id, status, notes) {
    return db.prepare(`UPDATE applications SET status=?, notes=?, updated_at=datetime('now') WHERE id=?`)
      .run(status, notes || null, id);
  },
  reapplyApplication(id, data) {
    return db.prepare(`UPDATE applications SET name=?,owner_name=?,email=?,city=?,address=?,gstin=?,bank_account=?,ifsc=?,account_name=?,status='pending',notes=NULL,updated_at=datetime('now') WHERE id=?`)
      .run(data.name, data.owner_name, data.email||null, data.city, data.address,
           data.gstin||null, data.bank_account||null, data.ifsc||null, data.account_name||null, id);
  },
  getAllApplications() {
    return db.prepare('SELECT * FROM applications ORDER BY created_at DESC').all();
  },
};
