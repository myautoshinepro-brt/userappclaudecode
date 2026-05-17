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
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
      );
      const j = await r.json();
      const a = j.address || {};
      const city = a.city || a.town || a.village || a.municipality || a.county || a.state_district || '';

      // Prefer colony + suburb combo so labels like "Mithri Nagar, Madeenaguda"
      // come through rather than just one of them.
      const parts = [a.neighbourhood, a.suburb, a.city_district, a.hamlet, a.locality, a.quarter]
        .map(x => (x || '').trim()).filter(Boolean);
      const seen = new Set();
      const area = parts.filter(p => {
        const k = p.toLowerCase();
        if (seen.has(k)) return false; seen.add(k); return true;
      }).join(', ');

      return { area: area || city || 'Current location', city };
    } catch { return { area: 'Current location', city: '' }; }
  },

  async _geocodePincode(pincode) {
    try {
      const r = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&postalcode=${pincode}&country=India&limit=1&addressdetails=1`
      );
      const j = await r.json();
      if (!j.length) return null;
      const hit = j[0];
      const a   = hit.address || {};
      // Extract the cleanest "area" we can — colony / suburb / neighbourhood
      // — and a city. Both are used for the home filter + map centering.
      const area = a.suburb || a.neighbourhood || a.city_district
                || a.hamlet || a.locality || hit.display_name.split(',')[0].trim();
      const city = a.city || a.town || a.village || a.municipality
                || a.county || a.state_district || '';
      return {
        lat:  parseFloat(hit.lat),
        lng:  parseFloat(hit.lon),
        area, city,
        name: area, // back-compat alias for any older callers
      };
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

    try {
      const pos = await this._getPosition();
      const { latitude: lat, longitude: lng } = pos.coords;
      console.log('[GPS] coords:', lat, lng);

      if (subTxt) subTxt.textContent = 'Looking up address…';
      const { area, city } = await this._reverseGeocode(lat, lng);
      console.log('[GPS] reverse-geocoded:', { area, city });

      if (subTxt) subTxt.textContent = city ? `✅ ${area}, ${city}` : `✅ ${area}`;
      if (dot)    { dot.style.animation = ''; dot.style.background = '#22c55e'; }

      this._selectedId = null;
      this._deselect();

      // _setLocation kicks off _applyCityFilter as fire-and-forget — for the
      // GPS path we need to actually wait for centers to load before closing
      // the modal so the home doesn't briefly show stale results.
      const fullArea = city ? area + ', ' + city : area;
      this._setLocation(area, fullArea, lat, lng);
      this._updateCenterDistances(lat, lng);

      if (city) {
        if (subTxt) subTxt.textContent = `Fetching centers in ${city}…`;
        await this._applyCityFilter(city);
        const count = (typeof CENTERS !== 'undefined') ? CENTERS.length : 0;
        console.log('[GPS] centers loaded for', city, '→', count);
        if (subTxt) {
          subTxt.textContent = count
            ? `✅ ${count} center${count === 1 ? '' : 's'} near you`
            : `⚠️ No service in ${city} yet`;
        }
      }
      setTimeout(() => this.close(), 1200);

    } catch (err) {
      console.error('GPS Error:', err);
      const msg = (err && err.message) || 'Could not get location';
      const denied = /denied|permission/i.test(msg);
      if (subTxt) {
        subTxt.innerHTML = denied
          ? `⚠️ Location blocked — enable it in <b>Settings → Apps → Pitbay → Permissions</b>`
          : `⚠️ ${msg}`;
      }
      if (dot) { dot.style.animation = ''; dot.style.background = '#ef4444'; }
    }
  },

  // Shared GPS helper. Returns a Position. Throws "Location permission denied"
  // if user has blocked it, or "Geolocation not supported" on desktop without
  // the Web Geolocation API.
  async _getPosition() {
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Geolocation) {
      const { Geolocation } = window.Capacitor.Plugins;
      let perm = await Geolocation.checkPermissions();
      if (perm.location !== 'granted') {
        perm = await Geolocation.requestPermissions();
        if (perm.location !== 'granted') {
          throw new Error('Location permission denied');
        }
      }
      return Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 });
    }
    if (!navigator.geolocation) throw new Error('Geolocation not supported');
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true, timeout: 10000,
      });
    });
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

    // 6-digit pincode → forward geocode + show area + city
    if (/^\d{6}$/.test(val)) {
      if (sugl) sugl.innerHTML = `<div style="padding:10px 14px;font-size:11px;color:var(--text-secondary)">🔍 Looking up pincode ${val}…</div>`;
      if (sugl) sugl.style.display = 'block';
      const geo = await this._geocodePincode(val);
      if (geo) {
        // Pack the city into the onmousedown call so pickArea can apply the
        // city filter without re-geocoding.
        const cityArg = (geo.city || '').replace(/'/g, "\\'");
        const areaArg = (geo.area || '').replace(/'/g, "\\'");
        const sub = [val, geo.city].filter(Boolean).join(' · ');
        sugl.innerHTML = `
          <div class="loc-sug-item" onmousedown="LocationModal.pickArea('${areaArg}',${geo.lat},${geo.lng},'${cityArg}')">
            <span style="font-size:14px">📮</span>
            <div><div>${geo.area}${geo.city ? ', ' + geo.city : ''}</div><div class="loc-sug-area">Pincode ${sub}</div></div>
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

  // Accepts an optional explicit city — the pincode flow uses this so the
  // home filter runs against the actual returned city (e.g. "Hyderabad")
  // even when the area string doesn't include it.
  pickArea(area, lat, lng, city) {
    this.clearSearch();
    this._selectedId = null;
    this._deselect();
    // Build a location string that _setLocation can extract city from too.
    const locationStr = city ? `${area}, ${city}` : area;
    this._setLocation(area.split(',')[0], locationStr, lat || null, lng || null);
    if (lat && lng) this._updateCenterDistances(lat, lng);
    if (city) UI.toast(`📮 Showing centers in ${city}`);
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
  // Fetches centers from the API filtered by city. Always re-filters the
  // response client-side too, so a stale/un-deployed backend that ignores
  // ?city= can't leak centers from other cities into the home screen.

  async _applyCityFilter(city) {
    const cityParam = (city || '').trim();
    const base = (typeof window !== 'undefined' && window.API_URL) ? window.API_URL : '';
    const url  = cityParam
      ? `${base}/api/centers?city=${encodeURIComponent(cityParam)}`
      : `${base}/api/centers`;
    console.log('[centers] fetching for city=', JSON.stringify(cityParam), '→', url);
    try {
      const r = await fetch(url);
      const j = await r.json();
      const raw = (j && j.success && Array.isArray(j.data)) ? j.data : [];
      if (cityParam) {
        const filtered = raw.filter(c => this._cityMatches(c.city, cityParam));
        console.log('[centers] api returned', raw.length, '→ filtered to', filtered.length,
                    'for', JSON.stringify(cityParam),
                    '· cities in response:', [...new Set(raw.map(c => c.city))]);
        // Assign both the script-level binding AND window.CENTERS — they are
        // technically separate, and any reader using either form must see the
        // same list.
        CENTERS = filtered;
        window.CENTERS = filtered;
      } else {
        CENTERS = raw;
        window.CENTERS = raw;
        window.ALL_CENTERS = [...raw];
        console.log('[centers] api returned', raw.length, '(no city filter)');
      }
    } catch (e) {
      console.warn('[centers] api failed, using client-side fallback:', e.message);
      if (typeof ALL_CENTERS === 'undefined') return;
      const next = cityParam
        ? ALL_CENTERS.filter(c => this._cityMatches(c.city, cityParam))
        : [...ALL_CENTERS];
      CENTERS = next;
      window.CENTERS = next;
    }
    if (typeof HomeScreen !== 'undefined') HomeScreen.renderCenterCards(CENTERS);
    // Keep the map pins in sync with the (newly filtered) center list.
    if (typeof MapView !== 'undefined' && MapView.refreshMarkers) MapView.refreshMarkers();
  },

  // Common Indian city naming variations — group equivalent names so a saved
  // address tagged "New Delhi" still matches centers tagged "Delhi" in the DB.
  _CITY_ALIASES: [
    ['delhi', 'new delhi'],
    ['bangalore', 'bengaluru'],
    ['mumbai', 'bombay'],
    ['kolkata', 'calcutta'],
    ['chennai', 'madras'],
    ['pune', 'poona'],
    ['hyderabad', 'secunderabad'],
    ['gurgaon', 'gurugram'],
    ['mysore', 'mysuru'],
  ],
  _cityCanonical(name) {
    const norm = String(name || '').trim().toLowerCase();
    if (!norm) return '';
    for (const group of this._CITY_ALIASES) {
      if (group.includes(norm)) return group[0];
    }
    return norm;
  },
  _cityMatches(a, b) {
    return this._cityCanonical(a) === this._cityCanonical(b);
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

    // Re-center the map on the address (or its city) so the "blue dot"
    // stops being Mumbai by default.
    if (typeof MapView !== 'undefined') {
      if (lat != null && lng != null) MapView.centerOn(lat, lng);
    }

    // Always update the city to whatever was detected — serviceable or not.
    // Previously this only updated when the city was in SERVICEABLE_CITIES,
    // which left the home showing "We don't service <stale-old-city>" even
    // after the user had clearly moved to a new area.
    const detectedCity = this._detectCityFromArea(area);
    if (detectedCity && detectedCity !== AppState.user.city) {
      AppState.user.city = detectedCity;
      this._applyCityFilter(detectedCity);
      if (typeof MapView !== 'undefined' && (lat == null || lng == null)) {
        MapView.centerOnCity(detectedCity);
      }
    }
  },

  // Pull the city out of the area string. Prefer a SERVICEABLE_CITIES match
  // (so "MG Road, Bangalore" maps to canonical "Bangalore"), but fall back
  // to the last comma-separated segment so non-serviceable cities still
  // surface in the UI rather than silently staying as the previous value.
  _detectCityFromArea(text) {
    if (!text) return null;
    const lower = text.toLowerCase();
    if (typeof SERVICEABLE_CITIES !== 'undefined') {
      const hit = SERVICEABLE_CITIES.find(c => lower.includes(c.toLowerCase()));
      if (hit) return hit;
    }
    const parts = String(text).split(',').map(s => s.trim()).filter(Boolean);
    return parts.length ? parts[parts.length - 1] : null;
  },

  // Kept for backward-compat with any external caller; new code uses
  // _detectCityFromArea, which doesn't silently drop unknown cities.
  _detectCityFromText(text) { return this._detectCityFromArea(text); },
};
