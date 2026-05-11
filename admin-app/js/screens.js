// ============================================================
// SparkWash Admin App — screens.js
// Centers, AdminBookings, Chat, ChatDetail, AdminReports, SuperAdmin
// ============================================================

// ── CENTERS ─────────────────────────────────────────────────
const Centers = {
  render() {
    const rated = c => c.rating >= 4.5 ? '#22c55e' : c.rating >= 4 ? '#f59e0b' : '#ef4444';
    const sorted = [...CENTERS].sort((a,b) => (a.displayOrder||99)-(b.displayOrder||99));
    setHtml('centers-list', sorted.map((c, i) => `
      <div class="card" style="padding:14px;cursor:pointer;margin-bottom:10px;opacity:${c.visible?1:.65}" onclick="Centers.openDetail('${c.id}')">
        <!-- Name + badges row -->
        <div class="flex-b" style="margin-bottom:8px">
          <div style="flex:1;min-width:0">
            <div class="flex-c gap6" style="margin-bottom:2px">
              <span style="font-size:10px;font-weight:800;color:var(--primary);background:var(--primary-light);border-radius:5px;padding:1px 6px">#${c.displayOrder}</span>
              <div class="bold" style="font-size:13px">${c.name}</div>
            </div>
            <div class="text-xs text-muted" style="margin-top:1px">👤 ${c.owner} · 📍 ${c.area}</div>
          </div>
          <span class="badge ${c.isOpen?'b-open':'b-closed'}" style="flex-shrink:0;margin-left:8px">${c.isOpen?'🟢 Open':'🔴 Closed'}</span>
        </div>

        <!-- App visibility + order — inline controls, stop propagation so card click doesn't fire -->
        <div style="display:flex;align-items:center;gap:8px;padding:7px 10px;background:var(--bg);border-radius:10px;margin-bottom:10px" onclick="event.stopPropagation()">
          <span style="font-size:10px;color:var(--muted);font-weight:600">📱 App</span>
          <span style="font-size:10px;font-weight:700;color:${c.visible?'#166534':'#dc2626'};flex:1">${c.visible?'Visible':'Hidden'}</span>
          <div class="tog ${c.visible?'on':''}" onclick="Centers.toggleVisibility('${c.id}')"></div>
          <div style="width:.5px;height:18px;background:var(--border2);margin:0 2px"></div>
          <span style="font-size:10px;color:var(--muted);font-weight:600">Order</span>
          <button onclick="Centers.changeOrder('${c.id}',-1)"
            style="width:24px;height:24px;border-radius:6px;background:var(--primary-light);color:var(--primary);border:none;cursor:pointer;font-size:14px;font-weight:900;display:flex;align-items:center;justify-content:center">−</button>
          <span style="font-size:12px;font-weight:800;color:var(--primary);min-width:20px;text-align:center">#${c.displayOrder}</span>
          <button onclick="Centers.changeOrder('${c.id}',1)"
            style="width:24px;height:24px;border-radius:6px;background:var(--primary-light);color:var(--primary);border:none;cursor:pointer;font-size:14px;font-weight:900;display:flex;align-items:center;justify-content:center">+</button>
        </div>

        <!-- Stats -->
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:6px;margin-bottom:9px">
          <div style="text-align:center;background:var(--bg);border-radius:9px;padding:6px 3px">
            <div class="bold" style="font-size:16px">${c.totalBookings}</div>
            <div style="font-size:9px;color:var(--muted)">Bookings</div>
          </div>
          <div style="text-align:center;background:var(--bg);border-radius:9px;padding:6px 3px">
            <div class="bold" style="font-size:16px;color:var(--primary)">${c.activeNow}</div>
            <div style="font-size:9px;color:var(--muted)">Active</div>
          </div>
          ${(() => {
            const st = revenueStatus(c.id);
            if (st === 'visible') return `
              <div style="text-align:center;background:var(--bg);border-radius:9px;padding:6px 3px">
                <div class="bold" style="font-size:16px">₹${Math.round(c.todayRevenue/1000*10)/10}k</div>
                <div style="font-size:9px;color:var(--muted)">Revenue</div>
              </div>`;
            if (st === 'pending') return `
              <div style="text-align:center;background:#fffbeb;border-radius:9px;padding:6px 3px" onclick="event.stopPropagation()">
                <div style="font-size:13px">⏳</div>
                <div style="font-size:9px;color:var(--gold);font-weight:700">Pending</div>
              </div>`;
            return `
              <div style="text-align:center;background:var(--primary-light);border-radius:9px;padding:6px 3px;cursor:pointer" onclick="event.stopPropagation();Centers.reqRev('${c.id}')">
                <div style="font-size:13px">🔒</div>
                <div style="font-size:9px;color:var(--primary);font-weight:700">Request</div>
              </div>`;
          })()}
          <div style="text-align:center;background:var(--bg);border-radius:9px;padding:6px 3px">
            <div class="bold" style="font-size:16px;color:${rated(c)}">${c.rating}</div>
            <div style="font-size:9px;color:var(--muted)">Rating</div>
          </div>
        </div>
        <div class="flex-b">
          <div style="font-size:10px;color:var(--muted)">${c.washTypes.map(t=>WASH_LABELS[t].label).join(' · ')}</div>
          <span style="font-size:11px;color:var(--primary);font-weight:700">Details →</span>
        </div>
      </div>`).join(''));

    const addBtn = $id('centers-add-btn');
    if (addBtn) addBtn.style.display = AppState.role === 'superadmin' ? '' : 'none';
  },

  openDetail(centerId) {
    AppState.selectedCenterId = centerId;
    Router.go('center-detail');
  },

  toggleVisibility(centerId) {
    const c = CENTERS.find(x => x.id === centerId);
    if (!c) return;
    c.visible = !c.visible;
    logChange(centerId, 'App visibility changed', `${c.name} ${c.visible ? 'shown in' : 'hidden from'} customer app`);
    UI.toast(c.visible ? `👁️ ${c.name} visible in app` : `🚫 ${c.name} hidden from app`);
    this.render();
  },

  changeOrder(centerId, delta) {
    const c = CENTERS.find(x => x.id === centerId);
    if (!c) return;
    const newOrder = Math.max(1, Math.min(CENTERS.length, (c.displayOrder || 1) + delta));
    if (newOrder === c.displayOrder) return;
    const other = CENTERS.find(x => x.id !== centerId && x.displayOrder === newOrder);
    if (other) other.displayOrder = c.displayOrder;
    c.displayOrder = newOrder;
    logChange(centerId, 'Display order changed', `${c.name} moved to position #${newOrder} in customer app`);
    UI.toast(`📋 ${c.name} → #${newOrder} in app`);
    this.render();
  },

  reqRev(centerId) { requestRevenue(centerId); },
};

// ── CENTER DETAIL (tabbed) ───────────────────────────────────
const CenterDetail = {
  tab:         'bookings',
  pkgType:     'water',
  slotsType:   'water',
  _editTasks:  [],
  _addTasks:   [],

  render() {
    const c = CENTERS.find(x => x.id === AppState.selectedCenterId);
    if (!c) return;

    const cBk    = ALL_BOOKINGS.filter(b => b.centerId === c.id && b.date === 'Today');
    const doneBk = cBk.filter(b => b.status === 'done');
    const actBk  = cBk.filter(b => ['arrived','washing'].includes(b.status));
    const rev    = doneBk.reduce((s,b) => s+b.price, 0);
    const rated  = doneBk.filter(b => b.rating != null);
    const avgRat = rated.length ? (rated.reduce((s,b)=>s+b.rating,0)/rated.length).toFixed(1) : null;

    setText('cd-name',  c.name);
    setText('cd-owner', `👤 ${c.owner}`);
    setText('cd-area',  `📍 ${c.area}`);

    setHtml('cd-stats', `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        ${canSeeRevenue(c.id)
          ? `<div style="background:rgba(255,255,255,.15);border-radius:12px;padding:11px">
               <div style="font-size:20px;font-weight:900;color:#fff">${UI.formatPrice(rev)}</div>
               <div style="font-size:10px;color:rgba(255,255,255,.75);margin-top:2px">Today's Revenue</div>
             </div>`
          : revenueStatus(c.id) === 'pending'
            ? `<div style="background:rgba(255,255,255,.1);border-radius:12px;padding:11px;text-align:center">
                 <div style="font-size:18px;font-weight:900;color:#fde68a">⏳</div>
                 <div style="font-size:10px;color:rgba(255,255,255,.75);margin-top:2px">Revenue Pending</div>
               </div>`
            : `<div style="background:rgba(255,255,255,.1);border-radius:12px;padding:11px;text-align:center;cursor:pointer" onclick="CenterDetail.reqRev('${c.id}')">
                 <div style="font-size:18px;font-weight:900;color:#fff">🔒</div>
                 <div style="font-size:10px;color:rgba(255,255,255,.75);margin-top:2px">Tap to Request</div>
               </div>`}
        <div style="background:rgba(255,255,255,.15);border-radius:12px;padding:11px">
          <div style="font-size:20px;font-weight:900;color:#fde68a">${avgRat ? avgRat+' ⭐' : '—'}</div>
          <div style="font-size:10px;color:rgba(255,255,255,.75);margin-top:2px">Avg Rating (today)</div>
        </div>
        <div style="background:rgba(255,255,255,.15);border-radius:12px;padding:11px">
          <div style="font-size:20px;font-weight:900;color:#86efac">${actBk.length}</div>
          <div style="font-size:10px;color:rgba(255,255,255,.75);margin-top:2px">Active Washes</div>
        </div>
        <div style="background:rgba(255,255,255,.15);border-radius:12px;padding:11px">
          <div style="font-size:20px;font-weight:900;color:#fca5a5">${cBk.filter(b=>['new','confirmed'].includes(b.status)).length}</div>
          <div style="font-size:10px;color:rgba(255,255,255,.75);margin-top:2px">Pending</div>
        </div>
      </div>`);

    setHtml('cd-actions', `
      <button class="btn btn-sm" style="background:rgba(255,255,255,.2);color:#fff;border:1.5px solid rgba(255,255,255,.3)" onclick="openCall('${c.owner}','${c.phone}','${c.name}')">📞 Call</button>
      <button class="btn btn-sm" style="background:rgba(255,255,255,.2);color:#fff;border:1.5px solid rgba(255,255,255,.3)" onclick="CenterDetail.openChat('${c.id}')">💬 Chat</button>
      ${AppState.role==='superadmin' ? `<button class="btn btn-sm" style="background:rgba(255,255,255,.2);color:#fff;border:1.5px solid rgba(255,255,255,.3)" onclick="SuperAdmin.openEditCenter('${c.id}')">✏️ Edit</button>` : ''}
      <button class="btn btn-sm" style="background:${c.isOpen?'rgba(220,38,38,.6)':'rgba(22,163,74,.6)'};color:#fff" onclick="CenterDetail.toggleOpen('${c.id}')">
        ${c.isOpen ? '🔴 Close' : '🟢 Open'}
      </button>`);

    // Customer app visibility row
    setHtml('cd-app-visibility', `
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
        <span style="font-size:10px;color:rgba(255,255,255,.8);font-weight:600">📱 Customer App</span>
        <div style="display:flex;align-items:center;gap:7px;background:rgba(0,0,0,.25);border-radius:10px;padding:5px 10px;flex:1;min-width:0;flex-wrap:wrap;gap:8px">
          <div style="display:flex;align-items:center;gap:6px;flex:1">
            <span style="font-size:11px;font-weight:700;color:${c.visible?'#86efac':'#fca5a5'}">${c.visible?'👁️ Visible':'🚫 Hidden'}</span>
            <div class="tog ${c.visible?'on':''}" onclick="CenterDetail.toggleVisibility('${c.id}')" style="flex-shrink:0"></div>
          </div>
          <div style="display:flex;align-items:center;gap:5px;flex-shrink:0">
            <span style="font-size:10px;color:rgba(255,255,255,.7)">Position</span>
            <button onclick="CenterDetail.changeOrder('${c.id}',-1)"
              style="width:22px;height:22px;border-radius:5px;background:rgba(255,255,255,.2);color:#fff;border:none;cursor:pointer;font-size:13px;display:flex;align-items:center;justify-content:center">−</button>
            <span style="font-size:13px;font-weight:800;color:#fde68a;min-width:18px;text-align:center">#${c.displayOrder}</span>
            <button onclick="CenterDetail.changeOrder('${c.id}',1)"
              style="width:22px;height:22px;border-radius:5px;background:rgba(255,255,255,.2);color:#fff;border:none;cursor:pointer;font-size:13px;display:flex;align-items:center;justify-content:center">+</button>
          </div>
        </div>
      </div>`);

    // Tab bar
    const tabs = [
      { key:'bookings', label:'📋 Bookings' },
      { key:'packages', label:'📦 Packages' },
      { key:'slots',    label:'🕐 Slots' },
      { key:'history',  label:'📜 History' },
    ];
    setHtml('cd-tab-bar', tabs.map(t => `
      <div onclick="CenterDetail.setTab('${t.key}')"
           style="flex:1;text-align:center;padding:10px 4px;font-size:10px;font-weight:700;cursor:pointer;border-bottom:2.5px solid ${this.tab===t.key?'var(--primary)':'transparent'};color:${this.tab===t.key?'var(--primary)':'var(--muted)'}">
        ${t.label}
      </div>`).join(''));

    this._renderActiveTab(c, cBk);
  },

  setTab(t) { this.tab = t; this.render(); },

  _renderActiveTab(c, cBk) {
    // Show only the active tab content div
    ['bookings','packages','slots','history'].forEach(t => {
      const el = $id('cd-tab-' + t);
      if (el) el.style.display = this.tab === t ? '' : 'none';
    });
    if (this.tab === 'bookings') this._renderBookings(c, cBk);
    if (this.tab === 'packages') this._renderPackages(c);
    if (this.tab === 'slots')    this._renderSlots(c);
    if (this.tab === 'history')  this._renderHistory(c);
  },

  // ── BOOKINGS TAB ──
  _renderBookings(c, cBk) {
    setHtml('cd-tab-bookings', `<div style="padding:10px 13px 12px">${
      cBk.length ? cBk.map(b => {
        const sm = STATUS_META[b.status];
        const wl = WASH_LABELS[b.type];
        return `
          <div class="bk-card">
            <div class="flex-b" style="margin-bottom:5px">
              <div>
                <div class="bold text-xs">${b.customer} <span class="text-muted">${b.id}</span></div>
                <div style="font-size:10px;color:var(--muted)">${b.vehicle} · ${b.model}</div>
              </div>
              <span class="badge ${sm.cls}">${sm.icon} ${sm.label}</span>
            </div>
            <div class="flex-c gap6" style="flex-wrap:wrap;margin-bottom:7px">
              <span class="badge" style="background:${wl.bg};color:${wl.color}">${wl.label}</span>
              <span class="text-xs text-muted">🕐 ${b.slot}</span>
              <span class="text-xs bold text-primary">₹${b.price}</span>
            </div>
            <div style="display:flex;gap:6px">
              <button class="btn btn-sm btn-primary" style="flex:1" onclick="AdminBookings.openEdit('${b.id}')">✏️ Edit</button>
              <button class="btn btn-sm btn-ghost" onclick="openCall('${b.customer}','${b.phone}','${b.id}')">📞</button>
              <button class="btn btn-sm btn-ghost" onclick="AdminBookings.openChatWithCustomer('${b.id}')">💬</button>
            </div>
          </div>`;
      }).join('') : '<div style="padding:30px;text-align:center;color:var(--muted);font-size:12px">No bookings today</div>'
    }</div>`);
  },

  // ── PACKAGES TAB ──
  _renderPackages(c) {
    const pkgs       = CENTER_PACKAGES[c.id] || {};
    const availTypes = c.washTypes;
    if (!availTypes.includes(this.pkgType)) this.pkgType = availTypes[0] || 'water';

    // Type selector tabs
    const typeBar = availTypes.map(t => `
      <div onclick="CenterDetail.setPkgType('${t}')"
           style="flex-shrink:0;padding:6px 14px;border-radius:18px;border:1.5px solid ${this.pkgType===t?'var(--primary)':'var(--border2)'};
                  background:${this.pkgType===t?'var(--primary)':'#fff'};color:${this.pkgType===t?'#fff':'var(--muted)'};
                  font-size:11px;font-weight:700;cursor:pointer;white-space:nowrap">
        ${WASH_LABELS[t].label}
      </div>`).join('');

    // Package rows for selected type
    const list = pkgs[this.pkgType] || [];
    const packageRows = list.map(p => `
      <div style="padding:11px 12px;border-bottom:.5px solid var(--border)">
        <div class="flex-b">
          <div style="flex:1;min-width:0">
            <div class="bold text-xs" style="opacity:${p.active?1:.5}">${p.name}</div>
            <div style="font-size:11px;color:var(--primary);font-weight:700;margin-top:2px;opacity:${p.active?1:.5}">₹${p.price} <span style="color:var(--muted);font-weight:400">· ${p.duration}</span></div>
            ${p.tasks?.length ? `<div style="font-size:9px;color:var(--muted);margin-top:3px">📋 ${p.tasks.length} step${p.tasks.length!==1?'s':''}</div>` : ''}
          </div>
          <div style="display:flex;align-items:center;gap:10px;flex-shrink:0">
            <button onclick="CenterDetail.openEditPackage('${c.id}','${p.id}')"
              style="font-size:11px;padding:4px 10px;border-radius:7px;background:var(--primary-light);color:var(--primary);border:none;cursor:pointer;font-weight:700">✏️ Edit</button>
            <div class="tog ${p.active?'on':''}" onclick="CenterDetail.togglePkg('${c.id}','${p.id}')"></div>
          </div>
        </div>
      </div>`).join('');

    // Wash type toggles — collapsed at bottom
    const allTypes   = ['water','dry','steam','d2d'];
    const typeToggles = allTypes.map(t => `
      <div class="flex-b" style="padding:9px 12px;border-bottom:.5px solid var(--border)">
        <div class="flex-c gap8">
          <span style="font-size:14px">${WASH_LABELS[t].label.split(' ')[0]}</span>
          <div>
            <div class="bold text-xs">${WASH_LABELS[t].label.replace(/^\S+\s/,'')}</div>
            <div style="font-size:10px;color:${availTypes.includes(t)?'var(--green)':'var(--muted)'}">${availTypes.includes(t)?'✅ Active':'⛔ Disabled'}</div>
          </div>
        </div>
        <div class="tog ${availTypes.includes(t)?'on':''}" onclick="CenterDetail.toggleWashType('${c.id}','${t}')"></div>
      </div>`).join('');

    setHtml('cd-tab-packages', `
      <!-- Type selector -->
      <div style="display:flex;gap:6px;padding:10px 13px 8px;overflow-x:auto;scrollbar-width:none;border-bottom:.5px solid var(--border)">${typeBar}</div>

      <!-- Package list -->
      <div style="padding:0 13px 4px;margin-top:8px">
        <div class="flex-b" style="margin-bottom:6px">
          <div class="slbl" style="margin-bottom:0">${WASH_LABELS[this.pkgType]?.label} packages (${list.length})</div>
          <button class="btn btn-sm btn-primary" onclick="CenterDetail.openAddPackage('${c.id}')">+ Add</button>
        </div>
      </div>
      <div style="margin:0 13px;border:.5px solid var(--border);border-radius:12px;overflow:hidden;background:#fff">
        ${list.length ? packageRows : `<div style="padding:24px;text-align:center;color:var(--muted);font-size:12px">No packages yet for ${WASH_LABELS[this.pkgType]?.label}<br><button class="btn btn-sm btn-primary" style="margin-top:10px" onclick="CenterDetail.openAddPackage('${c.id}')">+ Add First Package</button></div>`}
      </div>

      <!-- Wash type availability -->
      <div style="padding:12px 13px 4px;margin-top:8px">
        <div class="slbl">Wash Type Availability</div>
        <div style="font-size:11px;color:var(--muted);margin-bottom:6px">Toggle which wash types this center offers</div>
      </div>
      <div style="margin:0 13px;border:.5px solid var(--border);border-radius:12px;overflow:hidden;background:#fff">${typeToggles}</div>
      <div style="height:20px"></div>`);
  },

  setPkgType(t) { this.pkgType = t; this.render(); },

  toggleWashType(centerId, type) {
    const c = CENTERS.find(x => x.id === centerId);
    if (!c) return;
    const idx = c.washTypes.indexOf(type);
    let detail;
    if (idx === -1) {
      c.washTypes.push(type);
      detail = `${WASH_LABELS[type].label} enabled`;
    } else {
      if (c.washTypes.length === 1) { UI.toast('⚠️ At least one wash type must be active'); return; }
      c.washTypes.splice(idx, 1);
      detail = `${WASH_LABELS[type].label} disabled`;
    }
    logChange(centerId, 'Wash type updated', detail);
    UI.toast(`✅ ${detail}`);
    this.render();
  },

  togglePkg(centerId, pkgId) {
    const pkgs = CENTER_PACKAGES[centerId];
    if (!pkgs) return;
    for (const type in pkgs) {
      const p = pkgs[type].find(x => x.id === pkgId);
      if (p) {
        p.active = !p.active;
        const detail = `${WASH_LABELS[type].label} · ${p.name}: ${p.active ? 'Enabled' : 'Disabled'}`;
        logChange(centerId, 'Package ' + (p.active ? 'enabled' : 'disabled'), detail);
        UI.toast(p.active ? `✅ ${p.name} enabled` : `⛔ ${p.name} disabled`);
        this.render();
        return;
      }
    }
  },

  updatePkgPrice(centerId, pkgId, newVal) {
    const price = parseInt(newVal);
    if (isNaN(price) || price < 1) return;
    const pkgs = CENTER_PACKAGES[centerId];
    for (const type in pkgs) {
      const p = pkgs[type].find(x => x.id === pkgId);
      if (p) {
        const detail = `${WASH_LABELS[type].label} · ${p.name}: ₹${p.price} → ₹${price}`;
        p.price = price;
        logChange(centerId, 'Package price updated', detail);
        UI.toast('✅ Price updated → ₹' + price);
        return;
      }
    }
  },

  updatePkgDuration(centerId, pkgId, newVal) {
    const dur = newVal.trim();
    if (!dur) return;
    const pkgs = CENTER_PACKAGES[centerId];
    for (const type in pkgs) {
      const p = pkgs[type].find(x => x.id === pkgId);
      if (p) {
        const detail = `${WASH_LABELS[type].label} · ${p.name}: ${p.duration} → ${dur}`;
        p.duration = dur;
        logChange(centerId, 'Package duration updated', detail);
        UI.toast('✅ Duration updated');
        return;
      }
    }
  },

  // ── TASK MANAGEMENT (edit sheet) ──
  _renderEditTasks() {
    const wrap = $id('edit-pkg-tasks-wrap');
    if (!wrap) return;
    wrap.innerHTML = this._editTasks.map((t, i) => `
      <div style="display:flex;align-items:center;gap:7px;padding:5px 8px;background:var(--bg);border-radius:8px;margin-bottom:4px">
        <span style="font-size:10px;color:var(--muted);flex-shrink:0;font-weight:700">${i + 1}.</span>
        <span style="flex:1;font-size:12px;color:var(--text)">${t}</span>
        <button onclick="CenterDetail.removeEditTask(${i})"
          style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:14px;line-height:1;padding:0 2px;flex-shrink:0">✕</button>
      </div>`).join('');
  },

  addEditTask() {
    const inp = $id('edit-pkg-task-inp');
    const val = inp?.value.trim();
    if (!val) return;
    this._editTasks.push(val);
    inp.value = '';
    this._renderEditTasks();
    inp.focus();
  },

  removeEditTask(i) {
    this._editTasks.splice(i, 1);
    this._renderEditTasks();
  },

  // ── TASK MANAGEMENT (add sheet) ──
  _renderAddTasks() {
    const wrap = $id('add-pkg-tasks-wrap');
    if (!wrap) return;
    wrap.innerHTML = this._addTasks.map((t, i) => `
      <div style="display:flex;align-items:center;gap:7px;padding:5px 8px;background:var(--bg);border-radius:8px;margin-bottom:4px">
        <span style="font-size:10px;color:var(--muted);flex-shrink:0;font-weight:700">${i + 1}.</span>
        <span style="flex:1;font-size:12px;color:var(--text)">${t}</span>
        <button onclick="CenterDetail.removeAddTask(${i})"
          style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:14px;line-height:1;padding:0 2px;flex-shrink:0">✕</button>
      </div>`).join('');
  },

  addAddTask() {
    const inp = $id('add-pkg-task-inp');
    const val = inp?.value.trim();
    if (!val) return;
    this._addTasks.push(val);
    inp.value = '';
    this._renderAddTasks();
    inp.focus();
  },

  removeAddTask(i) {
    this._addTasks.splice(i, 1);
    this._renderAddTasks();
  },

  openAddPackage(centerId) {
    AppState._addPkgCenter = centerId;
    $id('add-pkg-name') && ($id('add-pkg-name').value = '');
    $id('add-pkg-price') && ($id('add-pkg-price').value = '');
    $id('add-pkg-dur') && ($id('add-pkg-dur').value = '');
    $id('add-pkg-task-inp') && ($id('add-pkg-task-inp').value = '');
    const sel = $id('add-pkg-type');
    if (sel) {
      const c = CENTERS.find(x => x.id === centerId);
      sel.innerHTML = (c?.washTypes || ['water']).map(t =>
        `<option value="${t}" ${t===this.pkgType?'selected':''}>${WASH_LABELS[t].label}</option>`).join('');
    }
    this._addTasks = [];
    this._renderAddTasks();
    UI.openSheet('ovl-add-package');
  },

  saveAddPackage() {
    const centerId = AppState._addPkgCenter;
    const name  = $id('add-pkg-name')?.value.trim();
    const price = parseInt($id('add-pkg-price')?.value) || 0;
    const dur   = $id('add-pkg-dur')?.value.trim();
    const type  = $id('add-pkg-type')?.value || 'water';
    if (!name || !price) { UI.toast('⚠️ Name and price are required'); return; }

    if (!CENTER_PACKAGES[centerId]) CENTER_PACKAGES[centerId] = {};
    if (!CENTER_PACKAGES[centerId][type]) CENTER_PACKAGES[centerId][type] = [];
    const newPkg = { id: centerId + type + Date.now(), name, price, duration: dur || '30–40 min', active: true, tasks: [...this._addTasks] };
    CENTER_PACKAGES[centerId][type].push(newPkg);
    logChange(centerId, 'Package added', `${WASH_LABELS[type].label} · ${name} at ₹${price}`);
    UI.closeSheet('ovl-add-package');
    UI.toast(`✅ ${name} added`);
    this.render();
  },

  openEditPackage(centerId, pkgId) {
    AppState._editPkgCenter = centerId;
    AppState._editPkgId     = pkgId;
    const pkgs = CENTER_PACKAGES[centerId] || {};
    let pkg, pkgType;
    for (const t in pkgs) {
      const found = pkgs[t].find(x => x.id === pkgId);
      if (found) { pkg = found; pkgType = t; break; }
    }
    if (!pkg) return;
    if ($id('edit-pkg-name'))     $id('edit-pkg-name').value     = pkg.name;
    if ($id('edit-pkg-price'))    $id('edit-pkg-price').value    = pkg.price;
    if ($id('edit-pkg-dur'))      $id('edit-pkg-dur').value      = pkg.duration;
    if ($id('edit-pkg-task-inp')) $id('edit-pkg-task-inp').value = '';
    const lbl = $id('edit-pkg-type-lbl');
    if (lbl) lbl.textContent = WASH_LABELS[pkgType]?.label || pkgType;
    this._editTasks = [...(pkg.tasks || [])];
    this._renderEditTasks();
    UI.openSheet('ovl-edit-package');
  },

  saveEditPackage() {
    const centerId = AppState._editPkgCenter;
    const pkgId    = AppState._editPkgId;
    const newName  = $id('edit-pkg-name')?.value.trim();
    const newPrice = parseInt($id('edit-pkg-price')?.value) || 0;
    const newDur   = $id('edit-pkg-dur')?.value.trim();
    if (!newName || !newPrice) { UI.toast('⚠️ Name and price are required'); return; }

    const pkgs = CENTER_PACKAGES[centerId] || {};
    for (const t in pkgs) {
      const p = pkgs[t].find(x => x.id === pkgId);
      if (p) {
        const changes = [];
        if (newName  !== p.name)            changes.push(`Name: "${p.name}" → "${newName}"`);
        if (newPrice !== p.price)           changes.push(`Price: ₹${p.price} → ₹${newPrice}`);
        if (newDur   && newDur !== p.duration) changes.push(`Duration: ${p.duration} → ${newDur}`);
        p.name = newName; p.price = newPrice; if (newDur) p.duration = newDur;
        p.tasks = [...this._editTasks];
        if (changes.length) logChange(centerId, 'Package updated', `${WASH_LABELS[t].label} · ${changes.join(' · ')}`);
        UI.closeSheet('ovl-edit-package');
        UI.toast('✅ Package updated');
        this.render();
        return;
      }
    }
  },

  deletePackage() {
    const centerId = AppState._editPkgCenter;
    const pkgId    = AppState._editPkgId;
    const pkgs = CENTER_PACKAGES[centerId] || {};
    for (const t in pkgs) {
      const idx = pkgs[t].findIndex(x => x.id === pkgId);
      if (idx !== -1) {
        const name = pkgs[t][idx].name;
        pkgs[t].splice(idx, 1);
        logChange(centerId, 'Package deleted', `${WASH_LABELS[t].label} · "${name}" removed`);
        UI.closeSheet('ovl-edit-package');
        UI.toast(`🗑️ "${name}" deleted`);
        this.render();
        return;
      }
    }
  },

  // ── SLOTS TAB ──
  _renderSlots(c) {
    const bs = CENTER_BLOCKED_SLOTS[c.id] || {};
    const booked = type => ALL_BOOKINGS
      .filter(b => b.centerId === c.id && b.type === type)
      .map(b => b.slot);

    const availTypes = c.washTypes;
    if (!availTypes.includes(this.slotsType)) this.slotsType = availTypes[0] || 'water';
    const blocked = bs[this.slotsType] || [];
    const bk      = booked(this.slotsType);

    const typeBar = availTypes.map(t => `
      <div onclick="CenterDetail.setSlotsType('${t}')"
           style="flex-shrink:0;padding:5px 12px;border-radius:18px;border:1.5px solid ${this.slotsType===t?'var(--primary)':'var(--border2)'};background:${this.slotsType===t?'var(--primary-light)':'#fff'};color:${this.slotsType===t?'var(--primary)':'var(--muted)'};font-size:10px;font-weight:700;cursor:pointer">
        ${WASH_LABELS[t].label}
      </div>`).join('');

    const free   = ALL_SLOTS.filter(s => !bk.includes(s) && !blocked.includes(s)).length;
    const slotGrid = ALL_SLOTS.map(sl => {
      const isBooked  = bk.includes(sl);
      const isBlocked = blocked.includes(sl);
      let bg = '#f0fdf4', border = '#86efac', color = 'var(--green)', sub = 'Free';
      let btn = `<button style="font-size:9px;padding:2px 6px;border-radius:6px;background:var(--red);color:#fff;border:none;cursor:pointer;margin-top:3px" onclick="CenterDetail.blockSlot('${c.id}','${sl}')">Block</button>`;
      if (isBooked) {
        bg='#eff6ff'; border='#93c5fd'; color='var(--primary)'; sub='Booked';
        btn = `<span style="font-size:10px;color:var(--primary)">📋</span>`;
      } else if (isBlocked) {
        bg='#fff1f2'; border='#fca5a5'; color='var(--red)'; sub='Blocked';
        btn = `<button style="font-size:9px;padding:2px 6px;border-radius:6px;background:var(--green);color:#fff;border:none;cursor:pointer;margin-top:3px" onclick="CenterDetail.unblockSlot('${c.id}','${sl}')">Unblock</button>`;
      }
      return `<div style="border-radius:10px;padding:7px 5px;text-align:center;border:.5px solid ${border};background:${bg}">
        <div class="bold text-xs">${sl}</div>
        <div style="font-size:9px;color:${color};margin:2px 0">${sub}</div>
        ${btn}
      </div>`;
    }).join('');

    setHtml('cd-tab-slots', `
      <div style="padding:10px 13px 0">
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:10px">
          <div style="text-align:center;background:var(--bg);border-radius:9px;padding:7px 4px">
            <div class="bold" style="font-size:16px;color:var(--green)">${free}</div>
            <div style="font-size:9px;color:var(--muted)">Free</div>
          </div>
          <div style="text-align:center;background:var(--bg);border-radius:9px;padding:7px 4px">
            <div class="bold" style="font-size:16px;color:var(--primary)">${bk.length}</div>
            <div style="font-size:9px;color:var(--muted)">Booked</div>
          </div>
          <div style="text-align:center;background:var(--bg);border-radius:9px;padding:7px 4px">
            <div class="bold" style="font-size:16px;color:var(--red)">${blocked.length}</div>
            <div style="font-size:9px;color:var(--muted)">Blocked</div>
          </div>
        </div>
      </div>
      <div style="display:flex;gap:6px;padding:0 13px 8px;overflow-x:auto;scrollbar-width:none">${typeBar}</div>
      <div style="display:flex;gap:8px;padding:0 13px 8px">
        <button class="btn btn-sm btn-ghost" style="flex:1;font-size:10px" onclick="CenterDetail.blockAllSlots('${c.id}')">🚫 Block All Free</button>
        <button class="btn btn-sm btn-ghost" style="flex:1;font-size:10px" onclick="CenterDetail.unblockAllSlots('${c.id}')">✅ Unblock All</button>
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;padding:0 13px 16px">${slotGrid}</div>`);
  },

  setSlotsType(t) { this.slotsType = t; this.render(); },

  blockSlot(centerId, slot) {
    if (!CENTER_BLOCKED_SLOTS[centerId]) CENTER_BLOCKED_SLOTS[centerId] = {};
    if (!CENTER_BLOCKED_SLOTS[centerId][this.slotsType]) CENTER_BLOCKED_SLOTS[centerId][this.slotsType] = [];
    CENTER_BLOCKED_SLOTS[centerId][this.slotsType].push(slot);
    const detail = `${WASH_LABELS[this.slotsType].label} · ${slot} blocked`;
    logChange(centerId, 'Slot blocked', detail);
    UI.toast(`🚫 ${slot} blocked`);
    this.render();
  },

  unblockSlot(centerId, slot) {
    if (CENTER_BLOCKED_SLOTS[centerId]?.[this.slotsType]) {
      CENTER_BLOCKED_SLOTS[centerId][this.slotsType] = CENTER_BLOCKED_SLOTS[centerId][this.slotsType].filter(s => s !== slot);
    }
    const detail = `${WASH_LABELS[this.slotsType].label} · ${slot} unblocked`;
    logChange(centerId, 'Slot unblocked', detail);
    UI.toast(`✅ ${slot} unblocked`);
    this.render();
  },

  blockAllSlots(centerId) {
    if (!CENTER_BLOCKED_SLOTS[centerId]) CENTER_BLOCKED_SLOTS[centerId] = {};
    const bk = ALL_BOOKINGS.filter(b => b.centerId === centerId && b.type === this.slotsType).map(b => b.slot);
    CENTER_BLOCKED_SLOTS[centerId][this.slotsType] = ALL_SLOTS.filter(s => !bk.includes(s));
    logChange(centerId, 'All slots blocked', `${WASH_LABELS[this.slotsType].label} · all free slots blocked`);
    UI.toast(`🚫 All free slots blocked`);
    this.render();
  },

  unblockAllSlots(centerId) {
    if (CENTER_BLOCKED_SLOTS[centerId]) CENTER_BLOCKED_SLOTS[centerId][this.slotsType] = [];
    logChange(centerId, 'All slots unblocked', `${WASH_LABELS[this.slotsType].label} · all slots unblocked`);
    UI.toast(`✅ All slots unblocked`);
    this.render();
  },

  // ── HISTORY TAB ──
  _renderHistory(c) {
    const log = getAuditLog(c.id);
    if (!log.length) {
      setHtml('cd-tab-history', '<div style="padding:40px;text-align:center;color:var(--muted);font-size:12px">No change history yet</div>');
      return;
    }
    const rows = log.map(e => {
      const isAdmin  = e.actor !== 'center';
      const badge    = isAdmin
        ? `<span class="badge b-admin">${e.actorRole === 'Super Admin' ? '⚡' : '🛡️'} ${e.actorRole}</span>`
        : `<span class="badge b-center">🏢 Center Admin</span>`;
      return `
        <div style="padding:10px 13px;border-bottom:.5px solid var(--border)">
          <div class="flex-b" style="margin-bottom:4px">
            <div class="flex-c gap6">
              ${badge}
              <span class="bold text-xs">${e.actorName}</span>
            </div>
            <span style="font-size:9px;color:var(--faint)">${fmtTs(e.ts)}</span>
          </div>
          <div class="bold text-xs" style="margin-bottom:2px">${e.action}</div>
          <div style="font-size:11px;color:var(--muted)">${e.detail}</div>
        </div>`;
    }).join('');

    setHtml('cd-tab-history', `
      <div class="flex-b" style="padding:10px 13px 8px;border-bottom:.5px solid var(--border)">
        <div class="slbl" style="margin-bottom:0">Change History · ${log.length} entries</div>
        <span style="font-size:11px;color:var(--primary);font-weight:700;cursor:pointer" onclick="Router.go('history')">See all →</span>
      </div>
      <div>${rows}</div>
      <div style="height:16px"></div>`);
  },

  toggleVisibility(centerId) {
    const c = CENTERS.find(x => x.id === centerId);
    if (!c) return;
    c.visible = !c.visible;
    const detail = `${c.name} ${c.visible ? 'shown in' : 'hidden from'} customer app`;
    logChange(centerId, 'App visibility changed', detail);
    UI.toast(c.visible ? `👁️ ${c.name} now visible in app` : `🚫 ${c.name} hidden from app`);
    this.render();
  },

  changeOrder(centerId, delta) {
    const c = CENTERS.find(x => x.id === centerId);
    if (!c) return;
    const newOrder = Math.max(1, Math.min(CENTERS.length, (c.displayOrder || 1) + delta));
    if (newOrder === c.displayOrder) return;
    // Swap with the center currently holding that position
    const other = CENTERS.find(x => x.id !== centerId && x.displayOrder === newOrder);
    if (other) other.displayOrder = c.displayOrder;
    c.displayOrder = newOrder;
    logChange(centerId, 'Display order changed', `${c.name} moved to position #${newOrder} in customer app`);
    UI.toast(`📋 ${c.name} is now #${newOrder} in app`);
    this.render();
  },

  toggleOpen(centerId) {
    const c = CENTERS.find(x => x.id === centerId);
    if (!c) return;
    c.isOpen = !c.isOpen;
    const detail = `${c.name} marked ${c.isOpen ? 'Open' : 'Closed'}`;
    logChange(centerId, 'Center open/close', detail);
    UI.toast(c.isOpen ? `🟢 ${c.name} is now Open` : `🔴 ${c.name} marked Closed`);
    this.render();
    AdminDashboard.render();
  },

  reqRev(centerId) { requestRevenue(centerId); },

  openChat(centerId) {
    const thread = CHAT_THREADS.find(t => t.type === 'center' && t.centerId === centerId);
    if (thread) { AppState.selectedThreadId = thread.id; Router.go('chat-detail'); }
    else UI.toast('💬 No active chat thread for this center');
  },
};

// ── GLOBAL HISTORY SCREEN ────────────────────────────────────
const HistoryScreen = {
  _search:    '',
  _source:    'all',
  _centerId:  'all',
  _cityId:    'all',
  _dateRange: 'all',
  _page:      1,
  _PAGE_SIZE: 25,
  _timer:     null,
  _cache:     null,

  _SRC: {
    all:        { icon:'📋', label:'All',         color:'var(--primary)', bg:'var(--primary-light)' },
    user:       { icon:'👤', label:'User App',    color:'#1e40af',       bg:'#dbeafe' },
    center:     { icon:'🏢', label:'Center App',  color:'#166534',       bg:'#dcfce7' },
    admin:      { icon:'🛡️', label:'Admin',       color:'#6d28d9',       bg:'#ede9fe' },
    superadmin: { icon:'⚡', label:'Super Admin', color:'#92400e',       bg:'#fef3c7' },
  },

  render() {
    const all = this._allLogs();
    setText('hist-count', `${all.length} total entries`);
    this._renderSourceChips();
    this._renderAdvChips();
    this._renderList();
  },

  _allLogs() {
    // Convert localStorage audit entries into platform-history format
    const local = getAuditLog().map(e => ({
      id:       'local_' + e.ts,
      ts:       e.ts,
      source:   e.actorRole === 'Super Admin' ? 'superadmin' : e.actor === 'center' ? 'center' : 'admin',
      actor:    e.actorName,
      centerId: e.centerId,
      action:   e.action,
      detail:   e.detail,
    }));
    // Merge with mock platform history, deduplicate by id, sort newest first
    const seen = new Set();
    return [...PLATFORM_HISTORY, ...local]
      .filter(e => { if (seen.has(e.id)) return false; seen.add(e.id); return true; })
      .sort((a, b) => b.ts - a.ts);
  },

  _getFiltered() {
    if (this._cache) return this._cache;
    let list = this._allLogs();
    if (this._source    !== 'all') list = list.filter(e => e.source === this._source);
    if (this._centerId  !== 'all') list = list.filter(e => e.centerId === this._centerId);
    if (this._cityId    !== 'all') list = list.filter(e => {
      const c = CENTERS.find(x => x.id === e.centerId);
      return c?.cityId === this._cityId;
    });
    if (this._dateRange !== 'all') {
      const cuts = { today: 86400000, week: 604800000, month: 2592000000 };
      const cut = cuts[this._dateRange];
      if (cut) list = list.filter(e => Date.now() - e.ts < cut);
    }
    if (this._search) {
      const q = this._search.toLowerCase();
      list = list.filter(e =>
        (e.actor  || '').toLowerCase().includes(q) ||
        (e.action || '').toLowerCase().includes(q) ||
        (e.detail || '').toLowerCase().includes(q)
      );
    }
    this._cache = list;
    return list;
  },

  _bust() { this._cache = null; },

  exportCSV() {
    const list = this._getFiltered();
    const headers = ['Timestamp','Source','Actor','Center','Action','Detail'];
    const rows = list.map(e => {
      const ctr = CENTERS.find(c => c.id === e.centerId);
      return [new Date(e.ts).toLocaleString('en-IN'), this._SRC[e.source]?.label||e.source, e.actor||'', ctr?.name||e.centerId||'', e.action, e.detail];
    });
    exportCSV('sparkwash-history-' + new Date().toISOString().slice(0,10) + '.csv', headers, rows);
    UI.toast(`📥 Exported ${list.length} entries`);
  },

  onSearch(val) {
    clearTimeout(this._timer);
    this._timer = setTimeout(() => {
      this._search = val.trim();
      this._page   = 1;
      this._bust();
      this._renderList();
    }, 250);
  },

  setSource(s)   { this._source    = s; this._page = 1; this._bust(); this._renderSourceChips(); this._renderList(); },
  setCenterFilter(id) { this._centerId  = id; this._page = 1; this._bust(); this._renderAdvChips();    this._renderList(); },
  setCityFilter(id)   { this._cityId    = id; this._page = 1; this._bust(); this._renderAdvChips();    this._renderList(); },
  setDateFilter(d)    { this._dateRange = d;  this._page = 1; this._bust(); this._renderAdvChips();    this._renderList(); },
  setFilter(f)        { this.setCenterFilter(f); },  // backward-compat

  loadMore() { this._page++; this._renderList(); },

  _renderSourceChips() {
    const all = this._allLogs();
    setHtml('hist-source-chips', Object.entries(this._SRC).map(([key, cfg]) => {
      const n = key === 'all' ? all.length : all.filter(e => e.source === key).length;
      return `<div class="chip ${this._source===key?'on':''}" onclick="HistoryScreen.setSource('${key}')">${cfg.icon} ${cfg.label} <span style="opacity:.7">${n}</span></div>`;
    }).join(''));
  },

  _renderAdvChips() {
    const cities  = [{ id:'all', name:'All Cities'   }, ...CITIES.filter(c => c.active)];
    const centers = [{ id:'all', name:'All Centers'  }, ...CENTERS];
    const dates   = [
      { id:'all',   label:'All Time'   },
      { id:'today', label:'Today'      },
      { id:'week',  label:'This Week'  },
      { id:'month', label:'This Month' },
    ];
    const cc = cities.map(c   => `<div class="chip ${this._cityId===c.id?'on':''}"   onclick="HistoryScreen.setCityFilter('${c.id}')">🏙️ ${c.name}</div>`).join('');
    const ec = centers.map(c  => `<div class="chip ${this._centerId===c.id?'on':''}" onclick="HistoryScreen.setCenterFilter('${c.id}')">🏢 ${c.name}</div>`).join('');
    const dc = dates.map(d    => `<div class="chip ${this._dateRange===d.id?'on':''}" onclick="HistoryScreen.setDateFilter('${d.id}')">📅 ${d.label}</div>`).join('');
    setHtml('hist-adv-chips', cc + ec + dc);
  },

  _renderList() {
    const all   = this._getFiltered();
    const total = all.length;
    const shown = all.slice(0, this._page * this._PAGE_SIZE);
    setText('hist-result-count', total + ' result' + (total !== 1 ? 's' : ''));

    if (!shown.length) {
      setHtml('hist-list', '<div style="padding:60px 20px;text-align:center;color:var(--muted);font-size:13px">No history matches your filters</div>');
      setHtml('hist-load-more', '');
      return;
    }

    setHtml('hist-list', shown.map(e => {
      const cfg = this._SRC[e.source] || this._SRC.admin;
      const ctr = CENTERS.find(c => c.id === e.centerId);
      return `
        <div style="padding:10px 13px;border-bottom:.5px solid var(--border)">
          <div class="flex-b" style="margin-bottom:5px">
            <div class="flex-c gap6 flex-wrap">
              <span style="font-size:9px;font-weight:700;padding:2px 7px;border-radius:7px;background:${cfg.bg};color:${cfg.color}">${cfg.icon} ${cfg.label}</span>
              <span class="bold text-xs">${e.actor || '—'}</span>
              ${ctr ? `<span class="bk-center-tag">🏢 ${ctr.name}</span>` : ''}
            </div>
            <span style="font-size:9px;color:var(--faint);flex-shrink:0;margin-left:6px">${fmtTs(e.ts)}</span>
          </div>
          <div class="bold text-xs" style="margin-bottom:2px">${e.action}</div>
          <div style="font-size:11px;color:var(--muted)">${e.detail}</div>
        </div>`;
    }).join(''));

    setHtml('hist-load-more', shown.length < total
      ? `<button class="btn btn-ghost btn-sm btn-full" onclick="HistoryScreen.loadMore()">Load more · ${total - shown.length} remaining</button>`
      : total > this._PAGE_SIZE ? '<div style="font-size:11px;color:var(--muted);padding:8px 0">All entries shown</div>' : '');
  },
};

// ── ADMIN BOOKINGS ───────────────────────────────────────────
const AdminBookings = {
  filter:       'all',
  centerFilter: 'all',

  render() {
    this._renderChips();
    this._renderList();
  },

  setFilter(f) {
    this.filter = f;
    this._renderChips();
    this._renderList();
  },

  setCenterFilter(cid) {
    this.centerFilter = cid;
    this._renderCenterChips();
    this._renderList();
  },

  _filtered() {
    let list = [...ALL_BOOKINGS];
    if (this.centerFilter !== 'all') list = list.filter(b => b.centerId === this.centerFilter);
    if (this.filter === 'active') list = list.filter(b => ['arrived','washing'].includes(b.status));
    else if (this.filter !== 'all') list = list.filter(b => b.status === this.filter);
    return list;
  },

  _renderChips() {
    const all = ALL_BOOKINGS;
    const opts = [
      { key:'all',       label:`All  ${all.length}` },
      { key:'new',       label:`🆕 New  ${all.filter(b=>b.status==='new').length}` },
      { key:'confirmed', label:`✅ Confirmed  ${all.filter(b=>b.status==='confirmed').length}` },
      { key:'active',    label:`🔄 Active  ${all.filter(b=>['arrived','washing'].includes(b.status)).length}` },
      { key:'done',      label:`✨ Done  ${all.filter(b=>b.status==='done').length}` },
      { key:'cancelled', label:`❌ Cancelled  ${all.filter(b=>b.status==='cancelled').length}` },
    ];
    setHtml('bk-filter-chips', opts.map(o => `
      <div class="chip ${this.filter === o.key ? 'on' : ''}" onclick="AdminBookings.setFilter('${o.key}')">${o.label}</div>
    `).join(''));
  },

  _renderCenterChips() {
    const opts = [{ id:'all', name:'All Centers' }, ...CENTERS];
    setHtml('bk-center-chips', opts.map(c => `
      <div class="chip ${this.centerFilter === c.id ? 'on' : ''}" onclick="AdminBookings.setCenterFilter('${c.id}')">${c.name}</div>
    `).join(''));
  },

  _renderList() {
    this._renderCenterChips();
    const list = this._filtered();
    setHtml('bk-list', list.length ? list.map(b => {
      const sm = STATUS_META[b.status];
      const wl = WASH_LABELS[b.type];
      const ctr = CENTERS.find(c => c.id === b.centerId);
      return `
        <div class="bk-card">
          <div class="flex-b" style="margin-bottom:6px">
            <div style="flex:1;min-width:0">
              <div class="flex-c gap6" style="margin-bottom:2px">
                <div class="bold text-xs">${b.customer}</div>
                <span class="text-xs text-muted">${b.id}</span>
              </div>
              <div style="font-size:10px;color:var(--muted)">${b.phone} · ${b.vehicle} · ${b.model}</div>
            </div>
            <span class="badge ${sm.cls}">${sm.icon} ${sm.label}</span>
          </div>
          <div class="flex-c gap6" style="flex-wrap:wrap;margin-bottom:7px">
            <span class="badge" style="background:${wl.bg};color:${wl.color}">${wl.label}</span>
            <span class="bk-center-tag">🏢 ${ctr?.name || b.centerId}</span>
            <span class="text-xs text-muted">🕐 ${b.slot}</span>
            <span class="text-xs bold text-primary">₹${b.price}</span>
            ${b.rating ? `<span style="font-size:10px;color:var(--gold)">${'★'.repeat(b.rating)}${'☆'.repeat(5-b.rating)}</span>` : ''}
          </div>
          <div style="display:flex;gap:6px">
            <button class="btn btn-sm btn-primary" style="flex:1" onclick="AdminBookings.openEdit('${b.id}')">✏️ Edit Booking</button>
            <button class="btn btn-sm btn-ghost" onclick="openCall('${b.customer}','${b.phone}','${b.id}')">📞</button>
            <button class="btn btn-sm btn-ghost" onclick="AdminBookings.openChatWithCustomer('${b.id}')">💬</button>
          </div>
        </div>`;
    }).join('') : '<div style="padding:30px;text-align:center;color:var(--muted);font-size:12px">No bookings match this filter</div>');
  },

  openEdit(bookingId) {
    const b = ALL_BOOKINGS.find(x => x.id === bookingId);
    if (!b) return;
    AppState.selectedBookingId = bookingId;

    setText('edit-bk-id', b.id);
    setText('edit-bk-customer', b.customer);

    // Populate center select
    const ctrSel = $id('edit-ctr-select');
    if (ctrSel) {
      ctrSel.innerHTML = CENTERS.map(c => `<option value="${c.id}" ${c.id===b.centerId?'selected':''}>${c.name}</option>`).join('');
    }

    // Populate slot select
    const slotSel = $id('edit-slot-select');
    if (slotSel) {
      slotSel.innerHTML = ALL_SLOTS.map(s => `<option value="${s}" ${s===b.slot?'selected':''}>${s}</option>`).join('');
    }

    // Populate type select
    const typeSel = $id('edit-type-select');
    if (typeSel) {
      typeSel.innerHTML = Object.entries(WASH_LABELS).map(([k,v]) => `<option value="${k}" ${k===b.type?'selected':''}>${v.label}</option>`).join('');
    }

    // Populate pkg and price
    const pkgInp = $id('edit-pkg-inp');
    if (pkgInp) pkgInp.value = b.pkg;
    const priceInp = $id('edit-price-inp');
    if (priceInp) priceInp.value = b.price;

    const noteInp = $id('edit-note-inp');
    if (noteInp) noteInp.value = '';

    UI.openSheet('ovl-edit-booking');
  },

  saveEdit() {
    const b = ALL_BOOKINGS.find(x => x.id === AppState.selectedBookingId);
    if (!b) return;

    const newCtr   = $id('edit-ctr-select')?.value;
    const newSlot  = $id('edit-slot-select')?.value;
    const newType  = $id('edit-type-select')?.value;
    const newPkg   = $id('edit-pkg-inp')?.value?.trim();
    const newPrice = parseInt($id('edit-price-inp')?.value) || b.price;

    if (newCtr)   b.centerId = newCtr;
    if (newSlot)  b.slot     = newSlot;
    if (newType)  b.type     = newType;
    if (newPkg)   b.pkg      = newPkg;
    b.price = newPrice;

    const changes = [];
    if (newCtr && newCtr !== b.centerId) { changes.push(`Center: ${CENTERS.find(c=>c.id===b.centerId)?.name} → ${CENTERS.find(c=>c.id===newCtr)?.name}`); }
    if (newSlot && newSlot !== b.slot)   changes.push(`Slot: ${b.slot} → ${newSlot}`);
    if (newType && newType !== b.type)   changes.push(`Type: ${WASH_LABELS[b.type].label} → ${WASH_LABELS[newType].label}`);
    if (newPkg  && newPkg  !== b.pkg)    changes.push(`Package: ${b.pkg} → ${newPkg}`);
    if (newPrice !== b.price)             changes.push(`Price: ₹${b.price} → ₹${newPrice}`);

    if (newCtr)   b.centerId = newCtr;
    if (newSlot)  b.slot     = newSlot;
    if (newType)  b.type     = newType;
    if (newPkg)   b.pkg      = newPkg;
    b.price = newPrice;

    if (changes.length) logChange(b.centerId, 'Booking updated', `${b.id} · ${changes.join(' · ')}`);

    UI.closeSheet('ovl-edit-booking');
    UI.toast('✅ Booking updated successfully!');
    this.render();
  },

  openChatWithCustomer(bookingId) {
    const thread = CHAT_THREADS.find(t => t.bookingId === bookingId);
    if (thread) {
      AppState.selectedThreadId = thread.id;
      Router.go('chat-detail');
    } else {
      UI.toast('No existing chat for this booking');
    }
  },
};

// ── CHAT ─────────────────────────────────────────────────────
const Chat = {
  render() {
    const total  = CHAT_THREADS.reduce((s,t) => s+t.unread, 0);
    setText('chat-topbar-sub', total > 0 ? `${total} unread message${total>1?'s':''}` : 'All caught up');

    setHtml('chat-list', CHAT_THREADS.map(t => {
      const typeBadge = t.type === 'center'
        ? '<span class="badge b-center" style="margin-left:4px">Center</span>'
        : '<span class="badge b-customer" style="margin-left:4px">Customer</span>';
      return `
        <div class="thread-item" onclick="Chat.openThread('${t.id}')">
          <div class="thread-avatar" style="background:${t.avatarBg}">${t.initials}</div>
          <div style="flex:1;min-width:0">
            <div class="flex-c gap4">
              <div class="thread-name">${t.name}</div>
              ${typeBadge}
            </div>
            <div class="thread-preview">${t.lastMsg}</div>
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0">
            <div class="thread-time">${t.lastTime}</div>
            ${t.unread > 0 ? `<div class="thread-unread">${t.unread}</div>` : ''}
          </div>
        </div>`;
    }).join(''));
  },

  openThread(threadId) {
    AppState.selectedThreadId = threadId;
    Router.go('chat-detail');
  },
};

// ── CHAT DETAIL ──────────────────────────────────────────────
const ChatDetail = {
  render() {
    const t = CHAT_THREADS.find(x => x.id === AppState.selectedThreadId);
    if (!t) return;

    // Mark as read
    t.unread = 0;

    // Header
    setText('cd-thread-name', t.name);
    setText('cd-thread-sub',  t.type === 'center' ? '🏢 Wash Center' : `📞 ${t.phone}`);
    $id('cd-call-btn').onclick = () => openCall(t.name, t.phone, t.type === 'center' ? 'Wash Center' : 'Customer');

    // Messages
    setHtml('chat-messages', t.messages.map(m => {
      const isAdmin = m.from === 'admin';
      return `
        <div class="msg ${isAdmin ? 'msg-admin' : 'msg-other'}">
          <div class="msg-bubble">${m.text}</div>
          <div class="msg-time">${m.time}</div>
        </div>`;
    }).join(''));

    // Scroll to bottom
    const msgs = $id('chat-messages');
    if (msgs) setTimeout(() => msgs.scrollTop = msgs.scrollHeight, 50);
  },

  send() {
    const inp = $id('chat-input');
    const text = inp?.value?.trim();
    if (!text) return;

    const t = CHAT_THREADS.find(x => x.id === AppState.selectedThreadId);
    if (!t) return;

    const now = new Date();
    const time = now.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', hour12:true });
    t.messages.push({ from:'admin', text, time });
    t.lastMsg  = text;
    t.lastTime = time;
    inp.value  = '';

    this.render();
  },
};

// ── ADMIN REPORTS ─────────────────────────────────────────────
const AdminReports = {
  render() {
    const allBk  = ALL_BOOKINGS;
    const done   = allBk.filter(b => b.status === 'done');
    const totalRev = done.reduce((s,b) => s+b.price, 0);
    const rated  = done.filter(b => b.rating != null);
    const avgRat = rated.length ? (rated.reduce((s,b)=>s+b.rating,0)/rated.length).toFixed(1) : '—';
    const isSA   = AppState.role === 'superadmin';

    // Total revenue stat — SA only
    const revStatEl = $id('rp-rev-stat');
    if (revStatEl) revStatEl.style.display = isSA ? '' : 'none';
    setText('rp-total-rev', UI.formatPrice(totalRev));
    setText('rp-total-bk',  allBk.length);
    setText('rp-done-bk',   done.length);
    setText('rp-avg-rating', avgRat + (avgRat !== '—' ? ' ⭐' : ''));

    // Revenue by center — only approved centers for admin
    const colors = ['#7c3aed','#3b82f6','#10b981','#f59e0b'];
    const maxRev = Math.max(...CENTERS.map(x => x.todayRevenue), 1);
    setHtml('rp-by-center', CENTERS.map((c, i) => {
      const st = revenueStatus(c.id);
      if (!isSA && st !== 'approved') return `
        <div style="margin-bottom:9px">
          <div class="flex-b" style="margin-bottom:4px">
            <span class="text-xs bold">${c.name}</span>
            ${st === 'pending'
              ? `<span style="font-size:10px;color:var(--gold);font-weight:700">⏳ Pending approval</span>`
              : `<button onclick="requestRevenue('${c.id}')" style="font-size:9px;padding:2px 8px;border-radius:6px;background:var(--primary-light);color:var(--primary);border:none;cursor:pointer;font-weight:700">🔒 Request Access</button>`}
          </div>
          <div style="height:7px;background:var(--border);border-radius:4px"></div>
        </div>`;
      const pct = Math.round(c.todayRevenue / maxRev * 100);
      return `
        <div style="margin-bottom:9px">
          <div class="flex-b" style="margin-bottom:4px">
            <span class="text-xs bold">${c.name}</span>
            <span class="text-xs bold">${UI.formatPrice(c.todayRevenue)}</span>
          </div>
          <div style="height:7px;background:var(--border);border-radius:4px;overflow:hidden">
            <div style="height:100%;width:${pct}%;background:${colors[i]};border-radius:4px;transition:width .4s"></div>
          </div>
        </div>`;
    }).join(''));

    // Weekly combined chart — SA only
    const chartSection = $id('rp-chart-section');
    if (chartSection) chartSection.style.display = isSA ? '' : 'none';
    if (isSA) {
      const combinedWeek = WEEK_DAYS.map((day, i) =>
        Object.values(WEEK_REVENUE).reduce((s, arr) => s + arr[i], 0)
      );
      const maxW = Math.max(...combinedWeek);
      setHtml('rp-week-chart', `
        <div style="display:flex;align-items:flex-end;gap:5px;height:70px">
          ${combinedWeek.map((rev, i) => `
            <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px">
              <div style="font-size:8px;color:var(--muted)">₹${Math.round(rev/1000)}k</div>
              <div style="width:100%;background:${i===5||i===6?'var(--primary)':'#c4b5fd'};border-radius:4px 4px 0 0;height:${Math.round(rev/maxW*52)+4}px;transition:height .4s"></div>
              <div style="font-size:9px;color:var(--muted)">${WEEK_DAYS[i]}</div>
            </div>`).join('')}
        </div>
        <div class="flex-b" style="margin-top:6px">
          <span class="text-xs text-muted">All centers · this week</span>
          <span class="text-xs bold">${UI.formatPrice(combinedWeek.reduce((s,v)=>s+v,0))} total</span>
        </div>`);
    }

    // Wash type breakdown
    const byType = { water:0, dry:0, steam:0, d2d:0 };
    allBk.forEach(b => { if (byType[b.type] !== undefined) byType[b.type]++; });
    const typeTotal = allBk.length || 1;
    setHtml('rp-wash-types', Object.entries(byType).map(([t,n]) => `
      <div style="margin-bottom:7px">
        <div class="flex-b" style="margin-bottom:3px">
          <span class="text-xs">${WASH_LABELS[t].label}</span>
          <span class="text-xs bold">${n} (${Math.round(n/typeTotal*100)}%)</span>
        </div>
        <div style="height:6px;background:var(--border);border-radius:3px;overflow:hidden">
          <div style="height:100%;width:${Math.round(n/typeTotal*100)}%;background:${WASH_LABELS[t].color};border-radius:3px"></div>
        </div>
      </div>`).join(''));
  },

  exportCSV() {
    const role  = AppState.role;
    const allBk = ALL_BOOKINGS;
    const doneBk = allBk.filter(b => b.status === 'done');
    const headers = ['Center','Status','Customer','Vehicle','Wash Type','Package','Price (₹)','Slot','Rating'];
    const rows = allBk.map(b => {
      const ctr = CENTERS.find(c => c.id === b.centerId);
      return [ctr?.name||b.centerId, b.status, b.customer, b.vehicle+' '+b.model, WASH_LABELS[b.type]?.label||b.type, b.pkg, b.price, b.slot, b.rating||''];
    });
    exportCSV('sparkwash-report-' + new Date().toISOString().slice(0,10) + '.csv', headers, rows);
    UI.toast('📥 Report exported as CSV');
  },
};

// ── SUPER ADMIN ───────────────────────────────────────────────
const SuperAdmin = {
  render() {
    if (AppState.role !== 'superadmin') {
      setHtml('super-content', '<div style="padding:40px;text-align:center;color:var(--muted)">⛔ Access restricted to Super Admins</div>');
      return;
    }
    this._renderSettlements();
    this._loadAndRenderApplications();
    this._renderRevenueRequests();
    this._renderReviews();
    this._renderCities();
    this._renderPromos();
    this._renderAccounts();
    this._renderCenters();
  },

  _renderSettlements() {
    const pending  = SETTLEMENTS.filter(s => s.status === 'pending');
    const settled  = SETTLEMENTS.filter(s => s.status === 'settled');
    const totalOwed = pending.reduce((s, x) => s + x.appDiscount, 0);

    setText('sa-settle-badge', pending.length ? `${pending.length} pending · ${UI.formatPrice(totalOwed)}` : 'All settled ✓');

    // Per-center summary of pending amounts
    const byCenter = {};
    pending.forEach(s => {
      if (!byCenter[s.centerId]) byCenter[s.centerId] = { name: s.centerName, total: 0, count: 0 };
      byCenter[s.centerId].total += s.appDiscount;
      byCenter[s.centerId].count++;
    });

    const centerSummary = Object.entries(byCenter).map(([cid, info]) => `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 13px;border-bottom:.5px solid var(--border)">
        <div>
          <div class="bold text-xs">${info.name}</div>
          <div style="font-size:10px;color:var(--muted)">${info.count} booking${info.count>1?'s':''} · SparkWash promos</div>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:13px;font-weight:800;color:#0369a1">${UI.formatPrice(info.total)}</span>
          <button class="btn btn-sm btn-primary" style="font-size:10px;padding:4px 9px" onclick="SuperAdmin.markSettled('${cid}')">✓ Settle</button>
        </div>
      </div>`).join('');

    // Recent settled history
    const histRows = settled.slice(-4).reverse().map(s => `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:7px 13px;border-bottom:.5px solid var(--border);opacity:.65">
        <div>
          <div class="text-xs" style="color:var(--muted)">${s.centerName} · ${s.bookingRef}</div>
          <div style="font-size:9px;color:var(--faint)">Wash: ${s.washDate}${s.creditedOn ? ' · Credited: ' + s.creditedOn : ''}</div>
        </div>
        <span style="font-size:11px;font-weight:700;color:var(--green)">✅ ${UI.formatPrice(s.appDiscount)} settled</span>
      </div>`).join('');

    setHtml('sa-settlements', (centerSummary || '<div style="padding:12px 13px;font-size:12px;color:var(--green)">✅ All settlements up to date</div>') + (histRows ? `<div style="padding:7px 13px 5px;font-size:10px;color:var(--muted);font-weight:700">Recent settlements</div>${histRows}` : ''));
  },

  markSettled(centerId) {
    const pending = SETTLEMENTS.filter(s => s.centerId === centerId && s.status === 'pending');
    if (!pending.length) return;
    const c = CENTERS.find(x => x.id === centerId);
    const total = pending.reduce((s, x) => s + x.appDiscount, 0);
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
    const creditDate = tomorrow.toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
    const bankLine = c?.bankAccount
      ? `Account: ····${c.bankAccount.slice(-4)}  |  IFSC: ${c.ifsc}\nHolder: ${c.accountName || c.owner}`
      : '⚠️ No bank account on file';
    const confirmed = confirm(
      `Confirm settlement for ${c?.name || centerId}?\n\nAmount: ${UI.formatPrice(total)}\n${bankLine}\n\nCredit by ${creditDate}.`
    );
    if (!confirmed) return;
    pending.forEach(s => { s.status = 'settled'; s.settledAt = Date.now(); s.creditedOn = creditDate; });
    if (c) c.pendingSettlement = 0;
    logChange(centerId, 'Settlement marked', `${UI.formatPrice(total)} — credit by ${creditDate}`);
    UI.toast(`✅ ${UI.formatPrice(total)} marked settled · credit by ${creditDate}`);
    this._renderSettlements();
  },

  async _loadAndRenderApplications() {
    try {
      const res  = await fetch(`${CENTER_APP_URL}/api/admin/applications`, {
        headers: { 'x-admin-key': ADMIN_API_KEY },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      APPLICATIONS = data.data;
      ApplicationsScreen._loaded = true;
    } catch (e) {
      console.warn('SA: could not load applications —', e.message);
    }
    this._renderApplications();
  },

  _renderApplications() {
    const pending = APPLICATIONS.filter(a => a.status === 'pending');
    setText('sa-apps-badge', pending.length ? `${pending.length} pending` : '');
    if (!APPLICATIONS.length) {
      setHtml('sa-applications', '<div style="padding:12px 13px;font-size:12px;color:var(--muted)">No applications yet</div>');
      return;
    }
    const shown = APPLICATIONS.slice(0, 3);
    setHtml('sa-applications', shown.map(a => {
      const isPending = a.status === 'pending';
      const badge = isPending  ? `<span style="font-size:9px;background:#fef3c7;color:#92400e;padding:2px 7px;border-radius:10px;font-weight:700">Pending</span>`
                  : a.status === 'approved' ? `<span style="font-size:9px;background:#dcfce7;color:var(--green);padding:2px 7px;border-radius:10px;font-weight:700">Approved</span>`
                  : `<span style="font-size:9px;background:#fee2e2;color:#dc2626;padding:2px 7px;border-radius:10px;font-weight:700">Rejected</span>`;
      return `
        <div style="padding:9px 13px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between">
          <div>
            <div style="font-weight:600;font-size:12px">${a.name}</div>
            <div style="font-size:10px;color:var(--muted)">${a.owner_name} · ${a.city} · ${new Date(a.created_at).toLocaleDateString('en-IN', {day:'numeric', month:'short'})}</div>
          </div>
          <div style="display:flex;align-items:center;gap:6px">
            ${badge}
            ${isPending ? `<button class="btn btn-sm btn-green" style="font-size:10px;padding:3px 8px" onclick="SuperAdmin._quickApprove('${a.id}')">✓</button>` : ''}
          </div>
        </div>`;
    }).join(''));
  },

  async _quickApprove(id) {
    await ApplicationsScreen.approve(id);
    this._loadAndRenderApplications();
  },

  _renderRevenueRequests() {
    const pending = REVENUE_REQUESTS.filter(r => r.status === 'pending');
    const resolved = REVENUE_REQUESTS.filter(r => r.status !== 'pending');
    setText('sa-rev-req-count', pending.length ? `${pending.length} pending` : '');

    if (!REVENUE_REQUESTS.length) {
      setHtml('sa-rev-requests', '<div style="padding:14px 13px;font-size:12px;color:var(--muted)">No requests yet</div>');
      return;
    }

    const all = [...pending, ...resolved];
    setHtml('sa-rev-requests', all.map(r => {
      const admin = ADMINS.find(a => a.id === r.adminId);
      const isPending = r.status === 'pending';
      return `
        <div style="padding:11px 13px;border-bottom:.5px solid var(--border)">
          <div class="flex-b" style="margin-bottom:5px">
            <div class="flex-c gap6">
              <span class="badge ${isPending?'b-conf':r.status==='approved'?'b-open':'b-closed'}">
                ${isPending?'⏳ Pending':r.status==='approved'?'✅ Approved':'❌ Rejected'}
              </span>
              <span class="bold text-xs">${r.adminName}</span>
            </div>
            <span style="font-size:9px;color:var(--faint)">${fmtTs(r.requestedAt)}</span>
          </div>
          <div style="font-size:11px;color:var(--muted);margin-bottom:${isPending?'8':'0'}px">
            Revenue access for <strong>${r.centerName}</strong>
          </div>
          ${isPending ? `
            <div style="display:flex;gap:6px">
              <button class="btn btn-sm btn-green" style="flex:1" onclick="SuperAdmin.approveRevenue('${r.id}')">✅ Approve</button>
              <button class="btn btn-sm btn-red"   style="flex:1" onclick="SuperAdmin.rejectRevenue('${r.id}')">❌ Reject</button>
            </div>` : ''}
        </div>`;
    }).join(''));
  },

  approveRevenue(reqId) {
    const r = REVENUE_REQUESTS.find(x => x.id === reqId);
    if (!r) return;
    r.status = 'approved';
    r.resolvedAt = Date.now();
    _saveRevenueRequests();
    logChange(r.centerId, 'Revenue access granted', `${r.adminName} approved to view revenue for ${r.centerName}`);
    UI.toast(`✅ Revenue access granted to ${r.adminName}`);
    this._renderRevenueRequests();
  },

  rejectRevenue(reqId) {
    const r = REVENUE_REQUESTS.find(x => x.id === reqId);
    if (!r) return;
    r.status = 'rejected';
    r.resolvedAt = Date.now();
    _saveRevenueRequests();
    UI.toast(`❌ Request rejected`);
    this._renderRevenueRequests();
  },

  _renderReviews() {
    const flagged = REVIEWS.filter(r => r.rating <= 2);
    const count = `${flagged.length} flagged`;
    setText('sa-reviews-count', flagged.length ? count : '');
    const sorted = [...REVIEWS].sort((a, b) => a.rating - b.rating || b.ts - a.ts);
    setHtml('sa-reviews-list', sorted.length ? sorted.map(r => {
      const ctr  = CENTERS.find(c => c.id === r.centerId);
      const stars = '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating);
      const isRemoved = r.status === 'removed';
      const starColor = r.rating >= 4 ? '#f59e0b' : r.rating >= 3 ? '#6b7280' : '#ef4444';
      return `
        <div style="padding:11px 13px;border-bottom:.5px solid var(--border);opacity:${isRemoved ? .5 : 1}">
          <div class="flex-b" style="margin-bottom:5px">
            <div class="flex-c gap6 flex-wrap" style="flex:1;min-width:0">
              <span style="font-size:12px;font-weight:800;color:${starColor}">${stars}</span>
              <span class="bold text-xs">${r.customerName}</span>
              ${isRemoved ? `<span style="font-size:9px;font-weight:700;color:#dc2626;background:#fee2e2;border-radius:5px;padding:1px 6px">Removed</span>` : r.rating <= 2 ? `<span style="font-size:9px;font-weight:700;color:#dc2626;background:#fee2e2;border-radius:5px;padding:1px 6px">⚑ Flagged</span>` : ''}
            </div>
            <span style="font-size:9px;color:var(--faint);flex-shrink:0">${fmtTs(r.ts)}</span>
          </div>
          <div style="font-size:10px;color:var(--muted);margin-bottom:4px">🏢 ${ctr?.name || r.centerId} · ${r.bookingId}</div>
          <div style="font-size:11px;color:var(--text);margin-bottom:${isRemoved ? 0 : 8}px;line-height:1.4">"${r.comment}"</div>
          ${!isRemoved ? `
            <div style="display:flex;gap:6px">
              <button class="btn btn-sm btn-green" style="flex:1" onclick="SuperAdmin.keepReview('${r.id}')">✅ Keep</button>
              <button class="btn btn-sm btn-red"   style="flex:1" onclick="SuperAdmin.removeReview('${r.id}')">🗑️ Remove</button>
            </div>` : `
            <button class="btn btn-sm btn-ghost btn-full" style="font-size:10px" onclick="SuperAdmin.keepReview('${r.id}')">↩️ Restore review</button>`}
        </div>`;
    }).join('') : '<div style="padding:16px;font-size:12px;color:var(--muted)">No reviews yet</div>');
  },

  keepReview(id) {
    const r = REVIEWS.find(x => x.id === id);
    if (!r) return;
    r.status = 'active';
    UI.toast('✅ Review kept & visible to customers');
    this._renderReviews();
  },

  removeReview(id) {
    const r = REVIEWS.find(x => x.id === id);
    if (!r) return;
    r.status = 'removed';
    const ctr = CENTERS.find(c => c.id === r.centerId);
    logChange(r.centerId, 'Review removed', `${r.customerName}'s ${r.rating}★ review removed from ${ctr?.name || r.centerId}`);
    UI.toast('🗑️ Review removed from customer app');
    this._renderReviews();
  },

  _renderCities() {
    setHtml('sa-cities-list', CITIES.map(city => {
      const cnt = CENTERS.filter(c => c.cityId === city.id).length;
      return `
        <div style="display:flex;align-items:center;gap:10px;padding:11px 12px;border-bottom:.5px solid var(--border)">
          <div style="flex:1;min-width:0">
            <div class="flex-c gap7">
              <div class="bold text-xs">${city.name}</div>
              <span class="badge ${city.active?'b-open':'b-closed'}">${city.active?'🟢 Active':'🔴 Inactive'}</span>
            </div>
            <div style="font-size:10px;color:var(--muted);margin-top:2px">${city.state} · ${cnt} center${cnt!==1?'s':''}</div>
          </div>
          <div class="tog ${city.active?'on':''}" onclick="SuperAdmin.toggleCity('${city.id}')"></div>
        </div>`;
    }).join('')  || '<div style="padding:16px;font-size:12px;color:var(--muted)">No cities yet</div>');
  },

  toggleCity(id) {
    const city = CITIES.find(c => c.id === id);
    if (!city) return;
    city.active = !city.active;
    UI.toast(city.active ? `🟢 ${city.name} activated` : `🔴 ${city.name} deactivated`);
    this._renderCities();
  },

  openAddCity() {
    $id('add-city-name')  && ($id('add-city-name').value  = '');
    $id('add-city-state') && ($id('add-city-state').value = '');
    UI.openSheet('ovl-add-city');
  },

  saveAddCity() {
    const name  = $id('add-city-name')?.value.trim();
    const state = $id('add-city-state')?.value.trim();
    if (!name) { UI.toast('⚠️ City name is required'); return; }
    if (CITIES.find(c => c.name.toLowerCase() === name.toLowerCase())) { UI.toast('⚠️ City already exists'); return; }
    CITIES.push({ id:'city'+(CITIES.length+1), name, state: state||'India', active:true });
    UI.closeSheet('ovl-add-city');
    UI.toast(`🏙️ ${name} added!`);
    this._renderCities();
  },

  _renderCenters() {
    const sorted = [...CENTERS].sort((a, b) => (a.displayOrder || 99) - (b.displayOrder || 99));
    setHtml('sa-centers-list', sorted.map(c => `
      <div class="card" style="padding:12px;margin-bottom:8px;cursor:pointer;opacity:${c.visible?1:.6}" onclick="Centers.openDetail('${c.id}')">
        <div class="flex-b" style="margin-bottom:7px">
          <div style="flex:1;min-width:0">
            <div class="flex-c gap6" style="margin-bottom:2px">
              <span style="font-size:11px;font-weight:900;color:var(--primary);background:var(--primary-light);border-radius:6px;padding:1px 7px">#${c.displayOrder}</span>
              <div class="bold text-xs">${c.name}</div>
            </div>
            <div style="font-size:10px;color:var(--muted)">👤 ${c.owner} · 📍 ${c.area}</div>
          </div>
          <div style="display:flex;flex-direction:column;gap:5px;align-items:flex-end;flex-shrink:0;margin-left:8px">
            <span class="badge ${c.isOpen ? 'b-open' : 'b-closed'}">${c.isOpen ? '🟢 Open' : '🔴 Closed'}</span>
            <span class="badge" style="background:${c.visible?'#dcfce7':'#fee2e2'};color:${c.visible?'#166534':'#dc2626'}">${c.visible?'👁️ Visible':'🚫 Hidden'}</span>
          </div>
        </div>

        <!-- App visibility + order controls -->
        <div style="display:flex;align-items:center;gap:8px;padding:7px 9px;background:var(--bg);border-radius:9px;margin-bottom:8px" onclick="event.stopPropagation()">
          <span style="font-size:10px;color:var(--muted);font-weight:600;flex:1">📱 Show in Customer App</span>
          <div class="tog ${c.visible?'on':''}" onclick="CenterDetail.toggleVisibility('${c.id}');SuperAdmin._renderCenters()"></div>
          <div style="display:flex;align-items:center;gap:4px;margin-left:8px">
            <button onclick="CenterDetail.changeOrder('${c.id}',-1);SuperAdmin._renderCenters()"
              style="width:22px;height:22px;border-radius:5px;background:var(--primary-light);color:var(--primary);border:none;cursor:pointer;font-weight:900">−</button>
            <span style="font-size:12px;font-weight:800;color:var(--primary);min-width:24px;text-align:center">#${c.displayOrder}</span>
            <button onclick="CenterDetail.changeOrder('${c.id}',1);SuperAdmin._renderCenters()"
              style="width:22px;height:22px;border-radius:5px;background:var(--primary-light);color:var(--primary);border:none;cursor:pointer;font-weight:900">+</button>
          </div>
          <button onclick="event.stopPropagation();SuperAdmin.openEditCenter('${c.id}')"
            style="font-size:9px;padding:3px 8px;border-radius:6px;background:var(--primary-light);color:var(--primary);border:none;cursor:pointer;font-weight:700;margin-left:4px">✏️ Edit</button>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:5px">
          <div style="text-align:center;background:var(--bg);border-radius:8px;padding:5px 3px">
            <div class="bold" style="font-size:14px">${c.totalBookings}</div>
            <div style="font-size:9px;color:var(--muted)">Bookings</div>
          </div>
          <div style="text-align:center;background:var(--bg);border-radius:8px;padding:5px 3px">
            <div class="bold" style="font-size:14px;color:var(--primary)">${c.activeNow}</div>
            <div style="font-size:9px;color:var(--muted)">Active</div>
          </div>
          <div style="text-align:center;background:var(--bg);border-radius:8px;padding:5px 3px">
            <div class="bold" style="font-size:14px">₹${Math.round(c.todayRevenue / 1000 * 10) / 10}k</div>
            <div style="font-size:9px;color:var(--muted)">Revenue</div>
          </div>
        </div>
      </div>`).join(''));
  },

  _renderPromos() {
    setHtml('sa-promos', PROMO_CODES.map(p => {
      const usagePct = Math.round(p.used / p.maxUses * 100);
      return `
        <div class="promo-card">
          <div class="flex-b" style="margin-bottom:6px">
            <div>
              <div class="promo-code">${p.code}</div>
              <div class="text-xs text-muted" style="margin-top:2px">
                ${p.type === 'percent' ? `${p.value}% off` : `₹${p.value} off`}
                · Min order ₹${p.minOrder}
                · Expires ${p.expiry}
              </div>
            </div>
            <div style="display:flex;flex-direction:column;align-items:flex-end;gap:5px">
              <span class="badge ${p.active ? 'b-open' : 'b-closed'}">${p.active ? '🟢 Active' : '🔴 Inactive'}</span>
              <div class="tog ${p.active ? 'on' : ''}" onclick="SuperAdmin.togglePromo('${p.id}')"></div>
            </div>
          </div>
          <div class="flex-b" style="margin-bottom:4px">
            <span class="text-xs text-muted">Used ${p.used} / ${p.maxUses}</span>
            <span class="text-xs bold text-primary">${usagePct}%</span>
          </div>
          <div class="promo-usage">
            <div class="promo-usage-fill" style="width:${usagePct}%"></div>
          </div>
        </div>`;
    }).join(''));
  },

  _renderAccounts() {
    setHtml('sa-accounts', ADMINS.map((a, i) => {
      const isSelf = a.id === AppState.admin?.id;
      const isInactive = a.active === false;
      return `
        <div class="account-row" style="opacity:${isInactive ? .55 : 1}">
          <div class="acct-avatar" style="background:${a.role==='superadmin'?'#92400e':UI.avatarColor(i)}">${a.initials}</div>
          <div style="flex:1;min-width:0">
            <div class="flex-c gap6 flex-wrap">
              <div class="bold text-xs">${a.name}</div>
              <span class="badge ${a.role==='superadmin'?'b-sa':'b-admin'}">${a.role==='superadmin'?'⚡ SA':'🛡️ Admin'}</span>
              ${isInactive ? `<span style="font-size:9px;font-weight:700;color:#dc2626;background:#fee2e2;border-radius:5px;padding:1px 6px">Inactive</span>` : ''}
            </div>
            <div style="font-size:10px;color:var(--muted);margin-top:2px">${a.email}</div>
            <div style="font-size:10px;color:var(--muted)">${a.phone}</div>
            <div style="font-size:10px;color:var(--muted);margin-top:1px">${a.centers === 'all' ? '🏢 All centers' : `🏢 ${(a.centers||[]).length} center(s)`}</div>
          </div>
          <div style="display:flex;flex-direction:column;gap:5px;align-items:flex-end;flex-shrink:0">
            <button class="btn btn-sm btn-ghost" onclick="openCall('${a.name}','${a.phone}','Admin Team')">📞</button>
            ${!isSelf && a.role !== 'superadmin' ? `
              <button class="btn btn-sm" style="font-size:9px;padding:3px 7px;background:${isInactive?'var(--primary-light)':'#fee2e2'};color:${isInactive?'var(--primary)':'#dc2626'};border:none;border-radius:7px;cursor:pointer"
                onclick="SuperAdmin.toggleAdminActive('${a.id}')">${isInactive ? '↩️ Activate' : '⛔ Deactivate'}</button>` : ''}
          </div>
        </div>`;
    }).join(''));
  },

  toggleAdminActive(id) {
    const a = ADMINS.find(x => x.id === id);
    if (!a) return;
    a.active = !a.active;
    UI.toast(a.active ? `✅ ${a.name} account activated` : `⛔ ${a.name} account deactivated`);
    logChange(null, 'Admin account ' + (a.active ? 'activated' : 'deactivated'), `${a.name} (${a.email})`);
    this._renderAccounts();
  },

  openAddAdmin() {
    ['add-admin-name','add-admin-email','add-admin-phone'].forEach(id => { const e=$id(id); if(e) e.value=''; });
    const sel = $id('add-admin-centers');
    if (sel) sel.innerHTML = CENTERS.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    UI.openSheet('ovl-add-admin');
  },

  saveAddAdmin() {
    const name  = $id('add-admin-name')?.value.trim();
    const email = $id('add-admin-email')?.value.trim();
    const phone = $id('add-admin-phone')?.value.trim();
    const sel   = $id('add-admin-centers');
    const centers = sel ? Array.from(sel.selectedOptions).map(o => o.value) : [];
    if (!name || !email) { UI.toast('⚠️ Name and email are required'); return; }
    if (ADMINS.find(a => a.email.toLowerCase() === email.toLowerCase())) { UI.toast('⚠️ Email already exists'); return; }
    const initials = name.trim().split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();
    ADMINS.push({
      id:      'a' + (ADMINS.length + 1),
      name, email,
      phone:   phone || '—',
      role:    'admin',
      centers: centers.length ? centers : [],
      initials,
      active:  true,
    });
    UI.closeSheet('ovl-add-admin');
    UI.toast(`✅ Admin account created for ${name}`);
    logChange(null, 'Admin account created', `${name} (${email}) added as Admin`);
    this._renderAccounts();
  },

  togglePromo(id) {
    const p = PROMO_CODES.find(x => x.id === id);
    if (!p) return;
    p.active = !p.active;
    UI.toast(p.active ? `✅ ${p.code} activated` : `⛔ ${p.code} deactivated`);
    this._renderPromos();
  },

  openAddCenter() {
    $id('add-ctr-name')  && ($id('add-ctr-name').value  = '');
    $id('add-ctr-owner') && ($id('add-ctr-owner').value = '');
    $id('add-ctr-phone') && ($id('add-ctr-phone').value = '');
    $id('add-ctr-area')  && ($id('add-ctr-area').value  = '');
    UI.openSheet('ovl-add-center');
  },

  saveAddCenter() {
    const name  = $id('add-ctr-name')?.value.trim();
    const owner = $id('add-ctr-owner')?.value.trim();
    const phone = $id('add-ctr-phone')?.value.trim();
    const area  = $id('add-ctr-area')?.value.trim();
    if (!name || !owner) { UI.toast('⚠️ Name and owner are required'); return; }

    const newId = 'c' + (CENTERS.length + 1);
    CENTERS.push({
      id:newId, name, owner, phone, area, address:'', gstin:'',
      rating:0, totalReviews:0, isOpen:true, washTypes:['water','dry'],
      totalBookings:0, activeNow:0, todayRevenue:0,
    });

    UI.closeSheet('ovl-add-center');
    UI.toast(`✅ ${name} added as a new center!`);
    Centers.render();
    AdminDashboard.render();
  },

  openAddPromo() {
    ['add-promo-code','add-promo-value','add-promo-min','add-promo-max','add-promo-expiry'].forEach(id => {
      const el = $id(id);
      if (el) el.value = '';
    });
    UI.openSheet('ovl-add-promo');
  },

  saveAddPromo() {
    const code   = $id('add-promo-code')?.value.trim().toUpperCase();
    const type   = $id('add-promo-type')?.value || 'percent';
    const value  = parseInt($id('add-promo-value')?.value) || 0;
    const min    = parseInt($id('add-promo-min')?.value)   || 0;
    const max    = parseInt($id('add-promo-max')?.value)   || 100;
    const expiry = $id('add-promo-expiry')?.value;

    if (!code || !value) { UI.toast('⚠️ Code and value are required'); return; }
    if (PROMO_CODES.find(p => p.code === code)) { UI.toast('⚠️ Code already exists'); return; }

    PROMO_CODES.push({ id:'p'+(PROMO_CODES.length+1), code, type, value, minOrder:min, maxUses:max, used:0, active:true, expiry });
    UI.closeSheet('ovl-add-promo');
    UI.toast(`🎁 Promo ${code} created!`);
    this._renderPromos();
  },

  openEditCenter(centerId) {
    const c = CENTERS.find(x => x.id === centerId);
    if (!c) return;
    $id('add-ctr-name').value  = c.name;
    $id('add-ctr-owner').value = c.owner;
    $id('add-ctr-phone').value = c.phone;
    $id('add-ctr-area').value  = c.area;
    setText('ovl-add-ctr-title', 'Edit Center');
    UI.openSheet('ovl-add-center');
  },
};

// ── NOTIFICATIONS ────────────────────────────────────────────
const NotificationsScreen = {
  render() {
    const unread = NOTIFICATIONS.filter(n => !n.read).length;
    setText('notif-sub', unread > 0 ? `${unread} unread` : 'All caught up');

    setHtml('notif-list', NOTIFICATIONS.length ? NOTIFICATIONS.map(n => `
      <div style="display:flex;align-items:flex-start;gap:11px;padding:13px 13px;border-bottom:.5px solid var(--border);background:${n.read ? '#fff' : '#faf5ff'};cursor:pointer"
           onclick="NotificationsScreen.open('${n.id}')">
        <div style="width:40px;height:40px;border-radius:50%;background:${n.read ? 'var(--bg)' : 'var(--primary-light)'};display:flex;align-items:center;justify-content:center;font-size:17px;flex-shrink:0">${n.icon}</div>
        <div style="flex:1;min-width:0">
          <div class="bold text-xs" style="color:${n.read ? 'var(--text)' : 'var(--primary)'}">${n.title}</div>
          <div style="font-size:10px;color:var(--muted);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${n.body}</div>
          <div style="font-size:9px;color:var(--faint);margin-top:3px">${fmtTs(n.time)}</div>
        </div>
        ${!n.read ? '<div style="width:8px;height:8px;border-radius:50%;background:var(--primary);flex-shrink:0;margin-top:5px"></div>' : ''}
      </div>`).join('') :
      '<div style="padding:60px;text-align:center;color:var(--muted);font-size:13px">🔔 No notifications</div>');
  },

  open(id) {
    const n = NOTIFICATIONS.find(x => x.id === id);
    if (!n) return;
    n.read = true;
    AdminDashboard.render();
    if (n.action) Router.go(n.action);
    else this.render();
  },

  markAllRead() {
    NOTIFICATIONS.forEach(n => n.read = true);
    UI.toast('✅ All notifications marked as read');
    AdminDashboard.render();
    this.render();
  },
};

// ── ADMIN PROFILE ────────────────────────────────────────────
const AdminProfile = {
  render() {
    const admin = AppState.admin;
    if (!admin) return;

    setText('profile-avatar',     admin.initials || UI.initials(admin.name));
    setText('profile-name',       admin.name);
    setText('profile-role-badge', AppState.role === 'superadmin' ? '⚡ Super Admin' : '🛡️ Admin');

    const nameInp  = $id('prof-name');  if (nameInp)  nameInp.value  = admin.name;
    const emailInp = $id('prof-email'); if (emailInp) emailInp.value = admin.email;
    const phoneInp = $id('prof-phone'); if (phoneInp) phoneInp.value = admin.phone;

    const centers = admin.centers === 'all' ? CENTERS : CENTERS.filter(c => admin.centers.includes(c.id));
    setHtml('prof-centers', centers.length ? centers.map(c => `
      <div style="display:flex;align-items:center;gap:10px;padding:11px 13px;border-bottom:.5px solid var(--border)">
        <span style="font-size:16px">🏢</span>
        <div style="flex:1">
          <div class="bold text-xs">${c.name}</div>
          <div style="font-size:10px;color:var(--muted)">${c.area}</div>
        </div>
        <span class="badge ${c.isOpen ? 'b-open' : 'b-closed'}">${c.isOpen ? 'Open' : 'Closed'}</span>
      </div>`).join('') :
      '<div style="padding:16px 13px;font-size:11px;color:var(--muted)">All centers</div>');
  },

  save() {
    const admin = AppState.admin;
    if (!admin) return;
    const name  = $id('prof-name')?.value.trim();
    const email = $id('prof-email')?.value.trim();
    const phone = $id('prof-phone')?.value.trim();
    if (name)  admin.name  = name;
    if (email) admin.email = email;
    if (phone) admin.phone = phone;
    UI.toast('✅ Profile updated!');
    this.render();
    AdminDashboard.render();
  },

  logout() {
    AppState.role  = null;
    AppState.admin = null;
    document.querySelectorAll('.sa-only').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.admin-reports-btn').forEach(el => el.style.display = 'none');
    UI.toast('👋 Logged out');
    Router.go('login');
  },
};

// ── CUSTOMERS ────────────────────────────────────────────────
const CustomersScreen = {
  centerFilter: 'all',

  _getAll() {
    const map = {};
    ALL_BOOKINGS.forEach(b => {
      if (!map[b.phone]) {
        map[b.phone] = { name:b.customer, phone:b.phone, vehicle:b.vehicle, model:b.model, bookings:[], spent:0, centerIds:[] };
      }
      map[b.phone].bookings.push(b);
      if (b.status === 'done') map[b.phone].spent += b.price;
      if (!map[b.phone].centerIds.includes(b.centerId)) map[b.phone].centerIds.push(b.centerId);
    });
    return Object.values(map);
  },

  render() {
    let list = this._getAll();
    if (this.centerFilter !== 'all') list = list.filter(c => c.centerIds.includes(this.centerFilter));

    setText('cust-count', `${list.length} customer${list.length !== 1 ? 's' : ''}`);

    const opts = [{ id:'all', name:'All Centers' }, ...CENTERS];
    setHtml('cust-center-chips', opts.map(o => `
      <div class="chip ${this.centerFilter === o.id ? 'on' : ''}" onclick="CustomersScreen.setCenterFilter('${o.id}')">${o.name}</div>
    `).join(''));

    setHtml('cust-list', list.length ? list.map((c, i) => {
      const initials = c.name.trim().split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
      const done     = c.bookings.filter(b => b.status === 'done').length;
      const lastBk   = c.bookings[c.bookings.length - 1];
      const thread   = CHAT_THREADS.find(t => t.type === 'customer' && t.phone === c.phone);
      return `
        <div class="card" style="padding:12px;cursor:pointer;margin-bottom:8px" onclick="CustomersScreen.openDetail('${c.phone}')">
          <div class="flex-c gap10" style="margin-bottom:9px">
            <div style="width:40px;height:40px;border-radius:50%;background:${UI.avatarColor(i)};color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;flex-shrink:0">${initials}</div>
            <div style="flex:1;min-width:0">
              <div class="bold text-xs">${c.name}</div>
              <div style="font-size:10px;color:var(--muted);margin-top:1px">📞 ${c.phone}</div>
              <div style="font-size:10px;color:var(--muted)">🚗 ${c.vehicle} · ${c.model}</div>
            </div>
            <div style="text-align:right">
              <div class="bold" style="font-size:13px;color:var(--primary)">${UI.formatPrice(c.spent)}</div>
              <div style="font-size:9px;color:var(--muted)">spent</div>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:5px;margin-bottom:9px">
            <div style="text-align:center;background:var(--bg);border-radius:8px;padding:5px 3px">
              <div class="bold" style="font-size:13px">${c.bookings.length}</div>
              <div style="font-size:9px;color:var(--muted)">Bookings</div>
            </div>
            <div style="text-align:center;background:var(--bg);border-radius:8px;padding:5px 3px">
              <div class="bold" style="font-size:13px;color:var(--green)">${done}</div>
              <div style="font-size:9px;color:var(--muted)">Completed</div>
            </div>
            <div style="text-align:center;background:var(--bg);border-radius:8px;padding:5px 3px">
              <div class="bold" style="font-size:13px;color:var(--primary)">${c.centerIds.length}</div>
              <div style="font-size:9px;color:var(--muted)">Centers</div>
            </div>
          </div>
          <div class="flex-b">
            <div style="font-size:10px;color:var(--muted);flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
              Last: ${lastBk ? lastBk.slot + ' · ' + (CENTERS.find(x => x.id === lastBk.centerId)?.name || '') : '—'}
            </div>
            <div style="display:flex;gap:5px;flex-shrink:0">
              <button class="btn btn-sm btn-ghost" style="padding:3px 10px;font-size:10px" onclick="event.stopPropagation();openCall('${c.name}','${c.phone}','Customer')">📞</button>
              ${thread ? `<button class="btn btn-sm btn-ghost" style="padding:3px 10px;font-size:10px" onclick="event.stopPropagation();Chat.openThread('${thread.id}')">💬</button>` : ''}
            </div>
          </div>
        </div>`;
    }).join('') : '<div style="padding:40px;text-align:center;color:var(--muted);font-size:12px">No customers found</div>');
  },

  setCenterFilter(cid) {
    this.centerFilter = cid;
    this.render();
  },

  openDetail(phone) {
    AppState.selectedCustomerPhone = phone;
    Router.go('customer-detail');
  },

  renderDetail() {
    const c = this._getAll().find(x => x.phone === AppState.selectedCustomerPhone);
    if (!c) return;

    const initials = c.name.trim().split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
    const done     = c.bookings.filter(b => b.status === 'done');
    const rated    = done.filter(b => b.rating != null);
    const avgRat   = rated.length ? (rated.reduce((s, b) => s + b.rating, 0) / rated.length).toFixed(1) : null;
    const thread   = CHAT_THREADS.find(t => t.type === 'customer' && t.phone === c.phone);

    setText('custd-name',   c.name);
    setText('custd-phone',  '📞 ' + c.phone);
    setText('custd-avatar', initials);

    setHtml('custd-stats', `
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px">
        <div style="background:rgba(255,255,255,.15);border-radius:10px;padding:9px;text-align:center">
          <div style="font-size:18px;font-weight:900;color:#fff">${c.bookings.length}</div>
          <div style="font-size:9px;color:rgba(255,255,255,.75);margin-top:1px">Bookings</div>
        </div>
        <div style="background:rgba(255,255,255,.15);border-radius:10px;padding:9px;text-align:center">
          <div style="font-size:16px;font-weight:900;color:#86efac">${UI.formatPrice(c.spent)}</div>
          <div style="font-size:9px;color:rgba(255,255,255,.75);margin-top:1px">Total Spent</div>
        </div>
        <div style="background:rgba(255,255,255,.15);border-radius:10px;padding:9px;text-align:center">
          <div style="font-size:18px;font-weight:900;color:#fde68a">${avgRat ? avgRat + '⭐' : '—'}</div>
          <div style="font-size:9px;color:rgba(255,255,255,.75);margin-top:1px">Avg Rating</div>
        </div>
      </div>`);

    setHtml('custd-actions', `
      <button class="btn btn-sm" style="background:rgba(255,255,255,.2);color:#fff;border:1.5px solid rgba(255,255,255,.3)" onclick="openCall('${c.name}','${c.phone}','Customer')">📞 Call</button>
      ${thread ? `<button class="btn btn-sm" style="background:rgba(255,255,255,.2);color:#fff;border:1.5px solid rgba(255,255,255,.3)" onclick="Chat.openThread('${thread.id}')">💬 Chat</button>` : ''}
    `);

    setHtml('custd-booking-list', (c.bookings || []).map(b => {
      const sm  = STATUS_META[b.status];
      const wl  = WASH_LABELS[b.type];
      const ctr = CENTERS.find(x => x.id === b.centerId);
      return `
        <div class="bk-card" style="margin-bottom:8px">
          <div class="flex-b" style="margin-bottom:5px">
            <div>
              <div class="bold text-xs">${b.id}</div>
              <div style="font-size:10px;color:var(--muted)">${b.vehicle} · ${b.model}</div>
            </div>
            <span class="badge ${sm.cls}">${sm.icon} ${sm.label}</span>
          </div>
          <div class="flex-c gap6" style="flex-wrap:wrap;margin-bottom:5px">
            <span class="badge" style="background:${wl.bg};color:${wl.color}">${wl.label}</span>
            <span class="bk-center-tag">🏢 ${ctr?.name || b.centerId}</span>
            <span class="text-xs text-muted">🕐 ${b.slot}</span>
            <span class="text-xs bold text-primary">₹${b.price}</span>
            ${b.rating ? `<span style="font-size:10px;color:var(--gold)">${'★'.repeat(b.rating)}${'☆'.repeat(5 - b.rating)}</span>` : ''}
          </div>
          <div style="font-size:10px;color:var(--muted)">📦 ${b.pkg}</div>
        </div>`;
    }).join(''));
  },
};

// ── SETTLEMENTS SCREEN ────────────────────────────────────────
const SettlementsScreen = {
  render() {
    const pending  = SETTLEMENTS.filter(s => s.status === 'pending');
    const settled  = SETTLEMENTS.filter(s => s.status === 'settled');
    const totalOwed = pending.reduce((s, x) => s + x.appDiscount, 0);

    // Summary strip
    const pendingCenters = [...new Set(pending.map(s => s.centerId))].length;
    setHtml('settle-summary', `
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:14px">
        <div class="card card-pad" style="text-align:center;padding:10px">
          <div style="font-size:20px;font-weight:900;color:#dc2626">${UI.formatPrice(totalOwed)}</div>
          <div style="font-size:10px;color:var(--muted);margin-top:2px">Total Pending</div>
        </div>
        <div class="card card-pad" style="text-align:center;padding:10px">
          <div style="font-size:20px;font-weight:900;color:#0369a1">${pending.length}</div>
          <div style="font-size:10px;color:var(--muted);margin-top:2px">Orders Pending</div>
        </div>
        <div class="card card-pad" style="text-align:center;padding:10px">
          <div style="font-size:20px;font-weight:900;color:var(--green)">${pendingCenters}</div>
          <div style="font-size:10px;color:var(--muted);margin-top:2px">Centers Owed</div>
        </div>
      </div>`);

    // Group pending by center
    const byCenter = {};
    pending.forEach(s => {
      if (!byCenter[s.centerId]) byCenter[s.centerId] = { centerName: s.centerName, items: [] };
      byCenter[s.centerId].items.push(s);
    });

    // Tomorrow date string for credit display
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
    const creditDate = tomorrow.toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });

    let html = '';

    // Pending centers
    if (Object.keys(byCenter).length === 0) {
      html += `<div class="card card-pad" style="text-align:center;color:var(--green);font-size:13px;margin-bottom:12px">✅ All settlements up to date</div>`;
    } else {
      Object.entries(byCenter).forEach(([cid, g]) => {
        const total = g.items.reduce((s, x) => s + x.appDiscount, 0);
        const c = CENTERS.find(x => x.id === cid);
        html += `
          <div class="card" style="padding:0;margin-bottom:12px">
            <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 13px;border-bottom:1px solid var(--border)">
              <div>
                <div style="font-weight:700;font-size:13px">${g.centerName}</div>
                <div style="font-size:10px;color:var(--muted);margin-top:1px">GSTIN: ${c?.gstin || '—'} · ${g.items.length} order${g.items.length > 1 ? 's' : ''}</div>
              </div>
              <div style="text-align:right">
                <div style="font-size:16px;font-weight:900;color:#dc2626">${UI.formatPrice(total)}</div>
                <div style="font-size:9px;color:var(--muted)">pending</div>
              </div>
            </div>
            ${g.items.map(s => `
              <div style="padding:8px 13px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between">
                <div>
                  <div style="font-weight:600;font-size:12px">${s.bookingRef}</div>
                  <div style="font-size:10px;color:var(--muted)">${s.customer} · ${s.packageName}</div>
                  <div style="font-size:10px;color:var(--muted)">Wash: ${s.washDate} · Pkg: ${UI.formatPrice(s.packagePrice)}</div>
                </div>
                <div style="text-align:right">
                  <div style="font-size:13px;font-weight:800;color:#0369a1">${UI.formatPrice(s.appDiscount)}</div>
                  <div style="font-size:9px;color:var(--muted)">SparkWash owes</div>
                </div>
              </div>`).join('')}
            <div style="padding:10px 13px;background:#f0fdf4;border-radius:0 0 12px 12px">
              ${c?.bankAccount ? `
                <div style="display:grid;gap:3px;margin-bottom:10px;font-size:11px">
                  <div style="font-weight:700;color:#166534">🏦 Credit to bank account</div>
                  <div style="color:#166534">${c.accountName || c.owner} · ${c.bankName || ''}</div>
                  <div style="color:#166534">Acc: ····${c.bankAccount.slice(-4)} &nbsp;·&nbsp; IFSC: ${c.ifsc}</div>
                </div>` : `
                <div style="background:#fee2e2;border-radius:8px;padding:8px 10px;margin-bottom:10px;font-size:11px;color:#dc2626">
                  ⚠️ Bank account not on file — ask center to update bank details before settling
                </div>`}
              <div style="display:flex;align-items:center;justify-content:space-between">
                <div style="font-size:10px;color:#166534">Credit by <strong>${creditDate}</strong></div>
                <button class="btn btn-sm" style="background:${c?.bankAccount ? 'var(--green)' : '#6b7280'};color:#fff;font-size:11px;padding:5px 12px" onclick="SettlementsScreen.markSettled('${cid}')">✓ Mark Settled</button>
              </div>
            </div>
          </div>`;
      });
    }

    // Settled history
    if (settled.length) {
      html += `<div class="slbl" style="margin-top:4px">Settlement History</div>`;
      html += `<div class="card" style="padding:0;margin-bottom:12px">`;
      settled.forEach(s => {
        html += `
          <div style="padding:9px 13px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between">
            <div>
              <div style="font-weight:600;font-size:12px">${s.bookingRef} · ${s.centerName}</div>
              <div style="font-size:10px;color:var(--muted)">${s.customer} · ${s.washDate}</div>
              <div style="font-size:10px;color:var(--green)">Credited on ${s.creditedOn}</div>
            </div>
            <div style="font-size:13px;font-weight:700;color:var(--green)">${UI.formatPrice(s.appDiscount)}</div>
          </div>`;
      });
      html += `</div>`;
    }

    setHtml('settle-centers', html);
  },

  markSettled(centerId) {
    const pending = SETTLEMENTS.filter(s => s.centerId === centerId && s.status === 'pending');
    if (!pending.length) return;
    const c = CENTERS.find(x => x.id === centerId);
    const total = pending.reduce((s, x) => s + x.appDiscount, 0);
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
    const creditDate = tomorrow.toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });

    const bankLine = c?.bankAccount
      ? `Account: ····${c.bankAccount.slice(-4)}  |  IFSC: ${c.ifsc}\nHolder: ${c.accountName || c.owner}\nBank: ${c.bankName || '—'}`
      : '⚠️ No bank account on file';
    const confirmed = confirm(
      `Confirm settlement for ${c?.name || centerId}?\n\n` +
      `Amount: ${UI.formatPrice(total)}\n` +
      `${bankLine}\n\n` +
      `Amount will be credited by ${creditDate}.`
    );
    if (!confirmed) return;

    pending.forEach(s => { s.status = 'settled'; s.settledAt = Date.now(); s.creditedOn = creditDate; });
    if (c) c.pendingSettlement = 0;
    logChange(centerId, 'Settlement marked', `${UI.formatPrice(total)} — credit by ${creditDate} to ${c?.bankAccount ? '····' + c.bankAccount.slice(-4) : 'no bank'}`);
    UI.toast(`✅ ${UI.formatPrice(total)} marked settled · credit by ${creditDate}`);
    this.render();
    // Refresh SA panel if visible
    if (AppState.screen === 'settlements') return;
    SuperAdmin._renderSettlements?.();
  },
};

// ── CENTER APPLICATIONS SCREEN ────────────────────────────────
const ApplicationsScreen = {
  _filter: 'all',
  _loaded: false,

  render() {
    if (!this._loaded) { this._load(); return; }
    this._renderFilterChips();
    this._renderList();
  },

  async _load() {
    setHtml('apps-list', `<div style="text-align:center;padding:40px;color:var(--muted)">⏳ Loading applications…</div>`);
    try {
      const res  = await fetch(`${CENTER_APP_URL}/api/admin/applications`, {
        headers: { 'x-admin-key': ADMIN_API_KEY },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load');
      APPLICATIONS  = data.data;
      this._loaded  = true;
      this._renderFilterChips();
      this._renderList();
    } catch (err) {
      setHtml('apps-list', `
        <div style="text-align:center;padding:40px">
          <div style="color:var(--red);font-size:13px;margin-bottom:12px">❌ ${err.message}</div>
          <div style="font-size:11px;color:var(--muted);margin-bottom:12px">Make sure center-app is running at ${CENTER_APP_URL}</div>
          <button class="btn btn-sm" onclick="ApplicationsScreen._loaded=false;ApplicationsScreen.render()">Retry</button>
        </div>`);
    }
  },

  _renderFilterChips() {
    const filters = [
      { key:'all',      label:'All',         count: APPLICATIONS.length },
      { key:'pending',  label:'⏳ Pending',   count: APPLICATIONS.filter(a => a.status === 'pending').length },
      { key:'approved', label:'✅ Approved',  count: APPLICATIONS.filter(a => a.status === 'approved').length },
      { key:'rejected', label:'❌ Rejected',  count: APPLICATIONS.filter(a => a.status === 'rejected').length },
    ];
    setHtml('apps-filter-chips', filters.map(f => `
      <div class="chip ${this._filter === f.key ? 'chip-on' : ''}" onclick="ApplicationsScreen._setFilter('${f.key}')">
        ${f.label} ${f.count > 0 ? `<span class="chip-badge">${f.count}</span>` : ''}
      </div>`).join(''));
    setText('apps-sub', `${APPLICATIONS.filter(a => a.status === 'pending').length} pending review`);
  },

  _setFilter(key) { this._filter = key; this._renderFilterChips(); this._renderList(); },

  _renderList() {
    const list = this._filter === 'all' ? APPLICATIONS : APPLICATIONS.filter(a => a.status === this._filter);
    if (!list.length) {
      setHtml('apps-list', `<div class="empty-state"><div class="empty-ico">🏪</div><div class="empty-title">No applications</div></div>`);
      return;
    }
    setHtml('apps-list', list.map(a => {
      const isPending  = a.status === 'pending';
      const isApproved = a.status === 'approved';
      const badge = isPending  ? `<span class="badge" style="background:#fef3c7;color:#92400e">⏳ Pending</span>`
                  : isApproved ? `<span class="badge b-conf">✅ Approved</span>`
                  : `<span class="badge b-canc">❌ Rejected</span>`;

      const images = (() => {
        try { return JSON.parse(a.center_images || '[]'); } catch { return []; }
      })();
      const certs = (() => {
        try { return JSON.parse(a.certificates || '[]'); } catch { return []; }
      })();
      const washTypes = (a.wash_types || '').split(',').filter(Boolean)
        .map(t => ({ water:'💧 Water', dry:'🧴 Dry', steam:'♨️ Steam', d2d:'🚗 D2D' }[t] || t))
        .join(' · ');

      const imgStrip = images.length
        ? `<div style="display:flex;gap:6px;margin-bottom:8px;overflow-x:auto">
            ${images.map(src => `<img src="${src}" style="width:60px;height:60px;object-fit:cover;border-radius:8px;flex-shrink:0">`).join('')}
           </div>` : '';

      const certList = certs.length
        ? `<div style="font-size:11px"><span style="color:var(--muted)">📄 Docs:</span> ${certs.map(c => c.name).join(', ')}</div>` : '';

      const geoInfo = a.geo_lat
        ? `<div style="font-size:11px"><span style="color:var(--muted)">📍 Geo:</span> ${parseFloat(a.geo_lat).toFixed(4)}, ${parseFloat(a.geo_lng).toFixed(4)}</div>` : '';

      return `
        <div class="card card-pad" style="margin-bottom:10px">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:8px">
            <div>
              <div style="font-weight:700;font-size:14px">${a.name}</div>
              <div style="font-size:11px;color:var(--muted)">${a.owner_name} · ${new Date(a.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</div>
            </div>
            ${badge}
          </div>
          ${imgStrip}
          <div style="display:grid;gap:4px;margin-bottom:8px">
            <div style="font-size:11px"><span style="color:var(--muted)">📱 Mobile:</span> ${a.mobile}</div>
            <div style="font-size:11px"><span style="color:var(--muted)">📧 Email:</span> ${a.email || '—'}</div>
            <div style="font-size:11px"><span style="color:var(--muted)">🏙️ City:</span> ${a.city}</div>
            <div style="font-size:11px"><span style="color:var(--muted)">🏠 Address:</span> ${a.address}</div>
            ${geoInfo}
            <div style="font-size:11px"><span style="color:var(--muted)">🚿 Wash types:</span> ${washTypes || '—'}</div>
            <div style="font-size:11px"><span style="color:var(--muted)">🧾 GSTIN:</span> ${a.gstin || '<span style="color:#dc2626">Not provided</span>'}</div>
            <div style="font-size:11px"><span style="color:var(--muted)">🏦 Bank:</span> ${a.bank_account ? `${a.account_name || ''} · ····${a.bank_account.slice(-4)} · ${a.ifsc || ''}` : '<span style="color:#dc2626">Not provided</span>'}</div>
            ${certList}
            ${a.notes ? `<div style="font-size:11px"><span style="color:var(--muted)">📝 Notes:</span> ${a.notes}</div>` : ''}
          </div>
          ${isPending ? `
            <div style="display:flex;gap:8px">
              <button class="btn btn-sm btn-red" style="flex:1" onclick="ApplicationsScreen.reject(${a.id})">✕ Reject</button>
              <button class="btn btn-sm btn-green" style="flex:1" onclick="ApplicationsScreen.approve(${a.id})">✓ Approve & Go Live</button>
            </div>` : ''}
        </div>`;
    }).join(''));
  },

  async approve(id) {
    const a = APPLICATIONS.find(x => x.id === id);
    if (!a) return;
    const msg = (!a.gstin || !a.bank_account)
      ? `⚠️ ${a.name} is missing GST or bank details.\n\nApprove anyway? They can add details later.`
      : `Approve ${a.name}?\n\nThis will create a center account and send them a confirmation.`;
    if (!confirm(msg)) return;

    try {
      const res  = await fetch(`${CENTER_APP_URL}/api/admin/applications/${id}/approve`, {
        method:  'POST',
        headers: { 'x-admin-key': ADMIN_API_KEY, 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      UI.toast(`✅ ${a.name} approved — center account created`);
      logChange(id, 'Application approved', `${a.name} center account created`);
      this._loaded = false;
      this.render();
    } catch (err) {
      UI.toast(`❌ ${err.message}`);
    }
  },

  async reject(id) {
    const a = APPLICATIONS.find(x => x.id === id);
    if (!a || !confirm(`Reject application from ${a.name}?`)) return;
    const notes = prompt('Reason for rejection (optional):') || 'Application rejected by admin';

    try {
      const res  = await fetch(`${CENTER_APP_URL}/api/admin/applications/${id}/reject`, {
        method:  'POST',
        headers: { 'x-admin-key': ADMIN_API_KEY, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ notes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      UI.toast(`Application rejected`);
      logChange(id, 'Application rejected', a.name);
      this._loaded = false;
      this.render();
    } catch (err) {
      UI.toast(`❌ ${err.message}`);
    }
  },
};
