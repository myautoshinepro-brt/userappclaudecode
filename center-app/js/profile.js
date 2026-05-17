// Pitbay Center App — profile.js

const ProfileScreen = {
  render() {
    const c = AppState.center;
    if (!c) return;

    const avEl = document.getElementById('profile-avatar');
    if (avEl) avEl.textContent = AppState.initials;
    const nameEl = document.getElementById('profile-owner-name');
    if (nameEl) nameEl.textContent = c.owner_name;
    const centerEl = document.getElementById('profile-center-name');
    if (centerEl) centerEl.textContent = c.name;
    const mobEl = document.getElementById('profile-mobile');
    if (mobEl) mobEl.textContent = c.mobile;

    // Show masked account in profile menu subtitle
    const bankSub = document.getElementById('profile-bank-sub');
    if (bankSub) {
      bankSub.textContent = c.bank_account
        ? `${c.bank_name ? c.bank_name + ' · ' : ''}····${c.bank_account.slice(-4)} · ${c.ifsc || ''}`
        : 'Add account for Pitbay settlements';
      bankSub.style.color = c.bank_account ? 'var(--green)' : '';
    }
  },

  renderEditCenter() {
    const c = AppState.center;
    const el = document.getElementById('edit-center-body');
    if (!el || !c) return;

    const washTypes = ['water','dry','steam','d2d'];
    const selected  = (c.wash_types || '').split(',').map(w => w.trim());
    const cities = typeof SERVICEABLE_CITIES !== 'undefined' ? SERVICEABLE_CITIES : ['Mumbai'];
    const hasPendingCity = !!c.city_pending;

    const cityField = hasPendingCity
      ? `<input class="input-field" value="${c.city || ''}" disabled style="opacity:0.6;cursor:not-allowed">
         <div style="display:flex;align-items:center;gap:6px;margin-top:6px;background:#fef3c7;border-radius:8px;padding:8px 10px">
           <span style="font-size:14px">⏳</span>
           <div style="font-size:11px;color:#92400e;line-height:1.4">
             Change to <strong>${c.city_pending}</strong> is awaiting super admin approval.
             You cannot change city again until this is resolved.
           </div>
         </div>`
      : `<select id="ec-city" class="input-field">
           ${cities.map(city => `<option value="${city}" ${(c.city || '') === city ? 'selected' : ''}>${city}</option>`).join('')}
         </select>
         <div style="font-size:10px;color:var(--muted);margin-top:4px">City changes require super admin approval before going live on the customer app.</div>`;

    const hasGeo = c.lat != null && c.lng != null;
    el.innerHTML = `
      <div class="input-group">
        <div class="input-label">Center Name</div>
        <input id="ec-name" class="input-field" value="${c.name || ''}" placeholder="Center name">
      </div>
      <div class="input-group">
        <div class="input-label">Owner Name</div>
        <input id="ec-owner" class="input-field" value="${c.owner_name || ''}" placeholder="Owner name">
      </div>
      <div class="input-group">
        <div class="input-label">Email</div>
        <input id="ec-email" class="input-field" type="email" value="${c.email || ''}" placeholder="Email address">
      </div>

      <!-- ── Location section: GPS detect + draggable-pin map ── -->
      <div class="input-group">
        <div class="input-label">Center location</div>
        <button class="btn btn-primary btn-full" id="ec-geo-btn" onclick="ProfileScreen.detectGeo()"
                style="display:flex;align-items:center;justify-content:center;gap:8px;margin-top:4px">
          📡 Use my current location
        </button>
        <div id="ec-geo-status" style="font-size:11px;color:var(--muted);margin-top:6px;text-align:center">
          ${hasGeo ? `📍 ${Number(c.lat).toFixed(4)}, ${Number(c.lng).toFixed(4)} · drag pin to fine-tune` : 'Tap to capture GPS, or set pincode below'}
        </div>
        <div id="ec-geo-map" style="height:180px;border-radius:10px;overflow:hidden;margin-top:8px;border:1px solid var(--border);display:${hasGeo ? 'block' : 'none'}"></div>
      </div>

      <div class="input-group">
        <div class="input-label">City</div>
        ${cityField}
      </div>
      <div class="input-group">
        <div class="input-label">Pincode</div>
        <input id="ec-pincode" class="input-field" value="${c.pincode || ''}" placeholder="6-digit pincode" inputmode="numeric" maxlength="6"
               onblur="ProfileScreen.lookupPincode()">
      </div>
      <div class="input-group">
        <div class="input-label">Area / Locality</div>
        <input id="ec-area" class="input-field" value="${c.area || ''}" placeholder="e.g. Andheri West, Madeenaguda">
      </div>
      <div class="input-group">
        <div class="input-label">Address</div>
        <input id="ec-address" class="input-field" value="${c.address || ''}" placeholder="Full address">
      </div>
      <div class="input-group">
        <div class="input-label">GSTIN (optional)</div>
        <input id="ec-gstin" class="input-field" value="${c.gstin || ''}" placeholder="GST number">
      </div>
      <div class="input-group">
        <div class="input-label">Opening Time</div>
        <input id="ec-open" class="input-field" type="time" value="${c.open_time || '09:00'}">
      </div>
      <div class="input-group">
        <div class="input-label">Closing Time</div>
        <input id="ec-close" class="input-field" type="time" value="${c.close_time || '18:00'}">
      </div>
      <div class="input-group">
        <div class="input-label">Wash Types Offered</div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:6px">
          ${washTypes.map(wt => `
            <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px">
              <input type="checkbox" id="ec-wt-${wt}" ${selected.includes(wt) ? 'checked' : ''}>
              ${UI.washIcon(wt)} ${UI.washLabel(wt)}
            </label>`).join('')}
        </div>
      </div>
      <button class="btn btn-primary btn-full" id="save-center-btn" onclick="ProfileScreen.saveCenter()" style="margin-top:8px">
        Save Changes
      </button>
    `;

    // If we already have coords on file, draw the map (with draggable pin)
    // immediately so the owner sees their existing location.
    if (hasGeo) {
      // Save into a working buffer so dragging persists across re-renders.
      this._geoLat = Number(c.lat);
      this._geoLng = Number(c.lng);
      setTimeout(() => this._renderMap(this._geoLat, this._geoLng), 80);
    } else {
      this._geoLat = null;
      this._geoLng = null;
    }
  },

  // ── EDIT-CENTER: location helpers (mirror of Onboarding._getGeo etc.) ──

  _geoMap:    null,
  _geoMarker: null,
  _geoLat:    null,
  _geoLng:    null,

  async _getPosition() {
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Geolocation) {
      const { Geolocation } = window.Capacitor.Plugins;
      let perm = await Geolocation.checkPermissions();
      if (perm.location !== 'granted') {
        perm = await Geolocation.requestPermissions();
        if (perm.location !== 'granted') throw new Error('Location permission denied');
      }
      return Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 });
    }
    if (!navigator.geolocation) throw new Error('Geolocation not supported on this device');
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject,
        { enableHighAccuracy: true, timeout: 10000 });
    });
  },

  async detectGeo() {
    const btn    = document.getElementById('ec-geo-btn');
    const status = document.getElementById('ec-geo-status');
    const orig   = btn?.textContent;
    if (btn)    btn.textContent = '⏳ Detecting…';
    if (status) status.textContent = 'Detecting your location…';

    let pos;
    try { pos = await this._getPosition(); }
    catch (err) {
      if (btn) btn.textContent = orig || '📡 Use my current location';
      const denied = /denied|permission/i.test(err.message || '');
      if (status) {
        status.innerHTML = denied
          ? '⚠️ Location blocked — enable it in <b>Settings → Apps → Pitbay Center → Permissions</b>'
          : `⚠️ ${err.message || 'Could not get location'}`;
      }
      return;
    }

    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;
    this._geoLat = lat;
    this._geoLng = lng;

    if (status) status.textContent = 'Looking up address…';
    await this._fillFromCoords(lat, lng);
    this._renderMap(lat, lng);

    if (btn)    btn.textContent    = '✅ Location captured';
    if (status) status.textContent = `📍 ${lat.toFixed(4)}, ${lng.toFixed(4)} · drag pin to fine-tune`;
  },

  async _fillFromCoords(lat, lng) {
    try {
      const r = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
      );
      const j = await r.json();
      const a = j.address || {};

      const city = a.city || a.town || a.village || a.municipality || a.county || a.state_district || '';
      const pin  = a.postcode || '';
      const areaParts = [
        a.neighbourhood, a.suburb, a.city_district, a.hamlet, a.locality, a.quarter,
      ].map(x => (x || '').trim()).filter(Boolean);
      const seen = new Set();
      const area = areaParts.filter(p => {
        const k = p.toLowerCase();
        if (seen.has(k)) return false; seen.add(k); return true;
      }).join(', ');

      // Fill empty fields. Don't overwrite anything the owner has already
      // edited or what they had on file.
      const cityInp = document.getElementById('ec-city');
      const areaInp = document.getElementById('ec-area');
      const pinInp  = document.getElementById('ec-pincode');
      const addInp  = document.getElementById('ec-address');
      // City is a <select> — only set if the detected city is in the options.
      if (cityInp && cityInp.tagName === 'SELECT' && city) {
        const opt = Array.from(cityInp.options).find(o => o.value.toLowerCase() === city.toLowerCase());
        if (opt) cityInp.value = opt.value;
      } else if (cityInp && !cityInp.value.trim()) {
        cityInp.value = city;
      }
      if (areaInp && !areaInp.value.trim()) areaInp.value = area || city;
      if (pinInp  && !pinInp.value.trim())  pinInp.value  = pin;
      if (addInp  && !addInp.value.trim()) {
        const street = [a.house_number, a.road].filter(Boolean).join(', ');
        if (street) addInp.value = street;
      }
    } catch (e) { console.warn('reverse-geocode failed:', e.message); }
  },

  async lookupPincode() {
    const pin = document.getElementById('ec-pincode')?.value.trim();
    if (!/^\d{6}$/.test(pin)) return;
    try {
      const r = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&postalcode=${pin}&country=India&limit=1&addressdetails=1`
      );
      const j = await r.json();
      if (!j.length) return;
      const hit = j[0];
      const a = hit.address || {};
      const cityInp = document.getElementById('ec-city');
      const areaInp = document.getElementById('ec-area');
      if (cityInp && cityInp.tagName === 'SELECT' && a.city) {
        const opt = Array.from(cityInp.options).find(o => o.value.toLowerCase() === a.city.toLowerCase());
        if (opt) cityInp.value = opt.value;
      } else if (cityInp && !cityInp.value.trim()) {
        cityInp.value = a.city || a.town || a.state_district || '';
      }
      if (areaInp && !areaInp.value.trim()) {
        areaInp.value = a.suburb || a.neighbourhood || hit.display_name.split(',')[0].trim();
      }
      const lat = parseFloat(hit.lat), lng = parseFloat(hit.lon);
      if (!isNaN(lat) && !isNaN(lng) && this._geoLat == null) {
        this._geoLat = lat;
        this._geoLng = lng;
        this._renderMap(lat, lng);
        const status = document.getElementById('ec-geo-status');
        if (status) status.textContent = `📍 ${lat.toFixed(4)}, ${lng.toFixed(4)} · drag pin to fine-tune`;
      }
    } catch { /* silent */ }
  },

  _renderMap(lat, lng) {
    const container = document.getElementById('ec-geo-map');
    if (!container) return;
    container.style.display = 'block';
    if (typeof L === 'undefined') return;
    if (this._geoMap) { this._geoMap.remove(); this._geoMap = null; }

    this._geoMap = L.map('ec-geo-map', { zoomControl: true, attributionControl: false })
      .setView([lat, lng], 16);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(this._geoMap);

    this._geoMarker = L.marker([lat, lng], { draggable: true }).addTo(this._geoMap);
    this._geoMarker.on('dragend', async () => {
      const p = this._geoMarker.getLatLng();
      this._geoLat = p.lat;
      this._geoLng = p.lng;
      const status = document.getElementById('ec-geo-status');
      if (status) status.textContent = `📍 ${p.lat.toFixed(4)}, ${p.lng.toFixed(4)} · pin updated`;
      await this._fillFromCoords(p.lat, p.lng);
    });
    this._geoMap.on('click', e => {
      this._geoMarker.setLatLng(e.latlng);
      this._geoMarker.fire('dragend');
    });
    setTimeout(() => this._geoMap && this._geoMap.invalidateSize(), 80);
  },

  renderBankDetails() {
    const c = AppState.center;
    const el = document.getElementById('bank-details-body');
    if (!el || !c) return;

    const hasBankDetails = !!(c.bank_account && c.ifsc);

    el.innerHTML = `
      ${hasBankDetails ? `
        <div style="background:#f0fdf4;border-radius:12px;padding:14px 16px;margin-bottom:16px;display:flex;align-items:center;gap:12px">
          <span style="font-size:24px">✅</span>
          <div>
            <div style="font-weight:700;font-size:13px;color:var(--green)">Bank Account Linked</div>
            <div style="font-size:11px;color:#166534;margin-top:2px">Pitbay will credit settlements to this account</div>
          </div>
        </div>` : `
        <div style="background:#fef9c3;border-radius:12px;padding:14px 16px;margin-bottom:16px;display:flex;align-items:center;gap:12px">
          <span style="font-size:24px">⚠️</span>
          <div>
            <div style="font-weight:700;font-size:13px;color:#92400e">No Bank Account Added</div>
            <div style="font-size:11px;color:#78350f;margin-top:2px">Add your bank account to receive Pitbay promo settlements</div>
          </div>
        </div>`}

      <div class="input-group">
        <div class="input-label">Account Holder Name *</div>
        <div class="input-with-icon">
          <span class="input-ico">👤</span>
          <input id="bd-acname" class="input-field" type="text" placeholder="Name as per bank records"
            value="${c.account_name || ''}">
        </div>
      </div>
      <div class="input-group">
        <div class="input-label">Bank Name</div>
        <div class="input-with-icon">
          <span class="input-ico">🏛️</span>
          <input id="bd-bankname" class="input-field" type="text" placeholder="e.g. HDFC Bank, SBI, ICICI"
            value="${c.bank_name || ''}">
        </div>
      </div>
      <div class="input-group">
        <div class="input-label">Account Number *</div>
        <div class="input-with-icon">
          <span class="input-ico">🔢</span>
          <input id="bd-account" class="input-field" type="text" inputmode="numeric"
            placeholder="Enter account number" value="${c.bank_account || ''}">
        </div>
      </div>
      <div class="input-group">
        <div class="input-label">Confirm Account Number *</div>
        <div class="input-with-icon">
          <span class="input-ico">🔢</span>
          <input id="bd-account2" class="input-field" type="text" inputmode="numeric"
            placeholder="Re-enter to confirm" value="${c.bank_account || ''}">
        </div>
      </div>
      <div class="input-group">
        <div class="input-label">IFSC Code *</div>
        <div class="input-with-icon">
          <span class="input-ico">📋</span>
          <input id="bd-ifsc" class="input-field" type="text" maxlength="11"
            placeholder="e.g. HDFC0001234"
            oninput="this.value=this.value.toUpperCase()"
            value="${c.ifsc || ''}">
        </div>
        <div style="font-size:10px;color:var(--muted);margin-top:4px">11-character code printed on cheque/passbook</div>
      </div>

      ${hasBankDetails ? `
        <div class="card card-pad" style="margin-bottom:14px;background:#f8fafc">
          <div style="font-size:11px;font-weight:700;color:var(--muted);margin-bottom:8px">CURRENT ACCOUNT ON FILE</div>
          <div style="font-size:12px;display:grid;gap:5px">
            <div><span style="color:var(--muted)">Holder:</span> <strong>${c.account_name || '—'}</strong></div>
            <div><span style="color:var(--muted)">Bank:</span> ${c.bank_name || '—'}</div>
            <div><span style="color:var(--muted)">Account:</span> ····${(c.bank_account || '').slice(-4)}</div>
            <div><span style="color:var(--muted)">IFSC:</span> ${c.ifsc || '—'}</div>
          </div>
        </div>` : ''}

      <button class="btn btn-primary btn-full" id="save-bank-btn" onclick="ProfileScreen.saveBankDetails()">
        💾 Save Bank Details
      </button>
      <div style="font-size:10px;color:var(--muted);text-align:center;margin-top:10px;line-height:1.5">
        🔒 Your bank details are stored securely and only used for Pitbay promo credit settlements
      </div>
    `;
  },

  async saveBankDetails() {
    const acname   = document.getElementById('bd-acname')?.value?.trim();
    const bankname = document.getElementById('bd-bankname')?.value?.trim();
    const account  = document.getElementById('bd-account')?.value?.trim();
    const account2 = document.getElementById('bd-account2')?.value?.trim();
    const ifsc     = document.getElementById('bd-ifsc')?.value?.trim().toUpperCase();

    if (!acname)  { UI.toast('Account holder name is required'); return; }
    if (!account) { UI.toast('Account number is required'); return; }
    if (account !== account2) { UI.toast('Account numbers do not match'); return; }
    if (!ifsc)    { UI.toast('IFSC code is required'); return; }
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) { UI.toast('Enter a valid 11-character IFSC code'); return; }

    const btn = document.getElementById('save-bank-btn');
    UI.setLoading(btn, true);
    try {
      const res  = await fetch('/api/auth/bank-details', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${AppState.token}` },
        body: JSON.stringify({ account_name: acname, bank_name: bankname, bank_account: account, ifsc }),
      });
      const data = await res.json();
      if (!res.ok) { UI.toast(data.error || 'Failed to save'); return; }

      AppState.center.bank_account  = data.bank_account;
      AppState.center.ifsc          = data.ifsc;
      AppState.center.account_name  = data.account_name;
      AppState.center.bank_name     = data.bank_name;
      localStorage.setItem('sw_center_data', JSON.stringify(AppState.center));
      UI.toast('✅ Bank details saved');
      Router.back();
      ProfileScreen.render();
    } catch { UI.toast('Network error'); }
    finally  { UI.setLoading(btn, false); }
  },

  async saveCenter() {
    const washTypes = ['water','dry','steam','d2d']
      .filter(wt => document.getElementById(`ec-wt-${wt}`)?.checked)
      .join(',');
    if (!washTypes) { UI.toast('Select at least one wash type'); return; }

    const pincode = document.getElementById('ec-pincode')?.value?.trim();
    if (pincode && !/^\d{6}$/.test(pincode)) { UI.toast('Pincode must be 6 digits'); return; }

    const body = {
      name:       document.getElementById('ec-name')?.value?.trim(),
      owner_name: document.getElementById('ec-owner')?.value?.trim(),
      email:      document.getElementById('ec-email')?.value?.trim(),
      address:    document.getElementById('ec-address')?.value?.trim(),
      area:       document.getElementById('ec-area')?.value?.trim() || null,
      gstin:      document.getElementById('ec-gstin')?.value?.trim(),
      open_time:  document.getElementById('ec-open')?.value,
      close_time: document.getElementById('ec-close')?.value,
      wash_types: washTypes,
      pincode:    pincode || null,
      lat:        this._geoLat,
      lng:        this._geoLng,
    };
    const selectedCity = document.getElementById('ec-city')?.value;
    if (selectedCity) body.city = selectedCity;

    if (!body.name) { UI.toast('Center name is required'); return; }

    const btn = document.getElementById('save-center-btn');
    UI.setLoading(btn, true);
    try {
      const res  = await fetch('/api/auth/center', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${AppState.token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { UI.toast(data.error || 'Failed to save'); return; }

      Object.assign(AppState.center, body);
      if (data.cityChangePending) {
        AppState.center.city_pending = data.cityChangePending;
      }
      localStorage.setItem('sw_center_data', JSON.stringify(AppState.center));

      if (data.cityChangePending) {
        UI.toast(`✅ Info saved. City change to "${data.cityChangePending}" pending admin approval.`);
      } else {
        UI.toast('✅ Center info saved');
      }
      Router.back();
    } catch { UI.toast('Network error'); }
    finally  { UI.setLoading(btn, false); }
  },
};
