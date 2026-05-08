// ============================================================
// SparkWash — profile.js
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

  setDefaultAddress(key) {
    document.querySelectorAll('.addr-card-saved').forEach(c => {
      c.classList.remove('selected');
      c.style.borderColor = '';
      c.style.background = '';
      const badge = c.querySelector('.badge-default');
      if (badge) badge.style.display = 'none';
    });
    const card = document.getElementById('addr-' + key);
    if (card) {
      card.classList.add('selected');
      card.style.borderColor = 'var(--blue)';
      card.style.background = '#f0f7ff';
      const badge = card.querySelector('.badge-default');
      if (badge) badge.style.display = 'inline-block';
    }
    const names = { home: 'Home', office: 'Office', parents: 'Parents home' };
    UI.toast('✅ ' + (names[key] || key) + ' set as default');
  },

  addrLabelActive: 'home',

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

  saveAddress() {
    const area = document.getElementById('addr-area')?.value.trim();
    if (!area) { UI.toast('⚠️ Please enter area / locality'); return; }
    UI.toast('✅ Address saved!');
    setTimeout(() => Router.go('addresses'), 1200);
  },

  // ── VEHICLES ──

  addVehicle() {
    const reg = document.getElementById('inp-vreg')?.value.trim();
    if (!reg) { UI.toast('⚠️ Enter registration number'); return; }
    UI.toast('✅ Vehicle added: ' + reg);
    if (document.getElementById('inp-vreg')) document.getElementById('inp-vreg').value = '';
  },

  removeVehicle(plate) {
    if (confirm('Remove ' + plate + '?')) UI.toast('🗑️ Vehicle removed!');
  },

  // ── PROMO CODES ──

  addPromoCode() {
    const val = document.getElementById('profile-promo-input')?.value.trim().toUpperCase();
    const msgEl = document.getElementById('profile-promo-msg');
    if (!val) return;

    const VALID = {
      WASH20: '20% off water wash',
      STEAM15: '15% off steam wash',
      BDAY100: '₹100 birthday offer',
      RAHUL50: '₹50 referral reward',
    };

    if (VALID[val]) {
      const container = document.getElementById('extra-promo-codes');
      if (container) {
        container.innerHTML += `
          <div class="promo-code-card">
            <div><div class="promo-code-name">${val}</div><div class="promo-code-desc">${VALID[val]}</div></div>
            <div class="promo-code-badge">Added ✓</div>
          </div>`;
      }
      if (document.getElementById('profile-promo-input')) document.getElementById('profile-promo-input').value = '';
      if (msgEl) msgEl.style.display = 'none';
      UI.toast('✅ Code ' + val + ' added!');
    } else {
      if (msgEl) { msgEl.style.color = 'var(--red)'; msgEl.textContent = '❌ Invalid or expired code.'; msgEl.style.display = 'block'; }
    }
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
    if (confirm('Log out of SparkWash?')) {
      Auth.logout();
    }
  },

  // Called by AppState.setAuthUser() to refresh header after login
  refreshHeader() {
    this.updateDisplay();
  },
};
