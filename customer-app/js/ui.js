// ============================================================
// Pitbay — ui.js
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

// Inline "Couldn't load — Retry" block for list screens whose data fetch
// failed. Pass an onRetry expression as a string of JS to run on click.
function _loadErrorHTML(message, onRetry) {
  return `
    <div style="padding:28px 20px;text-align:center">
      <div style="font-size:28px;margin-bottom:8px">⚠️</div>
      <div style="font-size:12px;font-weight:700;color:var(--text-primary);margin-bottom:4px">Couldn't load</div>
      <div style="font-size:11px;color:var(--text-secondary);margin-bottom:14px">${message || 'Network problem'}</div>
      <button onclick="${onRetry}" style="padding:8px 18px;background:var(--blue);color:#fff;border:none;border-radius:20px;font-size:12px;font-weight:700;cursor:pointer">Try again</button>
    </div>`;
}

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
