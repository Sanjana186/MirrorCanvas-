const MOBILE_VIEWPORT = { width: 412, height: 600 };
const DESKTOP_VIEWPORT = { width: 820, height: 600 };
const WIDE_VIEWPORT = { width: 1024, height: 650 };

const port = chrome.runtime.connect({ name: "cdp-stream" });

const tilesContainer = document.getElementById("tilesContainer");
const emptyState = document.getElementById("emptyState");
const urlInput = document.getElementById("urlInput");
const spawnBtn = document.getElementById("spawnBtn");
const activeCount = document.getElementById("activeCount");
const presetTech = document.getElementById("presetTech");
const presetWiki = document.getElementById("presetWiki");
const presetClear = document.getElementById("presetClear");
const hudMessage = document.getElementById("hudMessage");
const hudBadge = document.getElementById("hudBadge");
const sideShelf = document.getElementById("sideShelf");
const shelfItems = document.getElementById("shelfItems");
const shelfCount = document.getElementById("shelfCount");
const globalMobileBtn = document.getElementById("globalMobileBtn");
const globalDesktopBtn = document.getElementById("globalDesktopBtn");
const emptyTechBtn = document.getElementById("emptyTechBtn");
const emptyWikiBtn = document.getElementById("emptyWikiBtn");

// Active Tiles & Parked Shelf Maps
const tiles = new Map(); // tileId -> TileInstance
const parkedTiles = new Map(); // tileId -> { id, url, mode, title }
let focusedTileId = null;
let currentDefaultMode = "desktop";

// Global View Mode Toggle (Default Spawn Mode)
if (globalMobileBtn && globalDesktopBtn) {
  globalMobileBtn.onclick = () => {
    currentDefaultMode = "mobile";
    globalMobileBtn.classList.add("active");
    globalDesktopBtn.classList.remove("active");
  };
  globalDesktopBtn.onclick = () => {
    currentDefaultMode = "desktop";
    globalDesktopBtn.classList.add("active");
    globalMobileBtn.classList.remove("active");
  };
}

class TileInstance {
  constructor(tileId, initialUrl, initialMode = currentDefaultMode) {
    this.id = tileId;
    this.url = initialUrl;
    this.mode = initialMode;
    this.tabId = null;
    this.width = initialMode === "desktop" ? DESKTOP_VIEWPORT.width : MOBILE_VIEWPORT.width;
    this.height = initialMode === "desktop" ? DESKTOP_VIEWPORT.height : MOBILE_VIEWPORT.height;

    // DOM Elements
    this.card = document.createElement("div");
    this.card.className = "tile-card" + (this.mode === "desktop" ? " desktop-mode" : "");
    this.card.id = `tile-${tileId}`;

    const domain = this.getDomain(initialUrl);

    this.card.innerHTML = `
      <div class="tile-header">
        <div class="tile-header-top">
          <div class="tile-title-group">
            <span class="status-dot"></span>
            <span class="tile-title" title="${initialUrl}">${domain}</span>
          </div>
          <div class="tile-top-actions">
            <button class="tile-btn park-btn" title="Park to Side Shelf (Put on hold)">📦 Park</button>
            <button class="tile-btn jump-btn" title="Bring native Chrome tab to front">💳 Jump</button>
            <button class="tile-btn close-btn" title="Close tile">✕</button>
          </div>
        </div>
        <div class="tile-toolbar">
          <div class="toolbar-left">
            <span class="toolbar-label">VIEW:</span>
            <button class="tile-btn mode-btn ${this.mode === 'desktop' ? 'active-desktop' : ''}" title="Switch between Desktop and Phone view">
              ${this.mode === "desktop" ? "💻 Desktop" : "📱 Phone"}
            </button>
          </div>
          <div class="toolbar-right">
            <span class="toolbar-label">RESIZE:</span>
            <div class="size-presets">
              <button class="size-chip btn-mobile" title="Resize to Phone (412x600)">📱 412</button>
              <button class="size-chip btn-desktop" title="Resize to Desktop (820x600)">💻 820</button>
              <button class="size-chip btn-wide" title="Resize to Wide (1024x650)">🖥️ 1024</button>
            </div>
          </div>
        </div>
      </div>
      <div class="canvas-container">
        <canvas width="${this.width}" height="${this.height}" tabindex="0"></canvas>
        <div class="loader-overlay">
          <div class="spinner"></div>
          <p>Connecting CDP stream...</p>
        </div>
        <div class="resize-handle" title="Click & drag corner to resize freely"></div>
      </div>
    `;

    this.header = this.card.querySelector(".tile-header");
    this.canvas = this.card.querySelector("canvas");
    this.ctx = this.canvas.getContext("2d");
    this.loader = this.card.querySelector(".loader-overlay");
    this.modeBtn = this.card.querySelector(".mode-btn");
    this.parkBtn = this.card.querySelector(".park-btn");
    this.jumpBtn = this.card.querySelector(".jump-btn");
    this.closeBtn = this.card.querySelector(".close-btn");
    this.titleEl = this.card.querySelector(".tile-title");
    this.resizeHandle = this.card.querySelector(".resize-handle");

    this.btnMobile = this.card.querySelector(".btn-mobile");
    this.btnDesktop = this.card.querySelector(".btn-desktop");
    this.btnWide = this.card.querySelector(".btn-wide");

    this.img = new Image();

    // Event Listeners
    this.bindEvents();
    this.initHeaderDrag();
    this.initCornerResize();
  }

  getDomain(urlStr) {
    try {
      const u = new URL(/^https?:\/\//i.test(urlStr) ? urlStr : "https://" + urlStr);
      return u.hostname;
    } catch (_) {
      return urlStr;
    }
  }

  setSize(w, h, mode) {
    const targetMode = mode || (w > 600 ? "desktop" : "mobile");
    this.mode = targetMode;
    this.width = w;
    this.height = h;

    this.card.style.width = `${w}px`;
    this.card.style.height = `${h + 74}px`; // accounting for 2-tier header

    if (targetMode === "desktop") {
      this.card.classList.add("desktop-mode");
      this.modeBtn.textContent = "💻 Desktop";
      this.modeBtn.classList.add("active-desktop");
    } else {
      this.card.classList.remove("desktop-mode");
      this.modeBtn.textContent = "📱 Phone";
      this.modeBtn.classList.remove("active-desktop");
    }

    this.canvas.width = w;
    this.canvas.height = h;

    this.loader.style.display = "flex";
    this.loader.querySelector("p").textContent = `Setting ${targetMode} view (${w}x${h})...`;

    port.postMessage({
      type: "SET_VIEWPORT",
      tileId: this.id,
      width: w,
      height: h,
      mode: targetMode
    });
  }

  toggleMode() {
    if (this.mode === "desktop") {
      this.setSize(MOBILE_VIEWPORT.width, MOBILE_VIEWPORT.height, "mobile");
    } else {
      this.setSize(DESKTOP_VIEWPORT.width, DESKTOP_VIEWPORT.height, "desktop");
    }
  }

  bindEvents() {
    // Focus on click
    this.card.addEventListener("pointerdown", () => {
      setFocusedTile(this.id);
    });

    // Viewport Toggle: Mobile vs Desktop
    this.modeBtn.onclick = (e) => {
      e.stopPropagation();
      this.toggleMode();
    };

    // Quick Size Presets
    this.btnMobile.onclick = (e) => {
      e.stopPropagation();
      this.setSize(MOBILE_VIEWPORT.width, MOBILE_VIEWPORT.height, "mobile");
    };
    this.btnDesktop.onclick = (e) => {
      e.stopPropagation();
      this.setSize(DESKTOP_VIEWPORT.width, DESKTOP_VIEWPORT.height, "desktop");
    };
    this.btnWide.onclick = (e) => {
      e.stopPropagation();
      this.setSize(WIDE_VIEWPORT.width, WIDE_VIEWPORT.height, "desktop");
    };

    // Park to Shelf
    this.parkBtn.onclick = (e) => {
      e.stopPropagation();
      parkTile(this.id);
    };

    // Jump to native checkout
    this.jumpBtn.onclick = (e) => {
      e.stopPropagation();
      port.postMessage({ type: "FOCUS_TAB", tileId: this.id });
    };

    // Close tile
    this.closeBtn.onclick = (e) => {
      e.stopPropagation();
      destroyTile(this.id);
    };

    // Click / Tap Relay
    let isPointerDown = false;
    let startX = 0;
    let startY = 0;
    let wasDragging = false;

    this.canvas.addEventListener("click", (e) => {
      this.canvas.focus();
      if (wasDragging) return;
      const rect = this.canvas.getBoundingClientRect();
      const ratioX = (e.clientX - rect.left) / rect.width;
      const ratioY = (e.clientY - rect.top) / rect.height;
      port.postMessage({ type: "CLICK", tileId: this.id, ratioX, ratioY });
    });

    // Touch Drag / Pointer Scroll
    this.canvas.addEventListener("pointerdown", (e) => {
      isPointerDown = true;
      wasDragging = false;
      startX = e.clientX;
      startY = e.clientY;
      const rect = this.canvas.getBoundingClientRect();
      const ratioX = (e.clientX - rect.left) / rect.width;
      const ratioY = (e.clientY - rect.top) / rect.height;

      port.postMessage({
        type: "TOUCH_EVENT",
        tileId: this.id,
        touchType: "touchStart",
        touchPoints: [{ ratioX, ratioY }]
      });
    });

    window.addEventListener("pointermove", (e) => {
      if (!isPointerDown) return;
      const dist = Math.hypot(e.clientX - startX, e.clientY - startY);
      if (dist > 5) wasDragging = true;

      const rect = this.canvas.getBoundingClientRect();
      const ratioX = (e.clientX - rect.left) / rect.width;
      const ratioY = (e.clientY - rect.top) / rect.height;

      port.postMessage({
        type: "TOUCH_EVENT",
        tileId: this.id,
        touchType: "touchMove",
        touchPoints: [{ ratioX, ratioY }]
      });
    });

    window.addEventListener("pointerup", (e) => {
      if (!isPointerDown) return;
      isPointerDown = false;

      const rect = this.canvas.getBoundingClientRect();
      const ratioX = (e.clientX - rect.left) / rect.width;
      const ratioY = (e.clientY - rect.top) / rect.height;

      port.postMessage({
        type: "TOUCH_EVENT",
        tileId: this.id,
        touchType: "touchEnd",
        touchPoints: [{ ratioX, ratioY }]
      });
    });

    // Native Wheel Scroll Relay
    let scrollRaf = null;
    let pendingDeltaX = 0;
    let pendingDeltaY = 0;

    this.canvas.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        const rect = this.canvas.getBoundingClientRect();
        const ratioX = (e.clientX - rect.left) / rect.width;
        const ratioY = (e.clientY - rect.top) / rect.height;

        pendingDeltaX += e.deltaX;
        pendingDeltaY += e.deltaY;

        if (!scrollRaf) {
          scrollRaf = requestAnimationFrame(() => {
            port.postMessage({
              type: "SCROLL",
              tileId: this.id,
              ratioX,
              ratioY,
              deltaX: pendingDeltaX,
              deltaY: pendingDeltaY
            });
            pendingDeltaX = 0;
            pendingDeltaY = 0;
            scrollRaf = null;
          });
        }
      },
      { passive: false }
    );

    // Keyboard Relay
    this.canvas.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === "v" || e.key.toLowerCase() === "c")) return;
      if (["Backspace", "Tab", " ", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
      }

      const isPrintable = e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey;

      port.postMessage({
        type: "KEY",
        tileId: this.id,
        key: e.key,
        code: e.code,
        text: isPrintable ? e.key : undefined,
        keyCode: e.keyCode
      });
    });

    // Paste Relay
    this.canvas.addEventListener("paste", (e) => {
      const text = e.clipboardData?.getData("text");
      if (text) {
        e.preventDefault();
        port.postMessage({ type: "INSERT_TEXT", tileId: this.id, text });
      }
    });
  }

  // Draggable Window Header
  initHeaderDrag() {
    let isDragging = false;
    let startX = 0;
    let startY = 0;

    this.header.addEventListener("mousedown", (e) => {
      // Don't drag if clicking buttons
      if (e.target.closest("button")) return;
      isDragging = true;
      setFocusedTile(this.id);

      startX = e.clientX;
      startY = e.clientY;

      const style = window.getComputedStyle(this.card);
      const transform = new WebKitCSSMatrix(style.transform);
      const curTx = transform.m41;
      const curTy = transform.m42;

      const onMouseMove = (ev) => {
        if (!isDragging) return;
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        this.card.style.position = "relative";
        this.card.style.transform = `translate(${curTx + dx}px, ${curTy + dy}px)`;
      };

      const onMouseUp = () => {
        isDragging = false;
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
      };

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    });
  }

  // Freeform Corner Resizer
  initCornerResize() {
    let isResizing = false;
    let startW = 0;
    let startH = 0;
    let startX = 0;
    let startY = 0;

    this.resizeHandle.addEventListener("mousedown", (e) => {
      e.stopPropagation();
      e.preventDefault();
      isResizing = true;
      setFocusedTile(this.id);

      startW = this.card.offsetWidth;
      startH = this.card.offsetHeight;
      startX = e.clientX;
      startY = e.clientY;

      const onMouseMove = (ev) => {
        if (!isResizing) return;
        const newW = Math.max(340, Math.min(1400, startW + (ev.clientX - startX)));
        const newH = Math.max(400, Math.min(1000, startH + (ev.clientY - startY)));
        this.card.style.width = `${newW}px`;
        this.card.style.height = `${newH}px`;
      };

      const onMouseUp = () => {
        if (!isResizing) return;
        isResizing = false;
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);

        // Notify service worker of new viewport dimensions
        const curW = this.card.offsetWidth;
        const curH = this.card.offsetHeight - 74; // exclude header
        const newMode = curW > 600 ? "desktop" : "mobile";
        this.setSize(curW, curH, newMode);
      };

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    });
  }

  // Frame Renderer with dynamic aspect ratio blitting
  renderFrame(base64Data, metadata) {
    this.loader.style.display = "none";
    this.img.onload = () => {
      this.ctx.clearRect(0, 0, this.width, this.height);
      const nw = this.img.naturalWidth;
      const nh = this.img.naturalHeight;

      if (this.mode === "desktop") {
        // Desktop view: draw full frame directly
        this.ctx.drawImage(this.img, 0, 0, this.width, this.height);
      } else {
        // Mobile view: crop out horizontal padding if Chromium captures wide host window
        const targetAspect = this.width / this.height;
        const frameAspect = nw / nh;

        if (frameAspect > targetAspect * 1.05) {
          const sourceW = Math.round(nh * targetAspect);
          this.ctx.drawImage(this.img, 0, 0, sourceW, nh, 0, 0, this.width, this.height);
        } else {
          this.ctx.drawImage(this.img, 0, 0, this.width, this.height);
        }
      }
    };
    this.img.src = "data:image/jpeg;base64," + base64Data;
  }
}

// Tile Management Functions
function setFocusedTile(tileId) {
  focusedTileId = tileId;
  for (const [id, tile] of tiles.entries()) {
    if (id === tileId) {
      tile.card.classList.add("focused");
      tile.canvas.focus();
    } else {
      tile.card.classList.remove("focused");
    }
  }
}

function spawnTile(url, mode = currentDefaultMode) {
  const targetUrl = (url || "").trim();
  if (!targetUrl) return;

  const tileId = "tile_" + Math.random().toString(36).substring(2, 9);
  const tile = new TileInstance(tileId, targetUrl, mode);

  tiles.set(tileId, tile);
  tilesContainer.appendChild(tile.card);

  updateUIState();
  setFocusedTile(tileId);

  port.postMessage({
    type: "SPAWN_TILE",
    tileId,
    url: targetUrl,
    mode
  });

  return tileId;
}

function destroyTile(tileId) {
  const tile = tiles.get(tileId);
  if (!tile) return;

  tile.card.remove();
  tiles.delete(tileId);

  port.postMessage({ type: "CLOSE_TILE", tileId });
  updateUIState();

  if (focusedTileId === tileId) {
    const remaining = Array.from(tiles.keys());
    if (remaining.length > 0) {
      setFocusedTile(remaining[remaining.length - 1]);
    } else {
      focusedTileId = null;
    }
  }
}

// Side Shelf Parking Mechanism
function parkTile(tileId) {
  const tile = tiles.get(tileId);
  if (!tile) return;

  parkedTiles.set(tileId, {
    id: tile.id,
    url: tile.url,
    mode: tile.mode,
    title: tile.getDomain(tile.url)
  });

  tile.card.style.display = "none";
  renderSideShelf();
  updateUIState();
}

function restoreTile(tileId) {
  const tile = tiles.get(tileId);
  if (tile) {
    tile.card.style.display = "flex";
    parkedTiles.delete(tileId);
    renderSideShelf();
    setFocusedTile(tileId);
    updateUIState();
  }
}

function renderSideShelf() {
  shelfCount.textContent = parkedTiles.size;
  shelfItems.innerHTML = "";

  if (parkedTiles.size === 0) {
    shelfItems.innerHTML = `<div class="shelf-empty">Click 📦 on any tile to put it on hold here</div>`;
    return;
  }

  for (const [id, item] of parkedTiles.entries()) {
    const card = document.createElement("div");
    card.className = "shelf-card";
    card.title = "Click to restore back to canvas";
    card.innerHTML = `
      <div class="shelf-card-title">${item.title}</div>
      <div class="shelf-card-meta">
        <span>${item.mode === "desktop" ? "💻 Desktop" : "📱 Phone"}</span>
        <span class="shelf-restore-badge">↩ Restore</span>
      </div>
    `;
    card.onclick = () => restoreTile(id);
    shelfItems.appendChild(card);
  }
}

function clearAllTiles() {
  for (const [id, tile] of tiles.entries()) {
    tile.card.remove();
    port.postMessage({ type: "CLOSE_TILE", tileId: id });
  }
  tiles.clear();
  parkedTiles.clear();
  focusedTileId = null;
  renderSideShelf();
  updateUIState();
}

function updateUIState() {
  const visibleCount = Array.from(tiles.values()).filter((t) => t.card.style.display !== "none").length;
  activeCount.textContent = `${visibleCount} Tile${visibleCount === 1 ? "" : "s"} Live`;

  if (tiles.size === 0) {
    emptyState.style.display = "flex";
    hudBadge.className = "hud-badge green";
    hudBadge.textContent = "● STANDBY";
    hudMessage.textContent = "Ready. Spawn tiles or launch a preset above to activate spatial browsing.";
  } else {
    emptyState.style.display = "none";
    if (visibleCount > 1) {
      hudBadge.className = "hud-badge yellow";
      hudBadge.textContent = "● ACTIVE INTENT SYNC";
      hudMessage.innerHTML = `Running <b>${visibleCount} spatial sessions</b> simultaneously. Real-time CDP tele-operation active.`;
    } else {
      hudBadge.className = "hud-badge green";
      hudBadge.textContent = "● 1 LIVE TILE";
      hudMessage.textContent = "Toggle 💻 Desktop / 📱 Phone or drag ↘ corner to resize window freely.";
    }
  }
}

// Port Message Listener
port.onMessage.addListener((msg) => {
  if (msg.type === "FRAME") {
    const tile = tiles.get(msg.tileId);
    if (tile) {
      tile.renderFrame(msg.data, msg.metadata);
    }
  }

  if (msg.type === "TILE_READY") {
    const tile = tiles.get(msg.tileId);
    if (tile) {
      tile.tabId = msg.tabId;
      tile.titleEl.textContent = tile.getDomain(msg.url);
      tile.loader.style.display = "none";
      if (focusedTileId === msg.tileId) {
        tile.canvas.focus();
      }
    }
  }

  if (msg.type === "VIEWPORT_UPDATED") {
    const tile = tiles.get(msg.tileId);
    if (tile) {
      tile.loader.style.display = "none";
    }
  }

  if (msg.type === "ERROR") {
    const tile = tiles.get(msg.tileId);
    if (tile) {
      tile.loader.innerHTML = `<p style="color:#ef4444;">Error: ${msg.error}</p>`;
    }
  }
});

// Omni Bar & Preset Handlers
spawnBtn.onclick = () => {
  const val = urlInput.value.trim();
  if (val) {
    spawnTile(val);
    urlInput.value = "";
  }
};

urlInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    spawnBtn.click();
  }
});

// Workflows Demo Presets
presetTech.onclick = () => {
  clearAllTiles();
  spawnTile("https://news.ycombinator.com", "desktop");
  setTimeout(() => {
    spawnTile("https://github.com/trending", "desktop");
  }, 400);

  hudBadge.className = "hud-badge yellow";
  hudBadge.textContent = "● TECH WORKFLOW ACTIVE";
  hudMessage.innerHTML = "Monitoring <b>Hacker News</b> discussions alongside <b>GitHub Trending</b> repositories in 💻 Desktop Mode.";
};

presetWiki.onclick = () => {
  clearAllTiles();
  spawnTile("https://en.m.wikipedia.org", "mobile");
  setTimeout(() => {
    spawnTile("https://www.reddit.com/r/technology", "mobile");
  }, 400);

  hudBadge.className = "hud-badge green";
  hudBadge.textContent = "● RESEARCH WORKFLOW ACTIVE";
  hudMessage.innerHTML = "Cross-referencing <b>Wikipedia</b> knowledge base with live <b>Reddit</b> community discussions.";
};

presetClear.onclick = clearAllTiles;

if (emptyTechBtn) emptyTechBtn.onclick = () => presetTech.click();
if (emptyWikiBtn) emptyWikiBtn.onclick = () => presetWiki.click();

// Initial state
updateUIState();
renderSideShelf();
