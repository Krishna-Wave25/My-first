/* ============================================================
 * dashboard.js — Live microgrid dashboard renderer
 * ------------------------------------------------------------
 * Consumes the SGSim simulation engine (js/sim.js) as its single
 * source of truth:
 *   - KPIs, animated energy flow, MQTT console
 *   - live telemetry mini-charts, battery & load doughnuts
 *   - fault detection center with severity table
 *   - AI weather-based generation forecast
 * Charts are theme-aware and re-colour on `theme:change`.
 * ============================================================ */
(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const rand = (min, max) => min + Math.random() * (max - min);

  /* Stateful chart registry for theme refreshes */
  const charts = [];
  let powerChart, battChart, loadChart, battCenter;

  /* ------------------------- Chart plumbing ------------------------- */
  function chartDefaults() {
    const t = window.chartTheme ? chartTheme() : { text: "#8f9cc4", grid: "rgba(255,255,255,0.06)" };
    Chart.defaults.color = t.text;
    Chart.defaults.font.family = "JetBrains Mono, monospace";
    Chart.defaults.font.size = 11;
    Chart.defaults.borderColor = "rgba(255,255,255,0.06)";
    Chart.defaults.plugins.legend.labels.usePointStyle = true;
    return t;
  }
  function refreshCharts() {
    const t = chartDefaults();
    charts.forEach((c) => {
      c.options.scales.x.ticks.color = t.text;
      c.options.scales.y.ticks.color = t.text;
      c.options.scales.y.grid.color = t.grid;
      c.update();
    });
  }

  /* ------------------------- Power / load line ------------------------- */
  function buildPowerChart() {
    const hist = { labels: [], power: [], load: [], pred: [] };
    for (let i = 0; i < 40; i++) hist.labels.push("");

    powerChart = new Chart($("powerChart"), {
      type: "line",
      data: {
        labels: hist.labels,
        datasets: [
          {
            label: "Solar Power (W)", data: hist.power, borderColor: "#ffc800",
            backgroundColor: (ctx) => {
              const g = ctx.chart.ctx.createLinearGradient(0, 0, 0, 300);
              g.addColorStop(0, "rgba(255,200,0,0.25)"); g.addColorStop(1, "rgba(255,200,0,0)");
              return g;
            },
            fill: true, tension: 0.4, borderWidth: 2.5, pointRadius: 0,
          },
          {
            label: "Load (W)", data: hist.load, borderColor: "#00e5ff",
            backgroundColor: "transparent", tension: 0.4, borderWidth: 2, borderDash: [6, 4], pointRadius: 0,
          },
          {
            label: "AI Forecast (W)", data: hist.pred, borderColor: "#00e676",
            backgroundColor: "transparent", tension: 0.4, borderWidth: 1.6, borderDash: [2, 4], pointRadius: 0,
          },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        animation: { duration: 350 },
        scales: {
          x: { grid: { display: false }, ticks: { maxTicksLimit: 8 } },
          y: { grid: { color: "rgba(255,255,255,0.05)" }, beginAtZero: true },
        },
        plugins: { legend: { position: "top", align: "end" } },
      },
    });
    charts.push(powerChart);
    return hist;
  }

  /* ------------------------- Battery doughnut ------------------------- */
  function buildBattChart(initial) {
    battChart = new Chart($("battChart"), {
      type: "doughnut",
      data: {
        labels: ["Charge", "Remaining"],
        datasets: [{ data: [initial, 100 - initial], backgroundColor: ["#00e5ff", "rgba(255,255,255,0.06)"], borderWidth: 0, hoverOffset: 6 }],
      },
      options: { responsive: true, maintainAspectRatio: false, cutout: "72%", plugins: { legend: { display: false } } },
    });
    charts.push(battChart);

    /* centre label */
    battCenter = document.createElement("div");
    battCenter.style.cssText = "position:absolute;inset:0;display:grid;place-items:center;pointer-events:none;flex-direction:column";
    battCenter.innerHTML = `<div style="font-family:var(--font-mono);font-weight:700;font-size:30px;color:var(--white)">${initial}%</div>
      <div style="font-size:11px;color:var(--slate-500);letter-spacing:.1em;text-transform:uppercase">Battery SOC</div>`;
    $("battChart").parentElement.appendChild(battCenter);
  }

  /* ------------------------- Load distribution ------------------------- */
  function buildLoadChart() {
    loadChart = new Chart($("loadChart"), {
      type: "doughnut",
      data: {
        labels: ["Lighting", "Pump", "Cooling", "Backup"],
        datasets: [{ data: [120, 280, 140, 0], backgroundColor: ["#ffc800", "#00e5ff", "#00e676", "#8f9cc4"], borderWidth: 2, borderColor: "#0a1128", hoverOffset: 6 }],
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: "62%",
        plugins: { legend: { position: "bottom", labels: { padding: 14, usePointStyle: true, boxWidth: 8 } } },
      },
    });
    charts.push(loadChart);
  }

  /* ------------------------- Telemetry mini-charts ------------------------- */
  const TELEMETRY = [
    { key: "v", label: "Voltage", unit: "V", color: "#ffc800", sim: (s) => s.v },
    { key: "a", label: "Current", unit: "A", color: "#00e5ff", sim: (s) => s.a },
    { key: "power", label: "Power", unit: "W", color: "#ffab2e", sim: (s) => s.power },
    { key: "batt", label: "Battery", unit: "%", color: "#00e5ff", sim: (s) => s.batt },
    { key: "temp", label: "Temperature", unit: "°C", color: "#ff4d6d", sim: (s) => s.temp },
    { key: "eff", label: "Efficiency", unit: "%", color: "#00e676", sim: (s) => s.eff },
  ];

  function buildTelemetry() {
    const grid = $("teleGrid");
    if (!grid) return;
    grid.innerHTML = TELEMETRY.map((t) => `
      <div class="tele-card">
        <div class="t-head">
          <span class="k"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19V9M10 19V5M16 19v-6M22 19H2"/></svg> ${t.label}</span>
          <span class="t-val" id="tv-${t.key}">-- <small>${t.unit}</small></span>
        </div>
        <div class="t-chart"><canvas id="tc-${t.key}"></canvas></div>
      </div>`).join("");

    TELEMETRY.forEach((t) => {
      const canvas = document.getElementById("tc-" + t.key);
      const pts = new Array(30).fill(0);
      const c = new Chart(canvas, {
        type: "line",
        data: {
          labels: new Array(30).fill(""),
          datasets: [{ data: pts, borderColor: t.color, backgroundColor: "transparent", tension: 0.4, borderWidth: 1.8, pointRadius: 0 }],
        },
        options: {
          responsive: true, maintainAspectRatio: false, animation: false,
          scales: { x: { display: false, grid: { display: false } }, y: { display: false, grid: { display: false } } },
          plugins: { legend: { display: false }, tooltip: { enabled: false } },
        },
      });
      t.pts = pts; t.chart = c;
    });
  }

  function pushTelemetry(sim) {
    const { history } = sim.getState();
    TELEMETRY.forEach((t) => {
      const arr = history[t.key] || [];
      const valEl = document.getElementById("tv-" + t.key);
      if (valEl && arr.length) valEl.innerHTML = arr[arr.length - 1].toFixed(1) + ` <small>${t.unit}</small>`;
      const pts = t.pts;
      pts.shift();
      pts.push(arr.length ? arr[arr.length - 1] : 0);
      t.chart.update();
    });
  }

  /* ------------------------- Clock ------------------------- */
  function startClock() {
    setInterval(() => {
      const d = new Date();
      $("clockChip").textContent = "SYNCED " + [d.getHours(), d.getMinutes(), d.getSeconds()].map((n) => String(n).padStart(2, "0")).join(":");
    }, 1000);
  }

  /* ------------------------- MQTT console ------------------------- */
  function pushMqtt(entry) {
    const log = $("mqttLog");
    if (!log) return;
    const row = document.createElement("div");
    row.className = "mqtt-row" + (entry.dir === "pub" ? " out" : "");
    const dir = entry.dir === "pub" ? "&darr;" : "&uarr;";
    row.innerHTML = `<span class="dir">${dir}</span><span class="topic">${entry.topic}</span><span class="payload">${entry.payload}</span>`;
    log.prepend(row);
    while (log.children.length > 24) log.removeChild(log.lastChild);
  }

  function fillTopics() {
    const el = $("mqttTopics");
    if (!el) return;
    el.innerHTML = Object.values(window.SGSim.TOPICS).map((t) =>
      `<span class="topic-tag">${t.replace("solargrid/", "<span class='sub'>solargrid/</span>")}</span>`).join("");
  }

  /* ------------------------- Fault center ------------------------- */
  let faultCount = 0;
  function seedFaults() {
    const rows = [
      { time: "14:22:08", code: "INV-OVTEMP", ev: "Inverter over-temperature — load shed", sev: "critical" },
      { time: "05:14:33", code: "BATT-LOW", ev: "Battery SOC < 40% — load shedding", sev: "major" },
      { time: "16:47:12", code: "IRR-DROP", ev: "Irradiance drop 38% — cloud cover", sev: "minor" },
      { time: "09:02:41", code: "CLD-SYNC", ev: "Cloud sync retry — network latency", sev: "cleared" },
    ];
    rows.forEach((r) => addFaultRow(r, true));
  }
  function addFaultRow(f, prepend) {
    const tb = $("faultTable");
    if (!tb) return;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td style="font-family:var(--font-mono)">${f.time || new Date().toLocaleTimeString()}</td>
      <td style="font-family:var(--font-mono);color:var(--cyan)">${f.code}</td>
      <td>${f.ev}</td>
      <td><span class="sev sev-${f.sev || "minor"}">${(f.sev || "minor").toUpperCase()}</span></td>`;
    if (prepend) tb.prepend(tr); else tb.appendChild(tr);
    while (tb.children.length > 8) tb.removeChild(tb.lastChild);
  }
  function setFaultStatus(kind) {
    const el = $("faultStatus");
    if (!el) return;
    el.className = "fault-status" + (kind === "ok" ? "" : " " + kind);
    if (kind === "ok") {
      el.innerHTML = `<div class="fs-ic">&#10003;</div><div><b>All Systems Normal</b><span>No active faults &middot; last scan 0s ago</span></div>`;
    } else if (kind === "critical") {
      el.innerHTML = `<div class="fs-ic">&#9888;</div><div><b>Critical Fault Active</b><span>Inverter over-temperature — protection engaged</span></div>`;
    } else {
      el.innerHTML = `<div class="fs-ic">&#9888;</div><div><b>Warning Detected</b><span>Review the fault log for details</span></div>`;
    }
  }

  /* ------------------------- AI weather forecast ------------------------- */
  function buildWeather() {
    const days = [
      { d: "Today", icon: "☀", pred: 9.6, hi: 33, lo: 26 },
      { d: "Tue", icon: "☀", pred: 10.2, hi: 34, lo: 27 },
      { d: "Wed", icon: "⛅", pred: 7.8, hi: 31, lo: 25 },
      { d: "Thu", icon: "☀", pred: 11.0, hi: 35, lo: 27 },
      { d: "Fri", icon: "⛅", pred: 8.4, hi: 30, lo: 24 },
      { d: "Sat", icon: "☀", pred: 10.8, hi: 34, lo: 26 },
      { d: "Sun", icon: "☀", pred: 9.2, hi: 33, lo: 25 },
    ];
    const grid = $("weatherGrid");
    if (!grid) return;
    grid.innerHTML = days.map((d) => `
      <div class="weather-day">
        <div class="wd">${d.d}</div>
        <div class="wico">${d.icon}</div>
        <b>${d.pred} kWh</b>
        <span>${d.hi}° / ${d.lo}°</span>
      </div>`).join("");
    $("predToday").textContent = days[0].pred + " kWh";
  }

  /* ------------------------- Load controls ------------------------- */
  function wireLoadControls(sim) {
    const map = { lights: 120, pump: 280, fan: 140, backup: 100 };
    document.querySelectorAll(".load-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const key = btn.dataset.load;
        const on = btn.classList.toggle("on");
        sim.setLoad(key, on ? map[key] : 0);
        $("w" + key[0].toUpperCase() + key.slice(1)).textContent = (on ? map[key] : 0) + " W";
        pushMqtt({ dir: "sub", topic: `solargrid/cmd/load/set/${key}`, payload: on ? map[key] : 0 });
      });
    });
  }

  /* ------------------------- Main boot ------------------------- */
  function boot() {
    if (typeof Chart === "undefined" || !window.SGSim) return;

    chartDefaults();
    const hist = buildPowerChart();
    const simState = window.SGSim.getState().state;
    buildBattChart(Math.round(simState.batt));
    buildLoadChart();
    buildTelemetry();
    seedFaults();
    buildWeather();
    wireLoadControls(window.SGSim);
    fillTopics();
    startClock();

    window.SGEnergyFlow.build();
    window.SGEnergyFlow.bind(window.SGSim);

    /* ------- connect + start the MQTT simulation ------- */
    const connChip = $("connChip");
    window.SGSim.on("connect", (info) => {
      connChip.className = "conn-indicator";
      connChip.innerHTML = `<span class="pulse-dot"></span> MQTT CONNECTED · ${info.clientId}`;
    });
    window.SGSim.on("disconnect", () => {
      connChip.className = "conn-indicator disconnected";
      connChip.innerHTML = `<span class="pulse-dot"></span> DISCONNECTED`;
    });
    window.SGSim.connect();
    window.SGSim.start(1600);

    /* ------- live state → render ------- */
    window.SGSim.on("message", pushMqtt);

    window.SGSim.on("state", ({ state }) => {
      const p = state.power, l = state.load;

      /* KPIs */
      $("kVolt").innerHTML = state.v.toFixed(1) + ` <small>V</small>`;
      $("kAmp").innerHTML = state.a.toFixed(2) + ` <small>A</small>`;
      $("kPower").innerHTML = p.toFixed(0) + ` <small>W</small>`;
      $("kBatt").innerHTML = state.batt.toFixed(0) + ` <small>%</small>`;
      $("kLoad").innerHTML = l.toFixed(0) + ` <small>W</small>`;
      $("kTemp").innerHTML = state.temp.toFixed(1) + ` <small>&deg;C</small>`;
      $("kEff").innerHTML = state.eff.toFixed(1) + ` <small>%</small>`;
      $("kCo2").innerHTML = state.co2.toFixed(1) + ` <small>kg</small>`;

      $("kPowerBar").style.width = Math.min(100, (p / 2000) * 100) + "%";
      $("kBattBar").style.width = state.batt.toFixed(0) + "%";
      $("kLoadBar").style.width = Math.min(100, (l / 1000) * 100) + "%";
      $("kTempBar").style.width = Math.min(100, (state.temp / 50) * 100) + "%";
      $("kEffBar").style.width = state.eff.toFixed(1) + "%";

      /* battery centre + meta */
      battCenter.firstElementChild.textContent = state.batt.toFixed(0) + "%";
      $("battRate").textContent = (state.battCur >= 0 ? "+" : "") + state.battCur.toFixed(2) + " A";
      $("battRate").style.color = state.battCur >= 0 ? "var(--green)" : "var(--orange)";
      $("battVolt").textContent = state.battV.toFixed(1) + " V";
      battChart.data.datasets[0].data = [state.batt, 100 - state.batt];
      battChart.update();

      /* load doughnut */
      const ld = state.loads;
      loadChart.data.datasets[0].data = [ld.lights, ld.pump, ld.fan, ld.backup];
      loadChart.update();

      /* grid + net status */
      $("netChip").textContent = "NET FLOW — " + (p > l ? "CHARGING" : "DISCHARGING");
      $("gridChip").textContent = "\u25CF " + state.grid.toUpperCase();

      /* rolling chart */
      hist.power.push(Math.round(p));
      hist.load.push(Math.round(l));
      hist.pred.push(Math.round(aiPrediction(state)));
      if (hist.power.length > 40) { hist.power.shift(); hist.load.shift(); hist.pred.shift(); }
      powerChart.update();

      pushTelemetry(window.SGSim);
    });

    /* ------- faults ------- */
    window.SGSim.on("fault", (f) => {
      setFaultStatus("critical");
      addFaultRow({ code: f.code, ev: f.title, sev: f.severity });
      const banner = $("faultBanner");
      banner.style.display = "block";
      $("faultTitle").textContent = f.title.toUpperCase();
      $("faultDesc").textContent = f.detail;
    });
    window.SGSim.on("fault-clear", (f) => {
      setFaultStatus("ok");
      $("faultBanner").style.display = "none";
      addFaultRow({ code: f.code, ev: "Fault cleared — system restored", sev: "cleared" });
    });

    /* theme-aware chart refresh */
    window.addEventListener("theme:change", refreshCharts);
  }

  /** Simple AI forecast: PV power projected from the solar irradiance model. */
  function aiPrediction(state) {
    const now = new Date();
    const hour = now.getHours() + now.getMinutes() / 60;
    const daylight = Math.sin(Math.max(0, Math.min(Math.PI, ((hour - 6) / 12) * Math.PI)));
    const cloudF = 0.92; // 7-day average cloud factor
    const predictedW = Math.max(0, daylight * 1360 * cloudF * 0.97);
    return predictedW;
  }

  if (document.readyState !== "loading") boot();
  else document.addEventListener("DOMContentLoaded", boot);
})();
