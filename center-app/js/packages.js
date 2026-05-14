// Pitbay Center App — packages.js
// Manage Packages screen: list + create/edit/delete with duration-aware slot capacity.

const PackagesScreen = {
  _packages: [],
  _editing: null,   // null while loading; { id?, wash_type, name, price, duration_minutes, tasks[] }
  DURATIONS: [15, 30, 45, 60, 75, 90, 105, 120],

  // ── LIST VIEW ───────────────────────────────────────────────

  async renderList() {
    const el = document.getElementById('packages-list');
    if (!el) return;
    el.innerHTML = '<div class="flex-center" style="padding:32px"><span class="spinner"></span></div>';
    try {
      const res = await fetch('/api/packages', {
        headers: { Authorization: `Bearer ${AppState.token}` },
      });
      const ct  = res.headers.get('content-type') || '';
      if (!ct.includes('application/json')) {
        this._renderApiError(`Server returned ${res.status} (not JSON). The /api/packages route isn't loaded — restart the server.`);
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        this._renderApiError(data.error || `Failed to load packages (${res.status})`);
        return;
      }
      this._packages = data.packages || [];
      this._renderList();
    } catch (err) {
      this._renderApiError('Network error — is the server running?');
    }
  },

  _renderApiError(msg) {
    const el = document.getElementById('packages-list');
    if (!el) return;
    el.innerHTML = `
      <div style="padding:40px 20px;text-align:center">
        <div style="font-size:38px;margin-bottom:8px">⚠️</div>
        <div style="font-size:14px;font-weight:700;color:var(--red);margin-bottom:6px">Couldn't load packages</div>
        <div style="font-size:12px;color:var(--text-secondary);line-height:1.5;margin-bottom:16px">${this._esc(msg)}</div>
        <button class="btn btn-primary" onclick="PackagesScreen.renderList()">🔄 Retry</button>
      </div>`;
  },

  _renderList() {
    const el = document.getElementById('packages-list');
    if (!el) return;

    const allowed = AppState.washTypesList;
    if (this._packages.length === 0) {
      el.innerHTML = `
        <div class="empty-state" style="padding:40px 20px;text-align:center">
          <div style="font-size:38px;margin-bottom:8px">📦</div>
          <div class="empty-title" style="font-size:15px;font-weight:700">No packages yet</div>
          <div style="font-size:12px;color:var(--text-secondary);margin:6px 0 16px">
            Create your first package — name, price, duration & tasks.
          </div>
          <button class="btn btn-primary" onclick="PackagesScreen.openEdit(null)">+ Add Package</button>
        </div>`;
      return;
    }

    // Group by wash_type, only show wash types this center offers
    const groups = {};
    for (const p of this._packages) {
      if (!allowed.includes(p.wash_type)) continue;
      (groups[p.wash_type] = groups[p.wash_type] || []).push(p);
    }

    const order = ['water','dry','steam','d2d'];
    const html = order
      .filter(wt => groups[wt])
      .map(wt => {
        const cards = groups[wt].map(p => this._cardHtml(p)).join('');
        return `
          <div style="margin-bottom:18px">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;font-weight:700;font-size:13px;color:var(--text-secondary);text-transform:uppercase;letter-spacing:.04em">
              ${UI.washIcon(wt)} ${UI.washLabel(wt)}
              <span style="font-weight:500;color:var(--text-tertiary);text-transform:none;letter-spacing:0">·  ${groups[wt].length}</span>
            </div>
            ${cards}
          </div>`;
      }).join('');

    // Show wash types without packages as "add" prompts
    const missing = allowed.filter(wt => !groups[wt]).map(wt => `
      <div style="border:1.5px dashed var(--border-medium);border-radius:var(--radius-md);padding:14px;margin-bottom:10px;display:flex;align-items:center;gap:10px;cursor:pointer"
           onclick='PackagesScreen.openEdit({wash_type:"${wt}"})'>
        <div style="font-size:22px">${UI.washIcon(wt)}</div>
        <div style="flex:1">
          <div style="font-weight:600;font-size:13px">No ${UI.washLabel(wt)} packages</div>
          <div style="font-size:11px;color:var(--text-secondary)">Tap to add one</div>
        </div>
        <div style="font-weight:700;color:var(--navy)">+ Add</div>
      </div>`).join('');

    el.innerHTML = `
      ${html}
      ${missing}
      <div style="text-align:center;margin-top:8px">
        <button class="btn btn-primary" onclick="PackagesScreen.openEdit(null)">+ Add New Package</button>
      </div>
      <div style="font-size:11px;color:var(--text-tertiary);margin-top:14px;text-align:center;line-height:1.5">
        ⏱ A package's duration controls how many 30-min slots it consumes —<br>
        a 1-hour package occupies 2 consecutive slots for capacity.
      </div>
    `;
  },

  _cardHtml(p) {
    const tasksCount = (p.tasks || []).length;
    const slots = Math.max(1, Math.ceil((p.duration_minutes || 30) / 30));
    return `
      <div style="background:#fff;border:.5px solid var(--border-light);border-radius:var(--radius-md);padding:12px 14px;margin-bottom:8px;box-shadow:var(--shadow-sm)">
        <div style="display:flex;align-items:flex-start;gap:10px">
          <div style="flex:1;min-width:0">
            <div style="font-weight:700;font-size:14px;color:var(--text-primary)">${this._esc(p.name)}</div>
            <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px;font-size:11px">
              <span style="background:#e3f2fd;color:#1565c0;padding:3px 8px;border-radius:10px;font-weight:600">${UI.formatPrice(p.price)}</span>
              <span style="background:#fff3e0;color:#e65100;padding:3px 8px;border-radius:10px;font-weight:600">⏱ ${p.duration_minutes} min</span>
              <span style="background:#f3e5f5;color:#6a1b9a;padding:3px 8px;border-radius:10px;font-weight:600">${slots} slot${slots>1?'s':''}</span>
              ${tasksCount>0 ? `<span style="background:#e8f5e9;color:#2e7d32;padding:3px 8px;border-radius:10px;font-weight:600">${tasksCount} task${tasksCount>1?'s':''}</span>` : ''}
            </div>
            ${tasksCount>0 ? `
              <div style="margin-top:8px;font-size:11px;color:var(--text-secondary);line-height:1.5">
                ${(p.tasks||[]).slice(0,3).map(t => `• ${this._esc(t)}`).join('<br>')}
                ${tasksCount>3 ? `<br><span style="color:var(--text-tertiary)">+${tasksCount-3} more</span>` : ''}
              </div>` : ''}
          </div>
        </div>
        <div style="display:flex;gap:6px;margin-top:10px">
          <button class="btn btn-outline btn-sm" style="flex:1" onclick='PackagesScreen.openEdit(${p.id})'>✏️ Edit</button>
          <button class="btn btn-outline btn-sm" style="color:var(--red);border-color:#fecaca" onclick="PackagesScreen.confirmDelete(${p.id})">🗑️</button>
        </div>
      </div>`;
  },

  // ── EDIT FORM ───────────────────────────────────────────────

  openEdit(idOrSeed) {
    if (idOrSeed === null) {
      const wt = AppState.washTypesList[0] || 'water';
      this._editing = { wash_type: wt, name: '', price: '', duration_minutes: 30, tasks: [] };
    } else if (typeof idOrSeed === 'object') {
      this._editing = { wash_type: idOrSeed.wash_type, name: '', price: '', duration_minutes: 30, tasks: [] };
    } else {
      const p = this._packages.find(x => x.id === idOrSeed);
      if (!p) { UI.toast('Package not found'); return; }
      this._editing = { id: p.id, wash_type: p.wash_type, name: p.name, price: p.price, duration_minutes: p.duration_minutes, tasks: [...(p.tasks||[])] };
    }
    Router.go('edit-package');
    this._renderEditForm();
  },

  _renderEditForm() {
    const e = this._editing;
    if (!e) return;
    const isNew = !e.id;
    document.getElementById('edit-package-title').textContent = isNew ? 'New Package' : 'Edit Package';
    document.getElementById('edit-package-sub').textContent   = isNew ? 'Create a new service offering' : e.name || '';

    const allowed = AppState.washTypesList;
    const wtChips = allowed.map(wt => `
      <div class="wt-chip ${e.wash_type===wt?'active':''}" data-wt="${wt}"
           onclick="PackagesScreen._setWashType('${wt}')"
           style="display:inline-flex;align-items:center;gap:5px;padding:8px 12px;border-radius:18px;border:1.5px solid ${e.wash_type===wt?'var(--navy)':'var(--border-medium)'};background:${e.wash_type===wt?'#e3f2fd':'#fff'};color:${e.wash_type===wt?'var(--navy)':'var(--text-primary)'};font-size:12px;font-weight:600;cursor:pointer">
        ${UI.washIcon(wt)} ${UI.washLabel(wt)}
      </div>`).join('');

    const durChips = this.DURATIONS.map(d => {
      const slots = Math.max(1, Math.ceil(d/30));
      const sel = e.duration_minutes === d;
      return `
        <div class="dur-chip" onclick="PackagesScreen._setDuration(${d})"
             style="padding:8px 10px;border-radius:12px;border:1.5px solid ${sel?'var(--navy)':'var(--border-medium)'};background:${sel?'#e3f2fd':'#fff'};color:${sel?'var(--navy)':'var(--text-primary)'};font-size:12px;font-weight:600;cursor:pointer;text-align:center;flex:1;min-width:60px">
          ${d}m<div style="font-size:10px;color:${sel?'var(--navy)':'var(--text-tertiary)'};font-weight:500;margin-top:2px">${slots} slot${slots>1?'s':''}</div>
        </div>`;
    }).join('');

    const tasksHtml = e.tasks.length === 0
      ? `<div style="font-size:12px;color:var(--text-tertiary);padding:10px 0">No tasks added yet. Add steps the worker will perform.</div>`
      : e.tasks.map((t, i) => `
          <div style="display:flex;align-items:center;gap:8px;background:#f5f5f5;border-radius:10px;padding:8px 10px;margin-bottom:6px">
            <span style="color:var(--text-tertiary);font-size:11px;min-width:18px">${i+1}.</span>
            <div style="flex:1;font-size:13px">${this._esc(t)}</div>
            <button onclick="PackagesScreen._removeTask(${i})" style="background:none;border:none;cursor:pointer;font-size:14px;color:var(--red)">✕</button>
          </div>`).join('');

    document.getElementById('edit-package-body').innerHTML = `
      <div class="input-group">
        <div class="input-label">Package Name <span style="color:var(--red)">*</span></div>
        <input id="ep-name" class="input-field" maxlength="60" value="${this._esc(e.name||'')}" placeholder="e.g. Premium Foam Wash">
      </div>

      <div class="input-group">
        <div class="input-label">Wash Type</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px">${wtChips}</div>
      </div>

      <div class="input-group">
        <div class="input-label">Price (₹) <span style="color:var(--red)">*</span></div>
        <input id="ep-price" class="input-field" type="number" min="0" max="100000" value="${e.price ?? ''}" placeholder="299">
      </div>

      <div class="input-group">
        <div class="input-label">Duration <span style="color:var(--text-tertiary);font-weight:400">(controls how many 30-min slots are consumed)</span></div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px">${durChips}</div>
      </div>

      <div class="input-group">
        <div class="input-label">Tasks / Steps <span style="color:var(--text-tertiary);font-weight:400">(${e.tasks.length}/20)</span></div>
        <div id="ep-tasks-list">${tasksHtml}</div>
        <div style="display:flex;gap:6px;margin-top:8px">
          <input id="ep-task-input" class="input-field" maxlength="80" placeholder="e.g. Foam wash" style="flex:1"
            onkeydown="if(event.key==='Enter'){event.preventDefault();PackagesScreen._addTaskFromInput()}">
          <button class="btn btn-outline btn-sm" onclick="PackagesScreen._addTaskFromInput()">+ Add</button>
        </div>
      </div>

      <button class="btn btn-primary btn-full" id="ep-save-btn" onclick="PackagesScreen.save()" style="margin-top:6px">
        ${e.id ? '💾 Save Changes' : '+ Create Package'}
      </button>

      ${e.id ? `
        <button class="btn btn-outline btn-full" onclick="PackagesScreen.confirmDelete(${e.id})"
                style="margin-top:10px;color:var(--red);border-color:#fecaca">
          🗑️ Delete Package
        </button>` : ''}

      <div style="margin-top:14px;padding:10px 12px;background:#fff8e1;border-radius:10px;font-size:11px;color:#6a4c00;line-height:1.5">
        💡 <strong>Tip:</strong> Setting a longer duration automatically blocks the matching number of consecutive 30-min slots in the booking calendar — keeps your capacity honest.
      </div>
    `;
  },

  _setWashType(wt) {
    if (!this._editing) return;
    this._readForm();
    this._editing.wash_type = wt;
    this._renderEditForm();
  },

  _setDuration(d) {
    if (!this._editing) return;
    this._readForm();
    this._editing.duration_minutes = d;
    this._renderEditForm();
  },

  _readForm() {
    const e = this._editing;
    const nameEl  = document.getElementById('ep-name');
    const priceEl = document.getElementById('ep-price');
    if (nameEl)  e.name  = nameEl.value;
    if (priceEl) e.price = priceEl.value;
  },

  _addTaskFromInput() {
    if (!this._editing) return;
    if (this._editing.tasks.length >= 20) { UI.toast('Max 20 tasks per package'); return; }
    const inp = document.getElementById('ep-task-input');
    const v   = (inp?.value || '').trim();
    if (!v) return;
    this._readForm();
    this._editing.tasks.push(v);
    this._renderEditForm();
    setTimeout(() => document.getElementById('ep-task-input')?.focus(), 0);
  },

  _removeTask(i) {
    if (!this._editing) return;
    this._readForm();
    this._editing.tasks.splice(i, 1);
    this._renderEditForm();
  },

  async save() {
    if (!this._editing) return;
    this._readForm();
    const e = this._editing;

    const name = (e.name || '').trim();
    const price = parseInt(e.price, 10);
    if (!name)              { UI.toast('Package name is required'); return; }
    if (!Number.isFinite(price) || price < 0) { UI.toast('Enter a valid price'); return; }

    const btn = document.getElementById('ep-save-btn');
    UI.setLoading(btn, true);
    try {
      const url    = e.id ? `/api/packages/${e.id}` : '/api/packages';
      const method = e.id ? 'PATCH' : 'POST';
      const res    = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${AppState.token}` },
        body: JSON.stringify({
          wash_type: e.wash_type, name, price,
          duration_minutes: e.duration_minutes, tasks: e.tasks,
        }),
      });
      const ct = res.headers.get('content-type') || '';
      if (!ct.includes('application/json')) {
        UI.toast(`Server ${res.status} — restart the server to load /api/packages`, 4000);
        return;
      }
      const data = await res.json();
      if (!res.ok) { UI.toast(data.error || 'Failed to save'); return; }

      UI.toast(e.id ? '✅ Package updated' : '✅ Package created');
      this._editing = null;
      Router.go('manage-packages');
    } catch { UI.toast('Network error — is the server running?'); }
    finally  { UI.setLoading(btn, false); }
  },

  confirmDelete(id) {
    const p = this._packages.find(x => x.id === id);
    if (!p) return;
    if (!confirm(`Delete "${p.name}"?\n\nExisting bookings using this package will not be affected.`)) return;
    this._delete(id);
  },

  async _delete(id) {
    try {
      const res = await fetch(`/api/packages/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${AppState.token}` },
      });
      const ct = res.headers.get('content-type') || '';
      if (!ct.includes('application/json')) {
        UI.toast(`Server ${res.status} — restart the server to load /api/packages`, 4000);
        return;
      }
      if (!res.ok) { UI.toast('Failed to delete'); return; }
      UI.toast('🗑️ Package deleted');
      this._editing = null;
      Router.go('manage-packages');
    } catch { UI.toast('Network error — is the server running?'); }
  },

  _esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  },
};
