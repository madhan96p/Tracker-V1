/**
 * js/charts.js
 * ─────────────────────────────────────────────────────────
 * All Chart.js chart definitions.
 *
 * HOW TO READ THIS FILE:
 *   Each function gets data, destroys any existing chart on that
 *   canvas, then creates a fresh Chart instance.
 *
 *   Chart registry pattern: we keep a map of { canvasId → Chart }
 *   so we can call .destroy() before re-rendering (avoids
 *   "canvas reuse" errors on data refresh).
 *
 * EXPORTS (used by app.js):
 *   Charts.renderAll(data)  → render/refresh every chart
 */

const Charts = (() => {

  /* ── Shared Chart.js theme defaults ─────────────────── */
  Chart.defaults.color         = '#7b8fa1';
  Chart.defaults.font.family   = "'Sora', sans-serif";
  Chart.defaults.font.size     = 11;
  Chart.defaults.borderColor   = '#1e2d40';

  const C = {
    profit:  '#00c896',
    loss:    '#ff4757',
    neutral: '#4895ef',
    gold:    '#ffd23f',
    purple:  '#9b5de5',
    grid:    'rgba(30,45,64,.6)',
    text:    '#7b8fa1',
  };

  // Registry: canvasId → Chart instance
  const registry = {};

  function destroy(id) {
    if (registry[id]) {
      registry[id].destroy();
      delete registry[id];
    }
  }

  function register(id, chart) {
    registry[id] = chart;
  }

  /* ── Common scale configs ────────────────────────────── */
  function darkGridY() {
    return {
      grid:  { color: C.grid },
      ticks: { color: C.text, callback: v => '₹' + fmtK(v) }
    };
  }

  function darkGridX(labels) {
    return {
      grid:  { display: false },
      ticks: { color: C.text, maxRotation: 45 }
    };
  }

  /* ── Number formatter ────────────────────────────────── */
  function fmtK(n) {
    const abs = Math.abs(n);
    if (abs >= 1e5) return (n / 1e5).toFixed(1) + 'L';
    if (abs >= 1e3) return (n / 1e3).toFixed(1) + 'K';
    return n.toFixed(0);
  }

  /* ════════════════════════════════════════════════════════
     1. MINI CUMULATIVE P&L  (Dashboard)
  ════════════════════════════════════════════════════════ */
  function renderMiniPnl(fo) {
    destroy('miniPnlChart');

    // Sort trades by date and compute running total
    const sorted = [...fo].sort((a, b) => a.date.localeCompare(b.date));
    let running = 0;
    const labels = [];
    const values = [];

    sorted.forEach(t => {
      running += t.netPnl;
      labels.push(t.date.slice(5));   // "MM-DD"
      values.push(running);
    });

    const positive = running >= 0;

    register('miniPnlChart', new Chart(
      document.getElementById('miniPnlChart'),
      {
        type: 'line',
        data: {
          labels,
          datasets: [{
            data:          values,
            borderColor:   positive ? C.profit : C.loss,
            backgroundColor: positive
              ? 'rgba(0,200,150,.08)'
              : 'rgba(255,71,87,.08)',
            fill:          true,
            tension:       .4,
            pointRadius:   0,
            borderWidth:   2,
          }]
        },
        options: {
          responsive: true,
          plugins: { legend: { display: false }, tooltip: { mode:'index', intersect:false } },
          scales: {
            x: { display: false },
            y: { display: false }
          }
        }
      }
    ));
  }

  /* ════════════════════════════════════════════════════════
     2. MINI WIN/LOSS DONUT  (Dashboard)
  ════════════════════════════════════════════════════════ */
  function renderMiniWin(fo) {
    destroy('miniWinChart');

    const wins   = fo.filter(t => t.netPnl >= 0).length;
    const losses = fo.filter(t => t.netPnl <  0).length;

    register('miniWinChart', new Chart(
      document.getElementById('miniWinChart'),
      {
        type: 'doughnut',
        data: {
          labels: ['Win', 'Loss'],
          datasets: [{
            data:            [wins, losses],
            backgroundColor: [C.profit, C.loss],
            borderColor:     '#111827',
            borderWidth:     3,
            hoverOffset:     4,
          }]
        },
        options: {
          responsive: true,
          cutout:  '70%',
          plugins: {
            legend: { position: 'bottom', labels: { boxWidth: 10, padding: 8 } },
            tooltip: {
              callbacks: {
                label: ctx => ` ${ctx.label}: ${ctx.raw} trades`
              }
            }
          }
        }
      }
    ));
  }

  /* ════════════════════════════════════════════════════════
     3. MINI HOLDINGS DONUT  (Dashboard)
  ════════════════════════════════════════════════════════ */
  function renderMiniHoldings(holdings) {
    destroy('miniHoldingsChart');

    const palette = [C.profit, C.neutral, C.gold, C.purple, C.loss,
                     '#e040fb','#ff9f1c','#2ec4b6','#cbf3f0','#ff6b6b'];

    register('miniHoldingsChart', new Chart(
      document.getElementById('miniHoldingsChart'),
      {
        type: 'doughnut',
        data: {
          labels:   holdings.map(h => h.symbol),
          datasets: [{
            data:            holdings.map(h => h.currentValue),
            backgroundColor: holdings.map((_, i) => palette[i % palette.length]),
            borderColor:     '#111827',
            borderWidth:     2,
            hoverOffset:     4,
          }]
        },
        options: {
          responsive: true,
          cutout: '70%',
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: ctx => ` ${ctx.label}: ₹${ctx.raw.toLocaleString('en-IN')}`
              }
            }
          }
        }
      }
    ));
  }

  /* ════════════════════════════════════════════════════════
     4. CUMULATIVE P&L LINE  (Analytics)
  ════════════════════════════════════════════════════════ */
  function renderCumulativePnl(fo) {
    destroy('cumulativePnlChart');

    const sorted = [...fo].sort((a, b) => a.date.localeCompare(b.date));
    let running = 0;
    const labels = [];
    const values = [];

    sorted.forEach(t => {
      running += t.netPnl;
      labels.push(t.date);
      values.push(+running.toFixed(2));
    });

    const finalVal = values[values.length - 1] || 0;

    register('cumulativePnlChart', new Chart(
      document.getElementById('cumulativePnlChart'),
      {
        type: 'line',
        data: {
          labels,
          datasets: [{
            label:           'Cumulative P&L',
            data:            values,
            borderColor:     finalVal >= 0 ? C.profit : C.loss,
            backgroundColor: finalVal >= 0
              ? 'rgba(0,200,150,.1)'
              : 'rgba(255,71,87,.1)',
            fill:       true,
            tension:    .4,
            pointRadius: ctx => ctx.dataIndex === values.length - 1 ? 5 : 0,
            pointBackgroundColor: finalVal >= 0 ? C.profit : C.loss,
            borderWidth: 2.5,
          }]
        },
        options: {
          responsive: true,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: ctx => ` P&L: ₹${ctx.raw.toLocaleString('en-IN')}`
              }
            }
          },
          scales: {
            x: darkGridX(),
            y: darkGridY()
          }
        }
      }
    ));
  }

  /* ════════════════════════════════════════════════════════
     5. DAILY P&L BAR  (Analytics)
  ════════════════════════════════════════════════════════ */
  function renderDailyPnl(fo) {
    destroy('dailyPnlChart');

    // Group by date
    const byDate = {};
    fo.forEach(t => {
      byDate[t.date] = (byDate[t.date] || 0) + t.netPnl;
    });

    const labels = Object.keys(byDate).sort();
    const values = labels.map(d => +byDate[d].toFixed(2));

    register('dailyPnlChart', new Chart(
      document.getElementById('dailyPnlChart'),
      {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            label:           'Daily P&L',
            data:            values,
            backgroundColor: values.map(v => v >= 0
              ? 'rgba(0,200,150,.7)'
              : 'rgba(255,71,87,.7)'),
            borderColor: values.map(v => v >= 0 ? C.profit : C.loss),
            borderWidth: 1,
            borderRadius: 4,
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: ctx => ` ₹${ctx.raw.toLocaleString('en-IN')}`
              }
            }
          },
          scales: {
            x: darkGridX(),
            y: darkGridY()
          }
        }
      }
    ));
  }

  /* ════════════════════════════════════════════════════════
     6. WIN/LOSS DONUT  (Analytics - larger)
  ════════════════════════════════════════════════════════ */
  function renderWinLoss(fo) {
    destroy('winLossChart');

    const wins   = fo.filter(t => t.netPnl >= 0).length;
    const losses = fo.filter(t => t.netPnl <  0).length;
    const winPnl = fo.filter(t => t.netPnl >= 0).reduce((s, t) => s + t.netPnl, 0);
    const lossPnl= fo.filter(t => t.netPnl <  0).reduce((s, t) => s + t.netPnl, 0);

    register('winLossChart', new Chart(
      document.getElementById('winLossChart'),
      {
        type: 'doughnut',
        data: {
          labels: ['Wins', 'Losses'],
          datasets: [{
            data:            [wins, losses],
            backgroundColor: [C.profit, C.loss],
            borderColor:     '#111827',
            borderWidth:     4,
            hoverOffset:     6,
          }]
        },
        options: {
          responsive: true,
          cutout: '65%',
          plugins: {
            legend: { position: 'bottom' },
            tooltip: {
              callbacks: {
                label: ctx => {
                  const pnl = ctx.label === 'Wins' ? winPnl : lossPnl;
                  return ` ${ctx.raw} trades · ₹${pnl.toLocaleString('en-IN')}`;
                }
              }
            }
          }
        }
      }
    ));
  }

  /* ════════════════════════════════════════════════════════
     7. SECTOR DISTRIBUTION  (Analytics)
  ════════════════════════════════════════════════════════ */
  function renderSector(holdings) {
    destroy('sectorChart');

    const byS = {};
    holdings.forEach(h => {
      byS[h.sector] = (byS[h.sector] || 0) + h.currentValue;
    });

    const palette = [C.profit, C.neutral, C.gold, C.purple, C.loss,
                     '#e040fb','#ff9f1c','#2ec4b6'];

    const labels = Object.keys(byS);
    const values = labels.map(s => byS[s]);

    register('sectorChart', new Chart(
      document.getElementById('sectorChart'),
      {
        type: 'doughnut',
        data: {
          labels,
          datasets: [{
            data:            values,
            backgroundColor: labels.map((_, i) => palette[i % palette.length]),
            borderColor:     '#111827',
            borderWidth:     3,
            hoverOffset:     4,
          }]
        },
        options: {
          responsive: true,
          cutout: '60%',
          plugins: {
            legend: { position: 'bottom' },
            tooltip: {
              callbacks: {
                label: ctx => ` ${ctx.label}: ₹${ctx.raw.toLocaleString('en-IN')}`
              }
            }
          }
        }
      }
    ));
  }

  /* ════════════════════════════════════════════════════════
     8. DAILY TRADE VOLUME  (Analytics)
  ════════════════════════════════════════════════════════ */
  function renderVolume(fo) {
    destroy('volumeChart');

    const byDate = {};
    fo.forEach(t => {
      byDate[t.date] = (byDate[t.date] || 0) + 1;
    });

    const labels = Object.keys(byDate).sort();
    const values = labels.map(d => byDate[d]);

    register('volumeChart', new Chart(
      document.getElementById('volumeChart'),
      {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            label:           'Trades',
            data:            values,
            backgroundColor: 'rgba(72,149,239,.5)',
            borderColor:     C.neutral,
            borderWidth:     1,
            borderRadius:    4,
          }]
        },
        options: {
          responsive: true,
          plugins: { legend: { display: false } },
          scales: {
            x: darkGridX(),
            y: {
              grid:  { color: C.grid },
              ticks: { color: C.text, stepSize: 1 }
            }
          }
        }
      }
    ));
  }

  /* ════════════════════════════════════════════════════════
     PUBLIC: renderAll(data)
     Call this once after data loads, and again on refresh.
  ════════════════════════════════════════════════════════ */
  function renderAll(data) {
    const { fo, holdings } = data;

    // Dashboard mini charts
    renderMiniPnl(fo);
    renderMiniWin(fo);
    renderMiniHoldings(holdings);

    // Full Analytics charts
    renderCumulativePnl(fo);
    renderDailyPnl(fo);
    renderWinLoss(fo);
    renderSector(holdings);
    renderVolume(fo);
  }

  return { renderAll };

})();
