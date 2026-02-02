// Local, readable implementation of the Sighthound Savings Analyzer logic

const state = {
  step: 1,
  cameraType: "",
  ownership: "",
  standardCameras: 8,
  smartCameras: 0,
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

  // Signal to external test harnesses that initialization completed
  try { window.__savings_init_done = true; } catch (e) {}
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

    if (btn.id === "skipStep3") {
      e.preventDefault();
      // Clear any selected software and advance — software is optional
      console.log('[savings] skipStep3 clicked: clearing software and advancing');
      document.querySelectorAll('#step3 input[name="software"]').forEach((input) => {
        input.checked = false;
      });
      state.software = [];
      updateContinueStep3State();
      goToStep(4);
      return;
    }

    if (btn.id === "continueStep4") {
      e.preventDefault();
      goToStep(5);
      return;
    }

    // Back buttons (allow going back to previous steps to edit responses)
    if (btn.id === "backStep1b") {
      e.preventDefault();
      goToStep(1);
      return;
    }

    if (btn.id === "backStep2") {
      e.preventDefault();
      // If user came from 1b (IP cameras), return there; otherwise go to step 1
      if (state.cameraType === "ip") goToStep("1b");
      else goToStep(1);
      return;
    }

    if (btn.id === "backStep3") {
      e.preventDefault();
      goToStep(2);
      return;
    }

    if (btn.id === "backStep4") {
      e.preventDefault();
      goToStep(3);
      return;
    }

    if (btn.id === "backStep5") {
      e.preventDefault();
      goToStep(4);
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
  const step1Options = document.querySelectorAll("#step1 .option-card");
  console.log(`[savings] step1 option count: ${step1Options.length}`);
  step1Options.forEach((btn, idx) => {
    console.log(`[savings] attaching step1 option handler #${idx} dataset=${btn.dataset.value}`);
    btn.addEventListener("click", (e) => {
      console.log(`[savings] step1 option clicked dataset=${btn.dataset.value}`);
      e.preventDefault();
      state.cameraType = btn.dataset.value || "";
      selectOptionCard(btn);
      console.log(`[savings] cameraType set to ${state.cameraType}`);

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

  // Email PDF modal open/close
  onClick("emailPdfButton", () => {
    const modal = document.getElementById("emailModal");
    const summaryField = document.getElementById("hardwareEstimateSummary");
    if (summaryField) {
      summaryField.value = String(window.__HARDWARE_ESTIMATE_SUMMARY__ || "");
    }
    if (modal) {
      modal.classList.add("active");
      modal.setAttribute("aria-hidden", "false");
    }
  });

  onClick("emailModalClose", () => {
    const modal = document.getElementById("emailModal");
    if (modal) {
      modal.classList.remove("active");
      modal.setAttribute("aria-hidden", "true");
    }
  });

  const emailModal = document.getElementById("emailModal");
  emailModal?.addEventListener("click", (e) => {
    if (e.target === emailModal) {
      emailModal.classList.remove("active");
      emailModal.setAttribute("aria-hidden", "true");
    }
  });

  // Custom HubSpot form submission from popup
  const emailForm = document.getElementById("emailEstimateForm");
  emailForm?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formEl = e.currentTarget;
    const portalId = formEl.dataset.portalId;
    const formId = formEl.dataset.formId;

    const firstname = formEl.querySelector("#emailFirstName")?.value.trim() || "";
    const lastname = formEl.querySelector("#emailLastName")?.value.trim() || "";
    const email = formEl.querySelector("#emailAddress")?.value.trim() || "";
    const summary = formEl.querySelector("#hardwareEstimateSummary")?.value.trim() || "";

    const payload = {
      fields: [
        { name: "firstname", value: firstname },
        { name: "lastname", value: lastname },
        { name: "email", value: email },
        { name: "hardware_estimate_summary", value: summary },
      ],
      context: {
        pageUri: window.location.href,
        pageName: document.title,
      },
    };

    try {
      const resp = await fetch(
        `https://api.hsforms.com/submissions/v3/integration/submit/${portalId}/${formId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      if (resp.ok) {
        formEl.reset();
        const modal = document.getElementById("emailModal");
        modal?.classList.remove("active");
        modal?.setAttribute("aria-hidden", "true");
        alert("Thanks! We'll email you this analysis shortly.");
      } else {
        console.error("HubSpot form submission failed", await resp.text());
        alert("Something went wrong submitting the form. Please try again.");
      }
    } catch (err) {
      console.error("HubSpot form submission error", err);
      alert("Something went wrong submitting the form. Please try again.");
    }
  });
}

// Download PDF
onClick("downloadPdf", () => {
  generatePDF();
});

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
  console.log(`[savings] goToStep called with step=${step}`);
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

  updateRecommendedSetup(monthlySoftwareTotal);
  updateCostComparison();
  updateSavingsCard();

  resultsSection?.classList.add("active");
  resultsSection?.scrollIntoView({ behavior: "smooth" });
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

  container.innerHTML = `
    <div>${parts.length ? parts.join('<br>') : "No hardware configured"}</div>
    <div>Total hardware: ${fmt.format(hardwareTotal)}</div>
    <div>Software: ${softwareLine}</div>
  `;
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

  el.innerHTML = `
    <div>Current Setup — Upfront: ${fmt.format(state.currentUpfront)} <br>Software (${state.timeframe} mo): ${fmt.format(currentMonthlyNormalized * state.timeframe)}<br><br> <b>Total:</b> ${fmt.format(currentTotal)}</div>
    <div>Sighthound — Hardware: ${fmt.format(hardwareTotal)}<br>Software (${state.timeframe} mo): ${fmt.format(monthlySoftwareTotal * state.timeframe)}<br><br> <b>Total:</b> ${fmt.format(sighthoundTotal)}</div>
  `;

  // Also surface a plain-text summary for the custom HubSpot popup form
  const setupParts = [];
  if (state.standardCameras > 0) {
    setupParts.push(
      `${state.standardCameras} Standard IP camera${
        state.standardCameras === 1 ? "" : "s"
      }`
    );
  }
  if (state.smartCameras > 0) {
    setupParts.push(
      `${state.smartCameras} Sighthound Smart camera${
        state.smartCameras === 1 ? "" : "s"
      }`
    );
  }
  if (state.computeNodes > 0) {
    setupParts.push(
      `${state.computeNodes} Compute node${
        state.computeNodes === 1 ? "" : "s"
      }`
    );
  }
  const setupLine =
    setupParts.length > 0 ? `Setup: ${setupParts.join(", " )}. ` : "";

  const summaryLines = [
    `Cost comparison over ${state.timeframe} months.`,
    setupLine ? setupLine.trim() : "",
    `Current setup — upfront ${fmt.format(state.currentUpfront)},`,
    `software ${fmt.format(currentMonthlyNormalized * state.timeframe)},`,
    `total ${fmt.format(currentTotal)}.`,
    `Sighthound — hardware ${fmt.format(hardwareTotal)},`,
    `software ${fmt.format(monthlySoftwareTotal * state.timeframe)},`,
    `total ${fmt.format(sighthoundTotal)}.`,
  ].filter(Boolean);

  const summary = summaryLines.join("\n");

  try {
    window.__HARDWARE_ESTIMATE_SUMMARY__ = summary;
  } catch (e) {
    // ignore if window is not available (e.g. during server-side rendering)
  }
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

// ---------- PDF EXPORT ----------
async function generatePDF() {
  function findJsPDF() {
    if (window.jspdf && window.jspdf.jsPDF) return window.jspdf.jsPDF;
    if (window.jsPDF) return window.jsPDF;
    return null;
  }

  function loadJsPDF() {
    return new Promise((resolve, reject) => {
      const existing = findJsPDF();
      if (existing) return resolve(existing);

      const url = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
      const s = document.createElement("script");
      s.src = url;
      s.async = true;
      s.onload = () => {
        const found = findJsPDF();
        if (found) return resolve(found);
        return reject(new Error("jsPDF loaded but global not found"));
      };
      s.onerror = (e) => reject(e || new Error("Failed to load jsPDF"));
      document.head.appendChild(s);
    });
  }

  // Helper: load logo image and convert to data URL for jsPDF
  function loadLogoAsDataUrl(src) {
    return new Promise((resolve, reject) => {
      try {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          try {
            const canvas = document.createElement("canvas");
            canvas.width = img.naturalWidth || img.width;
            canvas.height = img.naturalHeight || img.height;
            const ctx = canvas.getContext("2d");
            if (!ctx) {
              return reject(new Error("canvas context not available"));
            }
            ctx.drawImage(img, 0, 0);
            const dataUrl = canvas.toDataURL("image/png");
            resolve(dataUrl);
          } catch (err) {
            reject(err);
          }
        };
        img.onerror = (err) => reject(err || new Error("Failed to load logo image"));
        img.src = src;
      } catch (e) {
        reject(e);
      }
    });
  }

  const jsPDFCtor = findJsPDF() || await loadJsPDF();
  const jsPDF = jsPDFCtor;
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  // Try to place Sighthound logo in the top-right corner of the page
  // This is best-effort only; if the image can't be loaded we silently skip it.
  try {
    const logoDataUrl = await loadLogoAsDataUrl("./assets/sighthound-logo-black.png");
    const logoWidth = 40; // mm
    const logoHeight = 10; // mm, approximate aspect ratio
    const logoX = pageWidth - margin - logoWidth;
    const logoY = margin - 6; // slightly above title
    doc.addImage(logoDataUrl, "PNG", logoX, logoY, logoWidth, logoHeight);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("[savings] PDF logo not added", e);
  }

  let y = 20;

  const fmt = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  // Recompute numeric breakdowns (same logic used in UI)
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
  const savingsPerMonth = savings / (state.timeframe || 1);

  // Helpers for card-style layout
  function drawCard(title, lines, accentColor) {
    const cardPadding = 4;
    const innerWidth = contentWidth - cardPadding * 2;

    const wrappedLines = lines.flatMap((line) =>
      doc.splitTextToSize(line, innerWidth)
    );

    const lineHeight = 4.2;
    const minHeight = 16;
    const contentHeight = wrappedLines.length * lineHeight + 6;
    const cardHeight = Math.max(minHeight, contentHeight + cardPadding * 2);
    const x = margin;
    const top = y;

    // Card background & border
    doc.setDrawColor(230, 232, 240);
    doc.setFillColor(248, 249, 252);
    doc.roundedRect(x, top, contentWidth, cardHeight, 2, 2, "FD");

    // Accent bar on the left
    const [r, g, b] = accentColor;
    doc.setFillColor(r, g, b);
    doc.rect(x, top, 1.8, cardHeight, "F");

    // Title
    doc.setTextColor(17, 24, 39);
    doc.setFontSize(12);
    doc.text(title, x + cardPadding + 2, top + 6);

    // Body
    doc.setFontSize(10);
    doc.setTextColor(75, 85, 99);
    let textY = top + 11;
    wrappedLines.forEach((line) => {
      doc.text(line, x + cardPadding + 2, textY);
      textY += lineHeight;
    });

    y = top + cardHeight + 5;
  }

  // Title & subtitle
  doc.setFontSize(18);
  doc.setTextColor(17, 24, 39);
  doc.text("Sighthound Savings Summary", margin, y);
  y += 8;

  doc.setFontSize(11);
  doc.setTextColor(107, 114, 128);
  const subtitleParts = [];
  if (totalCameras > 0) {
    subtitleParts.push(
      `${totalCameras} camera${totalCameras === 1 ? "" : "s"}`
    );
  }
  subtitleParts.push(`${state.timeframe} month analysis`);
  doc.text(subtitleParts.join(" • "), margin, y);
  y += 8;

  // Card 1: Savings summary (primary highlight)
  if (savings > 0) {
    drawCard(
      "Your savings at a glance",
      [
        `Net savings over ${state.timeframe} months: ${fmt.format(savings)}.`,
        `Average monthly impact: ${fmt.format(savingsPerMonth)} less than today.`,
      ],
      [34, 197, 94] // bright green accent
    );
  } else if (savings < 0) {
    drawCard(
      "Additional investment",
      [
        `Additional investment over ${state.timeframe} months: ${fmt.format(Math.abs(savings))}.`,
        "Reflects upgraded cameras, compute, and analytics versus your current setup.",
      ],
      [239, 68, 68] // red accent
    );
  } else {
    drawCard(
      "Neutral comparison",
      [
        "Your projected Sighthound costs are roughly in line with what you pay today.",
        "Adjust camera counts, analytics selection, or timeframe to explore different scenarios.",
      ],
      [107, 114, 128] // neutral gray accent
    );
  }

  // Card 2: Cost breakdown (mirrors on-screen calculator layout)
  const breakdownLines = [];

  // Hardware lines like the UI: per-component plus total
  if (state.standardCameras > 0) {
    breakdownLines.push(
      `${state.standardCameras} × Standard IP camera${
        state.standardCameras > 1 ? "s" : ""
      } (${fmt.format(hardwareStandard)})`
    );
  }
  if (state.smartCameras > 0) {
    breakdownLines.push(
      `${state.smartCameras} × Sighthound Smart camera${
        state.smartCameras > 1 ? "s" : ""
      } (${fmt.format(hardwareSmart)})`
    );
  }
  if (state.computeNodes > 0) {
    breakdownLines.push(
      `${state.computeNodes} × Compute node${
        state.computeNodes > 1 ? "s" : ""
      } (${state.computeNodes * CAMERAS_PER_NODE} camera capacity) (${fmt.format(
        hardwareNodes
      )})`
    );
  }

  breakdownLines.push(`Total hardware: ${fmt.format(hardwareTotal)}`);

  // Software line: selected analytics and monthly total
  const softwareLinePdf =
    totalCameras > 0 && state.software.length > 0
      ? `Software: ${state.software
          .map((s) => `${s.type.toUpperCase()} (${fmt.format(s.price)}/stream/mo)`)
          .join(", ")} -> ${fmt.format(monthlySoftwareTotal)}/month total`
      : totalCameras === 0
      ? "Software: No cameras configured"
      : "Software: No software selected ($0/month)";

  breakdownLines.push(softwareLinePdf);
  breakdownLines.push("");

  // Side-by-side style totals for the selected timeframe (no 12/24/36 toggle)
  breakdownLines.push(
    `Current Setup — Upfront: ${fmt.format(state.currentUpfront)}, Software (${state.timeframe} mo): ${fmt.format(
      currentMonthlyNormalized * state.timeframe
    )}, Total: ${fmt.format(currentTotal)}`
  );
  breakdownLines.push(
    `Sighthound — Hardware: ${fmt.format(hardwareTotal)}, Software (${state.timeframe} mo): ${fmt.format(
      monthlySoftwareTotal * state.timeframe
    )}, Total: ${fmt.format(sighthoundTotal)}`
  );

  drawCard("Cost breakdown", breakdownLines, [16, 185, 129]);

  // Card 3: Configuration snapshot
  drawCard(
    "Configuration snapshot",
    [
      `Camera type: ${state.cameraType || "Not specified"}`,
      `Ownership: ${state.ownership || "Not specified"}`,
      `Standard IP cameras: ${state.standardCameras}`,
      `Smart cameras: ${state.smartCameras}`,
      `Compute nodes: ${state.computeNodes} (up to ${
        state.computeNodes * CAMERAS_PER_NODE || 0
      } cameras total capacity)`,
    ],
    [59, 130, 246]
  );

  // Card 4: What each component does
  drawCard(
    "What each component does",
    [
      "Standard IP cameras – traditional network cameras that provide general coverage across your site.",
      "Sighthound Smart cameras – AI-ready cameras with advanced on-device analytics for higher-value streams.",
      "Compute nodes – small servers that aggregate multiple camera feeds (up to 4 per node) and run Sighthound analytics.",
    ],
    [79, 70, 229]
  );

  doc.save("savings-analysis.pdf");
}
