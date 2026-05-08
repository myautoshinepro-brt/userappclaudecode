// ============================================================
// SparkWash — data.js
// All static data: centers, packages, promo codes
// ============================================================

const CENTERS = [
  {
    id: 'c1',
    name: 'Shine Auto Wash',
    area: 'Andheri West',
    distance: 1.2,
    rating: 4.8,
    reviews: 210,
    open: true,
    openTill: '8 PM',
    priceFrom: 149,
    tags: ['water', 'dry', 'steam', 'd2d'],
    hasD2D: true,
    hasSteam: true,
    lat: 19.1362, lng: 72.8296,
  },
  {
    id: 'c2',
    name: 'CleanDrive Express',
    area: 'Bandra East',
    distance: 2.4,
    rating: 4.5,
    reviews: 88,
    open: true,
    openTill: '9 PM',
    priceFrom: 99,
    tags: ['water', 'dry'],
    hasD2D: false,
    hasSteam: false,
    lat: 19.0596, lng: 72.8656,
  },
  {
    id: 'c3',
    name: 'QuickShine D2D',
    area: 'Andheri',
    distance: 0,
    rating: 4.7,
    reviews: 312,
    open: true,
    openTill: 'Available now',
    priceFrom: 199,
    tags: ['d2d', 'water', 'dry'],
    hasD2D: true,
    hasSteam: false,
    isD2DOnly: true,
    lat: 19.1136, lng: 72.8697,
  },
  {
    id: 'c4',
    name: 'WashKing Versova',
    area: 'Versova',
    distance: 3.1,
    rating: 4.4,
    reviews: 54,
    open: false,
    openTill: '9 AM tomorrow',
    priceFrom: 129,
    tags: ['water', 'interior'],
    hasD2D: false,
    hasSteam: false,
    lat: 19.1317, lng: 72.8154,
  },
  {
    id: 'c5',
    name: 'PureClean Juhu',
    area: 'Juhu',
    distance: 3.8,
    rating: 4.6,
    reviews: 140,
    open: true,
    openTill: '7 PM',
    priceFrom: 179,
    tags: ['water', 'steam', 'd2d'],
    hasD2D: true,
    hasSteam: true,
    lat: 19.1053, lng: 72.8263,
  },
];

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

const PROMO_CODES = [
  {
    code: 'SPARKFIRST10',
    discount: 10, type: 'percent',
    title: '10% off your first wash',
    desc: 'For first-time SparkWash users only.',
    applicable: true,
    reason: '✓ You are eligible',
    notApplicableReason: null,
  },
  {
    code: 'WASH20',
    discount: 20, type: 'percent',
    title: '20% off water wash',
    desc: 'Valid on Water Wash packages only.',
    applicable: true,
    reason: '✓ Valid for your wash type',
    notApplicableReason: null,
  },
  {
    code: 'MUMBAI30',
    discount: 30, type: 'flat',
    title: '₹30 off — Mumbai launch offer',
    desc: 'Special launch offer for all Mumbai users.',
    applicable: true,
    reason: '✓ You are in Mumbai',
    notApplicableReason: null,
  },
  {
    code: 'STEAM15',
    discount: 15, type: 'percent',
    title: '15% off steam wash',
    desc: 'Valid on Steam Wash packages only.',
    applicable: false,
    reason: null,
    notApplicableReason: '✗ Not valid for Water Wash',
  },
  {
    code: 'WEEKEND50',
    discount: 50, type: 'flat',
    title: '₹50 off on weekends',
    desc: 'Valid on Saturday & Sunday only.',
    applicable: false,
    reason: null,
    notApplicableReason: '✗ Valid on weekends only',
  },
  {
    code: 'NEWUSER100',
    discount: 100, type: 'flat',
    title: '₹100 off for new users',
    desc: 'Minimum booking value ₹500 required.',
    applicable: false,
    reason: null,
    notApplicableReason: '✗ Min booking ₹500 required',
  },
];

const SAVED_ADDRESSES = [
  {
    key: 'home',
    label: 'Home',
    icon: '🏠',
    address: 'Flat 402, Sunshine Apt, Andheri West',
    pincode: '400053',
    distance: '0.2 km',
    isDefault: true,
    color: '#dbeafe',
  },
  {
    key: 'office',
    label: 'Office',
    icon: '🏢',
    address: 'WeWork, BKC, Bandra East',
    pincode: '400051',
    distance: '8.4 km',
    isDefault: false,
    color: '#dcfce7',
  },
  {
    key: 'parents',
    label: 'Parents home',
    icon: '👨‍👩‍👦',
    address: '12B, Sai Nagar, Borivali West',
    pincode: '400092',
    distance: '18.1 km',
    isDefault: false,
    color: '#fef9c3',
  },
];

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

const SAVED_VEHICLES = [
  {
    id: 'v1',
    plate: 'MH-01-AB-1234',
    model: 'Maruti Alto 800',
    colour: 'White',
    icon: '🚗',
    isPrimary: true,
    color: '#dbeafe',
  },
  {
    id: 'v2',
    plate: 'MH-01-CD-5678',
    model: 'Honda Activa',
    colour: 'Black',
    icon: '🏍️',
    isPrimary: false,
    color: '#dcfce7',
  },
];

// Past completed/cancelled bookings — used by My Bookings screen
const PAST_BOOKINGS = [
  { id:'#SW20104', centerId:'c1', centerName:'Shine Auto Wash',   washType:'steam', packageId:'s2', packageName:'Full Steam Wash',      vehicleId:'v1', vehiclePlate:'MH-01-AB-1234', vehicleModel:'Maruti Alto 800', date:'20 Apr', slot:'9:30 AM',  status:'completed', totalPaid:648,  rating:4 },
  { id:'#SW19876', centerId:'c1', centerName:'Shine Auto Wash',   washType:'water', packageId:'w2', packageName:'Exterior + Vacuum',    vehicleId:'v1', vehiclePlate:'MH-01-AB-1234', vehicleModel:'Maruti Alto 800', date:'14 Apr', slot:'11:00 AM', status:'completed', totalPaid:422,  rating:5 },
  { id:'#SW19501', centerId:'c2', centerName:'SparkWash Bandra',  washType:'dry',   packageId:'d2', packageName:'Standard Dry Wash',    vehicleId:'v1', vehiclePlate:'MH-01-AB-1234', vehicleModel:'Maruti Alto 800', date:'7 Apr',  slot:'10:00 AM', status:'completed', totalPaid:303,  rating:4 },
  { id:'#SW18933', centerId:'c1', centerName:'Shine Auto Wash',   washType:'water', packageId:'w3', packageName:'Full Body Detailing',  vehicleId:'v1', vehiclePlate:'MH-01-AB-1234', vehicleModel:'Maruti Alto 800', date:'28 Mar', slot:'12:00 PM', status:'completed', totalPaid:657,  rating:5 },
  { id:'#SW18201', centerId:'c3', centerName:'CleanRide Powai',   washType:'steam', packageId:'s1', packageName:'Steam Exterior',       vehicleId:'v1', vehiclePlate:'MH-01-AB-1234', vehicleModel:'Maruti Alto 800', date:'15 Mar', slot:'3:00 PM',  status:'cancelled', totalPaid:0,    rating:null },
];
