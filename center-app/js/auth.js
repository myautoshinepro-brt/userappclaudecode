// SparkWash Center App — auth.js

const Auth = {
  _mobile: '',
  _resendTimer: null,
  _resendSec: 30,

  async init() {
    if (AppState.loadFromStorage()) {
      try {
        const res  = await this._api('/api/auth/me');
        const data = await res.json();
        if (res.ok) {
          // Server returns a fresh token (sliding window) so the center stays
          // logged in indefinitely while active on this device.
          if (data.token) AppState.setAuth(data.token, data);
          else { AppState.center = data; localStorage.setItem('sw_center_data', JSON.stringify(data)); }
          Router.go('dashboard');
          return;
        }
      } catch { /* fall through to login */ }
      AppState.clearAuth();
    }
    Router.go('login');
  },

  _showApplyOption(mobile) {
    document.getElementById('login-form-area').innerHTML = `
      <div style="text-align:center;padding:8px 0 12px">
        <div style="font-size:36px;margin-bottom:8px">🏪</div>
        <div style="font-weight:700;font-size:16px;margin-bottom:6px">Number not registered</div>
        <div style="font-size:12px;color:var(--muted);margin-bottom:16px">
          No SparkWash center is linked to <strong>${mobile}</strong>.
          Want to onboard your center?
        </div>
        <button class="btn btn-primary btn-full" onclick="Onboarding.start('${mobile}')">
          🚀 Apply to Join SparkWash
        </button>
        <button class="btn btn-ghost btn-full" style="margin-top:8px" onclick="Auth.renderLogin()">
          ← Try a different number
        </button>
      </div>`;
  },

  renderLogin() {
    document.getElementById('login-form-area').innerHTML = `
      <p class="login-sub">Enter your registered mobile number to receive an OTP</p>
      <div class="input-group">
        <div class="input-label">Mobile Number</div>
        <div class="input-with-icon">
          <span class="input-ico">📱</span>
          <input id="login-mobile" class="input-field" type="tel" maxlength="10"
            placeholder="Enter 10-digit number"
            oninput="this.value=this.value.replace(/\\D/g,'')"
            onkeydown="if(event.key==='Enter')Auth.sendOtp()">
        </div>
      </div>
      <button class="btn btn-primary btn-full" id="send-otp-btn" onclick="Auth.sendOtp()">
        Send OTP
      </button>
      <div style="margin-top:16px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:10px 12px">
        <div style="font-size:11px;color:#166534;font-weight:600;margin-bottom:8px">🧪 Demo centers (tap to fill)</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px">
          <button onclick="Auth._fillDemo('9876543210')" style="background:#fff;border:1px solid #86efac;border-radius:20px;padding:4px 10px;font-size:11px;color:#166534;font-weight:600;cursor:pointer">Shine Auto Wash</button>
          <button onclick="Auth._fillDemo('9876543211')" style="background:#fff;border:1px solid #86efac;border-radius:20px;padding:4px 10px;font-size:11px;color:#166534;font-weight:600;cursor:pointer">SparkWash Bandra</button>
          <button onclick="Auth._fillDemo('9876543212')" style="background:#fff;border:1px solid #86efac;border-radius:20px;padding:4px 10px;font-size:11px;color:#166534;font-weight:600;cursor:pointer">QuickWash Thane</button>
        </div>
      </div>
    `;
    setTimeout(() => document.getElementById('login-mobile')?.focus(), 100);
  },

  _fillDemo(mobile) {
    const inp = document.getElementById('login-mobile');
    if (inp) { inp.value = mobile; inp.focus(); }
  },

  async sendOtp() {
    const mobile = (document.getElementById('login-mobile')?.value || '').trim();
    if (!/^[6-9]\d{9}$/.test(mobile)) {
      UI.toast('Enter a valid 10-digit mobile number');
      return;
    }
    const btn = document.getElementById('send-otp-btn');
    UI.setLoading(btn, true);
    try {
      const res  = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 404) {
          this._showApplyOption(mobile);
        } else {
          UI.toast(data.error || 'Failed to send OTP');
        }
        return;
      }

      this._mobile = mobile;
      this.renderOtpStep(data.centerName, data.ownerName, data.devOtp);
    } catch {
      UI.toast('Network error. Try again.');
    } finally {
      UI.setLoading(btn, false);
    }
  },

  renderOtpStep(centerName, ownerName, devOtp) {
    document.getElementById('login-form-area').innerHTML = `
      <div class="otp-sent-info">
        <strong>👋 ${ownerName || 'Welcome back!'}</strong>
        ${centerName || ''} — OTP sent to ${this._mobile}
        ${devOtp ? `<div style="display:flex;align-items:center;justify-content:space-between;background:#f5f3ff;border:1px solid #c4b5fd;border-radius:8px;padding:8px 12px;margin-top:8px"><span style="font-size:12px;color:#7c3aed;font-weight:700">🔑 OTP: ${devOtp}</span><button type="button" onclick="Auth._fillOtp('${devOtp}')" style="background:#7c3aed;color:#fff;border:none;border-radius:5px;padding:3px 9px;font-size:11px;font-weight:700;cursor:pointer">Tap to fill ↑</button></div>` : ''}
      </div>
      <div class="otp-row">
        <input class="otp-box" id="otp0" maxlength="1" type="tel" oninput="Auth._otpInput(this,0)" onkeydown="Auth._otpKey(event,0)">
        <input class="otp-box" id="otp1" maxlength="1" type="tel" oninput="Auth._otpInput(this,1)" onkeydown="Auth._otpKey(event,1)">
        <input class="otp-box" id="otp2" maxlength="1" type="tel" oninput="Auth._otpInput(this,2)" onkeydown="Auth._otpKey(event,2)">
        <input class="otp-box" id="otp3" maxlength="1" type="tel" oninput="Auth._otpInput(this,3)" onkeydown="Auth._otpKey(event,3)">
        <input class="otp-box" id="otp4" maxlength="1" type="tel" oninput="Auth._otpInput(this,4)" onkeydown="Auth._otpKey(event,4)">
        <input class="otp-box" id="otp5" maxlength="1" type="tel" oninput="Auth._otpInput(this,5)" onkeydown="Auth._otpKey(event,5)">
      </div>
      <button class="btn btn-primary btn-full" id="verify-otp-btn" onclick="Auth.verifyOtp()">
        Verify & Login
      </button>
      <div class="resend-row" style="margin-top:12px">
        <span id="resend-text">Resend OTP in <span id="resend-count">30</span>s</span>
        <button class="resend-btn hidden" id="resend-btn" onclick="Auth.sendOtp()">Resend OTP</button>
      </div>
      <div style="text-align:center;margin-top:12px">
        <button class="btn btn-outline btn-sm" onclick="Auth.renderLogin()">← Change Number</button>
      </div>
    `;
    document.getElementById('otp0')?.focus();
    this._startResendTimer();
  },

  _fillOtp(otp) {
    [...otp].forEach((d, i) => {
      const box = document.getElementById(`otp${i}`);
      if (box) box.value = d;
    });
    this.verifyOtp();
  },

  _otpInput(el, idx) {
    el.value = el.value.replace(/\D/g, '').slice(-1);
    if (el.value && idx < 5) document.getElementById(`otp${idx + 1}`)?.focus();
    if (idx === 5 && el.value) this.verifyOtp();
  },

  _otpKey(e, idx) {
    if (e.key === 'Backspace' && !e.target.value && idx > 0)
      document.getElementById(`otp${idx - 1}`)?.focus();
  },

  _startResendTimer() {
    clearInterval(this._resendTimer);
    let sec = 30;
    document.getElementById('resend-count').textContent = sec;
    this._resendTimer = setInterval(() => {
      sec--;
      const counter = document.getElementById('resend-count');
      if (counter) counter.textContent = sec;
      if (sec <= 0) {
        clearInterval(this._resendTimer);
        document.getElementById('resend-text')?.classList.add('hidden');
        document.getElementById('resend-btn')?.classList.remove('hidden');
      }
    }, 1000);
  },

  _getOtp() {
    return [0,1,2,3,4,5].map(i => document.getElementById(`otp${i}`)?.value || '').join('');
  },

  async verifyOtp() {
    const otp = this._getOtp();
    if (otp.length < 6) { UI.toast('Enter the 6-digit OTP'); return; }
    const btn = document.getElementById('verify-otp-btn');
    UI.setLoading(btn, true);
    try {
      const res  = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: this._mobile, otp }),
      });
      const data = await res.json();
      if (!res.ok) { UI.toast(data.error || 'Invalid OTP'); return; }

      AppState.setAuth(data.token, data.center);
      UI.toast(`Welcome, ${data.center.owner_name}! 👋`);
      Router.go('dashboard');
    } catch {
      UI.toast('Network error. Try again.');
    } finally {
      UI.setLoading(btn, false);
    }
  },

  async logout() {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${AppState.token}` },
      });
    } catch { /* ignore */ }
    AppState.clearAuth();
    Router.go('login');
    Auth.renderLogin();
  },
};
