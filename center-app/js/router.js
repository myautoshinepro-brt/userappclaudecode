// Pitbay Center App — router.js

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
    this._updateSidebar(screenId);
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
    const nav = document.querySelector('.bottom-nav');
    if (nav) nav.style.display = this.PUBLIC_SCREENS.has(screenId) ? 'none' : '';

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

  // Desktop sidebar highlight. Maps sub-screens to their canonical sidebar
  // group (same idea as _updateNav's navMap).
  _updateSidebar(screenId) {
    const sidebar = document.getElementById('app-sidebar');
    if (!sidebar) return;
    // Auto-hide sidebar on public screens (login/onboard) since user has no
    // center to manage yet. We also hide it at all <1024px viewports via CSS.
    const isPublic = this.PUBLIC_SCREENS.has(screenId);
    sidebar.style.display = isPublic ? 'none' : '';
    // Toggle a body class so CSS can center the login/onboard card on desktop
    // (it would otherwise stretch full-width with the sidebar gone).
    document.body.classList.toggle('on-public-screen', isPublic);

    const groupMap = {
      'booking-detail':   'bookings',
      'bank-details':     'profile',
      'edit-package':     'manage-packages',
    };
    const active = groupMap[screenId] || screenId;
    sidebar.querySelectorAll('.as-link[data-sb-screen]').forEach(link => {
      link.classList.toggle('active', link.dataset.sbScreen === active);
    });

    // Refresh the center-name card while we're here.
    if (typeof AppState !== 'undefined' && AppState.center) {
      const nameEl = document.getElementById('sb-center-name');
      const subEl  = document.getElementById('sb-center-sub');
      if (nameEl) nameEl.textContent = AppState.center.name || 'Your center';
      if (subEl)  subEl.textContent  = [AppState.center.area, AppState.center.city].filter(Boolean).join(' · ') || 'Center';
    }
  },
};
