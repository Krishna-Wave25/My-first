/* ============================================================
   Charts — analytics & forecasting visualizations
   ============================================================ */

(function () {
  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  ready(() => {
    if (typeof Chart === "undefined") return;

    const t = window.chartTheme ? chartTheme() : { text: "#8f9cc4", grid: "rgba(255,255,255,0.06)", tick: "#8f9cc4" };

    Chart.defaults.color = t.text;
    Chart.defaults.font.family = "JetBrains Mono, monospace";
    Chart.defaults.font.size = 11;
    Chart.defaults.borderColor = t.grid;
    Chart.defaults.plugins.legend.labels.usePointStyle = true;

    const grid = { grid: { color: t.grid } };
    const noX = { x: { grid: { display: false } }, y: grid.grid };
    const base = {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: { legend: { position: "top", align: "end" } },
    };

    function areaFill(hex, alpha = 0.22) {
      return (ctx) => {
        const g = ctx.chart.ctx.createLinearGradient(0, 0, 0, 300);
        g.addColorStop(0, hex.replace(")", "," + alpha + ")").replace("rgb", "rgba"));
        g.addColorStop(1, hex.replace(")", ",0)").replace("rgb", "rgba"));
        return g;
      };
    }

    /* ---------- Daily generation ---------- */
    const dailyEl = document.getElementById("dailyChart");
    if (dailyEl) {
      const hours = Array.from({ length: 24 }, (_, i) => (i < 6 ? i + 24 : i) + "h");
      const sunUp = [0, 0, 0, 0, 0, 0, 8, 34, 78, 152, 268, 420, 520, 540, 498, 402, 296, 186, 96, 34, 0, 0, 0, 0];
      new Chart(dailyEl, {
        type: "bar",
        data: {
          labels: hours,
          datasets: [{
            label: "Solar Generation (W)",
            data: sunUp,
            backgroundColor: (c) => {
              const ctx = c.chart.ctx;
              const g = ctx.createLinearGradient(0, 280, 0, 0);
              g.addColorStop(0, "rgba(255,200,0,0.06)");
              g.addColorStop(1, "rgba(255,200,0,0.85)");
              return g;
            },
            borderRadius: 5,
            borderSkipped: false,
            hoverBackgroundColor: "#ffc800",
          }],
        },
        options: { ...base, scales: { ...grid }, plugins: { legend: { display: false } } },
      });
    }

    /* ---------- Monthly report ---------- */
    const monthlyEl = document.getElementById("monthlyChart");
    if (monthlyEl) {
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const gen = [205, 195, 232, 252, 282, 292, 298, 248, 261, 276, 289, 298];
      const con = [168, 158, 172, 180, 188, 196, 199, 171, 179, 185, 191, 198];
      new Chart(monthlyEl, {
        type: "line",
        data: {
          labels: months,
          datasets: [
            { label: "Generated (kWh)", data: gen, borderColor: "#ffc800", backgroundColor: areaFill("rgba(255,200,0)"), fill: true, tension: 0.4, borderWidth: 2.5, pointRadius: 3, pointBackgroundColor: "#ffc800" },
            { label: "Consumed (kWh)", data: con, borderColor: "#00e5ff", backgroundColor: "transparent", tension: 0.4, borderWidth: 2, borderDash: [6, 4], pointRadius: 3, pointBackgroundColor: "#00e5ff" },
          ],
        },
        options: { ...base, scales: grid },
      });
    }

    /* ---------- Battery cycle ---------- */
    const batteryEl = document.getElementById("batteryCycleChart");
    if (batteryEl) {
      const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      const charge = [12.5, 13.1, 14.4, 15.2, 16.8, 17.9, 15.6];
      const discharge = [10.2, 11.0, 11.8, 12.4, 13.1, 13.9, 12.6];
      new Chart(batteryEl, {
        type: "line",
        data: {
          labels: days,
          datasets: [
            { label: "Charged (kWh)", data: charge, borderColor: "#00e676", backgroundColor: areaFill("rgba(0,230,118)"), fill: true, tension: 0.4, borderWidth: 2.5, pointRadius: 3, pointBackgroundColor: "#00e676" },
            { label: "Discharged (kWh)", data: discharge, borderColor: "#ffab2e", backgroundColor: "transparent", tension: 0.4, borderWidth: 2, borderDash: [6, 4], pointRadius: 3, pointBackgroundColor: "#ffab2e" },
          ],
        },
        options: { ...base, scales: grid },
      });
    }

    /* ---------- Load profile ---------- */
    const loadEl = document.getElementById("loadProfileChart");
    if (loadEl) {
      const labels = ["00h", "03h", "06h", "09h", "12h", "15h", "18h", "21h"];
      new Chart(loadEl, {
        type: "line",
        data: {
          labels,
          datasets: [
            { label: "Load (W)", data: [240, 180, 260, 520, 460, 380, 620, 480], borderColor: "#00e5ff", backgroundColor: areaFill("rgba(0,229,255)"), fill: true, tension: 0.4, borderWidth: 2.5, pointRadius: 3, pointBackgroundColor: "#00e5ff" },
            { label: "Avg (W)", data: [300, 300, 300, 300, 300, 300, 300, 300], borderColor: t.tick, backgroundColor: "transparent", borderDash: [4, 6], borderWidth: 1.5, pointRadius: 0 },
          ],
        },
        options: { ...base, scales: grid },
      });
    }

    /* ---------- Peak usage ---------- */
    const peakEl = document.getElementById("peakChart");
    if (peakEl) {
      const labels = ["W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8", "W9", "W10", "W11", "W12"];
      const peak = [1.12, 1.18, 1.24, 1.31, 1.38, 1.42, 1.47, 1.52, 1.44, 1.38, 1.33, 1.28];
      const avg = [0.9, 0.94, 0.98, 1.02, 1.05, 1.08, 1.1, 1.12, 1.08, 1.04, 1.0, 0.96];
      new Chart(peakEl, {
        type: "bar",
        data: {
          labels,
          datasets: [
            { label: "Peak Demand (kW)", data: peak, backgroundColor: "rgba(255,77,109,0.65)", borderRadius: 5, borderSkipped: false, hoverBackgroundColor: "#ff4d6d" },
            { label: "Average (kW)", data: avg, type: "line", borderColor: "#00e5ff", backgroundColor: "transparent", tension: 0.4, borderWidth: 2.5, pointRadius: 3, pointBackgroundColor: "#00e5ff" },
          ],
        },
        options: { ...base, scales: grid },
      });
    }

    /* ---------- Savings ---------- */
    const savingsEl = document.getElementById("savingsChart");
    if (savingsEl) {
      const labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
      new Chart(savingsEl, {
        type: "line",
        data: {
          labels,
          datasets: [
            { label: "Energy Saved (kWh)", data: [140, 132, 168, 196, 236, 258], borderColor: "#00e676", backgroundColor: areaFill("rgba(0,230,118)"), fill: true, tension: 0.4, borderWidth: 2.5, pointRadius: 3, pointBackgroundColor: "#00e676" },
            { label: "CO\u2082 Saved (kg)", data: [95, 90, 114, 133, 160, 175], borderColor: "#ffc800", backgroundColor: "transparent", tension: 0.4, borderWidth: 2, borderDash: [6, 4], pointRadius: 3, pointBackgroundColor: "#ffc800" },
          ],
        },
        options: { ...base, scales: grid },
      });
    }

    /* ---------- AI: solar forecast ---------- */
    const solarForecastEl = document.getElementById("solarForecastChart");
    if (solarForecastEl) {
      const hours = ["00h", "02h", "04h", "06h", "08h", "10h", "12h", "14h", "16h", "18h", "20h", "22h"];
      new Chart(solarForecastEl, {
        type: "line",
        data: {
          labels: hours,
          datasets: [
            { label: "Predicted (W)", data: [0, 0, 24, 210, 440, 620, 700, 640, 430, 180, 20, 0], borderColor: "#00e5ff", backgroundColor: areaFill("rgba(0,229,255)"), fill: true, tension: 0.4, borderWidth: 2.5, pointRadius: 3, pointBackgroundColor: "#00e5ff" },
            { label: "Actual (W)", data: [0, 0, 30, 228, 452, 601, 688, 656, 442, 172, 24, 0], borderColor: "#ffc800", backgroundColor: "transparent", tension: 0.4, borderWidth: 2, borderDash: [6, 4], pointRadius: 3, pointBackgroundColor: "#ffc800" },
          ],
        },
        options: { ...base, scales: grid, plugins: { ...base.plugins, tooltip: { callbacks: { label: (c) => ` ${c.dataset.label}: ${c.raw} W` } } } },
      });
    }

    /* ---------- AI: load forecast ---------- */
    const loadForecastEl = document.getElementById("loadForecastChart");
    if (loadForecastEl) {
      const hours = ["00h", "04h", "08h", "12h", "16h", "20h", "24h"];
      const hist = [180, 120, 380, 520, 640, 470, 260];
      const fut = [200, 140, 400, 540, 660, 500, 280];
      new Chart(loadForecastEl, {
        type: "bar",
        data: {
          labels: hours,
          datasets: [
            { label: "Historical (W)", data: hist, backgroundColor: "rgba(0,229,255,0.5)", borderRadius: 5, borderSkipped: false },
            { label: "Forecast (W)", data: fut, backgroundColor: "rgba(255,200,0,0.75)", borderRadius: 5, borderSkipped: false },
          ],
        },
        options: { ...base, scales: grid },
      });
    }

    /* ---------- AI: weather forecast ---------- */
    const weatherEl = document.getElementById("weatherChart");
    if (weatherEl) {
      const days = ["Today", "+1d", "+2d", "+3d", "+4d", "+5d", "+6d"];
      const sun = [88, 74, 92, 62, 78, 95, 84];
      const temp = [31, 30, 33, 29, 30, 34, 32];
      new Chart(weatherEl, {
        type: "bar",
        data: {
          labels: days,
          datasets: [
            { label: "Sunshine %", data: sun, yAxisID: "y", backgroundColor: (c) => {
                const ctx = c.chart.ctx;
                const g = ctx.createLinearGradient(0, 220, 0, 0);
                g.addColorStop(0, "rgba(255,200,0,0.05)");
                g.addColorStop(1, "rgba(255,200,0,0.8)");
                return g;
              }, borderRadius: 5, borderSkipped: false },
            { label: "Temp \u00b0C", data: temp, type: "line", yAxisID: "y1", borderColor: "#00e5ff", backgroundColor: "transparent", tension: 0.4, borderWidth: 2.5, pointRadius: 3, pointBackgroundColor: "#00e5ff" },
          ],
        },
        options: {
          ...base,
          scales: {
            y: { ...grid.grid, position: "left", beginAtZero: true, max: 100, title: { display: true, text: "Sunshine %" } },
            y1: { position: "right", grid: { display: false }, min: 20, max: 40, title: { display: true, text: "\u00b0C" } },
          },
        },
      });
    }

    /* ---------- AI: battery prediction ---------- */
    const battPredEl = document.getElementById("battPredChart");
    if (battPredEl) {
      const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun", "Mon", "Tue"];
      const actual = [82, 78, 74, 79, 84, 88, 91, null, null];
      const pred = [null, null, null, null, null, null, null, 93, 89];
      new Chart(battPredEl, {
        type: "line",
        data: {
          labels: days,
          datasets: [
            { label: "Actual SOC %", data: actual, borderColor: "#00e676", backgroundColor: "transparent", tension: 0.4, borderWidth: 2.5, pointRadius: 4, pointBackgroundColor: "#00e676", spanGaps: true },
            { label: "Predicted SOC %", data: pred, borderColor: "#ffc800", backgroundColor: "transparent", tension: 0.4, borderWidth: 2.5, borderDash: [6, 4], pointRadius: 4, pointBackgroundColor: "#ffc800", spanGaps: true },
          ],
        },
        options: {
          ...base,
          scales: { y: { ...grid.grid, min: 60, max: 100 } },
          plugins: { ...base.plugins, tooltip: { callbacks: { label: (c) => (c.raw == null ? " — " : ` ${c.dataset.label}: ${c.raw}%`) } } },
        },
      });
    }

    /* ---------- AI: predictive maintenance ---------- */
    const maintEl = document.getElementById("maintChart");
    if (maintEl) {
      const weeks = ["W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8", "W9", "W10", "W11", "W12"];
      const health = [100, 99, 98, 98, 97, 95, 94, 92, 91, 89, 87, 85];
      const risk = [6, 7, 8, 9, 11, 13, 15, 18, 21, 26, 32, 40];
      new Chart(maintEl, {
        type: "line",
        data: {
          labels: weeks,
          datasets: [
            { label: "Component Health %", data: health, borderColor: "#00e676", backgroundColor: areaFill("rgba(0,230,118)"), fill: true, tension: 0.4, borderWidth: 2.5, pointRadius: 3, pointBackgroundColor: "#00e676" },
            { label: "Failure Risk %", data: risk, borderColor: "#ff4d6d", backgroundColor: "transparent", tension: 0.4, borderWidth: 2, borderDash: [6, 4], pointRadius: 3, pointBackgroundColor: "#ff4d6d" },
          ],
        },
        options: {
          ...base,
          scales: { y: { ...grid.grid, min: 0, max: 110 } },
        },
      });
    }
  });
})();
