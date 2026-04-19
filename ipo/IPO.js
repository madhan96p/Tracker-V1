/**
 * ipo/IPO.js
 * IPO records from the Investments sheet → IPOs table.
 * Same header structure as Investments Holdings table.
 */
COMPONENTS.init('ipo', 'IPO TRACKER');

const IPO_HEADERS_DISPLAY = [
  'Company', 'Ticker', 'Date', 'Order Price', 'Filled Qty',
  'Current Price', 'Brokerage', 'Invested', 'Current', 'Net P&L', 'Gross P&L',
];
const IPO_HEADERS_RAW = [
  'Company Name', 'Ticker', 'Date', 'Order Price', 'Filled Qty',
  'Current Price', 'Buying Brokerage', 'Invested', 'Current', 'Net P&L', 'Gross P&L',
];

let _ipoRows = [];

async function loadIPO(refresh = false) {
  COMPONENTS.showLoader('Loading IPO data…');
  COMPONENTS.setConn('loading', 'Fetching…');
  COMPONENTS.hideError();

  try {
    const data = await SHEETS.load(refresh);
    _ipoRows = SHEETS.getInvestmentsIPOs(data).rows || [];

    renderIPOKPIs(_ipoRows);
    filterIPO();

    COMPONENTS.setStreaks(UTILS.computeStreaks([], []));
    COMPONENTS.setConn('live', 'Live · ' + new Date().toLocaleTimeString('en-IN'));
    COMPONENTS.setLastSync();
  } catch (err) {
    COMPONENTS.showError('Failed: ' + err.message);
    COMPONENTS.setConn('error', 'Error');
  }

  COMPONENTS.hideLoader();
}

function renderIPOKPIs(rows) {
  let totalInv = 0, totalCur = 0, totalNetPnl = 0, totalGrossPnl = 0;
  let wins = 0, losses = 0;

  rows.forEach(r => {
    totalInv     += UTILS.toNum(r['Invested']);
    totalCur     += UTILS.toNum(r['Current']);
    totalNetPnl  += UTILS.toNum(r['Net P&L']);
    totalGrossPnl+= UTILS.toNum(r['Gross P&L']);
    const n = UTILS.toNum(r['Net P&L']);
    if (n > 0) wins++; else if (n < 0) losses++;
  });

  const pct = totalInv > 0 ? (totalNetPnl / totalInv * 100) : 0;

  const kpis = [
    { label: 'Total Invested',  value: UTILS.currency(totalInv),    cls: '',                           card: 'c-accent', sub: `${rows.length} IPOs applied` },
    { label: 'Current Value',   value: UTILS.currency(totalCur),    cls: 'sky',                        card: 'c-sky',    sub: 'Market value today' },
    { label: 'Net P&L',        value: UTILS.pnl(totalNetPnl),      cls: totalNetPnl >= 0 ? 'gain':'loss',  card: totalNetPnl >= 0 ? 'c-gain':'c-loss', sub: UTILS.pct(pct) },
    { label: 'Gross P&L',      value: UTILS.pnl(totalGrossPnl),    cls: totalGrossPnl >= 0 ? 'gain':'loss', card: 'c-accent', sub: 'Before brokerage' },
    { label: 'Wins / Losses',  value: `${wins} / ${losses}`,       cls: '',                           card: wins > losses ? 'c-gain' : 'c-loss', sub: `${rows.length} total` },
  ];

  document.getElementById('ipoKpis').innerHTML = kpis.map(k => `
    <div class="kpi-card ${k.card}">
      <div class="kpi-label">${k.label}</div>
      <div class="kpi-value ${k.cls}">${k.value}</div>
      <div class="kpi-sub">${k.sub}</div>
    </div>`).join('');
}

function filterIPO() {
  const q      = (document.getElementById('ipoSearch')?.value || '').toLowerCase();
  const filter = document.getElementById('ipoPnlFilter')?.value || '';

  const filtered = _ipoRows.filter(r => {
    const name   = String(r['Company Name'] || '').toLowerCase();
    const ticker = String(r['Ticker']       || '').toLowerCase();
    const netPnl = UTILS.toNum(r['Net P&L']);
    if (q      && !name.includes(q) && !ticker.includes(q)) return false;
    if (filter === 'profit' && netPnl <= 0) return false;
    if (filter === 'loss'   && netPnl >= 0) return false;
    return true;
  });

  document.getElementById('ipoCount').textContent = filtered.length + ' rows';

  const headHtml = IPO_HEADERS_DISPLAY.map(h => `<th>${UTILS.esc(h)}</th>`).join('');
  const bodyHtml = filtered.length === 0
    ? `<tr class="empty-row"><td colspan="${IPO_HEADERS_DISPLAY.length}">No IPO records</td></tr>`
    : filtered.map(row => {
        const cells = IPO_HEADERS_RAW.map(rh => {
          const v = row[rh];
          const n = UTILS.toNum(v);
          const h = rh.toLowerCase();
          if (h.includes('p&l')) {
            if (isNaN(n) || n === 0) return `<td class="cell-dim">—</td>`;
            return `<td class="${UTILS.pnlClass(n)}">${UTILS.pnl(n)}</td>`;
          }
          if (h.includes('price') || h.includes('brokerage') || h.includes('invest') || h.includes('current'))
            return `<td class="cell-muted">${isNaN(n) || n === 0 ? '—' : UTILS.currency(n)}</td>`;
          if (h.includes('qty') || h.includes('filled')) return `<td class="cell-muted">${UTILS.qty(v)}</td>`;
          if (h.includes('date')) return `<td class="cell-dim">${UTILS.date(v)}</td>`;
          return `<td>${UTILS.esc(UTILS.plain(v))}</td>`;
        }).join('');
        return `<tr>${cells}</tr>`;
      }).join('');

  document.getElementById('ipoTable').innerHTML = `
    <div class="table-scroll">
      <table>
        <thead><tr>${headHtml}</tr></thead>
        <tbody>${bodyHtml}</tbody>
      </table>
    </div>`;
}

COMPONENTS.onRefresh(() => loadIPO(true));
loadIPO();
setInterval(() => loadIPO(true), CONFIG.AUTO_REFRESH);
