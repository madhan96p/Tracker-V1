/**
 * shared/components.js v3
 * NEW: 5-preset theme switcher, streak sidebar section
 */
const COMPONENTS = (() => {
  // ─── THEME ──────────────────────────────────────────────────────────────────
  const THEME_KEY = "ftracker_theme";
  let _themeIdx = 0;

  function applyTheme(idx) {
    const themes = CONFIG.THEMES;
    if (!themes || idx < 0 || idx >= themes.length) return;
    _themeIdx = idx;
    const theme = themes[idx];
    const root = document.documentElement;
    for (const [prop, val] of Object.entries(theme.vars)) {
      root.style.setProperty(prop, val);
    }
    const btn = document.getElementById("themeBtn");
    if (btn) btn.textContent = theme.label;
    try {
      localStorage.setItem(THEME_KEY, String(idx));
    } catch (e) {}
  }

  function cycleTheme() {
    applyTheme((_themeIdx + 1) % (CONFIG.THEMES || []).length);
  }

  function initTheme() {
    let saved = 0;
    try {
      saved = parseInt(localStorage.getItem(THEME_KEY) || "0");
    } catch (e) {}
    if (isNaN(saved) || saved < 0) saved = 0;
    applyTheme(saved);
  }

  // ─── NAV BUILD ──────────────────────────────────────────────────────────────
  function buildNav(activeId) {
    const items = (CONFIG.NAV_ITEMS || [])
      .map((item) => {
        const active = item.id === activeId ? " active" : "";
        return `<a class="nav-item${active}" href="${item.path}" data-id="${item.id}">
        <span class="nav-icon">${item.icon}</span>
        <span class="nav-label">${item.label}</span>
        <span class="nav-badge" id="badge-${item.id}"></span>
      </a>`;
      })
      .join("");

    return `
    <aside id="sidebar">
      <div class="logo-area">
        <div class="logo-mark">Portfolio · Tracker</div>
        <div class="logo-name">F<em>Tracker</em></div>
      </div>

      <nav class="nav-section">${items}</nav>

      <!-- Streak section -->
      <div class="streak-section">
        <div class="streak-header">⚡ Live Streaks</div>
        <div class="streak-row">
          <span class="streak-lbl">Trade-wise</span>
          <span class="streak-val" id="streakTradeVal">—</span>
        </div>
        <div class="streak-row">
          <span class="streak-lbl">Day-wise</span>
          <span class="streak-val" id="streakDayVal">—</span>
        </div>
      </div>

      <div class="sidebar-footer">
        <div class="conn-status">
          <div class="conn-dot" id="connDot"></div>
          <span id="connText">Connecting…</span>
        </div>
        <button class="btn-sync" id="refreshBtn" onclick="COMPONENTS.refresh()" title="Refresh">↻</button>
      </div>

      <div class="theme-bar">
        <button id="themeBtn" class="theme-btn" onclick="COMPONENTS.cycleTheme()">🌙 Dark Teal</button>
      </div>
    </aside>
    <div id="overlay" onclick="COMPONENTS.closeSidebar()"></div>`;
  }

  function buildHeader(title) {
    return `
    <header id="topbar">
      <div class="topbar-left">
        <button class="hamburger" onclick="COMPONENTS.openSidebar()" aria-label="Menu">
          <span></span><span></span><span></span>
        </button>
        <div id="pageTitle">${title}</div>
      </div>
      <div class="topbar-right">
        <span id="lastSync"></span>
      </div>
    </header>`;
  }

  function buildLoader() {
    return `
    <div id="globalLoader">
      <div class="loader-logo">FTracker</div>
      <div class="loader-bar"><div class="loader-fill"></div></div>
      <div class="loader-msg" id="loaderMsg">Loading…</div>
    </div>`;
  }

  function inject(activeId, title) {
    // 1. Inject Loader
    document.body.insertAdjacentHTML("afterbegin", buildLoader());

    // 2. Build Mobile Header + Nav
    const hdrEl = document.getElementById("header-placeholder");
    if (hdrEl) hdrEl.innerHTML = buildHeader(title);

    // 3. Inject Mobile Stats Bar (The 3 Must-Haves)
    const statsBar = `
      <div class="mobile-stats-bar">
        <div class="ms-item"><div class="ms-lbl">P&L</div><div class="ms-val" id="msPnl">—</div></div>
        <div class="ms-item"><div class="ms-lbl">Invested</div><div class="ms-val" id="msInv">—</div></div>
        <div class="ms-item"><div class="ms-lbl">Streak</div><div class="ms-val" id="msStreak">—</div></div>
      </div>`;
    document.body.insertAdjacentHTML("afterbegin", statsBar);

    // 4. Inject Bottom Nav
    const navs = CONFIG.NAV_ITEMS.slice(0, 4); // Pick top 4 for bottom bar
    const bottomNav = `
      <nav class="bottom-nav">
        ${navs.map((n) => `<a class="bn-item${n.id === activeId ? " active" : ""}" href="${n.path}">${n.icon}<br><span style="font-size:8px">${n.label}</span></a>`).join("")}
      </nav>`;
    document.body.insertAdjacentHTML("beforeend", bottomNav);

    initTheme();
  }

  // Add a helper to update these mobile stats
  function updateMobileStats(pnl, inv, streak) {
    document.getElementById("msPnl").textContent = pnl;
    document.getElementById("msInv").textContent = inv;
    document.getElementById("msStreak").textContent = streak;
  }

  // ─── STREAKS ────────────────────────────────────────────────────────────────
  function setStreaks(streaks) {
    if (!streaks) return;

    const tEl = document.getElementById("streakTradeVal");
    const dEl = document.getElementById("streakDayVal");

    if (tEl && streaks.trade) {
      const s = streaks.trade;
      tEl.textContent = s.label || "—";
      tEl.className =
        "streak-val" +
        (s.type === "win"
          ? " streak-win"
          : s.type === "loss"
            ? " streak-loss"
            : "");
    }
    if (dEl && streaks.day) {
      const s = streaks.day;
      dEl.textContent = s.label || "—";
      dEl.className =
        "streak-val" +
        (s.type === "win"
          ? " streak-win"
          : s.type === "loss"
            ? " streak-loss"
            : "");
    }
  }

  // ─── STATUS ─────────────────────────────────────────────────────────────────
  function setConn(type, text) {
    const dot = document.getElementById("connDot");
    const span = document.getElementById("connText");
    if (dot) dot.className = "conn-dot " + type;
    if (span) span.textContent = text;
  }

  function setLastSync() {
    const el = document.getElementById("lastSync");
    if (el) el.textContent = "Synced " + new Date().toLocaleTimeString("en-IN");
  }

  function showLoader(msg) {
    const el = document.getElementById("globalLoader");
    const ml = document.getElementById("loaderMsg");
    if (el) el.classList.remove("hidden");
    if (ml) ml.textContent = msg || "Loading…";
  }
  function hideLoader() {
    const el = document.getElementById("globalLoader");
    if (el) el.classList.add("hidden");
  }

  function showError(msg) {
    let b = document.getElementById("errorBanner");
    if (!b) {
      b = document.createElement("div");
      b.id = "errorBanner";
      b.className = "error-banner";
      const cnt = document.getElementById("content");
      if (cnt) cnt.prepend(b);
    }
    b.innerHTML = `<span class="error-icon">⚠</span><span class="error-msg">${UTILS.esc(msg)}</span><button class="btn" onclick="COMPONENTS.refresh()">Retry</button>`;
    b.classList.add("show");
  }
  function hideError() {
    const b = document.getElementById("errorBanner");
    if (b) b.classList.remove("show");
  }

  function openSidebar() {
    document.getElementById("sidebar")?.classList.add("open");
    document.getElementById("overlay")?.classList.add("show");
  }
  function closeSidebar() {
    document.getElementById("sidebar")?.classList.remove("open");
    document.getElementById("overlay")?.classList.remove("show");
  }

  // ─── REFRESH ────────────────────────────────────────────────────────────────
  let _refreshFn = null;
  function onRefresh(fn) {
    _refreshFn = fn;
  }
  async function refresh() {
    SHEETS.clearCache();
    if (_refreshFn) await _refreshFn();
  }

  // ─── CHART DEFAULTS ─────────────────────────────────────────────────────────
  const CHART = {
    get accentColor() {
      return (
        getComputedStyle(document.documentElement)
          .getPropertyValue("--accent")
          .trim() || "#00d2aa"
      );
    },
    get gainColor() {
      return (
        getComputedStyle(document.documentElement)
          .getPropertyValue("--gain")
          .trim() || "#4ade80"
      );
    },
    get lossColor() {
      return (
        getComputedStyle(document.documentElement)
          .getPropertyValue("--loss")
          .trim() || "#f87171"
      );
    },
    get skyColor() {
      return (
        getComputedStyle(document.documentElement)
          .getPropertyValue("--sky")
          .trim() || "#38bdf8"
      );
    },
    get warnColor() {
      return (
        getComputedStyle(document.documentElement)
          .getPropertyValue("--warn")
          .trim() || "#fbbf24"
      );
    },

    get tooltip() {
      return {
        backgroundColor: "rgba(9,24,40,0.96)",
        borderColor: "rgba(0,210,170,0.30)",
        borderWidth: 1,
        titleColor: "#3d6572",
        bodyColor: "#dff2ec",
        bodyFont: { family: "'JetBrains Mono', monospace", size: 11 },
        titleFont: { family: "'JetBrains Mono', monospace", size: 10 },
        padding: 10,
      };
    },

    axes() {
      return {
        grid: { color: "rgba(255,255,255,0.04)" },
        ticks: {
          color: "#3d6572",
          font: { family: "'JetBrains Mono', monospace", size: 10 },
        },
        border: { color: "rgba(255,255,255,0.05)" },
      };
    },

    pnlBarColors(values) {
      return {
        bg: values.map((v) =>
          v >= 0 ? "rgba(74,222,128,0.65)" : "rgba(248,113,113,0.65)",
        ),
        border: values.map((v) => (v >= 0 ? this.gainColor : this.lossColor)),
      };
    },

    destroy(key) {
      if (window._ftCharts && window._ftCharts[key]) {
        try {
          window._ftCharts[key].destroy();
        } catch (e) {}
        delete window._ftCharts[key];
      }
    },

    save(key, inst) {
      if (!window._ftCharts) window._ftCharts = {};
      window._ftCharts[key] = inst;
    },
  };

  function init(activeId, title) {
    inject(activeId, title);
  }

  return {
    init,
    setConn,
    setLastSync,
    showLoader,
    hideLoader,
    showError,
    hideError,
    openSidebar,
    closeSidebar,
    setStreaks,
    cycleTheme,
    applyTheme,
    onRefresh,
    refresh,
    CHART,
  };
})();
