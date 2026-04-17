# FTracker — Vanilla JS Edition

A comprehensive **F&O Trading Dashboard** built with pure HTML, CSS, and JavaScript.  
**No framework. No build step. Just open `index.html`.**

Data stored in **Google Sheets**, deployed on **Netlify**.

---

## 📂 Project Structure

```
ftracker/
├── index.html                  ← SPA shell (all tab sections live here)
├── css/
│   └── style.css               ← Dark terminal theme, full responsive
├── js/
│   ├── config.js               ← All constants + localStorage persistence
│   ├── sheets.js               ← Data layer (mock OR Apps Script fetch)
│   ├── charts.js               ← 8 Chart.js charts
│   ├── tables.js               ← 6 data tables with search/sort/filter
│   └── app.js                  ← Bootstrap: nav, modal, load, auto-refresh
├── netlify/
│   └── functions/
│       └── sheets-proxy.js     ← (Optional) Netlify Function for Sheets API
├── netlify.toml                ← Netlify deploy config
└── README.md
```

---

## 🚀 Quick Start (Demo Mode)

1. Clone or download this repo
2. Open `index.html` in your browser  
   *(or run `npx serve .` for local server)*
3. You'll see the dashboard loaded with built-in sample F&O data

No setup needed for demo mode.

---

## 🔗 Connect Your Google Sheet

### Option A — Google Apps Script (Recommended)

This is the simplest approach. The Apps Script acts as a public JSON API
for your sheet, and the frontend fetches from it directly.

**Step 1: Set up your Google Sheet**

Create a sheet with these exact tab names:
- `F&O` — F&O trades
- `Holdings Data` — stock holdings
- `Investments` — individual investments
- `IPO` — IPO investments
- `Transaction Log` — transaction history

Column order for each tab:

| F&O         | Holdings Data | Investments   | IPO          | Transaction Log |
|-------------|---------------|---------------|--------------|-----------------|
| Date        | Company Name  | Company Name  | Company      | Date            |
| Instrument  | Symbol        | Ticker        | Date         | Instrument      |
| Type        | Sector        | Date          | Issue Price  | Action          |
| Qty         | Avg Buy Price | Order Price   | Allotted     | Price           |
| Entry Price | Total Qty     | Filled Qty    | Listing Price| Qty             |
| Exit Price  | Total Invested| Current Price | Current Price| Amount          |
| Gross P&L   | Current Value | Invested      | Invested     | Charges         |
| Charges     | Signal        | Current Value |              |                 |
| Net P&L     |               |               |              |                 |

**Step 2: Add the Apps Script**

In your Google Sheet: **Extensions → Apps Script**

Paste this code:

```javascript
function doGet(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  function getSheetData(name) {
    const sheet = ss.getSheetByName(name);
    if (!sheet) return [];
    return sheet.getDataRange().getValues();
  }

  const payload = {
    fo:           getSheetData('F&O'),
    holdings:     getSheetData('Holdings Data'),
    investments:  getSheetData('Investments'),
    ipo:          getSheetData('IPO'),
    transactions: getSheetData('Transaction Log')
  };

  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
```

**Step 3: Deploy as Web App**

1. Click **Deploy → New deployment**
2. Type: **Web app**
3. Execute as: **Me**
4. Who has access: **Anyone** *(so the frontend can fetch it)*
5. Click **Deploy** → copy the URL

**Step 4: Configure FTracker**

1. Open FTracker in your browser
2. Click **⚙** (top right)
3. Set Data Source to **Google Apps Script Web App**
4. Paste your deployment URL
5. Click **Save & Reload**

---

### Option B — Netlify Function + Google Sheets API

Use this if you want to hide your Spreadsheet ID server-side.

1. Enable the **Google Sheets API** in Google Cloud Console
2. Create an **API key** (restrict it to Sheets API only)
3. In **Netlify → Site Settings → Environment Variables**, add:
   - `GOOGLE_API_KEY` = your API key
   - `SPREADSHEET_ID` = from your sheet URL (the long string between `/d/` and `/edit`)
4. Update `js/sheets.js` to call `/.netlify/functions/sheets-proxy?sheet=F%26O` etc.

---

## ☁️ Deploy to Netlify

### Via Netlify CLI
```bash
npm install -g netlify-cli
netlify login
netlify deploy --prod --dir .
```

### Via GitHub
1. Push this folder to a GitHub repo
2. Go to [app.netlify.com](https://app.netlify.com) → **New site from Git**
3. Select your repo
4. Build command: *(leave empty)*
5. Publish directory: `.`
6. Click **Deploy site**

Auto-deploy is enabled — every push to `main` deploys automatically.

---

## ⚙️ Customization

### Change column order
Edit `CONFIG.columns` in `js/config.js` to match your sheet's column layout.

### Change sheet tab names
Edit `CONFIG.sheetNames` in `js/config.js`.

### Add new tabs/sheets
1. Add a tab in `index.html`
2. Add nav button
3. Add a parse function in `js/sheets.js`
4. Add a render function in `js/tables.js`
5. Call it from `Tables.renderAll()`

### Change refresh interval
Open Settings (⚙) → Auto-Refresh dropdown.

---

## 🎨 Design

- **Theme**: Dark terminal ("Bloomberg meets Obsidian")
- **Colors**: `#00c896` profit green · `#ff4757` loss red · `#4895ef` blue
- **Fonts**: Sora (UI) + JetBrains Mono (numbers)
- **Charts**: Chart.js 4.4
- **No dependencies** except Chart.js (loaded from CDN)

---

## 📜 License

MIT — free to use, modify, and deploy.
