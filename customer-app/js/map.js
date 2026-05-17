// ============================================================
// Pitbay — map.js
// Leaflet + OpenStreetMap map on the home screen.
// No API key, no billing. Center pins + user pin + "Near me".
// ============================================================

const MapView = (() => {
  const MUMBAI = [19.076, 72.877];

  let _map         = null;
  let _userMarker  = null;
  let _userCircle  = null;
  let _markers     = [];
  let _initialized = false;
  // Public: called by Router._onEnter('home') on every home entry.
  // We do NOT auto-request GPS here — the permission prompt is triggered
  // explicitly when the user taps "📍 Near me" or the Nearest filter chip,
  // so it always has context.
  function init() {
    const el = document.getElementById('center-map');
    if (!el) return;

    if (typeof L === 'undefined') {
      // Leaflet not loaded yet — try again shortly.
      setTimeout(init, 300);
      return;
    }

    if (!_initialized) _create(el);
    refreshMarkers();
    // Invalidate size — fixes the half-rendered map when the home screen was
    // initially hidden (Leaflet doesn't know its container resized).
    setTimeout(() => _map && _map.invalidateSize(), 0);
  }

  function _create(el) {
    _map = L.map(el, {
      center: MUMBAI,
      zoom:   12,
      zoomControl: false,
      attributionControl: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap',
    }).addTo(_map);

    L.control.zoom({ position: 'bottomleft' }).addTo(_map);
    L.control.attribution({ position: 'bottomright', prefix: false }).addTo(_map);

    _initialized = true;
  }

  // ── MARKERS ──────────────────────────────────────────────

  function _centerIcon() {
    return L.divIcon({
      className: 'sw-center-pin',
      html: '<div class="sw-pin-dot"></div>',
      iconSize:   [22, 22],
      iconAnchor: [11, 11],
    });
  }

  function _userIcon() {
    return L.divIcon({
      className: 'sw-user-pin',
      html: '<div class="sw-user-dot"></div>',
      iconSize:   [18, 18],
      iconAnchor: [9, 9],
    });
  }

  // Re-paint center markers when CENTERS changes (e.g. after city filter).
  function refreshMarkers() {
    if (!_map) return;

    _markers.forEach(m => m.remove());
    _markers = [];

    const list = (typeof CENTERS !== 'undefined') ? CENTERS : [];
    list.forEach(c => {
      if (c.lat == null || c.lng == null) return;
      const m = L.marker([c.lat, c.lng], { icon: _centerIcon(), title: c.name });
      m.on('click', () => {
        if (typeof HomeScreen !== 'undefined') HomeScreen.openCenter(c.id);
      });
      m.addTo(_map);
      _markers.push(m);
    });

    const badge = document.getElementById('map-center-count');
    if (badge) badge.textContent = `${list.length} center${list.length === 1 ? '' : 's'}`;

    // Fit the map to whatever we have. Prefer "user + nearby centers" when GPS
    // is on, otherwise just the centers, otherwise leave it on Mumbai.
    _autoFit();
  }

  function _autoFit() {
    const pts = _markers.map(m => m.getLatLng());
    if (_userMarker) pts.push(_userMarker.getLatLng());
    if (!pts.length) return;
    if (pts.length === 1) {
      _map.setView(pts[0], 14);
      return;
    }
    const bounds = L.latLngBounds(pts);
    _map.fitBounds(bounds, { padding: [30, 30], maxZoom: 14 });
  }

  // ── GPS ──────────────────────────────────────────────────

  // Tap on the "📍 Near me" button on the map overlay.
  async function locateUser() {
    const ok = await _getAndApplyGps({ toast: true });
    if (ok && typeof UI !== 'undefined') UI.toast('📍 Showing centers near you');
  }

  // Returns true on success, false on failure (permission denied, no GPS, etc.)
  async function _getAndApplyGps({ toast }) {
    try {
      const pos = await _getPosition();
      const { latitude: lat, longitude: lng, accuracy } = pos.coords;
      _placeUserMarker(lat, lng, accuracy);
      _recomputeCenterDistances(lat, lng);
      _autoFit();
      return true;
    } catch (err) {
      console.warn('GPS error:', err && err.message ? err.message : err);
      if (toast && typeof UI !== 'undefined') {
        UI.toast('⚠️ Could not get your location');
      }
      return false;
    }
  }

  function _getPosition() {
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Geolocation) {
      const { Geolocation } = window.Capacitor.Plugins;
      return (async () => {
        const perm = await Geolocation.checkPermissions();
        if (perm.location !== 'granted') {
          const req = await Geolocation.requestPermissions();
          if (req.location !== 'granted') throw new Error('Location permission denied');
        }
        return Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 });
      })();
    }
    // Browser fallback (works on https / localhost desktop testing)
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) return reject(new Error('Geolocation not supported'));
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
      });
    });
  }

  function _placeUserMarker(lat, lng, accuracyMeters) {
    if (!_map) return;
    if (_userMarker) _userMarker.remove();
    if (_userCircle) _userCircle.remove();

    _userMarker = L.marker([lat, lng], { icon: _userIcon(), title: 'You are here' }).addTo(_map);

    if (accuracyMeters && accuracyMeters < 1000) {
      _userCircle = L.circle([lat, lng], {
        radius: accuracyMeters,
        color:  '#1a73e8',
        weight: 1,
        fillColor: '#1a73e8',
        fillOpacity: 0.08,
      }).addTo(_map);
    }
  }

  // Distance from user (lat,lng) to every center, then re-render the list so
  // the "Nearest" filter and the meta line are correct.
  function _recomputeCenterDistances(userLat, userLng) {
    if (typeof CENTERS === 'undefined') return;

    AppState.location._lat = userLat;
    AppState.location._lng = userLng;

    CENTERS = CENTERS.map(c => ({
      ...c,
      distance: (c.lat != null && c.lng != null)
        ? parseFloat(_haversine(userLat, userLng, c.lat, c.lng).toFixed(1))
        : c.distance,
    }));

    if (typeof HomeScreen !== 'undefined') {
      const activeChip = document.querySelector('.filter-chip.active');
      const filter = activeChip?.dataset.filter || 'all';
      if (filter === 'all') HomeScreen.renderCenterCards(CENTERS);
      else                   HomeScreen.applyFilter(activeChip, filter);
    }
  }

  function _haversine(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2
            + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180)
            * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function hasUserLocation() {
    return !!_userMarker;
  }

  return { init, locateUser, refreshMarkers, hasUserLocation };
})();
