/**
 * demat2/Demat2.js
 * "Demat 2 76k" sheet — same column structure as Investments tables:
 *   Company Name | Ticker | Date | Order Price | Filled Qty | Current Price
 *   Buying Brokerage | Invested | Current | Net P&L | Gross P&L
 */

COMPONENTS.init('demat2', 'DEMAT 2');

const D2_HEADERS_DISPLAY = [
  'Company', 'Ticker', 'Date', 'Order Price', 'Qty',
  'Current Price', 'Brokerage', 'Invested', 'Current', 'Net P&L', 'Gross P&L',
];
const D2_HEADERS_RAW = [
  'Company Name', 'Ticker', 'Date', 'Order Price', 'Filled Qty',
  'Current Price', 'Buying Brokerage', 'Invested', 'Current', 'Net P&L', 'Gross P&L',
];

let _d2Rows = [];

async function loadD2(refresh = false) {
  COMPONENTS.showLoader('Loading Demat 2…');
  COMPONENTS.setConn('loading', 'Fetching…');
  COMPONENTS.hideError();

  try {
    const data = await SHEETS.load(refresh);
    const d2   = SHEETS.getDemat2(data);
    _d2Rows    = d2.rows || [];

    renderD2KPIs(_d2Rows);
    filterD2();

    COMPONENTS.setConn('live', 'Live · ' + new Date().toLocaleTimeString('en-IN'));
    COMPONENTS.setLastSync();
  } catch (err) {
    COMPONENTS.showError('Failed: ' + err.message);
    COMPONENTS.setConn('error', 'Error');
    console.error(err);
  }

  COMPONENTS.hideLoader();
}

function renderD2KPIs(rows) {
  let totalInv = 0, totalCur = 0, totalNet = 0, totalGross = 0;
  let wins = 0, losses = 0;

  rows.forEach(r => {
    totalInv   += UTILS.toNum(r['Invested']);
    totalCur   += UTILS.toNum(r['Current']);
    totalNet   += UTILS.toNum(r['Net P&L']);
    totalGross += UTILS.toNum(r['Gross P&L']);
    const n = UTILS.toNum(r['Net P&L']);
    if (n > 0) wins++; else if (n < 0) losses++;
  });

  const pct = totalInv > 0 ? (totalNet / totalInv * 100) : 0;

  const kpis = [
    { label: 'Total Invested',  value: UTILS.currency(totalInv),  cls: '',                          card: 'c-accent', sub: `${rows.length} positions` },
    { label: 'Current Value',   value: UTILS.currency(totalCur),  cls: 'sky',                       card: 'c-sky',    sub: 'Market value' },
    { label: 'Net P&L',        value: UTILS.pnl(totalNet),        cls: totalNet >= 0 ? 'gain':'loss', card: totalNet >= 0 ? 'c-gain':'c-loss', sub: UTILS.pct(pct) + ' return' },
    { label: 'Gross P&L',      value: UTILS.pnl(totalGross),      cls: totalGross >= 0 ? 'gain':'loss', card: 'c-accent', sub: 'Before brokerage' },
    { label: 'Wins / Losses',  value: `${wins} / ${losses}`,     cls: '',                          card: wins > losses ? 'c-gain':'c-loss', sub: `${rows.length} total` },
  ];

  document.getElementById('d2Kpis').innerHTML = kpis.map(k => `
    <div class="kpi-card ${k.card}">
      <div class="kpi-label">${k.label}</div>
      <div class="kpi-value ${k.cls}">${k.value}</div>
      <div class="kpi-sub">${k.sub}</div>
    </div>`).join('');
}

function filterD2() {
  const q      = (document.getElementById('d2Search')?.value || '').toLowerCase();
  const filter = document.getElementById('d2PnlFilter')?.value || '';

  const filtered = _d2Rows.filter(r => {
    const name   = String(r['Company Name'] || '').toLowerCase();
    const ticker = String(r['Ticker']       || '').toLowerCase();
    const net    = UTILS.toNum(r['Net P&L']);
    if (q      && !name.includes(q) && !ticker.includes(q)) return false;
    if (filter === 'profit' && net <= 0) return false;
    if (filter === 'loss'   && net >= 0) return false;
    return true;
  });

  document.getElementById('d2Count').textContent = filtered.length + ' rows';

  const headHtml = D2_HEADERS_DISPLAY.map(h => `<th>${UTILS.esc(h)}</th>`).join('');
  const bodyHtml = filtered.length === 0
    ? `<tr class="empty-row"><td colspan="${D2_HEADERS_DISPLAY.length}">No records</td></tr>`
    : filtered.map(row => {
        const cells = D2_HEADERS_RAW.map(rh => {
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

  document.getElementById('d2Table').innerHTML = `
    <div class="table-scroll">
      <table>
        <thead><tr>${headHtml}</tr></thead>
        <tbody>${bodyHtml}</tbody>
      </table>
    </div>`;
}

COMPONENTS.onRefresh(() => loadD2(true));
loadD2();
setInterval(() => loadD2(true), CONFIG.AUTO_REFRESH);
