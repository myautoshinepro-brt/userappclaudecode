// ============================================================
// Pitbay — pull-refresh.js
// Lightweight pull-to-refresh for any scroll container.
// Usage: PullRefresh.attach(scrollEl, async () => { /* refresh */ });
// ============================================================

const PullRefresh = (() => {
  const TRIGGER_DISTANCE = 70;   // px to trigger
  const MAX_PULL         = 120;  // visual clamp
  const RESIST           = 0.5;  // 1 = follow finger 1:1, <1 = "resistance"

  function _spinnerHTML() {
    return `
      <div class="ptr-spinner" style="
        position:absolute; top:-44px; left:50%;
        transform:translateX(-50%);
        width:32px; height:32px; border-radius:50%;
        background:#fff;
        box-shadow:0 2px 10px rgba(0,0,0,0.15);
        display:flex; align-items:center; justify-content:center;
        font-size:16px;
        opacity:0; transition:opacity .15s;
        pointer-events:none; z-index:5;
      ">
        <span class="ptr-icon" style="display:inline-block;transform:rotate(0deg);transition:transform .12s">↓</span>
      </div>`;
  }

  // Walk up from the touch target to confirm the gesture started inside the
  // scroll container we're listening on (so we don't fire on overlays).
  function _within(el, ancestor) {
    let n = el;
    while (n && n !== ancestor) n = n.parentNode;
    return n === ancestor;
  }

  function attach(scrollEl, onRefresh) {
    if (!scrollEl || scrollEl._ptrAttached) return;
    scrollEl._ptrAttached = true;

    // Inject the spinner relative to the scroll container.
    const wrap = document.createElement('div');
    wrap.innerHTML = _spinnerHTML();
    const spinner = wrap.firstElementChild;
    const icon    = spinner.querySelector('.ptr-icon');

    // The spinner needs a positioned ancestor; make sure we have one.
    const cs = getComputedStyle(scrollEl);
    if (cs.position === 'static') scrollEl.style.position = 'relative';
    scrollEl.appendChild(spinner);

    let startY = 0;
    let pulling = false;
    let refreshing = false;
    let lastDelta = 0;

    scrollEl.addEventListener('touchstart', (e) => {
      if (refreshing) return;
      // Only initiate when at the very top of the scroll container.
      if (scrollEl.scrollTop > 0) return;
      if (!_within(e.target, scrollEl)) return;
      startY  = e.touches[0].clientY;
      pulling = true;
      lastDelta = 0;
    }, { passive: true });

    scrollEl.addEventListener('touchmove', (e) => {
      if (!pulling || refreshing) return;
      const dy = e.touches[0].clientY - startY;
      if (dy <= 0) {
        // Finger moving up — cancel.
        _reset();
        return;
      }
      const clamped = Math.min(dy * RESIST, MAX_PULL);
      lastDelta = clamped;
      spinner.style.opacity   = String(Math.min(1, clamped / TRIGGER_DISTANCE));
      spinner.style.transform = `translateX(-50%) translateY(${clamped}px)`;
      icon.style.transform    = `rotate(${clamped >= TRIGGER_DISTANCE ? 180 : 0}deg)`;
    }, { passive: true });

    scrollEl.addEventListener('touchend', async () => {
      if (!pulling || refreshing) return;
      if (lastDelta >= TRIGGER_DISTANCE) {
        // Trigger refresh — hold spinner in place and switch to a spin animation.
        refreshing = true;
        icon.textContent = '⟳';
        icon.style.animation = 'ptr-spin 0.9s linear infinite';
        spinner.style.transform = `translateX(-50%) translateY(${TRIGGER_DISTANCE}px)`;
        try {
          await Promise.resolve(onRefresh());
        } catch (e) {
          console.warn('PullRefresh handler threw:', e);
        }
        // Settle.
        icon.style.animation = '';
        icon.textContent = '↓';
        _reset();
        refreshing = false;
      } else {
        _reset();
      }
      pulling = false;
    }, { passive: true });

    function _reset() {
      spinner.style.transition = 'opacity .2s, transform .2s';
      spinner.style.opacity = '0';
      spinner.style.transform = 'translateX(-50%) translateY(-44px)';
      setTimeout(() => { spinner.style.transition = ''; }, 260);
    }
  }

  // CSS keyframe (injected once on module load).
  if (typeof document !== 'undefined' && !document.getElementById('ptr-style')) {
    const s = document.createElement('style');
    s.id = 'ptr-style';
    s.textContent = '@keyframes ptr-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }';
    document.head.appendChild(s);
  }

  return { attach };
})();
