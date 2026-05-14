// Pitbay Center App — slots.js

const SlotsScreen = {
  // Slot being edited: { washType, time, capacity, is_blocked, booked_count }
  _editing: null,

  async render() {
    AppState.activeWashTab = AppState.washTypesList[0] || 'water';
    await this._loadSlots();
  },

  async _loadSlots() {
    const el = document.getElementById('slots-body');
    if (!el) return;
    el.innerHTML = '<div class="flex-center" style="padding:32px"><span class="spinner"></span></div>';
    try {
      const res  = await fetch(`/api/slots?date=${AppState.currentDate}`, {
        headers: { Authorization: `Bearer ${AppState.token}` },
      });
      const data = await res.json();
      if (!res.ok) return;
      AppState.slotGrid = data.grid || {};
      this._renderBody();
    } catch {
      UI.toast('Failed to load slots');
    }
  },

  _renderBody() {
    const el = document.getElementById('slots-body');
    if (!el) return;

    const washTypes = AppState.washTypesList;

    // Wash type tabs
    const tabs = `<div class="wash-tabs" id="slot-wash-tabs">` +
      washTypes.map(wt => `
        <div class="wash-tab ${AppState.activeWashTab === wt ? 'active' : ''}"
             onclick="SlotsScreen.setWashTab('${wt}')">
          ${UI.washIcon(wt)} ${UI.washLabel(wt)}
        </div>`).join('') + `</div>`;

    // Legend
    const legend = `
      <div class="slots-legend" style="padding:0 14px 4px">
        <span><span class="legend-dot" style="background:#e8f5e9;border:1.5px solid #a5d6a7"></span>Available</span>
        <span><span class="legend-dot" style="background:#fff3e0;border:1.5px solid #ffcc80"></span>Partial</span>
        <span><span class="legend-dot" style="background:#fce4ec;border:1.5px solid #ef9a9a"></span>Full</span>
        <span><span class="legend-dot" style="background:#f3e5f5;border:1.5px solid #ce93d8"></span>Blocked</span>
      </div>`;

    const grid = this._renderGrid(AppState.activeWashTab);

    el.innerHTML = tabs + legend + grid;
  },

  _renderGrid(washType) {
    const slots = AppState.slotGrid[washType] || [];
    if (slots.length === 0)
      return `<div class="empty-state"><div class="empty-title">No slots configured</div></div>`;

    const chips = slots.map(s => {
      const state  = this._slotState(s);
      return `
        <div class="slot-chip-v2 ${state.cls}" onclick="SlotsScreen.openEdit('${washType}','${s.time}')">
          <div class="sc-time">${s.time}</div>
          <div class="sc-cap ${state.capCls}">${state.label}</div>
          ${s.booked_count > 0 ? `<div class="sc-bar"><div class="sc-bar-fill ${state.barCls}" style="width:${Math.min(100, (s.booked_count / s.capacity) * 100)}%"></div></div>` : ''}
        </div>`;
    }).join('');

    return `
      <div style="padding:10px 14px 80px">
        <div class="slot-grid-v2">${chips}</div>
        <div style="font-size:11px;color:var(--text-tertiary);margin-top:10px;text-align:center">
          Tap any slot to edit capacity or block it
        </div>
      </div>`;
  },

  _slotState(s) {
    if (s.is_blocked) return {
      cls: 'sc-blocked', capCls: 'sc-cap-blocked', barCls: '',
      label: '🔒 Blocked',
    };
    const ratio = s.booked_count / s.capacity;
    if (ratio >= 1) return {
      cls: 'sc-full', capCls: 'sc-cap-full', barCls: 'sc-bar-full',
      label: `${s.booked_count}/${s.capacity} Full`,
    };
    if (ratio > 0) return {
      cls: 'sc-partial', capCls: 'sc-cap-partial', barCls: 'sc-bar-partial',
      label: `${s.booked_count}/${s.capacity} booked`,
    };
    return {
      cls: 'sc-free', capCls: 'sc-cap-free', barCls: 'sc-bar-free',
      label: `0/${s.capacity} free`,
    };
  },

  setWashTab(wt) {
    AppState.activeWashTab = wt;
    this._renderBody();
  },

  // ── EDIT SHEET ────────────────────────────────────────────────

  openEdit(washType, time) {
    const slot = (AppState.slotGrid[washType] || []).find(s => s.time === time);
    if (!slot) return;
    this._editing = { washType, time, capacity: slot.capacity, is_blocked: slot.is_blocked, booked_count: slot.booked_count };
    this._renderSheet();
    document.getElementById('slot-edit-overlay').classList.add('show');
  },

  closeEdit() {
    document.getElementById('slot-edit-overlay').classList.remove('show');
    this._editing = null;
  },

  _overlayClick(e) {
    if (e.target === document.getElementById('slot-edit-overlay')) this.closeEdit();
  },

  _renderSheet() {
    const e   = this._editing;
    const wt  = WASH_LABELS[e.washType] || {};
    const isFull = e.booked_count >= e.capacity;

    document.getElementById('slot-edit-content').innerHTML = `
      <div class="slot-edit-handle-bar"><div class="slot-edit-handle"></div></div>

      <div class="slot-edit-header">
        <div class="slot-edit-title">${wt.icon || ''} ${e.time}</div>
        <div class="slot-edit-sub">${wt.label || e.washType} · ${UI.formatDate(AppState.currentDate)}</div>
      </div>

      ${e.booked_count > 0 ? `
        <div class="slot-edit-info ${isFull ? 'info-red' : 'info-blue'}">
          ${isFull ? '⚠️' : 'ℹ️'} <strong>${e.booked_count} booking${e.booked_count !== 1 ? 's' : ''}</strong> already confirmed for this slot
        </div>` : ''}

      <div class="slot-edit-section">
        <div class="slot-edit-label">Capacity <span style="color:var(--text-tertiary);font-weight:400">(max cars at this time)</span></div>
        <div class="capacity-stepper">
          <button class="cap-btn" onclick="SlotsScreen._changeCapacity(-1)" ${e.capacity <= (e.booked_count || 1) ? 'disabled' : ''}>−</button>
          <div class="cap-value" id="cap-display">${e.capacity}</div>
          <button class="cap-btn" onclick="SlotsScreen._changeCapacity(1)" ${e.capacity >= 20 ? 'disabled' : ''}>+</button>
        </div>
        <div style="font-size:11px;color:var(--text-tertiary);text-align:center;margin-top:6px">
          Min: ${e.booked_count} (already booked) · Max: 20
        </div>
      </div>

      <div class="slot-edit-section">
        <div class="toggle-wrap" style="padding:0">
          <div>
            <div class="toggle-label">Block this slot</div>
            <div class="slot-edit-sub" style="font-size:11px;color:var(--text-secondary)">
              No new bookings will be accepted
            </div>
          </div>
          <label class="toggle">
            <input type="checkbox" id="slot-block-toggle" ${e.is_blocked ? 'checked' : ''}
              onchange="SlotsScreen._toggleBlocked(this.checked)">
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>

      <div class="slot-edit-actions">
        <button class="btn btn-outline" onclick="SlotsScreen.closeEdit()">Cancel</button>
        <button class="btn btn-primary" id="slot-save-btn" onclick="SlotsScreen.saveSlot()">Save Changes</button>
      </div>
    `;
  },

  _changeCapacity(delta) {
    const e   = this._editing;
    const min = Math.max(1, e.booked_count);
    const max = 20;
    e.capacity = Math.min(max, Math.max(min, e.capacity + delta));
    document.getElementById('cap-display').textContent = e.capacity;
    // Re-render to update disabled state on buttons
    this._renderSheet();
  },

  _toggleBlocked(val) {
    this._editing.is_blocked = val;
  },

  async saveSlot() {
    const e   = this._editing;
    if (!e)   return;
    const btn = document.getElementById('slot-save-btn');
    UI.setLoading(btn, true);
    try {
      const res = await fetch('/api/slots', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${AppState.token}` },
        body:    JSON.stringify({
          wash_type:  e.washType,
          date:       AppState.currentDate,
          time:       e.time,
          is_blocked: e.is_blocked,
          capacity:   e.capacity,
        }),
      });
      if (!res.ok) { UI.toast('Failed to save'); return; }

      // Update local state
      const slot = (AppState.slotGrid[e.washType] || []).find(s => s.time === e.time);
      if (slot) { slot.capacity = e.capacity; slot.is_blocked = e.is_blocked; }

      this.closeEdit();
      this._renderBody();

      const msg = e.is_blocked
        ? `🔒 ${e.time} blocked`
        : `✅ ${e.time} — capacity set to ${e.capacity}`;
      UI.toast(msg);
    } catch {
      UI.toast('Network error');
    } finally {
      UI.setLoading(btn, false);
    }
  },
};
