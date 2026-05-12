// ============================================================
// SparkWash — booking.js
// Confirmed screen, manage, modify, cancel, bookings list
// ============================================================

const BookingScreen = {

  renderBookings() {
    this._renderUpcoming();
    this._renderPast();
  },

  _renderUpcoming() {
    const el = document.getElementById('bklist-upcoming');
    if (!el) return;
    const b = AppState.confirmedBooking;
    if (!b || !b.id) {
      el.innerHTML = '<div style="padding:20px 14px;font-size:12px;color:var(--text-secondary);text-align:center">No upcoming bookings</div>';
      return;
    }
    const v = AppState.getSelectedVehicle();
    el.innerHTML = `
      <div class="booking-item">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px">
          <div style="font-size:12px;font-weight:700;color:var(--text-primary)">${b.centerName || '—'}</div>
          <div class="badge badge-upcoming">Upcoming</div>
        </div>
        <div style="font-size:10px;color:var(--text-secondary)" id="bklist-pkg">${b.date} · ${b.slot} · ${b.packageName || '—'}</div>
        <div style="font-size:10px;color:var(--text-secondary);margin-top:2px" id="bklist-meta">${b.id} · ₹${b.totalPaid} paid</div>
        <div style="font-size:10px;color:var(--text-secondary);margin-top:2px">${v ? v.plate + ' · ' + v.model : '—'}</div>
        <div class="action-btn-row">
          <div class="action-btn primary" onclick="Router.go('manage')">📍 Track</div>
          <div class="action-btn primary" onclick="BookingScreen.openModify();Router.go('manage')">✏️ Modify</div>
          <div class="action-btn danger" onclick="BookingScreen.cancelBooking()">✕ Cancel</div>
        </div>
      </div>`;
  },

  _renderPast() {
    const el = document.getElementById('bklist-past');
    if (!el) return;
    if (!PAST_BOOKINGS.length) {
      el.innerHTML = '<div style="padding:12px 14px;font-size:12px;color:var(--text-secondary)">No past bookings</div>';
      return;
    }
    const WASH_ICONS = { water:'💧', dry:'🧴', steam:'💨', d2d:'🚗' };
    el.innerHTML = PAST_BOOKINGS.map(b => {
      const isCompleted = b.status === 'completed';
      const stars = b.rating
        ? '★'.repeat(b.rating) + '☆'.repeat(5 - b.rating)
        : null;
      return `
        <div class="booking-item">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px">
            <div style="font-size:12px;font-weight:700;color:var(--text-primary)">${b.centerName}</div>
            <div class="badge ${isCompleted ? 'badge-completed' : 'badge-cancelled'}">${isCompleted ? 'Completed' : 'Cancelled'}</div>
          </div>
          <div style="font-size:10px;color:var(--text-secondary)">${b.date} · ${b.slot} · ${WASH_ICONS[b.washType] || ''} ${b.packageName}</div>
          <div style="font-size:10px;color:var(--text-secondary);margin-top:2px">${b.id}${isCompleted ? ' · ₹' + b.totalPaid + ' paid' : ' · Cancelled'}</div>
          <div style="font-size:10px;color:var(--text-secondary);margin-top:1px">${b.vehiclePlate} · ${b.vehicleModel}</div>
          ${stars ? `<div style="display:flex;align-items:center;gap:3px;margin-top:5px"><span style="font-size:13px;color:#f9a825">${stars}</span></div>` : ''}
          <div class="action-btn-row" style="margin-top:8px">
            <div class="action-btn primary" style="flex:1;background:var(--blue);color:#fff;border-color:var(--blue)"
                 onclick="BookingScreen.repeatBooking('${b.centerId}','${b.washType}','${b.packageId}','${b.vehicleId}')">
              🔁 Repeat this wash
            </div>
          </div>
        </div>`;
    }).join('');
  },

  repeatBooking(centerId, washType, packageId, vehicleId) {
    const center = CENTERS.find(c => c.id === centerId);
    if (!center) { UI.toast('⚠️ Center not available'); return; }
    if (!center.open) { UI.toast(`⚠️ ${center.name} is currently closed`); return; }

    AppState.booking.centerId   = center.id;
    AppState.booking.centerName = center.name;
    AppState.booking.vehicleId  = vehicleId;

    if (typeof DetailScreen !== 'undefined') DetailScreen.initRepeat(center, washType, packageId, vehicleId);
    Router.go('detail');
  },

  renderConfirmed() {
    // confirmedBooking is set by SummaryScreen.confirmAndPay() after the API
    // returns a real booking_ref. Only fall back to generating one if we got
    // here without going through that flow (e.g. demo / repeat-old).
    const confirmed = AppState.confirmedBooking && AppState.confirmedBooking.id
      ? AppState.confirmedBooking
      : AppState.confirmBooking();
    const v = AppState.getSelectedVehicle();
    const vehicleStr = v ? `${v.plate} · ${v.model}` : '—';
    const collectAmt = confirmed.collectAmount ?? confirmed.totalPaid;

    _setText('conf-booking-id',  confirmed.id);
    _setText('conf-center-name', confirmed.centerName || '—');
    _setText('conf-pkg-name',    confirmed.packageName || '—');
    _setText('conf-vehicle',     vehicleStr);
    _setText('conf-slot',        `${confirmed.date} · ${confirmed.slot}`);
    _setText('conf-duration',    confirmed.duration || '—');
    _setText('conf-amount-paid', `₹${collectAmt}`);

    // Sync manage screen
    _setText('manage-pkg',        confirmed.packageName || '—');
    _setText('manage-vehicle',    vehicleStr);
    _setText('manage-date',       confirmed.date);
    _setText('manage-time',       confirmed.slot);
    _setText('manage-paid',       '₹' + collectAmt + ' at center');
    _setText('manage-slot-label', confirmed.slot);

    // Sync bookings list
    _setText('bklist-pkg',  `${confirmed.date} · ${confirmed.slot} · ${confirmed.packageName}`);
    _setText('bklist-meta', `${confirmed.id} · ₹${collectAmt} to pay at center`);
  },

  // ── MODIFY SHEET ──

  openModify() {
    this._renderModifyDates();
    document.getElementById('modify-overlay')?.classList.add('show');
  },

  _renderModifyDates() {
    const container = document.getElementById('modify-date-chips');
    if (!container) return;
    const dates = AppState.getUpcomingDates(4);
    container.innerHTML = dates.map((d, i) =>
      `<div class="date-chip ${i === 0 ? 'active' : ''}"
            onclick="BookingScreen.selectModifyDate(this,'${d.value}')">${d.chipLabel}</div>`
    ).join('');
    AppState.ui.modifyDate = dates[0].value;
  },

  closeModify() {
    document.getElementById('modify-overlay')?.classList.remove('show');
  },

  selectModifyDate(el, label) {
    document.querySelectorAll('#modify-overlay .date-chip').forEach(c => c.classList.remove('active'));
    el.classList.add('active');
    AppState.ui.modifyDate = label;
  },

  selectModifySlot(el, time) {
    document.querySelectorAll('#modify-overlay .slot-chip:not(.full)').forEach(s => {
      s.style.background = '';
      s.style.color = '';
      s.style.fontWeight = '';
      s.style.borderColor = '';
    });
    el.style.background = 'var(--navy)';
    el.style.color = '#fff';
    el.style.fontWeight = '700';
    AppState.ui.modifySlot = time;
  },

  saveModify() {
    AppState.confirmedBooking.date = AppState.ui.modifyDate;
    AppState.confirmedBooking.slot = AppState.ui.modifySlot;
    _setText('manage-date', AppState.ui.modifyDate);
    _setText('manage-time', AppState.ui.modifySlot);
    _setText('manage-slot-label', AppState.ui.modifySlot);
    this.closeModify();
    UI.toast('✅ Booking updated!');
  },

  cancelBooking() {
    if (confirm('Cancel this booking?\nFull refund in 3–5 working days.')) {
      UI.toast('❌ Booking cancelled. Refund initiated.');
    }
  },

  // ── STAR RATING ──

  // Animates the inline star widget (if present) and persists the rating via API.
  // Called as rateBooking(stars, bookingRef). bookingRef may be omitted only when
  // there is exactly one completed booking — we'll pick the most recent then.
  async rateBooking(n, bookingRef) {
    for (let i = 1; i <= 5; i++) {
      const el = document.getElementById('star-' + i);
      if (el) { el.textContent = i <= n ? '★' : '☆'; el.style.color = i <= n ? '#f9a825' : ''; }
    }

    const ref = bookingRef
      || (PAST_BOOKINGS.find(b => b.status === 'completed' && !b.rating) || {}).ref;
    if (!ref) { UI.toast('⚠️ No booking to rate'); return; }

    try {
      const r = await fetch(`/api/bookings/${encodeURIComponent(ref)}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + (Auth.getToken() || ''),
        },
        body: JSON.stringify({ rating: n }),
      });
      const j = await r.json();
      if (!r.ok || !j.success) throw new Error(j.error || 'Save failed');
      UI.toast('✅ Thanks for rating!');
      if (typeof UserData !== 'undefined') await UserData.loadBookings();
      this.renderBookings();
    } catch (e) {
      UI.toast('❌ ' + e.message);
    }
  },
};
