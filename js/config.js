/**
 * js/config.js
 * ─────────────────────────────────────────────────────────
 * Single source of truth for app configuration.
 * All values persist in localStorage so settings survive page refresh.
 *
 * HOW IT WORKS:
 *   1. On load, values are read from localStorage (or defaults).
 *   2. Settings modal writes back to localStorage then reloads.
 *   3. Every other module reads from CONFIG (not localStorage directly).
 *
 * TO USE WITH YOUR GOOGLE SHEET:
 *   - Open Settings (⚙) in the app
 *   - Paste your Apps Script Web App URL
 *   - Save → the page reloads and fetches live data
 */

const CONFIG = {

  // ── DATA SOURCE ────────────────────────────────────────
  // "demo"        → built-in mock data (no external calls)
  // "appsscript"  → calls your Google Apps Script Web App URL
  dataSource: localStorage.getItem('ft_dataSource') || 'demo',

  // Google Apps Script Web App URL (set in Settings modal)
  sheetsUrl: localStorage.getItem('ft_sheetsUrl') || '',

  // ── REFRESH ────────────────────────────────────────────
  // Interval in ms. 0 = disabled.
  refreshInterval: parseInt(localStorage.getItem('ft_refreshInterval') || '300000', 10),

  // ── SHEET TAB NAMES ────────────────────────────────────
  // These must exactly match the tab names in your Google Sheet.
  // Sent as a query parameter so the Apps Script can pick the right sheet.
  sheetNames: {
    fo:           'F&O',
    holdings:     'Holdings Data',
    investments:  'Investments',
    ipo:          'IPO',
    transactions: 'Transaction Log'
  },

  // ── COLUMN INDEX MAP (0-based) ─────────────────────────
  // If your Google Sheet columns are in a different order, adjust here.
  // This tells the parser which column index maps to which field.
  columns: {
    fo: {
      date: 0, instrument: 1, type: 2, qty: 3,
      entry: 4, exit: 5, grossPnl: 6, charges: 7, netPnl: 8
    },
    holdings: {
      company: 0, symbol: 1, sector: 2, avgBuy: 3,
      qty: 4, invested: 5, currentValue: 6, signal: 7
    },
    investments: {
      company: 0, ticker: 1, date: 2, orderPrice: 3,
      qty: 4, currentPrice: 5, invested: 6, currentValue: 7
    },
    ipo: {
      company: 0, date: 1, issuePrice: 2, allotted: 3,
      listingPrice: 4, currentPrice: 5, invested: 6
    },
    transactions: {
      date: 0, instrument: 1, action: 2,
      price: 3, qty: 4, amount: 5, charges: 6
    }
  }
};

/**
 * Persist a config key to localStorage.
 * Call this before reloading.
 */
function saveConfig(updates) {
  Object.entries(updates).forEach(([key, val]) => {
    localStorage.setItem('ft_' + key, val);
    CONFIG[key] = val;
  });
}
