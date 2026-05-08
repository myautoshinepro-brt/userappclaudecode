// SparkWash Center App — ui.js

const UI = {
  _toastTimer: null,

  toast(msg, duration = 2400) {
    let el = document.getElementById('toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast';
      el.className = 'toast';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => el.classList.remove('show'), duration);
  },

  setLoading(btnEl, loading) {
    if (!btnEl) return;
    if (loading) {
      btnEl._orig = btnEl.innerHTML;
      btnEl.disabled = true;
      btnEl.innerHTML = '<span class="spinner"></span>';
    } else {
      btnEl.disabled = false;
      btnEl.innerHTML = btnEl._orig || btnEl.innerHTML;
    }
  },

  badge(status) {
    const m = STATUS_META[status] || { label: status, badge: 'badge-new', icon: '' };
    return `<span class="badge ${m.badge}">${m.icon} ${m.label}</span>`;
  },

  washIcon(type) {
    return (WASH_LABELS[type] || {}).icon || '🚿';
  },

  washLabel(type) {
    return (WASH_LABELS[type] || {}).label || type;
  },

  formatPrice(p) {
    return '₹' + Number(p).toLocaleString('en-IN');
  },

  formatDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    return `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  },
};
