// ============================================================
// SparkWash — router.js
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
    // Don't call go() here — boot sequence in index.html handles the initial screen
  },

  go(screenId, pushHistory = true) {
    // Auth guard: non-public screens require a logged-in session
    if (!this.PUBLIC_SCREENS.has(screenId) && typeof Auth !== 'undefined' && !Auth.isLoggedIn()) {
      screenId = 'login';
      pushHistory = false;
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
    }
  },

  _onEnter(screenId) {
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
