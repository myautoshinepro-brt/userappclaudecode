// SparkWash Center App — bookings.js

const BookingsScreen = {
  async render() {
    this._renderFilterTabs();
    await this._loadBookings();
  },

  _renderFilterTabs() {
    const el = document.getElementById('bookings-filter');
    if (!el) return;
    const filters = [
      { key: 'all',       label: 'All' },
      { key: 'new',       label: '🆕 New' },
      { key: 'confirmed', label: '✅ Confirmed' },
      { key: 'arrived',   label: '🚗 Arrived' },
      { key: 'washing',   label: '🔄 Washing' },
      { key: 'done',      label: '✨ Done' },
    ];
    el.innerHTML = `<div class="filter-tabs" style="overflow-x:auto;gap:4px">` +
      filters.map(f => `
        <div class="filter-tab ${AppState.activeFilter === f.key ? 'active' : ''}"
             onclick="BookingsScreen.setFilter('${f.key}')">
          ${f.label}
        </div>
      `).join('') + `</div>`;
  },

  setFilter(key) {
    AppState.activeFilter = key;
    this._renderFilterTabs();
    this._loadBookings();
  },

  async _loadBookings() {
    const el = document.getElementById('bookings-list');
    if (!el) return;
    el.innerHTML = '<div class="flex-center" style="padding:32px"><span class="spinner"></span></div>';

    try {
      const status = AppState.activeFilter === 'all' ? '' : `&status=${AppState.activeFilter}`;
      const res    = await fetch(`/api/bookings?date=${AppState.currentDate}${status}`, {
        headers: { Authorization: `Bearer ${AppState.token}` },
      });
      const data = await res.json();
      if (!res.ok) { el.innerHTML = '<div class="empty-state"><div class="empty-ico">⚠️</div><div class="empty-title">Failed to load</div></div>'; return; }

      AppState.bookings = data.bookings;
      this._renderList(data.bookings);
    } catch {
      el.innerHTML = '<div class="empty-state"><div class="empty-ico">⚠️</div><div class="empty-title">Network error</div></div>';
    }
  },

  _renderList(bookings) {
    const el = document.getElementById('bookings-list');
    if (!el) return;
    if (bookings.length === 0) {
      el.innerHTML = `
        <div class="empty-state">
          <div class="empty-ico">📋</div>
          <div class="empty-title">No bookings</div>
          <div class="empty-sub">No ${AppState.activeFilter === 'all' ? '' : AppState.activeFilter + ' '}bookings today</div>
        </div>`;
      return;
    }
    el.innerHTML = bookings.map(b => this._bookingCard(b)).join('');
  },

  _bookingCard(b) {
    const m       = STATUS_META[b.status] || {};
    const actions = this._actionButtons(b);
    return `
      <div class="booking-card" onclick="BookingsScreen.openDetail(${b.id})">
        <div class="booking-card-top">
          <div>
            <div class="booking-customer">${b.customer_name}</div>
            <div class="booking-ref">${b.booking_ref}</div>
          </div>
          ${UI.badge(b.status)}
        </div>
        <div class="booking-info-row"><span class="ico">${UI.washIcon(b.wash_type)}</span>${b.package_name}</div>
        <div class="booking-info-row"><span class="ico">🚗</span>${b.vehicle_plate}${b.vehicle_model ? ' · ' + b.vehicle_model : ''}</div>
        <div class="booking-info-row"><span class="ico">🕐</span>${b.slot_time} &nbsp;·&nbsp; <span class="ico">📱</span>${b.customer_phone}</div>
        <div class="booking-info-row flex-between">
          <span><span class="ico">💰</span><strong>${UI.formatPrice(b.package_price)}</strong></span>
          ${b.rating ? `<span style="color:var(--gold)">★ ${b.rating}</span>` : ''}
        </div>
        ${actions}
      </div>`;
  },

  _actionButtons(b) {
    const m = STATUS_META[b.status];
    if (!m || (!m.next && !m.reject)) return '';
    let html = '<div class="booking-actions" onclick="event.stopPropagation()">';
    if (m.reject) {
      html += `<button class="btn btn-red btn-sm" onclick="BookingsScreen.updateStatus(${b.id},'cancelled')">✕ Reject</button>`;
    }
    if (m.next) {
      const btnClass = m.next === 'confirmed' ? 'btn-green' : m.next === 'done' ? 'btn-green' : 'btn-primary';
      html += `<button class="btn ${btnClass} btn-sm" onclick="BookingsScreen.updateStatus(${b.id},'${m.next}')">${m.nextLabel}</button>`;
    }
    html += '</div>';
    return html;
  },

  openDetail(id) {
    const b = AppState.bookings.find(x => x.id === id);
    if (!b) return;
    AppState.selectedBooking = b;
    this._renderDetail(b);
    Router.go('booking-detail');
  },

  _collectAmount(b) {
    const appDisc    = b.app_discount    || 0;
    const ctrDisc    = b.center_discount || 0;
    return Math.max(0, (b.package_price || 0) - appDisc - ctrDisc);
  },

  _renderDetail(b) {
    const el = document.getElementById('booking-detail-body');
    if (!el) return;

    const actions    = this._actionButtons(b);
    const appDisc    = b.app_discount    || 0;
    const ctrDisc    = b.center_discount || 0;
    const collectAmt = this._collectAmount(b);
    const settleAmt  = appDisc; // SparkWash settles only app discount

    document.getElementById('booking-detail-title').textContent = b.customer_name;
    document.getElementById('booking-detail-sub').textContent   = b.booking_ref;

    // Price breakdown rows
    const discRows = `
      ${appDisc > 0 ? `
        <div class="booking-detail-row">
          <span class="bd-ico">🎁</span>
          <div><div class="bd-label">SparkWash offer</div><div class="bd-value" style="color:var(--green)">-${UI.formatPrice(appDisc)}</div></div>
        </div>` : ''}
      ${ctrDisc > 0 ? `
        <div class="booking-detail-row">
          <span class="bd-ico">🏢</span>
          <div><div class="bd-label">Your offer</div><div class="bd-value" style="color:var(--blue)">-${UI.formatPrice(ctrDisc)}</div></div>
        </div>` : ''}`;

    // Settlement note (only when SparkWash discount applied)
    const settleNote = settleAmt > 0 ? `
      <div style="background:#f0fdf4;border-radius:10px;padding:10px 12px;margin:10px 14px 0;font-size:11px;color:var(--green)">
        ✅ SparkWash will settle <strong>${UI.formatPrice(settleAmt)}</strong> to you within 24 hrs of wash completion
      </div>` : '';

    // Payment status badge
    const payBadge = b.payment_collected
      ? `<div style="background:#dcfce7;border-radius:10px;padding:10px 12px;margin:10px 14px 0;display:flex;align-items:center;gap:8px">
           <span style="font-size:16px">💰</span>
           <div><div style="font-weight:700;font-size:12px;color:var(--green)">Payment Collected ✓</div>
           <div style="font-size:10px;color:#166534">₹${collectAmt} received from customer</div></div>
         </div>`
      : '';

    el.innerHTML = `
      <div style="padding:14px;text-align:center">${UI.badge(b.status)}</div>
      <div class="card card-pad" style="margin:0 14px 10px">
        <div class="booking-detail-row">
          <span class="bd-ico">${UI.washIcon(b.wash_type)}</span>
          <div><div class="bd-label">Package</div><div class="bd-value">${b.package_name} · ${UI.washLabel(b.wash_type)}</div></div>
        </div>
        <div class="booking-detail-row">
          <span class="bd-ico">🚗</span>
          <div><div class="bd-label">Vehicle</div><div class="bd-value">${b.vehicle_plate}${b.vehicle_model ? ' · ' + b.vehicle_model : ''}</div></div>
        </div>
        <div class="booking-detail-row">
          <span class="bd-ico">🕐</span>
          <div><div class="bd-label">Slot</div><div class="bd-value">${b.slot_time} · ${UI.formatDate(b.slot_date)}</div></div>
        </div>
        <div class="booking-detail-row">
          <span class="bd-ico">📱</span>
          <div>
            <div class="bd-label">Customer</div>
            <div class="bd-value">${b.customer_name} · ${b.customer_phone}</div>
            ${b.customer_email
              ? `<div style="font-size:10px;color:var(--green);margin-top:2px">📧 ${b.customer_email} <span style="color:var(--muted)">(summary will be emailed on completion)</span></div>`
              : `<div style="font-size:10px;color:var(--muted);margin-top:2px">📧 No email — <span style="color:var(--primary);cursor:pointer;text-decoration:underline" onclick="BookingsScreen.editEmail(${b.id})">add email for receipt</span></div>`}
          </div>
        </div>
        <!-- Price breakdown -->
        <div class="booking-detail-row">
          <span class="bd-ico">💰</span>
          <div><div class="bd-label">Package price</div><div class="bd-value">${UI.formatPrice(b.package_price)}</div></div>
        </div>
        ${discRows}
        <!-- Collect amount — always shown prominently -->
        <div style="background:#f0f9ff;border-radius:10px;padding:10px 12px;margin-top:8px;display:flex;align-items:center;justify-content:space-between">
          <div>
            <div style="font-size:11px;font-weight:700;color:#0369a1">💵 Collect from customer</div>
            ${appDisc > 0 || ctrDisc > 0 ? `<div style="font-size:10px;color:#0369a1;margin-top:1px">After discounts applied</div>` : ''}
          </div>
          <div style="font-size:20px;font-weight:900;color:#0369a1">${UI.formatPrice(collectAmt)}</div>
        </div>
        ${b.rating ? `<div class="booking-detail-row" style="margin-top:8px"><span class="bd-ico">⭐</span><div><div class="bd-label">Rating</div><div class="bd-value">${'★'.repeat(b.rating)}${'☆'.repeat(5-b.rating)}</div></div></div>` : ''}
      </div>
      ${settleNote}
      ${payBadge}
      ${this._photoSection(b)}
      <div style="padding:10px 14px 16px">${actions.replace(/btn-sm/g,'')}</div>
    `;
  },

  async editEmail(bookingId) {
    const email = prompt('Enter customer email for order summary:');
    if (email === null) return;
    const trimmed = email.trim().toLowerCase();
    if (trimmed && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      UI.toast('Enter a valid email address');
      return;
    }
    try {
      const res  = await fetch(`/api/bookings/${bookingId}/email`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${AppState.token}` },
        body:    JSON.stringify({ email: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) { UI.toast(data.error || 'Failed to save'); return; }
      const b = AppState.bookings.find(x => x.id === bookingId) || AppState.selectedBooking;
      if (b) b.customer_email = trimmed;
      if (AppState.selectedBooking?.id === bookingId) {
        AppState.selectedBooking.customer_email = trimmed;
        this._renderDetail(AppState.selectedBooking);
      }
      UI.toast(trimmed ? `📧 Email saved` : '📧 Email removed');
    } catch { UI.toast('Network error'); }
  },

  _photoSection(b) {
    const canPhoto = ['arrived', 'washing', 'done'].includes(b.status);
    if (!canPhoto) return '';

    const thumb = (dataUrl, label) => dataUrl
      ? `<div style="position:relative;display:inline-block">
           <img src="${dataUrl}" style="width:100%;height:90px;object-fit:cover;border-radius:8px;display:block">
           <div style="position:absolute;bottom:4px;left:4px;background:rgba(0,0,0,.55);color:#fff;font-size:9px;padding:2px 6px;border-radius:6px">${label}</div>
         </div>`
      : `<div style="height:90px;border-radius:8px;border:1.5px dashed var(--border2);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;cursor:pointer;color:var(--muted)" onclick="BookingsScreen.uploadPhoto(${b.id},'${label.toLowerCase().split(' ')[0]}')">
           <span style="font-size:20px">📷</span>
           <span style="font-size:10px">${label}</span>
         </div>`;

    return `
      <div style="margin:0 14px 10px">
        <div style="font-size:11px;font-weight:700;color:var(--muted);margin-bottom:6px">📷 WASH PHOTOS</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          ${thumb(b.photo_before, 'Before')}
          ${thumb(b.photo_after,  b.status === 'done' ? 'After' : 'After (after wash)')}
        </div>
        ${b.status !== 'done' ? `
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:6px">
            <button class="btn btn-sm btn-ghost" style="font-size:11px" onclick="BookingsScreen.uploadPhoto(${b.id},'before')">📷 Before</button>
            <button class="btn btn-sm btn-ghost" style="font-size:11px" onclick="BookingsScreen.uploadPhoto(${b.id},'after')">📷 After</button>
          </div>` : ''}
      </div>`;
  },

  uploadPhoto(bookingId, type) {
    const input = document.createElement('input');
    input.type   = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const dataUrl = ev.target.result;
        try {
          const res  = await fetch(`/api/bookings/${bookingId}/photo`, {
            method:  'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${AppState.token}` },
            body:    JSON.stringify({ type, data: dataUrl }),
          });
          const data = await res.json();
          if (!res.ok) { UI.toast(data.error || 'Failed to save photo'); return; }
          // Update local booking state
          const b = AppState.bookings.find(x => x.id === bookingId) || AppState.selectedBooking;
          if (b) b[`photo_${type}`] = dataUrl;
          if (AppState.selectedBooking?.id === bookingId) {
            AppState.selectedBooking[`photo_${type}`] = dataUrl;
            this._renderDetail(AppState.selectedBooking);
          }
          UI.toast(`✅ ${type === 'before' ? 'Before' : 'After'} photo saved`);
        } catch { UI.toast('Network error'); }
      };
      reader.readAsDataURL(file);
    };
    input.click();
  },

  async updateStatus(id, status) {
    const b = AppState.bookings.find(x => x.id === id) || AppState.selectedBooking;

    // Intercept "done" — confirm collection first
    if (status === 'done' && b) {
      const collectAmt = this._collectAmount(b);
      const confirmed  = confirm(
        `Confirm wash completed for ${b.customer_name}?\n\n` +
        `💵 Collect ₹${collectAmt} from customer now.\n\n` +
        `Tap OK to mark as Done & payment collected.`
      );
      if (!confirmed) return;
    }

    try {
      const res  = await fetch(`/api/bookings/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${AppState.token}` },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) { UI.toast(data.error || 'Failed to update'); return; }

      if (status === 'done') {
        const collectAmt = b ? this._collectAmount(b) : 0;
        UI.toast(`✅ Wash done · ₹${collectAmt} collected`);
      } else {
        UI.toast(status === 'cancelled' ? '❌ Booking rejected' : `✅ ${STATUS_META[status]?.label}`);
      }

      // Update local state
      const idx = AppState.bookings.findIndex(x => x.id === id);
      if (idx !== -1) {
        AppState.bookings[idx].status = status;
        if (status === 'done') AppState.bookings[idx].payment_collected = 1;
      }

      if (AppState.ui.currentScreen === 'booking-detail') Router.back();
      await this._loadBookings();
    } catch {
      UI.toast('Network error');
    }
  },
};
