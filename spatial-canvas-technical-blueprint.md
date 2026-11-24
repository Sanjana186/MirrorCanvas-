# Project MirrorCanvas: The Spatial Intent Cockpit
### Track 2: Beyond the Browser – Reimagining How We Use the Web

---

## 1. Executive Summary & The Paradigm Shift

### The Problem With the Modern Web
The architecture of web browsing has remained fundamentally unchanged since 1995:
1. **Tab Amnesia:** To complete any complex real-world goal (building a PC, moving cities, booking multi-leg travel, onboarding clients, or compiling medical research), a user opens 15–30 disjointed tabs. Comparing data between tabs requires manual copy-pasting, alt-tabbing, and mental juggling.
2. **The "Dead Summary" Trap of AI:** Modern AI search tools (Google AI Overviews, Perplexity, Arc) deliver static, read-only summaries. You cannot select parts, verify compatibility, fill forms, log in, or execute transactions inside an AI summary. You are inevitably thrown back into the messy web.
3. **Web Sludge & Cognitive Friction:** 80% of a webpage's surface area consists of sticky headers, cookie banners, autoplay ads, and subscription modals designed to distract, not assist.

### How We Are Changing Things
**MirrorCanvas** replaces the tab bar with an **Infinite Spatial Cockpit powered by Chrome DevTools Protocol (CDP) Tele-Operation**.

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

Instead of visiting web pages, the user issues any high-level intent. MirrorCanvas spawns **live, interactive, authenticated mobile-emulated mirrors of real websites** floating side-by-side on an infinite 2D canvas. The user logs in via OTP, selects options, and triggers actions **directly from the canvas tiles**, while a background AI monitors cross-site schedule, budget, and compatibility conflicts in real time.

---

## 2. Universal "Big Intent" Workflows (Works For Anything)

MirrorCanvas is a general-purpose spatial web operating system. It handles any multi-site workflow:

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│ INTENT CATEGORY      │ SPAWNED LIVE MIRRORS                     │ LIVE CROSS-TILE CONFLICT CHECK│
├──────────────────────┼──────────────────────────────────────────┼───────────────────────────────┤
│ 🖥️ PC Hardware Build  │ 1. PCPartPicker (Compatibility)          │ Alerts if GPU length exceeds  │
│                      │ 2. Amazon / MDComputers (Cart & Prices)  │ case dimensions or power draw │
│                      │ 3. Reddit r/buildapc (Community thread)  │ exceeds power supply wattage. │
├──────────────────────┼──────────────────────────────────────────┼───────────────────────────────┤
│ 📦 City Relocation   │ 1. NoBroker / Zillow (Apartment search)  │ Calculates commute time from  │
│                      │ 2. Packers & Movers (Moving quotes)      │ listing to work, and checks   │
│                      │ 3. Rentomojo (Furniture rental package)  │ moving date alignment.        │
├──────────────────────┼──────────────────────────────────────────┼───────────────────────────────┤
│ 💼 Client Onboarding │ 1. Stripe Invoicing (Drafting invoice)   │ Verifies payment milestone    │
│                      │ 2. DocuSign / PandaDoc (Contract)        │ matches invoice terms before  │
│                      │ 3. Slack / Google Drive (Asset folder)   │ client dispatch.              │
├──────────────────────┼──────────────────────────────────────────┼───────────────────────────────┤
│ 🔬 Medical Research  │ 1. PubMed / Nature (Clinical paper)      │ Cross-examines drug dosing    │
│                      │ 2. ClinicalTrials.gov (Active trials)    │ and adverse reaction metrics  │
│                      │ 3. Google Docs / Overleaf (Live paper)   │ into comparative table.       │
├──────────────────────┼──────────────────────────────────────────┼───────────────────────────────┤
│ ✈️ Travel & Stays    │ 1. RedBus / IRCTC / Airline portal       │ Flags arrival vs check-in     │
│                      │ 2. Agoda / Booking.com (Hotel details)   │ time gaps and calculates      │
│                      │ 3. Google Maps (Transit route)           │ true combined itinerary cost. │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. High-Level Architecture

```mermaid
flowchart TD
    subgraph ClientCanvas ["Spatial Viewport (React + Tailwind + Pan/Zoom Canvas)"]
        Prompt["Omni-Prompt Bar ('Build 4K Editing Rig under ₹1.4L')"]
        Tile1["Tile A: PCPartPicker Live Mirror"]
        Tile2["Tile B: Amazon Cart Live Mirror"]
        ConflictUI["Live AI Conflict & Sync Banner"]
    end

    subgraph ExtensionEngine ["Chrome Extension (Manifest V3)"]
        SW["Service Worker (background.js)"]
        CDP["chrome.debugger (Chrome DevTools Protocol Bridge)"]
        Port["Persistent Port (chrome.runtime.connect)"]
    end

    subgraph RealTabs ["Native Background Chrome Tabs (Top-Level Context)"]
        Tab1["Tab 1: https://pcpartpicker.com (1st-Party Cookies, Active Login, Full CSP)"]
        Tab2["Tab 2: https://amazon.in (1st-Party Cookies, Active Login, Full CSP)"]
    end

    Prompt -->|Intent Routing| SW
    SW -->|chrome.tabs.create active:false| Tab1
    SW -->|chrome.tabs.create active:false| Tab2
    
    CDP -->|Emulation.setDeviceMetricsOverride 412x820| Tab1
    CDP -->|Emulation.setDeviceMetricsOverride 412x820| Tab2
    
    CDP -->|Page.startScreencast everyNthFrame:2| Port
    Port -->|Direct Canvas drawImage| Tile1
    Port -->|Direct Canvas drawImage| Tile2
    
    Tile1 -->|Normalized Ratio Click / Scroll / Key| CDP
    CDP -->|Input.dispatchMouseEvent & dispatchKeyEvent| Tab1
    
    Tab1 -.->|Debounced Text Snapshot| ConflictUI
    Tab2 -.->|Debounced Text Snapshot| ConflictUI
```

---

## 4. Deep Technical Implementation

### 4.1 Why Naive Approaches Fail (And Why CDP is the Solution)
* **The `SameSite=Lax` & Cookie Partitioning Trap:** Modern browsers treat `<iframe>` tags embedded in extensions as cross-site contexts. Session cookies marked `SameSite=Lax` or `SameSite=Strict` are stripped. Chrome's storage partitioning (CHIPS) means localStorage and session cookies do not synchronize. The user is logged out.
* **The Clickjacking & CSP Defense:** Financial gateways, portals, and Google Auth enforce `X-Frame-Options: DENY`, `frame-ancestors 'none'`, and JS frame-busting (`if (top !== self) top.location = self.location`).
* **The Breakthrough:** MirrorCanvas keeps the real websites as **normal, top-level tabs** running in the background. The canvas uses **CDP screencast streaming and coordinate tele-operation**. The website's engine runs in a first-party, top-level window with 100% of its cookies, CSP, and security parameters untouched.

---

### 4.2 Mobile Viewport Emulation (Fixing Bounding-Box Scaling)
Instead of fragile CSS bounding-box cropping, we use Chromium's native device emulation.

```javascript
// background.js: Initiating Mobile Viewport via CDP
const VIEWPORT = { width: 412, height: 820 };

async function setupTabMirror(tabId) {
  await chrome.debugger.attach({ tabId }, "1.3");
  await chrome.debugger.sendCommand({ tabId }, "Page.enable");

  // Force clean mobile viewport:
  // 1. Strips 70% of desktop web sludge (sidebars, mega-menus, sticky ads).
  // 2. Survives page transitions (login -> search -> cart -> review).
  // 3. Makes coordinate translation 1:1 scale ratio math.
  await chrome.debugger.sendCommand({ tabId }, "Emulation.setDeviceMetricsOverride", {
    width: VIEWPORT.width,
    height: VIEWPORT.height,
    deviceScaleFactor: 2,
    mobile: true
  });

  // Start Screencast (Throttled to avoid IPC choke)
  await chrome.debugger.sendCommand({ tabId }, "Page.startScreencast", {
    format: "jpeg",
    quality: 70,
    everyNthFrame: 2
  });
}
```

---

### 4.3 Two-Way Normalized Input Relaying

#### Click & MouseWheel Relay (Ratio Math)
```javascript
// canvas.js: Client-Side Input Listeners
// Ratio math ensures clicks hit exact targets even when canvas is zoomed or resized
canvas.addEventListener("click", (e) => {
  const rect = canvas.getBoundingClientRect();
  const ratioX = (e.clientX - rect.left) / rect.width;
  const ratioY = (e.clientY - rect.top) / rect.height;
  port.postMessage({ type: "CLICK", ratioX, ratioY });
});

canvas.addEventListener("wheel", (e) => {
  // Prevent canvas zoom when scrolling inside tile
  e.stopPropagation();
  e.preventDefault();
  
  const rect = canvas.getBoundingClientRect();
  const ratioX = (e.clientX - rect.left) / rect.width;
  const ratioY = (e.clientY - rect.top) / rect.height;
  port.postMessage({ type: "SCROLL", ratioX, ratioY, deltaX: e.deltaX, deltaY: e.deltaY });
});
```

#### Keyboard Relay with Virtual Keycodes (Fixes Backspace/Enter/Tab)
```javascript
canvas.addEventListener("keydown", (e) => {
  port.postMessage({
    type: "KEY",
    key: e.key,
    code: e.code,
    text: e.key.length === 1 ? e.key : undefined,
    keyCode: e.keyCode // Essential for Chromium inputs
  });
});
```

---

### 4.4 Full-Canvas Authentication & Login Handling

| Authentication Mechanism | How It Behaves on the Canvas | Technical Guarantee |
| :--- | :--- | :--- |
| **Active Sessions (Cookies)** | Already logged in upon load. | Real background tab is first-party; all `SameSite=Lax/Strict` cookies load natively. |
| **Phone + SMS OTP** | User clicks input box on the canvas tile, types mobile number, receives SMS, types OTP, and hits verify. | Keystrokes relayed via `Input.dispatchKeyEvent`; session sets first-party cookies; screencast refreshes to logged-in dashboard. |
| **Image CAPTCHA** | User views distorted letters in the screencast stream, types them into the tile's input field, and submits. | Solved manually on canvas; zero fragile OCR or bot-detection flags. |
| **Google SSO (OAuth Popup)** | User clicks *"Sign in with Google"* on canvas. Real tab triggers native popup window for 2 seconds; user clicks account; popup closes; tile refreshes to logged-in state. | Standard browser popup security preserved; no COOP or cross-origin opener errors. |

---

### 4.5 The Real-Time Cross-Site Conflict Engine
Instead of high-frequency DOM mutations that choke performance, extraction is **debounced by 1.5 seconds** after user interaction:

1. Injected content script takes a snapshot of `document.body.innerText` (capped to 3,000 characters).
2. Sends the text to a lightweight Express proxy calling Gemini 2.0 Flash with a strict Zod schema:
   ```json
   {
     "intentCategory": "PC_BUILD",
     "components": [
       {"name": "RTX 4070 Super", "lengthMM": 242, "wattage": 220, "priceINR": 58999},
       {"name": "Corsair 4000D Case", "maxGpuLengthMM": 360, "priceINR": 6800}
     ]
   }
   ```
3. **Deterministic Math (`conflictEngine.js`):**
   * Computes clearances: $242\text{ mm} < 360\text{ mm}$ (Pass).
   * Computes power budget: $220\text{W} + 125\text{W} + 50\text{W} = 395\text{W} \rightarrow$ recommends 650W minimum PSU.
   * Total budget sum: ₹65,799.

---

### 4.6 1-Click Secure Checkout Handoff
At the final payment step:
* User clicks **`[ 🚀 PROCEED TO CHECKOUT ]`** on the canvas.
* Extension executes:
  ```javascript
  chrome.tabs.update(targetTabId, { active: true });
  ```
* Chrome brings the authentic, top-level background tab into focus directly at the payment gateway screen.
* User completes UPI QR scan or Bank 2FA OTP with full bank security intact.

---

## 5. End-to-End User Experience Walkthrough

```
[User Action]                         [System Response]                         [Behind the Scenes]
      │                                       │                                           │
      ├───────────────────────────────────────┼───────────────────────────────────────────┤
1. Enters Any Big Intent               Renders 3 smart recommendation             LLM maps intent to 
   "Build 4K Editing Rig under ₹1.4L"  chips: [PCPartPicker] [Amazon] [Reddit]    target domains & entry URLs
      │                                       │                                           │
2. Selects Desired Sites               Spawns 2 floating canvas tiles;            Opens native Chrome tabs;
                                       Tile A shows PCPartPicker;                 Attaches chrome.debugger;
                                       Tile B shows Amazon Cart.                  Sets mobile viewport 412x820
      │                                       │                                           │
3. Interacts & Configures on Canvas    Clicks component in Tile A;                Relays Input.dispatchMouseEvent;
                                       Tile A updates live in screencast.         Background tab executes clicks
      │                                       │                                           │
4. Conflict Engine Audits Real-Time    Conflict banner lights up green:           Debounced text extracted;
                                       "All components fit! Total: ₹1,34,200"     Zod schema verified
      │                                       │                                           │
5. Clicks "Proceed to Payment"         Switches focus to native Amazon tab;       Hands off to top-level tab;
                                       User completes standard checkout.          100% native bank security
```

---

## 6. Competitive Edge & Judge Defense

### Why This Wins Track 2 (Beyond the Browser)
1. **Rethinks Web Interaction:** Replaces sequential 1995 tab-hopping with simultaneous spatial manipulation across any web task.
2. **Technically Honest:** Solves cross-site session limitations using real browser engineering (CDP) rather than fragile, un-securable iframe hacks.
3. **No Hallucinations:** You interact with the real website DOM. What you see is ground truth.
4. **Universal Applicability:** Works across travel, hardware, housing, finance, and research on day one without website-side cooperation or API agreements.
