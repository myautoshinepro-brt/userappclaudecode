// ============================================================
// SparkWash — location.js
// Zepto-style address bottom sheet
// ============================================================

const LocationModal = {
  // Key of the currently selected saved address ('h' | 'o' | 'p' | null)
  _selectedKey: 'h',

  // Saved address data map
  _addresses: {
    h: { area: 'Andheri West', label: 'Home',         emoji: '🏠', full: 'Andheri West, Mumbai' },
    o: { area: 'Bandra East',  label: 'Office',        emoji: '🏢', full: 'Bandra East, Mumbai'  },
    p: { area: 'Borivali West',label: 'Parents home',  emoji: '👨‍👩‍👦', full: 'Borivali West, Mumbai'},
  },

  // ── OPEN / CLOSE ──────────────────────────────────────────

  open() {
    const overlay = document.getElementById('location-modal');
    if (!overlay) return;
    overlay.style.display = 'flex';
    // Force reflow so the transition fires
    requestAnimationFrame(() => {
      requestAnimationFrame(() => overlay.classList.add('open'));
    });
    this._restoreSelection();
    this._resetSearch();
    this._resetGps();
    // Update map label to current location
    const mapLabel = document.getElementById('loc-map-label');
    if (mapLabel) mapLabel.textContent = AppState.location.area + ', Mumbai';
    // Re-trigger pin drop animation
    const pin = document.getElementById('loc-map-pin');
    if (pin) { pin.style.animation = 'none'; requestAnimationFrame(() => { pin.style.animation = ''; }); }
  },

  close() {
    const overlay = document.getElementById('location-modal');
    if (!overlay) return;
    overlay.classList.remove('open');
    setTimeout(() => { overlay.style.display = 'none'; }, 320);
  },

  handleOverlayClick(e) {
    if (e.target.id === 'location-modal') this.close();
  },

  // ── RESTORE SELECTION ON OPEN ────────────────────────────

  _restoreSelection() {
    // Deselect all
    ['h','o','p'].forEach(k => {
      document.getElementById('lac-' + k)?.classList.remove('selected');
    });
    // Highlight the currently active key
    if (this._selectedKey) {
      document.getElementById('lac-' + this._selectedKey)?.classList.add('selected');
    }
  },

  // ── GPS ──────────────────────────────────────────────────

  detectGPS() {
    const row    = document.getElementById('gps-detecting');
    const subTxt = document.getElementById('gps-status-text');
    const dot    = document.getElementById('gps-dot');
    if (subTxt) subTxt.textContent = 'Detecting your location…';
    if (dot)    { dot.style.animation = 'spin 1s linear infinite'; dot.style.background = '#f59e0b'; }

    const done = (area) => {
      if (subTxt) subTxt.textContent = '✅ ' + area + ', Mumbai';
      if (dot)    { dot.style.animation = ''; dot.style.background = '#22c55e'; }
      this._selectedKey = null;
      this._deselect();
      this._setLocation(area, area);
      setTimeout(() => this.close(), 1200);
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        () => done('Andheri West'),
        ()  => done('Andheri West'),
        { timeout: 6000 }
      );
    } else {
      setTimeout(() => done('Andheri West'), 1400);
    }
  },

  _resetGps() {
    const subTxt = document.getElementById('gps-status-text');
    const dot    = document.getElementById('gps-dot');
    if (subTxt) subTxt.textContent = 'Tap to detect via GPS';
    if (dot)    { dot.style.animation = ''; dot.style.background = ''; }
  },

  // ── SEARCH / TYPE ─────────────────────────────────────────

  filterAreas() {
    const input   = document.getElementById('area-search-input');
    const val     = (input?.value || '').trim().toLowerCase();
    const sugl    = document.getElementById('area-suggestions');
    const clearBtn= document.getElementById('loc-search-clear');
    if (clearBtn) clearBtn.style.display = val ? 'block' : 'none';
    if (!val) { if (sugl) sugl.style.display = 'none'; return; }

    const matches = MUMBAI_AREAS.filter(a => a.toLowerCase().includes(val)).slice(0, 6);
    if (!sugl) return;
    sugl.innerHTML = matches.map(a =>
      `<div class="loc-sug-item" onmousedown="LocationModal.pickArea('${a}')">
        <span style="font-size:14px">📍</span>
        <div><div>${a}, Mumbai</div><div class="loc-sug-area">Mumbai, Maharashtra</div></div>
      </div>`
    ).join('');
    sugl.style.display = matches.length ? 'block' : 'none';
  },

  clearSearch() {
    const input = document.getElementById('area-search-input');
    if (input) input.value = '';
    const sugl = document.getElementById('area-suggestions');
    if (sugl) sugl.style.display = 'none';
    const clearBtn = document.getElementById('loc-search-clear');
    if (clearBtn) clearBtn.style.display = 'none';
  },

  focusSearch() {
    document.getElementById('area-search-input')?.focus();
  },

  _resetSearch() {
    this.clearSearch();
  },

  pickArea(area) {
    this.clearSearch();
    this._selectedKey = null;
    this._deselect();
    this._setLocation(area.split(',')[0], area + ', Mumbai');
    setTimeout(() => this.close(), 280);
  },

  confirmTyped() {
    const val = (document.getElementById('area-search-input')?.value || '').trim();
    if (!val) return;
    this._selectedKey = null;
    this._deselect();
    this._setLocation(val.split(',')[0], val);
    setTimeout(() => this.close(), 200);
  },

  // ── SELECT SAVED ADDRESS ──────────────────────────────────

  selectSaved(key, area, label, emoji) {
    // Visual: deselect all, then select chosen card
    this._deselect();
    const card = document.getElementById('lac-' + key);
    if (card) card.classList.add('selected');
    this._selectedKey = key;

    this._setLocation(label, area);
    UI.toast(emoji + ' ' + label + ' selected');
    // Close after brief pause so user sees the selection
    setTimeout(() => this.close(), 380);
  },

  _deselect() {
    ['h','o','p'].forEach(k => {
      document.getElementById('lac-' + k)?.classList.remove('selected');
    });
  },

  // ── SELECT RECENT ─────────────────────────────────────────

  selectRecent(el, label) {
    document.querySelectorAll('.loc-recent-chip').forEach(c => c.classList.remove('active'));
    el.classList.add('active');
    this._selectedKey = null;
    this._deselect();
    this._setLocation(label.split(',')[0], label);
    UI.toast('🕐 ' + label.split(',')[0] + ' selected');
    setTimeout(() => this.close(), 300);
  },

  // ── INTERNAL: apply location to AppState + header ─────────

  _setLocation(label, area) {
    AppState.setLocation(label, area);
    _setText('location-label', label + ' — ' + area.split(',')[0]);
    const dot = document.getElementById('location-dot');
    if (dot) dot.style.background = '#4ade80';
    // Update map label
    const mapLabel = document.getElementById('loc-map-label');
    if (mapLabel) mapLabel.textContent = area.split(',')[0] + ', Mumbai';
    UI.showAT(label + ' selected');
  },
};
