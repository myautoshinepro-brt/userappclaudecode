// ============================================================
// SparkWash — state.js
// Global app state management
// ============================================================

const AppState = {
  // Location
  location: {
    label: 'Home',
    area: 'Andheri West',
    full: 'Home — Andheri West',
    lat: null,
    lng: null,
  },

  // Booking flow
  booking: {
    centerId: null,
    centerName: null,
    washType: 'water',  // water | dry | steam | d2d
    packageId: null,
    packageName: null,
    packagePrice: null,
    packageDuration: null,
    date: (() => {
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const d = new Date();
      return `Today, ${d.getDate()} ${months[d.getMonth()]}`;
    })(),
    slot: '10:30 AM',
    vehicleId: null,   // set on first summary render
    vehicle: '',       // derived string, kept for confirmation screens
    promoCode: null,
    promoDiscount: 0,  // app discount (SparkWash promo) — settled by SparkWash to center
    centerDiscount: 0, // center's own offer — NOT settled by SparkWash
  },

  // Confirmed booking (after payment)
  confirmedBooking: {
    id: null,
    centerId: null,
    centerName: null,
    packageName: null,
    date: null,
    slot: null,
    duration: null,
    totalPaid: null,
    paymentMethod: null,
    status: 'confirmed', // confirmed | accepted | in_progress | completed | cancelled
  },

  // Profile
  user: {
    name: 'Rahul Kumar',
    phone: '+91 98765 43210',
    email: 'rahul.kumar@gmail.com',
    city: 'Mumbai',
    initials: 'RK',
    language: 'English',
  },

  // UI
  ui: {
    currentScreen: 'home',
    prevScreen: null,
    modifyDate: 'Today',
    modifySlot: '10:30 AM',
  },

  // ── HELPERS ──

  setLocation(label, area) {
    this.location.label = label;
    this.location.area = area;
    this.location.full = `${label} — ${area}`;
  },

  setPackage(washType, pkgId) {
    const source = (typeof ACTIVE_PACKAGES !== 'undefined' && ACTIVE_PACKAGES) || PACKAGES;
    const pkg = (source[washType] || []).find(p => p.id === pkgId);
    if (!pkg) return;
    this.booking.washType = washType;
    this.booking.packageId = pkgId;
    this.booking.packageName = pkg.name;
    this.booking.packagePrice = pkg.price;
    this.booking.packageDuration = pkg.duration;
  },

  setSlot(date, slot) {
    this.booking.date = date;
    this.booking.slot = slot;
  },

  setPromo(promoCode) {
    if (!promoCode) {
      this.booking.promoCode = null;
      this.booking.promoDiscount = 0;
      return;
    }
    const promo = PROMO_CODES.find(p => p.code === promoCode);
    if (!promo || !promo.applicable) return;
    this.booking.promoCode = promoCode;
    const base = this.booking.packagePrice || 0;
    this.booking.promoDiscount = promo.type === 'percent'
      ? Math.round(base * promo.discount / 100)
      : promo.discount;
  },

  calcTotal() {
    const base           = this.booking.packagePrice || 0;
    const appDiscount    = this.booking.promoDiscount  || 0;  // SparkWash settles to center
    const centerDiscount = this.booking.centerDiscount || 0;  // Center's own, not settled
    const collectAmount  = Math.max(0, base - appDiscount - centerDiscount);
    return {
      base,
      appDiscount,
      centerDiscount,
      collectAmount,
      settlementAmount: appDiscount, // what SparkWash owes the center
      // Legacy aliases (keep for any code still reading .discount / .total)
      discount: appDiscount,
      total:    collectAmount,
    };
  },

  confirmBooking() {
    const bookingId = '#SW' + Math.floor(10000 + Math.random() * 90000);
    const t = this.calcTotal();
    const v = this.getSelectedVehicle();
    this.confirmedBooking = {
      id:               bookingId,
      centerId:         this.booking.centerId,
      centerName:       this.booking.centerName,
      packageName:      this.booking.packageName,
      vehicleId:        this.booking.vehicleId,
      vehicleStr:       v ? `${v.plate} · ${v.model}` : '',
      date:             this.booking.date,
      slot:             this.booking.slot,
      duration:         this.booking.packageDuration,
      basePrice:        t.base,
      appDiscount:      t.appDiscount,
      centerDiscount:   t.centerDiscount,
      collectAmount:    t.collectAmount,
      settlementAmount: t.settlementAmount,
      totalPaid:        t.collectAmount, // legacy alias
      status:           'confirmed',
    };
    return this.confirmedBooking;
  },

  // Returns [{chipLabel, value, isToday}, …] for the next `count` days
  getUpcomingDates(count = 4) {
    const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const today  = new Date();
    return Array.from({ length: count }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const day = d.getDate();
      const mon = MONTHS[d.getMonth()];
      return {
        chipLabel: i === 0 ? 'Today' : i === 1 ? 'Tmrw' : `${day} ${mon}`,
        value:     i === 0 ? `Today, ${day} ${mon}` : `${day} ${mon}`,
        isToday:   i === 0,
      };
    });
  },

  updateUserName(name) {
    this.user.name = name;
    this.user.initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  },

  updateUserPhone(phone) {
    this.user.phone = '+91 ' + phone;
  },

  // ── VEHICLE ──

  getSelectedVehicle() {
    if (this.booking.vehicleId) {
      return SAVED_VEHICLES.find(v => v.id === this.booking.vehicleId) || null;
    }
    return SAVED_VEHICLES.find(v => v.isPrimary) || SAVED_VEHICLES[0] || null;
  },

  setVehicle(vehicleId) {
    const v = SAVED_VEHICLES.find(v => v.id === vehicleId);
    if (!v) return;
    this.booking.vehicleId = vehicleId;
    this.booking.vehicle   = `${v.plate} · ${v.model}`;
  },

  initVehicle() {
    if (!this.booking.vehicleId) {
      const primary = SAVED_VEHICLES.find(v => v.isPrimary) || SAVED_VEHICLES[0];
      if (primary) this.setVehicle(primary.id);
    }
  },

  // Called after successful login / session restore
  setAuthUser(apiUser) {
    if (!apiUser) return;
    const name = apiUser.full_name || apiUser.name || '';
    this.user.name     = name;
    this.user.phone    = apiUser.mobile ? '+91 ' + apiUser.mobile : this.user.phone;
    this.user.email    = apiUser.email  || this.user.email;
    this.user.initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '??';
    // Refresh dependent UI
    if (typeof ProfileScreen !== 'undefined') ProfileScreen.refreshHeader();
    if (typeof HomeScreen    !== 'undefined') HomeScreen._updateGreeting();
  },

  // Called on logout
  clearAuth() {
    this.user = {
      name: '',
      phone: '',
      email: '',
      city: 'Mumbai',
      initials: '??',
      language: 'English',
    };
  },
};
