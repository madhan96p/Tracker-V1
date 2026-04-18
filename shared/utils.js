/**
 * shared/utils.js
 * ─────────────────────────────────────────────
 * Pure utility functions — no DOM, no side effects.
 * Used by every page.
 */

const UTILS = (() => {

  // ── Number formatters ────────────────────────
  const _inr2 = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const _inr0 = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  function currency(val) {
    const n = parseFloat(val);
    if (isNaN(n)) return val || '—';
    return '₹' + _inr2.format(Math.abs(n));
  }

  function pnl(val) {
    const n = parseFloat(val);
    if (isNaN(n)) return val || '—';
    const abs = _inr2.format(Math.abs(n));
    return (n >= 0 ? '+₹' : '−₹') + abs;
  }

  function pct(val) {
    const n = parseFloat(val);
    if (isNaN(n)) return val || '—';
    return (n >= 0 ? '+' : '') + n.toFixed(2) + '%';
  }

  function qty(val) {
    const n = parseFloat(val);
    if (isNaN(n)) return val || '—';
    return _inr0.format(n);
  }

  function num(val, decimals = 2) {
    const n = parseFloat(val);
    if (isNaN(n)) return val || '—';
    return n.toFixed(decimals);
  }

  // ── Date formatters ──────────────────────────
  function date(val) {
    if (!val || val === '') return '—';
    const d = new Date(val);
    if (isNaN(d)) return String(val);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
  }

  function dateShort(val) {
    if (!val || val === '') return '—';
    const d = new Date(val);
    if (isNaN(d)) return String(val);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  }

  function isoDate(val) {
    if (!val) return '';
    if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)) return val.slice(0, 10);
    const d = new Date(val);
    if (isNaN(d)) return String(val);
    return d.toISOString().slice(0, 10);
  }

  // ── Parsers ──────────────────────────────────
  function toNum(val) {
    if (val === null || val === undefined || val === '') return 0;
    const n = parseFloat(String(val).replace(/[₹,\s]/g, ''));
    return isNaN(n) ? 0 : n;
  }

  function plain(val) {
    if (val === null || val === undefined || val === '') return '—';
    return String(val);
  }

  // ── P&L CSS class ────────────────────────────
  function pnlClass(val) {
    const n = parseFloat(val);
    if (isNaN(n)) return '';
    return n > 0 ? 'cell-gain' : n < 0 ? 'cell-loss' : 'cell-muted';
  }

  // ── HTML escaping ────────────────────────────
  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ── Sentinel logic ───────────────────────────
  /**
   * Computes Sentinel Recommendation from Holdings Data.
   * Formula derived from user's confirmed Sheets formula:
   *   < 95% invested → BUY DIP
   *   > 115% invested → TAKE PROFIT
   *   else → HOLD
   */
  function computeSentinel(totalInvested, currentValue) {
    const ratio = totalInvested > 0 ? currentValue / totalInvested : 1;
    if (ratio < 0.95) return '🚀 BUY DIP';
    if (ratio > 1.15) return '💰 TAKE PROFIT';
    return '💎 HOLD';
  }

  /**
   * Master Sentinel — combines Sentinel + Fundamental Action
   */
  function computeMasterSentinel(sentinel, fundamentalAction) {
    const s = (sentinel || '').toUpperCase().replace(/[🚀💰💎]/g, '').trim();
    const f = (fundamentalAction || '').toUpperCase().trim();

    if (s.includes('TAKE PROFIT'))                        return '💰 LOCK IN PROFITS';
    if (s.includes('BUY DIP') && f.includes('STRONG BUY')) return '🔥 AGGRESSIVE BUY';
    if (s.includes('BUY DIP') && f.includes('AVOID'))      return '⚠️ CAUTION (Value Trap)';
    if (s.includes('HOLD')    && f.includes('STRONG BUY')) return '📈 HOLD & ACCUMULATE';
    if (s.includes('HOLD')    && f.includes('AVOID'))      return '👀 WATCH CLOSELY';
    return '💎 HOLD';
  }

  // ── Sentinel badge HTML ──────────────────────
  function sentinelBadge(text) {
    if (!text) return '<span class="badge badge-neutral">—</span>';
    const t = String(text).trim();
    // Find matching config
    let style = null;
    for (const [key, val] of Object.entries(CONFIG.SENTINEL_COLORS)) {
      if (t.toUpperCase().includes(key)) { style = val; break; }
    }
    if (!style) style = { bg: 'rgba(255,255,255,0.05)', color: '#7aaebb', border: 'rgba(255,255,255,0.1)' };
    return `<span class="badge" style="background:${style.bg};color:${style.color};border-color:${style.border}">${esc(t)}</span>`;
  }

  // ── F&O derived metrics ──────────────────────
  function computeFOMetrics(rows) {
    // rows: array of row objects from the F&O sheet
    const C = CONFIG.FO;
    const keyAt = (row, key) => {
      // rows may be objects (by header) or arrays (by index)
      if (Array.isArray(row)) return row[key];
      return row[key];
    };

    let myCalcPnl = 0, mailPnl = 0;
    let grossWins = 0, grossLosses = 0;
    let totalIn = 0, totalOut = 0;
    let wins = 0, losses = 0, breakeven = 0;
    let totalCharges = 0;

    rows.forEach(row => {
      const netPnl    = toNum(row['Net P&L'] ?? row[C.netPnl]);
      const mailData  = toNum(row['Mail Data'] ?? row[C.mailData]);
      const entry     = toNum(row['Entry Price'] ?? row[C.entryPrice]);
      const exit      = toNum(row['Exit Price']  ?? row[C.exitPrice]);
      const q         = toNum(row['Qty']          ?? row[C.qty]);
      const charges   = toNum(row['Charges']      ?? row[C.charges]);
      const grossPnl  = toNum(row['Gross P&L']   ?? row[C.grossPnl]);

      myCalcPnl   += netPnl;
      mailPnl     += mailData;
      totalCharges+= charges;
      totalIn     += entry * q;
      totalOut    += exit  * q;

      if (mailData > 0) grossWins   += mailData;
      if (mailData < 0) grossLosses += mailData;

      if (netPnl > 0) wins++;
      else if (netPnl < 0) losses++;
      else breakeven++;
    });

    const taxLeakage = myCalcPnl - mailPnl;
    const winFactor  = grossLosses !== 0
      ? Math.abs(grossWins / grossLosses).toFixed(2) + 'x'
      : 'N/A';
    const inDemat = CONFIG.FO_INITIAL_CAPITAL + myCalcPnl - CONFIG.FO_RESERVE;
    const winRate = rows.length > 0 ? (wins / rows.length * 100).toFixed(1) : '0.0';

    return {
      myCalcPnl, mailPnl, taxLeakage,
      grossWins, grossLosses, winFactor,
      totalIn, totalOut, inDemat,
      wins, losses, breakeven, winRate,
      totalTrades: rows.length, totalCharges,
    };
  }

  // ── Pagination helpers ────────────────────────
  function pageNumbers(current, total) {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages = [1];
    if (current > 3) pages.push('…');
    for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) pages.push(p);
    if (current < total - 2) pages.push('…');
    pages.push(total);
    return pages;
  }

  // ── Object row accessor ──────────────────────
  // Handles both {header: value} objects and raw arrays
  function get(row, headerOrIndex, headers) {
    if (Array.isArray(row)) {
      if (typeof headerOrIndex === 'number') return row[headerOrIndex] ?? null;
      if (headers) {
        const idx = headers.indexOf(headerOrIndex);
        return idx >= 0 ? row[idx] : null;
      }
      return null;
    }
    return row[headerOrIndex] ?? null;
  }

  return {
    currency, pnl, pct, qty, num, date, dateShort, isoDate,
    toNum, plain, pnlClass, esc,
    computeSentinel, computeMasterSentinel, sentinelBadge,
    computeFOMetrics, pageNumbers, get,
  };
})();
