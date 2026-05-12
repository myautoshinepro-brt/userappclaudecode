// ============================================================
// SparkWash — help.js
// Help screen (call sheet) + Chat screen
// ============================================================

const SUPPORT_NUMBERS = [
  {
    label:   'Toll-free helpline',
    number:  '18005720001',
    display: '1800-572-0001',
    sub:     'Free call · Mon–Sat, 9 AM – 8 PM',
    icon:    '📞',
    color:   '#dbeafe',
    isWA:    false,
  },
  {
    label:   'WhatsApp support',
    number:  '919810000001',
    display: '+91 98100 00001',
    sub:     'Message or call anytime · usually replies in 5 min',
    icon:    '💬',
    color:   '#dcfce7',
    isWA:    true,
  },
  {
    label:   'Direct mobile',
    number:  '919810000002',
    display: '+91 98100 00002',
    sub:     'Mon–Sat, 9 AM – 6 PM',
    icon:    '📱',
    color:   '#fef9c3',
    isWA:    false,
  },
];

// ── HELP SCREEN ──

const HelpScreen = {

  openCallSheet() {
    const overlay = document.getElementById('call-sheet-overlay');
    if (!overlay) return;
    overlay.style.display = 'flex';
    requestAnimationFrame(() => overlay.classList.add('show'));
  },

  closeCallSheet() {
    const overlay = document.getElementById('call-sheet-overlay');
    if (!overlay) return;
    overlay.classList.remove('show');
    setTimeout(() => { overlay.style.display = 'none'; }, 300);
  },

  dial(number) {
    window.location.href = 'tel:' + number;
  },

  openWhatsApp(number) {
    const msg = encodeURIComponent('Hi SparkWash Support! I need help with my booking.');
    window.open('https://wa.me/' + number + '?text=' + msg, '_blank');
  },

  openEmail() {
    window.location.href = 'mailto:support@sparkwash.in?subject=Help%20Request&body=Hi%20SparkWash%20Team%2C%0A%0A';
  },

  toggleFaq(el) {
    const ans = el.querySelector('.help-faq-a');
    const isOpen = el.classList.contains('open');
    // Close all
    document.querySelectorAll('.help-faq-item.open').forEach(item => {
      item.classList.remove('open');
      item.querySelector('.help-faq-a').style.maxHeight = '0';
    });
    if (!isOpen) {
      el.classList.add('open');
      ans.style.maxHeight = ans.scrollHeight + 'px';
    }
  },
};

// ── CHAT SCREEN (real-time via polling against /api/chat) ──

const ChatScreen = {
  _thread:        null,
  _messages:      [],
  _lastMessageId: 0,
  _pollHandle:    null,
  _pollMs:        4000,
  _pendingType:   'general',
  _pendingBookingRef: null,

  // Called by Help screen "Chat with support" button.
  openGeneral() {
    this._pendingType = 'general';
    this._pendingBookingRef = null;
    Router.go('chat');
  },

  // Called from a booking card; auto-attaches the booking ref.
  openForBooking(bookingRef) {
    if (!bookingRef) return;
    this._pendingType = 'booking';
    this._pendingBookingRef = bookingRef;
    Router.go('chat');
  },

  // Router calls this on chat-screen entry.
  async init() {
    this._messages = [];
    this._lastMessageId = 0;
    this._renderMessages([]);
    this._setHeader(this._pendingType, this._pendingBookingRef);

    const wrap = document.getElementById('chat-messages');
    if (wrap) wrap.innerHTML = `<div style="padding:24px;text-align:center;color:var(--text-secondary);font-size:11px">Connecting to support…</div>`;

    try {
      // Idempotent: returns existing thread for this customer + booking_ref, else creates.
      const r = await fetch('/api/chat/threads', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (Auth.getToken() || '') },
        body:    JSON.stringify({
          type:        this._pendingType,
          booking_ref: this._pendingBookingRef || undefined,
        }),
      });
      const j = await r.json();
      if (!r.ok || !j.success) throw new Error(j.error || 'Could not open chat');
      this._thread = j.data;

      await this._loadMessages();
      await this._markRead();
      this._startPolling();
      document.getElementById('chat-input')?.focus();
    } catch (e) {
      console.warn('Chat init failed:', e);
      const errWrap = document.getElementById('chat-messages');
      if (errWrap) errWrap.innerHTML = `<div style="padding:24px;text-align:center;color:var(--red);font-size:11px">Could not open chat: ${e.message}</div>`;
    }
  },

  // Router calls this on chat-screen leave.
  destroy() {
    this._stopPolling();
    this._thread = null;
  },

  _setHeader(type, bookingRef) {
    const name = document.getElementById('chat-header-name');
    const sub  = document.getElementById('chat-header-sub');
    if (name) name.textContent = 'SparkWash Support';
    if (sub)  sub.textContent  = type === 'booking' ? `About booking ${bookingRef}` : 'General support';
  },

  async _loadMessages() {
    if (!this._thread) return;
    const r = await fetch('/api/chat/threads/' + this._thread.id + '/messages', {
      headers: { Authorization: 'Bearer ' + (Auth.getToken() || '') },
    });
    const j = await r.json();
    if (!r.ok || !j.success) return;
    this._messages = j.data;
    this._lastMessageId = this._messages.length ? this._messages[this._messages.length - 1].id : 0;
    this._renderMessages(this._messages);
    this._scrollBottom(true);
  },

  async _markRead() {
    if (!this._thread) return;
    try {
      await fetch('/api/chat/threads/' + this._thread.id + '/read', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + (Auth.getToken() || '') },
      });
    } catch { /* non-critical */ }
  },

  _startPolling() {
    this._stopPolling();
    this._pollHandle = setInterval(() => this._poll(), this._pollMs);
  },
  _stopPolling() {
    if (this._pollHandle) clearInterval(this._pollHandle);
    this._pollHandle = null;
  },

  async _poll() {
    if (!this._thread) return;
    try {
      const r = await fetch('/api/chat/threads/' + this._thread.id + '/messages', {
        headers: { Authorization: 'Bearer ' + (Auth.getToken() || '') },
      });
      const j = await r.json();
      if (!r.ok || !j.success) return;
      const fresh = j.data.filter(m => m.id > this._lastMessageId);
      if (fresh.length) {
        fresh.forEach(m => this._appendBubble(m));
        this._lastMessageId = fresh[fresh.length - 1].id;
        this._scrollBottom();
        this._markRead();
      }
    } catch { /* silent — next tick will retry */ }
  },

  async send() {
    const input = document.getElementById('chat-input');
    const text  = input?.value.trim();
    if (!text || !this._thread) return;
    input.value = '';

    // Optimistic render. Re-poll will get the canonical row.
    const optimistic = {
      id: Date.now(), thread_id: this._thread.id, sender: 'customer',
      text, created_at: new Date().toISOString(),
    };
    this._appendBubble(optimistic);
    this._scrollBottom();

    try {
      const r = await fetch('/api/chat/threads/' + this._thread.id + '/messages', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (Auth.getToken() || '') },
        body:    JSON.stringify({ text }),
      });
      const j = await r.json();
      if (!r.ok || !j.success) throw new Error(j.error || 'Send failed');
      if (j.data && j.data.id) this._lastMessageId = Math.max(this._lastMessageId, j.data.id);
    } catch (e) {
      UI.toast('❌ ' + e.message);
    }
  },

  handleKeyup(e) {
    if (e.key === 'Enter') this.send();
  },

  // sendQuick is still wired in the HTML — same path as typing the text.
  async sendQuick(text) {
    const input = document.getElementById('chat-input');
    if (input) input.value = text;
    const qw = document.getElementById('chat-quick-wrap');
    if (qw) qw.style.display = 'none';
    return this.send();
  },

  _renderMessages(list) {
    const wrap = document.getElementById('chat-messages');
    if (!wrap) return;
    wrap.innerHTML = list.map(m => this._bubbleHTML(m)).join('') || '';
    const qw = document.getElementById('chat-quick-wrap');
    if (qw) qw.style.display = list.some(m => m.sender === 'customer') ? 'none' : 'flex';
  },

  _appendBubble(m) {
    const wrap = document.getElementById('chat-messages');
    if (!wrap) return;
    wrap.insertAdjacentHTML('beforeend', this._bubbleHTML(m));
    const qw = document.getElementById('chat-quick-wrap');
    if (qw && m.sender === 'customer') qw.style.display = 'none';
  },

  _bubbleHTML(m) {
    if (m.sender === 'system') {
      return `<div style="text-align:center;font-size:10px;color:var(--text-tertiary);margin:8px 0">${this._escHTML(m.text)}</div>`;
    }
    const isUser = m.sender === 'customer';
    return `
      <div class="chat-row ${isUser ? 'chat-row-user' : 'chat-row-admin'}">
        ${!isUser ? `<div class="chat-avatar-sm">SW</div>` : ''}
        <div class="chat-bubble ${isUser ? 'chat-bubble-user' : 'chat-bubble-admin'}">
          <div class="chat-bubble-text">${this._escHTML(m.text)}</div>
          <div class="chat-bubble-meta">${this._formatTime(m.created_at)}${isUser ? ' <span class="chat-ticks">✓✓</span>' : ''}</div>
        </div>
      </div>`;
  },

  _formatTime(iso) {
    const d = new Date(String(iso || '').replace(' ', 'T') + (iso && iso.endsWith('Z') ? '' : 'Z'));
    if (isNaN(d)) return '';
    return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
  },

  _escHTML(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  },

  _scrollBottom(instant) {
    const wrap = document.getElementById('chat-messages');
    if (!wrap) return;
    setTimeout(() => { wrap.scrollTop = wrap.scrollHeight; }, instant ? 0 : 60);
  },
};
