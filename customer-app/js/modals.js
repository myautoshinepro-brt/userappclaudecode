// ============================================================
// Pitbay — modals.js
// Two reusable bottom-sheet modals:
//   • ReviewModal     — rate + comment + view + edit
//   • CenterInfoModal — tap any center name to see address/rating/etc.
// ============================================================

// ────────────────────────────────────────────────────────────
// ReviewModal — used from bookings list + my-reviews
// ────────────────────────────────────────────────────────────
const ReviewModal = (() => {
  let _ref = null;
  let _rating = 0;
  let _isEditing = false;

  function _setStars(n) {
    _rating = n;
    document.querySelectorAll('#review-stars span').forEach(el => {
      const v = parseInt(el.dataset.val, 10);
      el.textContent = v <= n ? '★' : '☆';
      el.classList.toggle('on', v <= n);
    });
    const lbl = document.getElementById('review-stars-label');
    if (lbl) {
      lbl.textContent = ({
        1: '😞 Poor', 2: '😐 Fair', 3: '🙂 Good', 4: '😀 Very good', 5: '🤩 Excellent',
      })[n] || 'Tap a star to rate';
    }
    const btn = document.getElementById('review-submit-btn');
    if (btn) btn.disabled = !n;
  }

  function pickStar(n) { _setStars(n); }

  function _wireCounter() {
    const input = document.getElementById('review-comment-input');
    const count = document.getElementById('review-char-count');
    if (!input || !count) return;
    const update = () => { count.textContent = String(input.value.length); };
    input.oninput = update;
    update();
  }

  // Open the modal for a booking. `booking` is the row from PAST_BOOKINGS or
  // any object with { ref, centerName, rating, reviewComment, packageName, date }.
  function open(booking) {
    if (!booking || !booking.ref) { UI.toast('⚠️ No booking selected'); return; }
    _ref = booking.ref;
    _isEditing = !!booking.rating;

    const title = document.getElementById('review-modal-title');
    const sub   = document.getElementById('review-modal-sub');
    const line  = document.getElementById('review-center-line');
    const input = document.getElementById('review-comment-input');
    const btn   = document.getElementById('review-submit-btn');

    if (title) title.textContent = _isEditing ? 'Edit your review' : 'Rate your wash';
    if (sub)   sub.textContent   = _isEditing ? 'Update your stars or comments' : 'How was your experience?';
    if (line)  line.textContent  = `${booking.centerName || 'Center'}${booking.date ? ' · ' + booking.date : ''}${booking.packageName ? ' · ' + booking.packageName : ''}`;
    if (input) input.value = booking.reviewComment || '';
    if (btn)   btn.textContent = _isEditing ? 'Update review' : 'Submit review';

    _setStars(booking.rating || 0);
    _wireCounter();

    const overlay = document.getElementById('review-modal');
    if (overlay) {
      overlay.style.display = 'flex';
      requestAnimationFrame(() => requestAnimationFrame(() => overlay.classList.add('open')));
    }
    setTimeout(() => document.getElementById('review-comment-input')?.focus(), 350);
  }

  function close() {
    const overlay = document.getElementById('review-modal');
    if (!overlay) return;
    overlay.classList.remove('open');
    setTimeout(() => { overlay.style.display = 'none'; }, 280);
  }

  function handleOverlayClick(e) {
    if (e.target.id === 'review-modal') close();
  }

  async function submit() {
    if (!_rating) { UI.toast('⚠️ Pick a star rating first'); return; }
    if (!_ref)    { UI.toast('⚠️ No booking selected'); return; }
    const comment = (document.getElementById('review-comment-input')?.value || '').trim();

    const btn = document.getElementById('review-submit-btn');
    if (btn) { btn.disabled = true; btn.dataset._t = btn.textContent; btn.textContent = _isEditing ? 'Updating…' : 'Submitting…'; }

    try {
      const r = await fetch(`/api/bookings/${encodeURIComponent(_ref)}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (Auth.getToken() || '') },
        body: JSON.stringify({ rating: _rating, comment }),
      });
      const j = await r.json();
      if (!r.ok || !j.success) throw new Error(j.error || 'Save failed');
      UI.toast(_isEditing ? '✅ Review updated' : '✅ Thanks for your review!');
      close();

      // Refresh anywhere the rating is displayed.
      if (typeof UserData !== 'undefined') await UserData.loadBookings();
      if (typeof BookingScreen !== 'undefined') BookingScreen.renderBookings();
      if (typeof ProfileScreen !== 'undefined' && ProfileScreen.renderMyReviews) ProfileScreen.renderMyReviews();
    } catch (e) {
      UI.toast('❌ ' + e.message);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = btn.dataset._t || 'Submit review'; }
    }
  }

  return { open, close, handleOverlayClick, pickStar, submit };
})();


// ────────────────────────────────────────────────────────────
// CenterInfoModal — tap any center name to see details
// ────────────────────────────────────────────────────────────
const CenterInfoModal = (() => {
  let _center = null;

  function _findCenter(idOrName) {
    if (!idOrName) return null;
    const list = (typeof CENTERS !== 'undefined') ? CENTERS : [];
    return list.find(c => c.id === idOrName)
        || list.find(c => (c.name || '').toLowerCase() === String(idOrName).toLowerCase())
        || null;
  }

  // Accepts either a center id, a center name, or a full center object.
  function open(target) {
    let c = (target && typeof target === 'object' && target.name) ? target : _findCenter(target);
    if (!c) {
      // Fallback shell with just a name so the user gets some feedback.
      c = { name: String(target || 'Center'), area: '', city: '', tags: [], lat: null, lng: null };
    }
    _center = c;

    _setText('ci-name', c.name || '—');
    _setText('ci-rating', c.rating ? `★ ${c.rating} (${c.reviews || 0})` : '★ —');
    _setText('ci-status', c.open ? 'Open' + (c.openTill ? ` · till ${c.openTill}` : '') : 'Closed');
    _setText('ci-dist',   c.distance ? `📍 ${c.distance} km` : (c.area || ''));
    _setText('ci-area',   c.area || c.address || '—');
    _setText('ci-city',   c.city || '');

    const tagsEl = document.getElementById('ci-tags');
    if (tagsEl) {
      const tags = Array.isArray(c.tags) ? c.tags : [];
      tagsEl.innerHTML = tags.length
        ? tags.map(t => `<span class="ci-tag">${t.charAt(0).toUpperCase() + t.slice(1)}</span>`).join('')
        : '';
    }

    const priceEl = document.getElementById('ci-price-row');
    if (priceEl) priceEl.innerHTML = c.priceFrom != null ? `Starting from <b>₹${c.priceFrom}</b>` : '';

    const overlay = document.getElementById('center-info-modal');
    if (overlay) {
      overlay.style.display = 'flex';
      requestAnimationFrame(() => requestAnimationFrame(() => overlay.classList.add('open')));
    }
  }

  function close() {
    const overlay = document.getElementById('center-info-modal');
    if (!overlay) return;
    overlay.classList.remove('open');
    setTimeout(() => { overlay.style.display = 'none'; }, 280);
  }

  function handleOverlayClick(e) {
    if (e.target.id === 'center-info-modal') close();
  }

  function openBooking() {
    if (!_center) return;
    close();
    setTimeout(() => {
      if (typeof HomeScreen !== 'undefined' && HomeScreen.openCenter) HomeScreen.openCenter(_center.id);
    }, 280);
  }

  function navigate() {
    if (!_center) return;
    close();
    setTimeout(() => {
      if (typeof BookingScreen !== 'undefined' && BookingScreen.navigateToCenter) {
        BookingScreen.navigateToCenter(_center.id, _center.name);
      }
    }, 280);
  }

  return { open, close, handleOverlayClick, openBooking, navigate };
})();
