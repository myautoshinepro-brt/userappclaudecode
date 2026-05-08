// SparkWash Center App — reviews.js
// Customer Reviews screen: avg rating hero, distribution chart,
// filter chips, review cards with inline reply composer.

const ReviewsScreen = {
  _data:         null,   // { stats, reviews }
  _filter:       'all',  // 'all' | '5'..'1' | 'replied' | 'unreplied' | 'commented'
  _replyBooking: null,   // { id, customerName, rating } currently composing

  async render() {
    this._filter = 'all';
    await this._load();
  },

  async _load() {
    const body = document.getElementById('reviews-body');
    if (!body) return;
    body.innerHTML = '<div class="flex-center" style="padding:48px"><span class="spinner"></span></div>';

    try {
      const res  = await fetch('/api/reviews', { headers: { Authorization: `Bearer ${AppState.token}` } });
      const data = await res.json();
      if (!res.ok) { this._renderError(data.error || 'Failed to load reviews'); return; }
      this._data = data;
      this._renderAll();
    } catch {
      this._renderError('Network error — is the server running?');
    }
  },

  _renderAll() {
    this._renderFilterBar();
    this._renderBody();
    const st = this._data.stats;
    const sub = document.getElementById('reviews-subtitle');
    if (sub) sub.textContent = st?.total ? `${st.avg_rating} ★ · ${st.total} review${st.total !== 1 ? 's' : ''}` : 'No reviews yet';
  },

  // ── Filter bar ────────────────────────────────────────────────

  _renderFilterBar() {
    const bar = document.getElementById('reviews-filter-bar');
    if (!bar) return;
    const st  = this._data?.stats || {};
    const opts = [
      { key: 'all',       label: `All  ${st.total ?? 0}` },
      { key: '5',         label: `5★  ${st.r5 ?? 0}` },
      { key: '4',         label: `4★  ${st.r4 ?? 0}` },
      { key: '3',         label: `3★  ${st.r3 ?? 0}` },
      { key: 'unreplied', label: `Unreplied  ${(st.total ?? 0) - (st.replied ?? 0)}` },
      { key: 'replied',   label: `Replied  ${st.replied ?? 0}` },
    ];
    bar.innerHTML = opts.map(o => {
      const active = this._filter === o.key;
      return `<div onclick="ReviewsScreen.setFilter('${o.key}')"
                   style="flex-shrink:0;padding:6px 13px;border-radius:18px;border:1.5px solid ${active ? 'var(--navy)' : 'var(--border-medium)'};background:${active ? '#e3f2fd' : '#fff'};color:${active ? 'var(--navy)' : 'var(--text-primary)'};font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap">${o.label}</div>`;
    }).join('');
  },

  setFilter(f) {
    this._filter = f;
    this._renderFilterBar();
    this._renderBody();
  },

  // ── Body ──────────────────────────────────────────────────────

  _renderBody() {
    const body = document.getElementById('reviews-body');
    if (!body) return;
    const { stats, reviews } = this._data;

    const filtered = this._applyFilter(reviews);

    body.innerHTML =
      this._heroHtml(stats) +
      (filtered.length === 0 ? this._emptyHtml() : filtered.map(r => this._cardHtml(r)).join('')) +
      '<div style="height:16px"></div>';
  },

  _applyFilter(reviews) {
    switch (this._filter) {
      case '5': case '4': case '3': case '2': case '1':
        return reviews.filter(r => r.rating === parseInt(this._filter));
      case 'replied':   return reviews.filter(r => r.review_reply);
      case 'unreplied': return reviews.filter(r => !r.review_reply);
      default:          return reviews;
    }
  },

  // ── Hero stats ────────────────────────────────────────────────

  _heroHtml(st) {
    if (!st || !st.total) return '';
    const avg   = parseFloat(st.avg_rating) || 0;
    const full  = Math.floor(avg);
    const half  = avg - full >= 0.5;
    const stars = '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(5 - full - (half ? 1 : 0));

    const distRows = [5, 4, 3, 2, 1].map(n => {
      const count = st[`r${n}`] || 0;
      const pct   = st.total > 0 ? Math.round((count / st.total) * 100) : 0;
      return `
        <div style="display:flex;align-items:center;gap:7px;margin-bottom:5px">
          <div style="font-size:11px;color:var(--text-secondary);width:14px;text-align:right">${n}</div>
          <div style="font-size:10px;color:#f9a825">★</div>
          <div style="flex:1;height:7px;background:#f1f5f9;border-radius:4px;overflow:hidden">
            <div style="width:${pct}%;height:100%;background:${n >= 4 ? '#22c55e' : n === 3 ? '#f59e0b' : '#ef4444'};border-radius:4px;transition:width .4s"></div>
          </div>
          <div style="font-size:11px;color:var(--text-tertiary);width:22px;text-align:right">${count}</div>
        </div>`;
    }).join('');

    const repliedPct = st.total > 0 ? Math.round((st.replied / st.total) * 100) : 0;

    return `
      <div style="margin:14px 14px 10px;padding:18px;border-radius:var(--radius-md);background:linear-gradient(135deg,#1e40af 0%,#1a73e8 100%);color:#fff">
        <div style="display:flex;align-items:center;gap:18px">
          <div style="text-align:center">
            <div style="font-size:42px;font-weight:900;line-height:1">${avg.toFixed(1)}</div>
            <div style="font-size:18px;letter-spacing:2px;margin-top:3px;color:#fde68a">${stars}</div>
            <div style="font-size:10px;opacity:.8;margin-top:4px">${st.total} review${st.total !== 1 ? 's' : ''}</div>
          </div>
          <div style="flex:1">${distRows}</div>
        </div>
        <div style="margin-top:12px;padding-top:12px;border-top:1px solid rgba(255,255,255,.2);display:flex;gap:16px">
          <div style="flex:1;text-align:center">
            <div style="font-size:17px;font-weight:800">${st.replied}</div>
            <div style="font-size:10px;opacity:.8">Replied</div>
          </div>
          <div style="width:1px;background:rgba(255,255,255,.2)"></div>
          <div style="flex:1;text-align:center">
            <div style="font-size:17px;font-weight:800">${(st.total || 0) - (st.replied || 0)}</div>
            <div style="font-size:10px;opacity:.8">Awaiting reply</div>
          </div>
          <div style="width:1px;background:rgba(255,255,255,.2)"></div>
          <div style="flex:1;text-align:center">
            <div style="font-size:17px;font-weight:800">${repliedPct}%</div>
            <div style="font-size:10px;opacity:.8">Response rate</div>
          </div>
        </div>
      </div>`;
  },

  // ── Review card ───────────────────────────────────────────────

  _cardHtml(r) {
    const stars  = '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating);
    const starColor = r.rating >= 4 ? '#16a34a' : r.rating === 3 ? '#d97706' : '#dc2626';
    const initials = r.customer_name.trim().split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
    const avatarBg = ['#3b82f6','#8b5cf6','#ec4899','#14b8a6','#f59e0b','#10b981'][r.id % 6];

    const dt   = new Date(r.slot_date + 'T00:00:00');
    const M    = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const date = `${dt.getDate()} ${M[dt.getMonth()]}`;

    const commentHtml = r.review_comment
      ? `<div style="margin-top:10px;font-size:12px;color:var(--text-primary);line-height:1.55;background:#f8fafc;border-left:3px solid #94a3b8;padding:8px 10px;border-radius:0 6px 6px 0">"${this._esc(r.review_comment)}"</div>`
      : '';

    const replyHtml = r.review_reply
      ? `<div style="margin-top:10px;background:#eff6ff;border-radius:8px;padding:10px 12px">
           <div style="font-size:10px;font-weight:700;color:#1d4ed8;margin-bottom:4px">Your reply</div>
           <div style="font-size:12px;color:var(--text-primary);line-height:1.5">${this._esc(r.review_reply)}</div>
           <button onclick="ReviewsScreen._openReply(${r.id},'${this._esc(r.customer_name)}',${r.rating},'${this._esc(r.review_reply || '')}')"
                   style="margin-top:6px;font-size:11px;color:#1d4ed8;background:none;border:none;cursor:pointer;padding:0;font-weight:600">Edit reply</button>
         </div>`
      : `<button onclick="ReviewsScreen._openReply(${r.id},'${this._esc(r.customer_name)}',${r.rating},'')"
                 style="margin-top:10px;display:flex;align-items:center;gap:5px;padding:7px 14px;border-radius:18px;border:1.5px solid var(--navy);background:#fff;color:var(--navy);font-size:12px;font-weight:600;cursor:pointer">
           💬 Reply to customer
         </button>`;

    return `
      <div style="margin:0 14px 10px;background:#fff;border:.5px solid var(--border-light);border-radius:var(--radius-md);padding:14px" id="review-card-${r.id}">
        <div style="display:flex;align-items:flex-start;gap:10px">
          <div style="width:36px;height:36px;border-radius:50%;background:${avatarBg};color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;flex-shrink:0">${initials}</div>
          <div style="flex:1;min-width:0">
            <div style="display:flex;justify-content:space-between;align-items:flex-start">
              <div>
                <div style="font-size:13px;font-weight:700">${this._esc(r.customer_name)}</div>
                <div style="font-size:11px;color:var(--text-secondary);margin-top:1px">${r.vehicle_plate}${r.vehicle_model ? ' · ' + this._esc(r.vehicle_model) : ''}</div>
              </div>
              <div style="text-align:right;flex-shrink:0">
                <div style="font-size:14px;color:${starColor};letter-spacing:1px">${stars}</div>
                <div style="font-size:10px;color:var(--text-tertiary);margin-top:2px">${date}</div>
              </div>
            </div>
            <div style="margin-top:5px;font-size:11px;color:var(--text-tertiary)">
              ${UI.washIcon(r.wash_type)} ${this._esc(r.package_name)} · ${UI.formatPrice(r.package_price)}
            </div>
          </div>
        </div>
        ${commentHtml}
        ${replyHtml}
      </div>`;
  },

  _emptyHtml() {
    const msgs = {
      all:       ['📭', 'No reviews yet', 'Completed bookings with ratings will appear here.'],
      replied:   ['💬', 'No replied reviews', 'You haven\'t replied to any reviews yet.'],
      unreplied: ['✅', 'All caught up!', 'You\'ve replied to every review.'],
    };
    const [ico, title, sub] = msgs[this._filter] || ['🔍', 'No reviews found', 'Try a different filter.'];
    return `
      <div style="padding:48px 20px;text-align:center">
        <div style="font-size:36px">${ico}</div>
        <div style="font-size:14px;font-weight:700;margin-top:8px">${title}</div>
        <div style="font-size:12px;color:var(--text-secondary);margin-top:4px;line-height:1.5">${sub}</div>
      </div>`;
  },

  // ── Reply sheet ───────────────────────────────────────────────

  _openReply(bookingId, customerName, rating, existingReply) {
    this._replyBooking = { id: bookingId, customerName, rating };
    const stars = '★'.repeat(rating) + '☆'.repeat(5 - rating);
    const meta  = document.getElementById('reply-sheet-meta');
    const ta    = document.getElementById('reply-textarea');
    const cc    = document.getElementById('reply-char-count');
    if (meta) meta.textContent = `${customerName} · ${stars}`;
    if (ta)   { ta.value = existingReply || ''; ta.style.borderColor = 'var(--border-medium)'; }
    if (cc)   cc.textContent = `${(existingReply || '').length} / 500`;
    const overlay = document.getElementById('reply-overlay');
    if (overlay) { overlay.style.display = 'flex'; setTimeout(() => ta?.focus(), 100); }
  },

  _closeReply(event) {
    if (event && event.target !== document.getElementById('reply-overlay')) return;
    const overlay = document.getElementById('reply-overlay');
    if (overlay) overlay.style.display = 'none';
    this._replyBooking = null;
  },

  _replyInput(el) {
    const cc = document.getElementById('reply-char-count');
    if (cc) cc.textContent = `${el.value.length} / 500`;
    el.style.borderColor = el.value.trim() ? 'var(--navy)' : 'var(--border-medium)';
  },

  async _submitReply() {
    if (!this._replyBooking) return;
    const ta  = document.getElementById('reply-textarea');
    const btn = document.getElementById('reply-send-btn');
    const reply = ta?.value.trim();
    if (!reply) { if (ta) ta.style.borderColor = 'var(--red)'; return; }

    UI.setLoading(btn, true);
    try {
      const res  = await fetch(`/api/reviews/${this._replyBooking.id}/reply`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${AppState.token}` },
        body:    JSON.stringify({ reply }),
      });
      const data = await res.json();
      if (!res.ok) { UI.toast(data.error || 'Failed to save reply'); return; }

      // Patch local data so we don't need a full reload
      const review = this._data.reviews.find(r => r.id === this._replyBooking.id);
      if (review) {
        review.review_reply = reply;
        if (!this._data.stats.replied || !review.review_reply) this._data.stats.replied = (this._data.stats.replied || 0) + 1;
      }

      const overlay = document.getElementById('reply-overlay');
      if (overlay) overlay.style.display = 'none';
      this._replyBooking = null;

      UI.toast('✅ Reply saved successfully');
      this._renderAll();
    } catch {
      UI.toast('Network error. Try again.');
    } finally {
      UI.setLoading(btn, false);
    }
  },

  // ── Error ─────────────────────────────────────────────────────

  _renderError(msg) {
    const body = document.getElementById('reviews-body');
    if (!body) return;
    body.innerHTML = `
      <div style="padding:48px 20px;text-align:center">
        <div style="font-size:36px">⚠️</div>
        <div style="font-size:14px;font-weight:700;color:var(--red);margin-top:8px">Couldn't load reviews</div>
        <div style="font-size:12px;color:var(--text-secondary);margin-top:4px;line-height:1.5">${this._esc(msg)}</div>
        <button class="btn btn-primary" style="margin-top:16px" onclick="ReviewsScreen.render()">🔄 Retry</button>
      </div>`;
  },

  _esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  },
};
