/**
 * js/tables.js
 * ─────────────────────────────────────────────────────────
 * Renders all data tables and wires up search/filter controls.
 *
 * PATTERN used throughout:
 *   1. Store original data in a module-level array.
 *   2. Render function builds HTML from that array.
 *   3. Search/filter events filter the array then re-render.
 *   4. Sort: each th[data-col] click toggles ASC/DESC on that column.
 *
 * EXPORTS (called by app.js):
 *   Tables.renderAll(data)      → populate all tables
 *   Tables.renderSummary(data)  → update stat cards
 *   Tables.bindSearch()         → attach search listeners
 */

const Tables = (() => {

  /* ── Formatters ─────────────────────────────────────── */
  const fmt  = n => '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 });
  const fmtN = n => Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 });
  const pct  = (pnl, base) => base ? ((pnl / base) * 100).toFixed(2) + '%' : '—';

  function pnlClass(v) { return v >= 0 ? 'profit' : 'loss'; }
  function pnlBadge(v) {
    const cls = v >= 0 ? 'badge-win' : 'badge-loss';
    return `<span class="badge ${cls}">${v >= 0 ? 'WIN' : 'LOSS'}</span>`;
  }

  function signalBadge(sig) {
    const map = {
      'BUY':  'badge-buy',
      'SELL': 'badge-loss',
      'HOLD': 'badge-hold',
    };
    return `<span class="badge ${map[sig] || 'badge-neutral'}">${sig}</span>`;
  }

  function actionBadge(action) {
    const cls = action === 'BUY' ? 'badge-buy' : 'badge-sell';
    return `<span class="badge ${cls}">${action}</span>`;
  }


  /* ══════════════════════════════════════════════════════
     STATE  — each table keeps its own copy for filtering
  ══════════════════════════════════════════════════════ */
  let _fo = [], _holdings = [], _inv = [], _ipo = [], _tx = [];


  /* ══════════════════════════════════════════════════════
     SUMMARY CARDS
  ══════════════════════════════════════════════════════ */
  function renderSummary(data) {
    const { fo, holdings, investments, ipo } = data;

    // Total invested (holdings + investments + ipo)
    const totalInvested =
      holdings.reduce((s, h) => s + h.invested, 0) +
      investments.reduce((s, i) => s + i.invested, 0) +
      ipo.reduce((s, i) => s + i.invested, 0);

    // Net P&L from F&O
    const netFoPnl = fo.reduce((s, t) => s + t.netPnl, 0);

    // Holdings P&L
    const holdingsPnl = holdings.reduce((s, h) => s + (h.currentValue - h.invested), 0);
    const holdingsVal  = holdings.reduce((s, h) => s + h.currentValue, 0);

    // Win/Loss
    const wins   = fo.filter(t => t.netPnl >= 0).length;
    const losses = fo.filter(t => t.netPnl <  0).length;
    const winRate = fo.length ? ((wins / fo.length) * 100).toFixed(1) + '%' : '—';

    // Best trade
    const best = fo.reduce((b, t) => t.netPnl > (b?.netPnl ?? -Infinity) ? t : b, null);

    // Total P&L (F&O + Holdings unrealised)
    const totalPnl = netFoPnl + holdingsPnl;
    const pnlPct   = totalInvested ? ((totalPnl / totalInvested) * 100).toFixed(2) + '%' : '—';

    set('stat-invested', fmt(totalInvested));
    set('stat-pnl',      fmt(totalPnl), pnlClass(totalPnl));
    set('stat-pnl-pct',  pnlPct + ' overall return');
    set('stat-winrate',  winRate);
    set('stat-winloss',  `${wins}W / ${losses}L from ${fo.length} trades`);
    set('stat-trades',   fo.length);
    set('stat-trades-sub', `${wins} wins · ${losses} losses`);
    set('stat-holdings', fmt(holdingsVal));
    set('stat-holdings-sub', (holdingsPnl >= 0 ? '+' : '') + fmt(holdingsPnl) + ' unrealised');
    set('stat-best',  best ? fmt(best.netPnl) : '—', 'profit');
    set('stat-best-sub', best ? best.instrument + ' · ' + best.date : '—');

    // Update last-updated timestamp
    document.getElementById('lastUpdated').textContent =
      'Updated ' + new Date().toLocaleTimeString('en-IN');
  }

  function set(id, value, cls) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = value;
    if (cls) { el.className = 'card-value mono ' + cls; }
  }


  /* ══════════════════════════════════════════════════════
     F&O TRADES TABLE
  ══════════════════════════════════════════════════════ */
  let foSort = { col: 'date', dir: -1 };

  function renderFO(rows) {
    const tbody = document.getElementById('foTbody');
    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="10" class="empty-row">No trades found</td></tr>';
      return;
    }

    tbody.innerHTML = rows.map(t => {
      const pnl = t.netPnl;
      return `
        <tr>
          <td class="mono">${t.date}</td>
          <td><strong>${t.instrument}</strong></td>
          <td><span class="badge badge-neutral">${t.type}</span></td>
          <td class="mono">${fmtN(t.qty)}</td>
          <td class="mono">${fmt(t.entry)}</td>
          <td class="mono">${fmt(t.exit)}</td>
          <td class="mono ${pnlClass(t.grossPnl)}">${fmt(t.grossPnl)}</td>
          <td class="mono">${fmt(t.charges)}</td>
          <td class="mono ${pnlClass(pnl)}"><strong>${fmt(pnl)}</strong></td>
          <td>${pnlBadge(pnl)}</td>
        </tr>`;
    }).join('');

    // Footer totals
    const totalNet   = rows.reduce((s, t) => s + t.netPnl, 0);
    const totalGross = rows.reduce((s, t) => s + t.grossPnl, 0);
    const totalChg   = rows.reduce((s, t) => s + t.charges, 0);
    document.getElementById('foFooter').innerHTML =
      `<span>${rows.length} trades</span>
       <span>Gross: <strong class="mono ${pnlClass(totalGross)}">${fmt(totalGross)}</strong></span>
       <span>Charges: <strong class="mono">${fmt(totalChg)}</strong></span>
       <span>Net: <strong class="mono ${pnlClass(totalNet)}">${fmt(totalNet)}</strong></span>`;
  }

  function filterAndRenderFO() {
    const q     = (document.getElementById('foSearch').value || '').toLowerCase();
    const filt  = (document.getElementById('foFilter').value || 'all');

    let rows = _fo.filter(t => {
      const matchQ = !q || t.instrument.toLowerCase().includes(q);
      const matchF = filt === 'all'
        || (filt === 'win'  && t.netPnl >= 0)
        || (filt === 'loss' && t.netPnl <  0);
      return matchQ && matchF;
    });

    // Sort
    rows = [...rows].sort((a, b) => {
      let av = a[foSort.col], bv = b[foSort.col];
      if (typeof av === 'string') av = av.toLowerCase();
      if (typeof bv === 'string') bv = bv.toLowerCase();
      return av < bv ? foSort.dir : av > bv ? -foSort.dir : 0;
    });

    renderFO(rows);
  }


  /* ══════════════════════════════════════════════════════
     RECENT TRADES (Dashboard — last 5)
  ══════════════════════════════════════════════════════ */
  function renderRecentTrades(fo) {
    const recent = [...fo]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 5);

    const tbody = document.getElementById('recentTradesTbody');
    if (!recent.length) {
      tbody.innerHTML = '<tr><td colspan="7" class="empty-row">No trades yet</td></tr>';
      return;
    }

    tbody.innerHTML = recent.map(t => `
      <tr>
        <td class="mono">${t.date}</td>
        <td>${t.instrument}</td>
        <td class="mono">${fmtN(t.qty)}</td>
        <td class="mono">${fmt(t.entry)}</td>
        <td class="mono">${fmt(t.exit)}</td>
        <td class="mono ${pnlClass(t.netPnl)}"><strong>${fmt(t.netPnl)}</strong></td>
        <td>${pnlBadge(t.netPnl)}</td>
      </tr>`).join('');
  }


  /* ══════════════════════════════════════════════════════
     HOLDINGS TABLE
  ══════════════════════════════════════════════════════ */
  function renderHoldings(rows) {
    const tbody = document.getElementById('holdingsTbody');
    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="10" class="empty-row">No holdings found</td></tr>';
      return;
    }

    tbody.innerHTML = rows.map(h => {
      const pnl    = h.currentValue - h.invested;
      const pnlPct = pct(pnl, h.invested);
      return `
        <tr>
          <td><strong>${h.company}</strong></td>
          <td class="mono">${h.symbol}</td>
          <td><span class="badge badge-neutral">${h.sector}</span></td>
          <td class="mono">${fmt(h.avgBuy)}</td>
          <td class="mono">${fmtN(h.qty)}</td>
          <td class="mono">${fmt(h.invested)}</td>
          <td class="mono">${fmt(h.currentValue)}</td>
          <td class="mono ${pnlClass(pnl)}">${fmt(pnl)}</td>
          <td class="mono ${pnlClass(pnl)}">${pnl >= 0 ? '+' : ''}${pnlPct}</td>
          <td>${signalBadge(h.signal)}</td>
        </tr>`;
    }).join('');

    // Footer
    const totInv = rows.reduce((s, h) => s + h.invested, 0);
    const totCur = rows.reduce((s, h) => s + h.currentValue, 0);
    const totPnl = totCur - totInv;
    document.getElementById('holdingsFooter').innerHTML =
      `<span>${rows.length} positions</span>
       <span>Invested: <strong class="mono">${fmt(totInv)}</strong></span>
       <span>Current: <strong class="mono">${fmt(totCur)}</strong></span>
       <span>Unrealised P&L: <strong class="mono ${pnlClass(totPnl)}">${fmt(totPnl)}</strong></span>`;
  }

  function filterHoldings() {
    const q = (document.getElementById('holdingsSearch').value || '').toLowerCase();
    const rows = _holdings.filter(h =>
      !q || h.company.toLowerCase().includes(q) || h.symbol.toLowerCase().includes(q)
    );
    renderHoldings(rows);
  }


  /* ══════════════════════════════════════════════════════
     INVESTMENTS TABLE
  ══════════════════════════════════════════════════════ */
  function renderInvestments(rows) {
    const tbody = document.getElementById('invTbody');
    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="10" class="empty-row">No investments found</td></tr>';
      return;
    }

    tbody.innerHTML = rows.map(i => {
      const pnl    = i.currentValue - i.invested;
      const pnlPct = pct(pnl, i.invested);
      return `
        <tr>
          <td><strong>${i.company}</strong></td>
          <td class="mono">${i.ticker}</td>
          <td class="mono">${i.date}</td>
          <td class="mono">${fmt(i.orderPrice)}</td>
          <td class="mono">${fmtN(i.qty)}</td>
          <td class="mono">${fmt(i.currentPrice)}</td>
          <td class="mono">${fmt(i.invested)}</td>
          <td class="mono">${fmt(i.currentValue)}</td>
          <td class="mono ${pnlClass(pnl)}">${fmt(pnl)}</td>
          <td class="mono ${pnlClass(pnl)}">${pnl >= 0 ? '+' : ''}${pnlPct}</td>
        </tr>`;
    }).join('');
  }

  function filterInvestments() {
    const q = (document.getElementById('invSearch').value || '').toLowerCase();
    const rows = _inv.filter(i =>
      !q || i.company.toLowerCase().includes(q) || i.ticker.toLowerCase().includes(q)
    );
    renderInvestments(rows);
  }


  /* ══════════════════════════════════════════════════════
     IPO TABLE
  ══════════════════════════════════════════════════════ */
  function renderIPO(rows) {
    const tbody = document.getElementById('ipoTbody');
    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="10" class="empty-row">No IPO data found</td></tr>';
      return;
    }

    tbody.innerHTML = rows.map(i => {
      const currentVal = i.currentPrice * i.allotted;
      const pnl        = currentVal - i.invested;
      const pnlPct     = pct(pnl, i.invested);
      const status     = i.currentPrice >= i.listingPrice ? 'WIN' : 'LOSS';
      return `
        <tr>
          <td><strong>${i.company}</strong></td>
          <td class="mono">${i.date}</td>
          <td class="mono">${fmt(i.issuePrice)}</td>
          <td class="mono">${fmtN(i.allotted)}</td>
          <td class="mono">${fmt(i.listingPrice)}</td>
          <td class="mono">${fmt(i.currentPrice)}</td>
          <td class="mono">${fmt(i.invested)}</td>
          <td class="mono ${pnlClass(pnl)}">${fmt(pnl)}</td>
          <td class="mono ${pnlClass(pnl)}">${pnl >= 0 ? '+' : ''}${pnlPct}</td>
          <td>${pnlBadge(pnl)}</td>
        </tr>`;
    }).join('');
  }


  /* ══════════════════════════════════════════════════════
     TRANSACTION LOG TABLE
  ══════════════════════════════════════════════════════ */
  function renderTransactions(rows) {
    const tbody = document.getElementById('txTbody');
    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="8" class="empty-row">No transactions found</td></tr>';
      return;
    }

    tbody.innerHTML = rows.map(t => {
      const net = t.action === 'SELL'
        ? t.amount - t.charges
        : -(t.amount + t.charges);
      return `
        <tr>
          <td class="mono">${t.date}</td>
          <td><strong>${t.instrument}</strong></td>
          <td>${actionBadge(t.action)}</td>
          <td class="mono">${fmt(t.price)}</td>
          <td class="mono">${fmtN(t.qty)}</td>
          <td class="mono">${fmt(t.amount)}</td>
          <td class="mono">${fmt(t.charges)}</td>
          <td class="mono ${pnlClass(net)}"><strong>${fmt(net)}</strong></td>
        </tr>`;
    }).join('');
  }

  function filterTransactions() {
    const q = (document.getElementById('txSearch').value || '').toLowerCase();
    const rows = _tx.filter(t =>
      !q || t.instrument.toLowerCase().includes(q) || t.action.toLowerCase().includes(q)
    );
    renderTransactions(rows);
  }


  /* ══════════════════════════════════════════════════════
     BIND SEARCH — call once after DOM is ready
  ══════════════════════════════════════════════════════ */
  function bindSearch() {
    document.getElementById('foSearch').addEventListener('input',   filterAndRenderFO);
    document.getElementById('foFilter').addEventListener('change',  filterAndRenderFO);
    document.getElementById('holdingsSearch').addEventListener('input', filterHoldings);
    document.getElementById('invSearch').addEventListener('input',   filterInvestments);
    document.getElementById('txSearch').addEventListener('input',   filterTransactions);

    // Sortable columns for F&O table
    document.querySelectorAll('#foTable thead th[data-col]').forEach(th => {
      th.addEventListener('click', () => {
        const col = th.dataset.col;
        if (foSort.col === col) foSort.dir *= -1;
        else { foSort.col = col; foSort.dir = 1; }
        filterAndRenderFO();
      });
    });

    // Link buttons (e.g. "View all →" on dashboard)
    document.querySelectorAll('[data-goto]').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.goto;
        document.querySelector(`[data-tab="${target}"]`)?.click();
      });
    });
  }


  /* ══════════════════════════════════════════════════════
     PUBLIC: renderAll(data)
  ══════════════════════════════════════════════════════ */
  function renderAll(data) {
    // Store originals for filter
    _fo       = data.fo;
    _holdings = data.holdings;
    _inv      = data.investments;
    _ipo      = data.ipo;
    _tx       = data.transactions;

    renderSummary(data);
    renderRecentTrades(_fo);
    renderFO(_fo);
    renderHoldings(_holdings);
    renderInvestments(_inv);
    renderIPO(_ipo);
    renderTransactions(_tx);
  }


  return { renderAll, renderSummary, bindSearch };

})();
