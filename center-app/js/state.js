// Pitbay Center App — state.js

const AppState = {
  // Auth
  token:  null,
  center: null,   // { id, name, owner_name, mobile, email, address, wash_types, open_time, close_time, is_open }

  // Current view data
  bookings:     [],
  currentDate:  todayISO(),
  activeFilter: 'all',   // all | new | confirmed | arrived | washing | done
  selectedBooking: null,

  // Queue
  queue: [],

  // Slots
  slotGrid: {},         // { water: [{time, is_blocked}], ... }
  activeWashTab: 'water',

  // UI
  ui: { currentScreen: 'login', prevScreen: null },

  // ── AUTH HELPERS ──

  setAuth(token, center) {
    this.token  = token;
    this.center = center;
    localStorage.setItem('sw_center_token',  token);
    localStorage.setItem('sw_center_data',   JSON.stringify(center));
  },

  clearAuth() {
    this.token  = null;
    this.center = null;
    localStorage.removeItem('sw_center_token');
    localStorage.removeItem('sw_center_data');
  },

  loadFromStorage() {
    const token  = localStorage.getItem('sw_center_token');
    const stored = localStorage.getItem('sw_center_data');
    if (token && stored) {
      this.token  = token;
      this.center = JSON.parse(stored);
      return true;
    }
    return false;
  },

  // ── COMPUTED ──

  get initials() {
    if (!this.center) return '??';
    return (this.center.owner_name || '')
      .split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '??';
  },

  get washTypesList() {
    if (!this.center) return [];
    return (this.center.wash_types || 'water').split(',').map(w => w.trim());
  },

  get isOpen() {
    return !!this.center?.is_open;
  },

  setOpenStatus(val) {
    if (this.center) this.center.is_open = val ? 1 : 0;
    localStorage.setItem('sw_center_data', JSON.stringify(this.center));
  },
};
