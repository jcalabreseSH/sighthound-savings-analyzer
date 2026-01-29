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

document.addEventListener("DOMContentLoaded", () => {
  attachEventHandlers();
  updateCamerasAndNodes();
});

function attachEventHandlers() {
  // Scroll to calculator
  document.getElementById("startAnalysis")?.addEventListener("click", () => {
    calculatorSection?.scrollIntoView({ behavior: "smooth" });
  });

  // Step 1: camera type
  document.querySelectorAll("#step1 .option-card").forEach((btn) => {
    btn.addEventListener("click", () => {
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
    btn.addEventListener("click", () => {
      state.ownership = btn.dataset.value || "";
      selectOptionCard(btn);
      goToStep(2);
    });
  });

  // Standard cameras steppers and input
  document.querySelectorAll('[data-target="standardCameras"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      const input = document.getElementById("standardCameras");
      if (!input) return;
      const current = parseInt(input.value, 10) || 0;
      if (btn.dataset.action === "increase") {
        input.value = String(current + 1);
      } else if (btn.dataset.action === "decrease" && current > 0) {
        input.value = String(current - 1);
      }
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
    btn.addEventListener("click", () => {
      const input = document.getElementById("smartCameras");
      if (!input) return;
      const current = parseInt(input.value, 10) || 0;
      if (btn.dataset.action === "increase") {
        input.value = String(current + 1);
      } else if (btn.dataset.action === "decrease" && current > 0) {
        input.value = String(current - 1);
      }
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
    btn.addEventListener("click", () => {
      if (state.autoAddNodes) return;
      const input = document.getElementById("computeNodes");
      if (!input) return;
      const current = parseInt(input.value, 10) || 0;
      if (btn.dataset.action === "increase") {
        input.value = String(current + 1);
      } else if (btn.dataset.action === "decrease" && current > 0) {
        input.value = String(current - 1);
      }
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
  document.getElementById("continueStep2")?.addEventListener("click", () => {
    goToStep(3);
  });

  // Step 3 software checkboxes
  document
    .querySelectorAll('#step3 input[name="software"]')
    .forEach((input) => {
      input.addEventListener("change", () => {
        updateSelectedSoftware();
        updateContinueStep3State();
      });
    });

  document.getElementById("continueStep3")?.addEventListener("click", () => {
    goToStep(4);
  });

  // Current cost inputs
  document.getElementById("currentMonthly")?.addEventListener("input", (ev) => {
    state.currentMonthly = parseFloat(ev.target.value) || 0;
  });

  document.getElementById("currentUpfront")?.addEventListener("input", (ev) => {
    state.currentUpfront = parseFloat(ev.target.value) || 0;
  });

  document
    .querySelectorAll('input[name="frequency"]')
    .forEach((input) => {
      input.addEventListener("change", (ev) => {
        state.frequency = ev.target.value === "annual" ? "annual" : "monthly";
      });
    });

  document.getElementById("continueStep4")?.addEventListener("click", () => {
    goToStep(5);
  });

  // Calculate
  document.getElementById("calculateButton")?.addEventListener("click", () => {
    runAnalysis();
  });

  // Edit answers
  document.getElementById("editAnswers")?.addEventListener("click", () => {
    goToStep(1);
    resultsSection?.classList.remove("active");
    calculatorSection?.scrollIntoView({ behavior: "smooth" });
  });

  // Start over
  document.getElementById("startOver")?.addEventListener("click", () => {
    window.location.reload();
  });

  // Timeframe buttons
  document.querySelectorAll(".timeframe-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".timeframe-btn").forEach((b) =>
        b.classList.remove("active")
      );
      btn.classList.add("active");
      const months = parseInt(btn.dataset.months, 10) || 12;
      state.timeframe = months;
      updateCostComparison();
      updateSavingsCard();
    });
  });
}

function updateCamerasAndNodes() {
  const totalCameras = state.standardCameras + state.smartCameras;
  const suggestedNodes = totalCameras > 0 ? Math.ceil(totalCameras / CAMERAS_PER_NODE) : 0;
  const totalDisplay = document.getElementById("totalCamerasDisplay");
  if (totalDisplay) {
    totalDisplay.textContent = String(totalCameras);
  }

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

function selectOptionCard(btn) {
  const parent = btn.parentElement;
  if (!parent) return;
  parent.querySelectorAll(".option-card").forEach((el) => {
    el.classList.remove("selected");
  });
  btn.classList.add("selected");
}

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

function goToStep(step) {
  document.querySelectorAll(".step").forEach((el) => el.classList.remove("active"));

  const stepId = typeof step === "string" ? `step${step}` : `step${step}`;
  const stepElement = document.getElementById(stepId);
  if (stepElement) {
    stepElement.classList.add("active");
  }

  const totalSteps = 5;
  let numericStep;
  if (step === "1b") {
    numericStep = 1;
  } else {
    numericStep = typeof step === "number" ? step : parseInt(step, 10) || 1;
  }

  const progress = (numericStep / totalSteps) * 100;
  if (progressFill) progressFill.style.width = `${progress}%`;
  if (progressText) progressText.textContent = `Step ${numericStep} of ${totalSteps}`;

  state.step = step;
}

function runAnalysis() {
  const totalCameras = state.standardCameras + state.smartCameras;
  const monthlySoftwareTotal =
    state.software.reduce((sum, s) => sum + s.price, 0) * totalCameras;

  updateCompatibilitySummary();
  updateRecommendedSetup(monthlySoftwareTotal);
  updateCostComparison();
  updateSavingsCard();

  if (resultsSection) {
    resultsSection.classList.add("active");
    resultsSection.scrollIntoView({ behavior: "smooth" });
  }
}

function updateCompatibilitySummary() {
  const el = document.getElementById("compatibilityContent");
  if (!el) return;

  let html = "";
  if (state.cameraType === "ip" && state.ownership === "purchased") {
    html =
      "✓ Cameras can be reused. Recommended approach: Keep your existing IP cameras and integrate them with Sighthound's compute nodes. Your existing cameras will work with our system, saving you significant hardware costs.";
  } else if (state.cameraType === "ip") {
    html =
      `⚠ Camera replacement recommended. Recommended approach: Replace with standard IP cameras ($${PRICES.standardCamera.toLocaleString()} each) or upgrade to Sighthound Smart Cameras. New IP cameras provide better compatibility and reliability with our analytics platform.`;
  } else {
    html =
      `✕ New cameras required. Recommended approach: Install Sighthound Smart Cameras ($${PRICES.smartCamera.toLocaleString()} each) for built-in edge processing. Our smart cameras include built-in analytics for maximum performance and reliability.`;
  }

  el.textContent = "";
  el.innerText = html;
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

  let hardwareText = "";
  if (state.standardCameras > 0) {
    hardwareText += ` ${state.standardCameras} × Standard IP camera${
      state.standardCameras > 1 ? "s" : ""
    } ${fmt.format(hardwareStandard)} `;
  }
  if (state.smartCameras > 0) {
    hardwareText += ` ${state.smartCameras} × Sighthound Smart camera${
      state.smartCameras > 1 ? "s" : ""
    } ${fmt.format(hardwareSmart)} `;
  }
  if (state.computeNodes > 0) {
    hardwareText += ` ${state.computeNodes} × Compute node${
      state.computeNodes > 1 ? "s" : ""
    } (${state.computeNodes * CAMERAS_PER_NODE} camera capacity) ${fmt.format(
      hardwareNodes
    )} `;
  }

  let softwareText = "";
  if (totalCameras > 0 && state.software.length > 0) {
    softwareText = state.software
      .map((s) => {
        return ` ${s.type.toUpperCase()} (${totalCameras} camera${
          totalCameras > 1 ? "s" : ""
        }) ${fmt.format(s.price * totalCameras)}/month `;
      })
      .join("");
    softwareText += ` Total software ${fmt.format(monthlySoftwareTotal)}/month `;
  } else if (totalCameras === 0) {
    softwareText = " No cameras configured — ";
  } else {
    softwareText = " No software selected $0/month ";
  }

  container.innerText = `Hardware ${hardwareText || " No hardware configured — "} Total hardware ${fmt.format(
    hardwareTotal
  )} Software ${softwareText}`;
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
  const currentTotal =
    state.currentUpfront + currentMonthlyNormalized * state.timeframe;

  el.innerText = `Current Setup Upfront hardware ${fmt.format(
    state.currentUpfront
  )} Software (${state.timeframe} months) ${fmt.format(
    currentMonthlyNormalized * state.timeframe
  )} Total ${fmt.format(currentTotal)} Sighthound Setup Hardware (one-time) ${fmt.format(
    hardwareTotal
  )} Software (${state.timeframe} months) ${fmt.format(
    monthlySoftwareTotal * state.timeframe
  )} Total ${fmt.format(sighthoundTotal)}`;
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
  const currentTotal =
    state.currentUpfront + currentMonthlyNormalized * state.timeframe;

  const savings = currentTotal - sighthoundTotal;
  const savingsPerMonth = savings / state.timeframe;

  if (savings > 0) {
    el.className = "savings-card";
    el.innerText = `${fmt.format(savings)} You save ${fmt.format(
      savings
    )} over ${state.timeframe} months That's ${fmt.format(
      savingsPerMonth
    )}/month less than your current provider.`;
  } else {
    el.className = "savings-card neutral";
    el.innerText = `${fmt.format(Math.abs(savings))} Additional investment over ${
      state.timeframe
    } months This investment includes superior hardware and enterprise-grade analytics.`;
  }
}
