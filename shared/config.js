/**
 * shared/config.js v3
 */
const CONFIG = {

  GAS_URL: 'https://script.google.com/macros/s/AKfycbzNZGr2DlfZ3TFgVZIY3iUvhrXgY7NNssOZxFfOtfZyNfoJWHjDW6I0qtmcvVM-tFzOCw/exec',

  CACHE_TTL:      5 * 60 * 1000,
  AUTO_REFRESH:   5 * 60 * 1000,
  PAGE_SIZE:      25,

  FO_INITIAL_CAPITAL: 50000,
  FO_RESERVE:         1000,

  // ─── Column maps ─────────────────────────────────────────────────────────
  HOLDINGS_DATA: {
    companyName:      'Company Name',
    symbol:           'Symble',
    sector:           'Sector',
    avgBuyPrice:      'Avg Buy Price',
    totalQty:         'Total Qty',
    totalInvested:    'Total Invested',
    brokerage:        'Total Brokerage Paid',
    currentValue:     'Current Value',
    sentinel:         'Sentinel Recommendation',
    fundamentalAction:'Fundamental Action',
    masterSentinel:   'Master Sentinel',
  },

  FO: {
    date:           'Date',
    instrument:     'Instrument',
    entryPrice:     'Entry Price',
    exitPrice:      'Exit Price',
    qty:            'Qty',
    orders:         'Orders',
    grossPnl:       'Gross P&L',
    charges:        'Charges',
    netPnl:         'Net P&L',
    dematCrDr:      'Demat Cr/Dr',
    openingBalance: 'Opening Balance',
    closingBalance: 'Closing Balance',
    mailData:       'Mail Data',
    timeIn:         'Time In',
    timeOut:        'Time Out',
    totalTime:      'Total Time',
    slippageAudit:  'Slippage Audit',
    timestamp:      'Time stamp',
  },

  // ─── 5 Preset themes ──────────────────────────────────────────────────────
  THEMES: [
    {
      id:    'dark-teal',
      label: '🌙 Dark Teal',
      vars: {
        '--bg':     '#030810', '--bg-1':  '#06101d', '--bg-2':  '#091828',
        '--bg-3':   '#0d2035', '--bg-4':  '#112640',
        '--accent': '#00d2aa', '--accent-dim': 'rgba(0,210,170,0.10)',
        '--gain':   '#4ade80', '--loss':  '#f87171',
        '--sky':    '#38bdf8', '--warn':  '#fbbf24',
        '--t1':     '#dff2ec', '--t2':    '#7aaebb',
        '--t3':     '#3d6572', '--t4':    '#1e3d4e',
        '--border': 'rgba(0,210,170,0.09)',
        '--border-2':'rgba(0,210,170,0.20)',
        '--border-3':'rgba(0,210,170,0.38)',
      }
    },
    {
      id:    'light-clean',
      label: '☀️ Light',
      vars: {
        '--bg':     '#f0f5f4', '--bg-1':  '#e4ecea', '--bg-2':  '#d8e3e1',
        '--bg-3':   '#cad8d6', '--bg-4':  '#b8ccca',
        '--accent': '#007a63', '--accent-dim': 'rgba(0,122,99,0.10)',
        '--gain':   '#16a34a', '--loss':  '#dc2626',
        '--sky':    '#0369a1', '--warn':  '#d97706',
        '--t1':     '#0f2924', '--t2':    '#1f4a42',
        '--t3':     '#3d6572', '--t4':    '#6a9a92',
        '--border': 'rgba(0,122,99,0.14)',
        '--border-2':'rgba(0,122,99,0.28)',
        '--border-3':'rgba(0,122,99,0.50)',
      }
    },
    {
      id:    'dark-orange',
      label: '🔥 Dark Orange',
      vars: {
        '--bg':     '#0d0802', '--bg-1':  '#170d04', '--bg-2':  '#1f1205',
        '--bg-3':   '#2a1807', '--bg-4':  '#351e09',
        '--accent': '#f97316', '--accent-dim': 'rgba(249,115,22,0.12)',
        '--gain':   '#4ade80', '--loss':  '#f87171',
        '--sky':    '#38bdf8', '--warn':  '#fbbf24',
        '--t1':     '#fef3e8', '--t2':    '#d4a57a',
        '--t3':     '#8a6040', '--t4':    '#4a3020',
        '--border': 'rgba(249,115,22,0.10)',
        '--border-2':'rgba(249,115,22,0.22)',
        '--border-3':'rgba(249,115,22,0.40)',
      }
    },
    {
      id:    'dark-purple',
      label: '💜 Dark Purple',
      vars: {
        '--bg':     '#06030d', '--bg-1':  '#0d0618', '--bg-2':  '#130920',
        '--bg-3':   '#1a0c2a', '--bg-4':  '#200e33',
        '--accent': '#a855f7', '--accent-dim': 'rgba(168,85,247,0.12)',
        '--gain':   '#4ade80', '--loss':  '#f87171',
        '--sky':    '#38bdf8', '--warn':  '#fbbf24',
        '--t1':     '#f0e8ff', '--t2':    '#b89ad4',
        '--t3':     '#7a5a9a', '--t4':    '#3d2060',
        '--border': 'rgba(168,85,247,0.10)',
        '--border-2':'rgba(168,85,247,0.22)',
        '--border-3':'rgba(168,85,247,0.40)',
      }
    },
    {
      id:    'dark-green',
      label: '🌿 Dark Green',
      vars: {
        '--bg':     '#020d04', '--bg-1':  '#041508', '--bg-2':  '#071d0c',
        '--bg-3':   '#0a2510', '--bg-4':  '#0d2e14',
        '--accent': '#22c55e', '--accent-dim': 'rgba(34,197,94,0.12)',
        '--gain':   '#4ade80', '--loss':  '#f87171',
        '--sky':    '#38bdf8', '--warn':  '#fbbf24',
        '--t1':     '#e8faf0', '--t2':    '#7ac498',
        '--t3':     '#3a7a56', '--t4':    '#1a3a28',
        '--border': 'rgba(34,197,94,0.10)',
        '--border-2':'rgba(34,197,94,0.22)',
        '--border-3':'rgba(34,197,94,0.40)',
      }
    },
  ],

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

  NAV_ITEMS: [
    { id: 'dashboard',   label: 'Dashboard',        icon: '◈', path: '/dashboard/Dashboard.html' },
    { id: 'fo',          label: 'F&O Trades',        icon: '⟳', path: '/fo/FO.html' },
    { id: 'holdings',    label: 'Holdings',          icon: '▦', path: '/holdings/Holdings.html' },
    { id: 'investments', label: 'Investments',       icon: '◐', path: '/investments/Investments.html' },
    { id: 'ipo',         label: 'IPO',               icon: '⬡', path: '/ipo/IPO.html' },
    { id: 'log',         label: 'Trade Log',         icon: '≡', path: '/log/Log.html' },
    { id: 'analytics',   label: 'Analytics',         icon: '◉', path: '/analytics/Analytics.html' },
    { id: 'fa',          label: 'Fund. Analysis',    icon: '⊕', path: '/fa/FA.html' },
    { id: 'demat2',      label: 'Demat 2',           icon: '◫', path: '/demat2/Demat2.html' },
  ],
};