/**
 * dashboard/Dashboard.js
 * ─────────────────────────────────────────────
 * Renders KPI cards, F&O summary bar, and charts.
 * All calculations are derived from raw sheet data.
 */

COMPONENTS.init('dashboard', 'DASHBOARD');

async function loadDashboard(refresh = false) {
  COMPONENTS.showLoader('Fetching portfolio data…');
  COMPONENTS.setConn('loading', 'Connecting…');
  COMPONENTS.hideError();

  try {
    const data = await SHEETS.load(refresh);

    const foData      = SHEETS.getFO(data);
    const holdData    = SHEETS.getHoldingsData(data);
    const invHoldings = SHEETS.getInvestmentsHoldings(data);
    const invIPOs     = SHEETS.getInvestmentsIPOs(data);
    const tradeLog    = SHEETS.getTradeLog(data);

    renderKPIs(foData, holdData, invHoldings, invIPOs, tradeLog);
    renderFOSummary(foData.rows);
    renderCumPnlChart(foData.rows);
    renderWinLossChart(foData.rows);
    renderDailyPnlChart(foData.rows);
    renderHoldingsSnap(holdData.rows);

    COMPONENTS.setConn('live', 'Live · ' + new Date().toLocaleTimeString('en-IN'));
    COMPONENTS.setLastSync();

  } catch (err) {
    console.error(err);
    COMPONENTS.showError('Could not load data: ' + err.message);
    COMPONENTS.setConn('error', 'Connection failed');
  }

  COMPONENTS.hideLoader();
}

// ─── KPI Cards ──────────────────────────────────────────────────────────────
function renderKPIs(foData, holdData, invHoldings, invIPOs, tradeLog) {
  const fo = UTILS.computeFOMetrics(foData.rows);

  // Holdings Data: use confirmed column indices from config
  const C = CONFIG.HOLDINGS_DATA;
  let totalInvested = 0, totalCurrent = 0;
  (holdData.rows || []).forEach(row => {
    const inv = UTILS.toNum(row['Total Invested'] ?? row[C.totalInvested]);
    const cur = UTILS.toNum(row['Current Value']  ?? row[C.currentValue]);
    totalInvested += inv;
    totalCurrent  += cur;
  });
  const holdPnl = totalCurrent - totalInvested;
  const holdPct = totalInvested > 0 ? (holdPnl / totalInvested * 100) : 0;

  // Investments holdings & IPOs sum
  let invTotalInvested = 0;
  (invHoldings.rows || []).forEach(r => {
    invTotalInvested += UTILS.toNum(r['Invested']);
  });
  (invIPOs.rows || []).forEach(r => {
    invTotalInvested += UTILS.toNum(r['Invested']);
  });

  // Trade log net P&L
  let logNetPnl = 0;
  (tradeLog.rows || []).forEach(r => {
    logNetPnl += UTILS.toNum(r['Net P&L']);
  });

  const kpis = [
    {
      label: 'F&O Net P&L (My Calc)',
      value: UTILS.pnl(fo.myCalcPnl),
      cls:   fo.myCalcPnl >= 0 ? 'gain' : 'loss',
      sub:   `${fo.totalTrades} trades · ${fo.wins}W ${fo.losses}L`,
      card:  fo.myCalcPnl >= 0 ? 'c-gain' : 'c-loss',
    },
    {
      label: 'F&O Actual (Mail P&L)',
      value: UTILS.pnl(fo.mailPnl),
      cls:   fo.mailPnl >= 0 ? 'gain' : 'loss',
      sub:   `Tax leakage: ${UTILS.pnl(fo.taxLeakage)}`,
      card:  fo.mailPnl >= 0 ? 'c-gain' : 'c-loss',
    },
    {
      label: 'Win Rate',
      value: fo.winRate + '%',
      cls:   parseFloat(fo.winRate) >= 50 ? 'gain' : 'loss',
      sub:   `Win factor: ${fo.winFactor}`,
      card:  parseFloat(fo.winRate) >= 50 ? 'c-gain' : 'c-loss',
    },
    {
      label: 'In Demat (F&O)',
      value: UTILS.currency(fo.inDemat),
      cls:   fo.inDemat >= 50000 ? 'gain' : 'loss',
      sub:   `₹50,000 capital base`,
      card:  'c-sky',
    },
    {
      label: 'Holdings Invested',
      value: UTILS.currency(totalInvested),
      cls:   '',
      sub:   `${(holdData.rows || []).length} stocks`,
      card:  'c-accent',
    },
    {
      label: 'Holdings Current',
      value: UTILS.currency(totalCurrent),
      cls:   'sky',
      sub:   'Market value',
      card:  'c-sky',
    },
    {
      label: 'Unrealised P&L',
      value: UTILS.pnl(holdPnl),
      cls:   holdPnl >= 0 ? 'gain' : 'loss',
      sub:   UTILS.pct(holdPct) + ' return',
      card:  holdPnl >= 0 ? 'c-gain' : 'c-loss',
    },
    {
      label: 'Trade Log Net P&L',
      value: UTILS.pnl(logNetPnl),
      cls:   logNetPnl >= 0 ? 'gain' : 'loss',
      sub:   `${(tradeLog.rows || []).length} log entries`,
      card:  logNetPnl >= 0 ? 'c-gain' : 'c-loss',
    },
    {
      label: 'Charges Paid (F&O)',
      value: UTILS.currency(fo.totalCharges),
      cls:   'loss',
      sub:   `Gross P&L impact`,
      card:  'c-loss',
    },
  ];

  document.getElementById('kpiCards').innerHTML = kpis.map(k => `
    <div class="kpi-card ${k.card}">
      <div class="kpi-label">${k.label}</div>
      <div class="kpi-value ${k.cls}">${k.value}</div>
      <div class="kpi-sub">${k.sub}</div>
    </div>`).join('');
}

// ─── F&O Summary Bar ────────────────────────────────────────────────────────
function renderFOSummary(rows) {
  const fo = UTILS.computeFOMetrics(rows);
  const items = [
    { label: 'Total In',    val: UTILS.currency(fo.totalIn),     cls: '' },
    { sep: true },
    { label: 'Total Out',   val: UTILS.currency(fo.totalOut),    cls: '' },
    { sep: true },
    { label: 'Gross Wins',  val: UTILS.pnl(fo.grossWins),        cls: 'gain' },
    { sep: true },
    { label: 'Gross Losses',val: UTILS.pnl(fo.grossLosses),      cls: 'loss' },
    { sep: true },
    { label: 'Win Factor',  val: fo.winFactor,                    cls: 'sky' },
    { sep: true },
    { label: 'Charges',     val: UTILS.currency(fo.totalCharges), cls: 'loss' },
  ];

  document.getElementById('foSummaryBar').innerHTML = items.map(item =>
    item.sep
      ? '<div class="fs-sep"></div>'
      : `<div class="fs-item">${item.label}: <span class="fs-val ${item.cls}">${item.val}</span></div>`
  ).join('');
}

// ─── Chart: Cumulative P&L ──────────────────────────────────────────────────
function renderCumPnlChart(rows) {
  const byDate = {};
  rows.forEach(r => {
    const d = UTILS.isoDate(r['Date'] ?? r[CONFIG.FO.date]);
    if (!d) return;
    byDate[d] = (byDate[d] || 0) + UTILS.toNum(r['Net P&L'] ?? r[CONFIG.FO.netPnl]);
  });
  const sorted = Object.entries(byDate).sort((a,b) => a[0] < b[0] ? -1 : 1);
  let cum = 0;
  const labels = sorted.map(([d]) => d);
  const values = sorted.map(([,v]) => { cum += v; return +cum.toFixed(2); });

  const K = COMPONENTS.CHART;
  K.destroy('cumPnl');
  const ctx = document.getElementById('chartCumPnl');
  K.save('cumPnl', new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data: values,
        borderColor: K.accentColor,
        backgroundColor: ctx2 => {
          const g = ctx2.chart.ctx.createLinearGradient(0,0,0,280);
          g.addColorStop(0, 'rgba(0,210,170,0.18)');
          g.addColorStop(1, 'rgba(0,210,170,0.01)');
          return g;
        },
        borderWidth: 2, fill: true, tension: 0.35,
        pointRadius: 2, pointHoverRadius: 6,
        pointBackgroundColor: K.accentColor,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { ...K.tooltip, callbacks: { label: c => ' ' + UTILS.pnl(c.raw) } } },
      scales: { x: K.axes(), y: K.axes() }
    }
  }));
}

// ─── Chart: Win/Loss Donut ──────────────────────────────────────────────────
function renderWinLossChart(rows) {
  const fo = UTILS.computeFOMetrics(rows);
  const K  = COMPONENTS.CHART;
  K.destroy('winLoss');
  K.save('winLoss', new Chart(document.getElementById('chartWinLoss'), {
    type: 'doughnut',
    data: {
      labels: ['Wins', 'Losses', 'Breakeven'],
      datasets: [{
        data: [fo.wins, fo.losses, fo.breakeven],
        backgroundColor: ['rgba(74,222,128,0.72)', 'rgba(248,113,113,0.72)', 'rgba(56,189,248,0.45)'],
        borderColor:     [K.gainColor, K.lossColor, K.skyColor],
        borderWidth: 1, hoverOffset: 8,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '65%',
      plugins: {
        legend: { display: true, position: 'right', labels: { color: K.tickColor, font: { family: K.monoFont, size: 10 }, boxWidth: 10, padding: 12 } },
        tooltip: K.tooltip,
      }
    }
  }));
}

// ─── Chart: Daily P&L bar ────────────────────────────────────────────────────
function renderDailyPnlChart(rows) {
  const byDate = {};
  rows.forEach(r => {
    const d = UTILS.isoDate(r['Date'] ?? r[CONFIG.FO.date]);
    if (!d) return;
    byDate[d] = (byDate[d] || 0) + UTILS.toNum(r['Net P&L'] ?? r[CONFIG.FO.netPnl]);
  });
  const sorted = Object.entries(byDate).sort((a,b) => a[0] < b[0] ? -1 : 1).slice(-30);
  const vals   = sorted.map(([,v]) => +v.toFixed(2));
  const { bg, border } = COMPONENTS.CHART.pnlBarColors(vals);
  const K = COMPONENTS.CHART;
  K.destroy('dailyPnl');
  K.save('dailyPnl', new Chart(document.getElementById('chartDailyPnl'), {
    type: 'bar',
    data: {
      labels: sorted.map(([d]) => d.slice(5)),
      datasets: [{ data: vals, backgroundColor: bg, borderColor: border, borderWidth: 1, borderRadius: 3 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { ...K.tooltip, callbacks: { label: c => ' ' + UTILS.pnl(c.raw) } } },
      scales: { x: K.axes(), y: K.axes() }
    }
  }));
}

// ─── Holdings Snapshot Table ─────────────────────────────────────────────────
function renderHoldingsSnap(rows) {
  const C = CONFIG.HOLDINGS_DATA;
  const sorted = [...(rows || [])]
    .sort((a,b) => UTILS.toNum(b['Current Value'] ?? b[C.currentValue]) - UTILS.toNum(a['Current Value'] ?? a[C.currentValue]))
    .slice(0, 8);

  const tbody = document.getElementById('holdingsSnap');
  if (!sorted.length) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="8">No holdings data</td></tr>';
    return;
  }

  tbody.innerHTML = sorted.map(row => {
    const invested = UTILS.toNum(row['Total Invested'] ?? row[C.totalInvested]);
    const current  = UTILS.toNum(row['Current Value']  ?? row[C.currentValue]);
    // ✅ FIXED: Net P&L = Current Value - Total Invested (NOT Brokerage - Invested!)
    const netPnl   = current - invested;
    const pct      = invested > 0 ? (netPnl / invested * 100) : 0;
    const signal   = row['Master Sentinel'] ?? row[C.masterSentinel] ?? row['Sentinel Recommendation'] ?? row[C.sentinel] ?? '';

    return `<tr>
      <td>${UTILS.esc(UTILS.plain(row['Company Name'] ?? row[C.companyName]))}</td>
      <td class="cell-dim">${UTILS.esc(UTILS.plain(row['Symble'] ?? row[C.symbol]))}</td>
      <td class="cell-dim">${UTILS.esc(UTILS.plain(row['Sector'] ?? row[C.sector]))}</td>
      <td class="cell-muted">${UTILS.currency(invested)}</td>
      <td class="cell-muted">${UTILS.currency(current)}</td>
      <td class="${UTILS.pnlClass(netPnl)}">${UTILS.pnl(netPnl)}</td>
      <td class="${UTILS.pnlClass(pct)}">${UTILS.pct(pct)}</td>
      <td>${UTILS.sentinelBadge(signal)}</td>
    </tr>`;
  }).join('');
}

// ─── Boot ────────────────────────────────────────────────────────────────────
COMPONENTS.onRefresh(() => loadDashboard(true));
loadDashboard();
setInterval(() => loadDashboard(true), CONFIG.AUTO_REFRESH);
