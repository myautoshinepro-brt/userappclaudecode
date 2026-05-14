// Pitbay Customer App — map.js
// Leaflet/OpenStreetMap integration for "Find centers near me"

const MapView = (() => {
  let _map        = null;
  let _userMarker = null;
  let _initialized = false;

  const MUMBAI     = [19.076, 72.877];
  const PIN_COLORS = ['#1a73e8', '#2e7d32', '#e65100', '#5e35b1', '#c62828'];

  function init() {
    const el = document.getElementById('center-map');
    if (!el) return;

    if (_initialized) {
      // Map already built — just fix size if container was hidden
      setTimeout(() => _map?.invalidateSize(), 200);
      return;
    }

    _map = L.map('center-map', {
      zoomControl:       false,
      attributionControl: false,
    }).setView(MUMBAI, 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
    }).addTo(_map);

    L.control.attribution({ prefix: '© <a href="https://www.openstreetmap.org/copyright">OSM</a>' })
      .addTo(_map);

    L.control.zoom({ position: 'bottomleft' }).addTo(_map);

    // Place markers for every center in CENTERS
    if (typeof CENTERS !== 'undefined') {
      CENTERS.forEach((c, i) => {
        const color = PIN_COLORS[i % PIN_COLORS.length];
        const icon  = L.divIcon({
          className: '',
          html: `<div style="
            background:${color};color:#fff;
            padding:4px 8px;border-radius:10px;
            font-size:10px;font-weight:700;
            white-space:nowrap;cursor:pointer;
            box-shadow:0 2px 6px rgba(0,0,0,.3)
          ">${c.name}</div>`,
          iconAnchor: [0, 16],
        });
        L.marker([c.lat, c.lng], { icon })
          .addTo(_map)
          .on('click', () => {
            if (typeof HomeScreen !== 'undefined') HomeScreen.openCenter(c.id);
          });
      });

      const badge = document.getElementById('map-center-count');
      if (badge) badge.textContent = `${CENTERS.length} centers`;
    }

    _initialized = true;
  }

  function locateUser() {
    if (!navigator.geolocation) {
      UI.toast('GPS not supported on this device');
      return;
    }
    UI.toast('📍 Detecting location…');
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude: lat, longitude: lng } = pos.coords;

        _map.setView([lat, lng], 14);

        if (_userMarker) _userMarker.remove();
        _userMarker = L.circleMarker([lat, lng], {
          radius:      10,
          fillColor:   '#1a73e8',
          color:       '#fff',
          weight:      3,
          fillOpacity: 1,
        }).addTo(_map)
          .bindPopup('<b>You are here</b>')
          .openPopup();

        UI.toast('Location found! Showing nearby centers.');
      },
      () => {
        UI.toast('Could not get location — please allow GPS access in your browser');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  return { init, locateUser };
})();
