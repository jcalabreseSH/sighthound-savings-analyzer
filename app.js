// Local, readable implementation of the Sighthound Savings Analyzer logic

const state = {
  step: 1,
  cameraType: "",
  ownership: "",
  standardCameras: 0,
  smartCameras: 8,
  computeNodes: 2,
  autoAddNodes: true,
  software: [],
  currentMonthly: 0,
  currentUpfront: 0,
  frequency: "monthly",
  timeframe: 12,
};

const PRICES = {
  standardCamera: 250,
  smartCamera: 3000,
  node: 3500,
};

const CAMERAS_PER_NODE = 4;

const progressFill = document.getElementById("progressFill");
const progressText = document.getElementById("progressText");
const calculatorSection = document.getElementById("calculator");
const resultsSection = document.getElementById("results");

// ---------- INIT (safe even if script loads late) ----------
let __savings_init_done = false;
function init() {
  if (__savings_init_done) return;
  __savings_init_done = true;

  console.log("[savings] init");
  attachEventHandlers();
  updateCamerasAndNodes();
  updateSelectedSoftware();
  updateContinueStep3State();
  goToStep(1);
}

// Ensure init runs after DOM is ready in all environments (guarded against double-run)
document.addEventListener("DOMContentLoaded", init);
window.addEventListener("load", init);
// If script executes after load, run immediately
if (document.readyState !== "loading") setTimeout(init, 0);

// ---------- HELPERS ----------
function onClick(id, handler) {
  const el = document.getElementById(id);
  if (!el) return;
  console.log(`[savings] attaching click for #${id}`);
  el.addEventListener("click", (e) => {
    // Prevent form submit / anchor behavior from breaking step nav
    e.preventDefault();
    handler(e);
  });
}

// ---------- EVENT HANDLERS ----------
function attachEventHandlers() {
  // Delegated handlers to ensure clicks are handled even if elements
  // are added/available later in some environments
  document.body.addEventListener("click", (e) => {
    const btn = e.target.closest && e.target.closest("button, a");
    if (!btn) return;

    if (btn.id === "continueStep2") {
      e.preventDefault();
      goToStep(3);
      return;
    }

    if (btn.id === "continueStep3") {
      e.preventDefault();
      updateSelectedSoftware();
      updateContinueStep3State();
      if (state.software.length === 0) return;
      goToStep(4);
      return;
    }

    if (btn.id === "continueStep4") {
      e.preventDefault();
      goToStep(5);
      return;
    }

    if (btn.id === "calculateButton") {
      e.preventDefault();
      runAnalysis();
      return;
    }

    if (btn.id === "editAnswers") {
      e.preventDefault();
      resultsSection?.classList.remove("active");
      goToStep(1);
      calculatorSection?.scrollIntoView({ behavior: "smooth" });
      return;
    }

    if (btn.id === "startOver") {
      e.preventDefault();
      window.location.reload();
      return;
    }
  });
  // Scroll to calculator + show step 1
  onClick("startAnalysis", () => {
    resultsSection?.classList.remove("active");
    goToStep(1);
    calculatorSection?.scrollIntoView({ behavior: "smooth" });
  });

  // Step 1: camera type
  document.querySelectorAll("#step1 .option-card").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      state.cameraType = btn.dataset.value || "";
      selectOptionCard(btn);

      if (state.cameraType === "ip") {
        goToStep("1b");
      } else {
        goToStep(2);
      }
    });
  });

  // Step 1b: ownership
  document.querySelectorAll("#step1b .option-card").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      state.ownership = btn.dataset.value || "";
      selectOptionCard(btn);
      goToStep(2);
    });
  });

  // Standard cameras steppers and input
  document.querySelectorAll('[data-target="standardCameras"]').forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const input = document.getElementById("standardCameras");
      if (!input) return;

      const current = parseInt(input.value, 10) || 0;
      if (btn.dataset.action === "increase") input.value = String(current + 1);
      if (btn.dataset.action === "decrease" && current > 0) input.value = String(current - 1);

      state.standardCameras = parseInt(input.value, 10) || 0;
      updateCamerasAndNodes();
    });
  });

  document.getElementById("standardCameras")?.addEventListener("input", (ev) => {
    const value = Math.max(0, parseInt(ev.target.value, 10) || 0);
    ev.target.value = String(value);
    state.standardCameras = value;
    updateCamerasAndNodes();
  });

  // Smart cameras steppers and input
  document.querySelectorAll('[data-target="smartCameras"]').forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const input = document.getElementById("smartCameras");
      if (!input) return;

      const current = parseInt(input.value, 10) || 0;
      if (btn.dataset.action === "increase") input.value = String(current + 1);
      if (btn.dataset.action === "decrease" && current > 0) input.value = String(current - 1);

      state.smartCameras = parseInt(input.value, 10) || 0;
      updateCamerasAndNodes();
    });
  });

  document.getElementById("smartCameras")?.addEventListener("input", (ev) => {
    const value = Math.max(0, parseInt(ev.target.value, 10) || 0);
    ev.target.value = String(value);
    state.smartCameras = value;
    updateCamerasAndNodes();
  });

  // Auto-add nodes toggle
  document.getElementById("autoAddNodes")?.addEventListener("change", (ev) => {
    state.autoAddNodes = ev.target.checked;
    updateCamerasAndNodes();
  });

  // Compute nodes steppers and input
  document.querySelectorAll('[data-target="computeNodes"]').forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      if (state.autoAddNodes) return;

      const input = document.getElementById("computeNodes");
      if (!input) return;

      const current = parseInt(input.value, 10) || 0;
      if (btn.dataset.action === "increase") input.value = String(current + 1);
      if (btn.dataset.action === "decrease" && current > 0) input.value = String(current - 1);

      state.computeNodes = parseInt(input.value, 10) || 0;
      updateCamerasAndNodes();
    });
  });

  document.getElementById("computeNodes")?.addEventListener("input", (ev) => {
    if (state.autoAddNodes) return;
    const value = Math.max(0, parseInt(ev.target.value, 10) || 0);
    ev.target.value = String(value);
    state.computeNodes = value;
    updateCamerasAndNodes();
  });

  // Step 2 → 3
  onClick("continueStep2", () => goToStep(3));

  // Step 3 software checkboxes
  document.querySelectorAll('#step3 input[name="software"]').forEach((input) => {
    input.addEventListener("change", () => {
      updateSelectedSoftware();
      updateContinueStep3State();
    });
  });

  onClick("continueStep3", () => {
    // safeguard: don’t advance if nothing selected
    updateSelectedSoftware();
    updateContinueStep3State();
    if (state.software.length === 0) return;
    goToStep(4);
  });

  // Current cost inputs
  document.getElementById("currentMonthly")?.addEventListener("input", (ev) => {
    state.currentMonthly = parseFloat(ev.target.value) || 0;
  });

  document.getElementById("currentUpfront")?.addEventListener("input", (ev) => {
    state.currentUpfront = parseFloat(ev.target.value) || 0;
  });

  document.querySelectorAll('input[name="frequency"]').forEach((input) => {
    input.addEventListener("change", (ev) => {
      state.frequency = ev.target.value === "annual" ? "annual" : "monthly";
    });
  });

  onClick("continueStep4", () => goToStep(5));

  // Calculate
  onClick("calculateButton", () => runAnalysis());

  // Edit answers
  onClick("editAnswers", () => {
    resultsSection?.classList.remove("active");
    goToStep(1);
    calculatorSection?.scrollIntoView({ behavior: "smooth" });
  });

  // Start over
  onClick("startOver", () => window.location.reload());

  // Timeframe buttons
  document.querySelectorAll(".timeframe-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      document.querySelectorAll(".timeframe-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      const months = parseInt(btn.dataset.months, 10) || 12;
      state.timeframe = months;

      updateCostComparison();
      updateSavingsCard();
    });
  });
}

// ---------- CAMERA / NODE LOGIC ----------
function updateCamerasAndNodes() {
  const totalCameras = state.standardCameras + state.smartCameras;
  const suggestedNodes =
    totalCameras > 0 ? Math.ceil(totalCameras / CAMERAS_PER_NODE) : 0;

  const totalDisplay = document.getElementById("totalCamerasDisplay");
  if (totalDisplay) totalDisplay.textContent = String(totalCameras);

  const computeNodesInput = document.getElementById("computeNodes");
  const nodeStepperButtons = document.querySelectorAll('[data-target="computeNodes"]');

  if (state.autoAddNodes && totalCameras > 0) {
    state.computeNodes = suggestedNodes;

    if (computeNodesInput) {
      computeNodesInput.value = String(state.computeNodes);
      computeNodesInput.disabled = true;
      computeNodesInput.style.opacity = "0.6";
    }

    nodeStepperButtons.forEach((btn) => {
      btn.disabled = true;
      btn.style.opacity = "0.5";
      btn.style.cursor = "not-allowed";
    });
  } else {
    if (computeNodesInput) {
      computeNodesInput.disabled = false;
      computeNodesInput.style.opacity = "1";
    }

    nodeStepperButtons.forEach((btn) => {
      btn.disabled = false;
      btn.style.opacity = "1";
      btn.style.cursor = "pointer";
    });
  }

  updateNodeStatus(totalCameras, suggestedNodes);
}

function updateNodeStatus(totalCameras, suggestedNodes) {
  const nodeStatus = document.getElementById("nodeStatus");
  if (!nodeStatus) return;

  const capacity = state.computeNodes * CAMERAS_PER_NODE;

  if (totalCameras === 0) {
    nodeStatus.className = "node-status neutral";
    nodeStatus.textContent = "No cameras configured";
  } else if (state.computeNodes === 0) {
    nodeStatus.className = "node-status info";
    nodeStatus.textContent = `No Compute Nodes selected. Suggested: ${suggestedNodes} node${
      suggestedNodes > 1 ? "s" : ""
    } (supports ${suggestedNodes * CAMERAS_PER_NODE} cameras)`;
  } else if (capacity < totalCameras) {
    nodeStatus.className = "node-status warning";
    nodeStatus.textContent = `Selected nodes support ${capacity} cameras, but you configured ${totalCameras}. Consider adding more nodes.`;
  } else {
    nodeStatus.className = "node-status success";
    nodeStatus.textContent = `Compute Nodes configuration supports ${capacity} camera${
      capacity === 1 ? "" : "s"
    } (${totalCameras} configured)`;
  }
}

// ---------- STEP NAV ----------
function goToStep(step) {
  document.querySelectorAll(".step").forEach((el) => el.classList.remove("active"));

  const stepId = `step${step}`;
  const stepElement = document.getElementById(stepId);
  if (stepElement) stepElement.classList.add("active");

  // Progress bar only tracks 1–5
  const totalSteps = 5;
  const numericStep = step === "1b" ? 1 : (parseInt(step, 10) || 1);

  const progress = (numericStep / totalSteps) * 100;
  if (progressFill) progressFill.style.width = `${progress}%`;
  if (progressText) progressText.textContent = `Step ${numericStep} of ${totalSteps}`;

  state.step = step;
}

function selectOptionCard(btn) {
  const parent = btn.parentElement;
  if (!parent) return;
  parent.querySelectorAll(".option-card").forEach((el) => el.classList.remove("selected"));
  btn.classList.add("selected");
}

// ---------- SOFTWARE ----------
function updateSelectedSoftware() {
  const checked = document.querySelectorAll('#step3 input[name="software"]:checked');
  state.software = Array.from(checked).map((input) => ({
    type: input.value,
    price: parseFloat(input.dataset.price) || 0,
  }));
}

function updateContinueStep3State() {
  const btn = document.getElementById("continueStep3");
  if (!btn) return;
  btn.disabled = state.software.length === 0;
}

// ---------- ANALYSIS / RESULTS ----------
function runAnalysis() {
  const totalCameras = state.standardCameras + state.smartCameras;
  const monthlySoftwareTotal =
    state.software.reduce((sum, s) => sum + s.price, 0) * totalCameras;

  updateCompatibilitySummary();
  updateRecommendedSetup(monthlySoftwareTotal);
  updateCostComparison();
  updateSavingsCard();

  resultsSection?.classList.add("active");
  resultsSection?.scrollIntoView({ behavior: "smooth" });
}

function updateCompatibilitySummary() {
  const el = document.getElementById("compatibilityContent");
  if (!el) return;

  let text = "";

  if (state.cameraType === "ip" && state.ownership === "purchased") {
    text =
      "✓ Cameras can be reused. Recommended approach: Keep your existing IP cameras and integrate them with Sighthound's compute nodes. Your existing cameras will work with our system, saving you significant hardware costs.";
  } else if (state.cameraType === "ip") {
    text =
      `⚠ Camera replacement recommended. Recommended approach: Replace with standard IP cameras ($${PRICES.standardCamera.toLocaleString()} each) or upgrade to Sighthound Smart Cameras. New IP cameras provide better compatibility and reliability with our analytics platform.`;
  } else {
    text =
      `✕ New cameras required. Recommended approach: Install Sighthound Smart Cameras ($${PRICES.smartCamera.toLocaleString()} each) for built-in edge processing. Our smart cameras include built-in analytics for maximum performance and reliability.`;
  }

  el.textContent = text;
}

function updateRecommendedSetup(monthlySoftwareTotal) {
  const container = document.getElementById("setupGrid");
  if (!container) return;

  const fmt = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  const totalCameras = state.standardCameras + state.smartCameras;
  const hardwareStandard = state.standardCameras * PRICES.standardCamera;
  const hardwareSmart = state.smartCameras * PRICES.smartCamera;
  const hardwareNodes = state.computeNodes * PRICES.node;
  const hardwareTotal = hardwareStandard + hardwareSmart + hardwareNodes;

  const parts = [];

  if (state.standardCameras > 0) {
    parts.push(
      `${state.standardCameras} × Standard IP camera${state.standardCameras > 1 ? "s" : ""} (${fmt.format(hardwareStandard)})`
    );
  }
  if (state.smartCameras > 0) {
    parts.push(
      `${state.smartCameras} × Sighthound Smart camera${state.smartCameras > 1 ? "s" : ""} (${fmt.format(hardwareSmart)})`
    );
  }
  if (state.computeNodes > 0) {
    parts.push(
      `${state.computeNodes} × Compute node${state.computeNodes > 1 ? "s" : ""} (${state.computeNodes * CAMERAS_PER_NODE} camera capacity) (${fmt.format(hardwareNodes)})`
    );
  }

  const softwareLine =
    totalCameras > 0 && state.software.length > 0
      ? `${state.software
          .map((s) => `${s.type.toUpperCase()} (${fmt.format(s.price)}/stream/mo)`)
          .join(", ")} → ${fmt.format(monthlySoftwareTotal)}/month total`
      : totalCameras === 0
      ? "No cameras configured"
      : "No software selected ($0/month)";

  container.textContent = `Hardware: ${parts.length ? parts.join(" • ") : "No hardware configured"} | Total hardware: ${fmt.format(
    hardwareTotal
  )} | Software: ${softwareLine}`;
}

function updateCostComparison() {
  const el = document.getElementById("costComparison");
  if (!el) return;

  const fmt = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  const totalCameras = state.standardCameras + state.smartCameras;
  const monthlySoftwareTotal =
    state.software.reduce((sum, s) => sum + s.price, 0) * totalCameras;

  const hardwareStandard = state.standardCameras * PRICES.standardCamera;
  const hardwareSmart = state.smartCameras * PRICES.smartCamera;
  const hardwareNodes = state.computeNodes * PRICES.node;
  const hardwareTotal = hardwareStandard + hardwareSmart + hardwareNodes;

  const sighthoundTotal = hardwareTotal + monthlySoftwareTotal * state.timeframe;

  const currentMonthlyNormalized =
    state.frequency === "annual" ? state.currentMonthly / 12 : state.currentMonthly;

  const currentTotal = state.currentUpfront + currentMonthlyNormalized * state.timeframe;

  el.textContent =
    `Current Setup — Upfront: ${fmt.format(state.currentUpfront)}, ` +
    `Software (${state.timeframe} mo): ${fmt.format(currentMonthlyNormalized * state.timeframe)}, ` +
    `Total: ${fmt.format(currentTotal)} | ` +
    `Sighthound — Hardware: ${fmt.format(hardwareTotal)}, ` +
    `Software (${state.timeframe} mo): ${fmt.format(monthlySoftwareTotal * state.timeframe)}, ` +
    `Total: ${fmt.format(sighthoundTotal)}`;
}

function updateSavingsCard() {
  const el = document.getElementById("savingsCard");
  if (!el) return;

  const fmt = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  const totalCameras = state.standardCameras + state.smartCameras;
  const monthlySoftwareTotal =
    state.software.reduce((sum, s) => sum + s.price, 0) * totalCameras;

  const hardwareStandard = state.standardCameras * PRICES.standardCamera;
  const hardwareSmart = state.smartCameras * PRICES.smartCamera;
  const hardwareNodes = state.computeNodes * PRICES.node;
  const hardwareTotal = hardwareStandard + hardwareSmart + hardwareNodes;

  const sighthoundTotal = hardwareTotal + monthlySoftwareTotal * state.timeframe;

  const currentMonthlyNormalized =
    state.frequency === "annual" ? state.currentMonthly / 12 : state.currentMonthly;

  const currentTotal = state.currentUpfront + currentMonthlyNormalized * state.timeframe;

  const savings = currentTotal - sighthoundTotal;
  const savingsPerMonth = savings / state.timeframe;

  if (savings > 0) {
    el.className = "savings-card";
    el.textContent =
      `You save ${fmt.format(savings)} over ${state.timeframe} months ` +
      `(${fmt.format(savingsPerMonth)}/month less than your current provider).`;
  } else {
    el.className = "savings-card neutral";
    el.textContent =
      `Additional investment of ${fmt.format(Math.abs(savings))} over ${state.timeframe} months. ` +
      `This includes upgraded hardware and enterprise-grade analytics.`;
  }
}
