// ============================================================
// Pitbay — userdata.js
// Loads vehicles, addresses, bookings from server after login.
// Maps DB snake_case → camelCase that the UI screens expect.
// ============================================================

const UserData = (() => {

  const VEHICLE_BG = ['#dbeafe', '#dcfce7', '#fef9c3', '#fee2e2', '#ede9fe', '#fff7ed'];

  function _authHeaders() {
    const token = (typeof Auth !== 'undefined' && Auth.getToken) ? Auth.getToken() : null;
    return token ? { Authorization: 'Bearer ' + token } : {};
  }

  async function _getJson(url) {
    const r = await fetch(url, { headers: _authHeaders() });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  }

  function _mapVehicle(v, idx) {
    return {
      id:        v.id,
      plate:     v.plate,
      model:     v.model || '',
      colour:    v.colour || '',
      icon:      v.icon || '🚗',
      isPrimary: !!v.is_primary,
      color:     VEHICLE_BG[idx % VEHICLE_BG.length],
    };
  }

  function _mapAddress(a) {
    // Derive city from the stored city column; fall back to last comma-segment of address
    const parts = (a.address || '').split(',').map(s => s.trim()).filter(Boolean);
    const city  = a.city || parts[parts.length - 1] || '';
    return {
      id:        a.id,
      label:     a.label,
      icon:      a.icon || '📍',
      address:   a.address,
      pincode:   a.pincode || '',
      isDefault: !!a.is_default,
      color:     '#dbeafe',
      lat:       a.lat  != null ? parseFloat(a.lat)  : null,
      lng:       a.lng  != null ? parseFloat(a.lng)  : null,
      city,
    };
  }

  // Center-app slot_date format is YYYY-MM-DD. Render as "12 May".
  function _formatDate(iso) {
    if (!iso) return '';
    const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const d = new Date(iso);
    if (isNaN(d)) return iso;
    return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
  }

  function _toEpoch(sqlTs) {
    if (!sqlTs) return Date.now();
    const t = Date.parse(String(sqlTs).replace(' ', 'T') + 'Z');
    return isNaN(t) ? Date.now() : t;
  }

  function _mapBooking(b) {
    const isCancelled = b.status === 'cancelled';
    const isDone      = b.status === 'done';
    return {
      id:           b.booking_ref,
      ref:          b.booking_ref,
      centerId:     'c' + b.center_id,
      centerName:   b.center_name || '—',
      washType:     b.wash_type,
      packageId:    null,
      packageName:  b.package_name,
      vehicleId:    null,
      vehiclePlate: b.vehicle_plate,
      vehicleModel: b.vehicle_model || '',
      date:         _formatDate(b.slot_date),
      slotDate:     b.slot_date,
      slot:         b.slot_time,
      status:       isDone ? 'completed' : isCancelled ? 'cancelled' : b.status,
      rawStatus:    b.status,
      totalPaid:    isDone ? (b.package_price - (b.app_discount || 0) - (b.center_discount || 0)) : 0,
      rating:       b.rating || null,
      reviewComment: b.review_comment || null,
      // Real timestamps used by the notifications inbox + booking history.
      _ts:          _toEpoch(b.updated_at || b.created_at),
    };
  }

  async function loadVehicles() {
    try {
      const j = await _getJson('/api/profile/vehicles');
      if (j && j.success) SAVED_VEHICLES = (j.data || []).map(_mapVehicle);
    } catch (e) { console.warn('loadVehicles:', e.message); }
  }

  async function loadAddresses() {
    try {
      const j = await _getJson('/api/profile/addresses');
      if (j && j.success) SAVED_ADDRESSES = (j.data || []).map(_mapAddress);
    } catch (e) { console.warn('loadAddresses:', e.message); }
  }

  async function loadBookings() {
    try {
      const j = await _getJson('/api/bookings');
      if (!j || !j.success) return;
      const all = (j.data || []).map(_mapBooking);
      PAST_BOOKINGS     = all.filter(b => b.rawStatus === 'done' || b.rawStatus === 'cancelled');
      UPCOMING_BOOKINGS = all.filter(b => !['done','cancelled'].includes(b.rawStatus));
      const upcoming = UPCOMING_BOOKINGS[0];
      if (upcoming) {
        AppState.confirmedBooking = {
          id:           upcoming.ref,
          centerId:     upcoming.centerId,
          centerName:   upcoming.centerName,
          packageName:  upcoming.packageName,
          date:         upcoming.date,
          slot:         upcoming.slot,
          duration:     null,
          totalPaid:    upcoming.totalPaid,
          collectAmount: upcoming.totalPaid,
          status:       upcoming.rawStatus,
        };
      } else {
        AppState.confirmedBooking = { id: null };
      }
      // Rebuild the notifications inbox from the fresh booking data.
      if (typeof NotifState !== 'undefined' && NotifState.rebuildFromData) {
        NotifState.rebuildFromData();
        if (typeof NotificationScreen !== 'undefined' && NotificationScreen._updateBadge) {
          NotificationScreen._updateBadge();
        }
      }
    } catch (e) { console.warn('loadBookings:', e.message); }
  }

  async function loadPromos() {
    try {
      const r = await fetch('/api/promos');
      const j = await r.json();
      if (j && j.success && Array.isArray(j.data)) {
        PROMO_CODES = j.data.map(p => ({
          code:               p.code,
          discount:           p.value,
          type:               p.type,
          title:              p.description || `${p.value}${p.type === 'percent' ? '%' : '₹'} off`,
          desc:               p.min_order > 0 ? `Minimum order ₹${p.min_order}` : '',
          applicable:         true,
          reason:             '✓ Available',
          notApplicableReason: null,
          minOrder:           p.min_order || 0,
        }));
      }
    } catch (e) { console.warn('loadPromos:', e.message); }
  }

  async function loadAll() {
    await Promise.all([loadVehicles(), loadAddresses(), loadBookings(), loadPromos()]);
  }

  // Shared post-login bootstrap: pulls user data, then applies the default
  // saved address to the home header + city filter. Called from both the
  // app boot path (existing session) and the fresh-login flow.
  async function initSession() {
    await loadAll();
    if (typeof ProfileScreen !== 'undefined' && ProfileScreen.updateMenuCounts) ProfileScreen.updateMenuCounts();
    if (typeof BookingScreen !== 'undefined' && BookingScreen.renderBookings)   BookingScreen.renderBookings();

    const defAddr = (typeof SAVED_ADDRESSES !== 'undefined')
      ? (SAVED_ADDRESSES.find(a => a.isDefault) || SAVED_ADDRESSES[0])
      : null;

    if (defAddr) {
      AppState.user.city = defAddr.city || '';
      if (typeof LocationModal !== 'undefined') {
        LocationModal._setLocation(defAddr.label, defAddr.city || defAddr.label, defAddr.lat, defAddr.lng);
        LocationModal._selectedId = defAddr.id;
        await LocationModal._applyCityFilter(defAddr.city || '');
      }
    } else {
      AppState.user.city = '';
      if (typeof HomeScreen !== 'undefined') HomeScreen.renderCenterCards(CENTERS);
      const locLabel = document.getElementById('location-label');
      if (locLabel) locLabel.textContent = 'Tap to select location';
      const locDot = document.getElementById('location-dot');
      if (locDot) locDot.style.background = '#f59e0b';
    }
  }

  // Fetch packages for a specific center; cached per-center on CENTER_PACKAGES.
  // Returns true if real packages were loaded, false if we fell back to defaults.
  async function loadCenterPackages(centerId) {
    try {
      const r = await fetch('/api/centers/' + encodeURIComponent(centerId) + '/packages');
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const j = await r.json();
      if (!j || !j.success) throw new Error('bad response');
      // Augment each package with the includes-shape expected by detail.js + summary.js.
      // Leave empty wash types empty — the UI shows a "no packages" message rather
      // than mixing demo data into real centers (which causes invalid package_id
      // booking errors and visual flicker).
      const augmented = {};
      ['water','dry','steam','d2d'].forEach(t => {
        augmented[t] = (j.data[t] || []).map(p => ({
          id:       String(p.id),
          name:     p.name,
          price:    p.price,
          duration: `${p.duration} min`,
          popular:  false,
          desc:     '',
          includes: (p.tasks || []).map(text => ({ icon: '✅', text })),
        }));
      });
      CENTER_PACKAGES = augmented;
      ACTIVE_PACKAGES = augmented;
      return true;
    } catch (e) {
      console.warn('loadCenterPackages:', e.message);
      CENTER_PACKAGES = null;
      ACTIVE_PACKAGES = PACKAGES;
      return false;
    }
  }

  return { loadAll, initSession, loadVehicles, loadAddresses, loadBookings, loadPromos, loadCenterPackages };

})();
