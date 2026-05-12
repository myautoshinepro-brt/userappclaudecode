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

// AUDIT_SEED was a demo array of fake admin actions. The real audit log lives
// in localStorage (key: sw_audit_log) and is appended to by logChange() as the
// admin performs real actions. Keeping the seed empty means the History page
// shows only real activity.
const AUDIT_SEED = [];

// Loaded by AdminData.loadAll() on login.
const ACTIVITY_FEED = [];

// ── PLATFORM-WIDE HISTORY ───────────────────────────────────
// Populated by AdminData.loadAll() from real bookings' creation + status
// changes. Local admin actions from this session are merged in via
// getAuditLog() (see HistoryScreen). source: 'user' | 'center' | 'admin' | 'superadmin'.
let PLATFORM_HISTORY = [];

// Revenue access requests: { id, adminId, adminName, centerId, centerName, status, requestedAt }
let REVENUE_REQUESTS = [];

// Loaded by AdminData.loadAll() on login.
let REVIEWS       = [];
let NOTIFICATIONS = [];
