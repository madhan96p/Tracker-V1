# FTracker v2 — F&O Portfolio Dashboard

Zero-build, multi-page HTML dashboard.  
**Google Sheets → Apps Script → HTML/CSS/JS → Netlify**

---

## ⚡ Stack

| Layer    | Technology                           |
|----------|--------------------------------------|
| Frontend | HTML5 + CSS3 + Vanilla JS (ES2020)   |
| Charts   | Chart.js 4.4 (CDN)                   |
| Fonts    | Syne · Instrument Serif · JetBrains Mono |
| Backend  | Google Apps Script (free)            |
| Storage  | Google Sheets                        |
| Hosting  | Netlify (free tier, zero build)      |

---

## 🗂 Project Structure

```
ftracker/ 
│
├── shared/
│   ├── common.css        ← Full design system (tokens, layout, tables, badges)
│   ├── config.js         ← GAS_URL · column maps · Sentinel colours · nav items
│   ├── utils.js          ← Formatters (₹, %, date) · P&L calculators · Sentinel logic
│   ├── sheets.js         ← Data fetch (CORS + JSONP fallback) · sessionStorage cache
│   └── components.js     ← Nav inject · table builder · chart defaults · loader
│
├── dashboard/            ← Dashboard.html · Dashboard.css · Dashboard.js
├── fo/                   ← FO.html · FO.css · FO.js
├── holdings/             ← Holdings.html · Holdings.css · Holdings.js ← BUG FIXED
├── investments/          ← Investments.html · Investments.css · Investments.js
├── ipo/                  ← IPO.html · IPO.css · IPO.js
├── log/                  ← Log.html · Log.css · Log.js
├── analytics/            ← Analytics.html · Analytics.css · Analytics.js
├── fa/                   ← FA.html · FA.css · FA.js
├── demat2/               ← Demat2.html · Demat2.css · Demat2.js
│
├── apps-script.gs        ← Paste into Google Apps Script editor
├── netlify.toml          ← Netlify config (zero-build, security headers)
├── index.html            ← Root redirect → dashboard
└── README.md
```

---

## 🔴 Bug Fixed: Holdings P&L

**Root cause:** Column offset error — code read `Total Brokerage Paid` (col 6, ~₹145)
as "Current Value" instead of `Current Value` (col 7).

| Column | Index | Value (IOC example) |
|--------|-------|---------------------|
| Total Invested      | 5 | ₹7,049.36 |
| Total Brokerage Paid| 6 | ₹145.99 ← old code used this! |
| Current Value       | 7 | ₹7,161.35 ← actual market value |

**Old (WRONG):** `P&L = ₹145.99 − ₹7,049.36 = −₹6,903.37`  
**Fixed:** `P&L = ₹7,161.35 − ₹7,049.36 = +₹111.99` ✅

Fix location: `holdings/Holdings.js` → confirmed column indices in `config.js`.

---

## 📋 Google Sheets Setup

### Sheet tabs required (exact names):

| Tab Name              | Used by               |
|-----------------------|-----------------------|
| `F&O`                 | FO page, Dashboard, Analytics |
| `Holdings Data`       | Holdings page, Dashboard     |
| `Investments`         | Investments, IPO, Log pages  |
| `Fundamental Analysis`| FA page                      |
| `Demat 2 76k`         | Demat2 page                  |

### Apps Script deployment:

1. Open your Google Sheet
2. **Extensions → Apps Script**
3. Paste entire contents of `apps-script.gs` into `Code.gs`
4. **Deploy → New deployment**
   - Type: **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone** ← must be this
5. Copy the `/exec` URL

### Update the URL:

In `shared/config.js`:
```javascript
GAS_URL: 'YOUR_COPIED_URL_HERE',
```

---

## 🚀 Deploy to Netlify

**Drag & drop (60 seconds):**
1. [app.netlify.com](https://app.netlify.com) → drag the entire `ftracker/` folder
2. Done — live!

**GitHub auto-deploy:**
1. Push to GitHub
2. Netlify → Add site → Import from Git → pick repo
3. Build command: *(leave empty)*
4. Publish directory: `.`
5. Every push to `main` auto-deploys

---

## 📊 Pages

| Page | Data Source | Key Features |
|------|-------------|--------------|
| Dashboard | F&O + Holdings Data | 9 KPIs · 3 charts · Holdings snapshot |
| F&O Trades | F&O sheet | My Calc vs Mail · Demat bar · Slippage · Win/Loss filter |
| Holdings | Holdings Data | **BUG FIXED** · Sentinel badges · Sector filter |
| Investments | Investments[Holdings] | Transaction-level equity |
| IPO | Investments[IPOs] | IPO P&L · Profit/Loss filter |
| Trade Log | Investments[Trade_Transaction_Log] | Running total · Daily chart |
| Analytics | F&O + Holdings | Instrument P&L · Monthly · Volume · Sector · Calc vs Mail |
| Fund. Analysis | Fundamental Analysis | Graham # · Health score · Frozen columns · Action badges |
| Demat 2 | Demat 2 76k | Separate account tracking |

---

## ⚙️ Key Config Options (`shared/config.js`)

```javascript
GAS_URL:            'your-url',        // Apps Script URL
CACHE_TTL:          5 * 60 * 1000,    // 5 min cache
AUTO_REFRESH:       5 * 60 * 1000,    // auto-refresh interval
PAGE_SIZE:          25,               // rows per table page
FO_INITIAL_CAPITAL: 50000,            // ₹50,000 F&O capital base
FO_RESERVE:         1000,             // ₹1,000 reserve for demat display
```

---

## 🐞 Troubleshooting

| Symptom | Fix |
|---------|-----|
| "Connection failed" | Re-deploy Apps Script as "Anyone" access |
| Wrong P&L in Holdings | Check column order matches `config.js HOLDINGS_DATA` map |
| Investments shows 0 rows | Check blank-row detection in `apps-script.gs` multi-table parser |
| Charts blank | Make sure Date + P&L columns exist in F&O sheet |
| FA page empty | Ensure Ticker (Input) column is not blank in FA sheet |
| Demat 2 missing | Check sheet tab is exactly `"Demat 2 76k"` |

---

## 🔒 Data Privacy

All data stays between your Google Sheets and your browser.  
No third-party analytics. No data sent anywhere except GAS ↔ browser.

---

MIT License — personal use.
