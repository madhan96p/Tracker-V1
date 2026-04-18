/**
 * FTracker — Google Apps Script Backend v2
 * =========================================
 * Deploy: Extensions → Apps Script → Deploy → New deployment
 *   Type:         Web App
 *   Execute as:   Me
 *   Who can access: Anyone
 *
 * Returns all sheet data as structured JSON.
 * Handles multi-table sheets (Investments) by detecting blank-row separators.
 */

// ─── Sheet Configuration ──────────────────────────────────────────────────────
const SHEETS = {
  fo:            { name: "F&O",                  multi: false },
  holdingsData:  { name: "Holdings Data",        multi: false },
  investments:   { name: "Investments",          multi: true  },   // 3 tables inside
  fa:            { name: "Fundamental Analysis", multi: false },
  demat2:        { name: "Demat 2 76k",          multi: false },
};

// ─── CORS helper ─────────────────────────────────────────────────────────────
function jsonOut(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ─── Main entry point ─────────────────────────────────────────────────────────
function doGet(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const result = {
      success:    true,
      timestamp:  new Date().toISOString(),
      sheetId:    ss.getId(),
      sheetName:  ss.getName(),
    };

    for (const [key, cfg] of Object.entries(SHEETS)) {
      const sheet = ss.getSheetByName(cfg.name);
      if (!sheet) {
        result[key] = { error: "Sheet '" + cfg.name + "' not found" };
        continue;
      }
      if (cfg.multi) {
        result[key] = readMultiTableSheet(sheet);
      } else {
        result[key] = readSingleSheet(sheet);
      }
    }

    return jsonOut(result);
  } catch (e) {
    return jsonOut({ success: false, error: e.message, stack: e.stack });
  }
}

// ─── Read a single-table sheet → { headers, rows } ───────────────────────────
function readSingleSheet(sheet) {
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow < 2 || lastCol < 1) return { headers: [], rows: [] };

  const raw = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  const headers = raw[0].map(h => String(h || '').trim());

  const rows = [];
  for (let i = 1; i < raw.length; i++) {
    const r = raw[i];
    // Skip completely empty rows
    if (r.every(c => c === '' || c === null || c === undefined)) continue;
    const obj = {};
    headers.forEach((h, j) => {
      let v = r[j];
      if (v instanceof Date) v = Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
      obj[h] = (v === null || v === undefined) ? null : v;
    });
    rows.push(obj);
  }
  return { headers, rows };
}

// ─── Read a multi-table sheet → { tables: [{name, headers, rows}] } ──────────
//   Tables are separated by blank rows. First non-empty row after a blank is the
//   table header. We also fall back to detecting rows where col-A looks like a
//   header label (string) after data rows.
function readMultiTableSheet(sheet) {
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow < 1 || lastCol < 1) return { tables: [] };

  const raw = sheet.getRange(1, 1, lastRow, lastCol).getValues();

  // Convert dates
  const data = raw.map(row =>
    row.map(c => {
      if (c instanceof Date) return Utilities.formatDate(c, Session.getScriptTimeZone(), 'yyyy-MM-dd');
      return (c === null || c === undefined) ? '' : c;
    })
  );

  const tables = [];
  let i = 0;

  while (i < data.length) {
    // Skip blank rows
    if (isBlankRow(data[i])) { i++; continue; }

    // This non-blank row is a table header
    const headers = data[i].map(h => String(h || '').trim()).filter((_, idx) =>
      data[i].slice(idx).some(c => c !== '')
    );
    // Recompute headers for all columns (including trailing empties up to lastCol)
    const fullHeaders = data[i].map(h => String(h || '').trim());
    i++;

    const rows = [];
    while (i < data.length && !isBlankRow(data[i])) {
      const obj = {};
      fullHeaders.forEach((h, j) => {
        if (h) obj[h] = data[i][j] !== '' ? data[i][j] : null;
      });
      rows.push(obj);
      i++;
    }

    // Derive table name from first header or position
    const tableName = fullHeaders[0] || ('Table_' + (tables.length + 1));
    tables.push({
      table_name: deriveTableName(fullHeaders, tables.length),
      headers:    fullHeaders.filter(h => h !== ''),
      rows,
    });
  }

  return { tables };
}

function isBlankRow(row) {
  return row.every(c => c === '' || c === null || c === undefined);
}

// Known table names for the Investments sheet based on confirmed structure
const KNOWN_TABLE_NAMES = ['Holdings', 'IPOs', 'Trade_Transaction_Log'];

function deriveTableName(headers, idx) {
  // Try to match known tables by their first header
  const firstH = (headers[0] || '').trim();
  if (firstH === 'Company Name') {
    // Could be Holdings or IPOs - use positional index
    return idx === 0 ? 'Holdings' : 'IPOs';
  }
  if (firstH === 'Sl. No' || firstH === 'Sl.No' || firstH === 'S.No') {
    return 'Trade_Transaction_Log';
  }
  return KNOWN_TABLE_NAMES[idx] || ('Table_' + (idx + 1));
}

// ─── Test function — run manually from GAS editor ─────────────────────────────
function testAll() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Logger.log('Spreadsheet: ' + ss.getName());
  for (const [key, cfg] of Object.entries(SHEETS)) {
    const sheet = ss.getSheetByName(cfg.name);
    if (!sheet) { Logger.log(key + ': SHEET NOT FOUND → ' + cfg.name); continue; }
    const data = cfg.multi ? readMultiTableSheet(sheet) : readSingleSheet(sheet);
    if (cfg.multi) {
      Logger.log(key + ' (multi): ' + (data.tables || []).length + ' tables');
      (data.tables || []).forEach(t => Logger.log('  - ' + t.table_name + ': ' + t.rows.length + ' rows'));
    } else {
      Logger.log(key + ': ' + (data.rows || []).length + ' rows, ' + (data.headers || []).length + ' cols');
    }
  }
}
