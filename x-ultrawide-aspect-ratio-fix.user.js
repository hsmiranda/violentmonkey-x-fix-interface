// ==UserScript==
// @name         X/Twitter Ultrawide & Aspect Ratio Fix
// @namespace    https://github.com/hsmiranda/violentmonkey-x-fix-interface
// @version      2.0.0
// @description  Eliminates letterboxing, vastly enlarges the middle timeline, fixes media aspect ratio issues, and optimizes layout for ultrawide & HiDPI displays (including 2880x1800 @ 1.33x) on x.com (Twitter).
// @author       herbe
// @match        https://x.com/*
// @match        https://twitter.com/*
// @match        https://mobile.x.com/*
// @match        https://mobile.twitter.com/*
// @icon         https://abs.twimg.com/favicons/twitter.3.ico
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @run-at       document-start
// ==/UserScript==

(function () {
  'use strict';

  const CONFIG_VERSION = 2;

  // --- Default Configuration ---
  const DEFAULT_CONFIG = {
    configVersion: CONFIG_VERSION,
    feedWidth: 1350,          // in px (vastly enlarged for 2880x1800 @ 1.33x display)
    isFluidWidth: false,      // true if 100% full stretch
    hideSidebar: false,       // hide trends/who-to-follow sidebar
    sidebarWidth: 350,        // sidebar width in px
    layoutMode: 'centered',   // 'centered' or 'spread'
    fixMediaRatio: true,      // auto-fit images/videos and eliminate black letterbox bars
    mediaMaxHeight: 80,       // in vh units (prevents portrait media from exceeding screen)
    spreadActions: true,      // distribute reply/retweet/like buttons across full tweet width
    expandLightBox: true,     // enlarge modal image viewer to fill ultrawide display
    showFloatingButton: true  // display settings button (Alt+W)
  };

  // --- Storage Helper (GM_* with localStorage fallback) ---
  function loadConfig() {
    try {
      let raw = null;
      if (typeof GM_getValue === 'function') {
        raw = GM_getValue('x_ultrawide_config', null);
      } else {
        raw = localStorage.getItem('x_ultrawide_config');
      }

      if (raw) {
        const parsed = JSON.parse(raw);
        // Automatically upgrade previous defaults (e.g. 950px -> 1350px)
        if (!parsed.configVersion || parsed.configVersion < CONFIG_VERSION) {
          parsed.feedWidth = 1350;
          parsed.configVersion = CONFIG_VERSION;
        }
        return { ...DEFAULT_CONFIG, ...parsed };
      }
    } catch (e) {
      console.warn('[X-Ultrawide] Failed to load config, using defaults:', e);
    }
    return { ...DEFAULT_CONFIG };
  }

  function saveConfig(cfg) {
    const serialized = JSON.stringify(cfg);
    try {
      if (typeof GM_setValue === 'function') {
        GM_setValue('x_ultrawide_config', serialized);
      } else {
        localStorage.setItem('x_ultrawide_config', serialized);
      }
    } catch (e) {
      console.warn('[X-Ultrawide] Failed to save config:', e);
    }
  }

  let config = loadConfig();

  // --- Dynamic Style Generator ---
  const STYLE_ID = 'x-ultrawide-fix-styles';

  function generateCSS(cfg) {
    const feedWidthVal = cfg.isFluidWidth ? '100%' : `${cfg.feedWidth}px`;
    const sidebarWidthVal = `${cfg.sidebarWidth}px`;
    const containerMaxWidth = cfg.isFluidWidth
      ? '100%'
      : (cfg.hideSidebar
          ? feedWidthVal
          : `calc(${feedWidthVal} + ${sidebarWidthVal} + 30px)`);

    return `
      :root {
        --x-feed-width: ${feedWidthVal};
        --x-sidebar-width: ${sidebarWidthVal};
        --x-container-max-width: ${containerMaxWidth};
        --x-media-max-height: ${cfg.mediaMaxHeight}vh;
      }

      /* ========================================================
         1. Root Containers & Layout Architecture (Letterbox Fix)
         ======================================================== */

      /* Allow full window utilization */
      #react-root,
      #react-root > div,
      #react-root > div > div,
      #react-root > div > div > div {
        max-width: 100% !important;
        width: 100% !important;
      }

      /* Flex row holding left navigation and main content */
      div:has(> header[role="banner"]):has(> main[role="main"]),
      #react-root > div > div > div > div:has(> header[role="banner"]) {
        max-width: 100% !important;
        width: 100% !important;
        ${cfg.layoutMode === 'spread' || cfg.isFluidWidth
          ? 'justify-content: space-between !important; padding: 0 16px !important;'
          : 'justify-content: center !important;'}
      }

      /* Responsive Left Navigation Header */
      @media (min-width: 1280px) {
        header[role="banner"] {
          flex-grow: 0 !important;
          flex-shrink: 0 !important;
          width: 275px !important;
          min-width: 275px !important;
        }
      }
      @media (max-width: 1279px) {
        header[role="banner"] {
          flex-grow: 0 !important;
          flex-shrink: 0 !important;
          width: 88px !important;
          min-width: 88px !important;
        }
      }

      /* Main container wrapper */
      main[role="main"] {
        flex-grow: 1 !important;
        flex-shrink: 1 !important;
        width: 100% !important;
        max-width: 100% !important;
        min-width: 0 !important;
        display: flex !important;
        ${cfg.layoutMode === 'spread' || cfg.isFluidWidth
          ? 'justify-content: space-between !important;'
          : 'justify-content: center !important;'}
      }

      /* Wrapper enclosing primaryColumn and sidebarColumn */
      main[role="main"] > div,
      main[role="main"] > div > div,
      main[role="main"] > div > div > div,
      main[role="main"] div:has(> [data-testid="primaryColumn"]),
      main[role="main"] div:has([data-testid="primaryColumn"]),
      main[role="main"] div[style*="width"]:has([data-testid="primaryColumn"]),
      main[role="main"] div[style*="max-width"]:has([data-testid="primaryColumn"]) {
        width: 100% !important;
        max-width: var(--x-container-max-width) !important;
        min-width: 0 !important;
        transition: max-width 0.15s ease-out;
      }

      /* ========================================================
         2. Primary Column & Timeline Items Deep Expansion
         ======================================================== */

      /* Primary Feed Column (Timeline) */
      [data-testid="primaryColumn"] {
        width: 100% !important;
        max-width: var(--x-feed-width) !important;
        min-width: 0 !important;
        flex: 1 1 auto !important;
      }

      /* Force all nested timeline elements to fill the full enlarged column */
      [data-testid="primaryColumn"] > div,
      [data-testid="primaryColumn"] > div > div,
      [data-testid="primaryColumn"] section,
      [data-testid="primaryColumn"] section > div,
      [data-testid="primaryColumn"] section > div > div,
      [data-testid="primaryColumn"] [data-testid="cellInnerDiv"],
      [data-testid="primaryColumn"] article[data-testid="tweet"],
      [data-testid="primaryColumn"] div[data-testid="tweetText"] {
        max-width: 100% !important;
        width: 100% !important;
      }

      /* Sticky top headers (Tabs: For you / Following, back button, title) */
      [data-testid="primaryColumn"] > div > div:first-child,
      [data-testid="ScrollSnap-List"],
      [data-testid="primaryColumn"] nav[role="navigation"] {
        max-width: 100% !important;
        width: 100% !important;
      }

      /* ========================================================
         3. Sidebar Column (Trends & Who to Follow)
         ======================================================== */
      [data-testid="sidebarColumn"] {
        display: ${cfg.hideSidebar ? 'none !important' : 'flex !important'};
        width: var(--x-sidebar-width) !important;
        min-width: var(--x-sidebar-width) !important;
        max-width: var(--x-sidebar-width) !important;
        flex-shrink: 0 !important;
        margin-left: 24px !important;
      }

      /* ========================================================
         4. Tweet Action Buttons (Distribute across full width)
         ======================================================== */
      ${cfg.spreadActions ? `
        article[data-testid="tweet"] div[role="group"] {
          max-width: 100% !important;
          justify-content: space-between !important;
        }
      ` : ''}

      /* Ensure long tweet text wraps naturally */
      article[data-testid="tweet"] div[data-testid="tweetText"] {
        max-width: 100% !important;
        word-break: break-word !important;
        font-size: 15px !important;
        line-height: 20px !important;
      }

      /* ========================================================
         5. Media Aspect Ratio & Letterboxing Fixes
         ======================================================== */
      ${cfg.fixMediaRatio ? `
        /* Tweet photos: eliminate letterbox black borders and fit container */
        div[data-testid="tweetPhoto"] {
          max-height: var(--x-media-max-height) !important;
          overflow: hidden !important;
          border-radius: 16px !important;
        }

        div[data-testid="tweetPhoto"] img {
          max-height: var(--x-media-max-height) !important;
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
        }

        /* Video players: remove black pillarbox/letterbox artifacts */
        div[data-testid="videoPlayer"],
        div[data-testid="videoComponent"] {
          max-height: var(--x-media-max-height) !important;
          width: 100% !important;
          overflow: hidden !important;
          border-radius: 16px !important;
        }

        div[data-testid="videoPlayer"] video,
        div[data-testid="videoComponent"] video {
          max-height: var(--x-media-max-height) !important;
          width: 100% !important;
          object-fit: contain !important;
          background-color: transparent !important;
        }

        /* Embed cards (links, articles) */
        div[data-testid="card.wrapper"] {
          max-width: 100% !important;
          width: 100% !important;
        }
      ` : ''}

      /* ========================================================
         6. Lightbox / Modal Image Viewer Enhancement
         ======================================================== */
      ${cfg.expandLightBox ? `
        div[aria-modal="true"] [data-testid="swipe-to-dismiss"] {
          max-width: 100% !important;
          max-height: 100% !important;
        }

        div[aria-modal="true"] img[alt="Image"] {
          max-width: 95vw !important;
          max-height: 95vh !important;
          object-fit: contain !important;
        }
      ` : ''}

      /* ========================================================
         7. Direct Messages Panel
         ======================================================== */
      div[data-testid="DMDrawer"] {
        max-width: 100% !important;
      }

      /* ========================================================
         8. Floating Settings Button & Modal UI
         ======================================================== */
      #x-ultrawide-toggle-btn {
        position: fixed;
        bottom: 80px;
        right: 20px;
        z-index: 9999;
        width: 42px;
        height: 42px;
        border-radius: 50%;
        background: #1d9bf0;
        color: #ffffff;
        border: none;
        box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4);
        cursor: pointer;
        display: ${cfg.showFloatingButton ? 'flex' : 'none'};
        align-items: center;
        justify-content: center;
        transition: transform 0.2s ease, background 0.2s ease;
      }
      #x-ultrawide-toggle-btn:hover {
        transform: scale(1.1);
        background: #1a8cd8;
      }
      #x-ultrawide-toggle-btn svg {
        width: 22px;
        height: 22px;
        fill: currentColor;
      }

      /* Modal Backdrop */
      #x-ultrawide-modal-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0, 0, 0, 0.7);
        backdrop-filter: blur(4px);
        z-index: 100000;
        display: none;
        align-items: center;
        justify-content: center;
      }
      #x-ultrawide-modal-backdrop.open {
        display: flex;
      }

      /* Modal Window */
      #x-ultrawide-modal {
        background: #15202b;
        color: #f7f9f9;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        width: 500px;
        max-width: 92vw;
        border-radius: 18px;
        padding: 24px;
        box-shadow: 0 10px 35px rgba(0,0,0,0.6);
        border: 1px solid #38444d;
        font-size: 14px;
      }

      #x-ultrawide-modal h2 {
        margin: 0 0 16px 0;
        font-size: 18px;
        font-weight: 700;
        display: flex;
        align-items: center;
        justify-content: space-between;
        color: #fff;
      }

      #x-ultrawide-modal .close-btn {
        background: transparent;
        border: none;
        color: #8b98a5;
        font-size: 22px;
        cursor: pointer;
        padding: 4px;
        line-height: 1;
      }
      #x-ultrawide-modal .close-btn:hover {
        color: #fff;
      }

      .x-uw-group {
        margin-bottom: 18px;
      }

      .x-uw-group label {
        display: block;
        font-weight: 600;
        margin-bottom: 8px;
        color: #e1e8ed;
      }

      .x-uw-presets {
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        gap: 6px;
        margin-bottom: 12px;
      }

      .x-uw-btn {
        background: #273340;
        border: 1px solid #38444d;
        color: #f7f9f9;
        padding: 8px 4px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 11px;
        font-weight: 600;
        text-align: center;
        transition: background 0.15s;
        line-height: 1.3;
      }
      .x-uw-btn:hover {
        background: #334454;
      }
      .x-uw-btn.active {
        background: #1d9bf0;
        border-color: #1d9bf0;
        color: #fff;
      }

      .x-uw-slider-container {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .x-uw-slider {
        flex-grow: 1;
        accent-color: #1d9bf0;
        cursor: pointer;
      }

      .x-uw-slider-value {
        font-family: monospace;
        font-weight: bold;
        min-width: 60px;
        text-align: right;
        color: #1d9bf0;
        font-size: 14px;
      }

      .x-uw-toggle-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 7px 0;
        border-bottom: 1px solid #22303c;
      }
      .x-uw-toggle-row:last-child {
        border-bottom: none;
      }

      .x-uw-switch {
        position: relative;
        display: inline-block;
        width: 44px;
        height: 24px;
      }
      .x-uw-switch input {
        opacity: 0;
        width: 0;
        height: 0;
      }
      .x-uw-slider-toggle {
        position: absolute;
        cursor: pointer;
        top: 0; left: 0; right: 0; bottom: 0;
        background-color: #38444d;
        transition: .3s;
        border-radius: 24px;
      }
      .x-uw-slider-toggle:before {
        position: absolute;
        content: "";
        height: 18px;
        width: 18px;
        left: 3px;
        bottom: 3px;
        background-color: white;
        transition: .3s;
        border-radius: 50%;
      }
      input:checked + .x-uw-slider-toggle {
        background-color: #1d9bf0;
      }
      input:checked + .x-uw-slider-toggle:before {
        transform: translateX(20px);
      }

      .x-uw-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 20px;
        padding-top: 14px;
        border-top: 1px solid #38444d;
      }

      .x-uw-reset {
        background: transparent;
        border: none;
        color: #8b98a5;
        font-size: 12px;
        cursor: pointer;
        text-decoration: underline;
      }
      .x-uw-reset:hover {
        color: #e0245e;
      }

      .x-uw-badge {
        font-size: 11px;
        color: #8b98a5;
      }
    `;
  }

  function applyStyles() {
    let styleEl = document.getElementById(STYLE_ID);
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = STYLE_ID;
      (document.head || document.documentElement).appendChild(styleEl);
    }
    styleEl.textContent = generateCSS(config);
    enforceDOMWidth();
  }

  // --- Direct DOM Enforcer (Bypasses React Inline Constraints) ---
  function enforceDOMWidth() {
    const primaryCol = document.querySelector('[data-testid="primaryColumn"]');
    if (!primaryCol) return;

    const targetWidth = config.isFluidWidth ? '100%' : `${config.feedWidth}px`;
    if (primaryCol.style.maxWidth !== targetWidth) {
      primaryCol.style.setProperty('max-width', targetWidth, 'important');
      primaryCol.style.setProperty('width', '100%', 'important');
    }

    let parent = primaryCol.parentElement;
    if (parent && parent.getAttribute('role') !== 'main') {
      const containerWidth = config.isFluidWidth
        ? '100%'
        : (config.hideSidebar ? targetWidth : `calc(${targetWidth} + ${config.sidebarWidth}px + 30px)`);
      parent.style.setProperty('max-width', containerWidth, 'important');
      parent.style.setProperty('width', '100%', 'important');
    }
  }

  // Inject initial CSS immediately to prevent flicker
  applyStyles();

  // Periodic and Mutation-based enforcement to defeat React re-renders
  let observer = null;
  function startObserver() {
    if (observer) observer.disconnect();
    observer = new MutationObserver(() => {
      enforceDOMWidth();
    });
    observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class']
    });
  }

  // --- UI Components ---
  function createSettingsModal() {
    if (document.getElementById('x-ultrawide-modal-backdrop')) return;

    const backdrop = document.createElement('div');
    backdrop.id = 'x-ultrawide-modal-backdrop';

    const modal = document.createElement('div');
    modal.id = 'x-ultrawide-modal';
    modal.innerHTML = `
      <h2>
        <span>X / Twitter Ultrawide Fix</span>
        <button class="close-btn" id="x-uw-close-btn">&times;</button>
      </h2>

      <!-- Presets -->
      <div class="x-uw-group">
        <label>Timeline Width Presets</label>
        <div class="x-uw-presets">
          <button class="x-uw-btn" data-preset="default">Default<br>600px</button>
          <button class="x-uw-btn" data-preset="wide">Wide<br>1000px</button>
          <button class="x-uw-btn" data-preset="large">Large<br>1350px</button>
          <button class="x-uw-btn" data-preset="ultrawide">Ultra<br>1600px</button>
          <button class="x-uw-btn" data-preset="fluid">Stretch<br>100%</button>
        </div>

        <div class="x-uw-slider-container">
          <input type="range" class="x-uw-slider" id="x-uw-width-slider" min="500" max="2200" step="25" value="${config.feedWidth}">
          <span class="x-uw-slider-value" id="x-uw-width-val">${config.isFluidWidth ? '100%' : config.feedWidth + 'px'}</span>
        </div>
      </div>

      <!-- Toggles -->
      <div class="x-uw-group">
        <div class="x-uw-toggle-row">
          <span>Hide Right Sidebar (Trends & Follows)</span>
          <label class="x-uw-switch">
            <input type="checkbox" id="x-uw-hide-sidebar" ${config.hideSidebar ? 'checked' : ''}>
            <span class="x-uw-slider-toggle"></span>
          </label>
        </div>

        <div class="x-uw-toggle-row">
          <span>Spread Layout Across Screen</span>
          <label class="x-uw-switch">
            <input type="checkbox" id="x-uw-layout-mode" ${config.layoutMode === 'spread' ? 'checked' : ''}>
            <span class="x-uw-slider-toggle"></span>
          </label>
        </div>

        <div class="x-uw-toggle-row">
          <span>Fix Photo/Video Aspect Ratio & Letterboxing</span>
          <label class="x-uw-switch">
            <input type="checkbox" id="x-uw-fix-media" ${config.fixMediaRatio ? 'checked' : ''}>
            <span class="x-uw-slider-toggle"></span>
          </label>
        </div>

        <div class="x-uw-toggle-row">
          <span>Spread Action Icons Across Tweet Width</span>
          <label class="x-uw-switch">
            <input type="checkbox" id="x-uw-spread-actions" ${config.spreadActions ? 'checked' : ''}>
            <span class="x-uw-slider-toggle"></span>
          </label>
        </div>

        <div class="x-uw-toggle-row">
          <span>Enlarge Modal Photo Viewer</span>
          <label class="x-uw-switch">
            <input type="checkbox" id="x-uw-expand-lightbox" ${config.expandLightBox ? 'checked' : ''}>
            <span class="x-uw-slider-toggle"></span>
          </label>
        </div>

        <div class="x-uw-toggle-row">
          <span>Show Floating Settings Button</span>
          <label class="x-uw-switch">
            <input type="checkbox" id="x-uw-show-float" ${config.showFloatingButton ? 'checked' : ''}>
            <span class="x-uw-slider-toggle"></span>
          </label>
        </div>
      </div>

      <!-- Media Height Control -->
      <div class="x-uw-group" style="margin-bottom: 8px;">
        <label>Media Max Height (prevents vertical over-expansion)</label>
        <div class="x-uw-slider-container">
          <input type="range" class="x-uw-slider" id="x-uw-media-height-slider" min="50" max="95" step="5" value="${config.mediaMaxHeight}">
          <span class="x-uw-slider-value" id="x-uw-media-height-val">${config.mediaMaxHeight}vh</span>
        </div>
      </div>

      <!-- Footer -->
      <div class="x-uw-footer">
        <button class="x-uw-reset" id="x-uw-reset-btn">Reset to Defaults</button>
        <span class="x-uw-badge">Shortcuts: Alt + W / Alt + S</span>
      </div>
    `;

    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);

    // Event Bindings
    const closeBtn = document.getElementById('x-uw-close-btn');
    const widthSlider = document.getElementById('x-uw-width-slider');
    const widthVal = document.getElementById('x-uw-width-val');
    const mediaSlider = document.getElementById('x-uw-media-height-slider');
    const mediaVal = document.getElementById('x-uw-media-height-val');
    const hideSidebarCheckbox = document.getElementById('x-uw-hide-sidebar');
    const layoutModeCheckbox = document.getElementById('x-uw-layout-mode');
    const fixMediaCheckbox = document.getElementById('x-uw-fix-media');
    const spreadActionsCheckbox = document.getElementById('x-uw-spread-actions');
    const expandLightboxCheckbox = document.getElementById('x-uw-expand-lightbox');
    const showFloatCheckbox = document.getElementById('x-uw-show-float');
    const resetBtn = document.getElementById('x-uw-reset-btn');
    const presetBtns = modal.querySelectorAll('[data-preset]');

    function updatePresetHighlight() {
      presetBtns.forEach(btn => {
        const p = btn.getAttribute('data-preset');
        let active = false;
        if (p === 'fluid' && config.isFluidWidth) active = true;
        else if (p === 'default' && !config.isFluidWidth && config.feedWidth === 600) active = true;
        else if (p === 'wide' && !config.isFluidWidth && config.feedWidth === 1000) active = true;
        else if (p === 'large' && !config.isFluidWidth && config.feedWidth === 1350) active = true;
        else if (p === 'ultrawide' && !config.isFluidWidth && config.feedWidth === 1600) active = true;
        btn.classList.toggle('active', active);
      });
    }

    updatePresetHighlight();

    closeBtn.addEventListener('click', () => backdrop.classList.remove('open'));
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) backdrop.classList.remove('open');
    });

    // Preset Clicks
    presetBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const preset = btn.getAttribute('data-preset');
        if (preset === 'fluid') {
          config.isFluidWidth = true;
          widthVal.textContent = '100%';
        } else {
          config.isFluidWidth = false;
          let val = 1350;
          if (preset === 'default') val = 600;
          if (preset === 'wide') val = 1000;
          if (preset === 'large') val = 1350;
          if (preset === 'ultrawide') val = 1600;
          config.feedWidth = val;
          widthSlider.value = val;
          widthVal.textContent = val + 'px';
        }
        updatePresetHighlight();
        saveConfig(config);
        applyStyles();
      });
    });

    // Width Slider
    widthSlider.addEventListener('input', (e) => {
      config.isFluidWidth = false;
      config.feedWidth = parseInt(e.target.value, 10);
      widthVal.textContent = config.feedWidth + 'px';
      updatePresetHighlight();
      saveConfig(config);
      applyStyles();
    });

    // Media Height Slider
    mediaSlider.addEventListener('input', (e) => {
      config.mediaMaxHeight = parseInt(e.target.value, 10);
      mediaVal.textContent = config.mediaMaxHeight + 'vh';
      saveConfig(config);
      applyStyles();
    });

    // Checkbox Toggles
    hideSidebarCheckbox.addEventListener('change', (e) => {
      config.hideSidebar = e.target.checked;
      saveConfig(config);
      applyStyles();
    });

    layoutModeCheckbox.addEventListener('change', (e) => {
      config.layoutMode = e.target.checked ? 'spread' : 'centered';
      saveConfig(config);
      applyStyles();
    });

    fixMediaCheckbox.addEventListener('change', (e) => {
      config.fixMediaRatio = e.target.checked;
      saveConfig(config);
      applyStyles();
    });

    spreadActionsCheckbox.addEventListener('change', (e) => {
      config.spreadActions = e.target.checked;
      saveConfig(config);
      applyStyles();
    });

    expandLightboxCheckbox.addEventListener('change', (e) => {
      config.expandLightBox = e.target.checked;
      saveConfig(config);
      applyStyles();
    });

    showFloatCheckbox.addEventListener('change', (e) => {
      config.showFloatingButton = e.target.checked;
      const floatBtn = document.getElementById('x-ultrawide-toggle-btn');
      if (floatBtn) floatBtn.style.display = config.showFloatingButton ? 'flex' : 'none';
      saveConfig(config);
      applyStyles();
    });

    // Reset Defaults
    resetBtn.addEventListener('click', () => {
      config = { ...DEFAULT_CONFIG };
      saveConfig(config);
      applyStyles();

      // Reflect in inputs
      widthSlider.value = config.feedWidth;
      widthVal.textContent = config.feedWidth + 'px';
      mediaSlider.value = config.mediaMaxHeight;
      mediaVal.textContent = config.mediaMaxHeight + 'vh';
      hideSidebarCheckbox.checked = config.hideSidebar;
      layoutModeCheckbox.checked = config.layoutMode === 'spread';
      fixMediaCheckbox.checked = config.fixMediaRatio;
      spreadActionsCheckbox.checked = config.spreadActions;
      expandLightboxCheckbox.checked = config.expandLightBox;
      showFloatCheckbox.checked = config.showFloatingButton;
      updatePresetHighlight();
    });
  }

  function createFloatingButton() {
    if (document.getElementById('x-ultrawide-toggle-btn')) return;

    const btn = document.createElement('button');
    btn.id = 'x-ultrawide-toggle-btn';
    btn.title = 'X Ultrawide & Aspect Ratio Settings (Alt+W)';
    btn.innerHTML = `
      <svg viewBox="0 0 24 24">
        <path d="M4 6h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2zm0 2v8h16V8H4zm4 2h2v4H8v-4zm6 0h2v4h-2v-4z"/>
      </svg>
    `;

    btn.addEventListener('click', () => {
      createSettingsModal();
      const backdrop = document.getElementById('x-ultrawide-modal-backdrop');
      if (backdrop) backdrop.classList.toggle('open');
    });

    document.body.appendChild(btn);
  }

  function initUI() {
    createSettingsModal();
    createFloatingButton();
    startObserver();
    enforceDOMWidth();
  }

  // --- Keyboard Shortcuts & Menus ---
  function setupShortcuts() {
    window.addEventListener('keydown', (e) => {
      // Alt + W: Toggle Settings Dialog
      if (e.altKey && (e.key === 'w' || e.key === 'W')) {
        e.preventDefault();
        createSettingsModal();
        const backdrop = document.getElementById('x-ultrawide-modal-backdrop');
        if (backdrop) backdrop.classList.toggle('open');
      }
      // Alt + S: Quick Toggle Right Sidebar
      if (e.altKey && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        config.hideSidebar = !config.hideSidebar;
        saveConfig(config);
        applyStyles();
        const sidebarCb = document.getElementById('x-uw-hide-sidebar');
        if (sidebarCb) sidebarCb.checked = config.hideSidebar;
      }
      // Escape: Close Modal if open
      if (e.key === 'Escape') {
        const backdrop = document.getElementById('x-ultrawide-modal-backdrop');
        if (backdrop && backdrop.classList.contains('open')) {
          backdrop.classList.remove('open');
        }
      }
    });

    // Register Violentmonkey / Tampermonkey menu command
    if (typeof GM_registerMenuCommand === 'function') {
      GM_registerMenuCommand('⚙️ Configure X Ultrawide Layout (Alt+W)', () => {
        createSettingsModal();
        const backdrop = document.getElementById('x-ultrawide-modal-backdrop');
        if (backdrop) backdrop.classList.add('open');
      });
      GM_registerMenuCommand('↔️ Toggle Right Sidebar (Alt+S)', () => {
        config.hideSidebar = !config.hideSidebar;
        saveConfig(config);
        applyStyles();
      });
    }
  }

  // --- Bootstrapping ---
  setupShortcuts();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initUI);
  } else {
    initUI();
  }
})();
