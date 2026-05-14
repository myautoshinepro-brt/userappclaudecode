// ============================================================
// Pitbay — profile.js
// Profile screen + all sub-screens
// ============================================================

const ProfileScreen = {

  init() {
    this.updateDisplay();
  },

  updateDisplay() {
    const u = AppState.user;
    _setText('profile-name',    u.name);
    _setText('profile-phone',   u.phone + ' · ' + u.city);
    _setText('profile-initials', u.initials);
    _setText('edit-initials',   u.initials);
    const inp = document.getElementById('inp-name');
    if (inp) inp.value = u.name;
    const inpEmail = document.getElementById('inp-email');
    if (inpEmail) inpEmail.value = u.email;
  },

  // ── EDIT PROFILE ──

  saveProfile() {
    const name = document.getElementById('inp-name')?.value.trim();
    if (!name) { UI.toast('⚠️ Please enter your name'); return; }
    AppState.updateUserName(name);
    this.updateDisplay();
    UI.toast('✅ Profile updated!');
    setTimeout(() => Router.go('profile'), 1200);
  },

  // ── CHANGE PHONE / OTP ──

  sendOTP() {
    const ph = document.getElementById('inp-phone')?.value.trim();
    if (!ph || ph.length !== 10 || isNaN(ph)) {
      UI.toast('⚠️ Enter a valid 10-digit number'); return;
    }
    _setText('otp-phone-display', ph);
    document.getElementById('otp-section').style.display = 'block';
    document.getElementById('otp1')?.focus();
    UI.toast('📱 OTP sent to +91 ' + ph);
  },

  otpNext(el, nextId) {
    if (el.value.length === 1 && nextId) document.getElementById(nextId)?.focus();
  },

  verifyOTP() {
    const otp = [1,2,3,4].map(i => document.getElementById('otp'+i)?.value || '').join('');
    if (otp.length < 4) { UI.toast('⚠️ Enter complete OTP'); return; }
    const ph = document.getElementById('inp-phone')?.value.trim();
    AppState.updateUserPhone(ph);
    this.updateDisplay();
    UI.toast('✅ Phone number updated!');
    setTimeout(() => Router.go('profile'), 1200);
  },

  // ── ADDRESSES ──

  renderAddresses() {
    const list = document.getElementById('addr-list');
    if (!list) return;
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
        <span onclick="event.stopPropagation();ProfileScreen.removeAddress(${a.id})" style="font-size:14px;color:var(--red);cursor:pointer;padding:0 6px">🗑️</span>
      </div>
    `).join('');
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

  async saveAddress() {
    const area     = document.getElementById('addr-area')?.value.trim();
    const flat     = document.getElementById('addr-flat')?.value.trim();
    const landmark = document.getElementById('addr-landmark')?.value.trim();
    const pincode  = document.getElementById('addr-pincode')?.value.trim();
    if (!area) { UI.toast('⚠️ Please enter area / locality'); return; }

    const LABELS = { home2: { label: 'Home', icon: '🏠' }, work: { label: 'Office', icon: '🏢' }, other: { label: 'Other', icon: '📍' } };
    const choice = LABELS[this.addrLabelActive] || LABELS.other;
    const fullAddress = [flat, area, landmark].filter(Boolean).join(', ');

    try {
      const r = await fetch('/api/profile/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (Auth.getToken() || '') },
        body: JSON.stringify({ label: choice.label, icon: choice.icon, address: fullAddress, pincode }),
      });
      const j = await r.json();
      if (!r.ok || !j.success) throw new Error(j.error || 'Save failed');
      await UserData.loadAddresses();
      ['addr-area','addr-flat','addr-landmark','addr-pincode'].forEach(id => {
        const inp = document.getElementById(id);
        if (inp) inp.value = '';
      });
      UI.toast('✅ Address saved!');
      // If user came from summary (booking flow), bounce them straight back there.
      // Otherwise route to the addresses list as before.
      const cameFromSummary = Router.history.includes('summary');
      setTimeout(() => {
        if (cameFromSummary) Router.back(); else Router.go('addresses');
      }, 800);
    } catch (e) {
      UI.toast('❌ ' + e.message);
    }
  },

  // ── VEHICLES ──

  renderVehicles() {
    const list = document.getElementById('veh-list');
    if (!list) return;
    if (!SAVED_VEHICLES.length) {
      list.innerHTML = `<div style="padding:14px 12px;font-size:11px;color:var(--text-secondary);text-align:center">No saved vehicles yet.</div>`;
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
        <div onclick="ProfileScreen.removeVehicle(${v.id})" style="font-size:18px;color:var(--red);cursor:pointer">🗑️</div>
      </div>
    `).join('');
  },

  async addVehicle() {
    const plate  = document.getElementById('inp-vreg')?.value.trim();
    const model  = document.getElementById('inp-vmodel')?.value.trim();
    const colour = document.getElementById('inp-vcolour')?.value.trim();
    if (!plate) { UI.toast('⚠️ Enter registration number'); return; }

    try {
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
      UI.toast('✅ Vehicle added: ' + plate);
      // If user came from summary mid-booking, bounce back so they can keep going.
      if (Router.history.includes('summary')) {
        setTimeout(() => Router.back(), 600);
      }
    } catch (e) {
      UI.toast('❌ ' + e.message);
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
      return `
        <div class="review-card">
          <div style="display:flex;justify-content:space-between;align-items:flex-start">
            <div style="font-size:12px;font-weight:700;color:var(--text-primary)">${b.centerName}</div>
            <div class="review-stars">${full}${empty}</div>
          </div>
          <div style="font-size:10px;color:var(--text-secondary);margin-top:1px">${b.date} · ${wash}${b.packageName ? ' · ' + b.packageName : ''}</div>
          ${cmt}
        </div>`;
    }).join('');
  },

  // ── MY PROMOS (rendered from /api/promos loaded into PROMO_CODES) ──

  renderMyPromos() {
    const list = document.getElementById('my-promo-list');
    if (!list) return;
    const promos = (typeof PROMO_CODES !== 'undefined' ? PROMO_CODES : []);

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
