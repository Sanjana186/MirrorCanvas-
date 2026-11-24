// CDP Client: Wraps Chrome DevTools Protocol commands for device emulation, screencast, and inputs
export class CdpClient {
  constructor(tabManager) {
    this.tabManager = tabManager;
  }

  async send(tabId, method, params) {
    if (!tabId) return null;
    try {
      return await chrome.debugger.sendCommand({ tabId }, method, params);
    } catch (err) {
      if (err.message && err.message.includes("Detached")) {
        const match = this.tabManager.getByTabId(tabId);
        if (match) {
          match.tile.isAttached = false;
          this.tabManager.delete(match.tileId);
        }
      }
      return null;
    }
  }

  async setupMobileEmulation(tabId, viewport, userAgent) {
    await this.send(tabId, "Page.enable");
    await this.send(tabId, "Network.enable");

    await this.send(tabId, "Emulation.setUserAgentOverride", {
      userAgent,
      platform: "Linux armv8l"
    });

    await this.send(tabId, "Emulation.setDeviceMetricsOverride", {
      width: viewport.width,
      height: viewport.height,
      deviceScaleFactor: 1,
      mobile: true,
      fitWindow: false
    });

    await this.send(tabId, "Emulation.setVisibleSize", {
      width: viewport.width,
      height: viewport.height
    }).catch(() => {});

    await this.send(tabId, "Emulation.setTouchEmulationEnabled", {
      enabled: true,
      configuration: "mobile"
    });
  }

  async startScreencast(tabId, quality = 80) {
    await this.send(tabId, "Page.startScreencast", {
      format: "jpeg",
      quality,
      everyNthFrame: 1
    });
  }

  ackFrame(tabId, sessionId) {
    this.send(tabId, "Page.screencastFrameAck", { sessionId });
  }

  async dispatchClick(tabId, x, y) {
    // 1. Move cursor
    await this.send(tabId, "Input.dispatchMouseEvent", {
      type: "mouseMoved",
      x,
      y
    });

    // 2. Dispatch Touch Tap (mobile listeners)
    await this.send(tabId, "Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x, y }]
    });
    await this.send(tabId, "Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: []
    });

    // 3. Dispatch Mouse Click (desktop listeners & form focus)
    await this.send(tabId, "Input.dispatchMouseEvent", {
      type: "mousePressed",
      x,
      y,
      button: "left",
      clickCount: 1
    });
    await this.send(tabId, "Input.dispatchMouseEvent", {
      type: "mouseReleased",
      x,
      y,
      button: "left",
      clickCount: 1
    });
  }

  async dispatchKey(tabId, keyData) {
    const isEnter = keyData.key === "Enter" || keyData.keyCode === 13;
    const isBackspace = keyData.key === "Backspace" || keyData.keyCode === 8;

    if (isEnter) {
      await this.send(tabId, "Input.dispatchKeyEvent", {
        type: "keyDown",
        key: "Enter",
        code: "Enter",
        windowsVirtualKeyCode: 13,
        nativeVirtualKeyCode: 13,
        text: "\r",
        unmodifiedText: "\r"
      });
      await this.send(tabId, "Input.dispatchKeyEvent", {
        type: "keyUp",
        key: "Enter",
        code: "Enter",
        windowsVirtualKeyCode: 13,
        nativeVirtualKeyCode: 13
      });
    } else if (isBackspace) {
      await this.send(tabId, "Input.dispatchKeyEvent", {
        type: "keyDown",
        key: "Backspace",
        code: "Backspace",
        windowsVirtualKeyCode: 8,
        nativeVirtualKeyCode: 8
      });
      await this.send(tabId, "Input.dispatchKeyEvent", {
        type: "keyUp",
        key: "Backspace",
        code: "Backspace",
        windowsVirtualKeyCode: 8,
        nativeVirtualKeyCode: 8
      });
    } else if (keyData.text) {
      await this.send(tabId, "Input.dispatchKeyEvent", {
        type: "keyDown",
        key: keyData.key,
        code: keyData.code,
        windowsVirtualKeyCode: keyData.keyCode,
        nativeVirtualKeyCode: keyData.keyCode,
        text: keyData.text,
        unmodifiedText: keyData.text
      });
      await this.send(tabId, "Input.dispatchKeyEvent", {
        type: "keyUp",
        key: keyData.key,
        code: keyData.code,
        windowsVirtualKeyCode: keyData.keyCode,
        nativeVirtualKeyCode: keyData.keyCode
      });
    } else {
      await this.send(tabId, "Input.dispatchKeyEvent", {
        type: "keyDown",
        key: keyData.key,
        code: keyData.code,
        windowsVirtualKeyCode: keyData.keyCode,
        nativeVirtualKeyCode: keyData.keyCode
      });
      await this.send(tabId, "Input.dispatchKeyEvent", {
        type: "keyUp",
        key: keyData.key,
        code: keyData.code,
        windowsVirtualKeyCode: keyData.keyCode,
        nativeVirtualKeyCode: keyData.keyCode
      });
    }
  }

  async insertText(tabId, text) {
    await this.send(tabId, "Input.insertText", { text });
  }

  async dispatchTouchEvents(tabId, type, points) {
    await this.send(tabId, "Input.dispatchTouchEvent", {
      type,
      touchPoints: points
    });
  }

  async dispatchScrollGesture(tabId, x, y, deltaX, deltaY) {
    await this.send(tabId, "Input.synthesizeScrollGesture", {
      x,
      y,
      yDistance: -deltaY,
      xDistance: -deltaX,
      speed: 800
    });
  }
}
