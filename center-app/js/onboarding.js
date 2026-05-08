// SparkWash Center App — onboarding.js

const Onboarding = {
  _step: 1,
  _data: {},

  start(mobile) {
    this._step = 1;
    this._data = { mobile: mobile || '' };
    Router.go('onboard');
  },

  render() {
    this._renderStep(this._step);
  },

  _renderStep(step) {
    const steps = ['Basic Info', 'Legal & GST', 'Bank Details'];
    const progress = `
      <div style="display:flex;gap:0;margin-bottom:20px">
        ${steps.map((s, i) => {
          const done    = i + 1 < step;
          const current = i + 1 === step;
          return `
            <div style="flex:1;text-align:center">
              <div style="width:28px;height:28px;border-radius:50%;margin:0 auto 4px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;
                background:${done ? 'var(--green)' : current ? 'var(--navy)' : 'var(--border)'};
                color:${done || current ? '#fff' : 'var(--muted)'}">
                ${done ? '✓' : i + 1}
              </div>
              <div style="font-size:9px;color:${current ? 'var(--navy)' : 'var(--muted)'};font-weight:${current ? '700' : '400'}">${s}</div>
            </div>
            ${i < steps.length - 1 ? `<div style="flex:0 0 20px;height:1px;background:${done ? 'var(--green)' : 'var(--border)'};margin-top:14px"></div>` : ''}`;
        }).join('')}
      </div>`;

    const area = document.getElementById('onboard-form-area');
    if (!area) return;
    area.innerHTML = progress + this._stepForm(step);
  },

  _stepForm(step) {
    const d = this._data;
    if (step === 1) return `
      <div class="input-group">
        <div class="input-label">Center Name *</div>
        <div class="input-with-icon">
          <span class="input-ico">🏪</span>
          <input id="ob-name" class="input-field" type="text" placeholder="e.g. AutoSpa Andheri" value="${d.name || ''}">
        </div>
      </div>
      <div class="input-group">
        <div class="input-label">Owner Name *</div>
        <div class="input-with-icon">
          <span class="input-ico">👤</span>
          <input id="ob-owner" class="input-field" type="text" placeholder="Your full name" value="${d.owner_name || ''}">
        </div>
      </div>
      <div class="input-group">
        <div class="input-label">Mobile Number *</div>
        <div class="input-with-icon">
          <span class="input-ico">📱</span>
          <input id="ob-mobile" class="input-field" type="tel" maxlength="10" placeholder="10-digit mobile"
            oninput="this.value=this.value.replace(/\\D/g,'')" value="${d.mobile || ''}">
        </div>
      </div>
      <div class="input-group">
        <div class="input-label">Email</div>
        <div class="input-with-icon">
          <span class="input-ico">📧</span>
          <input id="ob-email" class="input-field" type="email" placeholder="center@email.com" value="${d.email || ''}">
        </div>
      </div>
      <div class="input-group">
        <div class="input-label">City *</div>
        <div class="input-with-icon">
          <span class="input-ico">🏙️</span>
          <input id="ob-city" class="input-field" type="text" placeholder="e.g. Mumbai" value="${d.city || ''}">
        </div>
      </div>
      <div class="input-group">
        <div class="input-label">Full Address *</div>
        <div class="input-with-icon">
          <span class="input-ico">📍</span>
          <input id="ob-address" class="input-field" type="text" placeholder="Shop no, street, area" value="${d.address || ''}">
        </div>
      </div>
      <button class="btn btn-primary btn-full" onclick="Onboarding._next1()">Next →</button>`;

    if (step === 2) return `
      <div style="background:#fef9c3;border-radius:10px;padding:10px 12px;margin-bottom:16px;font-size:11px;color:#92400e">
        💡 GST details are required for SparkWash to process settlements. You can add them later too.
      </div>
      <div class="input-group">
        <div class="input-label">GSTIN</div>
        <div class="input-with-icon">
          <span class="input-ico">🧾</span>
          <input id="ob-gstin" class="input-field" type="text" placeholder="22AAAAA0000A1Z5" maxlength="15"
            oninput="this.value=this.value.toUpperCase()" value="${d.gstin || ''}">
        </div>
      </div>
      <div style="display:flex;gap:8px;margin-top:8px">
        <button class="btn btn-ghost" style="flex:1" onclick="Onboarding._prev()">← Back</button>
        <button class="btn btn-primary" style="flex:2" onclick="Onboarding._next2()">Next →</button>
      </div>`;

    if (step === 3) return `
      <div style="background:#f0f9ff;border-radius:10px;padding:10px 12px;margin-bottom:16px;font-size:11px;color:#0369a1">
        💳 Bank details are needed for SparkWash to credit settlements. You can add them later too.
      </div>
      <div class="input-group">
        <div class="input-label">Account Holder Name</div>
        <div class="input-with-icon">
          <span class="input-ico">👤</span>
          <input id="ob-acname" class="input-field" type="text" placeholder="Name as per bank" value="${d.account_name || ''}">
        </div>
      </div>
      <div class="input-group">
        <div class="input-label">Bank Account Number</div>
        <div class="input-with-icon">
          <span class="input-ico">🏦</span>
          <input id="ob-account" class="input-field" type="text" placeholder="Account number" value="${d.bank_account || ''}">
        </div>
      </div>
      <div class="input-group">
        <div class="input-label">IFSC Code</div>
        <div class="input-with-icon">
          <span class="input-ico">🔢</span>
          <input id="ob-ifsc" class="input-field" type="text" placeholder="e.g. HDFC0001234" maxlength="11"
            oninput="this.value=this.value.toUpperCase()" value="${d.ifsc || ''}">
        </div>
      </div>
      <div style="display:flex;gap:8px;margin-top:8px">
        <button class="btn btn-ghost" style="flex:1" onclick="Onboarding._prev()">← Back</button>
        <button class="btn btn-primary" id="ob-submit-btn" style="flex:2" onclick="Onboarding._submit()">Submit Application</button>
      </div>`;

    return '';
  },

  _next1() {
    const name    = document.getElementById('ob-name')?.value.trim();
    const owner   = document.getElementById('ob-owner')?.value.trim();
    const mobile  = document.getElementById('ob-mobile')?.value.trim();
    const email   = document.getElementById('ob-email')?.value.trim();
    const city    = document.getElementById('ob-city')?.value.trim();
    const address = document.getElementById('ob-address')?.value.trim();

    if (!name)    { UI.toast('Center name is required'); return; }
    if (!owner)   { UI.toast('Owner name is required'); return; }
    if (!/^[6-9]\d{9}$/.test(mobile)) { UI.toast('Enter a valid 10-digit mobile number'); return; }
    if (!city)    { UI.toast('City is required'); return; }
    if (!address) { UI.toast('Address is required'); return; }

    Object.assign(this._data, { name, owner_name: owner, mobile, email, city, address });
    this._step = 2;
    this._renderStep(2);
  },

  _next2() {
    const gstin = document.getElementById('ob-gstin')?.value.trim();
    if (gstin && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstin)) {
      UI.toast('Enter a valid 15-character GSTIN or leave blank');
      return;
    }
    this._data.gstin = gstin || '';
    this._step = 3;
    this._renderStep(3);
  },

  _prev() {
    if (this._step > 1) { this._step--; this._renderStep(this._step); }
  },

  async _submit() {
    const account = document.getElementById('ob-account')?.value.trim();
    const ifsc    = document.getElementById('ob-ifsc')?.value.trim();
    const acname  = document.getElementById('ob-acname')?.value.trim();
    Object.assign(this._data, { bank_account: account, ifsc, account_name: acname });

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
      UI.toast('Network error. Try again.');
    } finally {
      UI.setLoading(btn, false);
    }
  },

  _renderSuccess() {
    const area = document.getElementById('onboard-form-area');
    if (!area) return;
    area.innerHTML = `
      <div style="text-align:center;padding:20px 0">
        <div style="font-size:56px;margin-bottom:12px">🎉</div>
        <div style="font-weight:800;font-size:18px;margin-bottom:8px">Application Submitted!</div>
        <div style="font-size:13px;color:var(--muted);margin-bottom:20px;line-height:1.5">
          We've received your application for <strong>${this._data.name}</strong>.<br>
          The SparkWash team will review and contact you within <strong>24–48 hours</strong>.
        </div>
        <div class="card card-pad" style="text-align:left;margin-bottom:16px">
          <div style="font-size:11px;font-weight:700;color:var(--muted);margin-bottom:8px">WHAT HAPPENS NEXT</div>
          <div style="font-size:12px;display:grid;gap:8px">
            <div>✅ Our team reviews your details</div>
            <div>📞 We call you for a quick verification</div>
            <div>🏪 Center account created & credentials shared</div>
            <div>🚀 You go live on SparkWash!</div>
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
      UI.toast(`${icon} Application ${data.status} · ${data.notes || ''}`);
    } catch { UI.toast('Network error'); }
  },
};
