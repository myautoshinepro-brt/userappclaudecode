// ============================================================
// Pitbay — detail.js
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

    // Clear ACTIVE_PACKAGES so we don't render the previous center's data first.
    // Show a loading state while the API fetch is in flight — this avoids the
    // flicker where static demo packages render then get replaced.
    ACTIVE_PACKAGES = null;
    this._renderLoading();
    if (typeof UserData !== 'undefined') {
      UserData.loadCenterPackages(center.id).then((loaded) => {
        // If the API failed (loaded=false), fall back to the static set so the
        // user can still see something instead of an empty screen.
        if (!loaded) ACTIVE_PACKAGES = PACKAGES;
        this.renderPackages(AppState.booking.washType || 'water');
      });
    } else {
      // No UserData module — keep the static fallback as a last resort.
      ACTIVE_PACKAGES = PACKAGES;
      this.renderPackages('water');
    }
  },

  _renderLoading() {
    const container = document.getElementById('package-list');
    if (container) container.innerHTML = `<div style="padding:32px 16px;text-align:center;color:var(--text-tertiary);font-size:12px">Loading packages…</div>`;
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
    const container = document.getElementById('package-list');
    if (!container) return;
    // While ACTIVE_PACKAGES is still null (fetch in flight), keep the loading
    // state instead of falling back to the demo set — that's what caused the
    // flicker on a center like Flight Wash that has fewer real packages.
    if (ACTIVE_PACKAGES === null) { this._renderLoading(); return; }

    const pkgs = (ACTIVE_PACKAGES && ACTIVE_PACKAGES[type]) || [];
    if (!pkgs.length) {
      container.innerHTML = `<div style="padding:32px 16px;text-align:center;color:var(--text-tertiary);font-size:12px">No ${type} packages available at this center yet.</div>`;
      return;
    }

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

  // Pre-selects wash type + package for Repeat Booking flow.
  // packageName is the past booking's package_name (we don't carry the id),
  // so we look it up in the loaded packages by name once they're available.
  // vehicleId can be null — initVehicle() picks primary on summary in that case.
  initRepeat(center, washType, packageName, vehicleId) {
    this.init(center); // sets up screen, fetches packages, resets to water tab

    AppState.booking.washType = washType || 'water';

    // Switch to correct wash type tab visually.
    document.querySelectorAll('.wash-tab').forEach(t => t.classList.remove('active'));
    const tab = document.querySelector(`.wash-tab[data-type="${AppState.booking.washType}"]`);
    if (tab) tab.classList.add('active');

    if (vehicleId) AppState.setVehicle(vehicleId);

    // Packages load async — try matching now (static fallback) and once more
    // after the API returns. Either way, slot picker shows so the user can pick.
    const tryMatch = () => {
      const source = (typeof ACTIVE_PACKAGES !== 'undefined' && ACTIVE_PACKAGES) || PACKAGES;
      const list   = source[AppState.booking.washType] || [];
      const match  = packageName ? list.find(p => p.name === packageName) : null;
      if (match) {
        AppState.setPackage(AppState.booking.washType, match.id);
        this.renderPackages(AppState.booking.washType);
        this._updateBottomBar();
        return true;
      }
      this.renderPackages(AppState.booking.washType);
      return false;
    };

    const matched = tryMatch();
    if (!matched && typeof UserData !== 'undefined') {
      // The center's real packages may still be loading — retry once after.
      UserData.loadCenterPackages(center.id).then(() => tryMatch());
    }

    // Show slot picker right away — even if no package matched, user can pick one.
    const slotSection = document.getElementById('slot-section');
    if (slotSection) {
      slotSection.classList.add('show');
      setTimeout(() => slotSection.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);
    }
    UI.toast(matched ? '🔁 Package pre-selected — pick a new date & slot!' : '🔁 Pick a package to continue');
  },

  proceed() {
    if (!AppState.booking.packageId) return;
    Router.go('summary');
  },
};
