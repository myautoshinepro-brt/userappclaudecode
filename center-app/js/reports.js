// Pitbay Center App — reports.js
// Revenue Report screen: period filter (today/week/month/custom),
// hero stats, daily trend bar chart, wash-type & top-package breakdowns.

const RevenueScreen = {
  _period: 'week',         // today | week | month | custom
  _from:   null,
  _to:     null,
  _data:   null,

  PERIOD_LABEL: {
    today:  'Today',
    week:   'Last 7 days',
    month:  'Last 30 days',
    custom: 'Custom range',
  },

  async render() {
    if (!this._period) this._period = 'week';
    document.getElementById('rev-period-label').textContent = this.PERIOD_LABEL[this._period];
    await this._load();
  },

  async _load() {
    const el = document.getElementById('revenue-body');
    if (!el) return;
    el.innerHTML = '<div class="flex-center" style="padding:40px"><span class="spinner"></span></div>';

    let url = `/api/reports/revenue?period=${this._period}`;
    if (this._period === 'custom') {
      if (!this._from || !this._to) {
        const today = new Date().toISOString().slice(0, 10);
        const ago   = new Date(); ago.setDate(ago.getDate() - 6);
        this._from  = ago.toISOString().slice(0, 10);
        this._to    = today;
      }
      url += `&from=${this._from}&to=${this._to}`;
    }

    try {
      const res = await fetch(url, { headers: { Authorization: `Bearer ${AppState.token}` } });
      const ct  = res.headers.get('content-type') || '';
      if (!ct.includes('application/json')) {
        this._renderError(`Server returned ${res.status} (not JSON). Restart the server to load /api/reports.`);
        return;
      }
      const data = await res.json();
      if (!res.ok) { this._renderError(data.error || `Failed (${res.status})`); return; }

      this._data = data;
      this._from = data.from;
      this._to   = data.to;
      this._renderReport();
    } catch {
      this._renderError('Network error — is the server running?');
    }
  },

  _renderError(msg) {
    const el = document.getElementById('revenue-body');
    if (!el) return;
    el.innerHTML = `
      <div style="padding:40px 20px;text-align:center">
        <div style="font-size:38px;margin-bottom:8px">⚠️</div>
        <div style="font-size:14px;font-weight:700;color:var(--red);margin-bottom:6px">Couldn't load report</div>
        <div style="font-size:12px;color:var(--text-secondary);line-height:1.5;margin-bottom:16px">${this._esc(msg)}</div>
        <button class="btn btn-primary" onclick="RevenueScreen.render()">🔄 Retry</button>
      </div>`;
  },

  setPeriod(p) {
    this._period = p;
    if (p !== 'custom') { this._from = null; this._to = null; }
    document.getElementById('rev-period-label').textContent = this.PERIOD_LABEL[p];
    this._load();
  },

  applyCustom() {
    const f = document.getElementById('rev-from')?.value;
    const t = document.getElementById('rev-to')?.value;
    if (!f || !t) { UI.toast('Pick both dates'); return; }
    this._period = 'custom';
    this._from   = f;
    this._to     = t;
    this._load();
  },

  // ── Render ─────────────────────────────────────────────────

  _renderReport() {
    const el = document.getElementById('revenue-body');
    if (!el) return;
    const d = this._data;

    el.innerHTML = `
      ${this._chipsHtml()}
      ${this._period === 'custom' ? this._customDatesHtml() : ''}
      ${this._heroHtml(d)}
      ${this._statsGridHtml(d)}
      ${this._dailyChartHtml(d)}
      ${this._byWashTypeHtml(d)}
      ${this._topPackagesHtml(d)}
      ${this._cancellationsHtml(d)}
    `;
  },

  _chipsHtml() {
    const opts = [
      ['today', 'Today'],
      ['week',  '7 days'],
      ['month', '30 days'],
      ['custom','Custom'],
    ];
    return `
      <div style="display:flex;gap:6px;padding:12px 14px 6px;overflow-x:auto">
        ${opts.map(([k, label]) => {
          const active = this._period === k;
          return `<div onclick="RevenueScreen.setPeriod('${k}')"
                       style="flex-shrink:0;padding:7px 14px;border-radius:18px;border:1.5px solid ${active?'var(--navy)':'var(--border-medium)'};background:${active?'#e3f2fd':'#fff'};color:${active?'var(--navy)':'var(--text-primary)'};font-size:12px;font-weight:600;cursor:pointer">${label}</div>`;
        }).join('')}
      </div>`;
  },

  _customDatesHtml() {
    return `
      <div style="display:flex;gap:8px;padding:8px 14px;align-items:flex-end">
        <div style="flex:1">
          <div style="font-size:11px;color:var(--text-secondary);margin-bottom:4px">From</div>
          <input id="rev-from" class="input-field" type="date" value="${this._from || ''}" max="${new Date().toISOString().slice(0,10)}">
        </div>
        <div style="flex:1">
          <div style="font-size:11px;color:var(--text-secondary);margin-bottom:4px">To</div>
          <input id="rev-to" class="input-field" type="date" value="${this._to || ''}" max="${new Date().toISOString().slice(0,10)}">
        </div>
        <button class="btn btn-primary btn-sm" onclick="RevenueScreen.applyCustom()" style="height:42px">Go</button>
      </div>`;
  },

  _heroHtml(d) {
    const range = this._formatRange(d.from, d.to);
    return `
      <div style="margin:6px 14px 0;padding:18px;border-radius:var(--radius-md);background:linear-gradient(135deg,#1e40af 0%,#1a73e8 100%);color:#fff">
        <div style="font-size:11px;font-weight:600;opacity:.85;text-transform:uppercase;letter-spacing:.05em">💰 Total Revenue</div>
        <div style="font-size:32px;font-weight:900;line-height:1.1;margin-top:6px">${UI.formatPrice(d.total_revenue)}</div>
        <div style="font-size:12px;opacity:.85;margin-top:4px">
          ${d.completed_count} wash${d.completed_count !== 1 ? 'es' : ''} · ${range}
        </div>
      </div>`;
  },

  _statsGridHtml(d) {
    const cards = [
      { ico: '✨', label: 'Completed',     value: d.completed_count, sub: 'paid washes' },
      { ico: '💵', label: 'Avg / Wash',     value: UI.formatPrice(d.avg_per_wash), sub: 'per booking' },
      { ico: '❌', label: 'Cancelled',     value: d.cancelled_count, sub: UI.formatPrice(d.cancelled_value) + ' lost' },
      { ico: '⭐', label: 'Avg Rating',    value: d.avg_rating ? `${d.avg_rating} ★` : '—', sub: `${d.rated_count} rated` },
    ];
    return `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:12px 14px 4px">
        ${cards.map(c => `
          <div style="background:#fff;border:.5px solid var(--border-light);border-radius:var(--radius-md);padding:12px">
            <div style="font-size:18px">${c.ico}</div>
            <div style="font-size:18px;font-weight:800;margin-top:2px">${c.value}</div>
            <div style="font-size:11px;color:var(--text-secondary);font-weight:600">${c.label}</div>
            <div style="font-size:10px;color:var(--text-tertiary)">${c.sub}</div>
          </div>`).join('')}
      </div>`;
  },

  _dailyChartHtml(d) {
    const days = this._dateRange(d.from, d.to);
    const map  = {};
    for (const r of (d.daily || [])) map[r.date] = r;

    const series = days.map(date => ({ date, revenue: map[date]?.revenue || 0, count: map[date]?.count || 0 }));
    const max    = Math.max(1, ...series.map(s => s.revenue));

    if (series.length === 1) return '';

    const n          = series.length;
    const labelEvery = n <= 7 ? 1 : (n <= 14 ? 2 : Math.ceil(n / 7));
    const showVals   = n <= 14;
    const valFontSz  = n <= 7 ? '8px' : '7px';

    const fmt = v => {
      if (!v) return '';
      if (v >= 100000) return (v / 100000).toFixed(1) + 'L';
      if (v >= 1000)   return (v / 1000).toFixed(1) + 'k';
      return String(Math.round(v));
    };

    // SVG line chart points (viewBox 0 0 100 84)
    const linePts = series.map((s, i) => {
      const x = ((i + 0.5) / n * 100).toFixed(2);
      const h = max > 0 ? Math.max(s.revenue > 0 ? 4 : 0, (s.revenue / max) * 80) : 0;
      return `${x},${(84 - h).toFixed(2)}`;
    }).join(' ');

    const bars = series.map((s, i) => {
      const h         = max > 0 ? Math.max(s.revenue > 0 ? 4 : 0, (s.revenue / max) * 80) : 0;
      const showLabel = i % labelEvery === 0 || i === n - 1;
      const dt        = new Date(s.date + 'T00:00:00');
      const md        = `${dt.getDate()}/${dt.getMonth() + 1}`;
      const val       = showVals && s.revenue > 0 ? fmt(s.revenue) : '';
      const barBg     = s.revenue === 0 ? '#e0e7ff' : 'linear-gradient(180deg,#1a73e8,#1e40af)';
      return `
        <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;min-width:0;cursor:pointer"
             onmouseenter="RevenueScreen._tipShow(event,'${s.date}',${s.revenue},${s.count})"
             onmouseleave="RevenueScreen._tipHide()"
             onclick="RevenueScreen._tipShow(event,'${s.date}',${s.revenue},${s.count})">
          <div style="display:flex;align-items:flex-end;height:84px;width:100%;justify-content:center">
            <div style="width:78%;height:${h}px;background:${barBg};border-radius:4px 4px 0 0;position:relative">
              ${val ? `<div style="position:absolute;top:-13px;left:50%;transform:translateX(-50%);font-size:${valFontSz};font-weight:700;color:#1e40af;white-space:nowrap;pointer-events:none">${val}</div>` : ''}
            </div>
          </div>
          <div style="font-size:9px;color:var(--text-tertiary);${showLabel ? '' : 'visibility:hidden'}">${md}</div>
        </div>`;
    }).join('');

    return `
      <div style="margin:14px;padding:14px;background:#fff;border:.5px solid var(--border-light);border-radius:var(--radius-md)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <div style="font-size:13px;font-weight:700">📈 Daily Revenue</div>
          <div style="font-size:11px;color:var(--text-tertiary)">Peak: ${UI.formatPrice(max)}</div>
        </div>
        <div style="position:relative">
          <div style="display:flex;align-items:flex-end;gap:3px">${bars}</div>
          <svg viewBox="0 0 100 84" preserveAspectRatio="none"
               style="position:absolute;top:0;left:0;width:100%;height:84px;pointer-events:none;overflow:visible">
            <polyline points="${linePts}" fill="none" stroke="#f59e0b" stroke-width="2"
                      stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>
          </svg>
        </div>
        <div id="rev-tip"
             style="display:none;position:fixed;background:rgba(15,23,42,.93);color:#fff;padding:8px 12px;border-radius:8px;font-size:12px;pointer-events:none;z-index:9999;box-shadow:0 4px 16px rgba(0,0,0,.3);min-width:100px"></div>
      </div>`;
  },

  _tipShow(event, date, revenue, count) {
    const el = document.getElementById('rev-tip');
    if (!el) return;
    const M  = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const dt = new Date(date + 'T00:00:00');
    el.innerHTML = `
      <div style="font-size:10px;font-weight:600;opacity:.7;margin-bottom:2px">${dt.getDate()} ${M[dt.getMonth()]} ${dt.getFullYear()}</div>
      <div style="font-size:15px;font-weight:800">${UI.formatPrice(revenue)}</div>
      <div style="font-size:10px;opacity:.65;margin-top:1px">${count} wash${count !== 1 ? 'es' : ''}</div>`;
    el.style.display = 'block';
    const r  = event.currentTarget.getBoundingClientRect();
    const tw = 120;
    let x = r.left + r.width / 2 - tw / 2;
    let y = r.top - 78;
    if (x < 6) x = 6;
    if (x + tw > window.innerWidth - 6) x = window.innerWidth - tw - 6;
    if (y < 6) y = r.bottom + 8;
    el.style.left  = x + 'px';
    el.style.top   = y + 'px';
    el.style.width = tw + 'px';
  },

  _tipHide() {
    const el = document.getElementById('rev-tip');
    if (el) el.style.display = 'none';
  },

  _byWashTypeHtml(d) {
    if (!d.by_wash_type || d.by_wash_type.length === 0) return '';
    const max = Math.max(...d.by_wash_type.map(r => r.revenue));
    return `
      <div style="margin:6px 14px 0;padding:14px;background:#fff;border:.5px solid var(--border-light);border-radius:var(--radius-md)">
        <div style="font-size:13px;font-weight:700;margin-bottom:10px">🚿 Revenue by Wash Type</div>
        ${d.by_wash_type.map(r => {
          const pct = max > 0 ? Math.round((r.revenue / max) * 100) : 0;
          return `
            <div style="margin-bottom:10px">
              <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px">
                <span style="font-weight:600">${UI.washIcon(r.wash_type)} ${UI.washLabel(r.wash_type)}</span>
                <span style="color:var(--text-secondary)">${UI.formatPrice(r.revenue)} <span style="color:var(--text-tertiary)">· ${r.count}</span></span>
              </div>
              <div style="height:8px;background:#f5f5f5;border-radius:4px;overflow:hidden">
                <div style="width:${pct}%;height:100%;background:linear-gradient(90deg,#1a73e8,#1e40af);border-radius:4px"></div>
              </div>
            </div>`;
        }).join('')}
      </div>`;
  },

  _topPackagesHtml(d) {
    if (!d.by_package || d.by_package.length === 0) return '';
    return `
      <div style="margin:8px 14px 0;padding:14px;background:#fff;border:.5px solid var(--border-light);border-radius:var(--radius-md)">
        <div style="font-size:13px;font-weight:700;margin-bottom:10px">🏆 Top Packages</div>
        ${d.by_package.map((r, i) => `
          <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-top:${i===0?'none':'.5px solid var(--border-light)'}">
            <div style="width:22px;height:22px;border-radius:50%;background:${i<3?'#fff3e0':'#f5f5f5'};color:${i<3?'#e65100':'var(--text-secondary)'};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800">${i+1}</div>
            <div style="flex:1;min-width:0">
              <div style="font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${this._esc(r.package_name)}</div>
              <div style="font-size:11px;color:var(--text-secondary)">${UI.washIcon(r.wash_type)} ${UI.washLabel(r.wash_type)} · ${r.count} sold</div>
            </div>
            <div style="font-size:13px;font-weight:700;color:var(--navy)">${UI.formatPrice(r.revenue)}</div>
          </div>`).join('')}
      </div>`;
  },

  _cancellationsHtml(d) {
    if (d.total_bookings === 0) {
      return `
        <div style="margin:14px;padding:30px 20px;text-align:center;background:#fff;border:.5px solid var(--border-light);border-radius:var(--radius-md)">
          <div style="font-size:30px">📭</div>
          <div style="font-size:13px;font-weight:700;margin-top:6px">No bookings in this range</div>
          <div style="font-size:11px;color:var(--text-secondary);margin-top:4px">Try a wider period or check back after some washes are done.</div>
        </div>`;
    }
    if (d.cancelled_count === 0) return '';
    const rate = d.total_bookings > 0 ? Math.round((d.cancelled_count / d.total_bookings) * 100) : 0;
    return `
      <div style="margin:8px 14px 0;padding:12px 14px;background:#fff3e0;border-left:3px solid #ff9800;border-radius:8px">
        <div style="font-size:12px;font-weight:700;color:#e65100">⚠️ ${d.cancelled_count} cancelled (${rate}% of total)</div>
        <div style="font-size:11px;color:#6a4c00;margin-top:2px">${UI.formatPrice(d.cancelled_value)} in lost revenue</div>
      </div>`;
  },

  // ── Helpers ─────────────────────────────────────────────────

  _dateRange(fromIso, toIso) {
    const out = [];
    const cur = new Date(fromIso + 'T00:00:00');
    const end = new Date(toIso   + 'T00:00:00');
    while (cur <= end) {
      out.push(cur.toISOString().slice(0, 10));
      cur.setDate(cur.getDate() + 1);
    }
    return out.slice(0, 60);  // safety cap
  },

  _formatRange(fromIso, toIso) {
    if (fromIso === toIso) return UI.formatDate(fromIso);
    const f = new Date(fromIso);
    const t = new Date(toIso);
    const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${f.getDate()} ${M[f.getMonth()]} – ${t.getDate()} ${M[t.getMonth()]}`;
  },

  _esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  },
};
