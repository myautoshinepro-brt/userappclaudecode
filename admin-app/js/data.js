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

let CENTERS = [
  { id:'c1', name:'Shine Auto Wash',   owner:'Ramesh Patil',  phone:'+91 98200 11234', area:'Andheri West, Mumbai', address:'Shop 4, Veera Desai Rd, Andheri West', gstin:'27AABCS1429B1Z1', rating:4.8, totalReviews:210, isOpen:true,  washTypes:['water','dry','steam','d2d'], totalBookings:10, activeNow:2, todayRevenue:3850, visible:true,  displayOrder:1, cityId:'city1', pendingSettlement:349,  bankAccount:'00112233445566', ifsc:'HDFC0001234', accountName:'Ramesh Patil',  bankName:'HDFC Bank'  },
  { id:'c2', name:'SparkWash Bandra',  owner:'Kiran Nair',    phone:'+91 98200 22345', area:'Bandra West, Mumbai',  address:'Unit 12, Hill Road, Bandra West',     gstin:'27BBCSK2341B2Z2', rating:4.6, totalReviews:187, isOpen:true,  washTypes:['water','dry','steam'],       totalBookings:8,  activeNow:1, todayRevenue:2900, visible:true,  displayOrder:2, cityId:'city1', pendingSettlement:199,  bankAccount:'00223344556677', ifsc:'ICIC0002345', accountName:'Kiran Nair',   bankName:'ICICI Bank' },
  { id:'c3', name:'CleanRide Powai',   owner:'Sunita Joshi',  phone:'+91 98200 33456', area:'Powai, Mumbai',        address:'Shop 7, Hiranandani Gardens, Powai', gstin:'27CCJSK3452C3Z3', rating:4.4, totalReviews:143, isOpen:false, washTypes:['water','dry'],               totalBookings:5,  activeNow:0, todayRevenue:1250, visible:false, displayOrder:3, cityId:'city1', pendingSettlement:0,    bankAccount:null,             ifsc:null,           accountName:null,           bankName:null         },
  { id:'c4', name:'QuickWash Thane',   owner:'Deepak Rao',    phone:'+91 98200 44567', area:'Thane West, Mumbai',   address:'Plot 3, Pokhran Rd, Thane West',      gstin:'27DDRSK4563D4Z4', rating:4.7, totalReviews:98,  isOpen:true,  washTypes:['water','dry','steam','d2d'], totalBookings:12, activeNow:3, todayRevenue:4200, visible:true,  displayOrder:4, cityId:'city2', pendingSettlement:798,  bankAccount:'00334455667788', ifsc:'SBIN0003456', accountName:'Deepak Rao',   bankName:'SBI'        },
];

// Settlement history — SparkWash offer settlements to centers
// app_discount = SparkWash promo; SparkWash credits center bank account next working day
let SETTLEMENTS = [
  { id:'st1', centerId:'c1', centerName:'Shine Auto Wash',  bookingRef:'#SW20490', customer:'Rahul Kumar',   washType:'water', packageName:'Full Body Wash',    packagePrice:299, appDiscount:199, washDate:'6 May 2026', status:'settled', settledAt:Date.now()-86400000*2, creditedOn:'7 May 2026' },
  { id:'st2', centerId:'c4', centerName:'QuickWash Thane',  bookingRef:'#SW20488', customer:'Priya Singh',   washType:'steam', packageName:'Steam Full Body',   packagePrice:699, appDiscount:349, washDate:'6 May 2026', status:'settled', settledAt:Date.now()-86400000*2, creditedOn:'7 May 2026' },
  { id:'st3', centerId:'c2', centerName:'SparkWash Bandra', bookingRef:'#SW20491', customer:'Amit Patel',    washType:'dry',   packageName:'Dry Clean Premium', packagePrice:349, appDiscount:199, washDate:'7 May 2026', status:'settled', settledAt:Date.now()-86400000*1, creditedOn:'8 May 2026' },
  { id:'st4', centerId:'c1', centerName:'Shine Auto Wash',  bookingRef:'#SW20509', customer:'Neha Gupta',    washType:'steam', packageName:'Steam Interior',    packagePrice:499, appDiscount:349, washDate:'8 May 2026', status:'pending', settledAt:null, creditedOn:null },
  { id:'st5', centerId:'c2', centerName:'SparkWash Bandra', bookingRef:'#SW20601', customer:'Karan Joshi',   washType:'water', packageName:'Exterior Wash',     packagePrice:299, appDiscount:199, washDate:'8 May 2026', status:'pending', settledAt:null, creditedOn:null },
  { id:'st6', centerId:'c4', centerName:'QuickWash Thane',  bookingRef:'#SW20801', customer:'Sunita Patil',  washType:'steam', packageName:'Steam Full Body',   packagePrice:699, appDiscount:349, washDate:'8 May 2026', status:'pending', settledAt:null, creditedOn:null },
  { id:'st7', centerId:'c4', centerName:'QuickWash Thane',  bookingRef:'#SW20802', customer:'Vikram Sharma', washType:'d2d',   packageName:'D2D Premium',       packagePrice:599, appDiscount:449, washDate:'8 May 2026', status:'pending', settledAt:null, creditedOn:null },
];

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

let ALL_BOOKINGS = [
  // Shine Auto Wash c1
  { id:'#SW20501', centerId:'c1', customer:'Rahul Kumar',   phone:'98765 43210', vehicle:'MH-01-AB-1234', model:'Alto 800',    type:'water', pkg:'Exterior + Vacuum',    price:349, slot:'10:30 AM', status:'washing',   date:'Today', rating:null },
  { id:'#SW20502', centerId:'c1', customer:'Priya Shah',    phone:'91234 56789', vehicle:'MH-02-CD-5678', model:'Honda City',  type:'steam', pkg:'Full Steam Wash',      price:549, slot:'11:00 AM', status:'arrived',   date:'Today', rating:null },
  { id:'#SW20503', centerId:'c1', customer:'Amit Desai',    phone:'99887 76655', vehicle:'MH-03-EF-9012', model:'Swift Dzire', type:'dry',   pkg:'Standard Dry Wash',    price:249, slot:'11:30 AM', status:'confirmed', date:'Today', rating:null },
  { id:'#SW20504', centerId:'c1', customer:'Sunita Rao',    phone:'87654 32109', vehicle:'MH-04-GH-3456', model:'Baleno',      type:'water', pkg:'Full Body Detailing',  price:549, slot:'12:00 PM', status:'new',       date:'Today', rating:null },
  { id:'#SW20509', centerId:'c1', customer:'Deepak Mehta',  phone:'90001 23456', vehicle:'MH-09-QR-3456', model:'Thar',        type:'water', pkg:'Exterior + Vacuum',    price:349, slot:'4:00 PM',  status:'done',      date:'Today', rating:5   },
  { id:'#SW20510', centerId:'c1', customer:'Nisha Gupta',   phone:'89001 23456', vehicle:'MH-10-ST-7890', model:'Punch',       type:'dry',   pkg:'Basic Dry Wash',       price:149, slot:'9:30 AM',  status:'done',      date:'Today', rating:4   },
  // SparkWash Bandra c2
  { id:'#SW20601', centerId:'c2', customer:'Arjun Verma',   phone:'97001 11222', vehicle:'MH-04-AA-1111', model:'Nexon',       type:'water', pkg:'Full Body Detailing',  price:549, slot:'9:00 AM',  status:'done',      date:'Today', rating:5   },
  { id:'#SW20602', centerId:'c2', customer:'Kavya Menon',   phone:'97002 22333', vehicle:'MH-04-BB-2222', model:'Creta',       type:'steam', pkg:'Steam + Polish & Wax', price:799, slot:'10:00 AM', status:'done',      date:'Today', rating:4   },
  { id:'#SW20603', centerId:'c2', customer:'Rohan Das',     phone:'97003 33444', vehicle:'MH-04-CC-3333', model:'Seltos',      type:'dry',   pkg:'Premium Dry+Interior', price:399, slot:'12:00 PM', status:'washing',   date:'Today', rating:null },
  { id:'#SW20604', centerId:'c2', customer:'Ananya Roy',    phone:'97004 44555', vehicle:'MH-04-DD-4444', model:'WagonR',      type:'water', pkg:'Exterior Wash',        price:199, slot:'3:00 PM',  status:'new',       date:'Today', rating:null },
  // CleanRide Powai c3
  { id:'#SW20701', centerId:'c3', customer:'Pooja Iyer',    phone:'96001 55666', vehicle:'MH-05-EE-5555', model:'i20',         type:'water', pkg:'Exterior + Vacuum',    price:349, slot:'9:30 AM',  status:'done',      date:'Today', rating:4   },
  { id:'#SW20702', centerId:'c3', customer:'Karthik Nair',  phone:'96002 66777', vehicle:'MH-05-FF-6666', model:'Venue',       type:'dry',   pkg:'Standard Dry Wash',    price:249, slot:'11:00 AM', status:'done',      date:'Today', rating:5   },
  { id:'#SW20703', centerId:'c3', customer:'Simran Kaur',   phone:'96003 77888', vehicle:'MH-05-GG-7777', model:'Brezza',      type:'steam', pkg:'Full Steam Wash',      price:549, slot:'1:00 PM',  status:'cancelled', date:'Today', rating:null },
  // QuickWash Thane c4
  { id:'#SW20801', centerId:'c4', customer:'Vishal Tiwari', phone:'95001 88999', vehicle:'MH-06-HH-8888', model:'XUV700',      type:'steam', pkg:'Steam + Polish & Wax', price:799, slot:'8:30 AM',  status:'done',      date:'Today', rating:5   },
  { id:'#SW20802', centerId:'c4', customer:'Meera Pillai',  phone:'95002 99000', vehicle:'MH-06-II-9999', model:'Thar',        type:'water', pkg:'Full Body Detailing',  price:549, slot:'9:00 AM',  status:'done',      date:'Today', rating:5   },
  { id:'#SW20803', centerId:'c4', customer:'Sanjay Gupta',  phone:'95003 00111', vehicle:'MH-06-JJ-0000', model:'Scorpio',     type:'d2d',   pkg:'D2D Water + Vacuum',   price:449, slot:'10:30 AM', status:'washing',   date:'Today', rating:null },
  { id:'#SW20804', centerId:'c4', customer:'Ritu Sharma',   phone:'95004 11222', vehicle:'MH-06-KK-1111', model:'Ertiga',      type:'water', pkg:'Exterior + Vacuum',    price:349, slot:'11:00 AM', status:'arrived',   date:'Today', rating:null },
  { id:'#SW20805', centerId:'c4', customer:'Anil Kumar',    phone:'95005 22333', vehicle:'MH-06-LL-2222', model:'Fortuner',    type:'steam', pkg:'Full Steam Wash',      price:549, slot:'12:00 PM', status:'confirmed', date:'Today', rating:null },
  { id:'#SW20806', centerId:'c4', customer:'Divya Singh',   phone:'95006 33444', vehicle:'MH-06-MM-3333', model:'Bolero',      type:'dry',   pkg:'Standard Dry Wash',    price:249, slot:'2:30 PM',  status:'new',       date:'Today', rating:null },
];

const ALL_SLOTS = [
  '8:00 AM','8:30 AM','9:00 AM','9:30 AM','10:00 AM','10:30 AM',
  '11:00 AM','11:30 AM','12:00 PM','12:30 PM','1:00 PM','1:30 PM',
  '2:00 PM','2:30 PM','3:00 PM','3:30 PM','4:00 PM','4:30 PM',
  '5:00 PM','5:30 PM','6:00 PM',
];

let PROMO_CODES = [
  { id:'p1', code:'SPARK20',    type:'percent', value:20,  minOrder:300, maxUses:500,  used:287, active:true,  expiry:'2025-08-31' },
  { id:'p2', code:'FIRSTWASH',  type:'flat',    value:100, minOrder:200, maxUses:1000, used:876, active:true,  expiry:'2025-12-31' },
  { id:'p3', code:'STEAM50',    type:'flat',    value:50,  minOrder:500, maxUses:200,  used:67,  active:true,  expiry:'2025-07-15' },
  { id:'p4', code:'MONSOON30',  type:'percent', value:30,  minOrder:250, maxUses:300,  used:300, active:false, expiry:'2024-09-30' },
  { id:'p5', code:'WEEKEND10',  type:'percent', value:10,  minOrder:150, maxUses:1000, used:142, active:true,  expiry:'2025-09-30' },
];

let CHAT_THREADS = [
  {
    id:'t1', type:'customer', name:'Rahul Kumar', initials:'RK', avatarBg:'#3b82f6',
    phone:'98765 43210', bookingId:'#SW20501', centerId:'c1', unread:2, lastTime:'10:42 AM',
    lastMsg:'My car is still waiting, its been 30 min already',
    messages:[
      { from:'user',  text:'Hi, I booked at 10:30 AM for water wash. My car is still waiting.',       time:'10:38 AM' },
      { from:'user',  text:'My car is still waiting, its been 30 min already',                        time:'10:42 AM' },
      { from:'admin', text:'Hi Rahul! I am checking with Shine Auto Wash right now. One moment.',     time:'10:43 AM' },
    ],
  },
  {
    id:'t2', type:'center', name:'SparkWash Bandra', initials:'SB', avatarBg:'#10b981',
    phone:'+91 98200 22345', centerId:'c2', unread:1, lastTime:'9:55 AM',
    lastMsg:'We are facing staff shortage today, may need to reschedule 2 bookings',
    messages:[
      { from:'center', text:'Good morning! We are facing staff shortage today, may need to reschedule 2 bookings', time:'9:55 AM' },
    ],
  },
  {
    id:'t3', type:'customer', name:'Ananya Roy', initials:'AR', avatarBg:'#ec4899',
    phone:'97004 44555', bookingId:'#SW20604', centerId:'c2', unread:0, lastTime:'9:30 AM',
    lastMsg:'Thank you for the quick resolution!',
    messages:[
      { from:'user',  text:'I wanted to change my booking from 2:00 PM to 3:00 PM',                             time:'9:20 AM' },
      { from:'admin', text:'Sure Ananya! I have updated your slot to 3:00 PM. You will receive a confirmation.', time:'9:28 AM' },
      { from:'user',  text:'Thank you for the quick resolution!',                                                 time:'9:30 AM' },
    ],
  },
  {
    id:'t4', type:'center', name:'CleanRide Powai', initials:'CP', avatarBg:'#f59e0b',
    phone:'+91 98200 33456', centerId:'c3', unread:0, lastTime:'Yesterday',
    lastMsg:'Equipment maintenance done, opening at 10 AM tomorrow',
    messages:[
      { from:'center', text:'Our steam machine broke down, cancelling all steam bookings today',                      time:'8:00 AM' },
      { from:'admin',  text:'Understood. I will notify affected customers and offer reschedule or full refund.',      time:'8:15 AM' },
      { from:'center', text:'Equipment maintenance done, opening at 10 AM tomorrow',                                 time:'6:30 PM' },
    ],
  },
  {
    id:'t5', type:'customer', name:'Sanjay Gupta', initials:'SG', avatarBg:'#8b5cf6',
    phone:'95003 00111', bookingId:'#SW20803', centerId:'c4', unread:0, lastTime:'Yesterday',
    lastMsg:'Perfect, that works for me. Thank you!',
    messages:[
      { from:'user',  text:'Can the D2D agent come a bit earlier? Maybe 10 AM instead of 10:30?',    time:'9:10 AM' },
      { from:'admin', text:'Let me check availability at QuickWash Thane for the 10 AM slot.',        time:'9:14 AM' },
      { from:'admin', text:'Good news! 10:00 AM is available. I have updated your booking.',          time:'9:18 AM' },
      { from:'user',  text:'Perfect, that works for me. Thank you!',                                  time:'9:20 AM' },
    ],
  },
];

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

const ACTIVITY_FEED = [
  { icon:'🆕', text:'New booking #SW20806 — QuickWash Thane',   sub:'Divya Singh · ₹249 · 2:30 PM',             time:'5 min ago',  type:'booking' },
  { icon:'⭐', text:'5★ review — QuickWash Thane',              sub:'Vishal Tiwari · Steam + Polish & Wax',      time:'12 min ago', type:'review'  },
  { icon:'✨', text:'Booking #SW20802 completed',               sub:'Meera Pillai · ₹549 · QuickWash Thane',    time:'18 min ago', type:'done'    },
  { icon:'💬', text:'New message from Rahul Kumar',             sub:'My car is still waiting, its been 30 min',  time:'23 min ago', type:'chat'    },
  { icon:'🚗', text:'Customer arrived — #SW20804',              sub:'Ritu Sharma · Ertiga · QuickWash Thane',    time:'28 min ago', type:'arrived' },
  { icon:'⭐', text:'5★ review — SparkWash Bandra',             sub:'Arjun Verma · Full Body Detailing',         time:'35 min ago', type:'review'  },
  { icon:'🔴', text:'CleanRide Powai closed early',             sub:'Center marked closed by owner',              time:'1 hr ago',   type:'center'  },
  { icon:'🎁', text:'Promo SPARK20 used 3 times',               sub:'₹612 discount given today',                 time:'2 hr ago',   type:'promo'   },
];

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

// Customer reviews across all centers — status: 'active' | 'removed'
let REVIEWS = [
  { id:'rv1',  centerId:'c1', customerName:'Rahul Kumar',   bookingId:'#SW20509', rating:5, comment:'Excellent wash! Very thorough and the team was super professional. Will definitely come back.', ts: Date.now()-5400000,   status:'active'  },
  { id:'rv2',  centerId:'c1', customerName:'Nisha Gupta',   bookingId:'#SW20510', rating:4, comment:'Good dry wash, finished quickly. Dashboard could have been wiped more carefully.',               ts: Date.now()-9000000,   status:'active'  },
  { id:'rv3',  centerId:'c1', customerName:'Priya Shah',    bookingId:'#SW20502', rating:2, comment:'Had to wait 40 minutes past my slot. Staff was rude when I asked for an update. Very unhappy.',  ts: Date.now()-14400000,  status:'active'  },
  { id:'rv4',  centerId:'c2', customerName:'Arjun Verma',   bookingId:'#SW20601', rating:5, comment:'Best car wash in Bandra! Shine like a mirror. Loved the complimentary air freshener.',          ts: Date.now()-3600000,   status:'active'  },
  { id:'rv5',  centerId:'c2', customerName:'Kavya Menon',   bookingId:'#SW20602', rating:4, comment:'Steam wash was great, tyres look brand new. Slight delay but overall satisfied.',                ts: Date.now()-7200000,   status:'active'  },
  { id:'rv6',  centerId:'c2', customerName:'Rohan Das',     bookingId:'#SW20603', rating:1, comment:'Worst experience. Scratched my car and denied responsibility. DO NOT COME HERE!!!',             ts: Date.now()-18000000,  status:'active'  },
  { id:'rv7',  centerId:'c3', customerName:'Pooja Iyer',    bookingId:'#SW20701', rating:4, comment:'Decent wash for the price. Interior vacuum was thorough.',                                       ts: Date.now()-21600000,  status:'active'  },
  { id:'rv8',  centerId:'c3', customerName:'Karthik Nair',  bookingId:'#SW20702', rating:5, comment:'Quick, affordable and efficient. Staff was friendly and helpful.',                               ts: Date.now()-28800000,  status:'active'  },
  { id:'rv9',  centerId:'c4', customerName:'Vishal Tiwari', bookingId:'#SW20801', rating:5, comment:'Excellent service, very fast! XUV700 looked brand new after the steam wash. 10/10.',            ts: Date.now()-1800000,   status:'active'  },
  { id:'rv10', centerId:'c4', customerName:'Meera Pillai',  bookingId:'#SW20802', rating:5, comment:'Fantastic detailing job. Worth every rupee. The team was meticulous.',                          ts: Date.now()-4500000,   status:'active'  },
  { id:'rv11', centerId:'c4', customerName:'Sanjay Gupta',  bookingId:'#SW20803', rating:3, comment:'D2D agent arrived 20 mins late but the wash quality was good.',                                 ts: Date.now()-32400000,  status:'active'  },
  { id:'rv12', centerId:'c1', customerName:'Amit Desai',    bookingId:'#SW20503', rating:1, comment:'SCAM! They damaged my wing mirror and asked for extra money. Reporting to consumer forum.',     ts: Date.now()-36000000,  status:'active'  },
];

let NOTIFICATIONS = [
  { id:'n1', icon:'🆕', title:'New booking #SW20806',          body:'Divya Singh · QuickWash Thane · Dry Wash · ₹249',          time: Date.now() - 300000,  read:false, action:'bookings'  },
  { id:'n2', icon:'⭐', title:'5★ review received',            body:'Vishal Tiwari · Steam + Polish & Wax · QuickWash Thane',   time: Date.now() - 720000,  read:false, action:'reports'   },
  { id:'n3', icon:'💬', title:'New message from Rahul Kumar',  body:'My car is still waiting, its been 30 min already',         time: Date.now() - 1380000, read:false, action:'chat'      },
  { id:'n4', icon:'✨', title:'Booking #SW20802 completed',    body:'Meera Pillai · ₹549 · QuickWash Thane',                   time: Date.now() - 1080000, read:true,  action:'bookings'  },
  { id:'n5', icon:'🚗', title:'Customer arrived — #SW20804',   body:'Ritu Sharma · Ertiga · QuickWash Thane',                  time: Date.now() - 1680000, read:true,  action:'bookings'  },
  { id:'n6', icon:'⭐', title:'4★ review received',            body:'Kavya Menon · Steam + Polish & Wax · SparkWash Bandra',   time: Date.now() - 2100000, read:true,  action:'reports'   },
  { id:'n7', icon:'🔴', title:'CleanRide Powai closed early',  body:'Center marked closed by owner · Powai, Mumbai',           time: Date.now() - 3600000, read:true,  action:'centers'   },
  { id:'n8', icon:'🎁', title:'Promo SPARK20 used 3 times',    body:'3 new redemptions · ₹612 discount given today',           time: Date.now() - 7200000, read:true,  action:'super'     },
];
