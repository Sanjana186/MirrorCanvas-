# 🪞 MirrorCanvas: The Spatial Intent Cockpit
> **Track 2: Beyond the Browser – Reimagining How We Use the Web**  
> *Transforming fragmented tab-hopping into a live, tele-operated spatial web operating system.*

---

## ⚡ 1. The Core Paradigm Shift

```
    TRADITIONAL WEB (1995)               AI CHATBOTS (2023–2025)             MIRRORCANVAS (2026)
┌────────────────────────────┐      ┌────────────────────────────┐      ┌────────────────────────────┐
│ Tab 1 │ Tab 2 │ Tab 3 │    │      │  "Here is a summary of     │      │   [📱 Live PCPartPicker]   │
├────────────────────────────┤      │   PC components..."        │      │             │              │
│ 80% Ads, Cookie Banners,   │      │                            │      │             ▼ (Live Sync)  │
│ 15 Fragmented Portals,     │      │  [Dead Text - Cannot Click,│      │             │              │
│ Zero Interoperability      │      │   Cannot Buy, No Auth]     │      │   [📱 Live Amazon Cart]    │
└────────────────────────────┘      └────────────────────────────┘      └────────────────────────────┘
```

### The Fundamental Flaw: The "Human Middleware" Trap
Since tabs were invented in the late 1990s, web browsing has been fundamentally broken:
1. **Tabs Are Blind, Deaf Islands:** Tab 1 (your transit booking) has zero awareness of Tab 2 (your hotel stay) or Tab 3 (your local documents).
2. **Humans As Dumb Middleware:** You are forced to memorize dates, alt-tab 40 times to manually verify specs and prices, and re-type the exact same names, passport numbers, and addresses already sitting in a PDF on your laptop.
3. **The False Dichotomy of Modern AI:**
   * **AI Chatbots (ChatGPT, Perplexity):** Spit out dead, read-only text summaries. You cannot select a train berth, verify live stock, solve an OTP, or buy anything inside a dead Markdown summary.
   * **Autonomous Vision Agents (Claude Computer Use):** Suffer 10–15 second latencies per click, operate on one tab at a time, hallucinate frequently, and break instantly on CAPTCHAs, SMS 2FA, and bank payment gates.

### The MirrorCanvas Solution:
**MirrorCanvas** introduces the **Inter-Tab Cognitive Bus on an Infinite 2D Spatial Canvas**:
* **Live Spatial Mirrors:** Replaces isolated tabs with live, interactive, authenticated mobile-emulated website mirrors floating side-by-side.
* **True 1st-Party Auth & Zero CSP Blocking:** Real tabs run in authentic Chrome contexts—retaining 100% of cookies (`SameSite=Lax/Strict`), session states, and OTP logins, completely bypassing `X-Frame-Options` and CSP frame-busting.
* **Shared Inter-Tab Cognitive Bus:** A proactive AI copilot monitors cross-site DOM states to catch silent schedule, budget, and dimension conflicts in real time.
* **1-Click Bank-Grade Checkout Handoff:** Switches focus directly to the authentic native tab for UPI QR / 3D Secure verification with zero credential exposure.

---

## 💥 2. Earth-Breaking Capabilities

Beyond multi-tile spatial browsing, MirrorCanvas unlocks four breakthrough capabilities:

| Breakthrough | How It Works | Why It's Earth-Breaking |
| :--- | :--- | :--- |
| **1. Cross-Site Semantic Drag & Drop** *(Data Teleportation)* | Drag an element from Tile A (e.g., an address from Agoda or part number from PCPartPicker) and drop it onto Tile B (Google Maps or Amazon). | Standard browsers strictly forbid cross-origin drag-and-drop. MirrorCanvas intercepts coordinates and dispatches `Input.insertText` into the target tile. |
| **2. Workspace Decision Forking** *("Git for Web Browsing")* | Click `[🌿 Fork Canvas]` when comparing options (e.g., *Option A: Train + Homestay* vs. *Option B: Flight + Resort*). Creates discrete branches with instant state restoration. | Eliminates tab hoarding and mental juggle during complex comparisons. State serialized in `chrome.storage.local`. |
| **3. The Scissor Tool** *(Live Micro-Widget HUD)* | Draw a bounding box around any widget on a live site (e.g., just the Amazon cart total or train seat counter) to collapse the tile into a floating micro-widget. | Users build custom, live, multi-site monitoring dashboards in seconds using dynamic CSS `clip-path` and scaled CDP coordinates. |
| **4. The Context Pocket** *(Local Document-to-Web Bridge)* | Drop a local file (`passport.pdf`, `receipt.pdf`) into the dock. The copilot extracts glowing entity badges (`[👤 Name]` `[🆔 Passport]`) that 1-click blast data into active form fields. | Transforms local files into a universal, privacy-first autofill palette across the web without cloud storage. |

---

## 🏛️ 3. Deep Technical Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                 Spatial Viewport (cockpit/index.html)       │
│   [ Omni-Bar ]   [ Workflow Presets ]   [ Status HUD ]     │
│   ┌───────────────────────────┐ ┌─────────────────────────┐ │
│   │ Tile 1: Wikipedia         │ │ Tile 2: Reddit          │ │
│   │ <canvas 412x820>          │ │ <canvas 412x820>        │ │
│   └─────────────┬─────────────┘ └────────────┬────────────┘ │
└─────────────────┼────────────────────────────┼──────────────┘
                  │   Multiplexed Port         │
                  ▼   (chrome.runtime.connect) ▼
┌─────────────────────────────────────────────────────────────┐
│           Extension Service Worker (service-worker.js)      │
│   - Multiplexed Tile Pool (activeTiles map)                 │
│   - Chrome DevTools Protocol (CDP v1.3 Bridge)              │
│   - Emulation (Viewport: 412x820, Mobile UA, Touch Emulation)│
│   - Page.startScreencast Frame Pipeline                     │
│   - Universal Input Pipeline (Click/Touch, Wheel, Keys)     │
│   - In-Place Navigation & Window Trap Neutralization        │
│   - Dedicated Window Rasterization Engine                   │
└──────────────────────────────┬──────────────────────────────┘
                               │ Top-Level Native Tabs
                               ▼ (active: false / dedicated window)
┌─────────────────────────────────────────────────────────────┐
│  Tab 1: https://en.m.wikipedia.org (1st-Party Auth, CSP)    │
│  Tab 2: https://reddit.com         (1st-Party Auth, CSP)    │
└─────────────────────────────────────────────────────────────┘
```

### Architectural Decisions That Ensure Stability:
1. **Dedicated Unfocused Windows:** Overcomes Chromium's background compositing sleep so screencast frames stream continuously at 60 FPS.
2. **Pure CDP Extraction:** Uses `Runtime.evaluate` directly via CDP rather than injected content scripts, surviving hard reloads and cross-origin redirects without throwing *"Receiving end does not exist"*.
3. **Window Trap Neutralization:** Injects scripts via `Page.addScriptToEvaluateOnNewDocument` to neutralize `target="_blank"` and redirect `window.open` calls in-place, keeping users in the canvas cockpit.
4. **Normalized Ratio Input Math:** Dispatches inputs using $X_{ratio} = \frac{x - left}{width}$, ensuring 100% click/touch accuracy regardless of window resize or canvas zoom.

---

## 🎯 4. Evaluator Demo Walkthrough

1. **Multi-Site Workflow Presets:**
   * Click **`💻 Tech (Hacker News + GitHub)`** or **`📚 Research (Wikipedia + Reddit)`** at the top.
   * Two live mobile-emulated tiles render side-by-side at 60 FPS without layout distortion.
2. **Live In-Tile Interaction:**
   * **Smooth Scrolling:** Scroll with your mouse wheel over either tile—both respond independently.
   * **In-Place Navigation:** Click on any blue link or article—it navigates directly inside that same tile without spawning unwanted tabs.
   * **Crisp Text Typing:** Click into any search box (e.g. Wikipedia search), type a query (exact 1:1 character input, no double letters), and press **Enter** to search.
3. **1-Click Checkout / Native Handoff:**
   * Click **`💳 Jump`** on any tile header to immediately bring the genuine top-level tab to the foreground with 100% bank-grade payment security.

---

## 📂 5. Repository Structure

```
c:\whackiest\
├── src\
│   ├── manifest.json                     # Main extension manifest (MV3)
│   ├── background\
│   │   ├── service-worker.js             # Service worker entry & CDP tele-operation hub
│   │   ├── cdp-client.js                 # Modular CDP commands (emulation, input, screencast)
│   │   └── tab-manager.js                # Tab pool & lifecycle management
│   │
│   ├── cockpit\
│   │   ├── index.html                    # Spatial cockpit UI
│   │   ├── cockpit.css                   # Spatial styling, elevations, and dark theme
│   │   └── cockpit.js                    # Multi-tile canvas renderer & input router
│   │
│   ├── conflict-engine\
│   │   ├── extractor.js                  # Injected DOM text snapshot script
│   │   ├── rules.js                      # Deterministic rules (clearance, budgets, schedule)
│   │   └── conflict-hud.js               # HUD sync banner manager
│   │
│   └── assets\                           # Extension icons and UI markers
│
├── PROJECT-SPEC-AND-CHECKLIST.md         # Long-term spec & phased implementation checklist
├── spatial-canvas-technical-blueprint.md # Architecture blueprint
├── mirrorcanvas-product-architecture-spec-1.md # Master product & technical architecture spec
├── README.md                             # This documentation
└── testing\                              # [UNTRACKED] Original standalone spike files
```

---

## 🛠️ 6. Quick Start

1. Open Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer mode** (toggle in the top-right).
3. Click **Load unpacked** and select the **`src`** directory (`c:\whackiest\src`).
4. Click the **MirrorCanvas** icon in your toolbar, or open:
   ```text
   chrome-extension://<EXTENSION_ID>/cockpit/index.html
   ```

---

## 📜 7. License
Developed for Hackathon Track 2: **Beyond the Browser – Reimagining How We Use the Web**.
