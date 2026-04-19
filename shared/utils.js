/**
 * shared/utils.js v3
 * KEY FIX: Never mix ?? with || without parens (causes SyntaxError in all browsers)
 * NEW: computeStreaks(), computeTradeStreak(), computeDayStreak()
 */
const UTILS = (() => {

  const _inr2 = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const _inr0 = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  function currency(val) {
    const n = parseFloat(val);
    if (isNaN(n)) return (val !== null && val !== undefined && val !== '') ? String(val) : '—';
    return '₹' + _inr2.format(Math.abs(n));
  }

  function pnl(val) {
    const n = parseFloat(val);
    if (isNaN(n)) return '—';
    return (n >= 0 ? '+₹' : '−₹') + _inr2.format(Math.abs(n));
  }

  function pct(val) {
    const n = parseFloat(val);
    if (isNaN(n)) return '—';
    return (n >= 0 ? '+' : '') + n.toFixed(2) + '%';
  }

  function qty(val) {
    const n = parseFloat(val);
    if (isNaN(n)) return (val !== null && val !== undefined && val !== '') ? String(val) : '—';
    return _inr0.format(n);
  }

  function date(val) {
    if (!val || val === '') return '—';
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
  }

  function dateShort(val) {
    if (!val || val === '') return '—';
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  }

  function isoDate(val) {
    if (!val) return '';
    if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)) return val.slice(0, 10);
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val);
    return d.toISOString().slice(0, 10);
  }

  function toNum(val) {
    if (val === null || val === undefined || val === '') return 0;
    const n = parseFloat(String(val).replace(/[₹,\s]/g, ''));
    return isNaN(n) ? 0 : n;
  }

  function plain(val) {
    if (val === null || val === undefined || val === '') return '—';
    return String(val);
  }

  function pnlClass(val) {
    const n = parseFloat(val);
    if (isNaN(n)) return '';
    return n > 0 ? 'cell-gain' : n < 0 ? 'cell-loss' : 'cell-muted';
  }

  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ─── F&O Metrics (all formulas from user's confirmed Sheets) ────────────────
  function computeFOMetrics(rows) {
    let myCalcPnl = 0, mailPnl = 0, totalCharges = 0;
    let grossWins = 0, grossLosses = 0;
    let totalIn = 0, totalOut = 0;
    let wins = 0, losses = 0, breakeven = 0;

    (rows || []).forEach(row => {
      const net     = toNum(row['Net P&L']);
      const mail    = toNum(row['Mail Data']);
      const entry   = toNum(row['Entry Price']);
      const exitP   = toNum(row['Exit Price']);
      const q       = toNum(row['Qty']);
      const charges = toNum(row['Charges']);

      myCalcPnl    += net;
      mailPnl      += mail;
      totalCharges += charges;
      totalIn      += entry * q;
      totalOut     += exitP * q;

      if (mail > 0) grossWins   += mail;
      if (mail < 0) grossLosses += mail;

      if (net > 0)       wins++;
      else if (net < 0)  losses++;
      else               breakeven++;
    });

    const total     = (rows || []).length;
    const taxLeakage = myCalcPnl - mailPnl;
    const winFactor  = grossLosses !== 0
      ? Math.abs(grossWins / grossLosses).toFixed(2) + 'x'
      : 'N/A';
    const inDemat = CONFIG.FO_INITIAL_CAPITAL + myCalcPnl - CONFIG.FO_RESERVE;
    const winRate = total > 0 ? (wins / total * 100).toFixed(1) : '0.0';

    return {
      myCalcPnl, mailPnl, taxLeakage,
      grossWins, grossLosses, winFactor,
      totalIn, totalOut, inDemat,
      wins, losses, breakeven, winRate,
      totalTrades: total, totalCharges,
    };
  }

  // ─── Streak: trade-wise (from F&O Table1) ────────────────────────────────────
  function computeTradeStreak(foRows) {
    if (!foRows || foRows.length === 0) {
      return { count: 0, type: 'none', emoji: '—', label: 'No trades' };
    }
    const sorted = [...foRows].sort((a, b) => {
      const da = new Date(a['Date'] || 0).getTime();
      const db = new Date(b['Date'] || 0).getTime();
      return db - da;  // newest first
    });

    let count = 0;
    let type  = null;
    for (const row of sorted) {
      const n = toNum(row['Net P&L']);
      const t = n > 0 ? 'win' : n < 0 ? 'loss' : 'be';
      if (type === null)   { type = t; count = 1; }
      else if (t === type) { count++; }
      else                 { break; }
    }

    if (!type || type === 'none') return { count: 0, type: 'none', emoji: '—', label: 'No data' };
    const emoji = type === 'win' ? '🔥' : type === 'loss' ? '❄️' : '➖';
    const word  = type === 'win' ? 'Win' : type === 'loss' ? 'Loss' : 'BE';
    return { count, type, emoji, label: `${emoji} ${count} trade ${word} streak` };
  }

  // ─── Streak: day-wise (from Trade_Transaction_Log) ────────────────────────────
  function computeDayStreak(logRows) {
    if (!logRows || logRows.length === 0) {
      return { count: 0, type: 'none', emoji: '—', label: 'No data' };
    }
    const sorted = [...logRows].sort((a, b) => {
      const da = new Date(a['Date'] || 0).getTime();
      const db = new Date(b['Date'] || 0).getTime();
      return db - da;
    });

    let count = 0;
    let type  = null;
    for (const row of sorted) {
      const n = toNum(row['Net P&L']);
      const t = n > 0 ? 'win' : n < 0 ? 'loss' : 'be';
      if (type === null)   { type = t; count = 1; }
      else if (t === type) { count++; }
      else                 { break; }
    }

    if (!type || type === 'none') return { count: 0, type: 'none', emoji: '—', label: 'No data' };
    const emoji = type === 'win' ? '🔥' : type === 'loss' ? '❄️' : '➖';
    const word  = type === 'win' ? 'profit' : type === 'loss' ? 'loss' : 'BE';
    return { count, type, emoji, label: `${emoji} ${count} day ${word} streak` };
  }

  function computeStreaks(foRows, logRows) {
    return {
      trade: computeTradeStreak(foRows),
      day:   computeDayStreak(logRows),
    };
  }

  // ─── Sentinel ────────────────────────────────────────────────────────────────
  function sentinelBadge(text) {
    if (!text || text === '—' || text === '') return '<span class="badge badge-neutral">—</span>';
    const t = String(text).trim();
    let style = null;
    for (const [key, val] of Object.entries(CONFIG.SENTINEL_COLORS)) {
      if (t.toUpperCase().includes(key)) { style = val; break; }
    }
    if (!style) style = { bg: 'rgba(255,255,255,0.05)', color: '#7aaebb', border: 'rgba(255,255,255,0.1)' };
    return `<span class="badge" style="background:${style.bg};color:${style.color};border-color:${style.border}">${esc(t)}</span>`;
  }

  function pageNumbers(current, total) {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages = [1];
    if (current > 3) pages.push('…');
    for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) pages.push(p);
    if (current < total - 2) pages.push('…');
    pages.push(total);
    return pages;
  }

  return {
    currency, pnl, pct, qty, date, dateShort, isoDate,
    toNum, plain, pnlClass, esc,
    computeFOMetrics,
    computeStreaks, computeTradeStreak, computeDayStreak,
    sentinelBadge, pageNumbers,
  };
})();
