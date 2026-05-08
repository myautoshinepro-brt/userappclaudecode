const sqlite = require('better-sqlite3')('./db/sparkwash-center.sqlite');

function d(offset) {
  const dt = new Date();
  dt.setDate(dt.getDate() + offset);
  return dt.toISOString().slice(0, 10);
}
const TODAY     = d(0);
const YESTERDAY = d(-1);
const TOMORROW  = d(1);

console.log('Seeding for:', { YESTERDAY, TODAY, TOMORROW });

const ins = sqlite.prepare(`
  INSERT OR IGNORE INTO bookings
    (booking_ref, center_id, customer_name, customer_phone, vehicle_plate, vehicle_model,
     wash_type, package_name, package_price, slot_date, slot_time, status, rating)
  VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
`);

const bookings = [
  // ── TODAY ────────────────────────────────────────────────────
  ['#SW20001',1,'Aarav Mehta',     '9811000001','MH01AA1001','Honda City',       'water','Exterior Wash',     199,TODAY,'09:00 AM','done',     5],
  ['#SW20002',1,'Sneha Kapoor',    '9811000002','MH02BB2002','Maruti Swift',     'dry',  'Dry Clean Basic',   199,TODAY,'09:30 AM','done',     4],
  ['#SW20003',1,'Rohan Desai',     '9811000003','MH03CC3003','Hyundai Creta',    'steam','Steam Interior',    499,TODAY,'10:00 AM','done',     5],
  ['#SW20004',1,'Nisha Verma',     '9811000004','MH04DD4004','Tata Nexon',       'water','Full Body Wash',    299,TODAY,'10:00 AM','done',     3],
  ['#SW20005',1,'Prakash Iyer',    '9811000005','MH05EE5005','Kia Seltos',       'd2d',  'D2D Standard',      399,TODAY,'10:30 AM','done',     5],
  ['#SW20006',1,'Divya Nair',      '9811000006','MH06FF6006','Toyota Fortuner',  'steam','Steam Full Body',   699,TODAY,'11:00 AM','done',     4],
  ['#SW20007',1,'Kartik Sharma',   '9811000007','MH07GG7007','Honda Jazz',       'water','Full Body Wash',    299,TODAY,'11:00 AM','done',     5],
  ['#SW20008',1,'Priyanka Joshi',  '9811000008','MH08HH8008','Mahindra XUV700',  'steam','Steam Full Body',   699,TODAY,'11:30 AM','done',     4],
  ['#SW20009',1,'Suresh Pillai',   '9811000009','MH09II9009','Maruti Baleno',    'dry',  'Dry Clean Premium', 349,TODAY,'12:00 PM','washing',  null],
  ['#SW20010',1,'Ananya Singh',    '9811000010','MH10JJ0010','Hyundai i20',      'water','Exterior Wash',     199,TODAY,'12:00 PM','washing',  null],
  ['#SW20011',1,'Vikash Gupta',    '9811000011','MH11KK1011','Tata Harrier',     'steam','Steam Interior',    499,TODAY,'12:30 PM','arrived',  null],
  ['#SW20012',1,'Meena Bose',      '9811000012','MH12LL2012','Renault Kwid',     'd2d',  'D2D Premium',       599,TODAY,'01:00 PM','arrived',  null],
  ['#SW20013',1,'Aryan Malhotra',  '9811000013','MH13MM3013','Skoda Slavia',     'water','Full Body Wash',    299,TODAY,'01:00 PM','confirmed',null],
  ['#SW20014',1,'Pooja Reddy',     '9811000014','MH14NN4014','Ford Figo',        'dry',  'Dry Clean Basic',   199,TODAY,'01:30 PM','confirmed',null],
  ['#SW20015',1,'Rahul Tiwari',    '9811000015','MH15OO5015','Honda Amaze',      'water','Exterior Wash',     199,TODAY,'02:00 PM','new',      null],
  ['#SW20016',1,'Sunita Kulkarni', '9811000016','MH16PP6016','Toyota Innova',    'steam','Steam Full Body',   699,TODAY,'02:00 PM','new',      null],
  ['#SW20017',1,'Deepak Menon',    '9811000017','MH17QQ7017','Maruti Ertiga',    'water','Full Body Wash',    299,TODAY,'02:30 PM','new',      null],
  ['#SW20018',1,'Kavya Shah',      '9811000018','MH18RR8018','Kia Sonet',        'd2d',  'D2D Standard',      399,TODAY,'03:00 PM','new',      null],
  ['#SW20019',1,'Nikhil Pandey',   '9811000019','MH19SS9019','Hyundai Verna',    'dry',  'Dry Clean Premium', 349,TODAY,'03:30 PM','new',      null],
  ['#SW20020',1,'Lakshmi Rao',     '9811000020','MH20TT0020','Tata Punch',       'water','Exterior Wash',     199,TODAY,'04:00 PM','new',      null],
  ['#SW20021',1,'Sanjay Bhat',     '9811000021','MH21UU1021','BMW 3 Series',     'steam','Steam Full Body',   699,TODAY,'04:30 PM','new',      null],
  ['#SW20022',1,'Ritu Agarwal',    '9811000022','MH22VV2022','Maruti Brezza',    'water','Full Body Wash',    299,TODAY,'05:00 PM','new',      null],
  ['#SW20023',1,'Ajay Thakur',     '9811000023','MH23WW3023','Honda WR-V',       'dry',  'Dry Clean Basic',   199,TODAY,'11:30 AM','cancelled',null],

  // ── YESTERDAY ────────────────────────────────────────────────
  ['#SW19001',1,'Ishaan Roy',      '9822000001','MH01YA1001','Hyundai Tucson',   'steam','Steam Full Body',   699,YESTERDAY,'09:00 AM','done',4],
  ['#SW19002',1,'Tara Krishnan',   '9822000002','MH02YB2002','Maruti Swift',     'water','Exterior Wash',     199,YESTERDAY,'09:30 AM','done',5],
  ['#SW19003',1,'Dev Bansal',      '9822000003','MH03YC3003','Tata Nexon EV',    'd2d',  'D2D Premium',       599,YESTERDAY,'10:00 AM','done',5],
  ['#SW19004',1,'Zara Khan',       '9822000004','MH04YD4004','Honda City',       'water','Full Body Wash',    299,YESTERDAY,'10:30 AM','done',3],
  ['#SW19005',1,'Kabir Sinha',     '9822000005','MH05YE5005','Mahindra Thar',    'steam','Steam Interior',    499,YESTERDAY,'11:00 AM','done',5],
  ['#SW19006',1,'Mira Jain',       '9822000006','MH06YF6006','Toyota Glanza',    'dry',  'Dry Clean Premium', 349,YESTERDAY,'11:30 AM','done',4],
  ['#SW19007',1,'Aditya Pillai',   '9822000007','MH07YG7007','Renault Triber',   'water','Full Body Wash',    299,YESTERDAY,'12:00 PM','done',4],
  ['#SW19008',1,'Priya Menon',     '9822000008','MH08YH8008','Kia Seltos',       'steam','Steam Full Body',   699,YESTERDAY,'01:00 PM','done',5],
  ['#SW19009',1,'Rahul Sharma',    '9822000009','MH09YI9009','Skoda Kushaq',     'water','Exterior Wash',     199,YESTERDAY,'02:00 PM','done',4],
  ['#SW19010',1,'Neha Patil',      '9822000010','MH10YJ0010','Maruti Baleno',    'dry',  'Dry Clean Basic',   199,YESTERDAY,'02:30 PM','done',5],
  ['#SW19011',1,'Vijay Nambiar',   '9822000011','MH11YK1011','Hyundai i20',      'd2d',  'D2D Standard',      399,YESTERDAY,'03:00 PM','done',4],
  ['#SW19012',1,'Deepa Iyer',      '9822000012','MH12YL2012','Toyota Fortuner',  'steam','Steam Full Body',   699,YESTERDAY,'03:30 PM','cancelled',null],

  // ── TOMORROW ─────────────────────────────────────────────────
  ['#SW21001',1,'Arjun Kapoor',    '9833000001','MH01ZA1001','Mercedes C200',    'steam','Steam Full Body',   699,TOMORROW,'09:00 AM','confirmed',null],
  ['#SW21002',1,'Simran Singh',    '9833000002','MH02ZB2002','Hyundai Venue',    'water','Full Body Wash',    299,TOMORROW,'10:00 AM','confirmed',null],
  ['#SW21003',1,'Raj Malhotra',    '9833000003','MH03ZC3003','Tata Harrier',     'steam','Steam Interior',    499,TOMORROW,'11:00 AM','new',      null],
  ['#SW21004',1,'Preethi Kumar',   '9833000004','MH04ZD4004','Maruti Brezza',    'dry',  'Dry Clean Premium', 349,TOMORROW,'12:00 PM','new',      null],
  ['#SW21005',1,'Arun Mehta',      '9833000005','MH05ZE5005','Kia Sonet',        'water','Exterior Wash',     199,TOMORROW,'01:00 PM','new',      null],
  ['#SW21006',1,'Sanya Bose',      '9833000006','MH06ZF6006','Honda Amaze',      'd2d',  'D2D Standard',      399,TOMORROW,'02:00 PM','new',      null],
  ['#SW21007',1,'Mohan Reddy',     '9833000007','MH07ZG7007','Toyota Corolla',   'steam','Steam Full Body',   699,TOMORROW,'03:00 PM','new',      null],
];

const insertMany = sqlite.transaction(rows => {
  let inserted = 0;
  for (const b of rows) {
    const r = ins.run(b[0],b[1],b[2],b[3],b[4],b[5],b[6],b[7],b[8],b[9],b[10],b[11],b[12]??null);
    inserted += r.changes;
  }
  return inserted;
});

const count = insertMany(bookings);
console.log('Inserted:', count, 'bookings');

// Summary
const stats = sqlite.prepare(
  'SELECT slot_date, status, COUNT(*) as n FROM bookings GROUP BY slot_date, status ORDER BY slot_date, status'
).all();
let lastDate = '';
stats.forEach(r => {
  if (r.slot_date !== lastDate) { console.log('\n' + r.slot_date + ':'); lastDate = r.slot_date; }
  console.log('  ' + r.status.padEnd(12) + r.n);
});

const rev = sqlite.prepare(
  "SELECT SUM(package_price) as r FROM bookings WHERE slot_date=? AND status='done'"
).get(TODAY);
console.log('\nToday revenue: Rs.' + (rev.r || 0));
