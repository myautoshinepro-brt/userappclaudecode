// ============================================================
// Pitbay — auth.js
// Frontend authentication module
// Handles: session storage, API calls, login/signup flow
// ============================================================

const Auth = (() => {
  const BASE   = '/api/auth';
  const TK_KEY = 'sw_auth_token';
  const US_KEY = 'sw_user';

  // ── STORAGE ─────────────────────────────────────────────

  function saveSession(token, user) {
    localStorage.setItem(TK_KEY, token);
    localStorage.setItem(US_KEY, JSON.stringify(user));
  }

  function clearSession() {
    localStorage.removeItem(TK_KEY);
    localStorage.removeItem(US_KEY);
  }

  function getToken()       { return localStorage.getItem(TK_KEY); }
  function getStoredUser()  {
    try { return JSON.parse(localStorage.getItem(US_KEY)); } catch { return null; }
  }

  function isLoggedIn() { return !!getToken() && !!getStoredUser(); }

  // ── API HELPERS ──────────────────────────────────────────

  async function api(method, path, body, token) {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    // Use a RELATIVE URL — fetch resolves to same-origin on the web (works
    // whichever host the page is served from: Railway, Fly, custom domain)
    // and the monkey-patch in index.html rewrites it to window.API_URL when
    // running inside Capacitor (where the WebView loads from https://localhost
    // and same-origin would go nowhere). Was previously hardcoded to prepend
    // window.API_URL, which made every web visit do a cross-origin call to
    // the configured (and possibly stale) Railway URL.
    const fullUrl = BASE + path;
    console.log(`API Call: ${method} ${fullUrl}`, body);

    const res  = await fetch(fullUrl, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    // Debug logging for unexpected token errors
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong.');
      return data;
    } else {
      const text = await res.text();
      console.error('Non-JSON response received:', text);
      throw new Error('Server returned an unexpected format. Please check logs.');
    }
  }

  // ── SESSION CHECK ────────────────────────────────────────

  async function checkSession() {
    const token = getToken();
    if (!token) return null;
    try {
      const res = await api('GET', '/me', null, token);
      // Server returns a fresh token on every /me — save it so the session
      // slides forward indefinitely while the user is active on this device.
      const refreshed = res.token;
      const user = { id: res.id, full_name: res.full_name, mobile: res.mobile, email: res.email };
      if (refreshed) saveSession(refreshed, user);
      else           localStorage.setItem(US_KEY, JSON.stringify(user));
      return user;
    } catch {
      clearSession();
      return null;
    }
  }

  // ── AUTH ACTIONS ─────────────────────────────────────────

  async function register(fullName, mobile, email) {
    return api('POST', '/register', { full_name: fullName, mobile, email });
  }

  async function sendOtp(identifier) {
    return api('POST', '/send-otp', { identifier });
  }

  async function verifyOtp(identifier, otp) {
    const data = await api('POST', '/verify-otp', { identifier, otp });
    saveSession(data.token, data.user);
    // Sync AppState
    AppState.setAuthUser(data.user);
    return data;
  }

  async function logout() {
    const token = getToken();
    if (token) {
      try { await api('POST', '/logout', null, token); } catch { /* ignore */ }
    }
    clearSession();
    AppState.clearAuth();
    Router.go('login', false);
  }

  // ── EXPOSE ───────────────────────────────────────────────

  return {
    isLoggedIn,
    getToken,
    getStoredUser,
    checkSession,
    register,
    sendOtp,
    verifyOtp,
    logout,
  };
})();


// ============================================================
// LoginScreen — handles the login UI
// ============================================================

const LoginScreen = (() => {
  let _identifier = '';

  // ── STEP 1: Enter mobile / email ─────────────────────────

  function showStep1(prefill = '') {
    _identifier = prefill;
    const hint = document.getElementById('login-dev-otp');
    if (hint) { hint.style.display = 'none'; hint.textContent = ''; }
    _renderStep('login-step-identifier', () => {
      const inp = document.getElementById('login-identifier-input');
      if (inp) { inp.value = prefill; inp.focus(); }
    });
  }

  function showStep2(userName, deliveredVia) {
    _renderStep('login-step-otp', () => {
      const el = document.getElementById('login-otp-who');
      if (el) el.textContent = userName || 'you';
      const dest = document.getElementById('login-otp-dest');
      if (dest) {
        // Reflect the channel the server actually used.
        if (deliveredVia === 'sms')        dest.textContent = `${_identifier} (SMS)`;
        else if (deliveredVia === 'email') dest.textContent = _identifier;
        else                                dest.textContent = _identifier;
      }
      _resetOtpBoxes();
      document.getElementById('login-otp-box-0')?.focus();
      _startResendTimer();
    });
  }

  function _renderStep(stepId, afterFn) {
    ['login-step-identifier', 'login-step-otp'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
    const target = document.getElementById(stepId);
    if (target) { target.style.display = 'flex'; afterFn && afterFn(); }
  }

  // ── VALIDATE & SEND OTP ──────────────────────────────────

  async function handleSendOtp() {
    const input = document.getElementById('login-identifier-input');
    _identifier = (input?.value || '').trim();

    if (!_identifier) {
      return _showError('login-id-error', 'Please enter your mobile number or email.');
    }

    const isMobile = /^[6-9]\d{9}$/.test(_identifier);
    const isEmail  = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(_identifier);
    if (!isMobile && !isEmail) {
      return _showError('login-id-error', 'Enter a valid 10-digit mobile number or email address.');
    }

    _hideError('login-id-error');
    _setBtnLoading('login-send-otp-btn', true);

    try {
      const res = await Auth.sendOtp(_identifier);
      // Dev mode: show OTP hint on screen
      if (res.devOtp) _showDevOtpHint(res.devOtp);
      showStep2(res.userName, res.deliveredVia);
    } catch (err) {
      console.error('Login error:', err);
      _showError('login-id-error', 'Error: ' + err.message);
    } finally {
      _setBtnLoading('login-send-otp-btn', false);
    }
  }

  // ── OTP INPUT BOXES ──────────────────────────────────────

  function _resetOtpBoxes() {
    for (let i = 0; i < 6; i++) {
      const box = document.getElementById(`login-otp-box-${i}`);
      if (box) box.value = '';
    }
    _hideError('login-otp-error');
  }

  function handleOtpKeyup(e, index) {
    const box = e.target;
    const val = box.value.replace(/\D/g, '').slice(0, 1);
    box.value = val;

    if (val && index < 5) {
      document.getElementById(`login-otp-box-${index + 1}`)?.focus();
    }
    if (e.key === 'Backspace' && !val && index > 0) {
      document.getElementById(`login-otp-box-${index - 1}`)?.focus();
    }

    // Auto-verify when all 6 filled
    const allFilled = Array.from({ length: 6 }, (_, i) =>
      document.getElementById(`login-otp-box-${i}`)?.value
    ).every(v => v.length === 1);
    if (allFilled) handleVerifyOtp();
  }

  function handleOtpPaste(e) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      e.preventDefault();
      pasted.split('').forEach((ch, i) => {
        const box = document.getElementById(`login-otp-box-${i}`);
        if (box) box.value = ch;
      });
      handleVerifyOtp();
    }
  }

  function _getOtpValue() {
    return Array.from({ length: 6 }, (_, i) =>
      document.getElementById(`login-otp-box-${i}`)?.value || ''
    ).join('');
  }

  async function handleVerifyOtp() {
    const otp = _getOtpValue();
    if (otp.length < 6) return;

    _setBtnLoading('login-verify-otp-btn', true);
    _hideError('login-otp-error');

    try {
      const res = await Auth.verifyOtp(_identifier, otp);
      UI.toast(`Welcome back, ${res.user.full_name.split(' ')[0]}!`);
      // Hydrate saved vehicles/addresses/bookings + apply default address
      // BEFORE landing on home — otherwise the home header shows "Tap to
      // select location" and centers are unfiltered until the user manually
      // adds an address.
      if (typeof UserData !== 'undefined' && UserData.initSession) {
        try { await UserData.initSession(); }
        catch (e) { console.warn('initSession after login failed:', e.message); }
      }
      Router.go('home', false);
    } catch (err) {
      _showError('login-otp-error', err.message);
      _resetOtpBoxes();
      document.getElementById('login-otp-box-0')?.focus();
    } finally {
      _setBtnLoading('login-verify-otp-btn', false);
    }
  }

  // ── RESEND TIMER ─────────────────────────────────────────

  let _resendTimer = null;

  function _startResendTimer(seconds = 30) {
    clearInterval(_resendTimer);
    const btn   = document.getElementById('login-resend-btn');
    const timer = document.getElementById('login-resend-timer');
    if (!btn || !timer) return;

    btn.style.display   = 'none';
    timer.style.display = 'inline';
    let remaining = seconds;
    timer.textContent = `Resend in ${remaining}s`;

    _resendTimer = setInterval(() => {
      remaining--;
      timer.textContent = `Resend in ${remaining}s`;
      if (remaining <= 0) {
        clearInterval(_resendTimer);
        timer.style.display = 'none';
        btn.style.display   = 'inline';
      }
    }, 1000);
  }

  async function handleResendOtp() {
    try {
      const res = await Auth.sendOtp(_identifier);
      if (res.devOtp) _showDevOtpHint(res.devOtp);
      _resetOtpBoxes();
      _startResendTimer();
      UI.toast('OTP resent!');
      document.getElementById('login-otp-box-0')?.focus();
    } catch (err) {
      _showError('login-otp-error', err.message);
    }
  }

  // ── DEV MODE OTP HINT ────────────────────────────────────

  function _showDevOtpHint(otp) {
    const el = document.getElementById('login-dev-otp');
    if (!el) return;
    el.innerHTML = `<span>🔑 OTP: <strong>${otp}</strong></span><button type="button" class="auth-dev-fill-btn" onclick="LoginScreen.fillOtpBoxes('${otp}')">Tap to fill ↑</button>`;
    el.style.display = 'flex';
  }

  function fillOtpBoxes(otp) {
    [...otp].forEach((d, i) => {
      const box = document.getElementById(`login-otp-box-${i}`);
      if (box) box.value = d;
    });
    handleVerifyOtp();
  }

  function fillDemoIdentifier(val) {
    const inp = document.getElementById('login-identifier-input');
    if (inp) { inp.value = val; inp.focus(); }
  }

  // ── UTILITIES ────────────────────────────────────────────

  function _showError(id, msg) {
    const el = document.getElementById(id);
    if (el) { el.textContent = msg; el.style.display = 'block'; }
  }
  function _hideError(id) {
    const el = document.getElementById(id);
    if (el) { el.style.display = 'none'; el.textContent = ''; }
  }
  function _setBtnLoading(id, loading) {
    const btn = document.getElementById(id);
    if (!btn) return;
    if (loading) {
      btn.dataset.origText = btn.textContent;
      btn.textContent = 'Please wait...';
      btn.disabled = true;
    } else {
      btn.textContent = btn.dataset.origText || btn.textContent;
      btn.disabled = false;
    }
  }

  return { showStep1, showStep2, handleSendOtp, handleOtpKeyup, handleOtpPaste, handleVerifyOtp, handleResendOtp, fillOtpBoxes, fillDemoIdentifier };
})();


// ============================================================
// SignupScreen — handles signup UI
// ============================================================

const SignupScreen = (() => {
  function init() {
    const form = document.getElementById('signup-form');
    if (form) {
      document.getElementById('signup-name-input')?.addEventListener('input',  () => _hideError('signup-name-error'));
      document.getElementById('signup-mobile-input')?.addEventListener('input', () => _hideError('signup-mobile-error'));
      document.getElementById('signup-email-input')?.addEventListener('input',  () => _hideError('signup-email-error'));
    }
  }

  async function handleSubmit() {
    const fullName = (document.getElementById('signup-name-input')?.value   || '').trim();
    const mobile   = (document.getElementById('signup-mobile-input')?.value || '').trim();
    const email    = (document.getElementById('signup-email-input')?.value  || '').trim();

    let valid = true;

    if (!fullName) {
      _showError('signup-name-error', 'Full name is required.');
      valid = false;
    } else if (fullName.length < 2) {
      _showError('signup-name-error', 'Enter your full name (at least 2 characters).');
      valid = false;
    }

    if (!mobile) {
      _showError('signup-mobile-error', 'Mobile number is required.');
      valid = false;
    } else if (!/^[6-9]\d{9}$/.test(mobile)) {
      _showError('signup-mobile-error', 'Enter a valid 10-digit Indian mobile number.');
      valid = false;
    }

    if (!email) {
      _showError('signup-email-error', 'Email address is required.');
      valid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      _showError('signup-email-error', 'Enter a valid email address.');
      valid = false;
    }

    if (!valid) return;

    _setBtnLoading('signup-submit-btn', true);
    _clearAllErrors();

    try {
      await Auth.register(fullName, mobile, email);
      UI.toast('Account created! Please log in.');
      // Pre-fill login with mobile
      Router.go('login', false);
      LoginScreen.showStep1(mobile);
    } catch (err) {
      // Map server error to the right field
      const msg = err.message.toLowerCase();
      if (msg.includes('mobile'))      _showError('signup-mobile-error', err.message);
      else if (msg.includes('email'))  _showError('signup-email-error',  err.message);
      else                              _showError('signup-general-error', err.message);
    } finally {
      _setBtnLoading('signup-submit-btn', false);
    }
  }

  function _showError(id, msg) {
    const el = document.getElementById(id);
    if (el) { el.textContent = msg; el.style.display = 'block'; }
  }
  function _hideError(id) {
    const el = document.getElementById(id);
    if (el) { el.style.display = 'none'; el.textContent = ''; }
  }
  function _clearAllErrors() {
    ['signup-name-error','signup-mobile-error','signup-email-error','signup-general-error']
      .forEach(_hideError);
  }
  function _setBtnLoading(id, loading) {
    const btn = document.getElementById(id);
    if (!btn) return;
    if (loading) {
      btn.dataset.origText = btn.textContent;
      btn.textContent = 'Creating account...';
      btn.disabled = true;
    } else {
      btn.textContent = btn.dataset.origText || btn.textContent;
      btn.disabled = false;
    }
  }

  return { init, handleSubmit };
})();
