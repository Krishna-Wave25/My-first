/* ============================================================
 * hardware.js — Hardware gallery renderer
 * ------------------------------------------------------------
 * Each component ships with a stylised SVG illustration, a role,
 * a description and its key specifications. Replace the `img`
 * field with a real product photo for final delivery.
 * ============================================================ */
(function () {
  "use strict";

  const ITEMS = [
    {
      name: "Solar Panel",
      role: "Power Source",
      img: `
        <svg viewBox="0 0 240 170">
          <defs><linearGradient id="pvb" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2a3b78"/><stop offset="1" stop-color="#0b1437"/></linearGradient></defs>
          <g stroke="#ffc800" stroke-width="2" opacity=".7">
            <circle cx="205" cy="26" r="12" fill="#ffc800" stroke="none"/>
            <line x1="205" y1="6" x2="205" y2="12"/><line x1="205" y1="40" x2="205" y2="46"/><line x1="185" y1="26" x2="191" y2="26"/><line x1="219" y1="26" x2="225" y2="26"/>
          </g>
          <rect x="22" y="16" width="168" height="108" rx="10" fill="url(#pvb)" stroke="#4a5fa0" stroke-width="3"/>
          ${[0,1,2].map((r) => [0,1,2,3].map((c) => `<rect x="${28+c*40}" y="${22+r*33}" width="36" height="29" rx="4" fill="#101c44" stroke="#2a3b78"/>`).join("")).join("")}
          <path d="M106 124v26M46 140h120" stroke="#8896c4" stroke-width="5" stroke-linecap="round"/>
        </svg>`,
      desc: "Four 320 W monocrystalline panels capture sunlight and feed DC power into the MPPT controller.",
      specs: ["1.28 kWp array", "37.4 V Vmpp", "21.2% eff.", "IP67 rated"],
    },
    {
      name: "MPPT Charge Controller",
      role: "Max-Power Tracking",
      img: `
        <svg viewBox="0 0 240 170">
          <rect x="30" y="26" width="180" height="118" rx="14" fill="#0f1c42" stroke="#00e5ff" stroke-width="3"/>
          <rect x="42" y="38" width="100" height="56" rx="8" fill="#08102b" stroke="#1a2a63"/>
          <g stroke="#00e5ff" stroke-width="2.5" stroke-linecap="round">
            <line x1="55" y1="50" x2="55" y2="66"/><line x1="55" y1="70" x2="55" y2="82"/><line x1="48" y1="58" x2="62" y2="58"/><line x1="48" y1="74" x2="62" y2="74"/>
          </g>
          <path d="M88 46l-7 14h6l-4 12 13-18h-7l4-8z" fill="#00e5ff"/>
          <text x="86" y="86" text-anchor="middle" font-size="10" fill="#8f9cc4" font-family="monospace">MPPT 30A</text>
          <g stroke="#4a5fa0" stroke-width="2.5"><line x1="150" y1="46" x2="150" y2="82"/><line x1="166" y1="46" x2="166" y2="82"/><line x1="182" y1="46" x2="182" y2="82"/></g>
          <g fill="#00e5ff"><circle cx="150" cy="92" r="4"/><circle cx="166" cy="92" r="4"/><circle cx="182" cy="92" r="4"/></g>
          <text x="120" y="128" text-anchor="middle" font-size="11" fill="#00e5ff" font-family="monospace">PV + BAT +</text>
        </svg>`,
      desc: "Continuously locks the array onto its maximum power point and charges the battery with a multi-stage profile.",
      specs: ["30 A charge", "12–60 V input", "> 98% tracking", "OV/OC protection"],
    },
    {
      name: "Battery Storage",
      role: "Energy Reservoir",
      img: `
        <svg viewBox="0 0 240 170">
          <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#00e676"/><stop offset="1" stop-color="#00a65c"/></linearGradient></defs>
          <g fill="#00e676" opacity=".85">${[0,1,2,3].map((i) => `<rect x="${32+i*46}" y="46" width="34" height="88" rx="8" fill="url(#bg)" stroke="#0b1437" stroke-width="3"/>`).join("")}</g>
          <line x1="120" y1="32" x2="120" y2="46" stroke="#8896c4" stroke-width="5"/><line x1="120" y1="134" x2="120" y2="146" stroke="#8896c4" stroke-width="5"/>
          <text x="120" y="18" text-anchor="middle" font-size="11" fill="#00e676" font-family="monospace">48V · LiFePO₄</text>
        </svg>`,
      desc: "Four 12 V / 100 Ah LiFePO₄ batteries store surplus solar energy for night and low-sun periods.",
      specs: ["48 V nominal", "4.8 kWh", "4000+ cycles", "BMS protected"],
    },
    {
      name: "Pure Sine Inverter",
      role: "DC → AC Conversion",
      img: `
        <svg viewBox="0 0 240 170">
          <rect x="30" y="28" width="180" height="120" rx="14" fill="#101d4a" stroke="#ffab2e" stroke-width="3"/>
          <circle cx="60" cy="56" r="14" fill="none" stroke="#ffab2e" stroke-width="3"/>
          <path d="M60 42v6M60 64v6M46 56h6M68 56h6" stroke="#ffab2e" stroke-width="2"/>
          <rect x="92" y="44" width="42" height="24" rx="6" fill="#08102b" stroke="#ffab2e" stroke-width="2"/>
          <text x="113" y="59" text-anchor="middle" font-size="9" fill="#ffab2e" font-family="monospace">230V</text>
          <path d="M150 40l8 18 12-20 14 22" fill="none" stroke="#ffab2e" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
          <g stroke="#8896c4" stroke-width="3"><line x1="120" y1="86" x2="120" y2="100"/><line x1="120" y1="108" x2="120" y2="120"/></g>
          <g stroke="#2a3b78" stroke-width="2"><line x1="40" y1="108" x2="200" y2="108"/><line x1="60" y1="112" x2="60" y2="132"/><line x1="100" y1="112" x2="100" y2="132"/><line x1="140" y1="112" x2="140" y2="132"/><line x1="180" y1="112" x2="180" y2="132"/></g>
        </svg>`,
      desc: "Converts 48 V DC into clean 230 V AC — pure sine wave output protects sensitive electronics.",
      specs: ["1.5 kVA rated", "Pure sine", "3 kVA surge", "230 V / 50 Hz"],
    },
    {
      name: "ESP32 DevKit",
      role: "IoT Controller",
      img: `
        <svg viewBox="0 0 240 170">
          <rect x="46" y="24" width="148" height="120" rx="8" fill="#0e7a4d" stroke="#0b1437" stroke-width="3"/>
          <rect x="76" y="44" width="88" height="46" rx="5" fill="#0b1437"/>
          <rect x="84" y="52" width="72" height="30" rx="3" fill="#1a2a63"/>
          <g stroke="#8f9cc4" stroke-width="3"><line x1="84" y1="60" x2="84" y2="74"/><line x1="90" y1="60" x2="90" y2="74"/><line x1="96" y1="60" x2="96" y2="74"/><line x1="102" y1="60" x2="102" y2="74"/></g>
          <circle cx="190" cy="30" r="4" fill="#00e5ff"/><circle cx="60" cy="142" r="4" fill="#ff4d6d"/>
          ${[0,1,2,3,4,5].map((i) => `<g stroke="#9fb8d0" stroke-width="2"><line x1="${62+i*20}" y1="24" x2="${62+i*20}" y2="16"/><line x1="${62+i*20}" y1="144" x2="${62+i*20}" y2="152"/></g>`).join("")}
          <text x="120" y="168" text-anchor="middle" font-size="11" fill="#00e676" font-family="monospace">ESP32 · MQTT · Wi-Fi</text>
        </svg>`,
      desc: "Samples all sensors, runs MPPT control logic, drives relays and streams encrypted MQTT telemetry to the cloud.",
      specs: ["240 MHz dual-core", "Wi-Fi + BLE", "16× ADC", "30 GPIO"],
    },
    {
      name: "Voltage Sensor",
      role: "PV Sensing",
      img: `
        <svg viewBox="0 0 240 170">
          <rect x="40" y="30" width="160" height="110" rx="10" fill="#123a5e" stroke="#00e5ff" stroke-width="3"/>
          <rect x="56" y="46" width="128" height="58" rx="6" fill="#0b2c49"/>
          <g stroke="#00e5ff" stroke-width="2.5"><circle cx="80" cy="62" r="6" fill="none"/><line x1="80" y1="62" x2="80" y2="74"/><line x1="80" y1="54" x2="80" y2="50"/></g>
          <text x="120" y="62" text-anchor="middle" font-size="10" fill="#00e5ff" font-family="monospace">0–50 V</text>
          <text x="120" y="80" text-anchor="middle" font-size="10" fill="#8f9cc4" font-family="monospace">÷ 16 divider</text>
          ${[0,1,2].map((i) => `<g stroke="#8896c4" stroke-width="2"><line x1="${60+i*36}" y1="116" x2="${60+i*36}" y2="128"/></g>`).join("")}
        </svg>`,
      desc: "A resistor-divider module scales PV voltage into the ESP32's ADC range for accurate monitoring.",
      specs: ["0–50 V range", "3.3 V output", "±1% accuracy", "Analog out"],
    },
    {
      name: "ACS712 Current Sensor",
      role: "Current Sensing",
      img: `
        <svg viewBox="0 0 240 170">
          <rect x="40" y="30" width="160" height="110" rx="10" fill="#123a5e" stroke="#00e5ff" stroke-width="3"/>
          <rect x="56" y="44" width="128" height="40" rx="6" fill="#0b2c49"/>
          <rect x="96" y="52" width="48" height="24" rx="4" fill="#0e7a4d" stroke="#00e676" stroke-width="1.5"/>
          <text x="120" y="67" text-anchor="middle" font-size="9" fill="#00e676" font-family="monospace">ACS712-30A</text>
          <path d="M70 84v14M70 98h100M170 84v14" stroke="#00e5ff" stroke-width="3" fill="none" stroke-linecap="round"/>
          ${[0,1,2].map((i) => `<g stroke="#8896c4" stroke-width="2"><line x1="${70+i*40}" y1="116" x2="${70+i*40}" y2="128"/></g>`).join("")}
        </svg>`,
      desc: "A hall-effect current sensor measures panel and load current without breaking the circuit.",
      specs: ["30 A range", "Hall effect", "2.1 kV isolation", "66 mV/A"],
    },
    {
      name: "DHT22 Temperature Sensor",
      role: "Thermal Protection",
      img: `
        <svg viewBox="0 0 240 170">
          <rect x="40" y="30" width="160" height="110" rx="10" fill="#123a5e" stroke="#ff4d6d" stroke-width="3"/>
          <rect x="56" y="44" width="128" height="62" rx="8" fill="#0b2c49"/>
          ${[0,1,2,3].map((r) => [0,1,2,3,4].map((c) => `<rect x="${60+c*25}" y="${48+r*14}" width="21" height="10" rx="2" fill="#123a5e"/>`).join("")).join("")}
          <text x="120" y="124" text-anchor="middle" font-size="10" fill="#ff4d6d" font-family="monospace">DHT22 · ±0.5°C</text>
        </svg>`,
      desc: "Monitors ambient and battery temperature so the controller can derate output and trigger cooling.",
      specs: ["−40…80 °C", "±0.5 °C", "1-wire", "0.5 Hz"],
    },
    {
      name: "4-Channel Relay Module",
      role: "Load Switching",
      img: `
        <svg viewBox="0 0 240 170">
          <rect x="30" y="30" width="180" height="110" rx="10" fill="#123a5e" stroke="#ffab2e" stroke-width="3"/>
          ${[0,1,2,3].map((i) => `<rect x="${44+i*44}" y="42" width="32" height="36" rx="5" fill="#0b2c49" stroke="#8896c4" stroke-width="2"/><circle cx="${60+i*44}" cy="60" r="6" fill="#00e676"/><circle cx="${60+i*44}" cy="60" r="2.5" fill="#0b1437"/>`).join("")}
          ${[0,1,2,3].map((i) => `<text x="${60+i*44}" y="92" text-anchor="middle" font-size="9" fill="#ffab2e" font-family="monospace">IN${i+1}</text>`).join("")}
          <text x="120" y="126" text-anchor="middle" font-size="10" fill="#ffab2e" font-family="monospace">10 A · 250 V AC</text>
        </svg>`,
      desc: "Opto-isolated relays let the dashboard switch load circuits on and off for scheduling and load shedding.",
      specs: ["4 channels", "10 A / 250 V", "Active low", "Opto-isolated"],
    },
    {
      name: "Cloud Database",
      role: "Data & Analytics",
      img: `
        <svg viewBox="0 0 240 170">
          <rect x="46" y="26" width="148" height="120" rx="10" fill="#101d4a" stroke="#00e5ff" stroke-width="3"/>
          <rect x="62" y="40" width="116" height="18" rx="5" fill="#00e5ff"/>
          ${[0,1,2].map((i) => `<rect x="62" y="${66+i*26}" width="116" height="20" rx="5" fill="#0b2c49" stroke="#1a2a63"/><circle cx="${76+i*26}" cy="${76+i*26}" r="4" fill="#00e676"/>`).join("")}
          <circle cx="76" cy="76" r="4" fill="#00e676"/><circle cx="102" cy="102" r="4" fill="#ffc800"/><circle cx="128" cy="128" r="4" fill="#00e5ff"/>
        </svg>`,
      desc: "Time-series energy data is stored securely in the cloud and served to the dashboard via MQTT + REST.",
      specs: ["MQTT TLS :8883", "5 s resolution", "12 mo retention", "JWT auth"],
    },
    {
      name: "Web Dashboard",
      role: "Monitoring & Control",
      img: `
        <svg viewBox="0 0 240 170">
          <rect x="46" y="26" width="148" height="100" rx="10" fill="#0b1437" stroke="#8896c4" stroke-width="3"/>
          <path d="M60 104 L84 76 L100 88 L120 52 L146 74 L170 46 L178 60 L178 104 Z" fill="url(#dbg)" stroke="#ffc800" stroke-width="2.5" fill-opacity=".5"/>
          <defs><linearGradient id="dbg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffc800" stop-opacity=".55"/><stop offset="1" stop-color="#ffc800" stop-opacity="0"/></linearGradient></defs>
          <path d="M84 76 L100 88 L120 52 L146 74 L170 46" fill="none" stroke="#00e5ff" stroke-width="2.5"/>
          <rect x="56" y="136" width="128" height="10" rx="4" fill="#1a2a63"/>
          <rect x="56" y="136" width="88" height="10" rx="4" fill="#00e676"/>
        </svg>`,
      desc: "The browser interface renders live KPIs, charts, alerts and remote load control in real time.",
      specs: ["Live telemetry", "Fault alerts", "Relay control", "Responsive UI"],
    },
  ];

  function render() {
    const grid = document.getElementById("hwGrid");
    if (!grid) return;
    grid.innerHTML = ITEMS.map((it, i) => `
      <article class="hw-card reveal ${i < 3 ? "" : "reveal-d1"}">
        <div class="hw-media">
          <span class="hw-chip">UNIT ${String(i + 1).padStart(2, "0")}</span>
          ${it.img}
        </div>
        <div class="hw-body">
          <h3>${it.name}</h3>
          <div class="hw-role">${it.role}</div>
          <p>${it.desc}</p>
          <div class="hw-specs">
            ${it.specs.map((s) => `<span class="chip">${s}</span>`).join("")}
          </div>
        </div>
      </article>`).join("");
  }

  if (document.readyState !== "loading") render();
  else document.addEventListener("DOMContentLoaded", render);
})();
