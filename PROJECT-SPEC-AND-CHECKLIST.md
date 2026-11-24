# MirrorCanvas MVP: Project Specification, Architecture & Implementation Checklist
**Track 2: Beyond the Browser – Reimagining How We Use the Web**

---

## 1. Project Overview & Core Value Proposition

Modern browsers force users to break multi-site workflows (e.g. buying a compatible PC rig, booking multi-city travel, comparing client proposals) into 15–30 disjointed tabs. Traditional AI chatbots summarize websites into static, dead text that cannot be clicked, authenticated, or transacted on.

**MirrorCanvas** transforms web browsing into an **Infinite Spatial Cockpit** powered by **Chrome DevTools Protocol (CDP) Tele-Operation**:
1. **Multi-Tile Spatial Canvas:** Users issue high-level intents (or open multiple targets). The cockpit spawns live, interactive mobile-emulated tiles floating side-by-side on an infinite 2D canvas (with pan, zoom, drag, and arrange).
2. **True 1st-Party Auth & Zero CSP Blocking:** Real tabs run in the background as top-level Chrome tabs. They retain 100% of their cookies, session state, OTP logins, and bypass `X-Frame-Options` and CSP frame-busting.
3. **Bi-Directional Tele-Operation:** Mouse clicks, touch taps, keyboard strokes, paste actions, and scroll gestures are translated through normalized ratio math and dispatched to background tabs in real time.
4. **Real-Time Cross-Tile Conflict Engine:** In the background, content extraction snapshots text from active tiles (debounced by 1.5s) and feeds an AI engine (Gemini Flash) to continuously calculate cross-site compatibility, price totals, and schedule conflicts.
5. **1-Click Native Checkout Handoff:** When users reach the final payment step, clicking "Proceed to Checkout" brings the authentic background tab into the foreground for native bank 2FA / UPI QR completion.

---

## 2. Core Functional Modules

```
┌────────────────────────────────────────────────────────────────────────┐
│                        MIRRORCANVAS SYSTEM                             │
├────────────────────────────────────────────────────────────────────────┤
│ 1. Omni-Intent Bar & Routing                                           │
│    - Accepts natural language goal ("Build PC under ₹1.4L") or raw URLs│
│    - Maps intent to recommended target domains & initial routes       │
├────────────────────────────────────────────────────────────────────────┤
│ 2. Infinite Pan/Zoom Spatial Canvas (Front-End)                        │
│    - Multi-tile management (add, close, minimize, reposition)          │
│    - Smooth 2D canvas pan & zoom (wheel + space-drag)                  │
│    - Per-tile screencast rendering at 412 × 820 mobile resolution      │
│    - Ratio-based click/tap, drag-scroll, wheel, and key dispatchers    │
├────────────────────────────────────────────────────────────────────────┤
│ 3. Extension Service Worker & CDP Hub (MV3)                            │
│    - Multiplexed persistent port management (`cdp-stream`)             │
│    - Spawns background tabs (`chrome.tabs.create active:false`)        │
│    - Lifecycle management: attach debugger, touch emulation, screencast│
│    - Native scroll (`chrome.scripting` + `synthesizeScrollGesture`)    │
│    - 1-click tab activation (`chrome.tabs.update active:true`)         │
├────────────────────────────────────────────────────────────────────────┤
│ 4. Cross-Site Conflict & Sync Engine                                   │
│    - Debounced DOM text extraction (capped to 3,000 chars per tile)    │
│    - Structured extraction schema (Zod / JSON) via Gemini Flash        │
│    - Deterministic rule checks (dimensions, wattages, dates, budget)   │
│    - Visual HUD banner displaying live sync status and conflict alerts │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Technology Stack

* **Chrome Extension:** Manifest V3 (Service Worker, Declarative Permissions, `debugger`, `tabs`, `scripting`)
* **Spatial UI Engine:** Vanilla JS / modern CSS (or lightweight Vite + React/Tailwind depending on architecture choice)
* **Canvas Rendering:** HTML5 Canvas API + 2D Context (hardware-accelerated frame blitting)
* **Protocol Bridge:** Chrome DevTools Protocol (CDP v1.3: `Page`, `Emulation`, `Input`, `Runtime`)
* **AI Engine:** Google Gemini 2.0 Flash / Gemini 1.5 Flash (via lightweight backend proxy or direct client call with structured output)

---

## 4. Comprehensive Project Checklist

### Phase 1: Foundation & Spawner Multiplexing
- [x] Spike validation: CDP screencast streaming verified.
- [x] Spike validation: Coordinate translation & mobile touch emulation verified.
- [x] Spike validation: Universal dual-engine scrolling verified.
- [ ] Refactor single-tab service worker to support **multiple concurrent background tabs** (tab pool mapped by tile ID).
- [ ] Implement port multiplexing: assign each canvas tile a unique `tileId` so one port or tagged connections can control $N$ independent tabs.
- [ ] Safe tab teardown: automatic cleanup of debugger sessions and background tabs when individual tiles are closed or refreshed.

### Phase 2: Infinite Spatial Canvas UI
- [ ] Infinite 2D pan & zoom viewport (matrix transformation or CSS transform-based stage).
- [ ] Floating tile windows:
  - Header with title, target URL, close button, and native tab jump button.
  - Independent `<canvas>` element for each tile.
  - Drag-to-reposition and snap-to-grid controls.
- [ ] Omni-Intent bar:
  - Text input for custom prompts or direct URLs.
  - Quick-preset launch chips (e.g. `🖥️ PC Build: PCPartPicker + Amazon`, `✈️ Travel: RedBus + Agoda`).
- [ ] Active tile focus indicator and keyboard focus routing.

### Phase 3: Tele-Operation Refinement & Cross-Tile Sync
- [ ] Per-tile click, touch tap, drag-swipe, and mouse-wheel routing with per-tile bounding box math.
- [ ] In-tile form typing with focus retention and virtual keycode fidelity.
- [ ] Clipboard paste routing per tile (`Input.insertText`).
- [ ] 1-Click checkout / tab focus button per tile.

### Phase 4: Cross-Tile Conflict & Intelligence Engine
- [ ] Debounced (1.5s) DOM text snapshotting injected into background tabs.
- [ ] Intent parsing & schema extractor (e.g., component specs for PC builds, dates/costs for travel).
- [ ] Deterministic conflict evaluation:
  - Physical clearance checks (e.g. GPU length vs Case max length).
  - Power budget calculation (TDP sum vs PSU wattage).
  - Total combined cost aggregator across stores.
- [ ] Live UI Conflict HUD: floating bottom banner displaying status (green = all clear, yellow/red = conflict detected).

### Phase 5: Polish & Demo Readiness
- [ ] Dark cockpit aesthetic matching the blueprint mockups.
- [ ] Offline demo fallback / mocked intents for smooth presentations.
- [ ] Documentation, setup guide, and project video walkthrough script.

---

## 5. Proposed Clean Folder Structure

```
c:\whackiest\
├── testing\                            # [ARCHIVED] Standalone working spike files
│   ├── manifest.json
│   ├── background.js
│   ├── canvas.html
│   ├── canvas.css
│   └── canvas.js
│
├── PROJECT-SPEC-AND-CHECKLIST.md       # This file: roadmap, spec & checklist
├── spatial-canvas-technical-blueprint.md # Architecture blueprint
│
├── src\
│   ├── manifest.json                   # Main extension manifest (MV3)
│   ├── background\
│   │   ├── service-worker.js           # Multi-tab CDP orchestration & lifecycle
│   │   ├── cdp-client.js               # CDP commands (Emulation, Page, Input, Screencast)
│   │   └── tab-manager.js              # Tab pool (create, attach, destroy, focus)
│   │
│   ├── cockpit\                        # Spatial Canvas UI
│   │   ├── index.html                  # Cockpit host page
│   │   ├── cockpit.css                 # Spatial styling & dark theme
│   │   ├── cockpit.js                  # Main UI entry point
│   │   ├── canvas-stage.js             # Pan/zoom infinite stage manager
│   │   ├── tile.js                     # Tile component (canvas, events, controls)
│   │   └── omni-bar.js                 # Intent bar & preset chips
│   │
│   ├── conflict-engine\                # Intelligence & Cross-site sync
│   │   ├── extractor.js                # Injected DOM text snapshot script
│   │   ├── analyzer.js                 # Gemini Flash integration / prompt schema
│   │   ├── rules.js                    # Deterministic math (clearances, budgets, dates)
│   │   └── conflict-hud.js             # UI conflict notification banner
│   │
│   └── assets\                         # Icons, logos, and UI markers
│       ├── icon-16.png
│       ├── icon-48.png
│       └── icon-128.png
```
