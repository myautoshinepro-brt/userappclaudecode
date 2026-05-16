// Pitbay Customer App — map.js
// Google Maps integration for "Find centers near me"

const MapView = (() => {
  let _map         = null;
  let _userMarker  = null;
  let _initialized = false;
  let _markers     = [];

  const MUMBAI     = { lat: 19.076, lng: 72.877 };

  async function init() {
    const el = document.getElementById('center-map');
    if (!el) return;

    if (_initialized) {
      // Re-trigger idle event to ensure map renders correctly if it was hidden
      if (_map) google.maps.event.trigger(_map, 'resize');
      return;
    }

    // Check if Google Maps is loaded
    if (typeof google === 'undefined' || !google.maps) {
      console.warn('Google Maps not loaded yet. Retrying...');
      setTimeout(init, 500);
      return;
    }

    _map = new google.maps.Map(el, {
      center: MUMBAI,
      zoom: 12,
      disableDefaultUI: true,
      zoomControl: true,
      zoomControlOptions: {
        position: google.maps.ControlPosition.LEFT_BOTTOM
      },
      styles: [
        { "featureType": "poi", "stylers": [{ "visibility": "off" }] }
      ]
    });

    // Place markers for every center in CENTERS
    if (typeof CENTERS !== 'undefined') {
      _renderCenterMarkers();
      const badge = document.getElementById('map-center-count');
      if (badge) badge.textContent = `${CENTERS.length} centers`;
    }

    _initialized = true;
  }

  function _renderCenterMarkers() {
    // Clear old markers
    _markers.forEach(m => m.setMap(null));
    _markers = [];

    CENTERS.forEach((c, i) => {
      const marker = new google.maps.Marker({
        position: { lat: c.lat, lng: c.lng },
        map: _map,
        title: c.name,
        label: {
          text: c.name,
          color: 'white',
          fontSize: '10px',
          fontWeight: '700'
        },
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: '#1a73e8',
          fillOpacity: 1,
          strokeWeight: 2,
          strokeColor: '#fff',
          scale: 12,
          labelOrigin: new google.maps.Point(0, 2)
        }
      });

      marker.addListener('click', () => {
        if (typeof HomeScreen !== 'undefined') HomeScreen.openCenter(c.id);
      });

      _markers.push(marker);
    });
  }

  async function locateUser() {
    if (!window.Capacitor) {
      UI.toast('Native GPS only available on mobile');
      return;
    }

    UI.toast('📍 Detecting location…');

    try {
      const { Geolocation } = Capacitor.Plugins;

      // Request permission first
      const permission = await Geolocation.checkPermissions();
      if (permission.location !== 'granted') {
        const request = await Geolocation.requestPermissions();
        if (request.location !== 'granted') {
          throw new Error('Location permission denied');
        }
      }

      const pos = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000
      });

      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      if (_map) {
        const latLng = new google.maps.LatLng(lat, lng);
        _map.setCenter(latLng);
        _map.setZoom(14);

        if (_userMarker) _userMarker.setMap(null);

        _userMarker = new google.maps.Marker({
          position: latLng,
          map: _map,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            fillColor: '#1a73e8',
            fillOpacity: 1,
            strokeWeight: 4,
            strokeColor: '#fff',
            scale: 8
          },
          title: 'You are here'
        });
      }

      UI.toast('Location found! Showing nearby centers.');

      // Update app location state if needed
      if (typeof LocationModal !== 'undefined' && LocationModal._reverseGeocode) {
        const area = await LocationModal._reverseGeocode(lat, lng);
        LocationModal._setLocation(area, area, lat, lng);
        LocationModal._updateCenterDistances(lat, lng);
      }

    } catch (err) {
      console.error('GPS Error:', err);
      UI.toast('Could not get location: ' + err.message);
    }
  }

  return { init, locateUser };
})();
