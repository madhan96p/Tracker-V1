/**
 * fo/FO.js
 * F&O Trades page — full table with search/filter/sort
 * Shows My Calc P&L vs Mail Data (broker-confirmed)
 * Computes all dashboard metrics from user's confirmed formulas
 */
COMPONENTS.init('fo', 'F&O TRADES');

let _foRows = [];

async function loadFO(refresh = false) {
  COMPONENTS.showLoader('Loading F&O trades…');
  COMPONENTS.setConn('loading', 'Fetching…');
  COMPONENTS.hideError();
  try {
    const data = await SHEETS.load(refresh);
    const fo = SHEETS.getFO(data);
    _foRows = fo.rows || [];

    // Populate instrument filter
    const instruments = [...new Set(_foRows.map(r => r['Instrument'] ?? r[CONFIG.FO.instrument]).filter(Boolean))].sort();
    const iFilter = document.getElementById('foInstrFilter');
    iFilter.innerHTML = '<option value="">All Instruments</option>' +
      instruments.map(i => `<option value="${UTILS.esc(i)}">${UTILS.esc(i)}</option>`).join('');

    renderFOKPIs(_foRows);
    renderDematBar(_foRows);
    applyFOFilters();

    COMPONENTS.setStreaks(UTILS.computeStreaks(_foRows, []));
    COMPONENTS.setConn('live', 'Live · ' + new Date().toLocaleTimeString('en-IN'));
    COMPONENTS.setLastSync();
  } catch (err) {
    COMPONENTS.showError('Failed: ' + err.message);
    COMPONENTS.setConn('error', 'Error');
  }
  COMPONENTS.hideLoader();
}

function renderFOKPIs(rows) {
  const fo = UTILS.computeFOMetrics(rows);
  const kpis = [
    { label: 'My Calc P&L',    value: UTILS.pnl(fo.myCalcPnl),     cls: fo.myCalcPnl >= 0 ? 'gain' : 'loss',   card: fo.myCalcPnl >= 0 ? 'c-gain' : 'c-loss', sub: 'SUM(Table1[Net P&L])' },
    { label: 'Actual Mail P&L',value: UTILS.pnl(fo.mailPnl),        cls: fo.mailPnl >= 0 ? 'gain' : 'loss',     card: fo.mailPnl >= 0 ? 'c-gain' : 'c-loss',   sub: 'Broker-confirmed' },
    { label: 'Tax Leakage',    value: UTILS.pnl(fo.taxLeakage),     cls: fo.taxLeakage > 0 ? 'loss' : 'gain',   card: 'c-warn',  sub: 'My Calc − Mail' },
    { label: 'Win Rate',       value: fo.winRate + '%',              cls: +fo.winRate >= 50 ? 'gain' : 'loss',   card: +fo.winRate >= 50 ? 'c-gain' : 'c-loss', sub: `${fo.wins}W · ${fo.losses}L · ${fo.breakeven}BE` },
    { label: 'Win Factor',     value: fo.winFactor,                  cls: 'sky', card: 'c-sky', sub: '|Gross Wins ÷ Gross Losses|' },
    { label: 'Total Charges',  value: UTILS.currency(fo.totalCharges), cls: 'loss', card: 'c-loss', sub: 'Brokerage + STT + GST' },
    { label: 'Total Capital In', value: UTILS.currency(fo.totalIn), cls: '', card: 'c-accent', sub: 'SUMPRODUCT(Entry × Qty)' },
    { label: 'Total Capital Out',value: UTILS.currency(fo.totalOut), cls: '', card: 'c-sky',   sub: 'SUMPRODUCT(Exit × Qty)' },
  ];

  document.getElementById('foKpis').innerHTML = kpis.map(k => `
    <div class="kpi-card ${k.card}">
      <div class="kpi-label">${k.label}</div>
      <div class="kpi-value ${k.cls}">${k.value}</div>
      <div class="kpi-sub">${k.sub}</div>
    </div>`).join('');
}

function renderDematBar(rows) {
  const fo = UTILS.computeFOMetrics(rows);
  document.getElementById('foDematBar').innerHTML = `
    <span>Phase I Goal: <b>0 &lt;= ${UTILS.currency(fo.myCalcPnl)}</b></span>
    <span>In Demat: <b class="d-${fo.inDemat >= 50000 ? 'gain' : 'loss'}">${UTILS.currency(fo.inDemat)}</b></span>
    <span>| My Calc: <b class="d-${fo.myCalcPnl >= 0 ? 'gain' : 'loss'}">${UTILS.pnl(fo.myCalcPnl)}</b></span>
    <span>| Actual Mail: <b class="d-${fo.mailPnl >= 0 ? 'gain' : 'loss'}">${UTILS.pnl(fo.mailPnl)}</b></span>
    <span>| Tax Leakage: <b class="d-loss">${UTILS.pnl(fo.taxLeakage)}</b></span>
    <span>| Gross Wins: <b class="d-gain">${UTILS.pnl(fo.grossWins)}</b></span>
    <span>| Gross Losses: <b class="d-loss">${UTILS.pnl(fo.grossLosses)}</b></span>
    <span>| Win Factor: <b class="d-sky">${fo.winFactor}</b></span>
    <span>| Total In: <b>${UTILS.currency(fo.totalIn)}</b></span>
    <span>| Total Out: <b>${UTILS.currency(fo.totalOut)}</b></span>`;
}

function applyFOFilters() {
  const search = (document.getElementById('foSearch').value || '').toLowerCase();
  const instr  = document.getElementById('foInstrFilter').value;
  const wl     = document.getElementById('foWLFilter').value;

  const filtered = _foRows.filter(row => {
    const instrument = String(row['Instrument'] ?? row[CONFIG.FO.instrument] ?? '');
    const netPnl     = UTILS.toNum(row['Net P&L'] ?? row[CONFIG.FO.netPnl]);

    if (search && !instrument.toLowerCase().includes(search)) return false;
    if (instr  && instrument !== instr) return false;
    if (wl === 'win'  && netPnl <= 0) return false;
    if (wl === 'loss' && netPnl >= 0) return false;
    if (wl === 'be'   && netPnl !== 0) return false;
    return true;
  });

  document.getElementById('foCount').textContent = filtered.length + ' rows';

  const headers = [
    { label: 'Date',         key: 'Date' },
    { label: 'Instrument',   key: 'Instrument' },
    { label: 'Entry',        key: 'Entry Price' },
    { label: 'Exit',         key: 'Exit Price' },
    { label: 'Qty',          key: 'Qty' },
    { label: 'Orders',       key: 'Orders' },
    { label: 'Gross P&L',    key: 'Gross P&L' },
    { label: 'Charges',      key: 'Charges' },
    { label: 'Net P&L',      key: 'Net P&L' },
    { label: 'Mail P&L',     key: 'Mail Data' },
    { label: 'Demat Cr/Dr',  key: 'Demat Cr/Dr' },
    { label: 'Time In',      key: 'Time In' },
    { label: 'Time Out',     key: 'Time Out' },   // duration
    { label: 'Slippage',     key: 'Slippage Audit' },
  ];

  const headHtml = headers.map(h => `<th>${UTILS.esc(h.label)}</th>`).join('');

  const bodyHtml = filtered.length === 0
    ? `<tr class="empty-row"><td colspan="${headers.length}">No trades match filters</td></tr>`
    : filtered.map(row => {
        const cells = headers.map(h => {
          const v = row[h.key];
          const n = UTILS.toNum(v);
          const k = h.key.toLowerCase();
          if (k.includes('p&l') || k.includes('mail') || k.includes('cr/dr')) {
            if (isNaN(n) || n === 0) return `<td class="cell-dim">—</td>`;
            return `<td class="${UTILS.pnlClass(n)}">${UTILS.pnl(n)}</td>`;
          }
          if (k.includes('price') || k.includes('charges')) return `<td class="cell-muted">${isNaN(n) ? UTILS.plain(v) : UTILS.currency(n)}</td>`;
          if (k.includes('qty') || k.includes('orders'))   return `<td class="cell-muted">${UTILS.qty(v)}</td>`;
          if (k.includes('date')) return `<td class="cell-dim">${UTILS.date(v)}</td>`;
          if (k.includes('time')) return `<td class="time-col">${UTILS.plain(v)}</td>`;
          if (k.includes('slippage')) {
            if (isNaN(n) || n === 0) return `<td class="cell-dim">—</td>`;
            return `<td class="${n >= 0 ? 'slip-pos' : 'slip-neg'}">${UTILS.pnl(n)}</td>`;
          }
          return `<td>${UTILS.esc(UTILS.plain(v))}</td>`;
        }).join('');
        return `<tr>${cells}</tr>`;
      }).join('');

  document.getElementById('foTable').innerHTML = `
    <div class="table-scroll">
      <table>
        <thead><tr>${headHtml}</tr></thead>
        <tbody>${bodyHtml}</tbody>
      </table>
    </div>`;
}

COMPONENTS.onRefresh(() => loadFO(true));
loadFO();
setInterval(() => loadFO(true), CONFIG.AUTO_REFRESH);
