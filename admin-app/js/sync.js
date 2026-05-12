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
  // the DB doesn't store (rating, settlements, cityId).
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
      visible:           c.visible == null ? true : !!c.visible,
      displayOrder:      c.display_order || (idx + 1),
      cityId:            'city1',
      pendingSettlement: 0,
      bankAccount:       c.bank_account || null,
      ifsc:              c.ifsc || null,
      accountName:       c.account_name || null,
      bankName:          c.bank_name || null,
    };
  }

  // ── Mutations that the super-admin screens call ──────────────

  async function _patch(path, body) {
    const r = await fetch(`${CENTER_APP_URL}${path}`, {
      method:  'PATCH',
      headers: { ..._headers(), 'Content-Type': 'application/json' },
      body:    JSON.stringify(body || {}),
    });
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      throw new Error(j.error || `HTTP ${r.status}`);
    }
    return r.json();
  }

  async function setVisibility(dbCenterId, visible) {
    return _patch(`/api/admin/centers/${dbCenterId}/visibility`, { visible });
  }
  async function setDisplayOrder(dbCenterId, order) {
    return _patch(`/api/admin/centers/${dbCenterId}/display-order`, { display_order: order });
  }
  async function swapDisplayOrder(dbCenterIdA, dbCenterIdB) {
    return _patch(`/api/admin/centers/${dbCenterIdA}/display-order`, { swap_with: dbCenterIdB });
  }
  async function setOpenStatus(dbCenterId, isOpen) {
    return _patch(`/api/admin/centers/${dbCenterId}/open-status`, { is_open: isOpen });
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

  // SQLite returns 'YYYY-MM-DD HH:MM:SS' — convert to epoch ms (UTC-ish).
  function _toEpoch(sqlTs) {
    if (!sqlTs) return Date.now();
    const t = Date.parse(String(sqlTs).replace(' ', 'T') + 'Z');
    return isNaN(t) ? Date.now() : t;
  }

  // DB row → admin-app ALL_BOOKINGS shape. Extra fields (createdAt, appDiscount,
  // reviewComment) are carried through so we can derive reviews / settlements / feeds.
  function _mapBooking(b) {
    return {
      id:            b.booking_ref,
      centerId:      'c' + b.center_id,
      customer:      b.customer_name,
      phone:         b.customer_phone ? b.customer_phone.replace(/(\d{5})(\d{5})/, '$1 $2') : '',
      vehicle:       b.vehicle_plate || '',
      model:         b.vehicle_model || '',
      type:          b.wash_type,
      pkg:           b.package_name,
      price:         b.package_price,
      slot:          b.slot_time,
      status:        b.status,
      date:          _formatDate(b.slot_date),
      slotDate:      b.slot_date,
      rating:        b.rating || null,
      reviewComment: b.review_comment || null,
      appDiscount:   b.app_discount || 0,
      centerDiscount:b.center_discount || 0,
      createdAt:     _toEpoch(b.created_at),
      updatedAt:     _toEpoch(b.updated_at),
      _centerName:   b.center_name || '',
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
      const own         = today.filter(b => b.centerId === c.id);
      const reviewsForC = bookings.filter(b => b.centerId === c.id && b.rating);
      c.totalBookings   = own.length;
      c.activeNow       = own.filter(b => ['arrived','washing'].includes(b.status)).length;
      c.todayRevenue    = own.filter(b => b.status === 'done').reduce((s, b) => s + (b.price || 0), 0);
      c.totalReviews    = reviewsForC.length;
      c.rating          = reviewsForC.length
        ? Math.round((reviewsForC.reduce((s, b) => s + b.rating, 0) / reviewsForC.length) * 10) / 10
        : 0;
      c.pendingSettlement = bookings
        .filter(b => b.centerId === c.id && b.status === 'done' && b.appDiscount > 0)
        .reduce((s, b) => s + b.appDiscount, 0);
    }
  }

  // ── DERIVED ARRAYS ───────────────────────────────────────────

  function _deriveReviews(bookings) {
    return bookings
      .filter(b => b.rating)
      .map(b => ({
        id:            'rv-' + b.id,
        centerId:      b.centerId,
        customerName:  b.customer,
        bookingId:     b.id,
        rating:        b.rating,
        comment:       b.reviewComment || '',
        ts:            b.updatedAt,
        status:        'active',
      }))
      .sort((a, b) => b.ts - a.ts);
  }

  function _deriveSettlements(bookings, centers) {
    const centerById = Object.fromEntries(centers.map(c => [c.id, c]));
    return bookings
      .filter(b => b.status === 'done' && b.appDiscount > 0)
      .map(b => ({
        id:           'st-' + b.id,
        centerId:     b.centerId,
        centerName:   centerById[b.centerId]?.name || b._centerName,
        bookingRef:   b.id,
        customer:     b.customer,
        washType:     b.type,
        packageName:  b.pkg,
        packagePrice: b.price,
        appDiscount:  b.appDiscount,
        washDate:     b.slotDate,
        status:       'pending',           // no real settlement run yet
        settledAt:    null,
        creditedOn:   null,
      }))
      .sort((a, b) => (b.washDate || '').localeCompare(a.washDate || ''));
  }

  // Recent bookings → activity feed (newest first, capped).
  function _deriveActivity(bookings, centers) {
    const centerName = id => (centers.find(c => c.id === id)?.name) || '';
    return bookings
      .slice()
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 12)
      .map(b => {
        let icon = '🆕', text = '', type = 'booking';
        if (b.status === 'done')           { icon = '✨'; text = `Booking ${b.id} completed`; type = 'done'; }
        else if (b.status === 'cancelled') { icon = '❌'; text = `Booking ${b.id} cancelled`; type = 'cancel'; }
        else if (b.status === 'arrived')   { icon = '🚗'; text = `Customer arrived — ${b.id}`; type = 'arrived'; }
        else if (b.status === 'washing')   { icon = '🔄'; text = `Wash in progress — ${b.id}`; type = 'progress'; }
        else                                { icon = '🆕'; text = `New booking ${b.id} — ${centerName(b.centerId)}`; }
        return {
          icon, text, type,
          sub:  `${b.customer} · ₹${b.price} · ${b.slot}`,
          time: _relativeTime(b.createdAt),
        };
      });
  }

  // Last 8 bookings, with read state persisted in localStorage.
  function _deriveNotifications(bookings, centers) {
    const READ_KEY = 'sw_notif_read';
    const read = new Set(JSON.parse(localStorage.getItem(READ_KEY) || '[]'));
    const centerName = id => (centers.find(c => c.id === id)?.name) || '';
    return bookings
      .slice()
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 8)
      .map(b => {
        let icon = '🆕', title = `New booking ${b.id}`;
        if (b.rating)                       { icon = '⭐'; title = `${b.rating}★ review received`; }
        else if (b.status === 'done')       { icon = '✨'; title = `Booking ${b.id} completed`; }
        else if (b.status === 'arrived')    { icon = '🚗'; title = `Customer arrived — ${b.id}`; }
        else if (b.status === 'cancelled')  { icon = '❌'; title = `Booking ${b.id} cancelled`; }
        return {
          id:     b.id,
          icon,
          title,
          body:   `${b.customer} · ${centerName(b.centerId)} · ${b.pkg} · ₹${b.price}`,
          time:   b.createdAt,
          read:   read.has(b.id),
          action: 'bookings',
        };
      });
  }

  function _relativeTime(ts) {
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60)     return 'just now';
    if (diff < 3600)   return Math.floor(diff / 60) + ' min ago';
    if (diff < 86400)  return Math.floor(diff / 3600) + ' hr ago';
    return Math.floor(diff / 86400) + ' d ago';
  }

  // Load both, replace the globals in place, and re-render the current screen.
  async function loadAll() {
    try {
      const [centers, bookings] = await Promise.all([_fetchCenters(), _fetchBookings()]);
      _hydrateCenterStats(centers, bookings);

      const reviews       = _deriveReviews(bookings);
      const settlements   = _deriveSettlements(bookings, centers);
      const activity      = _deriveActivity(bookings, centers);
      const notifications = _deriveNotifications(bookings, centers);

      // Replace globals in place — they're declared with `let` / `const` in
      // data.js but the array references are shared, so we splice the new
      // contents in rather than reassigning (which other captured references
      // wouldn't see).
      CENTERS.length        = 0; centers.forEach(c       => CENTERS.push(c));
      ALL_BOOKINGS.length   = 0; bookings.forEach(b      => ALL_BOOKINGS.push(b));
      REVIEWS.length        = 0; reviews.forEach(r       => REVIEWS.push(r));
      SETTLEMENTS.length    = 0; settlements.forEach(s   => SETTLEMENTS.push(s));
      NOTIFICATIONS.length  = 0; notifications.forEach(n => NOTIFICATIONS.push(n));
      // ACTIVITY_FEED is declared const in data.js but still an array — splice works.
      ACTIVITY_FEED.length  = 0; activity.forEach(a      => ACTIVITY_FEED.push(a));

      console.log(
        `✅ AdminData loaded: ${centers.length} centers, ${bookings.length} bookings, ` +
        `${reviews.length} reviews, ${settlements.length} settlements`
      );

      // Re-render whatever the user is currently looking at.
      const s = (typeof AppState !== 'undefined') ? AppState.screen : null;
      if (s === 'dashboard')             AdminDashboard.render();
      else if (s === 'bookings')         AdminBookings.render();
      else if (s === 'centers')          Centers.render();
      else if (s === 'reports')          AdminReports.render();
      else if (s === 'customers')        CustomersScreen.render();
      else if (s === 'settlements')      SettlementsScreen.render();
      else if (s === 'notifications')    NotificationsScreen.render();
      else if (s === 'super')            SuperAdmin.render();
    } catch (e) {
      console.error('AdminData.loadAll failed:', e);
      UI?.toast?.('⚠️ Could not load live data — showing demo');
    }
  }

  // Persist read-state when a notification is opened. Called externally.
  function markNotificationRead(id) {
    const KEY = 'sw_notif_read';
    const set = new Set(JSON.parse(localStorage.getItem(KEY) || '[]'));
    set.add(id);
    localStorage.setItem(KEY, JSON.stringify([...set]));
  }

  return {
    loadAll,
    markNotificationRead,
    setVisibility, setDisplayOrder, swapDisplayOrder, setOpenStatus,
  };

})();
