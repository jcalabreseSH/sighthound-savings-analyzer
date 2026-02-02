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
