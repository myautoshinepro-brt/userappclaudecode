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

// ── CHAT SCREEN ──

const CHAT_AUTO_REPLIES = [
  { match: /\bbook(ing)?\b/i,         reply: "Sure! Could you share your booking ID? It starts with #SW." },
  { match: /cancel/i,                  reply: "To cancel: go to My Bookings → tap your booking → Cancel. Refunds arrive in 3–5 business days to your original payment method." },
  { match: /pay|refund|money|charge/i, reply: "For payment issues, please share your booking ID and the amount deducted. I'll check it right away! 🔍" },
  { match: /promo|code|discount|offer/i, reply: "Promo codes can be applied on the booking summary screen before confirming payment. Which code are you trying? 🎁" },
  { match: /vehicle|car|bike/i,        reply: "You can manage your vehicles under Profile → My Vehicles. Want help adding or editing one?" },
  { match: /wash|service|package/i,    reply: "We offer Water Wash, Dry Wash, Steam Wash, and Door-to-Door service. Which one can I tell you more about? 💧" },
  { match: /center|centre|location/i,  reply: "We have centers across Andheri, Bandra, Juhu, and Malad. Use the home screen to find the nearest one. 📍" },
  { match: /slot|time|schedule/i,      reply: "Slots can be changed from My Bookings → Manage → Modify. Would you like help with that?" },
  { match: /hello|hi\b|hey\b/i,        reply: "Hello! 😊 Happy to help. What's your query today?" },
  { match: /thank/i,                   reply: "You're welcome! 😊 Is there anything else I can help you with?" },
  { match: /bye|done|ok\s*$|okay/i,    reply: "Great! Have a sparkling clean ride! 🚗✨ Feel free to reach out anytime." },
];

const CHAT_DEFAULT_REPLIES = [
  "Let me check that for you! Give me a moment. 🔍",
  "I understand. Could you provide more details so I can assist better?",
  "Thanks for reaching out! I'll look into this for you.",
  "Got it! I'm pulling up the details now. 📋",
  "Sure thing! Our team typically resolves this within a few hours.",
];

const ChatScreen = {
  _messages: [],
  _msgCounter: 10,
  _storageKey: 'sw_chat_history',

  init() {
    this._load();
    this._renderMessages();
    this._scrollBottom(true);
    document.getElementById('chat-input')?.focus();
  },

  _load() {
    try {
      const saved = localStorage.getItem(this._storageKey);
      if (saved) {
        this._messages = JSON.parse(saved);
        this._msgCounter = this._messages.length + 10;
        return;
      }
    } catch { /* ignore */ }
    // Seed initial admin greeting
    const t = this._now();
    this._messages = [
      { id: 'm1', from: 'admin', text: 'Hi ' + (AppState.user.name?.split(' ')[0] || 'there') + '! 👋 Welcome to SparkWash Support.', time: t },
      { id: 'm2', from: 'admin', text: 'How can I help you today? You can ask about bookings, payments, refunds, or anything else.', time: t },
    ];
    this._save();
  },

  _save() {
    try { localStorage.setItem(this._storageKey, JSON.stringify(this._messages)); } catch { /* ignore */ }
  },

  clearHistory() {
    localStorage.removeItem(this._storageKey);
    this._messages = [];
    this._msgCounter = 10;
    this.init();
  },

  _now() {
    const d = new Date();
    return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
  },

  // ── SENDING ──

  send() {
    const input = document.getElementById('chat-input');
    const text  = input?.value.trim();
    if (!text) return;
    input.value = '';
    this._addMsg('user', text);
    this._scheduleReply(text);
  },

  sendQuick(text) {
    const qw = document.getElementById('chat-quick-wrap');
    if (qw) qw.style.display = 'none';
    this._addMsg('user', text);
    this._scheduleReply(text);
  },

  handleKeyup(e) {
    if (e.key === 'Enter') this.send();
  },

  _scheduleReply(userText) {
    // Show typing bubble
    const wrap = document.getElementById('chat-messages');
    if (wrap) {
      wrap.insertAdjacentHTML('beforeend', this._typingHTML());
      this._scrollBottom();
    }
    const delay = 900 + Math.random() * 900;
    setTimeout(() => {
      document.getElementById('chat-typing-indicator')?.remove();
      this._addMsg('admin', this._autoReply(userText));
    }, delay);
  },

  _autoReply(text) {
    for (const r of CHAT_AUTO_REPLIES) {
      if (r.match.test(text)) return r.reply;
    }
    return CHAT_DEFAULT_REPLIES[Math.floor(Math.random() * CHAT_DEFAULT_REPLIES.length)];
  },

  _addMsg(from, text) {
    const msg = { id: 'm' + (++this._msgCounter), from, text, time: this._now() };
    this._messages.push(msg);
    this._save();

    const wrap = document.getElementById('chat-messages');
    if (wrap) {
      wrap.insertAdjacentHTML('beforeend', this._bubbleHTML(msg));
      // hide quick replies once user sends anything
      if (from === 'user') {
        const qw = document.getElementById('chat-quick-wrap');
        if (qw) qw.style.display = 'none';
      }
      this._scrollBottom();
    }
  },

  // ── RENDER ──

  _renderMessages() {
    const wrap = document.getElementById('chat-messages');
    if (!wrap) return;
    wrap.innerHTML = this._messages.map(m => this._bubbleHTML(m)).join('');
    // Show quick replies only if user hasn't typed yet
    const qw = document.getElementById('chat-quick-wrap');
    const userSent = this._messages.some(m => m.from === 'user');
    if (qw) qw.style.display = userSent ? 'none' : 'flex';
  },

  _bubbleHTML(m) {
    const isUser = m.from === 'user';
    return `
      <div class="chat-row ${isUser ? 'chat-row-user' : 'chat-row-admin'}">
        ${!isUser ? `<div class="chat-avatar-sm">SW</div>` : ''}
        <div class="chat-bubble ${isUser ? 'chat-bubble-user' : 'chat-bubble-admin'}">
          <div class="chat-bubble-text">${this._escHTML(m.text)}</div>
          <div class="chat-bubble-meta">${m.time}${isUser ? ' <span class="chat-ticks">✓✓</span>' : ''}</div>
        </div>
      </div>`;
  },

  _typingHTML() {
    return `
      <div class="chat-row chat-row-admin" id="chat-typing-indicator">
        <div class="chat-avatar-sm">SW</div>
        <div class="chat-bubble chat-bubble-admin chat-typing">
          <span class="chat-dot"></span><span class="chat-dot"></span><span class="chat-dot"></span>
        </div>
      </div>`;
  },

  _escHTML(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  },

  _scrollBottom(instant) {
    const wrap = document.getElementById('chat-messages');
    if (!wrap) return;
    setTimeout(() => { wrap.scrollTop = wrap.scrollHeight; }, instant ? 0 : 60);
  },
};
