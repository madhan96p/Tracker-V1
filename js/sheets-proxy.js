/**
 * netlify/functions/sheets-proxy.js
 * ─────────────────────────────────────────────────────────
 * Netlify Serverless Function — Google Sheets API Proxy
 *
 * WHY THIS FILE EXISTS:
 *   If you use the Google Sheets API (not Apps Script), your API key
 *   must NEVER be embedded in frontend JS (anyone can steal it).
 *   This function runs server-side on Netlify and keeps the key secret.
 *
 * HOW IT WORKS:
 *   Frontend calls:  GET /.netlify/functions/sheets-proxy?sheet=F%26O
 *   This function:   Calls Google Sheets API with the secret key
 *                    Returns rows as JSON to the frontend
 *
 * SETUP:
 *   1. In Netlify dashboard → Site Settings → Environment Variables, add:
 *        GOOGLE_API_KEY  = your-google-api-key
 *        SPREADSHEET_ID  = your-spreadsheet-id (from the sheet URL)
 *
 *   2. Enable this in your app:
 *      In js/sheets.js, add a new fetch call to /.netlify/functions/sheets-proxy
 *      instead of the Apps Script URL.
 *
 * USAGE IN FRONTEND:
 *   const resp = await fetch('/.netlify/functions/sheets-proxy?sheet=F%26O');
 *   const { values } = await resp.json();
 *   // values is a 2D array: [ ["Date","Instrument",...], [row], ... ]
 *
 * NOTE:
 *   If you're using the Apps Script Web App approach (simpler),
 *   you don't need this function at all. The Apps Script URL is
 *   already public and CORS-friendly.
 */

const https = require('https');

// ── Sheets API helper ──────────────────────────────────────
function fetchSheetValues(spreadsheetId, sheetName, apiKey) {
  return new Promise((resolve, reject) => {
    const range    = encodeURIComponent(sheetName);
    const url      = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?key=${apiKey}`;
    const options  = new URL(url);

    const req = https.get(
      {
        hostname: options.hostname,
        path:     options.pathname + options.search,
      },
      res => {
        let body = '';
        res.on('data', chunk => (body += chunk));
        res.on('end', () => {
          try { resolve(JSON.parse(body)); }
          catch (e) { reject(new Error('JSON parse error: ' + body.slice(0, 200))); }
        });
      }
    );

    req.on('error', reject);
    req.end();
  });
}

// ── Handler ────────────────────────────────────────────────
exports.handler = async function (event) {
  // Only GET allowed
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // Read env vars (set in Netlify dashboard)
  const API_KEY        = process.env.GOOGLE_API_KEY;
  const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

  if (!API_KEY || !SPREADSHEET_ID) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Missing GOOGLE_API_KEY or SPREADSHEET_ID env vars. Set them in Netlify → Site Settings → Environment Variables.'
      })
    };
  }

  // ?sheet=F%26O  (the requested sheet tab name)
  const sheetName = event.queryStringParameters?.sheet;
  if (!sheetName) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing ?sheet= query param' }) };
  }

  try {
    const result = await fetchSheetValues(SPREADSHEET_ID, sheetName, API_KEY);

    if (result.error) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: result.error.message || 'Google Sheets API error' })
      };
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type':                'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control':               'max-age=60',   // cache 60s
      },
      body: JSON.stringify({ values: result.values || [] })
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
