// SparkWash Center App — queue.js

const QueueScreen = {
  async render() {
    await this._loadQueue();
  },

  async _loadQueue() {
    try {
      const res  = await fetch(`/api/bookings?date=${AppState.currentDate}`, {
        headers: { Authorization: `Bearer ${AppState.token}` },
      });
      const data = await res.json();
      if (!res.ok) return;

      const all      = data.bookings || [];
      const active   = all.filter(b => ['arrived','washing'].includes(b.status));
      const upcoming = all.filter(b => ['new','confirmed'].includes(b.status));

      this._renderSummary(active, upcoming);
      this._renderList(active, upcoming);
    } catch {
      UI.toast('Failed to load queue');
    }
  },

  _renderSummary(active, upcoming) {
    const el = document.getElementById('queue-summary');
    if (!el) return;
    el.innerHTML = `
      <div class="queue-summary-chip">
        <div class="qsc-value">${active.filter(b=>b.status==='arrived').length}</div>
        <div class="qsc-label">Arrived</div>
      </div>
      <div class="queue-summary-chip">
        <div class="qsc-value">${active.filter(b=>b.status==='washing').length}</div>
        <div class="qsc-label">Washing</div>
      </div>
      <div class="queue-summary-chip">
        <div class="qsc-value">${upcoming.length}</div>
        <div class="qsc-label">Upcoming</div>
      </div>
    `;
  },

  _renderList(active, upcoming) {
    const el = document.getElementById('queue-list');
    if (!el) return;

    if (active.length === 0 && upcoming.length === 0) {
      el.innerHTML = `
        <div class="empty-state">
          <div class="empty-ico">🚗</div>
          <div class="empty-title">Queue is empty</div>
          <div class="empty-sub">No cars at the center right now</div>
        </div>`;
      return;
    }

    let html = '';
    if (active.length > 0) {
      html += `<div class="dash-section-title" style="padding:0 0 8px">🔄 At Center Now</div>`;
      html += active.map((b, i) => this._queueCard(b, i + 1)).join('');
    }
    if (upcoming.length > 0) {
      html += `<div class="dash-section-title" style="padding:12px 0 8px">⏳ Upcoming</div>`;
      html += upcoming.map((b, i) => this._queueCard(b, i + 1, true)).join('');
    }
    el.innerHTML = html;
  },

  _queueCard(b, num, muted = false) {
    const m = STATUS_META[b.status] || {};
    return `
      <div class="queue-card ${b.status}" style="${muted ? 'opacity:.75' : ''}">
        <div class="queue-num">${num}</div>
        <div class="queue-info">
          <div class="queue-name">${b.customer_name}</div>
          <div class="queue-sub">${b.vehicle_plate} · ${UI.washLabel(b.wash_type)}</div>
          <div class="queue-sub">${b.package_name}</div>
        </div>
        <div style="text-align:right">
          ${UI.badge(b.status)}
          <div class="queue-time" style="margin-top:4px">${b.slot_time}</div>
          ${m.next ? `<button class="btn btn-primary btn-sm" style="margin-top:6px;font-size:10px;padding:5px 8px"
            onclick="QueueScreen.advance(${b.id},'${m.next}')">${m.nextLabel}</button>` : ''}
        </div>
      </div>`;
  },

  async advance(id, status) {
    try {
      const res = await fetch(`/api/bookings/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${AppState.token}` },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) { UI.toast(data.error || 'Failed'); return; }
      UI.toast(`✅ ${STATUS_META[status]?.label}`);
      this._loadQueue();
    } catch { UI.toast('Network error'); }
  },
};
