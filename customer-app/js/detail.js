// ============================================================
// SparkWash — detail.js
// Center detail: wash tabs, package cards, slot picker, bottom bar
// ============================================================

const DetailScreen = {
  center: null,

  init(center) {
    this.center = center;
    document.getElementById('detail-center-name').textContent = center.name;
    document.getElementById('detail-center-sub').textContent =
      `⭐ ${center.rating} · ${center.isD2DOnly ? 'Door-to-door' : center.distance + ' km'} · ${center.area} · ${center.open ? 'Open till ' + center.openTill : 'Closed'}`;

    // Reset tab to Water
    AppState.booking.washType = 'water';
    AppState.booking.packageId = null;
    document.querySelectorAll('.wash-tab').forEach(t => t.classList.remove('active'));
    document.querySelector('.wash-tab[data-type="water"]')?.classList.add('active');
    document.getElementById('slot-section')?.classList.remove('show');
    this._resetBottomBar();
    this._renderDateChips();

    // Show static packages immediately so the UI isn't blank, then swap in
    // the center's real packages once fetched.
    ACTIVE_PACKAGES = PACKAGES;
    this.renderPackages('water');
    if (typeof UserData !== 'undefined') {
      UserData.loadCenterPackages(center.id).then(() => {
        this.renderPackages(AppState.booking.washType || 'water');
      });
    }
  },

  _renderDateChips() {
    const container = document.getElementById('detail-date-chips');
    if (!container) return;
    const dates = AppState.getUpcomingDates(4);
    container.innerHTML = dates.map((d, i) =>
      `<div class="date-chip ${i === 0 ? 'active' : ''}"
            onclick="DetailScreen.selectDate(this,'${d.value}')">${d.chipLabel}</div>`
    ).join('');
    // Set the booking date to today
    AppState.booking.date = dates[0].value;
    // Reset slot selection to default
    AppState.booking.slot = '10:30 AM';
  },

  switchWashType(type, el) {
    AppState.booking.washType = type;
    AppState.booking.packageId = null;
    document.querySelectorAll('.wash-tab').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
    document.getElementById('slot-section')?.classList.remove('show');
    this._resetBottomBar();
    this.renderPackages(type);
  },

  renderPackages(type) {
    const pkgs = (ACTIVE_PACKAGES && ACTIVE_PACKAGES[type]) || PACKAGES[type] || [];
    const container = document.getElementById('package-list');
    if (!container) return;

    container.innerHTML = pkgs.map(p => {
      const sel = AppState.booking.packageId === p.id;
      return `
        <div class="pkg-card ${sel ? 'selected' : ''} ${p.popular && !sel ? 'popular' : ''}"
             onclick="DetailScreen.selectPackage('${p.id}','${type}')">
          ${p.popular && !sel ? `<div class="pkg-popular-badge">⭐ POPULAR</div>` : ''}
          <div class="pkg-body">
            <div class="pkg-row">
              <div class="pkg-name">${p.name}</div>
              <div><div class="pkg-price">₹${p.price}</div><div class="pkg-duration">⏱ ${p.duration}</div></div>
            </div>
            <div class="pkg-desc">${p.desc}</div>
            <div style="display:flex;flex-direction:column;gap:3px">
              ${p.includes.map(i => `<div class="pkg-item"><span style="font-size:11px;flex-shrink:0">${i.icon}</span><span>${i.text}</span></div>`).join('')}
            </div>
            <button class="pkg-select-btn">${sel ? '✓ Selected' : 'Select this package'}</button>
          </div>
        </div>`;
    }).join('');
  },

  selectPackage(pkgId, type) {
    AppState.setPackage(type, pkgId);
    this.renderPackages(type);
    const slotSection = document.getElementById('slot-section');
    slotSection?.classList.add('show');
    setTimeout(() => slotSection?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
    this._updateBottomBar();
  },

  selectSlot(el, time) {
    document.querySelectorAll('#slot-section .slot-chip:not(.full)').forEach(s => s.classList.remove('active'));
    el.classList.add('active');
    AppState.booking.slot = time;
    this._updateBottomBar();
  },

  selectDate(el, label) {
    document.querySelectorAll('.date-chip').forEach(c => c.classList.remove('active'));
    el.classList.add('active');
    AppState.booking.date = label;
  },

  _resetBottomBar() {
    const cta = document.getElementById('booking-cta');
    const sum = document.getElementById('booking-summary-bar');
    if (cta) { cta.className = 'bottom-bar-cta empty'; cta.textContent = 'Select a package to continue'; }
    if (sum) sum.classList.remove('show');
  },

  _updateBottomBar() {
    const list = (ACTIVE_PACKAGES && ACTIVE_PACKAGES[AppState.booking.washType]) || PACKAGES[AppState.booking.washType] || [];
    const pkg = list.find(p => p.id === AppState.booking.packageId);
    if (!pkg) return;
    const sum = document.getElementById('booking-summary-bar');
    if (sum) {
      sum.classList.add('show');
      document.getElementById('bar-pkg-name').textContent = pkg.name;
      document.getElementById('bar-pkg-sub').textContent = `${WASH_TYPES.find(t=>t.key===AppState.booking.washType)?.label} · ${pkg.duration}`;
      document.getElementById('bar-pkg-price').textContent = '₹' + pkg.price;
    }
    const cta = document.getElementById('booking-cta');
    if (cta) { cta.className = 'bottom-bar-cta confirm'; cta.textContent = '✅ Review & confirm booking →'; }
  },

  // Pre-selects wash type + package for Repeat Booking flow
  initRepeat(center, washType, packageId, vehicleId) {
    this.init(center); // sets up screen, resets to water tab

    // Switch to correct wash type tab
    const tab = document.querySelector(`.wash-tab[data-type="${washType}"]`);
    if (tab) {
      document.querySelectorAll('.wash-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
    }

    // Pre-select package + vehicle
    AppState.setPackage(washType, packageId);
    AppState.setVehicle(vehicleId);

    // Re-render packages with the right type (shows selected state)
    this.renderPackages(washType);

    // Show slot picker immediately
    const slotSection = document.getElementById('slot-section');
    if (slotSection) {
      slotSection.classList.add('show');
      setTimeout(() => slotSection.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);
    }
    this._updateBottomBar();
    UI.toast('🔁 Package pre-selected — pick a new date & slot!');
  },

  proceed() {
    if (!AppState.booking.packageId) return;
    Router.go('summary');
  },
};
