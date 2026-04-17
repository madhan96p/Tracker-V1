/**
 * js/sheets.js
 * ─────────────────────────────────────────────────────────
 * Data layer. Two modes:
 *
 *  MODE 1 — DEMO (CONFIG.dataSource === 'demo')
 *    Returns built-in mock data. No network calls.
 *    Great for development and first-look.
 *
 *  MODE 2 — APPS SCRIPT (CONFIG.dataSource === 'appsscript')
 *    Calls your Google Apps Script Web App URL.
 *    The Apps Script must return JSON in the shape:
 *      { fo: [[row],[row],...], holdings: [...], ... }
 *    See README.md for the exact Apps Script code to deploy.
 *
 * PUBLIC API (called by app.js):
 *   const data = await SheetsService.load();
 *   // data → { fo, holdings, investments, ipo, transactions }
 *   // Each key is an array of plain objects (already parsed).
 */

const SheetsService = (() => {

  /* ══════════════════════════════════════════════════════
     MOCK DATA  — realistic Indian F&O / equity data
  ══════════════════════════════════════════════════════ */

  const MOCK = {

    fo: [
      // {date, instrument, type, qty, entry, exit, grossPnl, charges, netPnl}
      { date:'2025-03-03', instrument:'NIFTY 23000 CE', type:'BUY',  qty:50,  entry:145.5,  exit:312.0,  grossPnl:8325,   charges:210, netPnl:8115  },
      { date:'2025-03-05', instrument:'BANKNIFTY 51000 PE', type:'BUY',  qty:15,  entry:220.0,  exit:95.5,   grossPnl:-1867.5, charges:165, netPnl:-2032.5 },
      { date:'2025-03-07', instrument:'NIFTY 23200 PE', type:'BUY',  qty:50,  entry:88.0,   exit:195.0,  grossPnl:5350,   charges:195, netPnl:5155  },
      { date:'2025-03-10', instrument:'RELIANCE 2900 CE', type:'BUY',  qty:250, entry:34.5,   exit:82.0,   grossPnl:11875,  charges:320, netPnl:11555 },
      { date:'2025-03-12', instrument:'BANKNIFTY 51500 CE', type:'BUY',  qty:15,  entry:380.0,  exit:210.0,  grossPnl:-2550,  charges:175, netPnl:-2725 },
      { date:'2025-03-14', instrument:'NIFTY 23100 CE', type:'BUY',  qty:50,  entry:195.0,  exit:420.0,  grossPnl:11250,  charges:290, netPnl:10960 },
      { date:'2025-03-18', instrument:'TCS 4000 CE',    type:'BUY',  qty:175, entry:55.0,   exit:120.5,  grossPnl:11462.5,charges:280, netPnl:11182.5},
      { date:'2025-03-20', instrument:'NIFTY 22800 PE', type:'BUY',  qty:50,  entry:280.0,  exit:130.0,  grossPnl:-7500,  charges:220, netPnl:-7720 },
      { date:'2025-03-24', instrument:'BANKNIFTY 52000 CE',type:'BUY', qty:15, entry:450.0, exit:890.0,  grossPnl:6600,   charges:240, netPnl:6360  },
      { date:'2025-03-26', instrument:'INFY 1800 CE',   type:'BUY',  qty:400, entry:28.5,   exit:65.0,   grossPnl:14600,  charges:310, netPnl:14290 },
      { date:'2025-03-28', instrument:'NIFTY 23500 CE', type:'BUY',  qty:50,  entry:110.0,  exit:55.0,   grossPnl:-2750,  charges:185, netPnl:-2935 },
      { date:'2025-04-02', instrument:'BANKNIFTY 51000 CE',type:'BUY', qty:15, entry:520.0, exit:1200.0, grossPnl:10200,  charges:360, netPnl:9840  },
      { date:'2025-04-04', instrument:'NIFTY 23400 PE', type:'BUY',  qty:50,  entry:165.0,  exit:95.0,   grossPnl:-3500,  charges:195, netPnl:-3695 },
      { date:'2025-04-07', instrument:'HDFCBANK 1900 CE',type:'BUY', qty:550, entry:22.0,   exit:58.0,   grossPnl:19800,  charges:420, netPnl:19380 },
      { date:'2025-04-09', instrument:'NIFTY 23200 CE', type:'BUY',  qty:50,  entry:230.0,  exit:480.0,  grossPnl:12500,  charges:300, netPnl:12200 },
      { date:'2025-04-11', instrument:'BANKNIFTY 51500 PE',type:'BUY', qty:15, entry:310.0, exit:140.0,  grossPnl:-2550,  charges:170, netPnl:-2720 },
      { date:'2025-04-14', instrument:'NIFTY 23000 PE', type:'BUY',  qty:50,  entry:98.0,   exit:220.0,  grossPnl:6100,   charges:215, netPnl:5885  },
    ],

    holdings: [
      // {company, symbol, sector, avgBuy, qty, invested, currentValue, signal}
      { company:'Reliance Industries', symbol:'RELIANCE',  sector:'Energy',       avgBuy:2450, qty:40,  invested:98000,  currentValue:115600, signal:'HOLD' },
      { company:'HDFC Bank',           symbol:'HDFCBANK',  sector:'Banking',      avgBuy:1620, qty:60,  invested:97200,  currentValue:109800, signal:'BUY'  },
      { company:'Infosys',             symbol:'INFY',      sector:'IT',           avgBuy:1480, qty:80,  invested:118400, currentValue:132000, signal:'BUY'  },
      { company:'TCS',                 symbol:'TCS',       sector:'IT',           avgBuy:3800, qty:25,  invested:95000,  currentValue:104750, signal:'HOLD' },
      { company:'ICICI Bank',          symbol:'ICICIBANK', sector:'Banking',      avgBuy:960,  qty:100, invested:96000,  currentValue:113000, signal:'BUY'  },
      { company:'Wipro',               symbol:'WIPRO',     sector:'IT',           avgBuy:425,  qty:200, invested:85000,  currentValue:78000,  signal:'SELL' },
      { company:'Bajaj Finance',       symbol:'BAJFINANCE',sector:'NBFC',         avgBuy:6800, qty:12,  invested:81600,  currentValue:88200,  signal:'HOLD' },
      { company:'Tata Motors',         symbol:'TATAMOTORS',sector:'Auto',         avgBuy:780,  qty:120, invested:93600,  currentValue:105600, signal:'BUY'  },
      { company:'Asian Paints',        symbol:'ASIANPAINT',sector:'Consumer',     avgBuy:3200, qty:28,  invested:89600,  currentValue:83720,  signal:'HOLD' },
      { company:'Maruti Suzuki',       symbol:'MARUTI',    sector:'Auto',         avgBuy:10500,qty:8,   invested:84000,  currentValue:99200,  signal:'BUY'  },
    ],

    investments: [
      // {company, ticker, date, orderPrice, qty, currentPrice, invested, currentValue}
      { company:'Zomato',          ticker:'ZOMATO',    date:'2024-11-15', orderPrice:185,  qty:500,  currentPrice:228,  invested:92500,  currentValue:114000 },
      { company:'Jio Financial',   ticker:'JIOFIN',    date:'2024-10-20', orderPrice:310,  qty:200,  currentPrice:285,  invested:62000,  currentValue:57000  },
      { company:'Paytm',           ticker:'PAYTM',     date:'2024-12-01', orderPrice:520,  qty:150,  currentPrice:620,  invested:78000,  currentValue:93000  },
      { company:'Nykaa',           ticker:'NYKAA',     date:'2025-01-10', orderPrice:165,  qty:400,  currentPrice:182,  invested:66000,  currentValue:72800  },
      { company:'Policybazaar',    ticker:'POLICYBZR', date:'2025-02-05', orderPrice:1400, qty:50,   currentPrice:1550, invested:70000,  currentValue:77500  },
      { company:'Delhivery',       ticker:'DELHIVERY', date:'2025-01-22', orderPrice:380,  qty:180,  currentPrice:345,  invested:68400,  currentValue:62100  },
    ],

    ipo: [
      // {company, date, issuePrice, allotted, listingPrice, currentPrice, invested}
      { company:'Hyundai India',      date:'2024-10-22', issuePrice:1960, allotted:8,   listingPrice:1934, currentPrice:1820, invested:15680 },
      { company:'Swiggy',             date:'2024-11-13', issuePrice:390,  allotted:38,  listingPrice:412,  currentPrice:445,  invested:14820 },
      { company:'NTPC Green Energy',  date:'2024-11-27', issuePrice:108,  allotted:138, listingPrice:111,  currentPrice:130,  invested:14904 },
      { company:'Vishal Mega Mart',   date:'2024-12-11', issuePrice:78,   allotted:192, listingPrice:98,   currentPrice:88,   invested:14976 },
      { company:'Hexaware Tech',      date:'2025-02-12', issuePrice:708,  allotted:21,  listingPrice:745,  currentPrice:820,  invested:14868 },
    ],

    transactions: [
      // {date, instrument, action, price, qty, amount, charges}
      { date:'2025-04-14', instrument:'NIFTY 23000 PE',     action:'BUY',  price:98,    qty:50,  amount:4900,   charges:85  },
      { date:'2025-04-14', instrument:'NIFTY 23000 PE',     action:'SELL', price:220,   qty:50,  amount:11000,  charges:130 },
      { date:'2025-04-11', instrument:'BANKNIFTY 51500 PE', action:'BUY',  price:310,   qty:15,  amount:4650,   charges:80  },
      { date:'2025-04-11', instrument:'BANKNIFTY 51500 PE', action:'SELL', price:140,   qty:15,  amount:2100,   charges:90  },
      { date:'2025-04-09', instrument:'NIFTY 23200 CE',     action:'BUY',  price:230,   qty:50,  amount:11500,  charges:155 },
      { date:'2025-04-09', instrument:'NIFTY 23200 CE',     action:'SELL', price:480,   qty:50,  amount:24000,  charges:145 },
      { date:'2025-04-07', instrument:'HDFCBANK 1900 CE',   action:'BUY',  price:22,    qty:550, amount:12100,  charges:190 },
      { date:'2025-04-07', instrument:'HDFCBANK 1900 CE',   action:'SELL', price:58,    qty:550, amount:31900,  charges:230 },
      { date:'2025-04-04', instrument:'NIFTY 23400 PE',     action:'BUY',  price:165,   qty:50,  amount:8250,   charges:110 },
      { date:'2025-04-04', instrument:'NIFTY 23400 PE',     action:'SELL', price:95,    qty:50,  amount:4750,   charges:85  },
      { date:'2025-04-02', instrument:'BANKNIFTY 51000 CE', action:'BUY',  price:520,   qty:15,  amount:7800,   charges:120 },
      { date:'2025-04-02', instrument:'BANKNIFTY 51000 CE', action:'SELL', price:1200,  qty:15,  amount:18000,  charges:240 },
      { date:'2025-03-28', instrument:'NIFTY 23500 CE',     action:'BUY',  price:110,   qty:50,  amount:5500,   charges:95  },
      { date:'2025-03-28', instrument:'NIFTY 23500 CE',     action:'SELL', price:55,    qty:50,  amount:2750,   charges:90  },
      { date:'2025-03-26', instrument:'INFY 1800 CE',       action:'BUY',  price:28.5,  qty:400, amount:11400,  charges:165 },
      { date:'2025-03-26', instrument:'INFY 1800 CE',       action:'SELL', price:65,    qty:400, amount:26000,  charges:145 },
    ]
  };


  /* ══════════════════════════════════════════════════════
     APPS SCRIPT PARSER
     Converts raw 2D arrays from Google Sheets into objects.
     Row 0 is treated as the header row and skipped.
  ══════════════════════════════════════════════════════ */

  function parseRows(rows, colMap) {
    if (!rows || rows.length < 2) return [];
    return rows.slice(1)                     // skip header
      .filter(r => r.some(c => c !== ''))    // skip blank rows
      .map(r => {
        const obj = {};
        Object.entries(colMap).forEach(([key, idx]) => {
          obj[key] = r[idx] ?? '';
        });
        return obj;
      });
  }

  function parseFO(rows) {
    return parseRows(rows, CONFIG.columns.fo).map(r => ({
      ...r,
      qty:      +r.qty      || 0,
      entry:    +r.entry    || 0,
      exit:     +r.exit     || 0,
      grossPnl: +r.grossPnl || 0,
      charges:  +r.charges  || 0,
      netPnl:   +r.netPnl   || 0,
    }));
  }

  function parseHoldings(rows) {
    return parseRows(rows, CONFIG.columns.holdings).map(r => ({
      ...r,
      avgBuy:       +r.avgBuy       || 0,
      qty:          +r.qty          || 0,
      invested:     +r.invested     || 0,
      currentValue: +r.currentValue || 0,
    }));
  }

  function parseInvestments(rows) {
    return parseRows(rows, CONFIG.columns.investments).map(r => ({
      ...r,
      orderPrice:   +r.orderPrice   || 0,
      qty:          +r.qty          || 0,
      currentPrice: +r.currentPrice || 0,
      invested:     +r.invested     || 0,
      currentValue: +r.currentValue || 0,
    }));
  }

  function parseIPO(rows) {
    return parseRows(rows, CONFIG.columns.ipo).map(r => ({
      ...r,
      issuePrice:   +r.issuePrice   || 0,
      allotted:     +r.allotted     || 0,
      listingPrice: +r.listingPrice || 0,
      currentPrice: +r.currentPrice || 0,
      invested:     +r.invested     || 0,
    }));
  }

  function parseTransactions(rows) {
    return parseRows(rows, CONFIG.columns.transactions).map(r => ({
      ...r,
      price:   +r.price   || 0,
      qty:     +r.qty     || 0,
      amount:  +r.amount  || 0,
      charges: +r.charges || 0,
    }));
  }


  /* ══════════════════════════════════════════════════════
     FETCH FROM APPS SCRIPT WEB APP
     
     Your Apps Script must return JSON like:
     {
       "fo":           [ ["Date","Instrument","Type",...], [row], ... ],
       "holdings":     [ [...], [...] ],
       "investments":  [ [...], [...] ],
       "ipo":          [ [...], [...] ],
       "transactions": [ [...], [...] ]
     }
     
     See README.md for the full Apps Script code.
  ══════════════════════════════════════════════════════ */

  async function fetchFromAppsScript(url) {
    // Append a cache-buster so we always get fresh data
    const fullUrl = url + (url.includes('?') ? '&' : '?') + '_=' + Date.now();

    const resp = await fetch(fullUrl);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

    const json = await resp.json();
    if (json.error) throw new Error(json.error);

    return {
      fo:           parseFO(json.fo),
      holdings:     parseHoldings(json.holdings),
      investments:  parseInvestments(json.investments),
      ipo:          parseIPO(json.ipo),
      transactions: parseTransactions(json.transactions),
    };
  }


  /* ══════════════════════════════════════════════════════
     PUBLIC: load()
     Picks the right data source based on CONFIG.
  ══════════════════════════════════════════════════════ */

  async function load() {
    if (CONFIG.dataSource === 'appsscript' && CONFIG.sheetsUrl) {
      return await fetchFromAppsScript(CONFIG.sheetsUrl);
    }
    // Default: return mock data (simulate a small async delay)
    await new Promise(r => setTimeout(r, 400));
    return structuredClone(MOCK);
  }


  return { load };

})();
