// ============================================================
// SparkWash — home.js
// Home screen: search, filter chips, mini-map, center cards
// ============================================================

const HomeScreen = {
  searchTimer: null,

  init() {
    this.renderCenterCards(CENTERS);
    this.bindSearch();
    this.bindFilterChips();
    this._updateGreeting();
  },

  _updateGreeting() {
    const el = document.getElementById('hd-greeting');
    if (!el) return;
    const h    = new Date().getHours();
    const time = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
    const firstName = (AppState.user.name || '').trim().split(' ')[0];
    const greeting  = firstName ? `${time}, ${firstName}` : time;
    el.innerHTML = `${greeting} <span class="wave">👋</span>`;
  },

  // ── CENTER CARDS ──

  renderCenterCards(centers) {
    const container = document.getElementById('center-cards');
    const noResults = document.getElementById('no-results');
    if (!container) return;

    container.innerHTML = centers.map(c => this._centerCardHTML(c)).join('');
    noResults.style.display = centers.length === 0 ? 'block' : 'none';

    document.getElementById('results-count').textContent = `${centers.length} found`;
    document.getElementById('results-title').textContent = 'Nearby centers';
  },

  _centerCardHTML(c) {
    const statusBadge = c.isD2DOnly
      ? `<span class="badge badge-d2d">Door-to-door</span>`
      : c.open
        ? `<span class="badge badge-open">Open</span>`
        : `<span class="badge badge-closed">Closed</span>`;

    const distText = c.isD2DOnly ? '🏠 Comes to you' : `📍 ${c.distance} km`;
    const tags = c.tags.map(t => `<span class="wash-tag">${t.charAt(0).toUpperCase() + t.slice(1)}${t === 'd2d' ? ' ✓' : ''}</span>`).join('');

    return `
      <div class="center-card"
           data-id="${c.id}"
           data-name="${c.name}"
           data-tags="${c.tags.join(' ')}"
           data-dist="${c.distance}"
           data-rating="${c.rating}"
           data-open="${c.open ? '1' : '0'}"
           data-d2d="${c.hasD2D ? '1' : '0'}"
           data-steam="${c.hasSteam ? '1' : '0'}"
           onclick="HomeScreen.openCenter('${c.id}')">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px">
          <div class="center-name">${c.name}</div>
          ${statusBadge}
        </div>
        <div class="center-meta">
          <span class="center-meta-item"><span style="color:var(--gold)">★</span>${c.rating} (${c.reviews})</span>
          <span class="center-meta-item">${distText}</span>
          <span class="center-meta-item">from ₹${c.priceFrom}</span>
        </div>
        <div style="display:flex;gap:4px;flex-wrap:wrap">${tags}</div>
      </div>`;
  },

  openCenter(centerId) {
    const center = CENTERS.find(c => c.id === centerId);
    if (!center) return;
    AppState.booking.centerId = center.id;
    AppState.booking.centerName = center.name;
    AppState.booking.packageId = null;
    if (typeof DetailScreen !== 'undefined') DetailScreen.init(center);
    Router.go('detail');
  },

  // ── SEARCH ──

  bindSearch() {
    const input = document.getElementById('search-input');
    const clearBtn = document.getElementById('search-clear');
    if (!input) return;

    input.addEventListener('input', () => {
      clearBtn.style.display = input.value ? 'block' : 'none';
      clearTimeout(this.searchTimer);
      this.searchTimer = setTimeout(() => {
        this._showDropdown(input.value);
        this._filterCards(input.value);
      }, 120);
    });

    input.addEventListener('focus', () => {
      if (!input.value) this._showDefaultDropdown();
      else this._showDropdown(input.value);
    });

    document.addEventListener('click', e => {
      if (!document.querySelector('.search-wrap')?.contains(e.target)) {
        document.getElementById('search-dropdown').style.display = 'none';
      }
    });
  },

  clearSearch() {
    document.getElementById('search-input').value = '';
    document.getElementById('search-clear').style.display = 'none';
    document.getElementById('search-dropdown').style.display = 'none';
    this._filterCards('');
    // Reset all filter chips to 'All'
    document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    document.querySelector('.filter-chip[data-filter="all"]')?.classList.add('active');
    document.getElementById('results-title').textContent = 'Nearby centers';
    document.getElementById('results-count').textContent = '5 found';
  },

  _showDefaultDropdown() {
    const d = document.getElementById('search-dropdown');
    d.innerHTML = `
      <div style="padding:6px 13px 2px;font-size:10px;font-weight:700;color:var(--text-tertiary);text-transform:uppercase;background:var(--bg-secondary)">Recent</div>
      <div class="dropdown-item" onmousedown="HomeScreen.selectCenter('Shine Auto Wash','c1')">
        <span>🕐</span><div><div>Shine Auto Wash</div><div style="font-size:10px;color:var(--text-secondary);margin-top:1px">Andheri West · Last visited</div></div>
      </div>
      <div style="padding:6px 13px 2px;font-size:10px;font-weight:700;color:var(--text-tertiary);text-transform:uppercase;background:var(--bg-secondary)">Quick filters</div>
      <div class="dropdown-item" onmousedown="HomeScreen.quickFilter('d2d')"><span>🚗</span><div><div>Door-to-door service</div><div style="font-size:10px;color:var(--text-secondary);margin-top:1px">3 available now</div></div></div>
      <div class="dropdown-item" onmousedown="HomeScreen.quickFilter('steam')"><span>💨</span><div><div>Steam wash near me</div><div style="font-size:10px;color:var(--text-secondary);margin-top:1px">2 centers</div></div></div>
      <div class="dropdown-item" onmousedown="HomeScreen.quickFilter('open')"><span>🟢</span><div><div>Open right now</div><div style="font-size:10px;color:var(--text-secondary);margin-top:1px">4 open</div></div></div>`;
    d.style.display = 'block';
  },

  _showDropdown(val) {
    const d = document.getElementById('search-dropdown');
    if (!val) { this._showDefaultDropdown(); return; }
    const q = val.toLowerCase();
    const matched = CENTERS.filter(c =>
      (c.name + ' ' + c.area + ' ' + c.tags.join(' ')).toLowerCase().includes(q)
    );
    if (!matched.length) {
      d.innerHTML = `<div style="padding:14px 13px;text-align:center;font-size:12px;color:var(--text-secondary)">😕 No results for "<b>${val}</b>"</div>`;
      d.style.display = 'block'; return;
    }
    const hlRe = new RegExp(val.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    d.innerHTML = `<div style="padding:6px 13px 2px;font-size:10px;font-weight:700;color:var(--text-tertiary);text-transform:uppercase;background:var(--bg-secondary)">Centers (${matched.length})</div>`
      + matched.map(c => `
        <div class="dropdown-item" onmousedown="HomeScreen.selectCenter('${c.name}','${c.id}')">
          <span>🚗</span>
          <div style="flex:1">
            <div>${c.name.replace(hlRe, m => `<span class="search-hl">${m}</span>`)}</div>
            <div style="font-size:10px;color:var(--text-secondary);margin-top:1px">${c.area}</div>
          </div>
          <span style="font-size:9px;font-weight:700;color:${c.open ? '#2e7d32' : '#c62828'}">${c.open ? 'Open' : 'Closed'}</span>
        </div>`).join('');
    d.style.display = 'block';
  },

  selectCenter(name, id) {
    document.getElementById('search-input').value = name;
    document.getElementById('search-clear').style.display = 'block';
    document.getElementById('search-dropdown').style.display = 'none';
    this._filterCards(name);
    setTimeout(() => this.openCenter(id), 80);
  },

  quickFilter(filterKey) {
    this.clearSearch();
    const chip = document.querySelector(`.filter-chip[data-filter="${filterKey}"]`);
    if (chip) this.applyFilter(chip, filterKey);
  },

  _filterCards(query) {
    let visible = 0;
    document.querySelectorAll('.center-card').forEach(card => {
      const match = !query || (card.dataset.name + ' ' + card.dataset.tags).toLowerCase().includes(query.toLowerCase());
      card.classList.toggle('hidden', !match);
      if (match) visible++;
    });
    document.getElementById('results-count').textContent = `${visible} found`;
    document.getElementById('results-title').textContent = query ? 'Search results' : 'Nearby centers';
    document.getElementById('no-results').style.display = visible === 0 ? 'block' : 'none';
    if (query) document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
  },

  // ── FILTER CHIPS ──

  bindFilterChips() {
    document.querySelectorAll('.filter-chip').forEach(chip => {
      chip.addEventListener('click', () => this.applyFilter(chip, chip.dataset.filter));
    });
  },

  applyFilter(chip, filter) {
    document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    chip?.classList.add('active');
    this.clearSearch();

    let filtered = [...CENTERS];
    const titles = {
      all: 'Nearby centers', nearest: 'Nearest first',
      toprated: 'Top rated', d2d: 'Door-to-door',
      open: 'Open now', steam: 'Steam wash',
    };

    switch (filter) {
      case 'nearest':  filtered = filtered.filter(c => c.distance <= 2 || c.hasD2D).sort((a, b) => a.distance - b.distance); break;
      case 'toprated': filtered = filtered.filter(c => c.rating >= 4.6).sort((a, b) => b.rating - a.rating); break;
      case 'd2d':      filtered = filtered.filter(c => c.hasD2D); break;
      case 'open':     filtered = filtered.filter(c => c.open); break;
      case 'steam':    filtered = filtered.filter(c => c.hasSteam); break;
    }

    // Re-order DOM
    const container = document.getElementById('center-cards');
    container.innerHTML = '';
    filtered.forEach(c => { container.innerHTML += this._centerCardHTML(c); });

    document.getElementById('results-title').textContent = titles[filter] || 'Centers';
    document.getElementById('results-count').textContent = `${filtered.length} found`;
    document.getElementById('no-results').style.display = filtered.length === 0 ? 'block' : 'none';
  },
};
