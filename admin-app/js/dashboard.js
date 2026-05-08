// ============================================================
// SparkWash Admin App — dashboard.js
// ============================================================

const AdminDashboard = {
  render() {
    const admin = AppState.admin;
    const role  = AppState.role;

    // Greeting
    const h = new Date().getHours();
    const greet = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
    setText('dash-greeting', `${greet}, ${admin?.name?.split(' ')[0]} 👋`);
    setText('dash-sub', role === 'superadmin' ? 'SparkWash Platform — Super Admin' : 'SparkWash Platform — Admin');
    setText('dash-role-badge', role === 'superadmin' ? '⚡ Super Admin' : '🛡️ Admin');

    // Platform totals
    const todayBookings = ALL_BOOKINGS.filter(b => b.date === 'Today');
    const totalRev      = CENTERS.reduce((s, c) => s + c.todayRevenue, 0);
    const totalBk       = todayBookings.length;
    const activeNow     = CENTERS.reduce((s, c) => s + c.activeNow, 0);
    const openCenters   = CENTERS.filter(c => c.isOpen).length;
    const unread        = CHAT_THREADS.reduce((s, t) => s + t.unread, 0);
    const pending       = todayBookings.filter(b => ['new','confirmed'].includes(b.status)).length;
    const doneToday     = todayBookings.filter(b => b.status === 'done').length;

    // Total revenue card — SA only; hide for admin
    const revCard = $id('dash-rev-card');
    if (revCard) revCard.style.display = role === 'superadmin' ? '' : 'none';
    setText('dash-rev', UI.formatPrice(totalRev));
    setText('dash-bk-total',     totalBk);
    setText('dash-active-now',   activeNow);
    setText('dash-open-centers', `${openCenters}/${CENTERS.length}`);
    setText('dash-pending',      pending);

    // Chat unread badge on nav
    const chatBadge = $id('nav-chat-badge');
    if (chatBadge) {
      chatBadge.style.display = unread > 0 ? '' : 'none';
      chatBadge.textContent   = unread;
    }

    // Notification bell badge
    const notifUnread = NOTIFICATIONS.filter(n => !n.read).length;
    const notifBadge  = $id('nav-notif-badge');
    if (notifBadge) {
      notifBadge.style.display = notifUnread > 0 ? '' : 'none';
      notifBadge.textContent   = notifUnread;
    }

    // Quick stats row
    setHtml('dash-quick-stats', `
      <div style="background:rgba(255,255,255,.15);border-radius:10px;padding:8px 10px;text-align:center;flex:1">
        <div style="font-size:18px;font-weight:900;color:#fff">${doneToday}</div>
        <div style="font-size:9px;color:rgba(255,255,255,.75);margin-top:1px">Completed</div>
      </div>
      <div style="background:rgba(255,255,255,.15);border-radius:10px;padding:8px 10px;text-align:center;flex:1">
        <div style="font-size:18px;font-weight:900;color:#fde68a">${pending}</div>
        <div style="font-size:9px;color:rgba(255,255,255,.75);margin-top:1px">Pending</div>
      </div>
      <div style="background:rgba(255,255,255,.15);border-radius:10px;padding:8px 10px;text-align:center;flex:1">
        <div style="font-size:18px;font-weight:900;color:#86efac">${activeNow}</div>
        <div style="font-size:9px;color:rgba(255,255,255,.75);margin-top:1px">Active now</div>
      </div>
      <div style="background:rgba(255,255,255,.15);border-radius:10px;padding:8px 10px;text-align:center;flex:1;cursor:pointer" onclick="Router.go('chat')">
        <div style="font-size:18px;font-weight:900;color:${unread>0?'#fca5a5':'#fff'}">${unread}</div>
        <div style="font-size:9px;color:rgba(255,255,255,.75);margin-top:1px">Unread</div>
      </div>`);

    // Center tiles
    setHtml('dash-centers', CENTERS.map(c => `
      <div class="center-tile" onclick="Centers.openDetail('${c.id}')">
        <div class="flex-b" style="margin-bottom:7px">
          <div class="bold" style="font-size:12px;flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${c.name}</div>
          <span class="badge ${c.isOpen ? 'b-open' : 'b-closed'}" style="margin-left:6px">${c.isOpen ? '🟢 Open' : '🔴 Closed'}</span>
        </div>
        <div class="text-xs text-muted" style="margin-bottom:9px">📍 ${c.area}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:5px">
          <div class="center-mini-stat">
            <div class="bold" style="font-size:15px">${c.totalBookings}</div>
            <div style="font-size:9px;color:var(--muted)">Bookings</div>
          </div>
          <div class="center-mini-stat">
            <div class="bold" style="font-size:15px;color:var(--primary)">${c.activeNow}</div>
            <div style="font-size:9px;color:var(--muted)">Active</div>
          </div>
          <div class="center-mini-stat" style="cursor:${canSeeRevenue(c.id)||revenueStatus(c.id)==='pending'?'default':'pointer'}"
             onclick="event.stopPropagation();${canSeeRevenue(c.id)||revenueStatus(c.id)==='pending'?'':'requestRevenue(\''+c.id+'\')'}">
            ${canSeeRevenue(c.id)
              ? `<div class="bold" style="font-size:15px">₹${Math.round(c.todayRevenue/1000*10)/10}k</div>`
              : revenueStatus(c.id) === 'pending'
                ? `<div style="font-size:11px;color:var(--gold);font-weight:700">⏳</div>`
                : `<div style="font-size:11px;color:var(--primary);font-weight:700">🔒</div>`}
            <div style="font-size:9px;color:var(--muted)">${canSeeRevenue(c.id) ? 'Revenue' : revenueStatus(c.id) === 'pending' ? 'Pending' : 'Request'}</div>
          </div>
        </div>
        <div class="flex-b" style="margin-top:8px">
          <div style="font-size:10px;color:var(--gold)">⭐ ${c.rating} <span style="color:var(--muted)">(${c.totalReviews})</span></div>
          <span style="font-size:10px;color:var(--primary);font-weight:700">View →</span>
        </div>
      </div>`).join(''));

    // Activity feed
    setHtml('dash-activity', ACTIVITY_FEED.slice(0, 6).map(a => `
      <div class="flex-c gap10" style="padding:9px 0;border-bottom:.5px solid var(--border)">
        <div style="width:33px;height:33px;border-radius:50%;background:var(--primary-light);display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0">${a.icon}</div>
        <div style="flex:1;min-width:0">
          <div class="bold text-xs">${a.text}</div>
          <div style="font-size:10px;color:var(--muted);margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${a.sub}</div>
        </div>
        <div style="font-size:9px;color:var(--faint);flex-shrink:0">${a.time}</div>
      </div>`).join(''));

    // SA quick panel (only for superadmin)
    const saPanel = $id('dash-sa-panel');
    if (saPanel) saPanel.style.display = role === 'superadmin' ? '' : 'none';
  },
};
