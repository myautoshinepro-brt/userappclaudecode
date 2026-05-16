// ============================================================
// Pitbay — location.js
// Zepto-style address bottom sheet
// ============================================================

const LocationModal = {
  _selectedId: null,   // id of the currently selected saved address (or null)

  // ── GEOCODING HELPERS ─────────────────────────────────────

  async _reverseGeocode(lat, lng) {
    try {
      const r = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
        { headers: { 'User-Agent': 'PitbayApp/1.0' } }
      );
      const j = await r.json();
      const a = j.address || {};
      const suburb = a.suburb || a.neighbourhood || a.city_district || a.village || '';
      const city   = a.city   || a.town || a.state_district || '';
      return { area: suburb || city || 'Current location', city };
    } catch { return { area: 'Current location', city: '' }; }
  },

  async _geocodePincode(pincode) {
    try {
      const r = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&postalcode=${pincode}&country=India&limit=1`,
        { headers: { 'User-Agent': 'PitbayApp/1.0' } }
      );
      const j = await r.json();
      if (!j.length) return null;
      const a = j[0];
      return { lat: parseFloat(a.lat), lng: parseFloat(a.lon), name: a.display_name.split(',')[0].trim() };
    } catch { return null; }
  },

  // ── DISTANCE HELPER (km) ──────────────────────────────────

  _haversine(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2
            + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180)
            * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  },

  // ── OPEN / CLOSE ──────────────────────────────────────────

  open() {
    const overlay = document.getElementById('location-modal');
    if (!overlay) return;
    overlay.style.display = 'flex';
    requestAnimationFrame(() => requestAnimationFrame(() => overlay.classList.add('open')));
    this._renderSavedAddresses();
    this._resetSearch();
    this._resetGps();
    const mapLabel = document.getElementById('loc-map-label');
    if (mapLabel) mapLabel.textContent = AppState.location.area + ', India';
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

  // ── RENDER SAVED ADDRESSES (live from SAVED_ADDRESSES) ────

  _renderSavedAddresses() {
    const list = document.getElementById('loc-addr-list');
    if (!list) return;

    const addrs = typeof SAVED_ADDRESSES !== 'undefined' ? SAVED_ADDRESSES : [];
    const ICON_BG = ['#dbeafe', '#dcfce7', '#fef9c3', '#ede9fe', '#fee2e2', '#fff7ed'];

    const cards = addrs.map((a, i) => {
      const isSelected = a.id === this._selectedId || (this._selectedId == null && a.isDefault);
      const bg = ICON_BG[i % ICON_BG.length];
      const distLabel = (AppState.location._lat && a.lat)
        ? `📍 ${this._haversine(AppState.location._lat, AppState.location._lng, a.lat, a.lng).toFixed(1)} km away`
        : `📍 ${a.address.split(',').slice(-1)[0].trim()}`;
      return `
        <div class="loc-addr-card ${isSelected ? 'selected' : ''}" id="lac-${a.id}"
             onclick="LocationModal.selectSaved(${a.id},'${(a.address.split(',')[0] || a.label).replace(/'/g,"\\'")}','${a.label.replace(/'/g,"\\'")}','${a.icon}',${a.lat||'null'},${a.lng||'null'})">
          <div class="lac-icon" style="background:${bg}">${a.icon}</div>
          <div class="lac-body">
            <div class="lac-label">${a.label}</div>
            <div class="lac-line">${a.address}</div>
            <div class="lac-dist">${distLabel}</div>
          </div>
          <div class="lac-radio"><div class="lac-radio-dot"></div></div>
        </div>`;
    }).join('');

    list.innerHTML = cards + `
      <div class="loc-addr-add" onclick="LocationModal.close();setTimeout(()=>Router.go('add-address'),320)">
        <div class="lac-icon-add">＋</div>
        <div class="lac-body">
          <div class="lac-label" style="color:var(--blue)">Add new address</div>
          <div class="lac-line">Home, office or any location</div>
        </div>
      </div>`;
  },

  // ── GPS ──────────────────────────────────────────────────

  async detectGPS() {
    const subTxt = document.getElementById('gps-status-text');
    const dot    = document.getElementById('gps-dot');
    if (subTxt) subTxt.textContent = 'Detecting your location…';
    if (dot)    { dot.style.animation = 'spin 1s linear infinite'; dot.style.background = '#f59e0b'; }

    if (!window.Capacitor) {
      if (subTxt) subTxt.textContent = '⚠️ GPS only on mobile';
      if (dot)    dot.style.background = '#ef4444';
      return;
    }

    try {
      const { Geolocation } = Capacitor.Plugins;

      const permission = await Geolocation.checkPermissions();
      if (permission.location !== 'granted') {
        await Geolocation.requestPermissions();
      }

      const pos = await Geolocation.getCurrentPosition({
        timeout: 10000,
        enableHighAccuracy: true
      });

      const { latitude: lat, longitude: lng } = pos.coords;
      const { area, city } = await this._reverseGeocode(lat, lng);

      if (subTxt) subTxt.textContent = '✅ ' + area;
      if (dot)    { dot.style.animation = ''; dot.style.background = '#22c55e'; }

      this._selectedId = null;
      this._deselect();
      // Pass "suburb, city" so _setLocation can extract the city for filtering
      const fullArea = city ? area + ', ' + city : area;
      this._setLocation(area, fullArea, lat, lng);
      this._updateCenterDistances(lat, lng);
      setTimeout(() => this.close(), 1200);

    } catch (err) {
      console.error('GPS Error:', err);
      if (subTxt) subTxt.textContent = '⚠️ Could not get location.';
      if (dot)    { dot.style.animation = ''; dot.style.background = '#ef4444'; }
    }
  },

  _resetGps() {
    const subTxt = document.getElementById('gps-status-text');
    const dot    = document.getElementById('gps-dot');
    if (subTxt) subTxt.textContent = 'Tap to detect via GPS';
    if (dot)    { dot.style.animation = ''; dot.style.background = ''; }
  },

  // ── UPDATE CENTER DISTANCES ───────────────────────────────

  _updateCenterDistances(userLat, userLng) {
    if (!userLat || !userLng || typeof CENTERS === 'undefined') return;
    CENTERS = CENTERS.map(c => ({
      ...c,
      distance: c.lat && c.lng
        ? parseFloat(this._haversine(userLat, userLng, c.lat, c.lng).toFixed(1))
        : c.distance,
    }));
    if (typeof HomeScreen !== 'undefined') HomeScreen.renderCenterCards(CENTERS);
  },

  // ── SEARCH / TYPE ─────────────────────────────────────────

  async filterAreas() {
    const input    = document.getElementById('area-search-input');
    const val      = (input?.value || '').trim();
    const sugl     = document.getElementById('area-suggestions');
    const clearBtn = document.getElementById('loc-search-clear');
    if (clearBtn) clearBtn.style.display = val ? 'block' : 'none';
    if (!val) { if (sugl) sugl.style.display = 'none'; return; }

    // 6-digit pincode → forward geocode
    if (/^\d{6}$/.test(val)) {
      if (sugl) sugl.innerHTML = `<div style="padding:10px 14px;font-size:11px;color:var(--text-secondary)">🔍 Looking up pincode…</div>`;
      if (sugl) sugl.style.display = 'block';
      const geo = await this._geocodePincode(val);
      if (geo) {
        sugl.innerHTML = `
          <div class="loc-sug-item" onmousedown="LocationModal.pickArea('${geo.name}',${geo.lat},${geo.lng})">
            <span style="font-size:14px">📮</span>
            <div><div>${geo.name}</div><div class="loc-sug-area">Pincode ${val}</div></div>
          </div>`;
      } else {
        sugl.innerHTML = `<div style="padding:10px 14px;font-size:11px;color:var(--text-secondary)">No results for pincode ${val}</div>`;
      }
      return;
    }

    // Text search against Mumbai areas list
    const q       = val.toLowerCase();
    const matches = (typeof MUMBAI_AREAS !== 'undefined' ? MUMBAI_AREAS : [])
      .filter(a => a.toLowerCase().includes(q)).slice(0, 6);
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

  _resetSearch() { this.clearSearch(); },

  pickArea(area, lat, lng) {
    this.clearSearch();
    this._selectedId = null;
    this._deselect();
    this._setLocation(area.split(',')[0], area, lat || null, lng || null);
    if (lat && lng) this._updateCenterDistances(lat, lng);
    setTimeout(() => this.close(), 280);
  },

  confirmTyped() {
    const val = (document.getElementById('area-search-input')?.value || '').trim();
    if (!val) return;
    this._selectedId = null;
    this._deselect();
    this._setLocation(val.split(',')[0], val, null, null);
    setTimeout(() => this.close(), 200);
  },

  // ── SELECT SAVED ADDRESS ──────────────────────────────────

  selectSaved(id, area, label, emoji, lat, lng) {
    this._deselect();
    const card = document.getElementById('lac-' + id);
    if (card) card.classList.add('selected');
    this._selectedId = id;
    this._setLocation(label, area, lat, lng);
    if (lat && lng) this._updateCenterDistances(lat, lng);

    // Apply the address's city to filter the home screen centers
    const addr = typeof SAVED_ADDRESSES !== 'undefined' ? SAVED_ADDRESSES.find(a => a.id === id) : null;
    if (addr && addr.city) {
      AppState.user.city = addr.city;
      this._applyCityFilter(addr.city);
    }

    UI.toast(emoji + ' ' + label + ' selected');
    setTimeout(() => this.close(), 380);
  },

  // ── CITY FILTER ───────────────────────────────────────────

  _applyCityFilter(city) {
    if (typeof ALL_CENTERS === 'undefined') return;
    if (!city) {
      CENTERS = [...ALL_CENTERS];
    } else {
      const cityLc      = city.trim().toLowerCase();
      const cityMatched = ALL_CENTERS.filter(c => c.city && c.city.trim().toLowerCase() === cityLc);
      // If there are centers tagged to this city → show only those.
      // If none are tagged (e.g. demo / legacy data) → show all as fallback.
      CENTERS = cityMatched.length ? cityMatched : [...ALL_CENTERS];
    }
    if (typeof HomeScreen !== 'undefined') HomeScreen.renderCenterCards(CENTERS);
  },

  _deselect() {
    document.querySelectorAll('.loc-addr-card').forEach(c => c.classList.remove('selected'));
  },

  // ── SELECT RECENT ─────────────────────────────────────────

  selectRecent(el, label) {
    document.querySelectorAll('.loc-recent-chip').forEach(c => c.classList.remove('active'));
    el.classList.add('active');
    this._selectedId = null;
    this._deselect();
    this._setLocation(label.split(',')[0], label, null, null);
    UI.toast('🕐 ' + label.split(',')[0] + ' selected');
    setTimeout(() => this.close(), 300);
  },

  // ── INTERNAL: apply location to AppState + header ─────────

  _setLocation(label, area, lat, lng) {
    AppState.setLocation(label, area);
    AppState.location._lat = lat || null;
    AppState.location._lng = lng || null;
    _setText('location-label', label + ' — ' + area.split(',')[0]);
    const dot = document.getElementById('location-dot');
    if (dot) dot.style.background = '#4ade80';
    const mapLabel = document.getElementById('loc-map-label');
    if (mapLabel) mapLabel.textContent = area.split(',')[0] + ', India';
    UI.showAT(label + ' selected');

    // Auto-detect city from the area string and re-filter centers
    const detectedCity = this._detectCityFromText(area);
    if (detectedCity && detectedCity !== AppState.user.city) {
      AppState.user.city = detectedCity;
      this._applyCityFilter(detectedCity);
    }
  },

  // Match area text against SERVICEABLE_CITIES (case-insensitive substring)
  _detectCityFromText(text) {
    if (!text || typeof SERVICEABLE_CITIES === 'undefined') return null;
    const lower = text.toLowerCase();
    return SERVICEABLE_CITIES.find(c => lower.includes(c.toLowerCase())) || null;
  },
};
