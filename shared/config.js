/**
 * shared/config.js
 * ─────────────────────────────────────────────
 * Single source of truth for ALL configuration.
 * Edit GAS_URL after deploying your Apps Script.
 */

const CONFIG = {

  // ── Apps Script Web App URL ──────────────────
  // Replace with YOUR deployed URL after pasting apps-script.gs into GAS
  GAS_URL: 'https://script.google.com/macros/s/AKfycbwCbA3_zTufLYY_5-NhEUx25ykvAfCOQQzYTAMr678GgZ57HDbe469xAdjfhe_qnr-FJQ/exec',

  // ── Cache duration (ms) ──────────────────────
  CACHE_TTL:      5 * 60 * 1000,   // 5 minutes
  AUTO_REFRESH:   5 * 60 * 1000,   // auto-refresh every 5 min

  // ── Pagination ───────────────────────────────
  PAGE_SIZE: 25,

  // ═══════════════════════════════════════════════════════════
  // COLUMN MAPS — 0-indexed positions in each sheet's header row
  // These are confirmed from the actual sheet headers.
  // ═══════════════════════════════════════════════════════════

  /**
   * "Holdings Data" sheet — Table: "Holding"
   * Confirmed headers:
   *   0: Company Name
   *   1: Symble (Symbol)
   *   2: Sector
   *   3: Avg Buy Price
   *   4: Total Qty
   *   5: Total Invested
   *   6: Total Brokerage Paid    ← CRITICAL: NOT current value!
   *   7: Current Value           ← ACTUAL total current market value (price × qty)
   *   8: Sentinel Recommendation
   *   9: Fundamental Action
   *  10: Master Sentinel
   *
   * ⚠️ BUG FIX: Old code read col 6 as current value → massive fake losses.
   *    Correct: col 7 = Current Value, col 6 = Brokerage
   */
  HOLDINGS_DATA: {
    companyName:    0,
    symbol:         1,
    sector:         2,
    avgBuyPrice:    3,
    totalQty:       4,
    totalInvested:  5,   // ← use for P&L base
    brokerage:      6,   // ← Total Brokerage Paid (ignore for current price)
    currentValue:   7,   // ← Total current market value (price × qty, computed by Sheets)
    sentinel:       8,
    fundamentalAction: 9,
    masterSentinel: 10,
  },

  /**
   * "F&O" sheet — Table: "Table1"
   * Confirmed headers:
   *   0: Date
   *   1: Instrument
   *   2: Entry Price
   *   3: Exit Price
   *   4: Qty
   *   5: Orders
   *   6: Gross P&L
   *   7: Charges
   *   8: Net P&L
   *   9: Demat Cr/Dr
   *  10: Opening Balance
   *  11: Closing Balance
   *  12: Mail Data         ← broker-confirmed P&L (use this for actual P&L)
   *  13: Time In           ← entry clock time (HH:MM:SS)
   *  14: Time Out          ← trade duration (not exit time!)
   *  15: Total Time
   *  16: Slippage Audit
   *  17: Time stamp
   */
  FO: {
    date:           0,
    instrument:     1,
    entryPrice:     2,
    exitPrice:      3,
    qty:            4,
    orders:         5,
    grossPnl:       6,
    charges:        7,
    netPnl:         8,
    dematCrDr:      9,
    openingBalance: 10,
    closingBalance: 11,
    mailData:       12,  // ← broker-confirmed actual P&L
    timeIn:         13,
    timeOut:        14,  // ← duration, not clock time
    totalTime:      15,
    slippageAudit:  16,
    timestamp:      17,
  },

  /**
   * "Investments" sheet — 3 tables:
   *
   * Table 1: "Holdings" (equity stock purchases)
   * Table 2: "IPOs"
   * Both share the same headers:
   *   Company Name | Ticker | Date | Order Price | Filled Qty | Current Price
   *   Buying Brokerage | Invested | Current | Net P&L | Gross P&L
   *
   * Table 3: "Trade_Transaction_Log"
   *   Sl. No | Date | Entry Price | Exit Price | Qty | Total In | Total Out
   *   Gross P&L | Net P&L | Total
   *
   * NOTE: Net P&L and Current are already correctly computed by Sheets formulas.
   *       Just display them as-is.
   */
  INVESTMENTS: {
    companyName:      'Company Name',
    ticker:           'Ticker',
    date:             'Date',
    orderPrice:       'Order Price',
    filledQty:        'Filled Qty',
    currentPrice:     'Current Price',
    buyingBrokerage:  'Buying Brokerage',
    invested:         'Invested',
    current:          'Current',
    netPnl:           'Net P&L',
    grossPnl:         'Gross P&L',
  },

  /**
   * "Fundamental Analysis" sheet
   * Key display columns:
   */
  FA: {
    ticker:         'Ticker (Input)',
    companyName:    'Company Name',
    mktCap:         'Mkt Cap (Cr)',
    ltp:            'LTP (Live Price)',
    grahamNum:      'Graham Number',
    intrinsicGap:   'Intrinsic Gap %',
    healthScore:    'Health Score',
    finalAction:    'Final Action',
    roe:            'ROE %',
    roce:           'ROCE %',
    pe:             'P/E Ratio',
    pb:             'P/B Ratio',
    de:             'D/E Ratio',
    promoter:       'Promoter %',
    eps:            'EPS (TTM)',
    divYield:       'Div Yield %',
    notes:          'Notes',
  },

  // ── Sentinel badge colors ────────────────────
  SENTINEL_COLORS: {
    'BUY DIP':          { bg: 'rgba(74,222,128,0.15)',  color: '#4ade80', border: 'rgba(74,222,128,0.4)' },
    'TAKE PROFIT':      { bg: 'rgba(251,191,36,0.15)',  color: '#fbbf24', border: 'rgba(251,191,36,0.4)' },
    'HOLD':             { bg: 'rgba(56,189,248,0.12)',  color: '#38bdf8', border: 'rgba(56,189,248,0.3)' },
    'LOCK IN PROFITS':  { bg: 'rgba(251,191,36,0.15)',  color: '#fbbf24', border: 'rgba(251,191,36,0.4)' },
    'AGGRESSIVE BUY':   { bg: 'rgba(74,222,128,0.2)',   color: '#4ade80', border: 'rgba(74,222,128,0.5)' },
    'CAUTION':          { bg: 'rgba(248,113,113,0.12)', color: '#f87171', border: 'rgba(248,113,113,0.35)' },
    'HOLD & ACCUMULATE':{ bg: 'rgba(56,189,248,0.12)',  color: '#38bdf8', border: 'rgba(56,189,248,0.3)' },
    'WATCH CLOSELY':    { bg: 'rgba(168,85,247,0.12)',  color: '#a855f7', border: 'rgba(168,85,247,0.35)' },
    'STRONG BUY':       { bg: 'rgba(74,222,128,0.2)',   color: '#4ade80', border: 'rgba(74,222,128,0.5)' },
    'WATCHLIST':        { bg: 'rgba(251,191,36,0.12)',  color: '#fbbf24', border: 'rgba(251,191,36,0.35)' },
    'AVOID':            { bg: 'rgba(248,113,113,0.15)', color: '#f87171', border: 'rgba(248,113,113,0.4)' },
  },

  // ── F&O Dashboard formula constants ─────────
  FO_INITIAL_CAPITAL: 50000,   // ₹50,000 initial F&O capital
  FO_RESERVE:         1000,    // ₹1,000 reserve deducted from demat display

  // ── Navigation ───────────────────────────────
  NAV_ITEMS: [
    { id: 'dashboard',    label: 'Dashboard',    icon: '◈', path: '/dashboard/Dashboard.html' },
    { id: 'fo',           label: 'F&O Trades',   icon: '⟳', path: '/fo/FO.html' },
    { id: 'holdings',     label: 'Holdings',     icon: '▦', path: '/holdings/Holdings.html' },
    { id: 'investments',  label: 'Investments',  icon: '◐', path: '/investments/Investments.html' },
    { id: 'ipo',          label: 'IPO',          icon: '⬡', path: '/ipo/IPO.html' },
    { id: 'log',          label: 'Trade Log',    icon: '≡', path: '/log/Log.html' },
    { id: 'analytics',    label: 'Analytics',    icon: '◉', path: '/analytics/Analytics.html' },
    { id: 'fa',           label: 'Fund. Analysis',icon: '⊕', path: '/fa/FA.html' },
    { id: 'demat2',       label: 'Demat 2',      icon: '◫', path: '/demat2/Demat2.html' },
  ],
};
