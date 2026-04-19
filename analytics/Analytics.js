/**
 * analytics/Analytics.js v3
 * ─────────────────────────────────────────────
 * FIXED: All ?? + || combinations now use explicit parens or simple if/else
 *        (mixing ?? with || without parens = SyntaxError in all browsers)
 * NEW: Streak heatmap for F&O trade history
 * FIXED: Chart.js loaded after this file (see Analytics.html script order)
 */

COMPONENTS.init('analytics', 'ANALYTICS');

async function loadAnalytics(refresh = false) {
  COMPONENTS.showLoader('Building analytics…');
  COMPONENTS.setConn('loading', 'Fetching…');
  COMPONENTS.hideError();

  try {
    const data = await SHEETS.load(refresh);
    const fo   = SHEETS.getFO(data);
    const hold = SHEETS.getHoldingsData(data);
    const log  = SHEETS.getTradeLog(data);

    const foRows   = fo.rows   || [];
    const holdRows = hold.rows || [];
    const logRows  = log.rows  || [];

    // Streaks in sidebar
    COMPONENTS.setStreaks(UTILS.computeStreaks(foRows, logRows));

    // Charts — each in its own try/catch so one failure doesn't break the rest
    renderInstrumentChart(foRows);
    renderMonthlyChart(foRows);
    renderVolumeChart(foRows);
    renderHoldDistChart(holdRows);
    renderSectorChart(holdRows);
    renderCalcVsMailChart(foRows);
    renderStreakHeatmap(foRows);

    COMPONENTS.setConn('live', 'Live · ' + new Date().toLocaleTimeString('en-IN'));
    COMPONENTS.setLastSync();

  } catch (err) {
    console.error('[Analytics] Load error:', err);
    COMPONENTS.showError('Could not load analytics: ' + err.message);
    COMPONENTS.setConn('error', 'Error');
  }

  COMPONENTS.hideLoader();
}

const K = COMPONENTS.CHART;

// ─── Helper: safe value from row (no ?? + || mixing) ────────────────────────
function rv(row, key, fallback) {
  const v = row[key];
  if (v === null || v === undefined || v === '') return (fallback !== undefined ? fallback : null);
  return v;
}

// ─── 1. Instrument-wise Net P&L ──────────────────────────────────────────────
function renderInstrumentChart(rows) {
  try {
    const byI = {};
    rows.forEach(r => {
      const instr = String(rv(r, 'Instrument', '?')).split(/\s+/)[0].toUpperCase();
      const pnl   = UTILS.toNum(rv(r, 'Net P&L', 0));
      byI[instr]  = (byI[instr] || 0) + pnl;
    });
    const sorted = Object.entries(byI)
      .map(([k, v]) => [k, +v.toFixed(2)])
      .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
      .slice(0, 15);

    const vals = sorted.map(([, v]) => v);
    const { bg, border } = K.pnlBarColors(vals);

    K.destroy('instrument');
    const ctx = document.getElementById('chartInstrument');
    if (!ctx) return;

    K.save('instrument', new Chart(ctx, {
      type: 'bar',
      data: {
        labels: sorted.map(([k]) => k),
        datasets: [{ data: vals, backgroundColor: bg, borderColor: border, borderWidth: 1, borderRadius: 3 }],
      },
      options: {
        responsive: true, maintainAspectRatio: false, indexAxis: 'y',
        plugins: {
          legend: { display: false },
          tooltip: { ...K.tooltip, callbacks: { label: c => ' ' + UTILS.pnl(c.raw) } }
        },
        scales: {
          x: { ...K.axes(), ticks: { ...K.axes().ticks, callback: v => UTILS.pnl(v) } },
          y: { ...K.axes(), ticks: { ...K.axes().ticks, font: { family: K.monoFont, size: 9 } } },
        },
      },
    }));
  } catch (e) { console.error('[Analytics] instrumentChart:', e); }
}

// ─── 2. Monthly P&L ──────────────────────────────────────────────────────────
function renderMonthlyChart(rows) {
  try {
    const byM = {};
    rows.forEach(r => {
      const d = new Date(UTILS.isoDate(rv(r, 'Date', '')));
      if (isNaN(d.getTime())) return;
      const k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
      byM[k]  = (byM[k] || 0) + UTILS.toNum(rv(r, 'Net P&L', 0));
    });
    const sorted = Object.entries(byM).sort((a, b) => a[0] < b[0] ? -1 : 1);
    const vals = sorted.map(([, v]) => +v.toFixed(2));
    const { bg, border } = K.pnlBarColors(vals);

    K.destroy('monthly');
    const ctx = document.getElementById('chartMonthly');
    if (!ctx) return;

    K.save('monthly', new Chart(ctx, {
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
  } catch (e) { console.error('[Analytics] monthlyChart:', e); }
}

// ─── 3. Daily trade volume ────────────────────────────────────────────────────
function renderVolumeChart(rows) {
  try {
    const byD = {};
    rows.forEach(r => {
      const d = UTILS.isoDate(rv(r, 'Date', ''));
      if (!d) return;
      byD[d] = (byD[d] || 0) + 1;
    });
    const sorted = Object.entries(byD).sort((a, b) => a[0] < b[0] ? -1 : 1);

    K.destroy('volume');
    const ctx = document.getElementById('chartVolume');
    if (!ctx) return;

    K.save('volume', new Chart(ctx, {
      type: 'bar',
      data: {
        labels: sorted.map(([d]) => d.slice(5)),
        datasets: [{
          data: sorted.map(([, v]) => v),
          backgroundColor: 'rgba(56,189,248,0.55)',
          borderColor: K.skyColor, borderWidth: 1, borderRadius: 3,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { ...K.tooltip, callbacks: { label: c => ' ' + c.raw + ' trades' } } },
        scales: {
          x: K.axes(),
          y: { ...K.axes(), beginAtZero: true, ticks: { ...K.axes().ticks, stepSize: 1 } },
        },
      },
    }));
  } catch (e) { console.error('[Analytics] volumeChart:', e); }
}

// ─── 4. Holdings distribution doughnut ───────────────────────────────────────
function renderHoldDistChart(rows) {
  try {
    const C = CONFIG.HOLDINGS_DATA;

    // SAFE: no ?? + || mixing
    const validRows = (rows || []).filter(r => {
      const cv = r['Current Value'];
      const cv2 = r[C.currentValue];
      const val = (cv !== null && cv !== undefined && cv !== '') ? cv : cv2;
      return UTILS.toNum(val) > 0;
    });

    const sorted = [...validRows]
      .sort((a, b) => {
        const getCV = row => {
          const v = row['Current Value'];
          return UTILS.toNum((v !== null && v !== undefined && v !== '') ? v : row[C.currentValue]);
        };
        return getCV(b) - getCV(a);
      })
      .slice(0, 10);

    const getCV  = row => { const v = row['Current Value']; return UTILS.toNum((v !== null && v !== undefined && v !== '') ? v : row[C.currentValue]); };
    const getName = row => { const v = row['Company Name']; return String((v !== null && v !== undefined && v !== '') ? v : (row[C.companyName] || '?')).split(' ')[0]; };

    const labels  = sorted.map(getName);
    const values  = sorted.map(getCV);
    const palette = ['#00d2aa','#38bdf8','#4ade80','#f87171','#a855f7','#fbbf24','#34d399','#fb923c','#e879f9','#2dd4bf'];

    K.destroy('holdDist');
    const ctx = document.getElementById('chartHoldDist');
    if (!ctx) return;

    K.save('holdDist', new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: palette.map(p => p + 'bb'),
          borderColor: palette, borderWidth: 1, hoverOffset: 8,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '55%',
        plugins: {
          legend: { display: true, position: 'right', labels: { color: '#3d6572', font: { family: "'JetBrains Mono', monospace", size: 9 }, boxWidth: 9, padding: 10 } },
          tooltip: { ...K.tooltip, callbacks: { label: c => ' ' + c.label + ': ' + UTILS.currency(c.raw) } },
        },
      },
    }));
  } catch (e) { console.error('[Analytics] holdDistChart:', e); }
}

// ─── 5. Sector-wise Unrealised P&L ───────────────────────────────────────────
function renderSectorChart(rows) {
  try {
    const C = CONFIG.HOLDINGS_DATA;
    const bySector = {};

    rows.forEach(r => {
      // SAFE: explicit fallback, no ?? + || mixing
      const secRaw  = r['Sector'];
      const sector  = String((secRaw !== null && secRaw !== undefined && secRaw !== '') ? secRaw : (r[C.sector] || 'Unknown')).trim();

      const invRaw  = r['Total Invested'];
      const inv     = UTILS.toNum((invRaw !== null && invRaw !== undefined && invRaw !== '') ? invRaw : r[C.totalInvested]);

      const curRaw  = r['Current Value'];
      const cur     = UTILS.toNum((curRaw !== null && curRaw !== undefined && curRaw !== '') ? curRaw : r[C.currentValue]);

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
    const ctx = document.getElementById('chartSector');
    if (!ctx) return;

    K.save('sector', new Chart(ctx, {
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
          y: { ...K.axes(), ticks: { ...K.axes().ticks, font: { family: "'JetBrains Mono', monospace", size: 9 } } },
        },
      },
    }));
  } catch (e) { console.error('[Analytics] sectorChart:', e); }
}

// ─── 6. My Calc vs Mail P&L (grouped bar) ────────────────────────────────────
function renderCalcVsMailChart(rows) {
  try {
    const byD = {};
    rows.forEach(r => {
      const d = UTILS.isoDate(rv(r, 'Date', ''));
      if (!d) return;
      if (!byD[d]) byD[d] = { calc: 0, mail: 0 };
      byD[d].calc += UTILS.toNum(rv(r, 'Net P&L',   0));
      byD[d].mail += UTILS.toNum(rv(r, 'Mail Data', 0));
    });
    const sorted = Object.entries(byD).sort((a, b) => a[0] < b[0] ? -1 : 1);

    K.destroy('calcVsMail');
    const ctx = document.getElementById('chartCalcVsMail');
    if (!ctx) return;

    K.save('calcVsMail', new Chart(ctx, {
      type: 'bar',
      data: {
        labels: sorted.map(([d]) => d.slice(5)),
        datasets: [
          {
            label: 'My Calc P&L',
            data: sorted.map(([, v]) => +v.calc.toFixed(2)),
            backgroundColor: 'rgba(0,210,170,0.55)',
            borderColor: K.accentColor, borderWidth: 1, borderRadius: 2,
          },
          {
            label: 'Actual Mail P&L',
            data: sorted.map(([, v]) => +v.mail.toFixed(2)),
            backgroundColor: 'rgba(56,189,248,0.45)',
            borderColor: K.skyColor, borderWidth: 1, borderRadius: 2,
          },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: true, labels: { color: '#3d6572', font: { family: "'JetBrains Mono', monospace", size: 10 }, boxWidth: 12, padding: 14 } },
          tooltip: { ...K.tooltip, callbacks: { label: c => ' ' + c.dataset.label + ': ' + UTILS.pnl(c.raw) } },
        },
        scales: { x: K.axes(), y: K.axes() },
      },
    }));
  } catch (e) { console.error('[Analytics] calcVsMailChart:', e); }
}

// ─── 7. Streak Heatmap (trade-wise W/L/BE) ────────────────────────────────────
function renderStreakHeatmap(rows) {
  try {
    const container = document.getElementById('streakHeatmap');
    if (!container) return;

    if (!rows || rows.length === 0) {
      container.innerHTML = '<div class="heatmap-empty">No trade data</div>';
      return;
    }

    const sorted = [...rows].sort((a, b) => {
      return new Date(a['Date'] || 0).getTime() - new Date(b['Date'] || 0).getTime();
    });

    const dots = sorted.map(row => {
      const pnl  = UTILS.toNum(row['Net P&L']);
      const date = UTILS.dateShort(row['Date']);
      const instr = String(row['Instrument'] || '?');
      const type  = pnl > 0 ? 'win' : pnl < 0 ? 'loss' : 'be';
      const cls   = 'hm-dot hm-' + type;
      const tip   = `${date} · ${instr} · ${UTILS.pnl(pnl)}`;
      return `<div class="${cls}" title="${UTILS.esc(tip)}"></div>`;
    }).join('');

    container.innerHTML = `
      <div class="heatmap-legend">
        <span class="hm-leg"><span class="hm-dot hm-win sm"></span> Win</span>
        <span class="hm-leg"><span class="hm-dot hm-loss sm"></span> Loss</span>
        <span class="hm-leg"><span class="hm-dot hm-be sm"></span> BE</span>
        <span class="hm-leg-count">${rows.length} trades</span>
      </div>
      <div class="heatmap-grid">${dots}</div>`;
  } catch (e) { console.error('[Analytics] streakHeatmap:', e); }
}

COMPONENTS.onRefresh(() => loadAnalytics(true));
loadAnalytics();
setInterval(() => loadAnalytics(true), CONFIG.AUTO_REFRESH);
