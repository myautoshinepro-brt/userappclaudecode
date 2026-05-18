// ============================================================
// Pitbay — profile.js
// Profile screen + all sub-screens
// ============================================================

const ProfileScreen = {

  init() {
    this.updateDisplay();
    this.updateMenuCounts();
    this.initCityDropdown();
  },

  initCityDropdown() {
    const dropdown = document.getElementById('addr-city');
    if (!dropdown) return;
    dropdown.innerHTML = '<option value="" disabled selected>Select city</option>';
    if (typeof SERVICEABLE_CITIES !== 'undefined') {
      SERVICEABLE_CITIES.forEach(city => {
        const opt = document.createElement('option');
        opt.value = city;
        opt.textContent = city;
        dropdown.appendChild(opt);
      });
    }
  },

  checkCityServiceability() {
    const dropdown = document.getElementById('addr-city');
    const msgEl = document.getElementById('city-service-msg');
    if (!dropdown || !msgEl) return;
    const city = dropdown.value;
    const isServiceable = typeof SERVICEABLE_CITIES !== 'undefined' && SERVICEABLE_CITIES.includes(city);
    if (city && !isServiceable) {
      msgEl.textContent = `There is no service in ${city} at present. We will try to launch soon!`;
      msgEl.style.display = 'block';
    } else {
      msgEl.style.display = 'none';
    }
  },

  updateMenuCounts() {
    const upcoming  = typeof UPCOMING_BOOKINGS !== 'undefined' ? UPCOMING_BOOKINGS.length : 0;
    const past      = typeof PAST_BOOKINGS !== 'undefined' ? PAST_BOOKINGS.length : 0;
    const reviews   = (typeof PAST_BOOKINGS !== 'undefined' ? PAST_BOOKINGS : []).filter(b => b.rating).length;
    const promos    = typeof PROMO_CODES !== 'undefined' ? PROMO_CODES.length : 0;
    const vehicles  = typeof SAVED_VEHICLES !== 'undefined' ? SAVED_VEHICLES : [];
    const addresses = typeof SAVED_ADDRESSES !== 'undefined' ? SAVED_ADDRESSES : [];

    _setText('menu-sub-bookings',
      upcoming ? `${upcoming} upcoming · ${past} past` : past ? `${past} completed` : 'No bookings yet');
    _setText('menu-sub-reviews',
      reviews ? `${reviews} center${reviews !== 1 ? 's' : ''} rated` : 'No reviews yet');
    _setText('menu-sub-promos',
      promos ? `${promos} active code${promos !== 1 ? 's' : ''}` : 'No active codes');
    _setText('menu-sub-vehicles',
      vehicles.length ? vehicles.map(v => v.plate).slice(0, 2).join(' · ') : 'No vehicles saved');
    _setText('menu-sub-addresses',
      addresses.length ? addresses.map(a => a.label).slice(0, 3).join(' · ') : 'No addresses saved');
  },

  updateDisplay() {
    const u = AppState.user;
    _setText('profile-name',    u.name || '');
    _setText('profile-phone',   [u.phone, u.city].filter(Boolean).join(' · '));
    _setText('profile-email',   u.email || '');
    _setText('profile-initials', u.initials || '??');
    _setText('edit-initials',   u.initials || '??');
    const inp = document.getElementById('inp-name');
    if (inp) inp.value = u.name || '';
    const inpEmail = document.getElementById('inp-email');
    if (inpEmail) inpEmail.value = u.email || '';
    const phoneRO = document.getElementById('inp-phone-readonly');
    if (phoneRO) phoneRO.value = u.phone || '';
  },

  // ── EDIT PROFILE ──

  async saveProfile() {
    const name  = document.getElementById('inp-name')?.value.trim();
    const email = document.getElementById('inp-email')?.value.trim();
    if (!name || name.length < 2) { UI.toast('⚠️ Enter your full name'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '')) {
      UI.toast('⚠️ Enter a valid email address'); return;
    }
    const btn = document.querySelector('#sc-edit-profile button.btn-green');
    if (btn) { btn.disabled = true; btn.dataset._t = btn.textContent; btn.textContent = 'Saving…'; }

    try {
      const r = await fetch('/api/profile/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (Auth.getToken() || '') },
        body: JSON.stringify({ full_name: name, email }),
      });
      const j = await r.json();
      if (!r.ok || !j.success) throw new Error(j.error || 'Save failed');
      AppState.setAuthUser(j.data);
      this.updateDisplay();
      UI.toast('✅ Profile updated!');
      setTimeout(() => Router.back(), 900);
    } catch (e) {
      UI.toast('❌ ' + e.message);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = btn.dataset._t || 'Save changes'; }
    }
  },

  // ── CHANGE PHONE / OTP ──

  _pendingPhone: null,

  async sendOTP() {
    const ph = document.getElementById('inp-phone')?.value.trim();
    if (!/^[6-9]\d{9}$/.test(ph || '')) {
      UI.toast('⚠️ Enter a valid 10-digit Indian mobile number'); return;
    }
    const btn = document.querySelector('#sc-change-phone .btn-primary');
    if (btn) { btn.disabled = true; btn.dataset._t = btn.textContent; btn.textContent = 'Sending…'; }
    try {
      const r = await fetch('/api/profile/change-phone/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (Auth.getToken() || '') },
        body: JSON.stringify({ mobile: ph }),
      });
      const j = await r.json();
      if (!r.ok || !j.success) throw new Error(j.error || 'Could not send OTP');

      this._pendingPhone = ph;
      _setText('otp-phone-display', ph);
      document.getElementById('otp-section').style.display = 'block';
      // Clear any prior OTP digits
      [1,2,3,4].forEach(i => { const el = document.getElementById('otp'+i); if (el) el.value = ''; });
      document.getElementById('otp1')?.focus();

      if (j.devOtp) UI.toast(`📱 OTP: ${j.devOtp}`);
      else UI.toast(`📱 OTP sent to +91 ${ph}`);
    } catch (e) {
      UI.toast('❌ ' + e.message);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = btn.dataset._t || 'Send OTP'; }
    }
  },

  otpNext(el, nextId) {
    el.value = (el.value || '').replace(/\D/g, '').slice(0, 1);
    if (el.value && nextId) document.getElementById(nextId)?.focus();
  },

  async verifyOTP() {
    const otp = [1,2,3,4].map(i => document.getElementById('otp'+i)?.value || '').join('');
    if (otp.length < 4) { UI.toast('⚠️ Enter complete OTP'); return; }
    if (!this._pendingPhone) { UI.toast('⚠️ Send OTP first'); return; }

    const btn = document.querySelector('#sc-change-phone .btn-green');
    if (btn) { btn.disabled = true; btn.dataset._t = btn.textContent; btn.textContent = 'Verifying…'; }
    try {
      const r = await fetch('/api/profile/change-phone/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (Auth.getToken() || '') },
        body: JSON.stringify({ mobile: this._pendingPhone, otp }),
      });
      const j = await r.json();
      if (!r.ok || !j.success) throw new Error(j.error || 'Could not verify OTP');

      AppState.setAuthUser(j.data);
      this.updateDisplay();
      this._pendingPhone = null;
      UI.toast('✅ Phone number updated!');
      setTimeout(() => Router.back(), 900);
    } catch (e) {
      UI.toast('❌ ' + e.message);
      // Clear OTP boxes so the user can re-enter
      [1,2,3,4].forEach(i => { const el = document.getElementById('otp'+i); if (el) el.value = ''; });
      document.getElementById('otp1')?.focus();
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = btn.dataset._t || 'Verify & update'; }
    }
  },

  // ── ADDRESSES ──

  editingAddressId: null,

  renderAddresses() {
    const list = document.getElementById('addr-list');
    if (!list) return;
    if (LoadStatus.addresses.error && !SAVED_ADDRESSES.length) {
      list.innerHTML = _loadErrorHTML(LoadStatus.addresses.error,
        'UserData.loadAddresses().then(()=>ProfileScreen.renderAddresses())');
      return;
    }
    if (!SAVED_ADDRESSES.length) {
      list.innerHTML = `<div style="padding:14px 12px;font-size:11px;color:var(--text-secondary);text-align:center">No saved addresses yet.</div>`;
      return;
    }
    list.innerHTML = SAVED_ADDRESSES.map(a => `
      <div class="addr-card-saved ${a.isDefault ? 'selected' : ''}" id="addr-${a.id}"
           onclick="ProfileScreen.setDefaultAddress(${a.id})"
           style="display:flex;align-items:center;gap:9px;padding:10px 12px;border:${a.isDefault ? '1.5px solid var(--blue)' : '.5px solid var(--border-light)'};border-radius:12px;margin-bottom:7px;cursor:pointer;background:${a.isDefault ? '#f0f7ff' : 'var(--bg-primary)'}">
        <div style="width:34px;height:34px;border-radius:9px;background:${a.color};display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0">${a.icon}</div>
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:6px">
            <div style="font-size:12px;font-weight:700;color:var(--text-primary)">${a.label}</div>
            ${a.isDefault ? '<div class="badge badge-default">Default</div>' : ''}
          </div>
          <div style="font-size:10px;color:var(--text-secondary);margin-top:1px">${a.address}${a.pincode ? ' · ' + a.pincode : ''}</div>
        </div>
        <div style="display:flex;gap:2px;flex-shrink:0">
          <span onclick="event.stopPropagation();ProfileScreen.editAddress(${a.id})" style="font-size:14px;color:var(--blue);cursor:pointer;padding:4px 6px">✏️</span>
          <span onclick="event.stopPropagation();ProfileScreen.removeAddress(${a.id})" style="font-size:14px;color:var(--red);cursor:pointer;padding:4px 6px">🗑️</span>
        </div>
      </div>
    `).join('');
  },

  editAddress(id) {
    const a = SAVED_ADDRESSES.find(x => x.id === id);
    if (!a) return;
    this.editingAddressId = id;

    // Pre-populate the city dropdown
    const cityEl = document.getElementById('addr-city');
    if (cityEl && a.city) cityEl.value = a.city;

    // Pre-populate address into area field
    const areaEl = document.getElementById('addr-area');
    if (areaEl) areaEl.value = a.address || '';

    // Pre-populate pincode
    const pinEl = document.getElementById('addr-pincode');
    if (pinEl) pinEl.value = a.pincode || '';

    // Pre-populate lat/lng
    const latEl = document.getElementById('addr-lat');
    const lngEl = document.getElementById('addr-lng');
    if (latEl) latEl.value = a.lat || '';
    if (lngEl) lngEl.value = a.lng || '';

    // Set label chip
    const iconToLabel = { '🏠': 'home2', '🏢': 'work' };
    this.pickAddressLabel(iconToLabel[a.icon] || 'other');

    // Update screen title and button text
    const titleEl = document.getElementById('add-addr-title');
    const btnEl   = document.getElementById('add-addr-save-btn');
    if (titleEl) titleEl.textContent = 'Edit address';
    if (btnEl)   btnEl.textContent   = 'Update address';

    Router.go('add-address');
  },

  async setDefaultAddress(id) {
    try {
      const r = await fetch(`/api/profile/addresses/${id}/default`, {
        method: 'PATCH',
        headers: { Authorization: 'Bearer ' + (Auth.getToken() || '') },
      });
      if (!r.ok) throw new Error('Save failed');
      await UserData.loadAddresses();
      this.renderAddresses();
      UI.toast('✅ Set as default');
    } catch (e) {
      UI.toast('❌ ' + e.message);
    }
  },

  async removeAddress(id) {
    if (!confirm('Remove this address?')) return;
    try {
      const r = await fetch(`/api/profile/addresses/${id}`, {
        method: 'DELETE',
        headers: { Authorization: 'Bearer ' + (Auth.getToken() || '') },
      });
      if (!r.ok) throw new Error('Delete failed');
      await UserData.loadAddresses();
      this.renderAddresses();
      UI.toast('🗑️ Address removed');
    } catch (e) {
      UI.toast('❌ ' + e.message);
    }
  },

  addrLabelActive: 'home2',

  pickAddressLabel(label) {
    this.addrLabelActive = label;
    ['home2','work','other'].forEach(x => {
      const el = document.getElementById('lbl-' + x);
      if (!el) return;
      const on = x === label;
      el.style.background    = on ? 'var(--blue)' : 'transparent';
      el.style.color         = on ? '#fff' : 'var(--text-secondary)';
      el.style.borderColor   = on ? 'var(--blue)' : 'var(--border-medium)';
    });
  },

  // Capacitor when on device, browser geolocation when testing in a desktop
  // browser. Keeps add-address usable in both environments.
  async _getCurrentPosition() {
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Geolocation) {
      const { Geolocation } = window.Capacitor.Plugins;
      const perm = await Geolocation.checkPermissions();
      if (perm.location !== 'granted') {
        const req = await Geolocation.requestPermissions();
        if (req.location !== 'granted') throw new Error('Location permission denied');
      }
      return Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 });
    }
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) return reject(new Error('Geolocation not supported'));
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
      });
    });
  },

  async detectAddressGPS() {
    const btn = document.getElementById('addr-gps-btn');
    if (btn) btn.textContent = '📡 Detecting…';

    let pos;
    try {
      pos = await this._getCurrentPosition();
    } catch (err) {
      console.error('GPS Error:', err);
      if (btn) btn.textContent = '📍 Detect GPS';
      UI.toast('⚠️ ' + (err.message || 'Could not get location'));
      return;
    }

    const { latitude: lat, longitude: lng } = pos.coords;

    // Store coords in hidden inputs
    const latInp = document.getElementById('addr-lat');
    const lngInp = document.getElementById('addr-lng');
    if (latInp) latInp.value = lat;
    if (lngInp) lngInp.value = lng;

    // Reverse geocode to fill area/city/pin/road
    try {
      const r = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
      );
      const j = await r.json();
      const a = j.address || {};

      const city = a.city || a.town || a.village || a.municipality || a.county || a.state_district || '';
      const pin  = a.postcode || '';
      const road = a.road || '';
      const houseNumber = a.house_number || '';

      // Combine colony + suburb when both exist so addresses like
      // "Mithri Nagar, Madeenaguda" come through complete. Dedupe, keep order.
      const areaParts = [
        a.neighbourhood, a.suburb, a.city_district, a.hamlet, a.locality, a.quarter,
      ].map(x => (x || '').trim()).filter(Boolean);
      const areaSeen = new Set();
      const area = areaParts.filter(p => {
        const k = p.toLowerCase();
        if (areaSeen.has(k)) return false;
        areaSeen.add(k);
        return true;
      }).join(', ');

      const areaInp = document.getElementById('addr-area');
      if (areaInp) areaInp.value = area || city;

      const flatInp = document.getElementById('addr-flat');
      if (flatInp) flatInp.value = [houseNumber, road].filter(Boolean).join(', ');

      const pinInp = document.getElementById('addr-pincode');
      if (pinInp) pinInp.value = pin;

      const cityInp = document.getElementById('addr-city');
      if (cityInp) {
        // If city isn't in the dropdown, add it so the value sticks and the
        // serviceability hint can render.
        if (city && !Array.from(cityInp.options).some(opt => opt.value === city)) {
          const opt = document.createElement('option');
          opt.value = city;
          opt.textContent = city;
          cityInp.appendChild(opt);
        }
        cityInp.value = city;
        this.checkCityServiceability();
      }

      if (btn) btn.textContent = '✅ ' + (area || city || 'Location set');
      UI.toast('📍 Location detected!');
    } catch (err) {
      console.warn('Geocode error:', err);
      if (btn) btn.textContent = '📍 Detect GPS';
      UI.toast('⚠️ Got coordinates but could not fetch address details');
    }
  },

  async geocodePincodeField() {
    const pin = document.getElementById('addr-pincode')?.value.trim();
    if (!/^\d{6}$/.test(pin)) return;
    try {
      const r = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&postalcode=${pin}&country=India&limit=1&addressdetails=1`
      );
      const j = await r.json();
      if (!j.length) return;
      const hit = j[0];
      const a = hit.address || {};

      const areaInp = document.getElementById('addr-area');
      if (areaInp && !areaInp.value.trim()) {
        areaInp.value = a.suburb || a.neighbourhood || a.city_district
                     || hit.display_name.split(',')[0].trim();
      }
      const latInp = document.getElementById('addr-lat');
      const lngInp = document.getElementById('addr-lng');
      if (latInp) latInp.value = hit.lat;
      if (lngInp) lngInp.value = hit.lon;

      // Auto-set the city dropdown if we got one and the field is empty.
      const city = a.city || a.town || a.state_district || '';
      const cityInp = document.getElementById('addr-city');
      if (cityInp && !cityInp.value && city) {
        if (!Array.from(cityInp.options).some(opt => opt.value === city)) {
          const opt = document.createElement('option');
          opt.value = city;
          opt.textContent = city;
          cityInp.appendChild(opt);
        }
        cityInp.value = city;
        this.checkCityServiceability();
      }
    } catch { /* silent */ }
  },

  async saveAddress() {
    // Re-entrancy guard — without this, an impatient double-tap creates two
    // identical addresses on the server.
    if (this._savingAddress) return;

    const city     = document.getElementById('addr-city')?.value;
    const area     = document.getElementById('addr-area')?.value.trim();
    const flat     = document.getElementById('addr-flat')?.value.trim();
    const landmark = document.getElementById('addr-landmark')?.value.trim();
    const pincode  = document.getElementById('addr-pincode')?.value.trim();
    const lat      = document.getElementById('addr-lat')?.value || null;
    const lng      = document.getElementById('addr-lng')?.value || null;

    if (!city) { UI.toast('⚠️ Please select a city'); return; }
    if (!area) { UI.toast('⚠️ Please enter area / locality'); return; }

    // Block saving if city is not serviceable
    if (typeof SERVICEABLE_CITIES !== 'undefined' && !SERVICEABLE_CITIES.includes(city)) {
       UI.toast(`❌ No service in ${city} yet`); return;
    }

    const LABELS = { home2: { label: 'Home', icon: '🏠' }, work: { label: 'Office', icon: '🏢' }, other: { label: 'Other', icon: '📍' } };
    const choice = LABELS[this.addrLabelActive] || LABELS.other;
    const fullAddress = [flat, area, landmark].filter(Boolean).join(', ');
    const isEditing = this.editingAddressId != null;
    // Capture the editing id BEFORE we clear it later — needed when locating
    // the just-saved row in SAVED_ADDRESSES after the reload.
    const editingIdSnap = this.editingAddressId;

    const saveBtn = document.getElementById('add-addr-save-btn');
    if (saveBtn) { saveBtn.disabled = true; saveBtn.dataset._t = saveBtn.textContent; saveBtn.textContent = 'Saving…'; }
    this._savingAddress = true;

    try {
      const url    = isEditing ? `/api/profile/addresses/${this.editingAddressId}` : '/api/profile/addresses';
      const method = isEditing ? 'PUT' : 'POST';
      const r = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (Auth.getToken() || '') },
        body: JSON.stringify({ label: choice.label, icon: choice.icon, address: fullAddress, pincode, lat, lng, city }),
      });
      const j = await r.json();
      if (!r.ok || !j.success) throw new Error(j.error || 'Save failed');
      this.editingAddressId = null;
      const titleEl = document.getElementById('add-addr-title');
      const btnEl   = document.getElementById('add-addr-save-btn');
      if (titleEl) titleEl.textContent = 'Add new address';
      if (btnEl)   btnEl.textContent   = 'Save address';
      await UserData.loadAddresses();
      ['addr-area','addr-flat','addr-landmark','addr-pincode'].forEach(id => {
        const inp = document.getElementById(id);
        if (inp) inp.value = '';
      });
      UI.toast(isEditing ? '✅ Address updated!' : '✅ Address saved!');

      // Activate the just-saved address on the home screen. The backend's
      // addAddress() marks the FIRST address as default automatically, so a
      // brand-new user gets their first address selected without an extra
      // tap. For subsequent adds we still activate this address as the
      // current location (without changing the server-side default — the
      // user can promote it from the addresses list later if they want).
      // SAVED_ADDRESSES is sorted by id ASC after loadAddresses(), so the
      // just-saved row is the last one.
      const target = isEditing
        ? SAVED_ADDRESSES.find(a => a.id === editingIdSnap) || SAVED_ADDRESSES[SAVED_ADDRESSES.length - 1]
        : (SAVED_ADDRESSES.find(a => a.isDefault) || SAVED_ADDRESSES[SAVED_ADDRESSES.length - 1]);
      if (target && typeof LocationModal !== 'undefined') {
        // Rename to targetCity to avoid shadowing the outer `city` from the form.
        let targetCity = (target.city || '').trim();
        if (!targetCity && target.lat != null && target.lng != null) {
          try { targetCity = (await LocationModal._reverseGeocode(target.lat, target.lng)).city || ''; }
          catch { /* keep empty */ }
        }
        LocationModal._selectedId = target.id;
        // Single call: _setLocation accepts explicit city, sets AppState,
        // and returns the filter promise. Was previously _setLocation
        // (which text-detected wrong) + _applyCityFilter (correct) = 2
        // calls to /api/centers per save.
        await LocationModal._setLocation(target.label, targetCity || target.label, target.lat, target.lng, targetCity || '');
        if (typeof MapView !== 'undefined') {
          if (target.lat != null && target.lng != null) MapView.centerOn(target.lat, target.lng);
          else if (targetCity) MapView.centerOnCity(targetCity);
        }
      }

      // Where to go next — based on where the user came from:
      //  - mid-booking (summary in history)  →  back to summary so the booking flow continues
      //  - opened add-address from HOME      →  back to home with the new/edited address active
      //  - opened add-address from ADDRESSES →  back to addresses list (managing addresses)
      //  - otherwise (first-time user, no history yet) → home
      //
      // The screen *immediately before* add-address tells us the user's intent.
      // history[length-1] is the most-recently-pushed entry, which is the
      // screen they were on when they tapped "Add new address".
      const cameFromSummary   = Router.history.includes('summary');
      const previousScreen    = Router.history[Router.history.length - 1] || '';
      const cameFromAddresses = previousScreen === 'addresses';
      setTimeout(() => {
        if (cameFromSummary)        Router.back();
        else if (cameFromAddresses) Router.go('addresses');
        else                        Router.go('home', false);
      }, 800);
    } catch (e) {
      UI.toast('❌ ' + e.message);
    } finally {
      this._savingAddress = false;
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = saveBtn.dataset._t || (isEditing ? 'Update address' : 'Save address');
      }
    }
  },

  // ── VEHICLES ──

  renderVehicles() {
    const list = document.getElementById('veh-list');
    if (!list) return;
    if (LoadStatus.vehicles.error && !SAVED_VEHICLES.length) {
      list.innerHTML = _loadErrorHTML(LoadStatus.vehicles.error,
        'UserData.loadVehicles().then(()=>ProfileScreen.renderVehicles())');
      return;
    }
    if (!SAVED_VEHICLES.length) {
      list.innerHTML = `
        <div style="padding:24px 16px;text-align:center;border:1px dashed var(--border-medium);border-radius:12px;margin-bottom:8px">
          <div style="font-size:30px;margin-bottom:6px">🚗</div>
          <div style="font-size:12px;font-weight:700;color:var(--text-primary);margin-bottom:3px">No vehicles saved yet</div>
          <div style="font-size:11px;color:var(--text-secondary)">Add your first vehicle below.</div>
        </div>`;
      return;
    }
    list.innerHTML = SAVED_VEHICLES.map(v => `
      <div class="vehicle-card">
        <div style="width:38px;height:38px;border-radius:9px;background:${v.color};display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">${v.icon}</div>
        <div style="flex:1">
          <div class="vehicle-plate">${v.plate}</div>
          <div class="vehicle-model">${v.model || ''}${v.colour ? ' · ' + v.colour : ''}</div>
          ${v.isPrimary
            ? '<div style="font-size:9px;background:#e8f5e9;color:#2e7d32;padding:1px 7px;border-radius:7px;display:inline-block;margin-top:3px;font-weight:700">Primary</div>'
            : `<div onclick="ProfileScreen.makePrimaryVehicle(${v.id})" style="font-size:10px;color:var(--blue);cursor:pointer;font-weight:600;margin-top:3px;display:inline-block">Make primary</div>`}
        </div>
        <div style="display:flex;gap:6px;flex-shrink:0">
          <span onclick="ProfileScreen.editVehicle(${v.id})" style="font-size:16px;color:var(--blue);cursor:pointer;padding:4px 6px">✏️</span>
          <span onclick="ProfileScreen.removeVehicle(${v.id})" style="font-size:16px;color:var(--red);cursor:pointer;padding:4px 6px">🗑️</span>
        </div>
      </div>
    `).join('');
  },

  editingVehicleId: null,

  editVehicle(id) {
    const v = SAVED_VEHICLES.find(x => String(x.id) === String(id));
    if (!v) return;
    this.editingVehicleId = id;
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
    set('inp-vreg',    v.plate);
    set('inp-vmodel',  v.model);
    set('inp-vcolour', v.colour);
    const btn = document.querySelector('#sc-vehicles .btn-green');
    if (btn) btn.textContent = 'Update vehicle';
    // Scroll the form into view (the form is below the list).
    document.getElementById('inp-vreg')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    UI.toast('✏️ Editing ' + v.plate);
  },

  async addVehicle() {
    const plate  = document.getElementById('inp-vreg')?.value.trim();
    const model  = document.getElementById('inp-vmodel')?.value.trim();
    const colour = document.getElementById('inp-vcolour')?.value.trim();
    if (!plate) { UI.toast('⚠️ Enter registration number'); return; }
    if (this._savingVehicle) return;

    const isEditing = this.editingVehicleId != null;
    const btn = document.querySelector('#sc-vehicles .btn-green');
    if (btn) { btn.disabled = true; btn.dataset._t = btn.textContent; btn.textContent = isEditing ? 'Updating…' : 'Adding…'; }
    this._savingVehicle = true;

    try {
      // Backend only exposes POST + DELETE for vehicles today. For "edit" we
      // delete the old row and add a new one so the user perceives an update
      // without needing a new server endpoint right now.
      if (isEditing) {
        const delR = await fetch(`/api/profile/vehicles/${this.editingVehicleId}`, {
          method: 'DELETE',
          headers: { Authorization: 'Bearer ' + (Auth.getToken() || '') },
        });
        if (!delR.ok) throw new Error('Could not update vehicle');
      }
      const r = await fetch('/api/profile/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (Auth.getToken() || '') },
        body: JSON.stringify({ plate, model, colour }),
      });
      const j = await r.json();
      if (!r.ok || !j.success) throw new Error(j.error || 'Save failed');

      await UserData.loadVehicles();
      this.renderVehicles();
      ['inp-vreg','inp-vmodel','inp-vcolour'].forEach(id => {
        const inp = document.getElementById(id);
        if (inp) inp.value = '';
      });
      this.editingVehicleId = null;
      UI.toast(isEditing ? '✅ Vehicle updated: ' + plate : '✅ Vehicle added: ' + plate);
      if (Router.history.includes('summary')) {
        setTimeout(() => Router.back(), 600);
      }
    } catch (e) {
      UI.toast('❌ ' + e.message);
    } finally {
      this._savingVehicle = false;
      if (btn) {
        btn.disabled = false;
        btn.textContent = btn.dataset._t || (isEditing ? 'Update vehicle' : 'Add vehicle');
        // Reset button label back to "Add vehicle" after a successful edit
        if (!this.editingVehicleId) btn.textContent = 'Add vehicle';
      }
    }
  },

  async removeVehicle(id) {
    if (!confirm('Remove this vehicle?')) return;
    try {
      const r = await fetch(`/api/profile/vehicles/${id}`, {
        method: 'DELETE',
        headers: { Authorization: 'Bearer ' + (Auth.getToken() || '') },
      });
      if (!r.ok) throw new Error('Delete failed');
      await UserData.loadVehicles();
      this.renderVehicles();
      UI.toast('🗑️ Vehicle removed');
    } catch (e) {
      UI.toast('❌ ' + e.message);
    }
  },

  // ── MY REVIEWS (rendered from real bookings with rating != null) ──

  renderMyReviews() {
    const list = document.getElementById('my-reviews-list');
    if (!list) return;
    const reviews = (typeof PAST_BOOKINGS !== 'undefined' ? PAST_BOOKINGS : [])
      .filter(b => b.rating)
      .sort((a, b) => (b.slotDate || '').localeCompare(a.slotDate || ''));

    if (!reviews.length) {
      list.innerHTML = `
        <div style="padding:32px 16px;text-align:center;color:var(--text-secondary);font-size:11px">
          You haven't rated any washes yet. After a wash completes, you'll be able to leave a review here.
        </div>`;
      return;
    }
    list.innerHTML = reviews.map(b => {
      const full   = '★'.repeat(b.rating);
      const empty  = '<span style="color:var(--text-tertiary)">' + '★'.repeat(5 - b.rating) + '</span>';
      const wash   = WASH_TYPES.find(t => t.key === b.washType)?.name || b.washType;
      const cmt    = b.reviewComment ? `<div style="font-size:11px;color:var(--text-secondary);margin-top:6px;line-height:1.5">"${b.reviewComment.replace(/"/g, '&quot;')}"</div>` : '';
      const bJson = encodeURIComponent(JSON.stringify({
        ref: b.ref, centerName: b.centerName, packageName: b.packageName,
        date: b.date, rating: b.rating, reviewComment: b.reviewComment || '',
      }));
      return `
        <div class="review-card">
          <div style="display:flex;justify-content:space-between;align-items:flex-start">
            <div style="font-size:12px;font-weight:700;color:var(--text-primary);cursor:pointer" onclick="CenterInfoModal.open('${(b.centerId||'').replace(/'/g,"\\'")}')">${b.centerName}</div>
            <div class="review-stars">${full}${empty}</div>
          </div>
          <div style="font-size:10px;color:var(--text-secondary);margin-top:1px">${b.date} · ${wash}${b.packageName ? ' · ' + b.packageName : ''}</div>
          ${cmt}
          <div style="text-align:right;margin-top:6px">
            <span onclick="BookingScreen._openReview('${bJson}')" style="font-size:10px;color:var(--blue);font-weight:600;cursor:pointer">✏️ Edit review</span>
          </div>
        </div>`;
    }).join('');
  },

  // ── MY PROMOS (rendered from /api/promos loaded into PROMO_CODES) ──

  renderMyPromos() {
    const list = document.getElementById('my-promo-list');
    if (!list) return;
    const promos = (typeof PROMO_CODES !== 'undefined' ? PROMO_CODES : []);

    if (LoadStatus.promos.error && !promos.length) {
      list.innerHTML = _loadErrorHTML(LoadStatus.promos.error,
        'UserData.loadPromos().then(()=>ProfileScreen.renderMyPromos())');
      return;
    }
    if (!promos.length) {
      list.innerHTML = `
        <div style="padding:24px 16px;text-align:center;color:var(--text-secondary);font-size:11px">
          No active promo codes right now. Check back later!
        </div>`;
      return;
    }
    list.innerHTML = promos.map(p => `
      <div class="promo-code-card">
        <div>
          <div class="promo-code-name">${p.code}</div>
          <div class="promo-code-desc">${p.title}${p.minOrder ? ' · Min ₹' + p.minOrder : ''}</div>
        </div>
        <div class="promo-code-badge">Available</div>
      </div>`).join('');
  },

  async makePrimaryVehicle(id) {
    try {
      const r = await fetch(`/api/profile/vehicles/${id}/primary`, {
        method: 'PATCH',
        headers: { Authorization: 'Bearer ' + (Auth.getToken() || '') },
      });
      if (!r.ok) throw new Error('Update failed');
      await UserData.loadVehicles();
      this.renderVehicles();
      UI.toast('✅ Primary vehicle updated');
    } catch (e) {
      UI.toast('❌ ' + e.message);
    }
  },

  // ── PROMO CODES ──

  // Validate a user-typed promo code against the real promos loaded on boot.
  // We don't have a 'wallet' table on the server, so we just confirm the code
  // exists and is active — it'll apply at booking time via the server.
  addPromoCode() {
    const val = document.getElementById('profile-promo-input')?.value.trim().toUpperCase();
    const msgEl = document.getElementById('profile-promo-msg');
    if (!val) return;

    const promo = (typeof PROMO_CODES !== 'undefined' ? PROMO_CODES : []).find(p => p.code === val);
    if (!promo) {
      if (msgEl) { msgEl.style.color = 'var(--red)'; msgEl.textContent = '❌ Invalid or expired code.'; msgEl.style.display = 'block'; }
      return;
    }
    const container = document.getElementById('extra-promo-codes');
    if (container) {
      container.innerHTML += `
        <div class="promo-code-card">
          <div><div class="promo-code-name">${promo.code}</div><div class="promo-code-desc">${promo.title}${promo.minOrder ? ' · Min ₹' + promo.minOrder : ''}</div></div>
          <div class="promo-code-badge">Added ✓</div>
        </div>`;
    }
    const inp = document.getElementById('profile-promo-input');
    if (inp) inp.value = '';
    if (msgEl) msgEl.style.display = 'none';
    UI.toast('✅ Code ' + val + ' is valid · apply it at checkout');
  },

  // ── LANGUAGE ──

  setLanguage(lang, code) {
    ['en','hi','mr','gu'].forEach(x => {
      const card = document.getElementById('lang-' + x);
      const chk  = document.getElementById('lang-check-' + x);
      if (card) { card.classList.remove('selected'); card.style.borderColor = ''; card.style.background = ''; }
      if (chk)  chk.textContent = '';
    });
    const sel = document.getElementById('lang-' + code);
    const selChk = document.getElementById('lang-check-' + code);
    if (sel) { sel.classList.add('selected'); sel.style.borderColor = 'var(--blue)'; sel.style.background = '#f0f7ff'; }
    if (selChk) selChk.textContent = '✓';

    AppState.user.language = lang;
    _setText('lang-sub-label', lang);
    UI.toast('🌐 Language set to ' + lang);
  },

  // ── LOGOUT ──

  logout() {
    if (confirm('Log out of Pitbay?')) {
      Auth.logout();
    }
  },

  // Called by AppState.setAuthUser() to refresh header after login
  refreshHeader() {
    this.updateDisplay();
  },
};
