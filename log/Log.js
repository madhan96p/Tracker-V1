/**
 * log/Log.js
 * ─────────────────────────────────────────────
 * Displays the Trade_Transaction_Log table from the Investments sheet.
 *
 * Headers (confirmed):
 *   Sl. No | Date | Entry Price | Exit Price | Qty
 *   Total In | Total Out | Gross P&L | Net P&L | Total
 *
 * "Total" = running cumulative balance (starts at ₹25,000 per user's formula:
 *   Row 1: =25000 + Net P&L
 *   Row N: =prev_Total + Net P&L
 *
 * Formula note from user:
 *   Total In  = Qty × Avg Entry Price (summed per day)
 *   Total Out = Qty × Avg Exit Price  (summed per day)
 *   Net P&L   = SUMIFS of all trades for that day
 *   This is a DAILY aggregated log, not per-trade.
 */

COMPONENTS.init('log', 'TRADE LOG');

const LOG_HEADERS_DISPLAY = [
  'Sl.No', 'Date', 'Entry Price', 'Exit Price', 'Qty',
  'Total In', 'Total Out', 'Gross P&L', 'Net P&L', 'Running Total',
];
const LOG_HEADERS_RAW = [
  'Sl. No', 'Date', 'Entry Price', 'Exit Price', 'Qty',
  'Total In', 'Total Out', 'Gross P&L', 'Net P&L', 'Total',
];

let _logRows = [];

async function loadLog(refresh = false) {
  COMPONENTS.showLoader('Loading trade log…');
  COMPONENTS.setConn('loading', 'Fetching…');
  COMPONENTS.hideError();

  try {
    const data = await SHEETS.load(refresh);
    _logRows = SHEETS.getTradeLog(data).rows || [];

    renderLogKPIs(_logRows);
    renderRunTotalChart(_logRows);
    filterLog();

    COMPONENTS.setStreaks(UTILS.computeStreaks([], _logRows));
    COMPONENTS.setConn('live', 'Live · ' + new Date().toLocaleTimeString('en-IN'));
    COMPONENTS.setLastSync();
  } catch (err) {
    COMPONENTS.showError('Failed: ' + err.message);
    COMPONENTS.setConn('error', 'Error');
    console.error(err);
  }

  COMPONENTS.hideLoader();
}

function renderLogKPIs(rows) {
  let totalNetPnl = 0, totalGrossPnl = 0, totalIn = 0, totalOut = 0;
  let wins = 0, losses = 0;
  const lastRow = rows[rows.length - 1];

  rows.forEach(r => {
    totalNetPnl   += UTILS.toNum(r['Net P&L']);
    totalGrossPnl += UTILS.toNum(r['Gross P&L']);
    totalIn       += UTILS.toNum(r['Total In']);
    totalOut      += UTILS.toNum(r['Total Out']);
    const n = UTILS.toNum(r['Net P&L']);
    if (n > 0) wins++; else if (n < 0) losses++;
  });

  const runningTotal = lastRow ? UTILS.toNum(lastRow['Total']) : 0;

  const kpis = [
    { label: 'Days Traded',       value: rows.length,                  cls: '', card: 'c-sky', sub: `${wins}W · ${losses}L days` },
    { label: 'Total Net P&L',     value: UTILS.pnl(totalNetPnl),       cls: totalNetPnl >= 0 ? 'gain' : 'loss', card: totalNetPnl >= 0 ? 'c-gain' : 'c-loss', sub: 'SUM(Log[Net P&L])' },
    { label: 'Total Gross P&L',   value: UTILS.pnl(totalGrossPnl),     cls: totalGrossPnl >= 0 ? 'gain' : 'loss', card: 'c-accent', sub: 'Before charges' },
    { label: 'Running Balance',   value: UTILS.currency(runningTotal),  cls: runningTotal >= 25000 ? 'gain' : 'loss', card: runningTotal >= 25000 ? 'c-gain' : 'c-loss', sub: 'Final portfolio value' },
    { label: 'Total Capital In',  value: UTILS.currency(totalIn),       cls: '', card: 'c-accent', sub: 'Σ(Qty × Entry)' },
    { label: 'Total Capital Out', value: UTILS.currency(totalOut),      cls: '', card: 'c-sky',    sub: 'Σ(Qty × Exit)' },
  ];

  document.getElementById('logKpis').innerHTML = kpis.map(k => `
    <div class="kpi-card ${k.card}">
      <div class="kpi-label">${k.label}</div>
      <div class="kpi-value ${k.cls}">${k.value}</div>
      <div class="kpi-sub">${k.sub}</div>
    </div>`).join('');
}

// ─── Running Total chart ──────────────────────────────────────────────────────
function renderRunTotalChart(rows) {
  const labels = rows.map(r => UTILS.dateShort(r['Date']));
  const values = rows.map(r => UTILS.toNum(r['Total']));
  const K = COMPONENTS.CHART;
  K.destroy('runTotal');

  K.save('runTotal', new Chart(document.getElementById('chartRunTotal'), {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data: values,
        borderColor: K.skyColor,
        backgroundColor: ctx2 => {
          const g = ctx2.chart.ctx.createLinearGradient(0, 0, 0, 200);
          g.addColorStop(0, 'rgba(56,189,248,0.18)');
          g.addColorStop(1, 'rgba(56,189,248,0.01)');
          return g;
        },
        borderWidth: 2, fill: true, tension: 0.3,
        pointRadius: 3, pointHoverRadius: 7,
        pointBackgroundColor: K.skyColor,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { ...K.tooltip, callbacks: { label: c => ' ' + UTILS.currency(c.raw) } }
      },
      scales: {
        x: K.axes(),
        y: {
          ...K.axes(),
          ticks: { ...K.axes().ticks, callback: v => '₹' + (v/1000).toFixed(0) + 'k' }
        }
      }
    }
  }));
}

// ─── Filter + render ──────────────────────────────────────────────────────────
function filterLog() {
  const q = (document.getElementById('logSearch')?.value || '').toLowerCase();
  const filtered = q
    ? _logRows.filter(r => UTILS.isoDate(r['Date']).includes(q))
    : _logRows;

  document.getElementById('logCount').textContent = filtered.length + ' rows';

  const headHtml = LOG_HEADERS_DISPLAY.map(h => `<th>${UTILS.esc(h)}</th>`).join('');
  const bodyHtml = filtered.length === 0
    ? `<tr class="empty-row"><td colspan="${LOG_HEADERS_DISPLAY.length}">No log entries</td></tr>`
    : filtered.map(row => {
        const cells = LOG_HEADERS_RAW.map(rh => {
          const v = row[rh];
          const n = UTILS.toNum(v);
          const h = rh.toLowerCase();

          if (h === 'total')                    return `<td class="total-col">${UTILS.currency(n)}</td>`;
          if (h.includes('p&l')) {
            if (isNaN(n) || n === 0) return `<td class="cell-dim">—</td>`;
            return `<td class="${UTILS.pnlClass(n)}">${UTILS.pnl(n)}</td>`;
          }
          if (h.includes('total in') || h.includes('total out') || h.includes('price'))
            return `<td class="cell-muted">${isNaN(n) ? UTILS.plain(v) : UTILS.currency(n)}</td>`;
          if (h.includes('qty'))   return `<td class="cell-muted">${UTILS.qty(v)}</td>`;
          if (h.includes('date'))  return `<td class="cell-dim">${UTILS.date(v)}</td>`;
          if (h.includes('sl') || h.includes('no')) return `<td class="cell-dim">${UTILS.plain(v)}</td>`;
          return `<td>${UTILS.esc(UTILS.plain(v))}</td>`;
        }).join('');
        return `<tr>${cells}</tr>`;
      }).join('');

  document.getElementById('logTable').innerHTML = `
    <div class="table-scroll">
      <table>
        <thead><tr>${headHtml}</tr></thead>
        <tbody>${bodyHtml}</tbody>
      </table>
    </div>`;
}

COMPONENTS.onRefresh(() => loadLog(true));
loadLog();
setInterval(() => loadLog(true), CONFIG.AUTO_REFRESH);
