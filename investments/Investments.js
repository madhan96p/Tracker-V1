/**
 * investments/Investments.js
 * ─────────────────────────────────────────────
 * The "Investments" sheet has 3 tables inside one sheet:
 *   1. Holdings   — equity stock purchase transactions
 *   2. IPOs       — IPO allotment records
 *   3. Trade_Transaction_Log — shown on /log page
 *
 * Both Holdings and IPOs share the same headers:
 *   Company Name | Ticker | Date | Order Price | Filled Qty | Current Price
 *   Buying Brokerage | Invested | Current | Net P&L | Gross P&L
 *
 * Net P&L and Current are already computed by Sheets formulas → display as-is.
 * No need to recalculate here (they are not the same bug as Holdings Data).
 */

COMPONENTS.init('investments', 'INVESTMENTS');

const INV_HEADERS_DISPLAY = [
  'Company', 'Ticker', 'Date', 'Order Price', 'Qty',
  'Current Price', 'Brokerage', 'Invested', 'Current', 'Net P&L', 'Gross P&L',
];
const INV_HEADERS_RAW = [
  'Company Name', 'Ticker', 'Date', 'Order Price', 'Filled Qty',
  'Current Price', 'Buying Brokerage', 'Invested', 'Current', 'Net P&L', 'Gross P&L',
];

let _holdRows = [];
let _ipoRows  = [];

async function loadInvestments(refresh = false) {
  COMPONENTS.showLoader('Loading investments…');
  COMPONENTS.setConn('loading', 'Fetching…');
  COMPONENTS.hideError();

  try {
    const data = await SHEETS.load(refresh);
    _holdRows = SHEETS.getInvestmentsHoldings(data).rows || [];
    _ipoRows  = SHEETS.getInvestmentsIPOs(data).rows     || [];

    renderInvKPIs();
    filterInvHold();
    filterInvIpo();

    COMPONENTS.setStreaks(UTILS.computeStreaks([], []));
    COMPONENTS.setConn('live', 'Live · ' + new Date().toLocaleTimeString('en-IN'));
    COMPONENTS.setLastSync();
  } catch (err) {
    COMPONENTS.showError('Failed: ' + err.message);
    COMPONENTS.setConn('error', 'Error');
    console.error(err);
  }

  COMPONENTS.hideLoader();
}

// ─── KPI cards ───────────────────────────────────────────────────────────────
function renderInvKPIs() {
  let holdInv = 0, holdCur = 0, holdPnl = 0;
  _holdRows.forEach(r => {
    holdInv += UTILS.toNum(r['Invested']);
    holdCur += UTILS.toNum(r['Current']);
    holdPnl += UTILS.toNum(r['Net P&L']);
  });

  let ipoInv = 0, ipoCur = 0, ipoPnl = 0;
  _ipoRows.forEach(r => {
    ipoInv += UTILS.toNum(r['Invested']);
    ipoCur += UTILS.toNum(r['Current']);
    ipoPnl += UTILS.toNum(r['Net P&L']);
  });

  const totalInv = holdInv + ipoInv;
  const totalPnl = holdPnl + ipoPnl;
  const totalPct = totalInv > 0 ? (totalPnl / totalInv * 100) : 0;

  const kpis = [
    { label: 'Holdings Invested',  value: UTILS.currency(holdInv), cls: '',                            card: 'c-accent', sub: `${_holdRows.length} transactions` },
    { label: 'Holdings Current',   value: UTILS.currency(holdCur), cls: 'sky',                         card: 'c-sky',    sub: 'Market value' },
    { label: 'Holdings Net P&L',   value: UTILS.pnl(holdPnl),      cls: holdPnl >= 0 ? 'gain':'loss',  card: holdPnl >= 0 ? 'c-gain':'c-loss', sub: UTILS.pct(holdInv > 0 ? holdPnl/holdInv*100 : 0) },
    { label: 'IPO Invested',       value: UTILS.currency(ipoInv),  cls: '',                            card: 'c-accent', sub: `${_ipoRows.length} IPOs` },
    { label: 'IPO Current',        value: UTILS.currency(ipoCur),  cls: 'sky',                         card: 'c-sky',    sub: 'Market value' },
    { label: 'IPO Net P&L',        value: UTILS.pnl(ipoPnl),       cls: ipoPnl >= 0 ? 'gain':'loss',   card: ipoPnl >= 0 ? 'c-gain':'c-loss', sub: UTILS.pct(ipoInv > 0 ? ipoPnl/ipoInv*100 : 0) },
    { label: 'Combined Invested',  value: UTILS.currency(totalInv), cls: '',                           card: 'c-accent', sub: 'Holdings + IPOs' },
    { label: 'Combined P&L',       value: UTILS.pnl(totalPnl),     cls: totalPnl >= 0 ? 'gain':'loss', card: totalPnl >= 0 ? 'c-gain':'c-loss', sub: UTILS.pct(totalPct) + ' return' },
  ];

  document.getElementById('invKpis').innerHTML = kpis.map(k => `
    <div class="kpi-card ${k.card}">
      <div class="kpi-label">${k.label}</div>
      <div class="kpi-value ${k.cls}">${k.value}</div>
      <div class="kpi-sub">${k.sub}</div>
    </div>`).join('');
}

// ─── Investment table renderer ────────────────────────────────────────────────
function renderInvTable(rows, containerId, countId, searchVal) {
  const q = (searchVal || '').toLowerCase();
  const filtered = rows.filter(r => {
    const name   = String(r['Company Name'] || '').toLowerCase();
    const ticker = String(r['Ticker']       || '').toLowerCase();
    return !q || name.includes(q) || ticker.includes(q);
  });

  const el = document.getElementById(countId);
  if (el) el.textContent = filtered.length + ' rows';

  const headHtml = INV_HEADERS_DISPLAY.map(h => `<th>${UTILS.esc(h)}</th>`).join('');

  const bodyHtml = filtered.length === 0
    ? `<tr class="empty-row"><td colspan="${INV_HEADERS_DISPLAY.length}">No records</td></tr>`
    : filtered.map(row => {
        const cells = INV_HEADERS_RAW.map((rh, i) => {
          const v = row[rh];
          const n = UTILS.toNum(v);
          const h = rh.toLowerCase();

          if (h.includes('p&l')) {
            if (isNaN(n) || n === 0) return `<td class="cell-dim">—</td>`;
            return `<td class="${UTILS.pnlClass(n)}">${UTILS.pnl(n)}</td>`;
          }
          if (h.includes('price') || h.includes('brokerage') || h.includes('invest') || h.includes('current')) {
            if (isNaN(n) || n === 0) return `<td class="cell-dim">—</td>`;
            return `<td class="cell-muted">${UTILS.currency(n)}</td>`;
          }
          if (h.includes('qty') || h.includes('filled')) return `<td class="cell-muted">${UTILS.qty(v)}</td>`;
          if (h.includes('date')) return `<td class="cell-dim">${UTILS.date(v)}</td>`;
          return `<td>${UTILS.esc(UTILS.plain(v))}</td>`;
        }).join('');
        return `<tr>${cells}</tr>`;
      }).join('');

  document.getElementById(containerId).innerHTML = `
    <div class="table-scroll">
      <table>
        <thead><tr>${headHtml}</tr></thead>
        <tbody>${bodyHtml}</tbody>
      </table>
    </div>`;
}

function filterInvHold() {
  const q = document.getElementById('invHoldSearch')?.value || '';
  renderInvTable(_holdRows, 'invHoldTable', 'invHoldCount', q);
}

function filterInvIpo() {
  const q = document.getElementById('invIpoSearch')?.value || '';
  renderInvTable(_ipoRows, 'invIpoTable', 'invIpoCount', q);
}

// ─── Sub-tab switch ───────────────────────────────────────────────────────────
function showSubTab(btn, targetId) {
  document.querySelectorAll('.sub-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.sub-section').forEach(s => s.style.display = 'none');
  const target = document.getElementById(targetId);
  if (target) target.style.display = 'block';
}

COMPONENTS.onRefresh(() => loadInvestments(true));
loadInvestments();
setInterval(() => loadInvestments(true), CONFIG.AUTO_REFRESH);
