// ============================================================
// Pitbay — summary.js
// Booking summary screen + promo code bottom sheet
// ============================================================

const SummaryScreen = {

  render() {
    const b = AppState.booking;
    const source = (typeof ACTIVE_PACKAGES !== 'undefined' && ACTIVE_PACKAGES) || PACKAGES;
    const pkg = (source[b.washType] || []).find(p => p.id === b.packageId);
    if (!pkg) return;

    // Ensure a vehicle is selected (init if needed)
    AppState.initVehicle();

    // Auto-apply a coupon the user copied from the home promo banner, but
    // only once and only if it's still valid for this booking. Manual
    // selection takes precedence.
    if (AppState.pendingPromoCode && !b.promoCode) {
      const pending = PROMO_CODES.find(p => p.code === AppState.pendingPromoCode);
      if (pending && pending.applicable && (pending.minOrder || 0) <= (pkg.price || 0)) {
        AppState.setPromo(pending.code);
        UI.toast(`🎁 ${pending.code} applied — you save ₹${AppState.booking.promoDiscount}`);
      }
      AppState.pendingPromoCode = null;
    }

    const washLabel = WASH_TYPES.find(t => t.key === b.washType)?.label || b.washType;
    const t = AppState.calcTotal();

    // Booking details
    const center = CENTERS.find(c => c.id === b.centerId);
    _setText('sum-center-name', center ? `${center.name}, ${center.area}` : b.centerName || '—');
    _setText('sum-pkg-name',    pkg.name);
    _setText('sum-wash-type',   washLabel);
    _setText('sum-slot',        `${b.date} · ${b.slot}`);
    _setText('sum-duration',    pkg.duration);

    // Vehicle section
    this._renderVehicleSection();

    // Included items
    const incEl = document.getElementById('sum-included');
    if (incEl) incEl.innerHTML = pkg.includes.map(i =>
      `<div class="included-item"><span style="font-size:13px;flex-shrink:0">${i.icon}</span><span>${i.text}</span></div>`
    ).join('');

    // Price breakdown
    _setText('sum-base-price', '₹' + t.base);

    // App promo discount row (Pitbay offer)
    const appDiscRow = document.getElementById('sum-app-discount-row');
    if (appDiscRow) {
      appDiscRow.style.display = t.appDiscount > 0 ? 'flex' : 'none';
      _setText('sum-app-discount-val', '-₹' + t.appDiscount);
    }

    // Center discount row (center's own offer)
    const ctrDiscRow = document.getElementById('sum-center-discount-row');
    if (ctrDiscRow) {
      ctrDiscRow.style.display = t.centerDiscount > 0 ? 'flex' : 'none';
      _setText('sum-center-discount-val', '-₹' + t.centerDiscount);
    }

    // Collect amount (pay at center)
    _setText('sum-collect-amount', '₹' + t.collectAmount);

    // Settlement note
    const settleNote = document.getElementById('sum-settlement-note');
    if (settleNote) settleNote.style.display = t.settlementAmount > 0 ? 'flex' : 'none';

    // Confirm button
    const cfbtn = document.getElementById('confirm-pay-btn');
    if (cfbtn) cfbtn.textContent = `✅ Confirm Booking →`;

    this._updatePromoTrigger();
  },

  // ── VEHICLE ──

  _renderVehicleSection() {
    const section = document.getElementById('vehicle-picker-section');
    const sub     = document.getElementById('veh-section-sub');
    if (!section) return;

    const hasVehicles = SAVED_VEHICLES.length > 0;
    const selected    = AppState.getSelectedVehicle();

    if (sub) sub.textContent = hasVehicles ? `(${SAVED_VEHICLES.length} saved)` : '';

    if (!hasVehicles || !selected) {
      // Empty state — also catches the case where vehicleId references a
      // vehicle that's since been removed.
      section.innerHTML = `
        <div class="veh-empty-card" onclick="Router.go('vehicles')">
          <div class="veh-empty-icon">🚗</div>
          <div class="veh-empty-body">
            <div class="veh-empty-title">No vehicle added yet</div>
            <div class="veh-empty-sub">Add your car or bike to continue booking</div>
          </div>
          <span class="veh-change-link" style="color:var(--blue);font-weight:700">Add ›</span>
        </div>`;
    } else {
      // Show selected vehicle card
      section.innerHTML = `
        <div class="veh-selected-card" onclick="VehiclePicker.open()">
          <div class="veh-sel-icon" style="background:${selected.color}">${selected.icon}</div>
          <div class="veh-sel-body">
            <div class="veh-sel-plate">${selected.plate}</div>
            <div class="veh-sel-model">${selected.model} · ${selected.colour}</div>
            ${selected.isPrimary ? '<span class="veh-primary-badge">Primary</span>' : ''}
          </div>
          <span class="veh-change-link">Change ›</span>
        </div>`;
    }
  },

  // ── PROMO ──

  openPromoSheet() {
    document.getElementById('promo-code-input').value = '';
    document.getElementById('promo-error').style.display = 'none';
    this._renderPromoCards();
    document.getElementById('promo-overlay').classList.add('show');
  },

  closePromoSheet() {
    document.getElementById('promo-overlay').classList.remove('show');
  },

  _renderPromoCards() {
    const ok  = PROMO_CODES.filter(p => p.applicable);
    const na  = PROMO_CODES.filter(p => !p.applicable);
    const container = document.getElementById('promo-cards-wrap');
    if (!container) return;

    let html = '';
    if (ok.length) {
      html += `<div class="cg">✅ Available for you (${ok.length})</div>`;
      ok.forEach(p => { html += this._promoCardHTML(p); });
    }
    if (na.length) {
      html += `<div class="cg" style="margin-top:11px">🚫 Not applicable (${na.length})</div>`;
      na.forEach(p => { html += this._promoCardHTML(p); });
    }
    container.innerHTML = html;
  },

  _promoCardHTML(p) {
    const isSel = AppState.booking.promoCode === p.code;
    const dl = p.type === 'percent' ? p.discount + '% OFF' : '₹' + p.discount + ' OFF';
    let cls = 'code-card';
    if (!p.applicable) cls += ' unavailable';
    else if (isSel)    cls += ' available selected-code';
    else               cls += ' available';

    return `
      <div class="${cls}" onclick="${p.applicable ? `SummaryScreen.applyPromo('${p.code}')` : ''}">
        <div class="code-card-strip">✓ Applied to your booking</div>
        <div class="code-card-body">
          <div class="code-card-top">
            <span class="code-card-name">${p.code}</span>
            <span class="code-discount-pill">${dl}</span>
          </div>
          <div class="code-card-title">${p.title}</div>
          <div class="code-card-desc">${p.desc}</div>
          <div class="code-card-footer">
            <span class="code-card-reason">${p.applicable ? p.reason : p.notApplicableReason}</span>
            ${p.applicable ? `<button class="code-apply-btn" onclick="event.stopPropagation();SummaryScreen.applyPromo('${p.code}')">${isSel ? '✓ Applied' : 'Apply'}</button>` : ''}
          </div>
        </div>
      </div>`;
  },

  applyManualCode() {
    const val = document.getElementById('promo-code-input').value.trim().toUpperCase();
    const errEl = document.getElementById('promo-error');
    errEl.style.display = 'none';
    if (!val) return;

    const promo = PROMO_CODES.find(p => p.code === val);
    if (!promo) { errEl.textContent = `❌ "${val}" is not a valid promo code.`; errEl.style.display = 'block'; return; }
    if (!promo.applicable) { errEl.textContent = '❌ ' + promo.notApplicableReason?.replace('✗ ', ''); errEl.style.display = 'block'; return; }
    this.applyPromo(val);
  },

  applyPromo(code) {
    AppState.setPromo(code);
    this._updatePromoTrigger();
    this._renderPromoCards();
    this.closePromoSheet();
    this.render();
    UI.toast('✅ Promo code applied!');
  },

  removePromo() {
    AppState.setPromo(null);
    this._updatePromoTrigger();
    this.render();
  },

  _updatePromoTrigger() {
    const trig = document.getElementById('promo-trigger');
    const txt  = document.getElementById('promo-trigger-text');
    const bdg  = document.getElementById('promo-trigger-badge');
    const strip = document.getElementById('promo-applied-strip');
    const arw  = document.getElementById('promo-trigger-arrow');

    if (AppState.booking.promoCode) {
      trig?.classList.add('applied');
      if (txt) txt.textContent = AppState.booking.promoCode + ' applied';
      if (bdg) bdg.textContent = 'You save ₹' + AppState.booking.promoDiscount;
      if (strip) strip.classList.add('show');
      if (arw) { arw.textContent = '✓'; arw.style.color = 'var(--green)'; }
      _setText('promo-applied-name', AppState.booking.promoCode);
      _setText('promo-applied-desc', PROMO_CODES.find(p => p.code === AppState.booking.promoCode)?.title || '');
    } else {
      trig?.classList.remove('applied');
      if (txt) txt.textContent = 'Select promo code';
      if (strip) strip.classList.remove('show');
      if (arw) { arw.textContent = '›'; arw.style.color = 'var(--text-tertiary)'; }
    }
  },

  selectPayment(method) {
    AppState.booking.paymentMethod = method;
    document.querySelectorAll('.payment-opt').forEach(p => p.classList.remove('active'));
    document.getElementById('pay-' + method)?.classList.add('active');
  },

  async confirmAndPay() {
    const b = AppState.booking;
    const v = AppState.getSelectedVehicle();
    if (!v) { UI.toast('⚠️ Please select a vehicle'); return; }
    if (!b.centerId || !b.packageId) { UI.toast('⚠️ Missing booking details'); return; }

    const t = AppState.calcTotal();
    const btn = document.getElementById('confirm-pay-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Booking…'; }

    try {
      const r = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + (Auth.getToken() || ''),
        },
        body: JSON.stringify({
          center_id:       b.centerId,
          package_id:      b.packageId,
          slot_date:       _toIsoDate(b.date),
          slot_time:       b.slot,
          vehicle_plate:   v.plate,
          vehicle_model:   v.model,
          // Send promo_code so server can validate + compute discount itself.
          // app_discount/center_discount are kept as a fallback for when no code is sent.
          promo_code:      b.promoCode || null,
          app_discount:    t.appDiscount,
          center_discount: t.centerDiscount,
        }),
      });
      const j = await r.json();
      if (!r.ok || !j.success) throw new Error(j.error || 'Booking failed');

      // Sync confirmed state from server response so My Bookings + center-app stay in sync.
      AppState.confirmedBooking = {
        id:            j.data.booking_ref,
        centerId:      b.centerId,
        centerName:    b.centerName,
        packageName:   j.data.package_name,
        date:          b.date,
        slot:          j.data.slot_time,
        duration:      (j.data.duration_minutes || 30) + ' min',
        basePrice:     t.base,
        appDiscount:   t.appDiscount,
        centerDiscount: t.centerDiscount,
        collectAmount: t.collectAmount,
        totalPaid:     t.collectAmount,
        status:        'confirmed',
      };
      // Refresh history in the background so the new booking shows up there too.
      if (typeof UserData !== 'undefined') UserData.loadBookings();
      Router.go('confirmed');
    } catch (e) {
      console.error('Booking error:', e);
      UI.toast('❌ ' + (e.message || 'Could not place booking'));
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '✅ Confirm Booking →'; }
    }
  },
};

// Convert frontend date strings ("Today, 12 May", "13 May") to YYYY-MM-DD.
function _toIsoDate(label) {
  if (!label) return new Date().toISOString().slice(0, 10);
  const MONTHS = { Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11 };
  const m = String(label).match(/(\d{1,2})\s+([A-Za-z]{3})/);
  if (!m) return new Date().toISOString().slice(0, 10);
  const day  = parseInt(m[1], 10);
  const mon  = MONTHS[m[2]];
  const now  = new Date();
  let   year = now.getFullYear();
  // If the parsed month is earlier than this month, assume next year.
  if (mon < now.getMonth() || (mon === now.getMonth() && day < now.getDate() - 1)) year += 1;
  const d = new Date(year, mon, day);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// ============================================================
// VehiclePicker — bottom-sheet vehicle selector
// ============================================================

const VehiclePicker = {

  open() {
    this._renderList();
    document.getElementById('veh-overlay')?.classList.add('show');
  },

  close() {
    document.getElementById('veh-overlay')?.classList.remove('show');
  },

  select(vehicleId) {
    AppState.setVehicle(vehicleId);
    SummaryScreen._renderVehicleSection();
    this.close();
    UI.toast('✅ Vehicle selected');
  },

  _renderList() {
    const list = document.getElementById('veh-list');
    if (!list) return;
    const selected = AppState.getSelectedVehicle();
    list.innerHTML = SAVED_VEHICLES.map(v => {
      const isSel = selected && selected.id === v.id;
      return `
        <div class="veh-card ${isSel ? 'selected' : ''}" onclick="VehiclePicker.select('${v.id}')">
          <div class="veh-card-icon" style="background:${v.color}">${v.icon}</div>
          <div class="veh-card-body">
            <div class="veh-card-plate">${v.plate}</div>
            <div class="veh-card-model">${v.model} · ${v.colour}</div>
            ${v.isPrimary ? '<span class="veh-primary-badge">Primary</span>' : ''}
          </div>
          <div class="veh-card-radio">
            <div class="veh-radio-outer">${isSel ? '<div class="veh-radio-inner"></div>' : ''}</div>
          </div>
        </div>`;
    }).join('');
  },
};
