// ============================================================
// SparkWash Admin App — sync.js
// Fetches real centers + bookings from center-app's admin API
// and replaces the static demo arrays in data.js with live data.
// ============================================================

const AdminData = (() => {

  function _headers() {
    return { 'x-admin-key': ADMIN_API_KEY };
  }

  // DB row → admin-app CENTERS shape. Sensible defaults for fields
  // the DB doesn't store (rating, displayOrder, settlements, etc.).
  function _mapCenter(c, idx) {
    const washTypes = String(c.wash_types || '').split(',').map(s => s.trim()).filter(Boolean);
    const area      = String(c.address || '').split(',').pop().trim() || c.city || '';
    return {
      id:                'c' + c.id,
      _dbId:             c.id,
      name:              c.name,
      owner:             c.owner_name || '',
      phone:             c.mobile ? '+91 ' + c.mobile : '',
      area:              area + (c.city ? ', ' + c.city : ''),
      address:           c.address || '',
      gstin:             c.gstin || '',
      rating:            0,
      totalReviews:      0,
      isOpen:            !!c.is_open,
      washTypes,
      totalBookings:     0,    // filled in after bookings load
      activeNow:         0,    // filled in after bookings load
      todayRevenue:      0,    // filled in after bookings load
      visible:           true,
      displayOrder:      idx + 1,
      cityId:            'city1',
      pendingSettlement: 0,
      bankAccount:       c.bank_account || null,
      ifsc:              c.ifsc || null,
      accountName:       c.account_name || null,
      bankName:          c.bank_name || null,
    };
  }

  // Format slot_date (YYYY-MM-DD) to 'Today' / 'Yesterday' / 'DD MMM'.
  function _formatDate(iso) {
    if (!iso) return '';
    const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const today = new Date(); today.setHours(0,0,0,0);
    const d = new Date(iso);
    if (isNaN(d)) return iso;
    const day = new Date(d); day.setHours(0,0,0,0);
    const diffDays = Math.round((day - today) / 86400000);
    if (diffDays === 0)  return 'Today';
    if (diffDays === 1)  return 'Tomorrow';
    if (diffDays === -1) return 'Yesterday';
    return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
  }

  // DB row → admin-app ALL_BOOKINGS shape.
  function _mapBooking(b) {
    return {
      id:       b.booking_ref,
      centerId: 'c' + b.center_id,
      customer: b.customer_name,
      phone:    b.customer_phone ? b.customer_phone.replace(/(\d{5})(\d{5})/, '$1 $2') : '',
      vehicle:  b.vehicle_plate || '',
      model:    b.vehicle_model || '',
      type:     b.wash_type,
      pkg:      b.package_name,
      price:    b.package_price,
      slot:     b.slot_time,
      status:   b.status,
      date:     _formatDate(b.slot_date),
      slotDate: b.slot_date,
      rating:   b.rating || null,
    };
  }

  async function _fetchCenters() {
    const r = await fetch(`${CENTER_APP_URL}/api/admin/centers`, { headers: _headers() });
    if (!r.ok) throw new Error('centers HTTP ' + r.status);
    const j = await r.json();
    return (j.data || []).map(_mapCenter);
  }

  async function _fetchBookings() {
    const r = await fetch(`${CENTER_APP_URL}/api/admin/bookings`, { headers: _headers() });
    if (!r.ok) throw new Error('bookings HTTP ' + r.status);
    const j = await r.json();
    return (j.data || []).map(_mapBooking);
  }

  // Roll up per-center counts from the bookings list. Mutates `centers` in place.
  function _hydrateCenterStats(centers, bookings) {
    const today = bookings.filter(b => b.date === 'Today');
    for (const c of centers) {
      const own = today.filter(b => b.centerId === c.id);
      c.totalBookings = own.length;
      c.activeNow     = own.filter(b => ['arrived','washing'].includes(b.status)).length;
      c.todayRevenue  = own.filter(b => b.status === 'done').reduce((s, b) => s + (b.price || 0), 0);
    }
  }

  // Load both, replace the globals in place, and re-render the current screen.
  async function loadAll() {
    try {
      const [centers, bookings] = await Promise.all([_fetchCenters(), _fetchBookings()]);
      _hydrateCenterStats(centers, bookings);

      // Replace globals in place — they're declared with `let` in data.js so
      // we can reassign, but other modules captured a closure reference at
      // top level so splice-in-place is safer.
      CENTERS.length      = 0; centers.forEach(c => CENTERS.push(c));
      ALL_BOOKINGS.length = 0; bookings.forEach(b => ALL_BOOKINGS.push(b));

      console.log(`✅ AdminData loaded: ${centers.length} centers, ${bookings.length} bookings`);

      // Re-render whatever the user is currently looking at.
      const s = (typeof AppState !== 'undefined') ? AppState.screen : null;
      if (s === 'dashboard') AdminDashboard.render();
      else if (s === 'bookings') AdminBookings.render();
      else if (s === 'centers')  Centers.render();
      else if (s === 'reports')  AdminReports.render();
    } catch (e) {
      console.error('AdminData.loadAll failed:', e);
      UI?.toast?.('⚠️ Could not load live data — showing demo');
    }
  }

  return { loadAll };

})();
