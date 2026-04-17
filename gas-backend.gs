/**
 * FTracker — Google Apps Script Backend
 * ======================================
 * Paste this entire file in:
 *   Extensions → Apps Script → Code.gs
 * Then: Deploy → New deployment → Web App
 *   - Execute as: Me
 *   - Who has access: Anyone
 *
 * Sheet Names Expected (case-sensitive):
 *   "F&O"           → F&O Trades
 *   "Holdings Data" → Stock Holdings
 *   "Investments"   → Individual Investments
 *   "IPO"           → IPO Records
 *   "Transactions"  → Transaction Log
 *
 * Adjust SHEET_MAP below to match your exact sheet tab names.
 */

const SHEET_MAP = {
  foTrades:     "F&O",
  holdings:     "Holdings Data",
  investments:  "Investments",
  ipos:         "IPO",
  transactions: "Transactions"
};

// ─── CORS Headers ────────────────────────────────────────────
function setCORSHeaders(output) {
  return output
    .setMimeType(ContentService.MimeType.JSON);
}

// ─── Read a sheet → array of arrays ─────────────────────────
function readSheet(ss, sheetName) {
  try {
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return { error: "Sheet '" + sheetName + "' not found" };
    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();
    if (lastRow < 1 || lastCol < 1) return [];
    const values = sheet.getRange(1, 1, lastRow, lastCol).getValues();
    // Convert Date objects to ISO strings
    return values.map(row =>
      row.map(cell => {
        if (cell instanceof Date) return cell.toISOString().split("T")[0];
        return cell;
      })
    );
  } catch (e) {
    return { error: e.message };
  }
}

// ─── doGet handler ───────────────────────────────────────────
function doGet(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const action = e && e.parameter && e.parameter.action;

  // WRITE: append a new trade row
  if (action === "addTrade") {
    return handleAddTrade(ss, e.parameter);
  }

  // Default: READ all sheets
  const payload = {
    success: true,
    timestamp: new Date().toISOString(),
    spreadsheetId: ss.getId(),
    spreadsheetName: ss.getName()
  };

  for (const [key, sheetName] of Object.entries(SHEET_MAP)) {
    payload[key] = readSheet(ss, sheetName);
  }

  const output = ContentService.createTextOutput(JSON.stringify(payload));
  return setCORSHeaders(output);
}

// ─── doPost handler (for future write ops) ──────────────────
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    if (body.action === "addRow") {
      const sheet = ss.getSheetByName(SHEET_MAP[body.sheet]);
      if (!sheet) throw new Error("Sheet not found: " + body.sheet);
      sheet.appendRow(body.row);
      const output = ContentService.createTextOutput(JSON.stringify({ success: true }));
      return setCORSHeaders(output);
    }

    throw new Error("Unknown action: " + body.action);
  } catch (err) {
    const output = ContentService.createTextOutput(JSON.stringify({ success: false, error: err.message }));
    return setCORSHeaders(output);
  }
}

// ─── Add trade helper ────────────────────────────────────────
function handleAddTrade(ss, params) {
  try {
    const sheet = ss.getSheetByName(SHEET_MAP.foTrades);
    if (!sheet) throw new Error("F&O sheet not found");
    const row = [
      params.date || new Date().toISOString().split("T")[0],
      params.instrument || "",
      params.type || "",
      params.entry || "",
      params.exit || "",
      params.qty || "",
      params.grossPnl || "",
      params.charges || "",
      params.netPnl || "",
      params.notes || ""
    ];
    sheet.appendRow(row);
    const output = ContentService.createTextOutput(JSON.stringify({ success: true, message: "Trade added" }));
    return setCORSHeaders(output);
  } catch (err) {
    const output = ContentService.createTextOutput(JSON.stringify({ success: false, error: err.message }));
    return setCORSHeaders(output);
  }
}

/**
 * TEST: Run this function manually in GAS editor to verify everything works.
 * Open View → Logs to see output.
 */
function testFetch() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Logger.log("Spreadsheet: " + ss.getName());
  for (const [key, name] of Object.entries(SHEET_MAP)) {
    const data = readSheet(ss, name);
    Logger.log(key + " → " + (Array.isArray(data) ? data.length + " rows" : JSON.stringify(data)));
  }
}
