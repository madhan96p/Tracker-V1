/**
 * fa/FA.js
 * ─────────────────────────────────────────────
 * Renders the Fundamental Analysis sheet.
 *
 * Key columns and their display logic:
 *
 *  Health Score  — computed in Sheets:
 *    =IF(L>20,2,0) + IF(X<1,2,0) + IF(V<1,2,0) + IF(J>50,2,0)
 *    Max = 8 — colour: ≥6 green, 3-5 amber, <3 red
 *
 *  Final Action  — computed in Sheets:
 *    ≥6 → STRONG BUY, ≥4 → WATCHLIST, else → AVOID
 *
 *  Graham Number = SQRT(22.5 × EPS × Book Value)
 *  Intrinsic Gap % = (LTP − Graham) / Graham
 *    negative = undervalued (green), positive = overvalued (red)
 *
 *  PEG Ratio = P/E ÷ Profit Growth %
 *    <1 = undervalued (green), >2 = expensive (red)
 *
 *  D/E Ratio  <1 = green, >2 = red
 *  ROE %      >20 = green, <10 = red
 *  Promoter % >50 = good (green), <30 = worry (red)
 */

COMPONENTS.init('fa', 'FUNDAMENTAL ANALYSIS');

// Columns to display (in order) — matches sheet headers exactly
const FA_DISPLAY_COLS = [
  { key: 'Ticker (Input)',   label: 'Ticker',      type: 'plain'    },
  { key: 'Company Name',     label: 'Company',     type: 'plain'    },
  { key: 'LTP (Live Price)', label: 'LTP',         type: 'currency' },
  { key: 'Mkt Cap (Cr)',     label: 'Mkt Cap (Cr)',type: 'num0'     },
  { key: 'EPS (TTM)',        label: 'EPS',         type: 'num2'     },
  { key: 'ROE %',            label: 'ROE %',       type: 'pct_col'  },
  { key: 'ROCE %',           label: 'ROCE %',      type: 'pct_col'  },
  { key: 'P/E Ratio',        label: 'P/E',         type: 'num2'     },
  { key: 'P/B Ratio',        label: 'P/B',         type: 'num2'     },
  { key: 'D/E Ratio',        label: 'D/E',         type: 'de'       },
  { key: 'Promoter %',       label: 'Promoter %',  type: 'promoter' },
  { key: 'Div Yield %',      label: 'Div Yield %', type: 'num2'     },
  { key: 'Graham Number',    label: 'Graham #',    type: 'currency' },
  { key: 'Intrinsic Gap %',  label: 'Gap %',       type: 'gap'      },
  { key: 'PEG Ratio',        label: 'PEG',         type: 'peg'      },
  { key: 'Health Score',     label: 'Health',      type: 'health'   },
  { key: 'Final Action',     label: 'Action',      type: 'action'   },
  { key: 'Yield Quality',    label: 'Yield Q',     type: 'plain'    },
  { key: 'Notes',            label: 'Notes',       type: 'notes'    },
];

let _faRows = [];

async function loadFA(refresh = false) {
  COMPONENTS.showLoader('Loading fundamental data…');
  COMPONENTS.setConn('loading', 'Fetching…');
  COMPONENTS.hideError();

  try {
    const data = await SHEETS.load(refresh);
    const fa = SHEETS.getFA(data);
    _faRows = (fa.rows || []).filter(r => {
      // Skip empty or header-like rows
      const ticker = String(r['Ticker (Input)'] || '').trim();
      return ticker && ticker !== 'Ticker (Input)' && ticker !== '';
    });

    renderFAKPIs(_faRows);
    filterFA();

    COMPONENTS.setConn('live', 'Live · ' + new Date().toLocaleTimeString('en-IN'));
    COMPONENTS.setLastSync();
  } catch (err) {
    COMPONENTS.showError('Failed: ' + err.message);
    COMPONENTS.setConn('error', 'Error');
    console.error(err);
  }

  COMPONENTS.hideLoader();
}

function renderFAKPIs(rows) {
  const strongBuys = rows.filter(r => String(r['Final Action'] || '').includes('STRONG BUY')).length;
  const watchlist  = rows.filter(r => String(r['Final Action'] || '').includes('WATCHLIST')).length;
  const avoid      = rows.filter(r => String(r['Final Action'] || '').includes('AVOID')).length;

  const avgRoe = rows.length
    ? (rows.reduce((s, r) => s + UTILS.toNum(r['ROE %']), 0) / rows.length).toFixed(1)
    : 0;
  const avgDe  = rows.length
    ? (rows.reduce((s, r) => s + UTILS.toNum(r['D/E Ratio']), 0) / rows.length).toFixed(2)
    : 0;

  // Undervalued = Intrinsic Gap % < 0 (LTP < Graham Number)
  const undervalued = rows.filter(r => UTILS.toNum(r['Intrinsic Gap %']) < 0).length;

  const kpis = [
    { label: 'Stocks Tracked',  value: rows.length,       cls: '', card: 'c-sky',   sub: 'FA universe' },
    { label: 'Strong Buy',      value: strongBuys,         cls: 'gain', card: 'c-gain', sub: 'Health Score ≥ 6' },
    { label: 'Watchlist',       value: watchlist,          cls: 'warn', card: 'c-warn', sub: 'Health Score 4–5' },
    { label: 'Avoid',           value: avoid,              cls: 'loss', card: 'c-loss', sub: 'Health Score < 4' },
    { label: 'Undervalued',     value: undervalued,        cls: 'gain', card: 'c-gain', sub: 'LTP < Graham Number' },
    { label: 'Avg ROE %',       value: avgRoe + '%',       cls: +avgRoe > 15 ? 'gain' : 'loss', card: 'c-accent', sub: 'Portfolio average' },
    { label: 'Avg D/E',         value: avgDe,              cls: +avgDe < 1 ? 'gain' : 'loss', card: +avgDe < 1 ? 'c-gain' : 'c-loss', sub: 'Debt/Equity ratio avg' },
  ];

  document.getElementById('faKpis').innerHTML = kpis.map(k => `
    <div class="kpi-card ${k.card}">
      <div class="kpi-label">${k.label}</div>
      <div class="kpi-value ${k.cls}">${k.value}</div>
      <div class="kpi-sub">${k.sub}</div>
    </div>`).join('');
}

// ─── Cell renderer per column type ───────────────────────────────────────────
function renderFACell(val, colDef) {
  const n = UTILS.toNum(val);
  switch (colDef.type) {
    case 'currency':
      return { text: isNaN(n) || n === 0 ? '—' : UTILS.currency(n), cls: 'cell-muted' };
    case 'num2':
      return { text: isNaN(n) ? UTILS.plain(val) : n.toFixed(2), cls: 'cell-muted' };
    case 'num0':
      return { text: isNaN(n) || n === 0 ? '—' : UTILS.qty(n), cls: 'cell-muted' };
    case 'pct_col':
      return { text: isNaN(n) ? '—' : UTILS.pct(n), cls: n > 15 ? 'cell-gain' : n < 8 ? 'cell-loss' : 'cell-muted' };

    case 'de': {
      const cls = n < 1 ? 'cell-gain' : n > 2 ? 'cell-loss' : 'cell-muted';
      return { text: isNaN(n) ? '—' : n.toFixed(2), cls };
    }
    case 'promoter': {
      const cls = n > 50 ? 'cell-gain' : n < 30 ? 'cell-loss' : 'cell-muted';
      return { text: isNaN(n) ? '—' : n.toFixed(1) + '%', cls };
    }
    case 'gap': {
      // Intrinsic Gap % — negative means undervalued
      if (isNaN(n)) return { text: '—', cls: 'cell-dim' };
      const cls = n < 0 ? 'undervalued' : 'overvalued';
      return { text: UTILS.pct(n), cls };
    }
    case 'peg': {
      if (isNaN(n)) return { text: '—', cls: 'cell-dim' };
      const cls = n < 1 ? 'cell-gain' : n > 2 ? 'cell-loss' : 'cell-muted';
      return { text: n.toFixed(2), cls };
    }
    case 'health': {
      if (isNaN(n)) return { text: '—', cls: 'cell-dim' };
      const cls = n >= 6 ? 'health-high' : n >= 3 ? 'health-mid' : 'health-low';
      const bar = '▮'.repeat(n) + '▯'.repeat(Math.max(0, 8 - n));
      return { text: `${n}/8 ${bar}`, cls };
    }
    case 'action':
      return { text: UTILS.plain(val), cls: '', badge: true };
    case 'notes':
      return { text: UTILS.plain(val), cls: 'notes-col' };
    default:
      return { text: UTILS.plain(val), cls: '' };
  }
}

// ─── Filter + render ──────────────────────────────────────────────────────────
function filterFA() {
  const q      = (document.getElementById('faSearch')?.value || '').toLowerCase();
  const action = document.getElementById('faActionFilter')?.value || '';

  const filtered = _faRows.filter(r => {
    const ticker = String(r['Ticker (Input)'] || '').toLowerCase();
    const name   = String(r['Company Name']   || '').toLowerCase();
    const act    = String(r['Final Action']   || '').toUpperCase();

    if (q      && !ticker.includes(q) && !name.includes(q)) return false;
    if (action && !act.includes(action)) return false;
    return true;
  });

  document.getElementById('faCount').textContent = filtered.length + ' rows';

  const headHtml = FA_DISPLAY_COLS.map(c => `<th>${UTILS.esc(c.label)}</th>`).join('');

  const bodyHtml = filtered.length === 0
    ? `<tr class="empty-row"><td colspan="${FA_DISPLAY_COLS.length}">No matches</td></tr>`
    : filtered.map(row => {
        const cells = FA_DISPLAY_COLS.map(col => {
          const val = row[col.key];
          const { text, cls, badge } = renderFACell(val, col);
          const cellCls = badge ? '' : (cls || '');
          const inner = badge ? UTILS.sentinelBadge(text) : UTILS.esc(text);
          return `<td class="${cellCls}">${inner}</td>`;
        }).join('');
        return `<tr>${cells}</tr>`;
      }).join('');

  document.getElementById('faTableWrap').innerHTML = `
    <div class="table-scroll">
      <table>
        <thead><tr>${headHtml}</tr></thead>
        <tbody>${bodyHtml}</tbody>
      </table>
    </div>`;
}

COMPONENTS.onRefresh(() => loadFA(true));
loadFA();
setInterval(() => loadFA(true), CONFIG.AUTO_REFRESH);
