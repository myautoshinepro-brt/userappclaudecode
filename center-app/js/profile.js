// SparkWash Center App — profile.js

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
        : 'Add account for SparkWash settlements';
      bankSub.style.color = c.bank_account ? 'var(--green)' : '';
    }
  },

  renderEditCenter() {
    const c = AppState.center;
    const el = document.getElementById('edit-center-body');
    if (!el || !c) return;

    const washTypes = ['water','dry','steam','d2d'];
    const selected  = (c.wash_types || '').split(',').map(w => w.trim());

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
            <div style="font-size:11px;color:#166534;margin-top:2px">SparkWash will credit settlements to this account</div>
          </div>
        </div>` : `
        <div style="background:#fef9c3;border-radius:12px;padding:14px 16px;margin-bottom:16px;display:flex;align-items:center;gap:12px">
          <span style="font-size:24px">⚠️</span>
          <div>
            <div style="font-weight:700;font-size:13px;color:#92400e">No Bank Account Added</div>
            <div style="font-size:11px;color:#78350f;margin-top:2px">Add your bank account to receive SparkWash promo settlements</div>
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
        🔒 Your bank details are stored securely and only used for SparkWash promo credit settlements
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

    const body = {
      name:       document.getElementById('ec-name')?.value?.trim(),
      owner_name: document.getElementById('ec-owner')?.value?.trim(),
      email:      document.getElementById('ec-email')?.value?.trim(),
      address:    document.getElementById('ec-address')?.value?.trim(),
      gstin:      document.getElementById('ec-gstin')?.value?.trim(),
      open_time:  document.getElementById('ec-open')?.value,
      close_time: document.getElementById('ec-close')?.value,
      wash_types: washTypes,
    };
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
      localStorage.setItem('sw_center_data', JSON.stringify(AppState.center));
      UI.toast('✅ Center info saved');
      Router.back();
    } catch { UI.toast('Network error'); }
    finally  { UI.setLoading(btn, false); }
  },
};
