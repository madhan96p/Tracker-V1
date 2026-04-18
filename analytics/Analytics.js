/**
 * analytics/Analytics.js
 * 6 charts: Instrument P&L, Monthly, Volume, Holdings dist, Sector P&L, Calc vs Mail
 */
COMPONENTS.init('analytics', 'ANALYTICS');

async function loadAnalytics(refresh = false) {
  COMPONENTS.showLoader('Building charts…');
  COMPONENTS.setConn('loading', 'Fetching…');
  COMPONENTS.hideError();

  try {
    const data = await SHEETS.load(refresh);
    const fo   = SHEETS.getFO(data);
    const hold = SHEETS.getHoldingsData(data);

    renderInstrumentChart(fo.rows || []);
    renderMonthlyChart(fo.rows || []);
    renderVolumeChart(fo.rows || []);
    renderHoldDistChart(hold.rows || []);
    renderSectorChart(hold.rows || []);
    renderCalcVsMailChart(fo.rows || []);

    COMPONENTS.setConn('live', 'Live · ' + new Date().toLocaleTimeString('en-IN'));
    COMPONENTS.setLastSync();
  } catch (err) {
    COMPONENTS.showError('Failed: ' + err.message);
    COMPONENTS.setConn('error', 'Error');
    console.error(err);
  }

  COMPONENTS.hideLoader();
}

const K = COMPONENTS.CHART;

// ─── 1. Instrument-wise Net P&L (horizontal bar) ─────────────────────────────
function renderInstrumentChart(rows) {
  const byI = {};
  rows.forEach(r => {
    const instr = String(r['Instrument'] || '?').split(/\s+/)[0].toUpperCase();
    byI[instr] = (byI[instr] || 0) + UTILS.toNum(r['Net P&L']);
  });
  const sorted = Object.entries(byI)
    .map(([k, v]) => [k, +v.toFixed(2)])
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .slice(0, 15);

  const vals = sorted.map(([, v]) => v);
  const { bg, border } = K.pnlBarColors(vals);

  K.destroy('instrument');
  K.save('instrument', new Chart(document.getElementById('chartInstrument'), {
    type: 'bar',
    data: {
      labels: sorted.map(([k]) => k),
      datasets: [{ data: vals, backgroundColor: bg, borderColor: border, borderWidth: 1, borderRadius: 3 }],
    },
    options: {
      responsive: true, maintainAspectRatio: false, indexAxis: 'y',
      plugins: { legend: { display: false }, tooltip: { ...K.tooltip, callbacks: { label: c => ' ' + UTILS.pnl(c.raw) } } },
      scales: {
        x: { ...K.axes(), ticks: { ...K.axes().ticks, callback: v => UTILS.pnl(v) } },
        y: { ...K.axes(), ticks: { ...K.axes().ticks, font: { family: K.monoFont, size: 9 } } },
      },
    },
  }));
}

// ─── 2. Monthly P&L bar ───────────────────────────────────────────────────────
function renderMonthlyChart(rows) {
  const byM = {};
  rows.forEach(r => {
    const d = new Date(UTILS.isoDate(r['Date']));
    if (isNaN(d)) return;
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    byM[k] = (byM[k] || 0) + UTILS.toNum(r['Net P&L']);
  });
  const sorted = Object.entries(byM).sort((a, b) => a[0] < b[0] ? -1 : 1);
  const vals = sorted.map(([, v]) => +v.toFixed(2));
  const { bg, border } = K.pnlBarColors(vals);

  K.destroy('monthly');
  K.save('monthly', new Chart(document.getElementById('chartMonthly'), {
    type: 'bar',
    data: {
      labels: sorted.map(([d]) => d),
      datasets: [{ data: vals, backgroundColor: bg, borderColor: border, borderWidth: 1, borderRadius: 4 }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { ...K.tooltip, callbacks: { label: c => ' ' + UTILS.pnl(c.raw) } } },
      scales: { x: K.axes(), y: K.axes() },
    },
  }));
}

// ─── 3. Daily trade volume ────────────────────────────────────────────────────
function renderVolumeChart(rows) {
  const byD = {};
  rows.forEach(r => {
    const d = UTILS.isoDate(r['Date']);
    if (!d) return;
    byD[d] = (byD[d] || 0) + 1;
  });
  const sorted = Object.entries(byD).sort((a, b) => a[0] < b[0] ? -1 : 1);

  K.destroy('volume');
  K.save('volume', new Chart(document.getElementById('chartVolume'), {
    type: 'bar',
    data: {
      labels: sorted.map(([d]) => d.slice(5)),
      datasets: [{
        data: sorted.map(([, v]) => v),
        backgroundColor: 'rgba(56,189,248,0.55)',
        borderColor: K.skyColor,
        borderWidth: 1, borderRadius: 3,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { ...K.tooltip, callbacks: { label: c => ` ${c.raw} trades` } } },
      scales: {
        x: K.axes(),
        y: { ...K.axes(), beginAtZero: true, ticks: { ...K.axes().ticks, stepSize: 1 } },
      },
    },
  }));
}

// ─── 4. Holdings distribution pie ────────────────────────────────────────────
function renderHoldDistChart(rows) {
  const C = CONFIG.HOLDINGS_DATA;
  const validRows = (rows || []).filter(r => UTILS.toNum(r['Current Value'] ?? r[C.currentValue]) > 0);
  const sorted = [...validRows]
    .sort((a, b) => UTILS.toNum(b['Current Value'] ?? b[C.currentValue]) - UTILS.toNum(a['Current Value'] ?? a[C.currentValue]))
    .slice(0, 10);

  const labels = sorted.map(r => String(r['Company Name'] ?? r[C.companyName] || '?').split(' ')[0]);
  const values = sorted.map(r => UTILS.toNum(r['Current Value'] ?? r[C.currentValue]));
  const palette = ['#00d2aa','#38bdf8','#4ade80','#f87171','#a855f7','#fbbf24','#34d399','#fb923c','#e879f9','#2dd4bf'];

  K.destroy('holdDist');
  K.save('holdDist', new Chart(document.getElementById('chartHoldDist'), {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: palette.map(p => p + 'bb'),
        borderColor: palette,
        borderWidth: 1, hoverOffset: 8,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '55%',
      plugins: {
        legend: { display: true, position: 'right', labels: { color: K.tickColor, font: { family: K.monoFont, size: 9 }, boxWidth: 9, padding: 10 } },
        tooltip: { ...K.tooltip, callbacks: { label: c => ` ${c.label}: ${UTILS.currency(c.raw)}` } },
      },
    },
  }));
}

// ─── 5. Sector-wise Unrealised P&L ────────────────────────────────────────────
function renderSectorChart(rows) {
  const C = CONFIG.HOLDINGS_DATA;
  const bySector = {};
  rows.forEach(r => {
    const sector = String(r['Sector'] ?? r[C.sector] || 'Unknown').trim();
    const inv    = UTILS.toNum(r['Total Invested']  ?? r[C.totalInvested]);
    const cur    = UTILS.toNum(r['Current Value']   ?? r[C.currentValue]);
    if (!bySector[sector]) bySector[sector] = { inv: 0, cur: 0 };
    bySector[sector].inv += inv;
    bySector[sector].cur += cur;
  });

  const entries = Object.entries(bySector)
    .map(([s, v]) => [s, +(v.cur - v.inv).toFixed(2)])
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));

  const vals = entries.map(([, v]) => v);
  const { bg, border } = K.pnlBarColors(vals);

  K.destroy('sector');
  K.save('sector', new Chart(document.getElementById('chartSector'), {
    type: 'bar',
    data: {
      labels: entries.map(([s]) => s),
      datasets: [{ data: vals, backgroundColor: bg, borderColor: border, borderWidth: 1, borderRadius: 4 }],
    },
    options: {
      responsive: true, maintainAspectRatio: false, indexAxis: 'y',
      plugins: { legend: { display: false }, tooltip: { ...K.tooltip, callbacks: { label: c => ' ' + UTILS.pnl(c.raw) } } },
      scales: {
        x: K.axes(),
        y: { ...K.axes(), ticks: { ...K.axes().ticks, font: { family: K.monoFont, size: 9 } } },
      },
    },
  }));
}

// ─── 6. My Calc vs Mail P&L (grouped bar per date) ────────────────────────────
function renderCalcVsMailChart(rows) {
  const byD = {};
  rows.forEach(r => {
    const d = UTILS.isoDate(r['Date']);
    if (!d) return;
    if (!byD[d]) byD[d] = { calc: 0, mail: 0 };
    byD[d].calc += UTILS.toNum(r['Net P&L']);
    byD[d].mail += UTILS.toNum(r['Mail Data']);
  });
  const sorted = Object.entries(byD).sort((a, b) => a[0] < b[0] ? -1 : 1);

  K.destroy('calcVsMail');
  K.save('calcVsMail', new Chart(document.getElementById('chartCalcVsMail'), {
    type: 'bar',
    data: {
      labels: sorted.map(([d]) => d.slice(5)),
      datasets: [
        {
          label: 'My Calc P&L',
          data: sorted.map(([, v]) => +v.calc.toFixed(2)),
          backgroundColor: 'rgba(0,210,170,0.55)',
          borderColor: K.accentColor,
          borderWidth: 1, borderRadius: 2,
        },
        {
          label: 'Actual Mail P&L',
          data: sorted.map(([, v]) => +v.mail.toFixed(2)),
          backgroundColor: 'rgba(56,189,248,0.45)',
          borderColor: K.skyColor,
          borderWidth: 1, borderRadius: 2,
        },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: true, labels: { color: K.tickColor, font: { family: K.monoFont, size: 10 }, boxWidth: 12, padding: 14 } },
        tooltip: { ...K.tooltip, callbacks: { label: c => ` ${c.dataset.label}: ${UTILS.pnl(c.raw)}` } },
      },
      scales: { x: K.axes(), y: K.axes() },
    },
  }));
}

COMPONENTS.onRefresh(() => loadAnalytics(true));
loadAnalytics();
setInterval(() => loadAnalytics(true), CONFIG.AUTO_REFRESH);
