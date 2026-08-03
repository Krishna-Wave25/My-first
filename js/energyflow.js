/* ============================================================
 * energyflow.js — Animated SVG energy flow
 * ------------------------------------------------------------
 * Renders the live power path
 *   Solar Panel → MPPT → Battery → Inverter → Load
 * as an SVG with glowing nodes and energy packets that travel
 * along the wires via SVG <animateMotion>. Live values come
 * from the SGSim simulation engine.
 * ============================================================ */
(function () {
  "use strict";

  const rand = (min, max) => min + Math.random() * (max - min);

  /* Node palette (icon, fill, stroke, text colour) */
  const NODES = [
    { id: "panel",  label: "Solar Panel", sub: "PV ARRAY", x: 100, color: "#ffc800",  glow: "rgba(255,200,0,.5)" },
    { id: "mppt",   label: "MPPT",        sub: "CONTROLLER", x: 300, color: "#00e5ff", glow: "rgba(0,229,255,.5)" },
    { id: "battery",label: "Battery",     sub: "STORAGE", x: 500, color: "#00e676",  glow: "rgba(0,230,118,.5)" },
    { id: "inverter",label: "Inverter",   sub: "DC → AC", x: 700, color: "#ffab2e", glow: "rgba(255,171,46,.5)" },
    { id: "load",   label: "Load",        sub: "CONSUMPTION", x: 900, color: "#e9eefc", glow: "rgba(255,255,255,.4)" },
  ];

  const Y = 150;            // wire height
  const NODE_W = 150, NODE_H = 118;

  /* Simple icons drawn inline (stroke = currentColor) */
  const ICONS = {
    panel: '<circle cx="75" cy="59" r="12" fill="none" stroke="currentColor" stroke-width="4"/><path d="M75 31v-8M75 95v-8M47 59h-8M111 59h-8M56 40l-6-6M100 84l-6-6M94 40l6-6M50 84l6-6" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>',
    mppt: '<path d="M75 34l-16 32h12l-6 26 24-38h-12l6-20z" fill="currentColor"/>',
    battery: '<rect x="43" y="48" width="54" height="22" rx="5" fill="none" stroke="currentColor" stroke-width="4"/><path d="M97 54h8v10h-8" fill="none" stroke="currentColor" stroke-width="4"/><path d="M50 55h8M62 55h8M74 55h8" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>',
    inverter: '<path d="M42 59h12l8-16 8 32 8-24 8 8h12" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>',
    load: '<path d="M75 92V62M62 40h26l-8-12-10 12z" fill="currentColor"/><path d="M45 50h60v10H45z" fill="currentColor"/>',
  };

  function nodeSVG(n) {
    return `
      <g class="ef-node" transform="translate(${n.x - NODE_W / 2}, ${Y - NODE_H / 2})" data-node="${n.id}">
        <rect x="4" y="4" width="${NODE_W}" height="${NODE_H}" rx="16" fill="#0b1437" stroke="${n.color}" stroke-width="2" opacity=".96"
              style="filter:drop-shadow(0 0 12px ${n.glow})"/>
        <g style="color:${n.color}">
          ${ICONS[n.id]}
        </g>
        <text x="${NODE_W / 2}" y="104" text-anchor="middle" class="ef-label" font-size="15" fill="#fff">${n.label}</text>
        <text x="${NODE_W / 2}" y="90" text-anchor="middle" class="ef-sub" font-size="9" fill="#8f9cc4" letter-spacing="1.5">${n.sub}</text>
        <text id="ef-${n.id}" x="${NODE_W / 2}" y="46" text-anchor="middle" class="ef-value" font-size="15" fill="${n.color}">…</text>
      </g>`;
  }

  function build() {
    const segments = [];
    for (let i = 0; i < NODES.length - 1; i++) {
      const x1 = NODES[i].x + NODE_W / 2 - 8;
      const x2 = NODES[i + 1].x - NODE_W / 2 + 8;
      const id = "seg" + i;
      segments.push(`
        <path id="${id}" d="M${x1} ${Y} H${x2}" fill="none" stroke="none"/>
        <path class="ef-flow-line" d="M${x1} ${Y} H${x2}" fill="none" stroke="#00e676" stroke-width="2.5" opacity=".7"/>
        ${[0, 0.35].map((b) => `
          <circle r="5" fill="#00e676" opacity=".9" style="filter:drop-shadow(0 0 6px #00e676)">
            <animateMotion dur="1.6s" begin="${b}s" repeatCount="indefinite"><mpath href="#${id}"/></animateMotion>
          </circle>`).join("")}
        <path d="M${x2 - 9} ${Y - 7} l10 7 l-10 7 z" fill="#00e676"/>`);
    }

    const svg = `
      <svg class="energy-flow-svg" viewBox="0 0 1040 300" role="img" aria-label="Animated energy flow">
        <defs>
          <linearGradient id="efbg" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stop-color="rgba(255,200,0,.06)"/><stop offset="1" stop-color="rgba(0,229,255,.06)"/>
          </linearGradient>
        </defs>
        <rect x="10" y="10" width="1020" height="280" rx="20" fill="url(#efbg)"/>
        ${NODES.map(nodeSVG).join("")}
        ${segments.join("")}
      </svg>`;

    const host = document.getElementById("energyFlow");
    if (host) host.innerHTML = svg;
    return svg;
  }

  /* ---------- Live value updates from SGSim ---------- */
  function bind(sim) {
    if (!sim) return;
    const set = (id, txt) => {
      const el = document.getElementById("ef-" + id);
      if (el) el.textContent = txt;
    };
    sim.on("state", ({ state }) => {
      const mppt = state.power * 0.97;
      const inv = mppt * 0.97;
      set("panel", state.power.toFixed(0) + " W");
      set("mppt", mppt.toFixed(0) + " W");
      set("battery", state.batt.toFixed(0) + "%");
      set("inverter", inv.toFixed(0) + " W");
      set("load", state.load.toFixed(0) + " W");
      /* color the battery value by charging/discharging */
      const b = document.getElementById("ef-battery");
      if (b) b.setAttribute("fill", state.battCur >= 0 ? "#00e676" : "#ffab2e");
    });
  }

  /* Lightweight standalone animation used on pages without SGSim */
  function standalone(intervalMs) {
    const set = (id, txt) => {
      const el = document.getElementById("ef-" + id);
      if (el) el.textContent = txt;
    };
    let pv = 1150, batt = 78, load = 560;
    setInterval(() => {
      pv = Math.max(500, pv + rand(-80, 100));
      load = Math.max(200, Math.min(950, load + rand(-50, 60)));
      batt = Math.max(35, Math.min(99, batt + (pv > load ? 0.4 : -0.3)));
      set("panel", pv.toFixed(0) + " W");
      set("mppt", (pv * 0.97).toFixed(0) + " W");
      set("battery", batt.toFixed(0) + "%");
      set("inverter", (pv * 0.94).toFixed(0) + " W");
      set("load", load.toFixed(0) + " W");
    }, intervalMs || 2000);
  }

  window.SGEnergyFlow = { build, bind, standalone };
})();
