// Pitbay Center App — onboarding.js

const Onboarding = {
  _step: 1,
  _data: {},

  start(mobile) {
    this._step = 1;
    this._data = { mobile: mobile || '', center_images: [], certificates: [], wash_types: 'water,dry' };
    Router.go('onboard');
  },

  render() {
    this._renderStep(this._step);
  },

  _labels: ['Basic Info', 'Location', 'Wash Types', 'Photos & Docs', 'Bank & GST'],

  _renderStep(step) {
    const labels = this._labels;
    const dots = labels.map((s, i) => {
      const done    = i + 1 < step;
      const current = i + 1 === step;
      const bg      = done ? 'var(--green)' : current ? 'var(--navy)' : 'var(--border)';
      const fg      = done || current ? '#fff' : 'var(--muted)';
      const cursor  = done ? 'pointer' : 'default';
      const click   = done ? `onclick="Onboarding._goToStep(${i + 1})"` : '';
      const sep     = i < labels.length - 1
        ? `<div style="flex:0 0 10px;height:1px;background:${done ? 'var(--green)' : 'var(--border)'};margin-top:11px"></div>`
        : '';
      return `
        <div ${click} style="flex:1;text-align:center;cursor:${cursor}">
          <div style="width:22px;height:22px;border-radius:50%;margin:0 auto 3px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;background:${bg};color:${fg}">
            ${done ? '✓' : i + 1}
          </div>
          <div style="font-size:8px;color:${current ? 'var(--navy)' : 'var(--muted)'};font-weight:${current ? '700' : '400'};white-space:nowrap">${s}</div>
        </div>${sep}`;
    }).join('');

    const area = document.getElementById('onboard-form-area');
    if (!area) return;
    area.innerHTML = `<div style="display:flex;gap:0;margin-bottom:20px">${dots}</div>` + this._stepForm(step);
  },

  _stepForm(step) {
    const d = this._data;

    // ── Step 1: Basic Info ─────────────────────────────────────
    if (step === 1) return `
      <div class="input-group">
        <div class="input-label">Center Name *</div>
        <div class="input-with-icon"><span class="input-ico">🏪</span>
          <input id="ob-name" class="input-field" type="text" placeholder="e.g. AutoSpa Andheri" value="${d.name || ''}">
        </div>
        <div id="ob-err-name" style="color:#dc2626;font-size:11px;margin-top:3px;display:none"></div>
      </div>
      <div class="input-group">
        <div class="input-label">Owner / Contact Person *</div>
        <div class="input-with-icon"><span class="input-ico">👤</span>
          <input id="ob-owner" class="input-field" type="text" placeholder="Full name" value="${d.owner_name || ''}">
        </div>
        <div id="ob-err-owner" style="color:#dc2626;font-size:11px;margin-top:3px;display:none"></div>
      </div>
      <div class="input-group">
        <div class="input-label">Mobile Number *</div>
        <div class="input-with-icon"><span class="input-ico">📱</span>
          <input id="ob-mobile" class="input-field" type="tel" maxlength="10" placeholder="10-digit mobile"
            oninput="this.value=this.value.replace(/\\D/g,'')" value="${d.mobile || ''}">
        </div>
        <div id="ob-err-mobile" style="color:#dc2626;font-size:11px;margin-top:3px;display:none"></div>
      </div>
      <div class="input-group">
        <div class="input-label">Email Address</div>
        <div class="input-with-icon"><span class="input-ico">📧</span>
          <input id="ob-email" class="input-field" type="email" placeholder="center@email.com" value="${d.email || ''}">
        </div>
        <div id="ob-err-email" style="color:#dc2626;font-size:11px;margin-top:3px;display:none"></div>
      </div>
      <button class="btn btn-primary btn-full" onclick="Onboarding._next1()">Next →</button>`;

    // ── Step 2: Location ───────────────────────────────────────
    if (step === 2) return `
      <div class="input-group">
        <button class="btn btn-primary btn-full" onclick="Onboarding._getGeo()" id="ob-geo-btn"
                style="display:flex;align-items:center;justify-content:center;gap:8px">
          📡 Use my current location
        </button>
        <div id="ob-geo-status" style="font-size:11px;color:var(--muted);margin-top:6px;text-align:center">
          ${d.geo_lat ? `✅ ${d.geo_lat.toFixed(4)}, ${d.geo_lng.toFixed(4)}` : 'GPS will auto-fill the fields below'}
        </div>
      </div>
      <div id="ob-geo-map" style="height:180px;border-radius:10px;overflow:hidden;margin-bottom:14px;border:1px solid var(--border);display:${d.geo_lat ? 'block' : 'none'}"></div>
      <div id="ob-geo-hint" style="font-size:10px;color:var(--muted);margin-bottom:14px;display:${d.geo_lat ? 'block' : 'none'};text-align:center">
        Drag the pin to fine-tune your center's exact location
      </div>
      <div class="input-group">
        <div class="input-label">Pincode *</div>
        <div class="input-with-icon"><span class="input-ico">📮</span>
          <input id="ob-pincode" class="input-field" type="tel" inputmode="numeric" maxlength="6"
                 placeholder="6-digit pincode" value="${d.pincode || ''}"
                 onblur="Onboarding._lookupPincode()">
        </div>
        <div id="ob-err-pincode" style="color:#dc2626;font-size:11px;margin-top:3px;display:none"></div>
      </div>
      <div class="input-group">
        <div class="input-label">City *</div>
        <div class="input-with-icon"><span class="input-ico">🏙️</span>
          <input id="ob-city" class="input-field" type="text" placeholder="e.g. Mumbai" value="${d.city || ''}">
        </div>
        <div id="ob-err-city" style="color:#dc2626;font-size:11px;margin-top:3px;display:none"></div>
      </div>
      <div class="input-group">
        <div class="input-label">Area / Locality *</div>
        <div class="input-with-icon"><span class="input-ico">🛣️</span>
          <input id="ob-area" class="input-field" type="text" placeholder="e.g. Andheri West, Madeenaguda" value="${d.area || ''}">
        </div>
        <div id="ob-err-area" style="color:#dc2626;font-size:11px;margin-top:3px;display:none"></div>
      </div>
      <div class="input-group">
        <div class="input-label">Full Address *</div>
        <div class="input-with-icon"><span class="input-ico">📍</span>
          <input id="ob-address" class="input-field" type="text" placeholder="Shop no, street, landmark" value="${d.address || ''}">
        </div>
        <div id="ob-err-address" style="color:#dc2626;font-size:11px;margin-top:3px;display:none"></div>
      </div>
      <div style="display:flex;gap:8px;margin-top:8px">
        <button class="btn btn-ghost" style="flex:1" onclick="Onboarding._prev()">← Back</button>
        <button class="btn btn-primary" style="flex:2" onclick="Onboarding._next2()">Next →</button>
      </div>`;

    // ── Step 3: Wash Types ─────────────────────────────────────
    if (step === 3) {
      const selected = (d.wash_types || '').split(',').filter(Boolean);
      const types = [
        { id: 'water', icon: '💧', label: 'Water Wash',   sub: '₹149–549' },
        { id: 'dry',   icon: '🧴', label: 'Dry Wash',     sub: '₹149–399' },
        { id: 'steam', icon: '♨️', label: 'Steam Wash',   sub: '₹349–799' },
        { id: 'd2d',   icon: '🚗', label: 'Door-to-Door', sub: '₹299–899' },
      ];
      return `
        <div style="font-size:12px;color:var(--muted);margin-bottom:12px">Select the wash types your center offers: *</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">
          ${types.map(w => {
            const on = selected.includes(w.id);
            return `
              <div id="ob-wcard-${w.id}" onclick="Onboarding._toggleWash('${w.id}')"
                style="border:2px solid ${on ? 'var(--navy)' : 'var(--border)'};border-radius:12px;padding:14px 10px;cursor:pointer;text-align:center;transition:border-color .15s;background:${on ? '#eff6ff' : '#fff'}">
                <div style="font-size:26px;margin-bottom:4px">${w.icon}</div>
                <div style="font-size:12px;font-weight:700;color:var(--text-primary)">${w.label}</div>
                <div style="font-size:10px;color:var(--muted)">${w.sub}</div>
              </div>`;
          }).join('')}
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-ghost" style="flex:1" onclick="Onboarding._prev()">← Back</button>
          <button class="btn btn-primary" style="flex:2" onclick="Onboarding._next3()">Next →</button>
        </div>`;
    }

    // ── Step 4: Photos & Documents ─────────────────────────────
    if (step === 4) {
      const imgs  = d.center_images || [];
      const certs = d.certificates  || [];
      const imgPreviews = imgs.map((src, i) => `
        <div style="position:relative;width:72px;height:72px">
          <img src="${src}" style="width:72px;height:72px;object-fit:cover;border-radius:8px;border:1px solid var(--border)">
          <button onclick="Onboarding._removeImage(${i})"
            style="position:absolute;top:-6px;right:-6px;width:18px;height:18px;border-radius:50%;background:var(--red);color:#fff;border:none;font-size:10px;cursor:pointer;display:flex;align-items:center;justify-content:center;line-height:1">×</button>
        </div>`).join('');
      const addBtn = imgs.length < 4 ? `
        <label style="width:72px;height:72px;border:2px dashed var(--border);border-radius:8px;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;gap:2px;font-size:10px;color:var(--muted)">
          📷<span>Add</span>
          <input type="file" accept="image/*" style="display:none" onchange="Onboarding._addImage(this)">
        </label>` : '';
      const certList = certs.map((c, i) => `
        <div style="display:flex;align-items:center;gap:8px;background:var(--surface);border-radius:8px;padding:8px 10px">
          <span>📄</span>
          <div style="flex:1;font-size:11px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${c.name}</div>
          <button onclick="Onboarding._removeCert(${i})" style="background:none;border:none;color:var(--red);font-size:16px;cursor:pointer;line-height:1">×</button>
        </div>`).join('');
      return `
        <div class="input-group">
          <div class="input-label">Center Photos <span style="color:var(--muted);font-weight:400">(up to 4)</span></div>
          <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:6px">
            ${imgPreviews}${addBtn}
          </div>
          <div style="font-size:10px;color:var(--muted)">Photos help customers trust your center</div>
        </div>
        <div class="input-group" style="margin-top:14px">
          <div class="input-label">Business Documents</div>
          <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:8px">${certList}</div>
          <label class="btn btn-ghost btn-full" style="cursor:pointer;justify-content:center">
            📎 Upload Certificate / Document
            <input type="file" accept=".pdf,.jpg,.jpeg,.png" style="display:none" onchange="Onboarding._addCert(this)">
          </label>
          <div style="font-size:10px;color:var(--muted);margin-top:4px">GST certificate, trade license, business registration, etc.</div>
        </div>
        <div style="display:flex;gap:8px;margin-top:14px">
          <button class="btn btn-ghost" style="flex:1" onclick="Onboarding._prev()">← Back</button>
          <button class="btn btn-primary" style="flex:2" onclick="Onboarding._next4()">Next →</button>
        </div>`;
    }

    // ── Step 5: Bank & GST ─────────────────────────────────────
    if (step === 5) return `
      <div style="background:#fef9c3;border-radius:10px;padding:10px 12px;margin-bottom:14px;font-size:11px;color:#92400e">
        💡 Bank & GST details are needed for settlements. You can update them in settings later too.
      </div>
      <div class="input-group">
        <div class="input-label">GSTIN <span style="color:var(--muted);font-weight:400">(optional)</span></div>
        <div class="input-with-icon"><span class="input-ico">🧾</span>
          <input id="ob-gstin" class="input-field" type="text" placeholder="22AAAAA0000A1Z5" maxlength="15"
            oninput="this.value=this.value.toUpperCase()" value="${d.gstin || ''}">
        </div>
        <div id="ob-err-gstin" style="color:#dc2626;font-size:11px;margin-top:3px;display:none"></div>
      </div>
      <div class="input-group">
        <div class="input-label">Bank Name</div>
        <div class="input-with-icon"><span class="input-ico">🏦</span>
          <input id="ob-bankname" class="input-field" type="text" placeholder="e.g. HDFC Bank" value="${d.bank_name || ''}">
        </div>
      </div>
      <div class="input-group">
        <div class="input-label">Account Holder Name</div>
        <div class="input-with-icon"><span class="input-ico">👤</span>
          <input id="ob-acname" class="input-field" type="text" placeholder="Name as per bank" value="${d.account_name || ''}">
        </div>
      </div>
      <div class="input-group">
        <div class="input-label">Account Number</div>
        <div class="input-with-icon"><span class="input-ico">🔢</span>
          <input id="ob-account" class="input-field" type="text" placeholder="Account number" value="${d.bank_account || ''}">
        </div>
      </div>
      <div class="input-group">
        <div class="input-label">IFSC Code</div>
        <div class="input-with-icon"><span class="input-ico">📋</span>
          <input id="ob-ifsc" class="input-field" type="text" placeholder="e.g. HDFC0001234" maxlength="11"
            oninput="this.value=this.value.toUpperCase()" value="${d.ifsc || ''}">
        </div>
        <div id="ob-err-ifsc" style="color:#dc2626;font-size:11px;margin-top:3px;display:none"></div>
      </div>
      <div style="display:flex;gap:8px;margin-top:8px">
        <button class="btn btn-ghost" style="flex:1" onclick="Onboarding._prev()">← Back</button>
        <button class="btn btn-primary" id="ob-submit-btn" style="flex:2" onclick="Onboarding._submit()">Submit Application ✓</button>
      </div>`;

    return '';
  },

  // ── Wash type toggle ────────────────────────────────────────
  _toggleWash(type) {
    let types = (this._data.wash_types || '').split(',').filter(Boolean);
    if (types.includes(type)) types = types.filter(t => t !== type);
    else types.push(type);
    this._data.wash_types = types.join(',');
    const card = document.getElementById(`ob-wcard-${type}`);
    if (card) {
      const on = types.includes(type);
      card.style.borderColor = on ? 'var(--navy)' : 'var(--border)';
      card.style.background  = on ? '#eff6ff'     : '#fff';
    }
  },

  // ── Geo location ────────────────────────────────────────────
  _geoMap:    null,
  _geoMarker: null,

  // Use Capacitor Geolocation when running natively (gets the OS permission
  // prompt), browser geolocation when running on the web. Throws a clear
  // error so the UI can show a "permission blocked" hint.
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

  async _getGeo() {
    const btn    = document.getElementById('ob-geo-btn');
    const status = document.getElementById('ob-geo-status');
    const origBtn = btn?.textContent;
    if (btn)    btn.textContent = '⏳ Detecting…';
    if (status) status.textContent = 'Detecting your location…';

    let pos;
    try {
      pos = await this._getPosition();
    } catch (err) {
      console.error('GPS error:', err);
      if (btn) btn.textContent = origBtn || '📡 Use my current location';
      const denied = /denied|permission/i.test(err.message || '');
      if (status) {
        status.innerHTML = denied
          ? `⚠️ Location blocked — enable it in <b>Settings → Apps → Pitbay Center → Permissions</b>`
          : `⚠️ ${err.message || 'Could not get location'}`;
      }
      return;
    }

    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;
    this._data.geo_lat = lat;
    this._data.geo_lng = lng;

    if (status) status.textContent = 'Looking up address…';
    await this._fillFromCoords(lat, lng);
    this._renderMap(lat, lng);

    if (btn)    btn.textContent    = '✅ Location captured';
    if (status) status.textContent = `📍 ${lat.toFixed(4)}, ${lng.toFixed(4)} · drag pin to fine-tune`;
  },

  // Reverse-geocode the coords and populate the city / area / pincode fields
  // when they're empty. We don't overwrite values the user has typed already.
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

      const cityInp = document.getElementById('ob-city');
      const areaInp = document.getElementById('ob-area');
      const pinInp  = document.getElementById('ob-pincode');
      const addInp  = document.getElementById('ob-address');
      if (cityInp && (!cityInp.value || !cityInp.value.trim())) cityInp.value = city;
      if (areaInp && (!areaInp.value || !areaInp.value.trim())) areaInp.value = area || city;
      if (pinInp  && (!pinInp.value  || !pinInp.value.trim()))  pinInp.value  = pin;
      if (addInp  && (!addInp.value  || !addInp.value.trim())) {
        const street = [a.house_number, a.road].filter(Boolean).join(', ');
        if (street) addInp.value = street;
      }
    } catch (e) {
      console.warn('reverse-geocode failed:', e.message);
    }
  },

  // Pincode-only lookup: when the owner manually types a pincode, forward-
  // geocode it to pre-fill city/area + drop the map pin if we don't have one.
  async _lookupPincode() {
    const pin = document.getElementById('ob-pincode')?.value.trim();
    if (!/^\d{6}$/.test(pin)) return;
    try {
      const r = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&postalcode=${pin}&country=India&limit=1&addressdetails=1`
      );
      const j = await r.json();
      if (!j.length) return;
      const hit = j[0];
      const a = hit.address || {};
      const cityInp = document.getElementById('ob-city');
      const areaInp = document.getElementById('ob-area');
      if (cityInp && !cityInp.value.trim()) cityInp.value = a.city || a.town || a.state_district || '';
      if (areaInp && !areaInp.value.trim()) {
        areaInp.value = a.suburb || a.neighbourhood || hit.display_name.split(',')[0].trim();
      }
      const lat = parseFloat(hit.lat), lng = parseFloat(hit.lon);
      if (!isNaN(lat) && !isNaN(lng) && (this._data.geo_lat == null)) {
        this._data.geo_lat = lat;
        this._data.geo_lng = lng;
        this._renderMap(lat, lng);
        const status = document.getElementById('ob-geo-status');
        if (status) status.textContent = `📍 ${lat.toFixed(4)}, ${lng.toFixed(4)} · drag pin to fine-tune`;
      }
    } catch { /* silent */ }
  },

  // Render (or re-render) the map with a draggable pin. When the user drags
  // the pin we update the stored coords AND reverse-geocode the new spot.
  _renderMap(lat, lng) {
    const container = document.getElementById('ob-geo-map');
    const hint      = document.getElementById('ob-geo-hint');
    if (!container) return;
    container.style.display = 'block';
    if (hint) hint.style.display = 'block';

    if (typeof L === 'undefined') return;
    if (this._geoMap) { this._geoMap.remove(); this._geoMap = null; }

    this._geoMap = L.map('ob-geo-map', { zoomControl: true, attributionControl: false })
      .setView([lat, lng], 16);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(this._geoMap);

    this._geoMarker = L.marker([lat, lng], { draggable: true }).addTo(this._geoMap);
    this._geoMarker.on('dragend', async () => {
      const p = this._geoMarker.getLatLng();
      this._data.geo_lat = p.lat;
      this._data.geo_lng = p.lng;
      const status = document.getElementById('ob-geo-status');
      if (status) status.textContent = `📍 ${p.lat.toFixed(4)}, ${p.lng.toFixed(4)} · pin updated`;
      // Re-fill from the new position too (only into empty fields).
      await this._fillFromCoords(p.lat, p.lng);
    });

    // Tap on the map = move the pin there.
    this._geoMap.on('click', e => {
      this._geoMarker.setLatLng(e.latlng);
      this._geoMarker.fire('dragend');
    });

    // Leaflet inside a hidden flex container sometimes mis-measures; nudge it.
    setTimeout(() => this._geoMap && this._geoMap.invalidateSize(), 80);
  },

  // ── Image helpers ───────────────────────────────────────────
  _resizeImage(file) {
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = e => {
        const img = new Image();
        img.onload = () => {
          const MAX = 800;
          let w = img.width, h = img.height;
          if (w > MAX || h > MAX) {
            if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
            else       { w = Math.round(w * MAX / h); h = MAX; }
          }
          const canvas = document.createElement('canvas');
          canvas.width = w; canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', 0.75));
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  },

  async _addImage(input) {
    const file = input.files[0];
    if (!file) return;
    if (!this._data.center_images) this._data.center_images = [];
    if (this._data.center_images.length >= 4) { UI.toast('Maximum 4 photos allowed'); return; }
    try {
      const b64 = await this._resizeImage(file);
      this._data.center_images.push(b64);
      this._renderStep(4);
    } catch { UI.toast('Failed to process image'); }
  },

  _removeImage(idx) {
    this._data.center_images.splice(idx, 1);
    this._renderStep(4);
  },

  _addCert(input) {
    const file = input.files[0];
    if (!file) return;
    if (!this._data.certificates) this._data.certificates = [];
    const reader = new FileReader();
    reader.onload = e => {
      this._data.certificates.push({ name: file.name, data: e.target.result });
      this._renderStep(4);
    };
    reader.readAsDataURL(file);
  },

  _removeCert(idx) {
    this._data.certificates.splice(idx, 1);
    this._renderStep(4);
  },

  // ── Step validators ─────────────────────────────────────────
  _obErr(id, msg) {
    const el = document.getElementById(id);
    if (el) { el.textContent = msg; el.style.display = 'block'; }
  },
  _obClear(...ids) {
    ids.forEach(id => { const el = document.getElementById(id); if (el) { el.style.display = 'none'; el.textContent = ''; } });
  },

  _next1() {
    const name   = document.getElementById('ob-name')?.value.trim();
    const owner  = document.getElementById('ob-owner')?.value.trim();
    const mobile = document.getElementById('ob-mobile')?.value.trim();
    const email  = document.getElementById('ob-email')?.value.trim();
    this._obClear('ob-err-name','ob-err-owner','ob-err-mobile','ob-err-email');
    let valid = true;
    if (!name)  { this._obErr('ob-err-name', 'Center name is required.'); valid = false; }
    if (!owner) { this._obErr('ob-err-owner', 'Owner name is required.'); valid = false; }
    if (!/^[6-9]\d{9}$/.test(mobile)) { this._obErr('ob-err-mobile', 'Enter a valid 10-digit mobile number.'); valid = false; }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { this._obErr('ob-err-email', 'Enter a valid email address.'); valid = false; }
    if (!valid) return;
    Object.assign(this._data, { name, owner_name: owner, mobile, email });
    this._step = 2; this._renderStep(2);
  },

  _next2() {
    const city    = document.getElementById('ob-city')?.value.trim();
    const area    = document.getElementById('ob-area')?.value.trim();
    const pincode = document.getElementById('ob-pincode')?.value.trim();
    const address = document.getElementById('ob-address')?.value.trim();
    this._obClear('ob-err-city','ob-err-address','ob-err-area','ob-err-pincode');
    let valid = true;
    if (!pincode)                     { this._obErr('ob-err-pincode', 'Pincode is required.'); valid = false; }
    else if (!/^\d{6}$/.test(pincode)) { this._obErr('ob-err-pincode', 'Pincode must be 6 digits.'); valid = false; }
    if (!city)    { this._obErr('ob-err-city',    'City is required.');           valid = false; }
    if (!area)    { this._obErr('ob-err-area',    'Area / locality is required.'); valid = false; }
    if (!address) { this._obErr('ob-err-address', 'Full address is required.');   valid = false; }
    if (!valid) return;
    Object.assign(this._data, { city, area, pincode, address });
    this._step = 3; this._renderStep(3);
  },

  _next3() {
    const types = (this._data.wash_types || '').split(',').filter(Boolean);
    if (!types.length) { UI.toast('Please select at least one wash type'); return; }
    this._step = 4; this._renderStep(4);
  },

  _next4() {
    this._step = 5; this._renderStep(5);
  },

  _goToStep(step) {
    if (step < this._step) { this._step = step; this._renderStep(step); }
  },

  _prev() {
    if (this._step > 1) { this._step--; this._renderStep(this._step); }
  },

  // ── Submit ──────────────────────────────────────────────────
  async _submit() {
    const gstin    = document.getElementById('ob-gstin')?.value.trim();
    const bankname = document.getElementById('ob-bankname')?.value.trim();
    const acname   = document.getElementById('ob-acname')?.value.trim();
    const account  = document.getElementById('ob-account')?.value.trim();
    const ifsc     = document.getElementById('ob-ifsc')?.value.trim();

    this._obClear('ob-err-gstin', 'ob-err-ifsc');
    let valid = true;
    if (gstin && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstin)) {
      this._obErr('ob-err-gstin', 'Enter a valid 15-character GSTIN (e.g. 22AAAAA0000A1Z5) or leave blank.');
      valid = false;
    }
    if (ifsc && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) {
      this._obErr('ob-err-ifsc', 'Enter a valid 11-character IFSC code (e.g. HDFC0001234).');
      valid = false;
    }
    if (!valid) return;

    Object.assign(this._data, { gstin, bank_name: bankname, account_name: acname, bank_account: account, ifsc });

    const btn = document.getElementById('ob-submit-btn');
    UI.setLoading(btn, true);
    try {
      const res  = await fetch('/api/onboard/apply', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(this._data),
      });
      const data = await res.json();
      if (!res.ok) { UI.toast(data.error || 'Submission failed'); return; }
      this._renderSuccess();
    } catch {
      UI.toast('Network error. Please try again.');
    } finally {
      UI.setLoading(btn, false);
    }
  },

  // ── Success screen ──────────────────────────────────────────
  _renderSuccess() {
    const area = document.getElementById('onboard-form-area');
    if (!area) return;
    area.innerHTML = `
      <div style="text-align:center;padding:16px 0">
        <div style="font-size:52px;margin-bottom:10px">🎉</div>
        <div style="font-weight:800;font-size:18px;margin-bottom:6px">Application Submitted!</div>
        <div style="font-size:13px;color:var(--muted);margin-bottom:16px;line-height:1.5">
          Your application for <strong>${this._data.name}</strong> is received.<br>
          Review usually takes <strong>24–48 hours</strong>.
        </div>

        <div style="background:#fef9c3;border:1px solid #fcd34d;border-radius:12px;padding:14px;margin-bottom:14px;text-align:left">
          <div style="font-size:12px;font-weight:800;color:#92400e;margin-bottom:6px">⏳ Verification In Progress</div>
          <div style="font-size:12px;color:#78350f;line-height:1.6">
            Our team is verifying your center details, location, and documents.
            Once approved you will receive a confirmation via <strong>email, SMS, and phone call</strong>
            on <strong>${this._data.mobile}</strong>.
          </div>
        </div>

        <div class="card card-pad" style="text-align:left;margin-bottom:14px">
          <div style="font-size:10px;font-weight:700;color:var(--muted);margin-bottom:8px">WHAT HAPPENS NEXT</div>
          <div style="font-size:12px;display:grid;gap:7px">
            <div>✅ Team reviews your details & documents</div>
            <div>📞 We call you on <strong>${this._data.mobile}</strong> for a quick check</div>
            <div>📧 Approval email sent to <strong>${this._data.email || 'your email'}</strong></div>
            <div>🚀 Your center goes live on Pitbay!</div>
          </div>
        </div>

        <button class="btn btn-primary btn-full" onclick="Auth.renderLogin();Router.go('login')">Back to Login</button>
        <button class="btn btn-ghost btn-full" style="margin-top:8px" onclick="Onboarding._checkStatus()">Check Application Status</button>
      </div>`;
  },

  async _checkStatus() {
    const mobile = this._data.mobile;
    if (!mobile) return;
    try {
      const res  = await fetch(`/api/onboard/status/${mobile}`);
      const data = await res.json();
      if (!res.ok) { UI.toast(data.error || 'Not found'); return; }
      const icon = data.status === 'approved' ? '✅' : data.status === 'rejected' ? '❌' : '⏳';
      UI.toast(`${icon} Application ${data.status}${data.notes ? ' · ' + data.notes : ''}`);
    } catch { UI.toast('Network error'); }
  },
};
