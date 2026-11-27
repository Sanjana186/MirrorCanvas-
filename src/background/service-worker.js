const MOBILE_VIEWPORT = { width: 412, height: 600 };
const DESKTOP_VIEWPORT = { width: 850, height: 620 };
const MOBILE_UA =
  "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36";
const DESKTOP_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

chrome.action.onClicked.addListener(async () => {
  chrome.tabs.create({ url: chrome.runtime.getURL("cockpit/index.html") });
});

// Map of tileId -> { tabId, isAttached, url, mode, width, height, nativeJumped }
const activeTiles = new Map();

// Helper to restore spatial viewport if user interacted after jumping to native tab
async function restoreSpatialViewport(tile) {
  if (!tile || !tile.isAttached || !tile.nativeJumped) return;
  tile.nativeJumped = false;
  try {
    await sendCdp(tile.tabId, "Emulation.setUserAgentOverride", {
      userAgent: tile.mode === "desktop" ? DESKTOP_UA : MOBILE_UA,
      platform: tile.mode === "desktop" ? "Win32" : "Linux armv8l"
    });
    await sendCdp(tile.tabId, "Emulation.setDeviceMetricsOverride", {
      width: tile.width,
      height: tile.height,
      deviceScaleFactor: 1,
      mobile: tile.mode !== "desktop",
      fitWindow: false
    });
    await sendCdp(tile.tabId, "Emulation.setTouchEmulationEnabled", {
      enabled: tile.mode !== "desktop",
      configuration: tile.mode !== "desktop" ? "mobile" : "desktop"
    });
  } catch (_) {}
}

// Safe CDP execution helper
async function sendCdp(tabId, method, params) {
  if (!tabId) return null;
  try {
    return await chrome.debugger.sendCommand({ tabId }, method, params);
  } catch (err) {
    if (err.message && err.message.includes("Detached")) {
      for (const [tileId, tile] of activeTiles.entries()) {
        if (tile.tabId === tabId) {
          tile.isAttached = false;
          activeTiles.delete(tileId);
        }
      }
    }
    return null;
  }
}

// Global debugger detach listener
chrome.debugger.onDetach.addListener((source) => {
  for (const [tileId, tile] of activeTiles.entries()) {
    if (tile.tabId === source.tabId) {
      tile.isAttached = false;
      activeTiles.delete(tileId);
    }
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  for (const [tileId, tile] of activeTiles.entries()) {
    if (tile.tabId === tabId) {
      tile.isAttached = false;
      activeTiles.delete(tileId);
    }
  }
});

// Update tile URL when page navigates to a new site/page
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.url) {
    for (const [tileId, tile] of activeTiles.entries()) {
      if (tile.tabId === tabId) {
        tile.url = changeInfo.url;
      }
    }
  }
});

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== "cdp-stream") return;

  async function cleanupTile(tileId) {
    const tile = activeTiles.get(tileId);
    if (!tile) return;
    activeTiles.delete(tileId);
    try {
      await chrome.debugger.detach({ tabId: tile.tabId });
    } catch (_) {}
    try {
      await chrome.tabs.remove(tile.tabId);
    } catch (_) {}
  }

  async function cleanupAllTiles() {
    for (const tileId of Array.from(activeTiles.keys())) {
      await cleanupTile(tileId);
    }
  }

  // Screencast frame listener multiplexed across all active tiles
  const onEvent = (source, method, params) => {
    if (method === "Page.screencastFrame") {
      let matchedTileId = null;
      for (const [tId, tile] of activeTiles.entries()) {
        if (tile.tabId === source.tabId) {
          matchedTileId = tId;
          break;
        }
      }

      if (matchedTileId) {
        port.postMessage({
          type: "FRAME",
          tileId: matchedTileId,
          data: params.data,
          metadata: params.metadata
        });
        sendCdp(source.tabId, "Page.screencastFrameAck", {
          sessionId: params.sessionId
        });
      }
    }
  };

  chrome.debugger.onEvent.addListener(onEvent);

  port.onMessage.addListener(async (msg) => {
    // 1. SPAWN A NEW TILE TAB
    if (msg.type === "SPAWN_TILE") {
      const tileId = msg.tileId;
      try {
        if (activeTiles.has(tileId)) {
          await cleanupTile(tileId);
        }

        let targetUrl = (msg.url || "").trim();
        if (!/^https?:\/\//i.test(targetUrl)) {
          targetUrl = "https://" + targetUrl;
        }

        // Start tab at about:blank so emulation & desktop User-Agent are locked in BEFORE the site loads
        const tab = await chrome.tabs.create({ url: "about:blank", active: false });
        const tabId = tab.id;

        // Resilient debugger attach with retry
        let attached = false;
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            await chrome.debugger.attach({ tabId }, "1.3");
            attached = true;
            break;
          } catch (_) {
            await new Promise((r) => setTimeout(r, 100));
          }
        }
        if (!attached) throw new Error("Could not attach debugger to tab");

        const mode = msg.mode || "desktop";
        const width = mode === "desktop" ? DESKTOP_VIEWPORT.width : MOBILE_VIEWPORT.width;
        const height = mode === "desktop" ? DESKTOP_VIEWPORT.height : MOBILE_VIEWPORT.height;
        activeTiles.set(tileId, { tabId, isAttached: true, url: targetUrl, mode, width, height });

        await sendCdp(tabId, "Page.enable");
        await sendCdp(tabId, "Network.enable");

        // Force window.open calls to navigate in-place instead of popping open a new tab
        await sendCdp(tabId, "Page.addScriptToEvaluateOnNewDocument", {
          source: `
            window.open = function(url) {
              if (url) window.location.href = url;
              return window;
            };
          `
        }).catch(() => {});

        // Emulation applied BEFORE navigation
        await sendCdp(tabId, "Emulation.setUserAgentOverride", {
          userAgent: mode === "desktop" ? DESKTOP_UA : MOBILE_UA,
          platform: mode === "desktop" ? "Win32" : "Linux armv8l"
        });

        await sendCdp(tabId, "Emulation.setDeviceMetricsOverride", {
          width,
          height,
          deviceScaleFactor: 1,
          mobile: mode !== "desktop",
          fitWindow: false
        });

        await sendCdp(tabId, "Emulation.setVisibleSize", {
          width,
          height
        }).catch(() => {});

        await sendCdp(tabId, "Emulation.setTouchEmulationEnabled", {
          enabled: mode !== "desktop",
          configuration: mode !== "desktop" ? "mobile" : "desktop"
        });

        // Screencast stream
        await sendCdp(tabId, "Page.startScreencast", {
          format: "jpeg",
          quality: 80,
          everyNthFrame: 1
        });

        // Navigate cleanly to the target URL with all desktop emulation active
        await sendCdp(tabId, "Page.navigate", { url: targetUrl });

        port.postMessage({
          type: "TILE_READY",
          tileId,
          tabId,
          url: targetUrl,
          mode,
          width,
          height
        });
      } catch (err) {
        console.error("Error spawning tile tab:", err);
        port.postMessage({ type: "ERROR", tileId, error: err.message });
      }
    }

    // 1b. TOGGLE / RESIZE VIEWPORT (Mobile vs Desktop or custom size)
    if (msg.type === "SET_VIEWPORT") {
      const tile = activeTiles.get(msg.tileId);
      if (tile && tile.isAttached) {
        const prevMode = tile.mode;
        const mode = msg.mode || tile.mode;
        const width = msg.width || (mode === "desktop" ? DESKTOP_VIEWPORT.width : MOBILE_VIEWPORT.width);
        const height = msg.height || (mode === "desktop" ? DESKTOP_VIEWPORT.height : MOBILE_VIEWPORT.height);
        const modeSwitched = prevMode !== mode;

        tile.mode = mode;
        tile.width = width;
        tile.height = height;
        tile.nativeJumped = false;

        try {
          await sendCdp(tile.tabId, "Emulation.setUserAgentOverride", {
            userAgent: mode === "desktop" ? DESKTOP_UA : MOBILE_UA,
            platform: mode === "desktop" ? "Win32" : "Linux armv8l"
          });

          await sendCdp(tile.tabId, "Emulation.setDeviceMetricsOverride", {
            width,
            height,
            deviceScaleFactor: 1,
            mobile: mode !== "desktop",
            fitWindow: false
          });

          await sendCdp(tile.tabId, "Emulation.setVisibleSize", { width, height }).catch(() => {});

          await sendCdp(tile.tabId, "Emulation.setTouchEmulationEnabled", {
            enabled: mode !== "desktop",
            configuration: mode !== "desktop" ? "mobile" : "desktop"
          });

          // If mode switched (Mobile <-> Desktop), reload or navigate to get server-rendered layout
          if (modeSwitched) {
            const tab = await chrome.tabs.get(tile.tabId).catch(() => null);
            if (tab && tab.url) {
              if (mode === "desktop" && tab.url.includes(".m.wikipedia.org")) {
                const deskWiki = tab.url.replace(".m.wikipedia.org", ".wikipedia.org");
                await chrome.tabs.update(tile.tabId, { url: deskWiki });
              } else if (mode === "mobile" && tab.url.includes("wikipedia.org") && !tab.url.includes(".m.")) {
                const mobiWiki = tab.url.replace("wikipedia.org", ".m.wikipedia.org");
                await chrome.tabs.update(tile.tabId, { url: mobiWiki });
              } else {
                await sendCdp(tile.tabId, "Page.reload", { ignoreCache: false });
              }
            }
          }

          // Trigger immediate frame capture
          sendCdp(tile.tabId, "Page.captureScreenshot", { format: "jpeg", quality: 80 }).then((res) => {
            if (res && res.data) {
              port.postMessage({ type: "FRAME", tileId: msg.tileId, data: res.data });
            }
          }).catch(() => {});

          port.postMessage({
            type: "VIEWPORT_UPDATED",
            tileId: msg.tileId,
            mode,
            width,
            height
          });
        } catch (err) {
          console.warn("Error updating viewport:", err);
        }
      }
    }

    // 2. CLOSE TILE
    if (msg.type === "CLOSE_TILE") {
      await cleanupTile(msg.tileId);
    }

    // 2b. CLEANUP ALL TILES IN ONE BATCH
    if (msg.type === "CLEAR_ALL_TILES") {
      await cleanupAllTiles();
    }

    // 3. RELAY CLICKS
    if (msg.type === "CLICK") {
      const tile = activeTiles.get(msg.tileId);
      if (tile && tile.isAttached) {
        if (tile.nativeJumped) await restoreSpatialViewport(tile);
        const curW = tile.width || MOBILE_VIEWPORT.width;
        const curH = tile.height || MOBILE_VIEWPORT.height;
        const x = Math.max(0, Math.min(curW, Math.round(msg.ratioX * curW)));
        const y = Math.max(0, Math.min(curH, Math.round(msg.ratioY * curH)));

        try {
          // Method 1: Direct DOM element click (100% reliable for links <a>, buttons, inputs on any website)
          chrome.scripting.executeScript({
            target: { tabId: tile.tabId },
            func: (clickX, clickY) => {
              const el = document.elementFromPoint(clickX, clickY);
              if (el) {
                // Focus element if it can be focused (inputs, textareas)
                if (el.focus) el.focus();

                // If element is a link or inside an <a> tag, navigate in-place (strip target="_blank")
                const anchor = el.closest ? el.closest('a') : null;
                if (anchor) {
                  if (anchor.target === '_blank') {
                    anchor.target = '_self';
                  }
                  if (anchor.href && !anchor.href.startsWith('javascript:')) {
                    window.location.href = anchor.href;
                    return;
                  }
                  anchor.click();
                  return;
                }

                // If element is a button or inside a button, click the button
                const btn = el.closest ? el.closest('button') : null;
                if (btn) {
                  btn.click();
                  return;
                }

                // Standard DOM click on the target element
                el.click();
              }
            },
            args: [x, y]
          }).catch(() => {});

          // Method 2: CDP mouse event dispatch (standard CDP click pipeline)
          await sendCdp(tile.tabId, "Input.dispatchMouseEvent", {
            type: "mouseMoved",
            x,
            y
          });
          await sendCdp(tile.tabId, "Input.dispatchMouseEvent", {
            type: "mousePressed",
            x,
            y,
            button: "left",
            clickCount: 1
          });
          await sendCdp(tile.tabId, "Input.dispatchMouseEvent", {
            type: "mouseReleased",
            x,
            y,
            button: "left",
            clickCount: 1
          });
        } catch (_) {}
      }
    }

    // 4. RELAY SCROLL
    if (msg.type === "SCROLL") {
      const tile = activeTiles.get(msg.tileId);
      if (tile && tile.isAttached) {
        const curW = tile.width || MOBILE_VIEWPORT.width;
        const curH = tile.height || MOBILE_VIEWPORT.height;
        const scrollY = Math.round(msg.deltaY);
        const scrollX = Math.round(msg.deltaX || 0);

        chrome.scripting
          .executeScript({
            target: { tabId: tile.tabId },
            func: (dy, dx) => {
              window.scrollBy({ top: dy, left: dx, behavior: "instant" });
              if (document.scrollingElement) {
                document.scrollingElement.scrollTop += dy;
              }
              const active = document.activeElement;
              if (active && active.scrollHeight > active.clientHeight) {
                active.scrollTop += dy;
              }
            },
            args: [scrollY, scrollX]
          })
          .catch(() => {});

        const x = Math.max(0, Math.min(curW, Math.round(msg.ratioX * curW)));
        const y = Math.max(0, Math.min(curH, Math.round(msg.ratioY * curH)));

        sendCdp(tile.tabId, "Input.synthesizeScrollGesture", {
          x,
          y,
          yDistance: -scrollY,
          xDistance: -scrollX,
          speed: 800
        }).catch(() => {});

        setTimeout(() => {
          sendCdp(tile.tabId, "Page.captureScreenshot", { format: "jpeg", quality: 80 }).then(
            (res) => {
              if (res && res.data) {
                port.postMessage({ type: "FRAME", tileId: msg.tileId, data: res.data });
              }
            }
          ).catch(() => {});
        }, 50);
      }
    }

    // 5. RELAY TOUCH DRAG / SWIPE
    if (msg.type === "TOUCH_EVENT") {
      const tile = activeTiles.get(msg.tileId);
      if (tile && tile.isAttached) {
        try {
          const points = (msg.touchPoints || []).map((p) => ({
            x: Math.max(0, Math.min(VIEWPORT.width, Math.round(p.ratioX * VIEWPORT.width))),
            y: Math.max(0, Math.min(VIEWPORT.height, Math.round(p.ratioY * VIEWPORT.height)))
          }));
          await sendCdp(tile.tabId, "Input.dispatchTouchEvent", {
            type: msg.touchType,
            touchPoints: points
          });
        } catch (_) {}
      }
    }

    // 6. RELAY KEYBOARD
    if (msg.type === "KEY") {
      const tile = activeTiles.get(msg.tileId);
      if (tile && tile.isAttached) {
        try {
          const isEnter = msg.key === "Enter" || msg.keyCode === 13;
          const isBackspace = msg.key === "Backspace" || msg.keyCode === 8;

          if (isEnter) {
            await sendCdp(tile.tabId, "Input.dispatchKeyEvent", {
              type: "keyDown",
              key: "Enter",
              code: "Enter",
              windowsVirtualKeyCode: 13,
              nativeVirtualKeyCode: 13,
              text: "\r",
              unmodifiedText: "\r"
            });
            await sendCdp(tile.tabId, "Input.dispatchKeyEvent", {
              type: "keyUp",
              key: "Enter",
              code: "Enter",
              windowsVirtualKeyCode: 13,
              nativeVirtualKeyCode: 13
            });
          } else if (isBackspace) {
            await sendCdp(tile.tabId, "Input.dispatchKeyEvent", {
              type: "keyDown",
              key: "Backspace",
              code: "Backspace",
              windowsVirtualKeyCode: 8,
              nativeVirtualKeyCode: 8
            });
            await sendCdp(tile.tabId, "Input.dispatchKeyEvent", {
              type: "keyUp",
              key: "Backspace",
              code: "Backspace",
              windowsVirtualKeyCode: 8,
              nativeVirtualKeyCode: 8
            });
          } else if (msg.text) {
            // In Chromium, dispatching keyDown with text already inserts the character.
            // Dispatching a separate 'char' event caused it to type twice!
            await sendCdp(tile.tabId, "Input.dispatchKeyEvent", {
              type: "keyDown",
              key: msg.key,
              code: msg.code,
              windowsVirtualKeyCode: msg.keyCode,
              nativeVirtualKeyCode: msg.keyCode,
              text: msg.text,
              unmodifiedText: msg.text
            });
            await sendCdp(tile.tabId, "Input.dispatchKeyEvent", {
              type: "keyUp",
              key: msg.key,
              code: msg.code,
              windowsVirtualKeyCode: msg.keyCode,
              nativeVirtualKeyCode: msg.keyCode
            });
          } else {
            await sendCdp(tile.tabId, "Input.dispatchKeyEvent", {
              type: "keyDown",
              key: msg.key,
              code: msg.code,
              windowsVirtualKeyCode: msg.keyCode,
              nativeVirtualKeyCode: msg.keyCode
            });
            await sendCdp(tile.tabId, "Input.dispatchKeyEvent", {
              type: "keyUp",
              key: msg.key,
              code: msg.code,
              windowsVirtualKeyCode: msg.keyCode,
              nativeVirtualKeyCode: msg.keyCode
            });
          }
        } catch (_) {}
      }
    }

    // 7. RELAY PASTE
    if (msg.type === "INSERT_TEXT") {
      const tile = activeTiles.get(msg.tileId);
      if (tile && tile.isAttached && msg.text) {
        sendCdp(tile.tabId, "Input.insertText", { text: msg.text }).catch(() => {});
      }
    }

    // 8. FOCUS / JUMP TO NATIVE TAB (Brings authentic tab to front at full device resolution)
    if (msg.type === "FOCUS_TAB") {
      const tile = activeTiles.get(msg.tileId);
      if (tile && tile.isAttached) {
        tile.nativeJumped = true;
        try {
          // Clear device metrics override so tab expands to 100% full screen on user's device
          await sendCdp(tile.tabId, "Emulation.clearDeviceMetricsOverride", {});
          await sendCdp(tile.tabId, "Emulation.setUserAgentOverride", { userAgent: "" });
          await sendCdp(tile.tabId, "Emulation.setTouchEmulationEnabled", { enabled: false });

          // If Wikipedia was in mobile subdomain, restore full desktop domain
          const tab = await chrome.tabs.get(tile.tabId).catch(() => null);
          if (tab && tab.url && tab.url.includes(".m.wikipedia.org")) {
            await chrome.tabs.update(tile.tabId, { url: tab.url.replace(".m.wikipedia.org", ".wikipedia.org") });
          }

          if (tab && tab.windowId) {
            await chrome.windows.update(tab.windowId, { focused: true });
            await chrome.tabs.update(tile.tabId, { active: true });
          }
        } catch (err) {
          console.warn("Error restoring native tab dimensions on Jump:", err);
        }
      }
    }
  });

  port.onDisconnect.addListener(() => {
    chrome.debugger.onEvent.removeListener(onEvent);
    cleanupAllTiles();
  });
});

