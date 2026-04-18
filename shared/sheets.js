/**
 * shared/sheets.js
 * ─────────────────────────────────────────────
 * Fetches all data from the Google Apps Script endpoint.
 * Caches in sessionStorage for CONFIG.CACHE_TTL ms.
 * Falls back to JSONP if CORS fetch fails.
 *
 * Usage (in any page JS):
 *   const data = await SHEETS.load();
 *   const holdingsRows = data.holdingsData.rows;
 *   const foRows       = data.fo.rows;
 */

const SHEETS = (() => {

  const CACHE_KEY = 'ftracker_data';
  const CACHE_TS  = 'ftracker_ts';

  // ── Public API ───────────────────────────────

  async function load(forceRefresh = false) {
    if (!forceRefresh) {
      const cached = readCache();
      if (cached) return cached;
    }
    const raw = await fetchFromGAS();
    writeCache(raw);
    return raw;
  }

  // ── Cache ─────────────────────────────────────
  function readCache() {
    try {
      const ts   = parseInt(sessionStorage.getItem(CACHE_TS) || '0');
      const now  = Date.now();
      if (!ts || now - ts > CONFIG.CACHE_TTL) return null;
      const json = sessionStorage.getItem(CACHE_KEY);
      if (!json) return null;
      return JSON.parse(json);
    } catch { return null; }
  }

  function writeCache(data) {
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
      sessionStorage.setItem(CACHE_TS,  String(Date.now()));
    } catch { /* quota exceeded — ignore */ }
  }

  function clearCache() {
    sessionStorage.removeItem(CACHE_KEY);
    sessionStorage.removeItem(CACHE_TS);
  }

  // ── Fetch strategies ──────────────────────────

  async function fetchFromGAS() {
    // Try CORS fetch first
    try {
      const res = await fetch(CONFIG.GAS_URL, {
        method: 'GET',
        mode:   'cors',
        cache:  'no-cache',
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'GAS returned error');
      return json;
    } catch (corsErr) {
      console.warn('[sheets] CORS fetch failed, trying JSONP…', corsErr.message);
    }

    // Fallback: JSONP
    try {
      return await jsonpFetch(CONFIG.GAS_URL);
    } catch (jsonpErr) {
      throw new Error('All fetch strategies failed. ' + jsonpErr.message);
    }
  }

  function jsonpFetch(url) {
    return new Promise((resolve, reject) => {
      const cb = '__ft_' + Date.now();
      const s  = document.createElement('script');
      const timer = setTimeout(() => {
        cleanup();
        reject(new Error('JSONP timeout (12s)'));
      }, 12000);
      window[cb] = data => { clearTimeout(timer); cleanup(); resolve(data); };
      s.onerror  = ()   => { clearTimeout(timer); cleanup(); reject(new Error('JSONP load failed')); };
      s.src = url + (url.includes('?') ? '&' : '?') + 'callback=' + cb;
      function cleanup() { delete window[cb]; s.remove(); }
      document.head.appendChild(s);
    });
  }

  // ── Data accessors ─────────────────────────────
  // Convenience getters that handle missing data gracefully

  function getFO(data) {
    return data?.fo || { headers: [], rows: [] };
  }

  function getHoldingsData(data) {
    // "Holdings Data" sheet — aggregated holdings with sentinel
    return data?.holdingsData || { headers: [], rows: [] };
  }

  function getInvestmentsTable(data, tableName) {
    // "Investments" sheet has multi tables: Holdings, IPOs, Trade_Transaction_Log
    const tables = data?.investments?.tables || [];
    const found  = tables.find(t =>
      t.table_name?.toLowerCase().trim() === tableName.toLowerCase().trim()
    );
    return found || { table_name: tableName, headers: [], rows: [] };
  }

  function getInvestmentsHoldings(data) {
    return getInvestmentsTable(data, 'Holdings');
  }

  function getInvestmentsIPOs(data) {
    return getInvestmentsTable(data, 'IPOs');
  }

  function getTradeLog(data) {
    return getInvestmentsTable(data, 'Trade_Transaction_Log');
  }

  function getFA(data) {
    return data?.fa || { headers: [], rows: [] };
  }

  function getDemat2(data) {
    return data?.demat2 || { headers: [], rows: [] };
  }

  return {
    load, clearCache,
    getFO, getHoldingsData,
    getInvestmentsHoldings, getInvestmentsIPOs, getTradeLog,
    getFA, getDemat2,
  };
})();
