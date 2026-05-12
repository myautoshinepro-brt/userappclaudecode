// ============================================================
// SparkWash Admin App — app.js  (state, router, UI)
// ============================================================

const AppState = {
  role:                  null,   // 'admin' | 'superadmin'
  admin:                 null,   // current ADMINS entry
  selectedCenterId:      null,
  selectedBookingId:     null,
  selectedThreadId:      null,
  selectedCustomerPhone: null,
  screen:                'login',
};

// ── ROUTER ──────────────────────────────────────────────────
const Router = {
  _history: [],

  go(id, pushHistory = true) {
    // Stop background polling on screens that have it before we leave.
    const prev = AppState.screen;
    if (prev === 'chat'        && id !== 'chat'        && typeof Chat       !== 'undefined' && Chat.destroy)       Chat.destroy();
    if (prev === 'chat-detail' && id !== 'chat-detail' && typeof ChatDetail !== 'undefined' && ChatDetail.destroy) ChatDetail.destroy();

    // Push the screen we're leaving so back() can return to it. Skip auth /
    // identity screens and avoid pushing the same id twice in a row.
    if (pushHistory && prev && prev !== id && prev !== 'login') {
      this._history.push(prev);
      if (this._history.length > 30) this._history.shift();
    }

    document.querySelectorAll('.screen').forEach(s => s.classList.remove('on'));
    const sc = document.getElementById('sc-' + id);
    if (sc) sc.classList.add('on');
    AppState.screen = id;
    this._nav(id);
    this._pills(id);

    if (id === 'dashboard')       AdminDashboard.render();
    if (id === 'centers')         Centers.render();
    if (id === 'center-detail')   CenterDetail.render();
    if (id === 'bookings')        AdminBookings.render();
    if (id === 'chat')            Chat.render();
    if (id === 'chat-detail')     ChatDetail.render();
    if (id === 'reports')         AdminReports.render();
    if (id === 'super')           SuperAdmin.render();
    if (id === 'history')         HistoryScreen.render();
    if (id === 'notifications')   NotificationsScreen.render();
    if (id === 'profile')         AdminProfile.render();
    if (id === 'customers')       CustomersScreen.render();
    if (id === 'customer-detail') CustomersScreen.renderDetail();
    if (id === 'settlements')     SettlementsScreen.render();
    if (id === 'applications')    ApplicationsScreen.render();
    if (id === 'booking-detail')  BookingDetail.render();
  },

  // Return to whichever screen we came from. Falls back to dashboard.
  back() {
    while (this._history.length) {
      const prev = this._history.pop();
      if (prev && prev !== AppState.screen) {
        this.go(prev, false);
        return;
      }
    }
    this.go('dashboard', false);
  },

  _nav(id) {
    const map = {
      dashboard:'home', centers:'ctr', 'center-detail':'ctr',
      bookings:'bk', 'booking-detail':'bk', chat:'ch', reports:'rp', super:'sa', history:'',
      customers:'bk', 'customer-detail':'bk',
      settlements:'sa', applications:'sa',
      notifications:'home', profile:'home',
    };
    const tab = map[id];
    document.querySelectorAll('.bnav-btn').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
  },

  _pills(id) {
    document.querySelectorAll('.nav-pill').forEach(p => {
      const on = p.dataset.screen === id;
      p.style.background  = on ? 'var(--primary)' : 'transparent';
      p.style.color       = on ? '#fff' : 'var(--muted)';
      p.style.borderColor = on ? 'var(--primary)' : 'var(--border2)';
    });
  },
};

// ── UI HELPERS ───────────────────────────────────────────────
const UI = {
  _tt: null,
  toast(msg) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('on');
    clearTimeout(this._tt);
    this._tt = setTimeout(() => el.classList.remove('on'), 2800);
  },
  openSheet(id)  { document.getElementById(id)?.classList.add('on'); },
  closeSheet(id) { document.getElementById(id)?.classList.remove('on'); },
  formatPrice(n) { return '₹' + (n || 0).toLocaleString('en-IN'); },
  washLabel(t)   { return WASH_LABELS[t]?.label || t; },
  badge(status)  {
    const m = STATUS_META[status] || {};
    return `<span class="badge ${m.cls||''}">${m.icon||''} ${m.label||status}</span>`;
  },
  initials(name) {
    return (name||'').trim().split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();
  },
  avatarColor(idx) {
    return ['#7c3aed','#3b82f6','#10b981','#ec4899','#f59e0b','#ef4444','#8b5cf6','#14b8a6'][idx % 8];
  },
};

function $id(id)     { return document.getElementById(id); }
function setText(id, v) { const e = $id(id); if (e) e.textContent = v; }
function setHtml(id, v) { const e = $id(id); if (e) e.innerHTML = v; }

// ── LOGIN ────────────────────────────────────────────────────
function login(role) {
  const admin = ADMINS.find(a => a.role === role);
  if (!admin) return;
  AppState.role  = role;
  AppState.admin = admin;

  // Show/hide role-specific nav items
  document.querySelectorAll('.sa-only').forEach(el => {
    el.style.display = role === 'superadmin' ? '' : 'none';
  });
  document.querySelectorAll('.admin-reports-btn').forEach(el => {
    el.style.display = role === 'admin' ? '' : 'none';
  });

  _seedAuditLog();
  _loadRevenueRequests();
  Router.go('dashboard');

  // Pull real centers + bookings from center-app (replaces demo arrays in place).
  // Runs async — the dashboard will re-render once data lands.
  if (typeof AdminData !== 'undefined') AdminData.loadAll();
}

// ── AUDIT LOG ────────────────────────────────────────────────
const AUDIT_KEY = 'sw_audit_log';

function _seedAuditLog() {
  const existing = JSON.parse(localStorage.getItem(AUDIT_KEY) || '[]');
  const ids = new Set(existing.map(e => e.id));
  const toAdd = AUDIT_SEED.filter(s => !ids.has(s.id));
  if (toAdd.length) {
    localStorage.setItem(AUDIT_KEY, JSON.stringify([...existing, ...toAdd].sort((a,b) => b.ts - a.ts).slice(0,500)));
  }
}

function logChange(centerId, action, detail) {
  const c     = CENTERS.find(x => x.id === centerId);
  const admin = AppState.admin;
  const roleLabel = AppState.role === 'superadmin' ? 'Super Admin' : 'Admin';
  const entry = {
    id:         'al' + Date.now() + Math.random().toString(36).slice(2,6),
    centerId,
    centerName: c?.name || centerId,
    actor:      'admin',
    actorName:  admin?.name  || 'Admin',
    actorRole:  roleLabel,
    action,
    detail,
    ts:         Date.now(),
  };
  const existing = JSON.parse(localStorage.getItem(AUDIT_KEY) || '[]');
  existing.unshift(entry);
  localStorage.setItem(AUDIT_KEY, JSON.stringify(existing.slice(0, 500)));
  return entry;
}

function getAuditLog(centerId) {
  const all = JSON.parse(localStorage.getItem(AUDIT_KEY) || '[]');
  return centerId ? all.filter(e => e.centerId === centerId) : all;
}

function fmtTs(ts) {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60)  return 'just now';
  if (diff < 3600) return Math.floor(diff/60) + ' min ago';
  if (diff < 86400) return Math.floor(diff/3600) + ' hr ago';
  return new Date(ts).toLocaleString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit', hour12:true });
}

// ── REVENUE REQUESTS PERSISTENCE ────────────────────────────
const REV_KEY = 'sw_revenue_requests';

function _loadRevenueRequests() {
  const saved = JSON.parse(localStorage.getItem(REV_KEY) || '[]');
  REVENUE_REQUESTS.length = 0;
  saved.forEach(r => REVENUE_REQUESTS.push(r));
}

function _saveRevenueRequests() {
  localStorage.setItem(REV_KEY, JSON.stringify(REVENUE_REQUESTS));
}

// ── REVENUE ACCESS HELPERS ──────────────────────────────────
function canSeeRevenue(centerId) {
  if (AppState.role === 'superadmin') return true;
  if (!centerId) return false;
  return REVENUE_REQUESTS.some(r =>
    r.centerId === centerId &&
    r.adminId  === AppState.admin?.id &&
    r.status   === 'approved'
  );
}

function revenueStatus(centerId) {
  if (AppState.role === 'superadmin') return 'visible';
  if (!centerId) return 'locked';
  const req = REVENUE_REQUESTS.find(r =>
    r.centerId === centerId && r.adminId === AppState.admin?.id
  );
  return req ? req.status : 'locked'; // 'pending' | 'approved' | 'rejected' | 'locked'
}

function requestRevenue(centerId) {
  const existing = REVENUE_REQUESTS.find(r =>
    r.centerId === centerId && r.adminId === AppState.admin?.id && r.status === 'pending'
  );
  if (existing) { UI.toast('⏳ Request already pending — awaiting Super Admin approval'); return; }
  const c = CENTERS.find(x => x.id === centerId);
  REVENUE_REQUESTS.push({
    id:          'rr' + Date.now(),
    adminId:     AppState.admin.id,
    adminName:   AppState.admin.name,
    centerId,
    centerName:  c?.name || centerId,
    status:      'pending',
    requestedAt: Date.now(),
  });
  _saveRevenueRequests();
  UI.toast('📩 Revenue access requested · Super Admin will review');
  // Re-render current screen so status updates immediately
  const s = AppState.screen;
  if (s === 'dashboard')     AdminDashboard.render();
  else if (s === 'centers')  Centers.render();
  else if (s === 'center-detail') CenterDetail.render();
  else if (s === 'reports')  AdminReports.render();
}

// ── CSV EXPORT ───────────────────────────────────────────────
function exportCSV(filename, headers, rows) {
  const escape = v => {
    const s = String(v == null ? '' : v);
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? '"' + s.replace(/"/g, '""') + '"'
      : s;
  };
  const lines = [headers.map(escape).join(',')];
  rows.forEach(r => lines.push(r.map(escape).join(',')));
  const blob = new Blob([lines.join('\n')], { type:'text/csv' });
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

// ── CALL OVERLAY ─────────────────────────────────────────────
function openCall(name, phone, subtitle) {
  setText('call-name',     name);
  setText('call-phone',    phone);
  setText('call-subtitle', subtitle || '');
  setText('call-initials', UI.initials(name));
  $id('call-overlay')?.classList.add('on');

  // animate "calling…" → "Connected"
  setText('call-status', '📞 Calling…');
  setTimeout(() => setText('call-status', '🔴 Connected · 0:04'), 2000);
}
function endCall() {
  $id('call-overlay')?.classList.remove('on');
  UI.toast('📵 Call ended');
}
