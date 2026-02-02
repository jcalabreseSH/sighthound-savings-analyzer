# Sighthound Savings Analyzer

A small, static web app that implements the **Sighthound Savings Analyzer**: a multi-step wizard that collects camera and cost inputs, then computes an optimal Sighthound configuration and estimated savings.

## Overview

The app runs entirely in the browser and is backed by a single JavaScript module. It guides users through:

1. Camera infrastructure and ownership
2. Camera counts and compute nodes
3. Optional analytics software selections
4. Current cost inputs
5. A final analysis step, followed by a detailed results view and PDF export

Key files:
- `index.html` – Markup for the multi-step wizard and results section
- `styles/savings-analyzer.css` – Layout, theming, and component styles
- `app.js` – All interactive behavior, state management, and savings calculations
- `test-run.js` – A Node/jsdom harness that drives the wizard flow headlessly for regression checks

## Getting started

### Prerequisites

- Node.js and npm installed

### Install dependencies

```bash
npm install
```

This pulls in `jsdom` and its transitive dependencies for the test harness.

## Running the app locally

The app is a static HTML/CSS/JS bundle and does not require a build step.

You can either:

- Serve the project root with a static file server (recommended):

  ```bash
  npx serve .
  ```

  Then open the reported URL (typically `http://localhost:3000`) and navigate to `/index.html`.

- Or open `index.html` directly in your browser from the filesystem (if you hit any module/CORS restrictions, use the HTTP server approach above).

## Tests / jsdom harness

There is no formal test runner wired into `npm test`; instead, use the jsdom-based harness:

```bash
node test-run.js
```

The harness will:
- Load `index.html` in a jsdom environment
- Wait for the app to finish initialization (via `window.__savings_init_done` set in `app.js`)
- Simulate a typical user journey:
  - Select a camera option in step 1
  - Continue through steps 2–4
  - Exercise the optional software step (step 3), including the **Skip for now** path and back navigation
- Log the active step IDs and button states as it navigates

To focus on or adjust specific scenarios, edit `test-run.js` directly (e.g., comment out flows you are not interested in) and rerun `node test-run.js`.

## Development notes

- State and navigation are driven from a single `state` object in `app.js` and a `goToStep(step)` helper. If you add or remove steps, update both `index.html` and the navigation logic together (including the `totalSteps` constant in `app.js`).
- Camera and node capacity logic is centralized in `updateCamerasAndNodes` / `updateNodeStatus` in `app.js`. If pricing or capacity assumptions change (e.g., cameras per node), prefer updating the shared constants instead of scattering values.
- The results view (hardware/software breakdown, cost comparison, and savings card) is computed from the same helpers that power the downloadable PDF, so UI and PDF output stay in sync.

### Step breakdown

1. **Step 1 – Camera infrastructure** (`#step1`)
   - User chooses whether they already have cameras and, if so, what kind (IP vs non-IP vs none).
   - If they choose IP cameras, the flow branches to step **1b**; otherwise it goes directly to step 2.
2. **Step 1b – Ownership** (`#step1b`)
   - Only shown when the user has existing IP cameras.
   - Captures whether cameras were purchased outright, are subscription/bundled, or the user is unsure; this is stored on `state.ownership` for context but does not change the math.
3. **Step 2 – Cameras & compute nodes** (`#step2`)
   - User configures counts for **Standard IP Cameras** and **Sighthound Smart Cameras** via steppers and number inputs.
   - `updateCamerasAndNodes()` recomputes total camera count, suggests nodes based on capacity, and optionally auto-syncs `state.computeNodes` when the **Auto-add Compute Nodes** toggle is on.
   - The `#nodeStatus` banner surfaces under/over-capacity information for the current camera/node configuration.
4. **Step 3 – Software selection (optional)** (`#step3`)
   - User can select analytics software per stream:
     - `LPR` (License Plate Recognition)
     - `MMCG` (Vehicle Analytics)
     - `Both` at a discounted bundled rate
   - Selections are stored as `{ type, price }` objects in `state.software` and drive monthly software cost.
   - **Continue** is disabled when no software is selected; **Skip for now** clears all selections and proceeds with no analytics (software cost = 0), but the user can navigate back and add software later.
5. **Step 4 – Current costs** (`#step4`)
   - User enters their **current monthly software cost**, **upfront hardware cost**, and **billing frequency** (monthly vs annual).
   - These values become the “current” side of the cost comparison used in the analysis.
6. **Step 5 – Analysis trigger** (`#step5`)
   - The **Calculate my savings** button calls `runAnalysis()`.
   - `runAnalysis()` recomputes hardware and software totals from the current `state`, updates the recommended setup, cost comparison, and savings card, and then reveals the results section.
7. **Results** (`#results`)
   - Shows a savings highlight card, a hardware + software breakdown, a timeframe toggle (12/24/36 months), and a side-by-side comparison of current vs Sighthound costs.
   - Users can download a PDF (`#downloadPdf`), start over, or go back and edit answers.

### Cost & savings math

All amounts are in USD. Key constants in `app.js`:

- `PRICES`:
  - `standardCamera = 250` (per camera, upfront)
  - `smartCamera = 3000` (per camera, upfront)
  - `node = 3500` (per compute node, upfront)
- `CAMERAS_PER_NODE = 4` (capacity per compute node)

Given the current `state`:

- **Camera counts**
  - `totalCameras = state.standardCameras + state.smartCameras`
- **Suggested nodes**
  - `suggestedNodes = totalCameras > 0 ? ceil(totalCameras / CAMERAS_PER_NODE) : 0`
- **Per-month software total**
  - Let `softwarePerStream = sum(price for each entry in state.software)`
  - `monthlySoftwareTotal = softwarePerStream * totalCameras`
- **Hardware totals**
  - `hardwareStandard = state.standardCameras * PRICES.standardCamera`
  - `hardwareSmart    = state.smartCameras    * PRICES.smartCamera`
  - `hardwareNodes    = state.computeNodes    * PRICES.node`
  - `hardwareTotal    = hardwareStandard + hardwareSmart + hardwareNodes`
- **Timeframe (months)**
  - `timeframe = state.timeframe` (12, 24, 36, etc., driven by the timeframe buttons)
- **Current setup cost**
  - Normalize current monthly cost based on billing frequency:
    - `currentMonthlyNormalized = state.frequency === "annual" ? state.currentMonthly / 12 : state.currentMonthly`
  - Over the selected timeframe:
    - `currentTotal = state.currentUpfront + currentMonthlyNormalized * timeframe`
- **Sighthound setup cost**
  - Over the same timeframe:
    - `sighthoundTotal = hardwareTotal + monthlySoftwareTotal * timeframe`
- **Savings**
  - `savings        = currentTotal - sighthoundTotal`
  - `savingsPerMonth = savings / timeframe`

Interpretation:
- When `savings > 0`, the Sighthound configuration is cheaper over the chosen timeframe; the savings card shows both total savings and per-month savings.
- When `savings <= 0`, the app treats the result as an additional investment and explains that the extra spend corresponds to upgraded hardware and analytics.
