/**
 * FTracker — Google Apps Script v3
 * ─────────────────────────────────────────────────────────────────────────────
 * KEY FIXES:
 *   1. F&O: Row 1 = formula string (SKIP). Row 2 = real headers.
 *   2. Investments: Two-region scanner:
 *      LEFT  (cols A-K): detects tables by "Company Name"+"Ticker" pattern
 *      RIGHT (col P+):   reads Trade_Transaction_Log starting at P1
 *   3. Future-proof: table detection by content pattern, not hardcoded row numbers
 */

var SHEET_CFG = {
  fo:           { name: 'F&O',                 type: 'fo'          },
  holdingsData: { name: 'Holdings Data',        type: 'single'      },
  investments:  { name: 'Investments',          type: 'investments' },
  fa:           { name: 'Fundamental Analysis', type: 'single'      },
  demat2:       { name: 'Demat 2 76k',          type: 'single'      }
};

// ─── Cell formatter ───────────────────────────────────────────────────────────
function fmt(c) {
  if (c instanceof Date) {
    return Utilities.formatDate(c, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  return (c === null || c === undefined) ? '' : c;
}

function isBlank(row) {
  for (var i = 0; i < row.length; i++) {
    if (row[i] !== '' && row[i] !== null && row[i] !== undefined) return false;
  }
  return true;
}

function toObj(row, headers) {
  var obj = {};
  for (var i = 0; i < headers.length; i++) {
    if (headers[i]) obj[headers[i]] = fmt(row[i]);
  }
  return obj;
}

// ─── Single-table sheet ───────────────────────────────────────────────────────
function readSingle(sheet) {
  var lr = sheet.getLastRow();
  var lc = sheet.getLastColumn();
  if (lr < 2 || lc < 1) return { headers: [], rows: [] };

  var raw = sheet.getRange(1, 1, lr, lc).getValues();
  var headers = raw[0].map(function(h) { return String(h || '').trim(); });
  var rows = [];
  for (var i = 1; i < raw.length; i++) {
    if (isBlank(raw[i])) continue;
    rows.push(toObj(raw[i], headers));
  }
  return { headers: headers.filter(Boolean), rows: rows };
}

// ─── F&O sheet — skip Row 1 (formula), use Row 2 as headers ──────────────────
function readFO(sheet) {
  var lr = sheet.getLastRow();
  var lc = sheet.getLastColumn();
  if (lr < 3 || lc < 1) return { headers: [], rows: [] };

  var raw = sheet.getRange(1, 1, lr, lc).getValues();
  // raw[0] = Row 1 = formula string  → SKIP
  // raw[1] = Row 2 = real headers    → USE
  var headers = raw[1].map(function(h) { return String(h || '').trim(); });
  var rows = [];
  for (var i = 2; i < raw.length; i++) {  // Row 3+ = data
    if (isBlank(raw[i])) continue;
    rows.push(toObj(raw[i], headers));
  }
  return { headers: headers.filter(Boolean), rows: rows };
}

// ─── Investments sheet — two-region scanner ────────────────────────────────────
//
//  LEFT region (cols A–K, indices 0–10):
//    Rows 1–~11: summary dashboard area → SKIP
//    Table detection: row where colA="Company Name" AND colB="Ticker"
//    Table name: from the row directly above the header row
//
//  RIGHT region (col P = index 15 onwards):
//    Row 1 (index 0): Trade_Transaction_Log headers (Sl. No, Date, ...)
//    Rows 2+: data
//
function readInvestments(sheet) {
  var lr = sheet.getLastRow();
  var lc = sheet.getLastColumn();
  if (lr < 1 || lc < 1) return { tables: [] };

  var raw = sheet.getRange(1, 1, lr, lc).getValues();
  var data = raw.map(function(row) {
    return row.map(function(c) { return fmt(c); });
  });

  var tables = [];

  // ── LEFT region: scan for "Company Name" + "Ticker" header rows ────────────
  for (var r = 0; r < data.length; r++) {
    var a = String(data[r][0] || '').trim();
    var b = String(data[r][1] || '').trim();

    if (a === 'Company Name' && b === 'Ticker') {
      // Collect headers from A:K
      var hdrs = [];
      for (var c = 0; c <= 10 && c < data[r].length; c++) {
        hdrs.push(String(data[r][c] || '').trim());
      }

      // Table name = first non-blank cell in col A above this row
      var tName = '';
      for (var pr = r - 1; pr >= 0; pr--) {
        var cand = String(data[pr][0] || '').trim();
        if (cand && cand !== 'Company Name') { tName = cand; break; }
      }
      if (!tName) tName = (tables.length === 0) ? 'IPOs' : 'Holdings';

      // Collect data rows until next blank
      var rows = [];
      for (var dr = r + 1; dr < data.length; dr++) {
        var slice = data[dr].slice(0, 11);
        if (isBlank(slice)) break;
        rows.push(toObj(slice, hdrs));
      }

      tables.push({ table_name: tName, headers: hdrs.filter(Boolean), rows: rows });
    }
  }

  // ── RIGHT region: Trade_Transaction_Log at col P (0-based index 15) ─────────
  var P = 15; // column P
  if (lc > P) {
    var tlHdrs = data[0].slice(P).map(function(h) { return String(h || '').trim(); });
    var firstH = tlHdrs[0];

    // Detect by "Sl" or "No" in first header (case-insensitive)
    if (firstH && /sl|no/i.test(firstH)) {
      var filtHdrs = tlHdrs.filter(Boolean);
      var tlRows = [];

      for (var tr = 1; tr < data.length; tr++) {
        var rs = data[tr].slice(P);
        if (isBlank(rs)) continue;
        if (!rs[0] && !rs[1]) continue; // no Sl.No and no Date → skip

        var obj = {};
        for (var hi = 0; hi < filtHdrs.length; hi++) {
          obj[filtHdrs[hi]] = (rs[hi] !== '') ? rs[hi] : null;
        }
        tlRows.push(obj);
      }

      tables.push({
        table_name: 'Trade_Transaction_Log',
        headers:    filtHdrs,
        rows:       tlRows
      });
    }
  }

  return { tables: tables };
}

// ─── doGet entry point ────────────────────────────────────────────────────────
function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var out = {
      success:   true,
      timestamp: new Date().toISOString(),
      sheetId:   ss.getId(),
      sheetName: ss.getName()
    };

    for (var key in SHEET_CFG) {
      var cfg   = SHEET_CFG[key];
      var sh    = ss.getSheetByName(cfg.name);
      if (!sh) { out[key] = { error: "Sheet not found: " + cfg.name }; continue; }

      if      (cfg.type === 'fo')          out[key] = readFO(sh);
      else if (cfg.type === 'investments') out[key] = readInvestments(sh);
      else                                 out[key] = readSingle(sh);
    }

    return ContentService
      .createTextOutput(JSON.stringify(out))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ─── Manual test — run from GAS editor, check Logs ───────────────────────────
function testAll() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  Logger.log('=== FTracker v3 Test ===');

  // F&O
  var fo = readFO(ss.getSheetByName('F&O'));
  Logger.log('F&O headers[0-4]: ' + fo.headers.slice(0,5).join(' | '));
  Logger.log('F&O rows: ' + fo.rows.length);
  if (fo.rows[0]) Logger.log('F&O row1 → Date:' + fo.rows[0]['Date'] + ' Net P&L:' + fo.rows[0]['Net P&L']);

  // Investments
  var inv = readInvestments(ss.getSheetByName('Investments'));
  Logger.log('Investments tables: ' + inv.tables.length);
  inv.tables.forEach(function(t) {
    Logger.log('  [' + t.table_name + '] ' + t.rows.length + ' rows | ' + t.headers.slice(0,4).join(', '));
    if (t.rows[0]) Logger.log('    row1: ' + JSON.stringify(t.rows[0]).slice(0, 120));
  });

  // Holdings Data
  var hd = readSingle(ss.getSheetByName('Holdings Data'));
  Logger.log('Holdings Data: ' + hd.rows.length + ' rows');
  if (hd.rows[0]) Logger.log('  row1 Invested=' + hd.rows[0]['Total Invested'] + ' Current=' + hd.rows[0]['Current Value']);
}
