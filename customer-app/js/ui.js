// ============================================================
// SparkWash — ui.js
// Shared UI utilities: toast, AT banner, helpers
// ============================================================

const UI = {
  _toastTimer: null,
  _atTimer: null,

  toast(msg) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
  },

  showAT(msg) {
    const el = document.getElementById('at-banner');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('on');
    clearTimeout(this._atTimer);
    this._atTimer = setTimeout(() => el.classList.remove('on'), 2000);
  },
};

// ── DOM HELPERS ──

function _setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function _show(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'block';
}

function _hide(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'none';
}

function _showFlex(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'flex';
}
