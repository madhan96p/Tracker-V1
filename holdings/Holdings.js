/**
 * holdings/Holdings.js
 * ─────────────────────────────────────────────
 * ⚠️  BUG FIX — Holdings P&L calculation
 *
 * "Holdings Data" sheet columns (0-indexed):
 *   0  Company Name
 *   1  Symble (Symbol)
 *   2  Sector
 *   3  Avg Buy Price
 *   4  Total Qty
 *   5  Total Invested          ← P&L base
 *   6  Total Brokerage Paid    ← small number (e.g. ₹145.99) — NOT current value!
 *   7  Current Value           ← actual total market value (price × qty)
 *   8  Sentinel Recommendation
 *   9  Fundamental Action
 *  10  Master Sentinel
 *
 * OLD (WRONG): P&L = col[6] − col[5]  → used brokerage as "current" → huge fake losses
 * NEW (FIXED): P&L = col[7] − col[5]  → Current Value − Total Invested ✅
 */

COMPONENTS.init('holdings', 'HOLDINGS');

let _allRows = [];
const C = CONFIG.HOLDINGS_DATA;

const TABLE_HEADERS_DISPLAY = [
  'Company', 'Symbol', 'Sector', 'Avg Buy', 'Qty',
  'Invested', 'Brokerage', 'Current', 'Net P&L', 'Return %',
  'Sentinel', 'FA Action', 'Master Signal',
];
const TABLE_HEADERS_RAW = [
  'Company Name', 'Symble', 'Sector', 'Avg Buy Price', 'Total Qty',
  'Total Invested', 'Total Brokerage Paid', 'Current Value', '__netPnl', '__pct',
  'Sentinel Recommendation', 'Fundamental Action', 'Master Sentinel',
];

async function loadHoldings(refresh = false) {
  COMPONENTS.showLoader('Loading holdings…');
  COMPONENTS.setConn('loading', 'Fetching…');
  COMPONENTS.hideError();

  try {
    const data = await SHEETS.load(refresh);
    const hold = SHEETS.getHoldingsData(data);

    // Augment each row with computed P&L fields
    _allRows = (hold.rows || []).map(row => {
      const invested = UTILS.toNum(row['Total Invested']       ?? row[C.totalInvested]);
      const current  = UTILS.toNum(row['Current Value']        ?? row[C.currentValue]);
      // ✅ CORRECT: Net P&L = Current Value (col 7) − Total Invested (col 5)
      const netPnl   = current - invested;
      const pct      = invested > 0 ? (netPnl / invested * 100) : 0;
      return { ...row, __netPnl: netPnl, __pct: pct };
    });

    // Populate sector dropdown
    const sectors = [...new Set(_allRows.map(r => r['Sector'] ?? r[C.sector]).filter(Boolean))].sort();
    const sf = document.getElementById('sectorFilter');
    sf.innerHTML = '<option value="">All Sectors</option>' +
      sectors.map(s => `<option value="${UTILS.esc(s)}">${UTILS.esc(s)}</option>`).join('');

    renderKPIs(_allRows);
    applyFilters();

    COMPONENTS.setConn('live', 'Live · ' + new Date().toLocaleTimeString('en-IN'));
    COMPONENTS.setLastSync();

  } catch (err) {
    COMPONENTS.showError('Failed to load: ' + err.message);
    COMPONENTS.setConn('error', 'Error');
    console.error(err);
  }

  COMPONENTS.hideLoader();
}

function renderKPIs(rows) {
  let totalInv = 0, totalCur = 0;
  let bestRow = null, worstRow = null;

  rows.forEach(r => {
    totalInv += UTILS.toNum(r['Total Invested'] ?? r[C.totalInvested]);
    totalCur += UTILS.toNum(r['Current Value']  ?? r[C.currentValue]);
    if (!bestRow  || r.__netPnl > bestRow.__netPnl)  bestRow  = r;
    if (!worstRow || r.__netPnl < worstRow.__netPnl) worstRow = r;
  });

  const total = totalCur - totalInv;
  const pct   = totalInv > 0 ? (total / totalInv * 100) : 0;

  const buys  = rows.filter(r => String(r['Sentinel Recommendation'] ?? r[C.sentinel]).includes('BUY')).length;
  const holds = rows.filter(r => String(r['Sentinel Recommendation'] ?? r[C.sentinel]).includes('HOLD')).length;

  const kpis = [
    { label: 'Total Invested',   value: UTILS.currency(totalInv), cls: '', card: 'c-accent' },
    { label: 'Current Value',    value: UTILS.currency(totalCur), cls: 'sky', card: 'c-sky' },
    { label: 'Unrealised P&L',   value: UTILS.pnl(total),         cls: total >= 0 ? 'gain' : 'loss', sub: UTILS.pct(pct), card: total >= 0 ? 'c-gain' : 'c-loss' },
    { label: 'Positions',        value: rows.length,              cls: '', sub: `${buys} buy · ${holds} hold`, card: 'c-sky' },
    { label: 'Best Performer',   value: bestRow  ? UTILS.pnl(bestRow.__netPnl)  : '—', cls: 'gain', sub: bestRow  ? (bestRow['Company Name'] ?? bestRow[C.companyName]) : '', card: 'c-gain' },
    { label: 'Worst Performer',  value: worstRow ? UTILS.pnl(worstRow.__netPnl) : '—', cls: 'loss', sub: worstRow ? (worstRow['Company Name'] ?? worstRow[C.companyName]) : '', card: 'c-loss' },
  ];

  document.getElementById('holdKpis').innerHTML = kpis.map(k => `
    <div class="kpi-card ${k.card}">
      <div class="kpi-label">${k.label}</div>
      <div class="kpi-value ${k.cls}">${k.value}</div>
      ${k.sub ? `<div class="kpi-sub">${UTILS.esc(String(k.sub))}</div>` : ''}
    </div>`).join('');
}

function applyFilters() {
  const search   = (document.getElementById('holdSearch').value   || '').toLowerCase();
  const sector   = (document.getElementById('sectorFilter').value  || '');
  const sentinel = (document.getElementById('sentinelFilter').value || '');

  const filtered = _allRows.filter(row => {
    const name = String(row['Company Name'] ?? row[C.companyName] ?? '').toLowerCase();
    const sym  = String(row['Symble']       ?? row[C.symbol]      ?? '').toLowerCase();
    const sec  = String(row['Sector']       ?? row[C.sector]      ?? '');
    const sen  = String(row['Sentinel Recommendation'] ?? row[C.sentinel] ?? '').toUpperCase();

    if (search   && !name.includes(search) && !sym.includes(search)) return false;
    if (sector   && sec !== sector) return false;
    if (sentinel && !sen.includes(sentinel)) return false;
    return true;
  });

  document.getElementById('holdCount').textContent = filtered.length + ' rows';

  const container = document.getElementById('holdingsTable');
  if (!filtered.length) {
    container.innerHTML = `<div class="table-scroll"><table><tbody><tr class="empty-row"><td colspan="${TABLE_HEADERS_DISPLAY.length}">No matching records</td></tr></tbody></table></div>`;
    return;
  }

  // Header
  const headHtml = TABLE_HEADERS_DISPLAY.map((h, i) =>
    `<th data-col="${i}">${UTILS.esc(h)}</th>`
  ).join('');

  // Rows
  const bodyHtml = filtered.map(row => {
    const invested = UTILS.toNum(row['Total Invested']       ?? row[C.totalInvested]);
    const current  = UTILS.toNum(row['Current Value']        ?? row[C.currentValue]);
    const broker   = UTILS.toNum(row['Total Brokerage Paid'] ?? row[C.brokerage]);
    const netPnl   = row.__netPnl;
    const pct      = row.__pct;

    const sentinel       = row['Sentinel Recommendation'] ?? row[C.sentinel]        ?? '';
    const faAction       = row['Fundamental Action']      ?? row[C.fundamentalAction] ?? '';
    const masterSentinel = row['Master Sentinel']         ?? row[C.masterSentinel]  ?? '';

    const rowCls = sentinel.includes('BUY') ? 'row-buy-dip' :
                   sentinel.includes('PROFIT') ? 'row-take-profit' : '';

    return `<tr class="${rowCls}">
      <td>${UTILS.esc(UTILS.plain(row['Company Name'] ?? row[C.companyName]))}</td>
      <td class="cell-dim">${UTILS.esc(UTILS.plain(row['Symble'] ?? row[C.symbol]))}</td>
      <td class="cell-dim">${UTILS.esc(UTILS.plain(row['Sector'] ?? row[C.sector]))}</td>
      <td class="cell-muted">${UTILS.currency(row['Avg Buy Price'] ?? row[C.avgBuyPrice])}</td>
      <td class="cell-muted">${UTILS.qty(row['Total Qty'] ?? row[C.totalQty])}</td>
      <td class="cell-muted">${UTILS.currency(invested)}</td>
      <td class="cell-dim">${UTILS.currency(broker)}</td>
      <td class="cell-muted">${UTILS.currency(current)}</td>
      <td class="${UTILS.pnlClass(netPnl)}">${UTILS.pnl(netPnl)}</td>
      <td class="${UTILS.pnlClass(pct)}">${UTILS.pct(pct)}</td>
      <td>${UTILS.sentinelBadge(sentinel)}</td>
      <td>${UTILS.sentinelBadge(faAction)}</td>
      <td>${UTILS.sentinelBadge(masterSentinel)}</td>
    </tr>`;
  }).join('');

  container.innerHTML = `
    <div class="table-scroll">
      <table>
        <thead><tr>${headHtml}</tr></thead>
        <tbody>${bodyHtml}</tbody>
      </table>
    </div>`;
}

COMPONENTS.onRefresh(() => loadHoldings(true));
loadHoldings();
setInterval(() => loadHoldings(true), CONFIG.AUTO_REFRESH);
