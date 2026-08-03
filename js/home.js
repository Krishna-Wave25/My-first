/* ============================================================
   Home page — live hero panel simulation
   ============================================================ */

(function () {
  const rand = (min, max) => min + Math.random() * (max - min);
  const randi = (min, max) => Math.floor(rand(min, max + 1));

  function smoothNum(from, to, steps) {
    const arr = [];
    for (let i = 1; i <= steps; i++) arr.push(from + ((to - from) * i) / steps);
    return arr;
  }

  function animateVal(el, target, { decimals = 0, suffix = "", unit = "" } = {}) {
    if (!el) return;
    const from = parseFloat(el.textContent) || 0;
    const seq = smoothNum(from, target, 12);
    let i = 0;
    const t = setInterval(() => {
      el.textContent = seq[i].toFixed(decimals) + (unit ? " " + unit : "") + suffix;
      if (++i >= seq.length) clearInterval(t);
    }, 45);
  }

  let power = 1248, batt = 82, load = 640, temp = 31.2, co2 = 6.2, energy = 8.4;

  function tick() {
    power = Math.max(480, power + rand(-90, 110));
    load = Math.max(180, Math.min(980, load + rand(-60, 70)));
    batt = Math.max(38, Math.min(99, batt + (power > load ? 0.6 : -0.35)));
    temp = Math.max(22, Math.min(42, temp + rand(-0.4, 0.4)));
    energy += power * 0.000016;
    co2 += power * 0.000004;

    animateVal(document.getElementById("heroPower"), power, { decimals: 0 });
    animateVal(document.getElementById("heroLoad"), load, { decimals: 0 });
    animateVal(document.getElementById("heroBatt"), batt, { decimals: 0, unit: "%" });
    animateVal(document.getElementById("heroEff"), rand(94.5, 98.2), { decimals: 1, unit: "%" });
    animateVal(document.getElementById("heroTemp"), temp, { decimals: 1, unit: "\u00b0C" });

    const bt = document.getElementById("heroBattTxt");
    if (bt) bt.textContent = batt.toFixed(0) + "%";
    const bf = document.getElementById("heroBatFill");
    if (bf) {
      bf.style.width = batt.toFixed(0) + "%";
      bf.style.background = batt > 55 ? "var(--grad-energy)" : "linear-gradient(90deg,#ffab2e,#ffc800)";
    }

    const fcE = document.getElementById("fcEnergy");
    if (fcE) fcE.textContent = energy.toFixed(1) + " kWh";
    const fcC = document.getElementById("fcCo2");
    if (fcC) fcC.textContent = co2.toFixed(1) + " kg";
  }

  setInterval(tick, 2200);
  tick();
})();
