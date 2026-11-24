# 🪞 MirrorCanvas: The Spatial Intent Cockpit
> **Track 2: Beyond the Browser – Reimagining How We Use the Web**

MirrorCanvas replaces the traditional 1995 tab bar with an **Infinite Spatial Cockpit** powered by **Chrome DevTools Protocol (CDP) Tele-Operation**. Instead of jumping between 20 fragmented tabs, users spawn live, interactive, authenticated mobile mirrors of real websites side-by-side on an infinite 2D canvas.

---

## ⚡ The Paradigm Shift

```
    TRADITIONAL WEB (1995)               AI CHATBOTS (2023)              MIRRORCANVAS (2026)
┌────────────────────────────┐      ┌────────────────────────────┐      ┌────────────────────────────┐
│ Tab 1 │ Tab 2 │ Tab 3 │    │      │  "Here is a summary of     │      │   [📱 Live PCPartPicker]   │
├────────────────────────────┤      │   PC components..."        │      │             │              │
│ 80% Ads, Cookie Banners,   │      │                            │      │             ▼ (Live Sync)  │
│ 15 Fragmented Portals,     │      │  [Dead Text - Cannot Click,│      │             │              │
│ Zero Interoperability      │      │   Cannot Buy, No Auth]     │      │   [📱 Live Amazon Cart]    │
└────────────────────────────┘      └────────────────────────────┘      └────────────────────────────┘
```

### The Problem With the Modern Web:
1. **Tab Amnesia:** Completing any complex goal (building a PC, moving cities, multi-city travel, medical research) requires 15–30 disjointed tabs, mental juggling, and endless Alt-Tabbing.
2. **The "Dead Summary" Trap of AI:** Modern AI search tools produce static, read-only summaries. You cannot click, verify real-time inventory, log in with OTP, or execute transactions inside an AI summary.
3. **Web Sludge:** 70% of desktop surface area is taken up by sticky headers, cookie banners, autoplay ads, and subscription modals.

### The MirrorCanvas Solution:
* **True 1st-Party Auth & Zero CSP Blocking:** Real tabs run in the background as top-level Chrome tabs. They retain 100% of their cookies, session state, and OTP logins, completely bypassing `SameSite` cookie partitioning, `X-Frame-Options`, and CSP iframe blocks.
* **Bi-Directional Tele-Operation:** Mouse clicks, touch taps, keyboard strokes, and scroll gestures are translated through normalized ratio math and dispatched via CDP in real time.
* **1-Click Native Checkout Handoff:** When ready to transact, clicking **"💳 Jump"** brings the authentic background tab into the foreground for native bank 2FA / UPI QR completion.

---

## 🚀 Key Features

* **Multi-Tile Spatial Viewport:** Run multiple live websites simultaneously side-by-side.
* **Mobile Viewport Emulation:** Emulates a `412 × 820` mobile device, stripping desktop web sludge and presenting a clean, compact view.
* **Universal Input Pipeline:**
  * **Clicks & Hyperlinks:** Direct DOM element resolution and synthetic CDP click dispatching for links, buttons, and form inputs.
  * **Smooth Scrolling:** Instant DOM scroll injection (`window.scrollBy` + `scrollingElement`) plus native CDP touch swipe gestures.
  * **Interactive Typing:** Keystroke mapping with virtual keycodes (`Enter`, `Backspace`, shortcuts) without input lockups.
* **1-Click Demo Workflows:**
  * `💻 Tech:` Spawns **Hacker News** and **GitHub Trending** side-by-side.
  * `📚 Research:` Spawns **Wikipedia** and **Reddit** side-by-side.
  * `➕ Omni-Bar:` Enter any custom URL (e.g. `https://pcpartpicker.com`, `https://en.wikipedia.org`).
* **Cross-Site Conflict HUD:** Live notification status bar reflecting multi-tile synchronization.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                 Spatial Viewport (canvas.html)              │
│   [ Omni-Bar ]   [ Workflow Presets ]   [ Status HUD ]     │
│   ┌───────────────────────────┐ ┌─────────────────────────┐ │
│   │ Tile A: Wikipedia         │ │ Tile B: Reddit          │ │
│   │ <canvas 412x820>          │ │ <canvas 412x820>        │ │
│   └─────────────┬─────────────┘ └────────────┬────────────┘ │
└─────────────────┼────────────────────────────┼──────────────┘
                  │   Multiplexed Port         │
                  ▼   (chrome.runtime.connect) ▼
┌─────────────────────────────────────────────────────────────┐
│           Extension Service Worker (background.js)          │
│   - Multiplexed Tile Pool (activeTiles map)                 │
│   - Chrome DevTools Protocol (CDP v1.3 Bridge)              │
│   - Emulation (Viewport: 412x820, Mobile UA, Touch Emulation)│
│   - Page.startScreencast Frame Pipeline                     │
│   - Input Dispatcher (MouseEvent, TouchEvent, KeyEvent)     │
│   - Universal DOM Scroll & Link Navigation Scripting        │
└──────────────────────────────┬──────────────────────────────┘
                               │ Top-Level Native Tabs
                               ▼ (active: false)
┌─────────────────────────────────────────────────────────────┐
│  Tab 1: https://en.wikipedia.org (1st-Party Auth, Full CSP) │
│  Tab 2: https://reddit.com       (1st-Party Auth, Full CSP) │
└─────────────────────────────────────────────────────────────┘
```

---

## 📂 Project Structure

```
c:\whackiest\
├── manifest.json                       # Extension Manifest (V3)
├── background.js                       # Service worker & multi-tab CDP tele-operation hub
├── canvas.html                         # Cockpit UI host page & preset workflow bar
├── canvas.css                          # Spatial styling, tile layouts, and dark theme
├── canvas.js                           # Multi-tile canvas renderer, click & scroll router
│
├── testing\                            # Standalone spike validation files
│   ├── manifest.json
│   ├── background.js
│   ├── canvas.html
│   ├── canvas.css
│   └── canvas.js
│
├── PROJECT-SPEC-AND-CHECKLIST.md       # Long-term MVP spec, roadmap & checklist
├── spatial-canvas-technical-blueprint.md # Comprehensive technical architecture blueprint
└── README.md                           # This file
```

---

## 🛠️ Installation & Setup

1. **Clone or Open Directory:**
   * Open Chrome and navigate to `chrome://extensions/`.
2. **Enable Developer Mode:**
   * Toggle the **"Developer mode"** switch in the top-right corner.
3. **Load Unpacked Extension:**
   * Click **"Load unpacked"** in the top-left.
   * Select the project folder: `c:\whackiest`.
4. **Launch the Cockpit:**
   * Click the **MirrorCanvas Spike** extension icon in your Chrome toolbar, or open:
     ```text
     chrome-extension://<EXTENSION_ID>/canvas.html
     ```

---

## 🎯 How to Demo to Evaluators

1. **Launch a Multi-Site Workflow:**
   * Click **`💻 Tech (Hacker News + GitHub)`** or **`📚 Research (Wikipedia + Reddit)`** at the top.
   * Observe two mobile-emulated tiles rendering live side-by-side at 60 FPS without layout distortion.
2. **Interact Live Across Tiles:**
   * **Scroll:** Place your mouse over either tile and scroll your wheel — the site scrolls smoothly.
   * **Click & Navigate:** Click on any blue link or article on Wikipedia or Hacker News — the tile navigates directly to that page in real-time.
   * **Search & Type:** Click on a search input (e.g. Wikipedia search), type a query, and press **Enter**.
3. **1-Click Checkout Handoff:**
   * Click the **`💳 Jump`** button on any tile header.
   * Chrome instantly switches to the authentic, top-level background tab with all session cookies and desktop payment security intact.

---

## 🔒 Security & Privacy

* **Zero Credential Scraping:** Passwords, OTPs, and bank details are never intercepted by MirrorCanvas; inputs are dispatched directly to Chromium's native DevTools input engine.
* **No Iframe Security Violations:** By operating on genuine top-level tabs, the system respects strict CSP (`frame-ancestors 'none'`) and `SameSite` cookie protections without bypass hacks.
* **1-Click Handoff:** Sensitive transactions (UPI QR, 3D Secure, OTPs) occur directly on the authentic merchant domain.

---

## 📜 License
Developed for Hackathon Track 2: **Beyond the Browser – Reimagining How We Use the Web**.
