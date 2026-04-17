# FTracker — F&O Portfolio Dashboard

A zero-build, single-file trading dashboard that reads directly from Google Sheets  
via Apps Script and deploys instantly to Netlify.

---

## ⚡ Tech Stack

| Layer    | Technology                  |
|----------|-----------------------------|
| Frontend | HTML5 + CSS3 + Vanilla JS   |
| Charts   | Chart.js 4.4 (CDN)          |
| Fonts    | Syne, Instrument Serif, JetBrains Mono (Google Fonts) |
| Backend  | Google Apps Script (free)   |
| Storage  | Google Sheets               |
| Hosting  | Netlify (free tier)         |
| Build    | **None** — zero build step  |

---

## 📋 Google Sheets Setup

### Step 1 — Sheet tab names
Your Google Sheet must have these exact tab names (case-sensitive):

| Tab Name       | Data Section        |
|----------------|---------------------|
| `F&O`          | F&O Trades          |
| `Holdings Data`| Stock Holdings      |
| `Investments`  | Individual Investments |
| `IPO`          | IPO Records         |
| `Transactions` | Transaction Log     |

> You can change these names in `gas-backend.gs` under `SHEET_MAP`.

### Step 2 — Deploy the Apps Script

1. Open your Google Sheet
2. Go to **Extensions → Apps Script**
3. Delete the default `Code.gs` content
4. Paste the entire contents of `gas-backend.gs`
5. Save (Ctrl+S)
6. Click **Deploy → New deployment**
   - Type: **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone** ← important!
7. Click **Deploy** and copy the Web App URL

### Step 3 — Update the Frontend URL

In `index.html`, find this line near the top of the `<script>` block:

```javascript
const GAS_URL = 'https://script.google.com/macros/s/...YOUR_SCRIPT.../exec';
```

Replace the URL with the one you copied in Step 2.

---

## 🚀 Netlify Deployment

### Option A — Drag & Drop (fastest)
1. Go to [app.netlify.com](https://app.netlify.com)
2. Drag and drop the `ftracker/` folder onto the dashboard
3. Done — live in seconds!

### Option B — GitHub + Auto-deploy
1. Push this folder to a GitHub repo
2. On Netlify: **Add new site → Import from Git**
3. Select your repo
4. Build settings are auto-detected from `netlify.toml`
5. Every `git push` to `main` auto-deploys

---

## 🗂 Project Structure

```
ftracker/
├── index.html        ← The entire app (HTML + CSS + JS, single file)
├── netlify.toml      ← Netlify deploy config
├── gas-backend.gs    ← Google Apps Script (paste into GAS editor)
└── README.md         ← This file
```

---

## 📊 Dashboard Sections

| Section       | Description                                          |
|---------------|------------------------------------------------------|
| Dashboard     | Summary KPIs + Cumulative P&L + Win/Loss + Daily P&L |
| F&O Trades    | Full trade log with search, filter (Win/Loss), sort, pagination |
| Holdings      | Stock portfolio with P&L per position                |
| Investments   | Individual investment transactions                   |
| IPO           | IPO allotment tracker                                |
| Transactions  | Full transaction history                             |
| Analytics     | Volume chart, holdings distribution, monthly P&L, instrument-wise breakdown |

---

## 🔄 Data Refresh

- Data auto-refreshes every **5 minutes**
- Manual refresh via the **↻ Refresh** button in the top-right
- A connection indicator in the bottom-left shows live/error status

---

## ⚙️ Column Auto-Detection

The dashboard automatically detects column types by name:

| Detected as | Column name contains           |
|-------------|-------------------------------|
| P&L         | `p&l`, `pnl`, `profit`, `net`, `gross` |
| Currency    | `price`, `value`, `invest`, `charges`, `avg`, `cost`, `ltp`, `current`, `entry`, `exit` |
| Percentage  | `%`, `percent`, `pct`, `return`, `rate` |
| Quantity    | `qty`, `quantity`, `lots`, `shares`, `filled` |
| Date        | `date`, `time`                |

Positive P&L values appear **green**, negative appear **red** automatically.

---

## 🛠 Customisation

### Change the GAS URL
```javascript
// index.html, inside <script>
const GAS_URL = 'YOUR_NEW_URL_HERE';
```

### Change auto-refresh interval
```javascript
const AUTO_REFRESH_MS = 5 * 60 * 1000; // 5 minutes → change as needed
```

### Change rows per page
```javascript
const PAGE_SIZE = 30; // rows per table page
```

### Change sheet tab names (in gas-backend.gs)
```javascript
const SHEET_MAP = {
  foTrades:    "F&O",           // ← your actual tab name
  holdings:    "Holdings Data",
  investments: "Investments",
  ipos:        "IPO",
  transactions: "Transactions"
};
```

---

## 🐞 Troubleshooting

| Issue | Fix |
|-------|-----|
| "Connection failed" | Check that Apps Script is deployed as "Anyone" can access |
| Blank tables | Verify the sheet tab names match `SHEET_MAP` exactly |
| Wrong numbers | Check that the first row of each sheet is a header row |
| CORS error in console | Re-deploy the Apps Script as a new deployment (not just a new version) |
| Charts not rendering | Data may be missing Date or P&L columns — check column headers |

---

## 📄 License

MIT — use freely for personal finance tracking.
