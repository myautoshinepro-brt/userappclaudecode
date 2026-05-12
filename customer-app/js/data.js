// ============================================================
// SparkWash — data.js
// Static data (packages, promos) + runtime-loaded centers
// ============================================================

// Loaded from GET /api/centers on boot (see index.html). Empty until then.
let CENTERS = [];

// Wash type priority order (LOCKED): Water → Dry → Steam → D2D
const WASH_TYPES = [
  { key: 'water', label: '💧 Water Wash',      icon: '💧', name: 'Water' },
  { key: 'dry',   label: '🧴 Dry Wash',        icon: '🧴', name: 'Dry Wash' },
  { key: 'steam', label: '💨 Steam Wash',      icon: '💨', name: 'Steam' },
  { key: 'd2d',   label: '🚗 Door-to-Door',    icon: '🚗', name: 'D2D' },
];

const PACKAGES = {
  water: [
    {
      id: 'w1', name: 'Exterior Wash', price: 199,
      duration: '25–30 min', popular: false,
      desc: 'Foam & water exterior clean.',
      includes: [
        { icon: '✅', text: 'Foam + water rinse' },
        { icon: '✅', text: 'Window & glass clean' },
        { icon: '✅', text: 'Tyre wash' },
        { icon: '✅', text: 'Microfibre dry' },
      ],
    },
    {
      id: 'w2', name: 'Exterior + Vacuum', price: 349,
      duration: '45–50 min', popular: true,
      desc: 'Full exterior wash + interior vacuum.',
      includes: [
        { icon: '✅', text: 'Foam wash + rinse' },
        { icon: '✅', text: 'Interior vacuum' },
        { icon: '✅', text: 'Dashboard & door wipe' },
        { icon: '✅', text: 'Tyre & rim clean' },
      ],
    },
    {
      id: 'w3', name: 'Full Body Detailing', price: 549,
      duration: '70–80 min', popular: false,
      desc: 'Clay bar + seat shampoo + full detail.',
      includes: [
        { icon: '✅', text: 'Foam shampoo + clay bar' },
        { icon: '✅', text: 'Seat shampoo' },
        { icon: '✅', text: 'Tyre polish' },
        { icon: '✅', text: 'Dashboard polish' },
      ],
    },
  ],
  dry: [
    {
      id: 'd1', name: 'Basic Dry Wash', price: 149,
      duration: '20–25 min', popular: false,
      desc: 'Quick waterless spray & wipe.',
      includes: [
        { icon: '✅', text: 'Exterior body wipe' },
        { icon: '✅', text: 'Window & mirror' },
        { icon: '✅', text: 'Tyre wipe' },
      ],
    },
    {
      id: 'd2', name: 'Standard Dry Wash', price: 249,
      duration: '35–40 min', popular: true,
      desc: 'Full exterior + dashboard wipe.',
      includes: [
        { icon: '✅', text: 'Exterior spray' },
        { icon: '✅', text: 'Window clean' },
        { icon: '✅', text: 'Dashboard wipe' },
        { icon: '✅', text: 'Door panels' },
      ],
    },
    {
      id: 'd3', name: 'Premium Dry + Interior', price: 399,
      duration: '50–60 min', popular: false,
      desc: 'Dry wash + full interior vacuum.',
      includes: [
        { icon: '✅', text: 'Full exterior spray' },
        { icon: '✅', text: 'Interior vacuum' },
        { icon: '✅', text: 'Dashboard' },
        { icon: '✅', text: 'Air freshener' },
      ],
    },
  ],
  steam: [
    {
      id: 's1', name: 'Steam Exterior', price: 349,
      duration: '30–40 min', popular: false,
      desc: 'High-pressure steam — exterior only.',
      includes: [
        { icon: '✅', text: 'Steam — full exterior' },
        { icon: '✅', text: 'Wheel arch & tyre' },
        { icon: '❌', text: 'Interior not included' },
      ],
    },
    {
      id: 's2', name: 'Full Steam Wash', price: 549,
      duration: '60–70 min', popular: true,
      desc: 'Full steam wash — germ-free, inside & out.',
      includes: [
        { icon: '✅', text: 'Full exterior steam' },
        { icon: '✅', text: 'Interior steam' },
        { icon: '✅', text: 'Germ & bacteria elimination' },
        { icon: '✅', text: 'Odour removal' },
      ],
    },
    {
      id: 's3', name: 'Steam + Polish & Wax', price: 799,
      duration: '90–100 min', popular: false,
      desc: 'Steam + paint polish + 30-day wax coat.',
      includes: [
        { icon: '✅', text: 'Full steam wash' },
        { icon: '✅', text: 'Paint polish' },
        { icon: '✅', text: 'Wax coat (lasts 30 days)' },
        { icon: '✅', text: 'Leather conditioning' },
      ],
    },
  ],
  d2d: [
    {
      id: 'x1', name: 'D2D Dry Wash', price: 299,
      duration: '30–35 min', popular: false,
      desc: 'Agent comes to your door — waterless.',
      includes: [
        { icon: '✅', text: 'Exterior spray & wipe' },
        { icon: '📸', text: 'Before & after photos' },
        { icon: '📍', text: 'Live agent tracking' },
      ],
    },
    {
      id: 'x2', name: 'D2D Water + Vacuum', price: 449,
      duration: '50–60 min', popular: true,
      desc: 'Agent brings water — full wash at your door.',
      includes: [
        { icon: '✅', text: 'Foam + water wash' },
        { icon: '✅', text: 'Interior vacuum' },
        { icon: '📸', text: 'Before & after photos' },
        { icon: '📍', text: 'Live agent tracking' },
      ],
    },
    {
      id: 'x3', name: 'D2D Steam Wash', price: 599,
      duration: '60–75 min', popular: false,
      desc: 'Agent brings steam equipment to your door.',
      includes: [
        { icon: '✅', text: 'Full exterior steam' },
        { icon: '✅', text: 'Interior steam' },
        { icon: '📸', text: 'Before & after photos' },
      ],
    },
    {
      id: 'x4', name: 'D2D Full Detailing', price: 899,
      duration: '100–120 min', popular: false,
      desc: 'Complete detailing service at your doorstep.',
      includes: [
        { icon: '✅', text: 'Steam + foam wash' },
        { icon: '✅', text: 'Paint polish + wax coat' },
        { icon: '✅', text: 'Full interior detailing' },
      ],
    },
  ],
};

// Loaded from GET /api/promos on boot (see UserData.loadPromos).
// Server returns only currently-active, non-expired promos — they're all
// flagged applicable: true here. Min-order check happens server-side on booking.
let PROMO_CODES = [];

// Loaded from GET /api/profile/addresses on login (see index.html).
let SAVED_ADDRESSES = [];

const MUMBAI_AREAS = [
  'Andheri West', 'Andheri East', 'Bandra West', 'Bandra East',
  'Juhu', 'Versova', 'Powai', 'Goregaon East', 'Goregaon West',
  'Malad West', 'Malad East', 'Borivali West', 'Borivali East',
  'Kandivali', 'Jogeshwari', 'Santacruz West', 'Santacruz East',
  'Vile Parle', 'Dahisar', 'Mira Road', 'Thane', 'Navi Mumbai',
];

const PAYMENT_METHODS = [
  { key: 'upi',    icon: '📱', label: 'UPI',       sub: 'rahul.kumar@oksbi', isDefault: true },
  { key: 'card',   icon: '💳', label: 'Card',      sub: '•••• 4521 · HDFC Visa', isDefault: false },
  { key: 'wallet', icon: '👛', label: 'Wallet',    sub: 'Paytm / PhonePe', isDefault: false },
  { key: 'later',  icon: '💵', label: 'Pay later', sub: 'Pay after service', isDefault: false },
];

// Loaded from GET /api/profile/vehicles on login (see index.html).
let SAVED_VEHICLES = [];

// Loaded from GET /api/bookings on login (see index.html).
let PAST_BOOKINGS    = [];
let CENTER_PACKAGES  = null;  // { water: [...], dry: [...], steam: [...], d2d: [...] } per center
// Default per-wash-type fallback used while a center's packages haven't loaded yet.
let ACTIVE_PACKAGES  = PACKAGES;  // points to whichever object renderPackages() reads from
