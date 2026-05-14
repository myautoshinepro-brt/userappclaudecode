// Pitbay Center App — dashboard.js

const DashboardScreen = {
  async render() {
    await this._loadStats();
  },

  async _loadStats() {
    try {
      const res  = await fetch(`/api/dashboard?date=${AppState.currentDate}`, {
        headers: { Authorization: `Bearer ${AppState.token}` },
      });
      const data = await res.json();
      if (!res.ok) return;

      this._renderStats(data);
      this._renderQueue(data.queue || []);
    } catch {
      UI.toast('Failed to load dashboard');
    }
  },

  _renderStats(data) {
    const el = document.getElementById('dash-stats');
    if (!el) return;

    const c = AppState.center;
    // Update greeting
    const gEl = document.getElementById('dash-greeting');
    if (gEl) gEl.textContent = _greeting() + (c?.owner_name?.split(' ')[0] || '');

    const cnEl = document.getElementById('dash-center-name');
    if (cnEl) cnEl.textContent = c?.name || '';

    const avEl = document.getElementById('dash-avatar');
    if (avEl) avEl.textContent = AppState.initials;

    // Open/Close banner
    const bannerEl = document.getElementById('open-banner');
    if (bannerEl) {
      const open = AppState.isOpen;
      bannerEl.className = `open-banner ${open ? 'open' : 'closed'}`;
      bannerEl.innerHTML = `
        <span>${open ? '🟢 Center is Open' : '🔴 Center is Closed'}</span>
        <label class="toggle">
          <input type="checkbox" ${open ? 'checked' : ''} onchange="DashboardScreen.toggleOpen(this.checked)">
          <span class="toggle-slider"></span>
        </label>
      `;
    }

    const ratingVal  = data.avg_rating != null ? data.avg_rating.toFixed(1) : null;
    const ratingStars = ratingVal
      ? '★'.repeat(Math.round(data.avg_rating)) + '☆'.repeat(5 - Math.round(data.avg_rating))
      : null;
    const ratingColor = data.avg_rating >= 4 ? '#22c55e' : data.avg_rating >= 3 ? '#f59e0b' : '#ef4444';

    el.innerHTML = `
      <div class="dash-revenue-card" style="cursor:pointer" onclick="Router.go('reviews')">
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <div>
            <div class="dash-revenue-label">💰 Today's Revenue</div>
            <div class="dash-revenue-value">${UI.formatPrice(data.revenue)}</div>
            <div class="dash-revenue-sub">${data.completed} wash${data.completed !== 1 ? 'es' : ''} completed · ${UI.formatDate(AppState.currentDate)}</div>
          </div>
          ${ratingVal ? `
          <div style="text-align:center;background:rgba(255,255,255,.15);border-radius:12px;padding:8px 12px;min-width:64px;flex-shrink:0" onclick="Router.go('reviews')">
            <div style="font-size:22px;font-weight:900;color:#fde68a;line-height:1">${ratingVal}</div>
            <div style="font-size:11px;color:#fde68a;letter-spacing:1px;margin-top:2px">${ratingStars}</div>
            <div style="font-size:9px;color:rgba(255,255,255,.75);margin-top:3px">${data.rated_count} rating${data.rated_count !== 1 ? 's' : ''} today</div>
          </div>` : `
          <div style="text-align:center;background:rgba(255,255,255,.1);border-radius:12px;padding:8px 12px;min-width:64px;flex-shrink:0">
            <div style="font-size:18px;line-height:1">⭐</div>
            <div style="font-size:9px;color:rgba(255,255,255,.6);margin-top:4px;line-height:1.3">No ratings<br>yet today</div>
          </div>`}
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">📋</div>
        <div class="stat-value">${data.total}</div>
        <div class="stat-label">Total Bookings</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">⏳</div>
        <div class="stat-value">${data.pending}</div>
        <div class="stat-label">Pending</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">🔄</div>
        <div class="stat-value">${data.active}</div>
        <div class="stat-label">Active Now</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">✨</div>
        <div class="stat-value">${data.completed}</div>
        <div class="stat-label">Completed</div>
      </div>
    `;

    // Quick actions
    const qa = document.getElementById('dash-quick-actions');
    if (qa) {
      qa.innerHTML = `
        <div class="quick-action-btn" onclick="Router.go('bookings')">
          <div class="qa-icon">📋</div>
          <div class="qa-label">Bookings</div>
          ${data.pending > 0 ? `<div class="qa-count">${data.pending} new</div>` : ''}
        </div>
        <div class="quick-action-btn" onclick="Router.go('queue')">
          <div class="qa-icon">🚗</div>
          <div class="qa-label">Live Queue</div>
          ${data.active > 0 ? `<div class="qa-count green">${data.active} active</div>` : ''}
        </div>
        <div class="quick-action-btn" onclick="Router.go('slots')">
          <div class="qa-icon">🕐</div>
          <div class="qa-label">Slots</div>
        </div>
        <div class="quick-action-btn" onclick="Router.go('profile')">
          <div class="qa-icon">⚙️</div>
          <div class="qa-label">Settings</div>
        </div>
      `;
    }
  },

  _renderQueue(queue) {
    const el = document.getElementById('dash-queue-preview');
    if (!el) return;
    if (queue.length === 0) {
      el.innerHTML = '<div style="font-size:12px;color:var(--text-tertiary);padding:8px 0">No active cars right now</div>';
      return;
    }
    el.innerHTML = queue.slice(0, 3).map((b, i) => `
      <div class="queue-card ${b.status}">
        <div class="queue-num">${i + 1}</div>
        <div class="queue-info">
          <div class="queue-name">${b.customer_name}</div>
          <div class="queue-sub">${b.vehicle_plate} · ${UI.washLabel(b.wash_type)}</div>
        </div>
        <div>
          ${UI.badge(b.status)}
          <div class="queue-time" style="margin-top:3px">${b.slot_time}</div>
        </div>
      </div>
    `).join('');
    if (queue.length > 3) {
      el.innerHTML += `<div style="text-align:center;font-size:12px;color:var(--navy);cursor:pointer;padding:6px" onclick="Router.go('queue')">View all ${queue.length} →</div>`;
    }
  },

  async toggleOpen(val) {
    try {
      const res = await fetch('/api/auth/open-status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${AppState.token}` },
        body: JSON.stringify({ is_open: val }),
      });
      if (res.ok) {
        AppState.setOpenStatus(val);
        UI.toast(val ? '🟢 Center is now Open' : '🔴 Center is now Closed');
        this.render();
      }
    } catch { UI.toast('Failed to update status'); }
  },
};

function _greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning, ';
  if (h < 17) return 'Good afternoon, ';
  return 'Good evening, ';
}
