/**
 * js/app.js
 * ─────────────────────────────────────────────────────────
 * Application entry point.
 *
 * RESPONSIBILITIES:
 *   1. Tab navigation (click → show panel, hide others)
 *   2. Settings modal (open/close/save)
 *   3. Load data via SheetsService
 *   4. Pass data to Tables.renderAll() and Charts.renderAll()
 *   5. Auto-refresh on interval
 *   6. Sync status dot (offline / live)
 *
 * BOOT ORDER:
 *   config.js → sheets.js → charts.js → tables.js → app.js
 *   (enforced by <script> order in index.html)
 */

(function () {
  'use strict';

  let refreshTimer = null;

  /* ══════════════════════════════════════════════════════
     1. TAB NAVIGATION
  ══════════════════════════════════════════════════════ */
  function initNav() {
    document.getElementById('mainNav').addEventListener('click', e => {
      const btn = e.target.closest('.nav-btn');
      if (!btn) return;

      // Toggle active state on buttons
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Show matching panel, hide others
      const target = btn.dataset.tab;
      document.querySelectorAll('.tab-panel').forEach(p => {
        p.classList.toggle('active', p.id === 'tab-' + target);
      });
    });
  }


  /* ══════════════════════════════════════════════════════
     2. SETTINGS MODAL
  ══════════════════════════════════════════════════════ */
  function initSettings() {
    const modal      = document.getElementById('settingsModal');
    const openBtn    = document.getElementById('settingsBtn');
    const closeBtn   = document.getElementById('closeSettings');
    const cancelBtn  = document.getElementById('cancelSettings');
    const saveBtn    = document.getElementById('saveSettings');
    const srcSelect  = document.getElementById('dataSourceSelect');
    const urlInput   = document.getElementById('sheetsUrlInput');
    const asgGroup   = document.getElementById('appsScriptGroup');
    const refSelect  = document.getElementById('refreshInterval');

    // Pre-populate with current config
    function populateModal() {
      srcSelect.value  = CONFIG.dataSource;
      urlInput.value   = CONFIG.sheetsUrl;
      refSelect.value  = String(CONFIG.refreshInterval);
      asgGroup.style.display = CONFIG.dataSource === 'appsscript' ? '' : 'none';
    }

    // Show/hide URL input
    srcSelect.addEventListener('change', () => {
      asgGroup.style.display = srcSelect.value === 'appsscript' ? '' : 'none';
    });

    openBtn.addEventListener('click', () => {
      populateModal();
      modal.classList.add('open');
    });

    function closeModal() { modal.classList.remove('open'); }

    closeBtn.addEventListener('click',   closeModal);
    cancelBtn.addEventListener('click',  closeModal);
    modal.addEventListener('click', e => {
      if (e.target === modal) closeModal();
    });

    saveBtn.addEventListener('click', () => {
      saveConfig({
        dataSource:      srcSelect.value,
        sheetsUrl:       urlInput.value.trim(),
        refreshInterval: parseInt(refSelect.value, 10),
      });
      closeModal();
      loadData();            // reload with new settings
      restartRefreshTimer(); // restart timer with new interval
    });
  }


  /* ══════════════════════════════════════════════════════
     3. SYNC STATUS INDICATOR
  ══════════════════════════════════════════════════════ */
  function setStatus(state) {
    // state: 'loading' | 'live' | 'error'
    const dot   = document.querySelector('.sync-dot');
    const label = document.getElementById('syncLabel');

    dot.className = 'sync-dot';
    if (state === 'live')    { dot.classList.add('live'); label.textContent = 'Live'; }
    else if (state === 'loading') { label.textContent = 'Syncing…'; }
    else                     { label.textContent = 'Offline'; }
  }


  /* ══════════════════════════════════════════════════════
     4. LOAD DATA
  ══════════════════════════════════════════════════════ */
  async function loadData() {
    setStatus('loading');

    try {
      const data = await SheetsService.load();

      // Feed data to tables and charts
      Tables.renderAll(data);
      Charts.renderAll(data);

      setStatus('live');
    } catch (err) {
      console.error('FTracker: data load failed', err);
      setStatus('error');

      // Show error in all table bodies
      ['foTbody','holdingsTbody','invTbody','ipoTbody','txTbody','recentTradesTbody']
        .forEach(id => {
          const el = document.getElementById(id);
          if (el) el.innerHTML = `<tr><td colspan="20" class="empty-row">
            ⚠ Failed to load data. Check your Apps Script URL in ⚙ Settings.
          </td></tr>`;
        });
    }
  }


  /* ══════════════════════════════════════════════════════
     5. AUTO-REFRESH
  ══════════════════════════════════════════════════════ */
  function restartRefreshTimer() {
    if (refreshTimer) clearInterval(refreshTimer);
    if (CONFIG.refreshInterval > 0) {
      refreshTimer = setInterval(loadData, CONFIG.refreshInterval);
    }
  }

  // Manual refresh button
  function initRefresh() {
    const btn = document.getElementById('refreshBtn');
    let spinning = false;

    btn.addEventListener('click', async () => {
      if (spinning) return;
      spinning = true;
      btn.style.transform = 'rotate(360deg)';
      btn.style.transition = 'transform .4s';
      await loadData();
      setTimeout(() => {
        btn.style.transform = '';
        btn.style.transition = '';
        spinning = false;
      }, 400);
    });
  }


  /* ══════════════════════════════════════════════════════
     BOOT
  ══════════════════════════════════════════════════════ */
  document.addEventListener('DOMContentLoaded', () => {
    initNav();
    initSettings();
    initRefresh();
    Tables.bindSearch();

    // Load data on startup
    loadData();
    restartRefreshTimer();
  });

})();
