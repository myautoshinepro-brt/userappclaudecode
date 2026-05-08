// SparkWash Center App — router.js

const Router = {
  screens: {},
  current: null,
  history: [],

  PUBLIC_SCREENS: new Set(['login', 'onboard']),

  init() {
    document.querySelectorAll('[data-screen]').forEach(el => {
      this.screens[el.dataset.screen] = el;
    });
  },

  go(screenId, pushHistory = true) {
    if (!this.PUBLIC_SCREENS.has(screenId) && !AppState.token) {
      screenId    = 'login';
      pushHistory = false;
    }

    Object.values(this.screens).forEach(el => {
      el.classList.remove('screen-active');
    });

    const target = this.screens[screenId];
    if (!target) { console.warn(`Screen "${screenId}" not found`); return; }

    target.classList.add('screen-active');

    if (pushHistory && this.current && this.current !== screenId &&
        !this.PUBLIC_SCREENS.has(this.current)) {
      this.history.push(this.current);
    }
    AppState.ui.prevScreen    = this.current;
    AppState.ui.currentScreen = screenId;
    this.current = screenId;

    this._updateNav(screenId);
    this._updatePills(screenId);
    this._onEnter(screenId);
  },

  back() {
    if (this.history.length > 0) this.go(this.history.pop(), false);
  },

  _onEnter(screenId) {
    switch (screenId) {
      case 'dashboard':        DashboardScreen.render(); break;
      case 'bookings':         BookingsScreen.render();  break;
      case 'queue':            QueueScreen.render();     break;
      case 'slots':            SlotsScreen.render();     break;
      case 'profile':          ProfileScreen.render();       break;
      case 'bank-details':     ProfileScreen.renderBankDetails(); break;
      case 'manage-packages':  PackagesScreen.renderList(); break;
      case 'revenue-report':   RevenueScreen.render(); break;
      case 'reviews':          ReviewsScreen.render(); break;
      case 'onboard':          Onboarding.render(); break;
    }
  },

  _updateNav(screenId) {
    const navMap = {
      dashboard:   'dashboard',
      bookings:    'bookings',
      'booking-detail': 'bookings',
      queue:       'queue',
      slots:       'slots',
      profile:     'profile',
      'edit-center':       'profile',
      'bank-details':      'profile',
      'manage-packages':   'profile',
      'edit-package':      'profile',
      'revenue-report':    'profile',
      'reviews':           'profile',
    };
    const active = navMap[screenId] || 'dashboard';
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === active);
    });
  },

  _updatePills(screenId) {
    document.querySelectorAll('.nav-pill').forEach(pill => {
      const on = pill.dataset.screen === screenId;
      pill.style.background   = on ? 'var(--navy)'  : 'transparent';
      pill.style.color        = on ? '#fff'          : '';
      pill.style.borderColor  = on ? 'var(--navy)'  : '';
    });
  },
};
