/**
 * shared/components.js
 * ─────────────────────────────────────────────
 * Injects shared UI components (nav, header, loader)
 * into every page and provides reusable table + chart builders.
 *
 * Usage in each page HTML:
 *   COMPONENTS.init('fo');   // pass the active nav id
 */

const COMPONENTS = (() => {

  // ─── NAV INJECTION ───────────────────────────────────────────────────────────
  function buildNav(activeId) {
    const items = CONFIG.NAV_ITEMS.map(item => {
      const isActive = item.id === activeId;
      // Compute relative path from current location to nav target
      return `
        <a class="nav-item ${isActive ? 'active' : ''}" href="${item.path}" data-id="${item.id}">
          <span class="nav-icon">${item.icon}</span>
          <span class="nav-label">${item.label}</span>
          <span class="nav-badge" id="badge-${item.id}"></span>
        </a>`;
    }).join('');

    return `
      <aside id="sidebar">
        <div class="logo-area">
          <div class="logo-mark">Portfolio · Tracker</div>
          <div class="logo-name">F<em>Tracker</em></div>
        </div>
        <nav class="nav-section">
          <div class="nav-group-label">Overview</div>
          ${items}
        </nav>
        <div class="sidebar-footer">
          <div class="conn-status">
            <div class="conn-dot" id="connDot"></div>
            <span id="connText">Connecting…</span>
          </div>
          <button class="btn-sync" id="refreshBtn" onclick="COMPONENTS.refresh()">↻</button>
        </div>
      </aside>
      <div id="overlay" onclick="COMPONENTS.closeSidebar()"></div>`;
  }

  function buildHeader(title) {
    return `
      <header id="topbar">
        <div class="topbar-left">
          <button class="hamburger" onclick="COMPONENTS.openSidebar()" aria-label="Menu">
            <span></span><span></span><span></span>
          </button>
          <div id="pageTitle">${title}</div>
        </div>
        <div class="topbar-right">
          <span id="lastSync"></span>
        </div>
      </header>`;
  }

  function buildLoader() {
    return `
      <div id="globalLoader">
        <div class="loader-logo">FTracker</div>
        <div class="loader-bar"><div class="loader-fill"></div></div>
        <div class="loader-msg" id="loaderMsg">Loading…</div>
      </div>`;
  }

  // ── inject into DOM ──────────────────────────
  function inject(activeId, pageTitle) {
    // Loader
    document.body.insertAdjacentHTML('afterbegin', buildLoader());
    // Nav + overlay
    document.getElementById('nav-placeholder').innerHTML = buildNav(activeId);
    // Header
    document.getElementById('header-placeholder').innerHTML = buildHeader(pageTitle);
  }

  // ─── CONNECTION STATUS ───────────────────────────────────────────────────────
  function setConn(type, text) {
    const dot  = document.getElementById('connDot');
    const span = document.getElementById('connText');
    if (dot)  dot.className = 'conn-dot ' + type;
    if (span) span.textContent = text;
  }

  function setLastSync() {
    const el = document.getElementById('lastSync');
    if (el) el.textContent = 'Synced ' + new Date().toLocaleTimeString('en-IN');
  }

  // ─── LOADER ──────────────────────────────────────────────────────────────────
  function showLoader(msg) {
    const el  = document.getElementById('globalLoader');
    const msg2 = document.getElementById('loaderMsg');
    if (el)   el.classList.remove('hidden');
    if (msg2) msg2.textContent = msg || 'Loading…';
  }
  function hideLoader() {
    const el = document.getElementById('globalLoader');
    if (el) el.classList.add('hidden');
  }

  // ─── ERROR BANNER ─────────────────────────────────────────────────────────
  function showError(msg) {
    let banner = document.getElementById('errorBanner');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'errorBanner';
      banner.className = 'error-banner';
      document.getElementById('content').prepend(banner);
    }
    banner.innerHTML = `
      <span class="error-icon">⚠</span>
      <span class="error-msg">${UTILS.esc(msg)}</span>
      <button class="btn" onclick="COMPONENTS.refresh()">Retry</button>`;
    banner.classList.add('show');
  }
  function hideError() {
    const b = document.getElementById('errorBanner');
    if (b) b.classList.remove('show');
  }

  // ─── SIDEBAR ─────────────────────────────────────────────────────────────────
  function openSidebar() {
    document.getElementById('sidebar')?.classList.add('open');
    document.getElementById('overlay')?.classList.add('show');
  }
  function closeSidebar() {
    document.getElementById('sidebar')?.classList.remove('open');
    document.getElementById('overlay')?.classList.remove('show');
  }

  // ─── TABLE BUILDER ────────────────────────────────────────────────────────────
  /**
   * Generic sortable + paginated + searchable table.
   *
   * opts = {
   *   containerId: string,       // id of <div> to render into
   *   headers:     string[],     // display headers (map from raw if needed)
   *   rawHeaders:  string[],     // raw sheet headers (for col type detection)
   *   rows:        object[],     // array of row objects {header: value}
   *   cellRenderer: fn(val, header, row) → { text, cls },  // optional
   *   pageSize:    number,
   * }
   *
   * Maintains its own sort + page state per table.
   */
  function makeTable(opts) {
    const state = { sort: { col: null, dir: 1 }, page: 1, filtered: opts.rows };

    function render(rows) {
      state.filtered = rows;
      state.page     = Math.min(state.page, Math.max(1, Math.ceil(rows.length / opts.pageSize)));
      _renderTable(state, opts);
    }

    return { render, state };
  }

  function _renderTable(state, opts) {
    const { containerId, headers, rawHeaders, pageSize, cellRenderer } = opts;
    const container = document.getElementById(containerId);
    if (!container) return;

    let rows = [...state.filtered];

    // Sort
    if (state.sort.col !== null) {
      const h = rawHeaders[state.sort.col];
      rows.sort((a, b) => {
        const av = UTILS.toNum(a[h]) || 0;
        const bv = UTILS.toNum(b[h]) || 0;
        if (av !== bv) return (av - bv) * state.sort.dir;
        return String(a[h] || '').localeCompare(String(b[h] || '')) * state.sort.dir;
      });
    }

    const total      = rows.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const start      = (state.page - 1) * pageSize;
    const slice      = rows.slice(start, start + pageSize);

    // Head
    const headHtml = headers.map((h, i) => {
      const cls = state.sort.col === i ? (state.sort.dir === 1 ? 's-asc' : 's-desc') : '';
      return `<th class="${cls}" data-col="${i}">${UTILS.esc(h)}</th>`;
    }).join('');

    // Body
    let bodyHtml = '';
    if (slice.length === 0) {
      bodyHtml = `<tr class="empty-row"><td colspan="${headers.length}">No records found</td></tr>`;
    } else {
      bodyHtml = slice.map(row => {
        const cells = rawHeaders.map((rh, i) => {
          const val = row[rh] ?? '';
          let text, cls;
          if (cellRenderer) {
            const r = cellRenderer(val, rh, row);
            text = r.text; cls = r.cls || '';
          } else {
            const r = defaultCell(val, rh);
            text = r.text; cls = r.cls;
          }
          return `<td class="${cls}">${UTILS.esc(text)}</td>`;
        }).join('');
        return `<tr>${cells}</tr>`;
      }).join('');
    }

    // Pagination
    let footHtml = '';
    if (totalPages > 1) {
      const pages = UTILS.pageNumbers(state.page, totalPages);
      footHtml = `
        <span class="page-info">Page ${state.page}/${totalPages} · ${total} rows</span>
        <div class="page-btns">
          <button class="page-btn" data-page="${state.page - 1}" ${state.page <= 1 ? 'disabled' : ''}>‹</button>
          ${pages.map(p => p === '…'
            ? `<span class="page-btn ellipsis">…</span>`
            : `<button class="page-btn ${p === state.page ? 'active' : ''}" data-page="${p}">${p}</button>`
          ).join('')}
          <button class="page-btn" data-page="${state.page + 1}" ${state.page >= totalPages ? 'disabled' : ''}>›</button>
        </div>`;
    }

    container.innerHTML = `
      <div class="table-scroll">
        <table>
          <thead><tr>${headHtml}</tr></thead>
          <tbody>${bodyHtml}</tbody>
        </table>
      </div>
      ${footHtml ? `<div class="table-foot">${footHtml}</div>` : ''}`;

    // Bind sort
    container.querySelectorAll('th[data-col]').forEach(th => {
      th.addEventListener('click', () => {
        const col = parseInt(th.dataset.col);
        if (state.sort.col === col) state.sort.dir *= -1;
        else { state.sort.col = col; state.sort.dir = 1; }
        state.page = 1;
        _renderTable(state, opts);
      });
    });

    // Bind pagination
    container.querySelectorAll('.page-btn[data-page]').forEach(btn => {
      btn.addEventListener('click', () => {
        const p = parseInt(btn.dataset.page);
        if (!isNaN(p) && p >= 1 && p <= totalPages) {
          state.page = p;
          _renderTable(state, opts);
        }
      });
    });
  }

  function defaultCell(val, header) {
    const h = header.toLowerCase();
    const n = parseFloat(val);
    if (h.includes('p&l') || h.includes('pnl') || h.includes('net p') || h.includes('gross p')) {
      if (isNaN(n)) return { text: UTILS.plain(val), cls: 'cell-muted' };
      return { text: UTILS.pnl(n), cls: UTILS.pnlClass(n) };
    }
    if (h.includes('%') || h.includes('pct') || h.includes('return') || h.includes('yield') ||
        h.includes('gap') || h.includes('growth') || h.includes('roe') || h.includes('roce')) {
      if (isNaN(n)) return { text: UTILS.plain(val), cls: 'cell-muted' };
      return { text: UTILS.pct(n), cls: UTILS.pnlClass(n) };
    }
    if (h.includes('price') || h.includes('invest') || h.includes('current') || h.includes('value') ||
        h.includes('cost') || h.includes('entry') || h.includes('exit') || h.includes('total') ||
        h.includes('balance') || h.includes('charges') || h.includes('brokerage') || h.includes('amount') ||
        h.includes('avg') || h.includes('ltp') || h.includes('graham') || h.includes('intrinsic') ||
        h.includes('demat')) {
      if (isNaN(n) || n === 0) return { text: UTILS.plain(val), cls: 'cell-muted' };
      return { text: UTILS.currency(n), cls: 'cell-muted' };
    }
    if (h.includes('qty') || h.includes('quantity') || h.includes('lots') || h.includes('shares') ||
        h.includes('filled') || h.includes('orders') || h.includes('sl') || h.includes('no')) {
      return { text: UTILS.qty(val), cls: 'cell-muted' };
    }
    if (h.includes('date') || h.includes('time')) {
      return { text: UTILS.date(val), cls: 'cell-dim' };
    }
    return { text: UTILS.plain(val), cls: '' };
  }

  // ─── CHART DEFAULTS ────────────────────────────────────────────────────────
  const CHART = {
    accentColor:  '#00d2aa',
    gainColor:    '#4ade80',
    lossColor:    '#f87171',
    skyColor:     '#38bdf8',
    warnColor:    '#fbbf24',
    gridColor:    'rgba(255,255,255,0.04)',
    tickColor:    '#3d6572',
    monoFont:     "'JetBrains Mono', monospace",

    tooltip: {
      backgroundColor: '#0d2035',
      borderColor:     'rgba(0,210,170,0.3)',
      borderWidth:     1,
      titleColor:      '#3d6572',
      bodyColor:       '#dff2ec',
      bodyFont:    { family: "'JetBrains Mono', monospace", size: 11 },
      titleFont:   { family: "'JetBrains Mono', monospace", size: 10 },
      padding:         10,
    },

    axes() {
      return {
        grid:   { color: this.gridColor },
        ticks:  { color: this.tickColor, font: { family: this.monoFont, size: 10 } },
        border: { color: 'rgba(255,255,255,0.05)' },
      };
    },

    pnlBarColors(values) {
      return {
        bg:     values.map(v => v >= 0 ? 'rgba(74,222,128,0.65)' : 'rgba(248,113,113,0.65)'),
        border: values.map(v => v >= 0 ? '#4ade80' : '#f87171'),
      };
    },

    destroy(key) {
      if (window._ftCharts && window._ftCharts[key]) {
        window._ftCharts[key].destroy();
        delete window._ftCharts[key];
      }
    },

    save(key, instance) {
      if (!window._ftCharts) window._ftCharts = {};
      window._ftCharts[key] = instance;
    },
  };

  // ─── REFRESH HOOK ─────────────────────────────────────────────────────────
  // Pages set this to their reload function
  let _refreshFn = null;
  function onRefresh(fn) { _refreshFn = fn; }
  async function refresh() {
    SHEETS.clearCache();
    if (_refreshFn) await _refreshFn();
  }

  // ─── INIT ─────────────────────────────────────────────────────────────────
  function init(activeId, pageTitle) {
    inject(activeId, pageTitle);
  }

  return {
    init, inject,
    setConn, setLastSync,
    showLoader, hideLoader,
    showError, hideError,
    openSidebar, closeSidebar,
    makeTable, CHART,
    onRefresh, refresh,
  };
})();
