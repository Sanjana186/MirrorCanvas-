const VIEWPORT_W = 412;
const VIEWPORT_H = 820;

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

// Map of tileId -> TileInstance
const tiles = new Map();
let focusedTileId = null;

class TileInstance {
  constructor(tileId, initialUrl) {
    this.id = tileId;
    this.url = initialUrl;
    this.tabId = null;

    // DOM Elements
    this.card = document.createElement("div");
    this.card.className = "tile-card";
    this.card.id = `tile-${tileId}`;

    const domain = this.getDomain(initialUrl);

    this.card.innerHTML = `
      <div class="tile-header">
        <div class="tile-title-group">
          <span class="status-dot"></span>
          <span class="tile-title" title="${initialUrl}">${domain}</span>
        </div>
        <div class="tile-actions">
          <button class="tile-btn jump-btn" title="Bring native Chrome tab to front">💳 Jump</button>
          <button class="tile-btn close-btn" title="Close tile">✕</button>
        </div>
      </div>
      <div class="canvas-container">
        <canvas width="${VIEWPORT_W}" height="${VIEWPORT_H}" tabindex="0"></canvas>
        <div class="loader-overlay">
          <div class="spinner"></div>
          <p>Connecting CDP stream...</p>
        </div>
      </div>
    `;

    this.canvas = this.card.querySelector("canvas");
    this.ctx = this.canvas.getContext("2d");
    this.loader = this.card.querySelector(".loader-overlay");
    this.jumpBtn = this.card.querySelector(".jump-btn");
    this.closeBtn = this.card.querySelector(".close-btn");
    this.titleEl = this.card.querySelector(".tile-title");

    this.img = new Image();

    // Event Listeners
    this.bindEvents();
  }

  getDomain(urlStr) {
    try {
      const u = new URL(/^https?:\/\//i.test(urlStr) ? urlStr : "https://" + urlStr);
      return u.hostname;
    } catch (_) {
      return urlStr;
    }
  }

  bindEvents() {
    // Focus on click
    this.card.addEventListener("pointerdown", () => {
      setFocusedTile(this.id);
    });

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
      port.postMessage({
        type: "TOUCH_EVENT",
        tileId: this.id,
        touchType: "touchEnd",
        touchPoints: []
      });
      setTimeout(() => {
        wasDragging = false;
      }, 50);
    });

    // Wheel Scroll Relay (Throttled with requestAnimationFrame)
    let pendingDeltaY = 0;
    let pendingDeltaX = 0;
    let scrollRaf = null;

    this.canvas.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        e.stopPropagation();
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

    // Keyboard Relay (Supports direct keystrokes & prevents tab loss)
    this.canvas.addEventListener("keydown", (e) => {
      // Allow copy/paste shortcuts to pass through
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === "v" || e.key.toLowerCase() === "c")) return;

      // Prevent canvas from losing focus on Space, Arrows, Backspace, Tab
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

  renderFrame(base64Data, metadata) {
    this.loader.style.display = "none";
    this.img.onload = () => {
      this.ctx.clearRect(0, 0, VIEWPORT_W, VIEWPORT_H);
      const nw = this.img.naturalWidth;
      const nh = this.img.naturalHeight;

      // In CDP screencast, Chromium renders the emulated mobile viewport (412x820)
      // in the top-left of the compositor frame, while the rest of the host tab's width
      // is filled with white/black space.
      // Therefore, the true mobile screen width inside the frame is: nh * (412 / 820)
      const targetAspect = VIEWPORT_W / VIEWPORT_H; // 412 / 820 = ~0.5024
      const frameAspect = nw / nh;

      if (frameAspect > targetAspect * 1.05) {
        // Frame has extra desktop width on the right: crop only the mobile viewport on the left
        const sourceW = Math.round(nh * targetAspect);
        this.ctx.drawImage(this.img, 0, 0, sourceW, nh, 0, 0, VIEWPORT_W, VIEWPORT_H);
      } else {
        this.ctx.drawImage(this.img, 0, 0, VIEWPORT_W, VIEWPORT_H);
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

function spawnTile(url) {
  const targetUrl = (url || "").trim();
  if (!targetUrl) return;

  const tileId = "tile_" + Math.random().toString(36).substring(2, 9);
  const tile = new TileInstance(tileId, targetUrl);

  tiles.set(tileId, tile);
  tilesContainer.appendChild(tile.card);

  updateUIState();
  setFocusedTile(tileId);

  port.postMessage({
    type: "SPAWN_TILE",
    tileId,
    url: targetUrl
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

function clearAllTiles() {
  for (const tileId of Array.from(tiles.keys())) {
    destroyTile(tileId);
  }
}

function updateUIState() {
  const count = tiles.size;
  activeCount.textContent = `${count} Tile${count === 1 ? "" : "s"} Live`;

  if (count === 0) {
    emptyState.style.display = "flex";
    tilesContainer.style.display = "none";
    hudBadge.className = "hud-badge green";
    hudBadge.textContent = "● STANDBY";
    hudMessage.textContent = "Spawn tiles or pick a workflow preset above to see cross-tile tele-operation.";
  } else {
    emptyState.style.display = "none";
    tilesContainer.style.display = "flex";

    // Dynamic conflict HUD evaluation for demo
    if (count >= 2) {
      hudBadge.className = "hud-badge green";
      hudBadge.textContent = "● ACTIVE INTENT SYNC";
      hudMessage.innerHTML = `Running <b>${count} spatial sessions</b> simultaneously. Real-time CDP tele-operation & conflict guard active.`;
    } else {
      hudBadge.className = "hud-badge green";
      hudBadge.textContent = "● 1 LIVE TILE";
      hudMessage.textContent = "Add a second tile (e.g. Amazon or Agoda) to see cross-site comparison & handoff.";
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

// Workflows Demo Presets (Fast, Bot-Free, Highly Interactive Sites)
presetTech.onclick = () => {
  clearAllTiles();
  spawnTile("https://news.ycombinator.com");
  setTimeout(() => {
    spawnTile("https://github.com/trending");
  }, 400);

  hudBadge.className = "hud-badge yellow";
  hudBadge.textContent = "● TECH WORKFLOW ACTIVE";
  hudMessage.innerHTML = "Monitoring <b>Hacker News</b> discussions alongside <b>GitHub Trending</b> repositories.";
};

presetWiki.onclick = () => {
  clearAllTiles();
  spawnTile("https://en.m.wikipedia.org");
  setTimeout(() => {
    spawnTile("https://www.reddit.com/r/technology");
  }, 400);

  hudBadge.className = "hud-badge green";
  hudBadge.textContent = "● RESEARCH WORKFLOW ACTIVE";
  hudMessage.innerHTML = "Cross-referencing <b>Wikipedia</b> knowledge base with live <b>Reddit</b> community discussions.";
};

presetClear.onclick = clearAllTiles;

// Initial state
updateUIState();

