// ============================================================
// Pitbay — map.js
// Leaflet + OpenStreetMap map on the home screen.
// No API key, no billing. Center pins + user pin + "Near me".
// ============================================================

const MapView = (() => {
  // City centroid fallbacks for when we only have a city name (no lat/lng on
  // the saved address). Keys are normalized lowercased city names — keep in
  // sync with the alias logic in location.js.
  const CITY_CENTROIDS = {
    'mumbai':           [19.0760, 72.8777],
    'delhi':            [28.6139, 77.2090],
    'bangalore':        [12.9716, 77.5946],
    'bengaluru':        [12.9716, 77.5946],
    'pune':             [18.5204, 73.8567],
    'hyderabad':        [17.3850, 78.4867],
    'secunderabad':     [17.4399, 78.4983],
    'chennai':          [13.0827, 80.2707],
    'kolkata':          [22.5726, 88.3639],
    'gurgaon':          [28.4595, 77.0266],
    'gurugram':         [28.4595, 77.0266],
    'noida':            [28.5355, 77.3910],
    'ahmedabad':        [23.0225, 72.5714],
    'rajahmundry':      [17.0005, 81.8040],
    'rajamahendravaram':[17.0005, 81.8040],
  };
  const INDIA_FALLBACK = [22.3511, 78.6677]; // centroid of India

  // Resolve the best starting map view: explicit lat/lng > city centroid >
  // saved primary address > India fallback.
  function _resolveInitialCenter() {
    const a = (typeof SAVED_ADDRESSES !== 'undefined')
      ? (SAVED_ADDRESSES.find(x => x.isDefault) || SAVED_ADDRESSES[0])
      : null;
    if (a && a.lat != null && a.lng != null) {
      return { center: [a.lat, a.lng], zoom: 13 };
    }
    const city = (AppState?.user?.city || '').trim().toLowerCase();
    if (city && CITY_CENTROIDS[city]) {
      return { center: CITY_CENTROIDS[city], zoom: 11 };
    }
    if (a && a.city) {
      const ck = a.city.trim().toLowerCase();
      if (CITY_CENTROIDS[ck]) return { center: CITY_CENTROIDS[ck], zoom: 11 };
    }
    return { center: INDIA_FALLBACK, zoom: 5 };
  }

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
    const start = _resolveInitialCenter();
    _map = L.map(el, {
      center: start.center,
      zoom:   start.zoom,
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

  // Defense-in-depth: if the backend ever ships back a center whose coords
  // are wildly off its declared city (e.g. legacy bad data, race during a
  // backfill), don't draw a misleading pin in a different metro area.
  // Backend already snaps these in shapeForCustomer; this is a belt to the
  // backend's suspenders.
  function _isMarkerPlausible(c, expectedCity) {
    if (c.lat == null || c.lng == null) return false;
    if (!expectedCity) return true;
    const k = String(expectedCity).trim().toLowerCase();
    const centroid = CITY_CENTROIDS[k];
    if (!centroid) return true;  // unknown city — trust whatever we got
    const dLat = (c.lat - centroid[0]) * Math.PI / 180;
    const dLng = (c.lng - centroid[1]) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2
            + Math.cos(c.lat * Math.PI / 180) * Math.cos(centroid[0] * Math.PI / 180)
            * Math.sin(dLng / 2) ** 2;
    const km = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return km <= 150;
  }

  // Re-paint center markers when CENTERS changes (e.g. after city filter).
  function refreshMarkers() {
    if (!_map) return;

    _markers.forEach(m => m.remove());
    _markers = [];

    const list = (typeof CENTERS !== 'undefined') ? CENTERS : [];
    const expectedCity = (AppState && AppState.user && AppState.user.city) || '';

    let dropped = 0;
    list.forEach(c => {
      if (!_isMarkerPlausible(c, expectedCity)) { dropped++; return; }
      const m = L.marker([c.lat, c.lng], { icon: _centerIcon(), title: c.name });
      m.on('click', () => {
        if (typeof HomeScreen !== 'undefined') HomeScreen.openCenter(c.id);
      });
      m.addTo(_map);
      _markers.push(m);
    });

    if (dropped) {
      console.warn('[map] dropped', dropped, 'center pin(s) with coords > 150km from',
                   JSON.stringify(expectedCity), '(probable backend data drift)');
    }

    const badge = document.getElementById('map-center-count');
    if (badge) badge.textContent = `${list.length} center${list.length === 1 ? '' : 's'}`;

    _autoFit();
  }

  function _autoFit() {
    const pts = _markers.map(m => m.getLatLng());
    if (_userMarker) pts.push(_userMarker.getLatLng());
    if (!pts.length) {
      // No centers in this city — at least move the view to the user's
      // city/address instead of leaving it on Mumbai.
      const start = _resolveInitialCenter();
      _map.setView(start.center, start.zoom);
      return;
    }
    if (pts.length === 1) {
      _map.setView(pts[0], 14);
      return;
    }
    const bounds = L.latLngBounds(pts);
    _map.fitBounds(bounds, { padding: [30, 30], maxZoom: 14 });
  }

  // Public: explicitly recenter the map (used when the user picks a saved
  // address or detects GPS in a city with no centers yet).
  function centerOn(lat, lng, zoom) {
    if (!_map || lat == null || lng == null) return;
    _map.setView([lat, lng], zoom != null ? zoom : 13);
  }

  // Public: when the user's city changes but we don't have address coords,
  // jump to the city centroid so the empty-centers screen still feels right.
  function centerOnCity(cityName) {
    if (!_map) return;
    const k = String(cityName || '').trim().toLowerCase();
    if (k && CITY_CENTROIDS[k]) _map.setView(CITY_CENTROIDS[k], 11);
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

  return { init, locateUser, refreshMarkers, hasUserLocation, centerOn, centerOnCity };
})();
