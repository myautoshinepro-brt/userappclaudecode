// ============================================================
// SparkWash — notifications.js
// Notification settings (channels, events, quiet hours) + inbox
// ============================================================

// ── DEFAULT DATA ──

const NOTIF_INBOX_SEED = [
  {
    id: 'n1', type: 'booking',
    icon: '✅', iconBg: '#dcfce7',
    title: 'Booking confirmed!',
    body: 'Your wash at Shine Auto Wash is confirmed for today at 10:30 AM. Booking #SW20490.',
    relTime: '2 min ago', timestamp: 0, read: false,
  },
  {
    id: 'n2', type: 'update',
    icon: '🚗', iconBg: '#dbeafe',
    title: 'Center accepted your booking',
    body: 'Shine Auto Wash has accepted booking #SW20490. Head over when ready!',
    relTime: '8 min ago', timestamp: 0, read: false,
  },
  {
    id: 'n3', type: 'promo',
    icon: '🎁', iconBg: '#fef9c3',
    title: '20% off on steam wash!',
    body: 'Use code STEAM20 this weekend at any SparkWash center. Valid till Sunday.',
    relTime: '1 hr ago', timestamp: 0, read: false,
  },
  {
    id: 'n4', type: 'reminder',
    icon: '⏰', iconBg: '#fce7f3',
    title: 'Your wash is in 30 minutes',
    body: 'Reminder: Exterior + Vacuum at Shine Auto Wash at 10:30 AM. Slot is filling up!',
    relTime: '3 hr ago', timestamp: 0, read: true,
  },
  {
    id: 'n5', type: 'booking',
    icon: '💧', iconBg: '#e0f2fe',
    title: 'Wash completed! ✨',
    body: 'Your MH-01-AB-1234 wash is done. How was your experience? Tap to rate.',
    relTime: 'Yesterday', timestamp: 0, read: true,
  },
  {
    id: 'n6', type: 'system',
    icon: '📍', iconBg: '#f3e8ff',
    title: 'New center near you!',
    body: 'AquaShine Car Wash just opened in Andheri East — only 0.8 km from Home.',
    relTime: 'Yesterday', timestamp: 0, read: true,
  },
];

const NOTIF_SETTINGS_DEFAULT = {
  channels: { whatsapp: true, push: true, sms: true, email: false },
  events: {
    booking_confirmed: true,
    center_accepted:   true,
    wash_started:      true,
    wash_completed:    true,
    reminder:          true,
    promos:            true,
    new_centers:       false,
  },
  quietHours: { enabled: false, from: '22:00', to: '08:00' },
};

// ── STATE ──

const NotifState = {
  _settings: null,
  _inbox:    null,
  pushPermission: 'default',

  load() {
    try {
      const s = localStorage.getItem('sw_notif_settings');
      this._settings = s ? JSON.parse(s) : this._cloneDefaults();
      const i = localStorage.getItem('sw_notif_inbox');
      this._inbox = i ? JSON.parse(i) : this._seededInbox();
    } catch {
      this._settings = this._cloneDefaults();
      this._inbox    = this._seededInbox();
    }
    this.pushPermission = (typeof Notification !== 'undefined')
      ? Notification.permission
      : 'unsupported';
  },

  _cloneDefaults() { return JSON.parse(JSON.stringify(NOTIF_SETTINGS_DEFAULT)); },

  _seededInbox() {
    const now  = Date.now();
    const seed = JSON.parse(JSON.stringify(NOTIF_INBOX_SEED));
    const offsets = [2, 8, 60, 180, 26 * 60, 28 * 60]; // minutes ago
    seed.forEach((n, i) => { n.timestamp = now - offsets[i] * 60 * 1000; });
    return seed;
  },

  save() {
    localStorage.setItem('sw_notif_settings', JSON.stringify(this._settings));
    localStorage.setItem('sw_notif_inbox',    JSON.stringify(this._inbox));
  },

  get channels()   { return this._settings.channels; },
  get events()     { return this._settings.events; },
  get quietHours() { return this._settings.quietHours; },
  get inbox()      { return this._inbox; },

  unreadCount() { return this._inbox.filter(n => !n.read).length; },

  markRead(id) {
    const n = this._inbox.find(n => n.id === id);
    if (n) { n.read = true; this.save(); }
  },

  markAllRead() {
    this._inbox.forEach(n => { n.read = true; });
    this.save();
  },

  toggleChannel(key) {
    this._settings.channels[key] = !this._settings.channels[key];
    this.save();
  },

  toggleEvent(key) {
    this._settings.events[key] = !this._settings.events[key];
    this.save();
  },

  toggleQuietHours() {
    this._settings.quietHours.enabled = !this._settings.quietHours.enabled;
    this.save();
  },
};

// ── SCREEN ──

const NotificationScreen = {
  _tab: 'inbox',

  init() {
    NotifState.load();
    this._tab = 'inbox';
    this.render();
  },

  render() {
    this._renderTabs();
    this._renderInbox();
    this._renderSettings();
    this._showPanel(this._tab);
    this._updateBadge();
  },

  switchTab(tab) {
    this._tab = tab;
    this._renderTabs();
    this._showPanel(tab);
  },

  _showPanel(tab) {
    const inbox    = document.getElementById('notif-inbox-panel');
    const settings = document.getElementById('notif-settings-panel');
    const markBtn  = document.getElementById('notif-mark-all-btn');
    if (inbox)    inbox.style.display    = tab === 'inbox'    ? '' : 'none';
    if (settings) settings.style.display = tab === 'settings' ? '' : 'none';
    if (markBtn)  markBtn.style.display  = tab === 'inbox'    ? 'block' : 'none';
  },

  // ── TABS ──

  _renderTabs() {
    const unread = NotifState.unreadCount();
    const inboxTab    = document.getElementById('ntab-inbox');
    const settingsTab = document.getElementById('ntab-settings');
    const bdg         = document.getElementById('notif-tab-badge');
    if (inboxTab)    inboxTab.className    = 'notif-tab' + (this._tab === 'inbox' ? ' active' : '');
    if (settingsTab) settingsTab.className = 'notif-tab' + (this._tab === 'settings' ? ' active' : '');
    if (bdg) {
      bdg.textContent  = unread > 9 ? '9+' : unread;
      bdg.style.display = unread > 0 ? 'inline-flex' : 'none';
    }
  },

  // ── INBOX ──

  _renderInbox() {
    const list = document.getElementById('notif-list');
    if (!list) return;
    const inbox = NotifState.inbox;

    if (!inbox.length) {
      list.innerHTML = `
        <div class="notif-empty">
          <div style="font-size:44px;margin-bottom:10px">🔕</div>
          <div class="notif-empty-title">All caught up!</div>
          <div class="notif-empty-sub">No notifications yet</div>
        </div>`;
      return;
    }

    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const yestStart  = new Date(todayStart); yestStart.setDate(yestStart.getDate() - 1);

    const groups = { Today: [], Yesterday: [], Earlier: [] };
    inbox.forEach(n => {
      if      (n.timestamp >= todayStart.getTime()) groups.Today.push(n);
      else if (n.timestamp >= yestStart.getTime())  groups.Yesterday.push(n);
      else                                           groups.Earlier.push(n);
    });

    let html = '';
    Object.entries(groups).forEach(([label, items]) => {
      if (!items.length) return;
      html += `<div class="notif-date-label">${label}</div>`;
      items.forEach(n => {
        html += `
          <div class="notif-item${n.read ? '' : ' unread'}" onclick="NotificationScreen.tapItem('${n.id}')">
            <div class="notif-item-icon" style="background:${n.iconBg}">${n.icon}</div>
            <div class="notif-item-body">
              <div class="notif-item-title">${n.title}</div>
              <div class="notif-item-text">${n.body}</div>
              <div class="notif-item-time">${n.relTime}</div>
            </div>
            ${!n.read ? '<div class="notif-unread-dot"></div>' : ''}
          </div>`;
      });
    });

    list.innerHTML = html;
  },

  tapItem(id) {
    NotifState.markRead(id);
    this._renderInbox();
    this._renderTabs();
    this._updateBadge();
  },

  markAllRead() {
    NotifState.markAllRead();
    this._renderInbox();
    this._renderTabs();
    this._updateBadge();
    UI.toast('✅ All notifications marked as read');
  },

  // ── SETTINGS ──

  _renderSettings() {
    const panel = document.getElementById('notif-settings-panel');
    if (!panel) return;
    const ch   = NotifState.channels;
    const ev   = NotifState.events;
    const qh   = NotifState.quietHours;
    const user = AppState.user;

    let pushStatusHtml;
    switch (NotifState.pushPermission) {
      case 'granted':
        pushStatusHtml = `<span class="notif-perm granted">✓ Enabled</span>`; break;
      case 'denied':
        pushStatusHtml = `<span class="notif-perm denied">Blocked — check browser settings</span>`; break;
      case 'unsupported':
        pushStatusHtml = `<span class="notif-perm denied">Not supported in this browser</span>`; break;
      default:
        pushStatusHtml = `<span class="notif-perm default">Tap to request permission</span>`;
    }

    panel.innerHTML = `
      <div style="padding:12px 13px 0">

        <div class="section-label">Channels</div>
        <div class="notif-ch-group">
          ${this._chCard('whatsapp', '💬', '#dcfce7', 'WhatsApp', user.phone, ch.whatsapp)}
          ${this._chCard('sms',      '📱', '#dbeafe', 'SMS',       user.phone, ch.sms)}
          ${this._chCard('email',    '📧', '#fef3c7', 'Email',     user.email, ch.email)}
          <div class="toggle-row notif-push-row">
            <div class="notif-ch-icon" style="background:#eff6ff">🔔</div>
            <div style="flex:1;min-width:0">
              <div class="toggle-label">Push notifications</div>
              <div class="toggle-sub">${pushStatusHtml}</div>
            </div>
            <div class="toggle${ch.push ? ' on' : ''}" onclick="NotificationScreen.toggleChannel('push')"></div>
          </div>
        </div>

        <div class="section-label" style="margin-top:6px">Notify me for</div>
        <div class="notif-ch-group">
          ${this._evRow('booking_confirmed', '✅', 'Booking confirmed',        ev.booking_confirmed)}
          ${this._evRow('center_accepted',   '🚗', 'Center accepted',          ev.center_accepted)}
          ${this._evRow('wash_started',      '💧', 'Wash started',             ev.wash_started)}
          ${this._evRow('wash_completed',    '✨', 'Wash completed',            ev.wash_completed)}
          ${this._evRow('reminder',          '⏰', 'Slot reminder (30 min)',    ev.reminder)}
          ${this._evRow('promos',            '🎁', 'Promotions & offers',       ev.promos)}
          ${this._evRow('new_centers',       '📍', 'New centers near me',       ev.new_centers)}
        </div>

        <div class="section-label" style="margin-top:6px">Quiet hours</div>
        <div class="notif-ch-group">
          <div class="toggle-row">
            <div style="flex:1">
              <div class="toggle-label">🌙 Do not disturb</div>
              <div class="toggle-sub">No notifications from 10 PM to 8 AM</div>
            </div>
            <div class="toggle${qh.enabled ? ' on' : ''}" onclick="NotificationScreen.toggleQuietHours()"></div>
          </div>
          ${qh.enabled ? `
          <div style="padding:0 0 10px;display:flex;gap:8px;align-items:center">
            <div class="notif-time-chip">🌙 From <strong>10:00 PM</strong></div>
            <span style="font-size:11px;color:var(--text-tertiary)">to</span>
            <div class="notif-time-chip">☀️ Until <strong>8:00 AM</strong></div>
          </div>` : ''}
        </div>

        <div style="height:16px"></div>
      </div>`;
  },

  _chCard(key, icon, iconBg, label, contact, isOn) {
    return `
      <div class="toggle-row">
        <div class="notif-ch-icon" style="background:${iconBg}">${icon}</div>
        <div style="flex:1;min-width:0">
          <div class="toggle-label">${label}</div>
          <div class="toggle-sub" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${contact || '—'}</div>
        </div>
        <div class="toggle${isOn ? ' on' : ''}" onclick="NotificationScreen.toggleChannel('${key}')"></div>
      </div>`;
  },

  _evRow(key, icon, label, isOn) {
    return `
      <div class="toggle-row">
        <div style="flex:1"><div class="toggle-label">${icon} ${label}</div></div>
        <div class="toggle${isOn ? ' on' : ''}" onclick="NotificationScreen.toggleEvent('${key}')"></div>
      </div>`;
  },

  // ── HANDLERS ──

  toggleChannel(key) {
    const turningOn = !NotifState.channels[key];
    NotifState.toggleChannel(key);
    if (key === 'push' && turningOn) {
      this._requestPushPermission();
      return;
    }
    const name = { whatsapp: 'WhatsApp', sms: 'SMS', email: 'Email', push: 'Push' }[key] || key;
    UI.toast(NotifState.channels[key] ? `✅ ${name} notifications on` : `🔕 ${name} notifications off`);
    this._renderSettings();
  },

  toggleEvent(key) {
    NotifState.toggleEvent(key);
    this._renderSettings();
  },

  toggleQuietHours() {
    NotifState.toggleQuietHours();
    this._renderSettings();
    UI.toast(NotifState.quietHours.enabled ? '🌙 Quiet hours enabled (10 PM – 8 AM)' : '🔔 Quiet hours disabled');
  },

  _requestPushPermission() {
    if (typeof Notification === 'undefined') {
      UI.toast('❌ Push notifications not supported here');
      NotifState._settings.channels.push = false;
      NotifState.save();
      this._renderSettings();
      return;
    }
    if (Notification.permission === 'denied') {
      UI.toast('❌ Blocked — please enable in browser/OS settings');
      NotifState._settings.channels.push = false;
      NotifState.save();
      this._renderSettings();
      return;
    }
    Notification.requestPermission().then(perm => {
      NotifState.pushPermission = perm;
      if (perm === 'granted') {
        UI.toast('✅ Push notifications enabled!');
        new Notification('SparkWash 🚗', {
          body: 'You\'ll now get booking updates, reminders & offers.',
        });
      } else {
        NotifState._settings.channels.push = false;
        NotifState.save();
        UI.toast('❌ Permission not granted');
      }
      this._renderSettings();
    });
  },

  // ── BELL BADGE (home screen) ──

  _updateBadge() {
    const count = NotifState.unreadCount();
    const badge = document.getElementById('hd-bell-badge');
    if (!badge) return;
    badge.textContent  = count > 9 ? '9+' : (count || '');
    badge.style.display = count > 0 ? 'flex' : 'none';
  },
};
