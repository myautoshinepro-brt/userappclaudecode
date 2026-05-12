// ============================================================
// SparkWash Admin App — components.js
// Reusable UI: Privacy (mask/reveal) + Collapsible sections + BookingDetail screen
// ============================================================

// ── PRIVACY ─────────────────────────────────────────────────
// Sensitive fields render masked by default. A 👁 button toggles reveal.
// Toggle state lives in localStorage so reveals persist while the page is open
// but are not exposed across pages.
const Privacy = (() => {
  const SHOWN = new Set();
  const STORE_KEY = 'sw_admin_privacy_shown';
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORE_KEY) || '[]');
    saved.forEach(id => SHOWN.add(id));
  } catch { /* ignore */ }

  function _persist() {
    try { sessionStorage.setItem(STORE_KEY, JSON.stringify([...SHOWN])); } catch { /* ignore */ }
  }

  function _esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // Mask a phone: keep last 2 digits, dot out the rest. "98765 43210" → "•••••• ••10".
  function _maskPhone(raw) {
    const digits = String(raw || '').replace(/\D/g, '');
    if (digits.length < 4) return '••••';
    const last = digits.slice(-2);
    return '•••• ••' + last;
  }

  function _maskEmail(raw) {
    const s = String(raw || '');
    const at = s.indexOf('@');
    if (at < 1) return s ? '••••' : '';
    const head = s[0] + '••••';
    return head + s.slice(at);
  }

  // Render an inline span with the masked value + a toggle button. The `id` must
  // be unique on the page (use record id + field name).
  function _render(id, value, type) {
    const safeId = String(id).replace(/[^A-Za-z0-9_-]/g, '_');
    const shown  = SHOWN.has(safeId);
    const masked = type === 'email' ? _maskEmail(value) : _maskPhone(value);
    const display = shown ? value : masked;
    const btn = `<button type="button"
      onclick="event.stopPropagation();Privacy.toggle('${safeId}','${_esc(value)}','${type}',this)"
      style="background:none;border:none;color:var(--primary);cursor:pointer;font-size:11px;padding:0 0 0 6px;font-weight:600">
      ${shown ? '🙈 Hide' : '👁 View'}
    </button>`;
    return `<span data-priv="${safeId}" data-priv-value="${_esc(value)}" data-priv-type="${type}">${_esc(display)}${value ? btn : ''}</span>`;
  }

  function phone(value, id) { return _render(id, value, 'phone'); }
  function email(value, id) { return _render(id, value, 'email'); }

  function toggle(safeId, _value, type, btn) {
    if (SHOWN.has(safeId)) SHOWN.delete(safeId);
    else SHOWN.add(safeId);
    _persist();
    // Find every node tagged with this id (list + detail might both render it) and
    // re-render in place so the rest of the page doesn't repaint.
    document.querySelectorAll('[data-priv="' + safeId + '"]').forEach(span => {
      const raw = span.getAttribute('data-priv-value') || '';
      const t   = span.getAttribute('data-priv-type') || 'phone';
      span.outerHTML = _render(safeId, raw, t);
    });
  }

  return { phone, email, toggle };
})();


// ── COLLAPSIBLE SECTION ─────────────────────────────────────
// Generates a header + body with a chevron. State persisted per id so the
// Super Admin doesn't have to re-collapse sections every visit.
const Collapsible = (() => {
  const KEY = 'sw_admin_collapsed';
  let state = {};
  try { state = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { /* ignore */ }

  function _save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ } }

  // Returns wrapper HTML. innerHTML is the section body. id is unique key.
  function section(id, title, innerHTML, opts = {}) {
    const defaultOpen = opts.defaultOpen !== false;
    if (state[id] == null) state[id] = defaultOpen;
    const open  = !!state[id];
    return `
      <div class="coll-section" id="coll-${id}" style="border-radius:12px;background:#fff;margin:0 13px 10px;overflow:hidden;border:.5px solid var(--border)">
        <div onclick="Collapsible.toggle('${id}')"
             style="display:flex;align-items:center;gap:10px;padding:12px 14px;cursor:pointer;user-select:none;background:#fafafa">
          <div style="flex:1;font-size:12px;font-weight:800;color:var(--text)">${title}</div>
          ${opts.right ? `<div style="font-size:11px;color:var(--muted);font-weight:600">${opts.right}</div>` : ''}
          <span class="coll-chev" style="font-size:11px;color:var(--muted);transition:transform .15s;${open ? 'transform:rotate(180deg)' : ''}">▾</span>
        </div>
        <div class="coll-body" style="${open ? '' : 'display:none'}">${innerHTML}</div>
      </div>`;
  }

  function toggle(id) {
    state[id] = !state[id];
    _save();
    const el = document.getElementById('coll-' + id);
    if (!el) return;
    const body = el.querySelector('.coll-body');
    const chev = el.querySelector('.coll-chev');
    if (state[id]) {
      if (body) body.style.display = '';
      if (chev) chev.style.transform = 'rotate(180deg)';
    } else {
      if (body) body.style.display = 'none';
      if (chev) chev.style.transform = '';
    }
  }

  return { section, toggle };
})();


// ── BOOKING DETAIL SCREEN ───────────────────────────────────
const BookingDetail = {
  _booking: null,
  _center:  null,
  _history: [],

  async render() {
    const ref = AppState.selectedBookingId;
    if (!ref) { Router.go('bookings'); return; }

    // Find the row from the bookings list (gives us _dbId for the API calls).
    const fromList = ALL_BOOKINGS.find(b => b.id === ref);
    if (!fromList) {
      setHtml('bd-body', '<div style="padding:40px;text-align:center;color:var(--muted);font-size:12px">Booking not found in list. Open Bookings tab first.</div>');
      return;
    }

    setText('bd-title', ref);
    setText('bd-sub',   fromList.customer || '');
    setHtml('bd-body',  '<div style="padding:40px;text-align:center;color:var(--muted);font-size:12px">Loading booking details…</div>');

    try {
      const [detailRes, historyRes] = await Promise.all([
        fetch(`${CENTER_APP_URL}/api/admin/bookings/${fromList._dbId}`,         { headers: { 'x-admin-key': ADMIN_API_KEY } }),
        fetch(`${CENTER_APP_URL}/api/admin/bookings/${fromList._dbId}/history`, { headers: { 'x-admin-key': ADMIN_API_KEY } }),
      ]);
      const j1 = await detailRes.json();
      const j2 = await historyRes.json();
      if (!detailRes.ok || !j1.success) throw new Error(j1.error || 'fetch failed');
      this._booking = j1.data;
      this._center  = j1.center;
      this._history = j2.success ? (j2.data || []) : [];
      this._paint(fromList);
    } catch (e) {
      setHtml('bd-body', `<div style="padding:40px;text-align:center;color:var(--red);font-size:12px">Could not load booking: ${e.message}</div>`);
    }
  },

  _paint(listRow) {
    const b  = this._booking;
    const c  = this._center;
    const sm = STATUS_META[b.status] || { label: b.status, cls: '', icon: '•' };
    const wl = WASH_LABELS[b.wash_type] || { label: b.wash_type, bg: '#eee', color: '#444' };
    const pid = 'bk-' + b.id;

    const collected = b.package_price - (b.app_discount || 0) - (b.center_discount || 0);

    const summary = `
      <div style="padding:14px 16px;background:#fff">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px">
          <div>
            <div style="font-size:11px;color:var(--muted);font-weight:600">Booking ref</div>
            <div style="font-size:18px;font-weight:900;color:var(--text)">${b.booking_ref}</div>
          </div>
          <span class="badge ${sm.cls}" style="padding:5px 12px">${sm.icon} ${sm.label}</span>
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">
          <span class="badge" style="background:${wl.bg};color:${wl.color}">${wl.label}</span>
          ${b.rating ? `<span style="font-size:11px;color:var(--gold)">${'★'.repeat(b.rating)}${'☆'.repeat(5-b.rating)}</span>` : ''}
          ${b.payment_collected ? '<span class="badge b-done">💵 Paid</span>' : ''}
        </div>
        ${this._kv('Package', b.package_name)}
        ${this._kv('Center',  c ? c.name : '#' + b.center_id)}
        ${this._kv('Date',    b.slot_date)}
        ${this._kv('Slot',    b.slot_time)}
        ${this._kv('Duration', `${b.duration_minutes || 30} min`)}
      </div>`;

    const customer = `
      <div style="padding:12px 16px">
        ${this._kv('Name', b.customer_name)}
        ${this._kv('Phone', Privacy.phone(b.customer_phone, pid + '-ph'), true)}
        ${b.customer_email ? this._kv('Email', Privacy.email(b.customer_email, pid + '-em'), true) : ''}
      </div>`;

    const vehicle = `
      <div style="padding:12px 16px">
        ${this._kv('Plate',  b.vehicle_plate || '—')}
        ${this._kv('Model',  b.vehicle_model || '—')}
      </div>`;

    const pricing = `
      <div style="padding:12px 16px">
        ${this._kv('Package price', '₹' + b.package_price)}
        ${b.app_discount    ? this._kv('SparkWash discount', '-₹' + b.app_discount)    : ''}
        ${b.center_discount ? this._kv('Center discount',    '-₹' + b.center_discount) : ''}
        <div style="border-top:.5px solid var(--border);padding-top:8px;margin-top:8px;display:flex;justify-content:space-between">
          <span style="font-size:13px;font-weight:800">Customer pays</span>
          <span style="font-size:14px;font-weight:900;color:var(--primary)">₹${collected}</span>
        </div>
      </div>`;

    const review = b.review_comment ? `
      <div style="padding:12px 16px">
        <div style="font-size:11px;color:var(--muted);margin-bottom:4px">⭐ ${b.rating || '—'} stars</div>
        <div style="font-size:12px;color:var(--text);line-height:1.5">${this._esc(b.review_comment)}</div>
        ${b.review_reply ? `<div style="margin-top:8px;padding:8px 10px;background:var(--primary-light);border-radius:8px;font-size:11px;color:var(--text)"><b>Center reply:</b> ${this._esc(b.review_reply)}</div>` : ''}
      </div>` : '';

    const history = `
      <div style="padding:8px 16px 14px">
        ${this._history.length === 0
          ? '<div style="font-size:11px;color:var(--muted);text-align:center;padding:14px">No history yet</div>'
          : this._history.slice().reverse().map((h, idx) => {
              const isCurrent = idx === 0;
              return `
                <div style="display:flex;gap:10px;padding:8px 0;${idx > 0 ? 'border-top:.5px dashed var(--border)' : ''}">
                  <div style="width:28px;flex-shrink:0;text-align:center">
                    <div style="font-size:13px">${this._actorIcon(h.changed_by)}</div>
                  </div>
                  <div style="flex:1;min-width:0">
                    <div class="flex-c gap6" style="margin-bottom:2px">
                      <span class="bold text-xs">${this._statusLabel(h.from_status, h.to_status)}</span>
                      ${isCurrent ? '<span class="badge b-conf" style="font-size:9px">Current</span>' : ''}
                    </div>
                    ${h.notes ? `<div style="font-size:10px;color:var(--muted);line-height:1.4">${this._esc(h.notes)}</div>` : ''}
                    <div style="font-size:9px;color:var(--faint);margin-top:2px">
                      ${h.changed_by_name ? this._esc(h.changed_by_name) + ' · ' : ''}${this._fmtTime(h.created_at)} · via ${h.changed_by}
                    </div>
                  </div>
                </div>`;
            }).join('')}
      </div>`;

    const actions = `
      <div style="padding:8px 16px 14px;display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <button class="btn btn-sm btn-primary" onclick="AdminBookings.openEdit('${b.booking_ref}')">✏️ Edit booking</button>
        <button class="btn btn-sm btn-ghost"   onclick="AdminBookings.openChatWithCustomer('${b.booking_ref}')">💬 Open chat</button>
      </div>`;

    setHtml('bd-body',
      Collapsible.section('bd-summary', '📋 Booking summary', summary, { defaultOpen: true }) +
      Collapsible.section('bd-customer','👤 Customer (private)', customer, { defaultOpen: false, right: 'Click 👁 to reveal' }) +
      Collapsible.section('bd-vehicle', '🚗 Vehicle', vehicle, { defaultOpen: true }) +
      Collapsible.section('bd-pricing', '💰 Pricing', pricing, { defaultOpen: true }) +
      (review   ? Collapsible.section('bd-review',  '⭐ Customer review', review,  { defaultOpen: true }) : '') +
      Collapsible.section('bd-history', '📜 History · ' + this._history.length + ' entr' + (this._history.length === 1 ? 'y' : 'ies'), history, { defaultOpen: true }) +
      `<div style="padding:0 0 6px">${actions}</div>`
    );

    setText('bd-sub', b.customer_name + ' · ' + b.slot_date);
  },

  _kv(label, value, isHtml) {
    return `
      <div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:.5px dashed var(--border)">
        <span style="font-size:11px;color:var(--muted)">${label}</span>
        <span style="font-size:12px;color:var(--text);font-weight:600;text-align:right">${isHtml ? value : this._esc(value)}</span>
      </div>`;
  },

  _esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  },

  _actorIcon(by) {
    return { customer: '👤', admin: '🛡️', center: '🏢', system: '⚙️' }[by] || '•';
  },

  _statusLabel(from, to) {
    const meta = (s) => (STATUS_META[s] || {}).label || s;
    if (!from) return meta(to);
    if (from === to) return 'Updated · ' + meta(to);
    return `${meta(from)} → ${meta(to)}`;
  },

  _fmtTime(iso) {
    if (!iso) return '';
    const d = new Date(String(iso).replace(' ', 'T') + 'Z');
    if (isNaN(d)) return iso;
    return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true });
  },
};
