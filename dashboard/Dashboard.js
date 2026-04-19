/**
 * dashboard/Dashboard.js v3
 * NEW: Streak KPI cards, streak sidebar, safe null handling
 */
COMPONENTS.init('dashboard', 'DASHBOARD');

async function loadDashboard(refresh = false) {
  COMPONENTS.showLoader('Fetching portfolio data…');
  COMPONENTS.setConn('loading', 'Connecting…');
  COMPONENTS.hideError();
  try {
    const data    = await SHEETS.load(refresh);
    const foRows  = (SHEETS.getFO(data).rows)               || [];
    const holdRows= (SHEETS.getHoldingsData(data).rows)     || [];
    const logRows = (SHEETS.getTradeLog(data).rows)         || [];

    const streaks = UTILS.computeStreaks(foRows, logRows);
    COMPONENTS.setStreaks(streaks);

    renderKPIs(foRows, holdRows, logRows, streaks);
    renderFOSummary(foRows);
    renderCumPnlChart(foRows);
    renderWinLossChart(foRows);
    renderDailyPnlChart(foRows);
    renderHoldingsSnap(holdRows);

    COMPONENTS.setConn('live', 'Live · ' + new Date().toLocaleTimeString('en-IN'));
    COMPONENTS.setLastSync();
  } catch (err) {
    console.error('[Dashboard]', err);
    COMPONENTS.showError('Could not load: ' + err.message);
    COMPONENTS.setConn('error', 'Connection failed');
  }
  COMPONENTS.hideLoader();
}

// Safe getter — avoids ?? + || mixing
function g(row, key, fallback) {
  const v = row[key];
  if (v !== null && v !== undefined && v !== '') return v;
  return (fallback !== undefined) ? fallback : null;
}

function renderKPIs(foRows, holdRows, logRows, streaks) {
  const fo = UTILS.computeFOMetrics(foRows);
  const C  = CONFIG.HOLDINGS_DATA;

  let totalInvested = 0, totalCurrent = 0;
  holdRows.forEach(row => {
    totalInvested += UTILS.toNum(g(row, 'Total Invested', 0));
    totalCurrent  += UTILS.toNum(g(row, 'Current Value',  0));
  });
  const holdPnl = totalCurrent - totalInvested;
  const holdPct = totalInvested > 0 ? (holdPnl / totalInvested * 100) : 0;

  let logNetPnl = 0;
  logRows.forEach(r => { logNetPnl += UTILS.toNum(r['Net P&L']); });

  const ts = streaks.trade;
  const ds = streaks.day;

  const kpis = [
    { label: 'F&O Net P&L (My Calc)', value: UTILS.pnl(fo.myCalcPnl),     cls: fo.myCalcPnl >= 0 ? 'gain':'loss',   card: fo.myCalcPnl >= 0 ? 'c-gain':'c-loss', sub: fo.totalTrades + ' trades · ' + fo.wins + 'W ' + fo.losses + 'L' },
    { label: 'F&O Actual (Mail P&L)', value: UTILS.pnl(fo.mailPnl),        cls: fo.mailPnl >= 0 ? 'gain':'loss',     card: fo.mailPnl >= 0 ? 'c-gain':'c-loss',   sub: 'Tax leakage: ' + UTILS.pnl(fo.taxLeakage) },
    { label: 'Win Rate',              value: fo.winRate + '%',              cls: +fo.winRate >= 50 ? 'gain':'loss',   card: +fo.winRate >= 50 ? 'c-gain':'c-loss',  sub: 'Win factor: ' + fo.winFactor },
    { label: 'In Demat (F&O)',        value: UTILS.currency(fo.inDemat),    cls: fo.inDemat >= 50000 ? 'gain':'loss', card: 'c-sky',   sub: '₹50,000 capital base' },
    { label: 'Holdings Invested',     value: UTILS.currency(totalInvested), cls: '',                                  card: 'c-accent',sub: holdRows.length + ' stocks' },
    { label: 'Holdings Current',      value: UTILS.currency(totalCurrent),  cls: 'sky',                               card: 'c-sky',   sub: 'Market value' },
    { label: 'Unrealised P&L',        value: UTILS.pnl(holdPnl),            cls: holdPnl >= 0 ? 'gain':'loss',       card: holdPnl >= 0 ? 'c-gain':'c-loss', sub: UTILS.pct(holdPct) + ' return' },
    { label: 'Trade Log Net P&L',     value: UTILS.pnl(logNetPnl),          cls: logNetPnl >= 0 ? 'gain':'loss',     card: logNetPnl >= 0 ? 'c-gain':'c-loss', sub: logRows.length + ' log entries' },
    { label: 'Charges Paid (F&O)',    value: UTILS.currency(fo.totalCharges),cls: 'loss',                             card: 'c-loss',  sub: 'Gross P&L impact' },
    { label: '📈 Trade Streak',       value: ts.label || '—',               cls: ts.type === 'win' ? 'gain' : ts.type === 'loss' ? 'loss' : '', card: ts.type === 'win' ? 'c-gain' : ts.type === 'loss' ? 'c-loss' : 'c-sky', sub: 'Consecutive trades' },
    { label: '📅 Day Streak',         value: ds.label || '—',               cls: ds.type === 'win' ? 'gain' : ds.type === 'loss' ? 'loss' : '', card: ds.type === 'win' ? 'c-gain' : ds.type === 'loss' ? 'c-loss' : 'c-sky', sub: 'Consecutive trading days' },
  ];

  document.getElementById('kpiCards').innerHTML = kpis.map(k => `
    <div class="kpi-card ${k.card}">
      <div class="kpi-label">${k.label}</div>
      <div class="kpi-value ${k.cls}">${k.value}</div>
      <div class="kpi-sub">${k.sub}</div>
    </div>`).join('');
}

function renderFOSummary(rows) {
  const fo = UTILS.computeFOMetrics(rows);
  document.getElementById('foSummaryBar').innerHTML = `
    <span>Phase I Goal: <b>0 &lt;= ${UTILS.currency(fo.myCalcPnl)}</b></span>
    <span>In Demat: <b class="${fo.inDemat >= 50000 ? 'd-gain':'d-loss'}">${UTILS.currency(fo.inDemat)}</b></span>
    <span>| My Calc: <b class="${fo.myCalcPnl >= 0 ? 'd-gain':'d-loss'}">${UTILS.pnl(fo.myCalcPnl)}</b></span>
    <span>| Actual Mail: <b class="${fo.mailPnl >= 0 ? 'd-gain':'d-loss'}">${UTILS.pnl(fo.mailPnl)}</b></span>
    <span>| Tax Leakage: <b class="d-loss">${UTILS.pnl(fo.taxLeakage)}</b></span>
    <span>| Gross Wins: <b class="d-gain">${UTILS.pnl(fo.grossWins)}</b></span>
    <span>| Gross Losses: <b class="d-loss">${UTILS.pnl(fo.grossLosses)}</b></span>
    <span>| Win Factor: <b class="d-sky">${fo.winFactor}</b></span>
    <span>| Total In: <b>${UTILS.currency(fo.totalIn)}</b></span>
    <span>| Total Out: <b>${UTILS.currency(fo.totalOut)}</b></span>`;
}

function renderCumPnlChart(rows) {
  try {
    const byDate = {};
    rows.forEach(r => {
      const d = UTILS.isoDate(r['Date'] || '');
      if (!d) return;
      byDate[d] = (byDate[d] || 0) + UTILS.toNum(r['Net P&L']);
    });
    const sorted = Object.entries(byDate).sort((a,b) => a[0] < b[0] ? -1 : 1);
    let cum = 0;
    const labels = sorted.map(([d]) => d);
    const values = sorted.map(([,v]) => { cum += v; return +cum.toFixed(2); });
    const K = COMPONENTS.CHART;
    K.destroy('cumPnl');
    const ctx = document.getElementById('chartCumPnl');
    if (!ctx) return;
    K.save('cumPnl', new Chart(ctx, {
      type: 'line',
      data: { labels, datasets: [{ data: values, borderColor: K.accentColor, backgroundColor: c2 => { const gg = c2.chart.ctx.createLinearGradient(0,0,0,280); gg.addColorStop(0,'rgba(0,210,170,0.18)'); gg.addColorStop(1,'rgba(0,210,170,0.01)'); return gg; }, borderWidth:2,fill:true,tension:0.35,pointRadius:2,pointHoverRadius:6,pointBackgroundColor:K.accentColor }] },
      options: { responsive:true, maintainAspectRatio:false, plugins:{ legend:{display:false}, tooltip:{...K.tooltip,callbacks:{label:c=>' '+UTILS.pnl(c.raw)}} }, scales:{x:K.axes(),y:K.axes()} }
    }));
  } catch(e) { console.error('[Dashboard] cumPnl:', e); }
}

function renderWinLossChart(rows) {
  try {
    const fo = UTILS.computeFOMetrics(rows);
    const K  = COMPONENTS.CHART;
    K.destroy('winLoss');
    const ctx = document.getElementById('chartWinLoss');
    if (!ctx) return;
    K.save('winLoss', new Chart(ctx, {
      type: 'doughnut',
      data: { labels:['Wins','Losses','Breakeven'], datasets:[{ data:[fo.wins,fo.losses,fo.breakeven], backgroundColor:['rgba(74,222,128,0.72)','rgba(248,113,113,0.72)','rgba(56,189,248,0.45)'], borderColor:[K.gainColor,K.lossColor,K.skyColor], borderWidth:1,hoverOffset:8 }] },
      options: { responsive:true,maintainAspectRatio:false,cutout:'65%', plugins:{ legend:{display:true,position:'right',labels:{color:'#3d6572',font:{family:"'JetBrains Mono',monospace",size:10},boxWidth:10,padding:12}}, tooltip:K.tooltip } }
    }));
  } catch(e) { console.error('[Dashboard] winLoss:', e); }
}

function renderDailyPnlChart(rows) {
  try {
    const byDate = {};
    rows.forEach(r => {
      const d = UTILS.isoDate(r['Date'] || '');
      if (!d) return;
      byDate[d] = (byDate[d] || 0) + UTILS.toNum(r['Net P&L']);
    });
    const sorted = Object.entries(byDate).sort((a,b) => a[0] < b[0] ? -1 : 1).slice(-30);
    const vals = sorted.map(([,v]) => +v.toFixed(2));
    const { bg, border } = COMPONENTS.CHART.pnlBarColors(vals);
    const K = COMPONENTS.CHART;
    K.destroy('dailyPnl');
    const ctx = document.getElementById('chartDailyPnl');
    if (!ctx) return;
    K.save('dailyPnl', new Chart(ctx, {
      type: 'bar',
      data: { labels:sorted.map(([d])=>d.slice(5)), datasets:[{data:vals,backgroundColor:bg,borderColor:border,borderWidth:1,borderRadius:3}] },
      options: { responsive:true,maintainAspectRatio:false, plugins:{legend:{display:false},tooltip:{...K.tooltip,callbacks:{label:c=>' '+UTILS.pnl(c.raw)}}}, scales:{x:K.axes(),y:K.axes()} }
    }));
  } catch(e) { console.error('[Dashboard] dailyPnl:', e); }
}

function renderHoldingsSnap(rows) {
  const C = CONFIG.HOLDINGS_DATA;
  const sorted = [...(rows || [])]
    .sort((a,b) => UTILS.toNum(g(b,'Current Value',0)) - UTILS.toNum(g(a,'Current Value',0)))
    .slice(0, 8);
  const tbody = document.getElementById('holdingsSnap');
  if (!sorted.length) { tbody.innerHTML = '<tr class="empty-row"><td colspan="8">No holdings data</td></tr>'; return; }
  tbody.innerHTML = sorted.map(row => {
    const inv    = UTILS.toNum(g(row, 'Total Invested', 0));
    const cur    = UTILS.toNum(g(row, 'Current Value',  0));
    const netPnl = cur - inv;
    const pct    = inv > 0 ? (netPnl / inv * 100) : 0;
    const signal = g(row,'Master Sentinel', g(row,'Sentinel Recommendation', '')) || '';
    return `<tr>
      <td>${UTILS.esc(UTILS.plain(g(row,'Company Name','')))}</td>
      <td class="cell-dim">${UTILS.esc(UTILS.plain(g(row,'Symble','')))}</td>
      <td class="cell-dim">${UTILS.esc(UTILS.plain(g(row,'Sector','')))}</td>
      <td class="cell-muted">${UTILS.currency(inv)}</td>
      <td class="cell-muted">${UTILS.currency(cur)}</td>
      <td class="${UTILS.pnlClass(netPnl)}">${UTILS.pnl(netPnl)}</td>
      <td class="${UTILS.pnlClass(pct)}">${UTILS.pct(pct)}</td>
      <td>${UTILS.sentinelBadge(signal)}</td>
    </tr>`;
  }).join('');
}

COMPONENTS.onRefresh(() => loadDashboard(true));
loadDashboard();
setInterval(() => loadDashboard(true), CONFIG.AUTO_REFRESH);
