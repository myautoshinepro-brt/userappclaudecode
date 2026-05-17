// ============================================================
// Pitbay — router.js
// Screen navigation and routing
// ============================================================

const Router = {
  screens: {},   // { screenId: HTMLElement }
  current: null,
  history: [],

  // Screens that don't require authentication
  PUBLIC_SCREENS: new Set(['login', 'signup']),

  // Register all screens on page load
  init() {
    document.querySelectorAll('[data-screen]').forEach(el => {
      this.screens[el.dataset.screen] = el;
    });
    this._initEdgeSwipe();
    // Don't call go() here — boot sequence in index.html handles the initial screen
  },

  _initEdgeSwipe() {
    let touchStartX = 0;
    let touchStartY = 0;
    const EDGE_ZONE = 30; // px from either edge
    const MIN_SWIPE = 60; // minimum horizontal travel

    document.addEventListener('touchstart', e => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    }, { passive: true });

    document.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - touchStartX;
      const dy = e.changedTouches[0].clientY - touchStartY;
      const screenW = window.innerWidth;
      // Must start from edge zone, travel far enough, and be more horizontal than vertical
      const fromLeftEdge  = touchStartX < EDGE_ZONE;
      const fromRightEdge = touchStartX > screenW - EDGE_ZONE;
      if ((fromLeftEdge || fromRightEdge) && Math.abs(dx) >= MIN_SWIPE && Math.abs(dx) > Math.abs(dy)) {
        Router.back();
      }
    }, { passive: true });
  },

  go(screenId, pushHistory = true) {
    // Auth guard: non-public screens require a logged-in session
    if (!this.PUBLIC_SCREENS.has(screenId) && typeof Auth !== 'undefined' && !Auth.isLoggedIn()) {
      screenId = 'login';
      pushHistory = false;
    }

    // Stop background work on screens that need cleanup before we leave.
    if (this.current === 'chat' && screenId !== 'chat' && typeof ChatScreen !== 'undefined' && ChatScreen.destroy) {
      ChatScreen.destroy();
    }

    // Hide all
    Object.values(this.screens).forEach(el => {
      el.style.visibility = 'hidden';
      el.style.pointerEvents = 'none';
      el.classList.remove('screen-active');
    });

    const target = this.screens[screenId];
    if (!target) {
      console.warn(`Screen "${screenId}" not found.`);
      return;
    }

    // Show target
    target.style.visibility = 'visible';
    target.style.pointerEvents = 'all';
    target.classList.add('screen-active');
    target.style.zIndex = 1;

    // Update history (never push auth screens into history)
    if (pushHistory && this.current && this.current !== screenId &&
        !this.PUBLIC_SCREENS.has(this.current)) {
      this.history.push(this.current);
    }
    AppState.ui.prevScreen = this.current;
    AppState.ui.currentScreen = screenId;
    this.current = screenId;

    // Update bottom nav active state
    this._updateNav(screenId);

    // Lifecycle hooks
    this._onEnter(screenId);

    // Update nav pills (prototype helper)
    this._updatePills(screenId);
  },

  back() {
    if (this.history.length > 0) {
      const prev = this.history.pop();
      this.go(prev, false);
      return;
    }
    // No history (e.g. deep link or first navigation) — safe default.
    this.go('home', false);
  },

  // Pull-to-refresh: per-screen async handler. Each refresh re-fetches the
  // data this screen depends on, then re-renders it.
  REFRESH_HANDLERS: {
    home:          async () => {
      const tasks = [];
      if (typeof UserData !== 'undefined') {
        if (UserData.loadAddresses) tasks.push(UserData.loadAddresses());
        if (UserData.loadPromos)    tasks.push(UserData.loadPromos());
      }
      await Promise.all(tasks);
      if (typeof LocationModal !== 'undefined' && LocationModal._applyCityFilter) {
        await LocationModal._applyCityFilter(AppState.user?.city || '');
      }
      if (typeof HomeScreen !== 'undefined' && HomeScreen.refreshPromoBanner) HomeScreen.refreshPromoBanner();
    },
    bookings:      async () => {
      if (typeof UserData !== 'undefined') await UserData.loadBookings();
      if (typeof BookingScreen !== 'undefined') BookingScreen.renderBookings();
    },
    notifications: async () => {
      if (typeof UserData !== 'undefined') await UserData.loadBookings();
      if (typeof NotifState !== 'undefined' && NotifState.rebuildFromData) NotifState.rebuildFromData();
      if (typeof NotificationScreen !== 'undefined' && NotificationScreen._renderInbox) NotificationScreen._renderInbox();
    },
    addresses:     async () => {
      if (typeof UserData !== 'undefined') await UserData.loadAddresses();
      if (typeof ProfileScreen !== 'undefined') ProfileScreen.renderAddresses();
    },
    vehicles:      async () => {
      if (typeof UserData !== 'undefined') await UserData.loadVehicles();
      if (typeof ProfileScreen !== 'undefined') ProfileScreen.renderVehicles();
    },
    reviews:       async () => {
      if (typeof UserData !== 'undefined') await UserData.loadBookings();
      if (typeof ProfileScreen !== 'undefined') ProfileScreen.renderMyReviews();
    },
    promos:        async () => {
      if (typeof UserData !== 'undefined') await UserData.loadPromos();
      if (typeof ProfileScreen !== 'undefined') ProfileScreen.renderMyPromos();
    },
    // Chat polls on its own — no need for pull-to-refresh, and the gesture
    // would conflict with the keyboard / message-list scroll on Android.
  },

  _attachPullRefresh(screenId) {
    if (typeof PullRefresh === 'undefined') return;
    const handler = this.REFRESH_HANDLERS[screenId];
    if (!handler) return;
    const screen = this.screens[screenId];
    if (!screen) return;
    const scrollEl = screen.querySelector('.scroll-area');
    if (!scrollEl) return;
    PullRefresh.attach(scrollEl, handler);
  },

  _onEnter(screenId) {
    this._attachPullRefresh(screenId);

    switch (screenId) {
      case 'home':
        if (typeof MapView !== 'undefined') MapView.init();
        break;
      case 'bookings':
        if (typeof BookingScreen !== 'undefined') BookingScreen.renderBookings();
        break;
      case 'summary':
        if (typeof SummaryScreen !== 'undefined') SummaryScreen.render();
        break;
      case 'confirmed':
        if (typeof BookingScreen !== 'undefined') BookingScreen.renderConfirmed();
        break;
      case 'notifications':
        if (typeof NotificationScreen !== 'undefined') NotificationScreen.init();
        break;
      case 'chat':
        if (typeof ChatScreen !== 'undefined') ChatScreen.init();
        break;
      case 'vehicles':
        if (typeof ProfileScreen !== 'undefined' && ProfileScreen.renderVehicles) ProfileScreen.renderVehicles();
        break;
      case 'addresses':
        if (typeof ProfileScreen !== 'undefined' && ProfileScreen.renderAddresses) ProfileScreen.renderAddresses();
        break;
      case 'add-address': {
        // Skip reset when editAddress() pre-populated the form for editing
        if (typeof ProfileScreen !== 'undefined' && ProfileScreen.editingAddressId != null) break;
        ['addr-area','addr-flat','addr-landmark','addr-pincode'].forEach(id => {
          const el = document.getElementById(id); if (el) el.value = '';
        });
        const latEl = document.getElementById('addr-lat'); if (latEl) latEl.value = '';
        const lngEl = document.getElementById('addr-lng'); if (lngEl) lngEl.value = '';
        const btn = document.getElementById('addr-gps-btn'); if (btn) btn.textContent = '📍 Detect GPS location';
        const titleEl = document.getElementById('add-addr-title');
        const btnEl   = document.getElementById('add-addr-save-btn');
        if (titleEl) titleEl.textContent = 'Add new address';
        if (btnEl)   btnEl.textContent   = 'Save address';
        if (typeof ProfileScreen !== 'undefined') ProfileScreen.pickAddressLabel('home2');
        break;
      }
      case 'reviews':
        if (typeof ProfileScreen !== 'undefined' && ProfileScreen.renderMyReviews) ProfileScreen.renderMyReviews();
        break;
      case 'promos':
        if (typeof ProfileScreen !== 'undefined' && ProfileScreen.renderMyPromos)  ProfileScreen.renderMyPromos();
        break;
      default:
        break;
    }
  },

  _updateNav(screenId) {
    const nav = document.querySelector('.bottom-nav');
    if (nav) nav.style.display = this.PUBLIC_SCREENS.has(screenId) ? 'none' : '';

    const navMap = {
      home:     'home',
      bookings: 'bookings',
      manage:   'bookings',
      'my-bookings': 'bookings',
      profile:  'profile',
      'edit-profile':    'profile',
      'change-phone':    'profile',
      'reviews':         'profile',
      'promos':          'profile',
      'addresses':       'profile',
      'add-address':     'profile',
      'vehicles':        'profile',
      'payments':        'profile',
      'notifications':   'profile',
      'language':        'profile',
      'help':            'profile',
      'chat':            'profile',
    };
    const activeTab = navMap[screenId] || 'home';
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === activeTab);
    });
  },

  _updatePills(screenId) {
    document.querySelectorAll('.nav-pill').forEach(pill => {
      const on = pill.dataset.screen === screenId;
      pill.style.background = on ? 'var(--blue)' : 'transparent';
      pill.style.color = on ? '#fff' : 'var(--color-text-secondary)';
      pill.style.borderColor = on ? 'var(--blue)' : 'var(--color-border-secondary)';
    });
  },
};
