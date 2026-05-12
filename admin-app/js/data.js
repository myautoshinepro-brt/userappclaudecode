// ============================================================
// SparkWash Admin App — data.js
// ============================================================

let ADMINS = [
  { id:'a1', name:'Rajiv Sharma',    email:'rajiv@sparkwash.in',   phone:'+91 98765 00001', role:'admin',      centers:['c1','c2'], initials:'RS', active:true  },
  { id:'a2', name:'Sneha Kulkarni',  email:'sneha@sparkwash.in',   phone:'+91 98765 00002', role:'admin',      centers:['c3','c4'], initials:'SK', active:true  },
  { id:'sa1',name:'Arjun Mehta',     email:'arjun@sparkwash.in',   phone:'+91 98765 00000', role:'superadmin', centers:'all',       initials:'AM', active:true  },
];

let CITIES = [
  { id:'city1', name:'Mumbai', state:'Maharashtra', active:true  },
  { id:'city2', name:'Thane',  state:'Maharashtra', active:true  },
  { id:'city3', name:'Pune',   state:'Maharashtra', active:false },
  { id:'city4', name:'Nashik', state:'Maharashtra', active:false },
];

// Replaced by AdminData.loadAll() once the user logs in. Starts empty so the UI
// shows "Loading…" / empty states instead of flashing demo data.
let CENTERS     = [];
let SETTLEMENTS = [];

// Center onboarding applications — submitted via center app, reviewed by SA
// Center-app backend URL — update this when deploying to production
const CENTER_APP_URL = localStorage.getItem('sw_center_app_url') || 'https://userappclaudecode-production-7ece.up.railway.app';
const ADMIN_API_KEY   = localStorage.getItem('sw_admin_api_key')  || 'sparkwash-admin-2026';

let APPLICATIONS = []; // loaded from real API by ApplicationsScreen

const WASH_LABELS = {
  water: { label:'💧 Water Wash',    color:'#1e40af', bg:'#dbeafe' },
  dry:   { label:'🧴 Dry Wash',      color:'#15803d', bg:'#dcfce7' },
  steam: { label:'💨 Steam Wash',    color:'#5b21b6', bg:'#ede9fe' },
  d2d:   { label:'🚗 Door-to-Door',  color:'#92400e', bg:'#fef9c3' },
};

const STATUS_META = {
  new:       { label:'New',         cls:'b-new',    icon:'🆕' },
  confirmed: { label:'Confirmed',   cls:'b-conf',   icon:'✅' },
  arrived:   { label:'Arrived',     cls:'b-prog',   icon:'🚗' },
  washing:   { label:'In Progress', cls:'b-prog',   icon:'🔄' },
  done:      { label:'Completed',   cls:'b-done',   icon:'✨' },
  cancelled: { label:'Cancelled',   cls:'b-cancel', icon:'❌' },
};

// Loaded by AdminData.loadAll() on login.
let ALL_BOOKINGS = [];

const ALL_SLOTS = [
  '8:00 AM','8:30 AM','9:00 AM','9:30 AM','10:00 AM','10:30 AM',
  '11:00 AM','11:30 AM','12:00 PM','12:30 PM','1:00 PM','1:30 PM',
  '2:00 PM','2:30 PM','3:00 PM','3:30 PM','4:00 PM','4:30 PM',
  '5:00 PM','5:30 PM','6:00 PM',
];

// Loaded by AdminData.loadAll() on login.
let PROMO_CODES = [];

// Loaded by AdminData.loadAll() on login.
let CHAT_THREADS = [];

const WEEK_DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const WEEK_REVENUE = {
  c1: [4200, 3800, 5100, 4700, 6200, 8400, 7600],
  c2: [3100, 2900, 4200, 3800, 5100, 6300, 5800],
  c3: [1800, 2100, 1900, 2300, 2100, 3200, 2800],
  c4: [3500, 4100, 3800, 4500, 5200, 7100, 6400],
};

// ── PER-CENTER PACKAGES ─────────────────────────────────────
const CENTER_PACKAGES = {
  c1: {
    water: [
      { id:'c1w1', name:'Exterior Wash',       price:199, duration:'25–30 min', active:true,  tasks:['Pre-rinse with pressure washer','Apply shampoo & scrub exterior','Rinse clean','Hand-dry with microfibre'] },
      { id:'c1w2', name:'Exterior + Vacuum',   price:349, duration:'45–50 min', active:true,  tasks:['Pre-rinse with pressure washer','Apply shampoo & scrub exterior','Rinse clean','Vacuum interior floors & seats','Wipe dashboard','Hand-dry exterior'] },
      { id:'c1w3', name:'Full Body Detailing', price:549, duration:'70–80 min', active:true,  tasks:['Pre-rinse','Engine bay wipe-down','Full exterior shampoo','Clay bar treatment','Interior vacuum & wipe','Window cleaning (in/out)','Hand-dry & inspect'] },
    ],
    dry: [
      { id:'c1d1', name:'Basic Dry Wash',         price:149, duration:'20–25 min', active:true,  tasks:['Dry wipe exterior panels','Tyre & rim wipe'] },
      { id:'c1d2', name:'Standard Dry Wash',      price:249, duration:'35–40 min', active:true,  tasks:['Dry wipe full exterior','Interior vacuum','Dashboard & console wipe','Door sill cleaning'] },
      { id:'c1d3', name:'Premium Dry + Interior', price:399, duration:'50–60 min', active:false, tasks:['Full dry exterior wipe','Deep vacuum seats & floors','Dashboard & AC vent cleaning','Door panels wipe','Window interior clean'] },
    ],
    steam: [
      { id:'c1s1', name:'Steam Exterior',       price:349, duration:'30–40 min',  active:true, tasks:['Steam blast exterior panels','Tyre & rim steam clean','Rinse & dry'] },
      { id:'c1s2', name:'Full Steam Wash',      price:549, duration:'60–70 min',  active:true, tasks:['Full exterior steam wash','Interior steam sanitise','Seat & carpet steam','Dashboard steam clean','Windows clean'] },
      { id:'c1s3', name:'Steam + Polish & Wax', price:799, duration:'90–100 min', active:true, tasks:['Full exterior steam wash','Machine polish paintwork','Carnauba wax coat','Interior steam clean','Tyre dressing'] },
    ],
    d2d: [
      { id:'c1x1', name:'D2D Dry Wash',       price:299, duration:'30–35 min',   active:true,  tasks:['Agent arrives at location','Dry wipe exterior','Tyre wipe','Interior vacuum'] },
      { id:'c1x2', name:'D2D Water + Vacuum', price:449, duration:'50–60 min',   active:true,  tasks:['Agent arrives with equipment','Waterless exterior wash','Full interior vacuum','Dashboard wipe'] },
      { id:'c1x3', name:'D2D Steam Wash',     price:599, duration:'60–75 min',   active:false, tasks:['Agent arrives with steam unit','Full exterior steam','Interior steam sanitise'] },
      { id:'c1x4', name:'D2D Full Detailing', price:899, duration:'100–120 min', active:true,  tasks:['Full exterior steam wash','Machine polish','Wax coat','Deep interior clean','Odour eliminator spray'] },
    ],
  },
  c2: {
    water: [
      { id:'c2w1', name:'Exterior Wash',       price:199, duration:'25–30 min', active:true, tasks:['Pre-rinse','Foam wash','Rinse','Dry'] },
      { id:'c2w2', name:'Exterior + Vacuum',   price:349, duration:'45–50 min', active:true, tasks:['Pre-rinse','Foam wash','Rinse','Vacuum interior','Dry'] },
      { id:'c2w3', name:'Full Body Detailing', price:599, duration:'70–80 min', active:true, tasks:['Pre-rinse','Full shampoo','Interior vacuum & wipe','Window clean','Hand-dry'] },
    ],
    dry: [
      { id:'c2d1', name:'Basic Dry Wash',         price:149, duration:'20–25 min', active:true, tasks:['Exterior panel wipe','Tyre wipe'] },
      { id:'c2d2', name:'Standard Dry Wash',      price:249, duration:'35–40 min', active:true, tasks:['Exterior wipe','Interior vacuum','Dashboard clean'] },
      { id:'c2d3', name:'Premium Dry + Interior', price:449, duration:'50–60 min', active:true, tasks:['Full exterior dry wash','Deep interior vacuum','Leather conditioner','Window clean'] },
    ],
    steam: [
      { id:'c2s1', name:'Steam Exterior',       price:399, duration:'30–40 min',  active:true, tasks:['Steam exterior panels','Rim & tyre steam','Dry finish'] },
      { id:'c2s2', name:'Full Steam Wash',      price:599, duration:'60–70 min',  active:true, tasks:['Exterior steam','Interior steam sanitise','Seat clean','Window clean'] },
      { id:'c2s3', name:'Steam + Polish & Wax', price:849, duration:'90–100 min', active:true, tasks:['Full steam wash','Polish paintwork','Wax coat','Interior deep clean'] },
    ],
    d2d: [],
  },
  c3: {
    water: [
      { id:'c3w1', name:'Exterior Wash',       price:179, duration:'25–30 min', active:true, tasks:['Pre-rinse','Shampoo wash','Rinse','Dry'] },
      { id:'c3w2', name:'Exterior + Vacuum',   price:299, duration:'45–50 min', active:true, tasks:['Pre-rinse','Shampoo wash','Rinse','Vacuum','Dry'] },
    ],
    dry: [
      { id:'c3d1', name:'Basic Dry Wash',    price:129, duration:'20–25 min', active:true, tasks:['Exterior wipe-down'] },
      { id:'c3d2', name:'Standard Dry Wash', price:229, duration:'35–40 min', active:true, tasks:['Exterior wipe-down','Interior vacuum','Dashboard wipe'] },
    ],
    steam: [],
    d2d:   [],
  },
  c4: {
    water: [
      { id:'c4w1', name:'Exterior Wash',       price:199, duration:'25–30 min', active:true, tasks:['Pre-rinse','Foam wash','Rinse','Dry'] },
      { id:'c4w2', name:'Exterior + Vacuum',   price:349, duration:'45–50 min', active:true, tasks:['Pre-rinse','Foam wash','Rinse','Vacuum interior','Dashboard wipe','Dry'] },
      { id:'c4w3', name:'Full Body Detailing', price:549, duration:'70–80 min', active:true, tasks:['Pre-rinse','Engine bay clean','Full exterior shampoo','Interior vacuum','Window clean','Hand-dry'] },
    ],
    dry: [
      { id:'c4d1', name:'Basic Dry Wash',         price:149, duration:'20–25 min', active:true, tasks:['Exterior panel wipe','Tyre wipe'] },
      { id:'c4d2', name:'Standard Dry Wash',      price:249, duration:'35–40 min', active:true, tasks:['Exterior wipe','Interior vacuum','Dashboard clean'] },
      { id:'c4d3', name:'Premium Dry + Interior', price:399, duration:'50–60 min', active:true, tasks:['Full exterior dry wash','Deep vacuum','Leather wipe','Window clean'] },
    ],
    steam: [
      { id:'c4s1', name:'Steam Exterior',       price:349, duration:'30–40 min',  active:true, tasks:['Steam exterior','Rim steam','Dry finish'] },
      { id:'c4s2', name:'Full Steam Wash',      price:549, duration:'60–70 min',  active:true, tasks:['Exterior steam','Interior steam','Seat clean','Window clean'] },
      { id:'c4s3', name:'Steam + Polish & Wax', price:799, duration:'90–100 min', active:true, tasks:['Full steam wash','Polish','Wax coat','Interior deep clean','Tyre dressing'] },
    ],
    d2d: [
      { id:'c4x1', name:'D2D Dry Wash',       price:299, duration:'30–35 min',   active:true, tasks:['Arrive at location','Dry exterior wipe','Tyre wipe'] },
      { id:'c4x2', name:'D2D Water + Vacuum', price:449, duration:'50–60 min',   active:true, tasks:['Arrive at location','Waterless wash','Vacuum interior'] },
      { id:'c4x3', name:'D2D Full Detailing', price:899, duration:'100–120 min', active:true, tasks:['Arrive at location','Full steam wash','Polish','Wax','Deep interior clean'] },
    ],
  },
};

// ── PER-CENTER BLOCKED SLOTS ─────────────────────────────────
let CENTER_BLOCKED_SLOTS = {
  c1: { water:[], dry:[], steam:[], d2d:[] },
  c2: { water:['2:00 PM','2:30 PM'], dry:[], steam:['5:00 PM','5:30 PM'], d2d:[] },
  c3: { water:['4:00 PM','4:30 PM','5:00 PM','5:30 PM'], dry:['4:30 PM','5:00 PM','5:30 PM'], steam:[], d2d:[] },
  c4: { water:[], dry:[], steam:[], d2d:[] },
};

// ── SEEDED AUDIT LOG (pre-existing history) ──────────────────
// Live entries are stored in localStorage (key: sw_audit_log).
// This seed is merged in on first load.
const AUDIT_SEED = [
  { id:'seed1', centerId:'c1', centerName:'Shine Auto Wash',  actor:'admin',  actorName:'Rajiv Sharma',    actorRole:'Admin',        action:'Package price updated',  detail:'💧 Exterior Wash: ₹179 → ₹199',                 ts: Date.now() - 7200000 },
  { id:'seed2', centerId:'c1', centerName:'Shine Auto Wash',  actor:'center', actorName:'Ramesh Patil',    actorRole:'Center Admin',  action:'Booking status updated', detail:'#SW20509 marked Completed',                      ts: Date.now() - 5400000 },
  { id:'seed3', centerId:'c2', centerName:'SparkWash Bandra', actor:'admin',  actorName:'Rajiv Sharma',    actorRole:'Admin',        action:'Slot blocked',           detail:'💧 Water Wash · 2:00 PM and 2:30 PM',            ts: Date.now() - 4800000 },
  { id:'seed4', centerId:'c3', centerName:'CleanRide Powai',  actor:'center', actorName:'Sunita Joshi',    actorRole:'Center Admin',  action:'Center closed',          detail:'Center marked Closed by owner',                  ts: Date.now() - 3600000 },
  { id:'seed5', centerId:'c4', centerName:'QuickWash Thane',  actor:'admin',  actorName:'Rajiv Sharma',    actorRole:'Admin',        action:'Package enabled',        detail:'💨 Steam + Polish & Wax: Enabled',               ts: Date.now() - 2700000 },
  { id:'seed6', centerId:'c1', centerName:'Shine Auto Wash',  actor:'center', actorName:'Ramesh Patil',    actorRole:'Center Admin',  action:'Slot blocked',           detail:'🧴 Dry Wash · 3:00 PM blocked',                  ts: Date.now() - 1800000 },
  { id:'seed7', centerId:'c2', centerName:'SparkWash Bandra', actor:'admin',  actorName:'Arjun Mehta',     actorRole:'Super Admin',   action:'Package price updated',  detail:'💨 Full Steam Wash: ₹549 → ₹599',               ts: Date.now() - 1200000 },
  { id:'seed8', centerId:'c4', centerName:'QuickWash Thane',  actor:'center', actorName:'Deepak Rao',      actorRole:'Center Admin',  action:'Booking status updated', detail:'#SW20803 Arrived → In Progress (Wash started)',  ts: Date.now() - 600000  },
];

// Loaded by AdminData.loadAll() on login.
const ACTIVITY_FEED = [];

// ── PLATFORM-WIDE HISTORY (all apps) ────────────────────────
// source: 'user' | 'center' | 'admin' | 'superadmin'
const _h = 3600000, _d = 86400000, _now = Date.now();
const PLATFORM_HISTORY = [
  { id:'ph1',  ts:_now- 5*60000,    source:'user',       actor:'Divya Singh',     centerId:'c4', action:'Booking created',          detail:'#SW20810 · QuickWash Thane · Dry Wash · ₹249 · 10:30 AM' },
  { id:'ph2',  ts:_now-18*60000,    source:'user',       actor:'Vishal Tiwari',   centerId:'c4', action:'Rating submitted',          detail:'#SW20809 · 5★ — "Excellent service, very fast!"' },
  { id:'ph3',  ts:_now-42*60000,    source:'center',     actor:'QuickWash Thane', centerId:'c4', action:'Booking status updated',    detail:'#SW20808 → In Progress · Kiran Mehta · Steam Wash' },
  { id:'ph4',  ts:_now- 1.2*_h,    source:'user',       actor:'Rahul Kumar',     centerId:'c2', action:'Booking cancelled',         detail:'#SW20807 · SparkWash Bandra · Water Wash · ₹199' },
  { id:'ph5',  ts:_now- 1.8*_h,    source:'center',     actor:'Shine Auto Wash', centerId:'c1', action:'Package price updated',     detail:'💧 Water Wash · Premium Wash: ₹349 → ₹299' },
  { id:'ph6',  ts:_now- 2.5*_h,    source:'admin',      actor:'Rajiv Sharma',    centerId:'c1', action:'Booking rescheduled',       detail:'#SW20805 · Slot: 11:00 AM → 12:30 PM · Admin override' },
  { id:'ph7',  ts:_now- 3.1*_h,    source:'user',       actor:'Meera Pillai',    centerId:'c4', action:'Booking created',          detail:'#SW20806 · QuickWash Thane · Steam Wash · ₹549 · 2:00 PM' },
  { id:'ph8',  ts:_now- 4.0*_h,    source:'superadmin', actor:'Arjun Mehta',     centerId:'c3', action:'Center visibility changed', detail:'CleanRide Powai hidden from customer app' },
  { id:'ph9',  ts:_now- 4.5*_h,    source:'center',     actor:'SparkWash Bandra',centerId:'c2', action:'Slot blocked',             detail:'💧 Water Wash · 3:00 PM blocked for maintenance' },
  { id:'ph10', ts:_now- 5.2*_h,    source:'user',       actor:'Ritu Sharma',     centerId:'c1', action:'Profile updated',          detail:'Phone number updated to +91 98100 55123' },
  { id:'ph11', ts:_now- 6.0*_h,    source:'center',     actor:'CleanRide Powai', centerId:'c3', action:'Center closed',            detail:'Marked closed at 6:00 PM · Owner: Sunita Joshi' },
  { id:'ph12', ts:_now- 7.5*_h,    source:'superadmin', actor:'Arjun Mehta',     centerId:null, action:'Promo code created',       detail:'MONSOON30 · 30% off · Min ₹299 · Expires 30 Jun' },
  { id:'ph13', ts:_now- 8.0*_h,    source:'admin',      actor:'Sneha Kulkarni',  centerId:'c3', action:'Package added',            detail:'🧴 Dry Wash · Interior Vacuum added at ₹199' },
  { id:'ph14', ts:_now- 9.0*_h,    source:'user',       actor:'Kavya Menon',     centerId:'c2', action:'Rating submitted',         detail:'#SW20801 · 4★ — "Good but took longer than expected"' },
  { id:'ph15', ts:_now-10.0*_h,    source:'center',     actor:'QuickWash Thane', centerId:'c4', action:'Wash type enabled',        detail:'🚗 Door-to-Door service activated' },
  { id:'ph16', ts:_now-12.0*_h,    source:'user',       actor:'Ankit Desai',     centerId:'c1', action:'Booking created',         detail:'#SW20800 · Shine Auto Wash · Steam Wash · ₹699 · 9:00 AM' },
  { id:'ph17', ts:_now-14.0*_h,    source:'admin',      actor:'Rajiv Sharma',    centerId:'c2', action:'Center open/close',        detail:'SparkWash Bandra marked Open · Admin override' },
  { id:'ph18', ts:_now-16.0*_h,    source:'superadmin', actor:'Arjun Mehta',     centerId:'c1', action:'Display order changed',    detail:'Shine Auto Wash moved to position #1 in customer app' },
  { id:'ph19', ts:_now- 1*_d,      source:'user',       actor:'Pooja Rao',       centerId:'c4', action:'Booking created',         detail:'#SW20799 · QuickWash Thane · Water Wash · ₹199 · 11:00 AM' },
  { id:'ph20', ts:_now- 1*_d- 2*_h,source:'center',     actor:'Shine Auto Wash', centerId:'c1', action:'Slot unblocked',          detail:'💧 Water Wash · 1:00 PM slot unblocked' },
  { id:'ph21', ts:_now- 1*_d- 4*_h,source:'user',       actor:'Suresh Nair',     centerId:'c1', action:'Booking cancelled',       detail:'#SW20798 · Shine Auto Wash · Dry Wash · ₹349' },
  { id:'ph22', ts:_now- 1*_d- 5*_h,source:'admin',      actor:'Sneha Kulkarni',  centerId:'c4', action:'Wash type updated',       detail:'🚗 Door-to-Door enabled for QuickWash Thane' },
  { id:'ph23', ts:_now- 2*_d,      source:'user',       actor:'Farida Sheikh',   centerId:'c2', action:'Booking created',         detail:'#SW20797 · SparkWash Bandra · Steam Wash · ₹499 · 3:30 PM' },
  { id:'ph24', ts:_now- 2*_d- 1*_h,source:'center',     actor:'SparkWash Bandra',centerId:'c2', action:'Booking status updated',  detail:'#SW20797 → Completed · Farida Sheikh · ₹499 collected' },
  { id:'ph25', ts:_now- 2*_d- 3*_h,source:'superadmin', actor:'Arjun Mehta',     centerId:null, action:'Promo deactivated',       detail:'LAUNCH50 deactivated · 89/100 uses reached' },
  { id:'ph26', ts:_now- 2*_d- 6*_h,source:'user',       actor:'Nikhil Gupta',    centerId:'c3', action:'Rating submitted',        detail:'#SW20796 · 3★ — "Center was closed when I arrived"' },
  { id:'ph27', ts:_now- 3*_d,      source:'center',     actor:'CleanRide Powai', centerId:'c3', action:'Package price updated',   detail:'💧 Water Wash · Basic Wash: ₹149 → ₹179' },
  { id:'ph28', ts:_now- 3*_d- 2*_h,source:'admin',      actor:'Rajiv Sharma',    centerId:'c1', action:'Package updated',         detail:'💧 Exterior Wash: duration 25–30 min → 20–25 min' },
  { id:'ph29', ts:_now- 3*_d- 4*_h,source:'user',       actor:'Priya Sharma',    centerId:'c1', action:'Booking created',         detail:'#SW20795 · Shine Auto Wash · Water Wash · ₹199 · 10:00 AM' },
  { id:'ph30', ts:_now- 4*_d,      source:'superadmin', actor:'Arjun Mehta',     centerId:null, action:'Admin account updated',   detail:'Sneha Kulkarni assigned to centers c3, c4' },
  { id:'ph31', ts:_now- 4*_d- 3*_h,source:'center',     actor:'QuickWash Thane', centerId:'c4', action:'Center opened',           detail:'Marked open at 8:30 AM · Owner: Deepak Rao' },
  { id:'ph32', ts:_now- 4*_d- 5*_h,source:'user',       actor:'Amit Joshi',      centerId:'c4', action:'Booking created',        detail:'#SW20793 · QuickWash Thane · Door-to-Door · ₹799 · 11:30 AM' },
  { id:'ph33', ts:_now- 5*_d,      source:'admin',      actor:'Sneha Kulkarni',  centerId:'c3', action:'Booking reassigned',      detail:'#SW20791 · Center: CleanRide Powai → SparkWash Bandra' },
  { id:'ph34', ts:_now- 5*_d- 2*_h,source:'superadmin', actor:'Arjun Mehta',     centerId:null, action:'City activated',          detail:'Thane city activated · Service expanded to Thane West' },
  { id:'ph35', ts:_now- 5*_d- 4*_h,source:'user',       actor:'Lakshmi Iyer',    centerId:'c2', action:'Rating submitted',        detail:'#SW20790 · 5★ — "Best car wash in Bandra, highly recommend!"' },
  { id:'ph36', ts:_now- 6*_d,      source:'center',     actor:'Shine Auto Wash', centerId:'c1', action:'Wash type enabled',       detail:'🚗 Door-to-Door service activated · New service area' },
  { id:'ph37', ts:_now- 6*_d- 3*_h,source:'user',       actor:'Rajan Verma',     centerId:'c1', action:'Booking created',        detail:'#SW20788 · Shine Auto Wash · Door-to-Door · ₹999 · 2:00 PM' },
  { id:'ph38', ts:_now- 6*_d- 5*_h,source:'admin',      actor:'Rajiv Sharma',    centerId:'c2', action:'Booking updated',        detail:'#SW20787 · Price: ₹499 → ₹449 · Admin discount applied' },
  { id:'ph39', ts:_now- 7*_d,      source:'superadmin', actor:'Arjun Mehta',     centerId:null, action:'Platform launched',       detail:'SparkWash Admin v1.0 live · All 4 centers onboarded' },
  { id:'ph40', ts:_now- 7*_d- 1*_h,source:'center',     actor:'QuickWash Thane', centerId:'c4', action:'Center registered',      detail:'Onboarding complete · 4 wash types enabled · 12 slots live' },
];

// Revenue access requests: { id, adminId, adminName, centerId, centerName, status, requestedAt }
let REVENUE_REQUESTS = [];

// Loaded by AdminData.loadAll() on login.
let REVIEWS       = [];
let NOTIFICATIONS = [];
