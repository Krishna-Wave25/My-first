/* ============================================================
 * circuit.js — Interactive circuit diagram behaviour
 * ------------------------------------------------------------
 * Clicking an SVG node shows its role, description, full
 * specification list and a wiring note in the side panel.
 * ============================================================ */
(function () {
  "use strict";

  /* Master component catalogue (key = data-comp on the SVG node) */
  const COMPONENTS = {
    panel: {
      icon: "\u2600", color: "#ffc800",
      name: "Solar Panel (PV Array)",
      role: "Power Source",
      desc: "Four monocrystalline 320 W panels in series-parallel configuration. Converts sunlight into DC electricity, sized to supply daily load plus battery charging.",
      specs: [
        ["Power", "4 × 320 W (1.28 kWp)"], ["Voc", "45.0 V"], ["Vmpp", "37.4 V"],
        ["Isc", "8.5 A"], ["Impp", "8.2 A"], ["Efficiency", "21.2%"], ["Cell type", "Monocrystalline"],
      ],
      wiring: "Series pairs → parallel to 24 V input of the MPPT controller. Connect a 10 A inline fuse per string.",
    },
    mppt: {
      icon: "\u26A1", color: "#00e5ff",
      name: "MPPT Charge Controller",
      role: "Max-Power Tracking",
      desc: "The heart of the system. Continuously adjusts the operating point of the array to the Maximum Power Point, then regulates battery charging with a multi-stage profile.",
      specs: [
        ["Type", "MPPT (P&O / IncCond / AI)"], ["Input", "12–60 V DC"], ["Charge current", "30 A"],
        ["Battery", "12/24/48 V auto"], ["Tracking", "> 98%"], ["Protection", "OV / OC / OV-Temp"],
      ],
      wiring: "PV+ → PV+ terminal, PV− → PV− terminal. Battery bank on the battery terminals. Never power the controller without a battery connected.",
    },
    battery: {
      icon: "\uD83D\uDD0B", color: "#00e676",
      name: "Battery Storage (LiFePO\u2084)",
      role: "Energy Reservoir",
      desc: "A 48 V lithium iron-phosphate bank (4 × 12 V, 100 Ah) that stores surplus solar energy during the day and powers loads at night or during low sun.",
      specs: [
        ["Voltage", "48 V nominal"], ["Capacity", "100 Ah (4.8 kWh)"], ["Chemistry", "LiFePO\u2084"],
        ["Cycle life", "> 4000 cycles"], ["BMS", "Integrated"], ["SOC range", "20–100%"],
      ],
      wiring: "Connect in series string with torque-tightened bus bars. Keep the BMS sense wires oriented correctly and never reverse polarity.",
    },
    inverter: {
      icon: "\u21C4", color: "#ffab2e",
      name: "Inverter (Pure Sine Wave)",
      role: "DC → AC Conversion",
      desc: "Converts 48 V DC battery power into clean 230 V, 50 Hz AC for household appliances. Pure sine output protects sensitive electronics.",
      specs: [
        ["Output", "230 V AC · 50 Hz"], ["Rated power", "1.5 kVA"], ["Surge", "3.0 kVA / 5 s"],
        ["Waveform", "Pure sine"], ["Efficiency", "94–97%"], ["Standby", "< 0.8 W"],
      ],
      wiring: "Heavy-gauge DC cables (≤ 1 m) to the battery with a 200 A fuse. Output connects to a dedicated AC distribution board.",
    },
    load: {
      icon: "\uD83D\uDCA1", color: "#e9eefc",
      name: "AC / DC Loads",
      role: "Consumption",
      desc: "Managed load circuits — LED lighting, water pump, cooling fan and a backup outlet — each switched by the relay module and monitored in the dashboard.",
      specs: [
        ["Lighting", "120 W LED"], ["Pump", "280 W"], ["Cooling", "140 W"],
        ["Backup outlet", "100 W"], ["Total design", "≤ 1.0 kW"], ["Control", "4 relays + scheduler"],
      ],
      wiring: "Each circuit runs through one relay contact. Earth all metal enclosures; use RCD/MCB protection in the AC distribution board.",
    },
    sensors: {
      icon: "\uD83D\uDCD0", color: "#00e5ff",
      name: "Voltage & Current Sensors",
      role: "PV Sensing",
      desc: "ACS712 hall-effect current sensors and resistive voltage dividers sample panel voltage and current, feeding the ESP32 ADC for MPPT and telemetry.",
      specs: [
        ["Voltage", "0–50 V (divider)"], ["Current", "ACS712-30A"], ["Accuracy", "\u00B12.5%"],
        ["Isolation", "2.1 kV RMS"], ["Interface", "Analog 0–3.3 V"], ["Sampling", "100 Hz"],
      ],
      wiring: "Current sensor in series with the positive PV lead; voltage divider across PV+ / PV−. Clamp ADC inputs to 3.3 V with protection diodes.",
    },
    esp32: {
      icon: "\uD83D\uDD0D", color: "#00e676",
      name: "ESP32 IoT Controller",
      role: "IoT Brain",
      desc: "The ESP32 DevKit samples all sensors, runs the MPPT control logic, drives the relays and publishes encrypted MQTT telemetry to the cloud over Wi-Fi.",
      specs: [
        ["MCU", "Tensilica Xtensa LX6"], ["Clock", "240 MHz"], ["ADC", "12-bit × 16 ch"],
        ["Wi-Fi", "802.11 b/g/n"], ["BLE", "4.2 / 5.0"], ["Pins", "30 GPIO"],
      ],
      wiring: "5 V USB or regulated supply. Share a common ground with every sensor; fit pull-ups on I²C and keep signal wires short and twisted.",
    },
    temp: {
      icon: "\uD83C\uDF21", color: "#ff4d6d",
      name: "Temperature Sensor",
      role: "Thermal Protection",
      desc: "A DHT22 / NTC sensor monitors ambient and battery temperature, triggering throttling or fan control when the system runs hot.",
      specs: [
        ["Type", "DHT22 / NTC"], ["Range", "−40…+80 °C"], ["Accuracy", "\u00B10.5 °C"],
        ["Interface", "1-wire / analog"], ["Sample rate", "0.5 Hz"], ["Use", "Derating & fan control"],
      ],
      wiring: "Mount near battery terminals and inverter heatsink. 4.7 kΩ pull-up on the 1-wire data line to VCC.",
    },
    relay: {
      icon: "\uD83D\uDD06", color: "#ffab2e",
      name: "Relay Module (4 ch)",
      role: "Remote Load Switching",
      desc: "A 4-channel opto-isolated relay board lets the dashboard switch load circuits on and off remotely, enabling smart scheduling and load shedding.",
      specs: [
        ["Channels", "4"], ["Contact", "10 A / 250 V AC"], ["Trigger", "Active low"],
        ["Isolation", "Opto-coupler"], ["LED", "Per channel"], ["VCC", "5 V"],
      ],
      wiring: "IN1–IN4 to ESP32 GPIOs. Common terminal to line; load on NO contact. Add flyback protection if driving inductive loads.",
    },
    cloud: {
      icon: "\u2601", color: "#00e5ff",
      name: "Cloud Database & MQTT Broker",
      role: "Data & Services",
      desc: "Time-series data is published over MQTT/TLS and stored in a cloud database (Firebase-style). The dashboard subscribes, stores history and runs AI analytics.",
      specs: [
        ["Broker", "MQTT over TLS :8883"], ["Store", "Time-series (5 s resolution)"], ["Retention", "12 months"],
        ["API", "REST + WebSocket"], ["Auth", "JWT + per-device certs"], ["Analytics", "AI forecast pipeline"],
      ],
      wiring: "ESP32 publishes to topics solargrid/telemetry/# and subscribes to solargrid/cmd/#. All channels use TLS with client certificates.",
    },
  };

  const ICONS = {
    "\u2600": "\uD83C\uDF1E", "\u26A1": "\u26A1", "\uD83D\uDD0B": "\uD83D\uDD0B", "\u21C4": "\u21C4",
    "\uD83D\uDCA1": "\uD83D\uDCA1", "\uD83D\uDCD0": "\uD83D\uDCD0", "\uD83D\uDD0D": "\uD83D\uDD0D",
    "\uD83C\uDF21": "\uD83C\uDF21", "\uD83D\uDD06": "\uD83D\uDD06", "\u2601": "\u2601",
  };

  function render(key) {
    const c = COMPONENTS[key];
    if (!c) return;
    document.getElementById("compName").textContent = c.name;
    document.getElementById("compRole").textContent = c.role;
    document.getElementById("compDesc").textContent = c.desc;
    document.getElementById("compIcon").innerHTML = ICONS[c.icon] || c.icon;
    document.getElementById("compIcon").style.background = `linear-gradient(145deg, ${c.color}22, ${c.color}0a)`;
    document.getElementById("compIcon").style.borderColor = c.color + "55";
    document.getElementById("compIcon").style.color = c.color;
    document.getElementById("compSpecs").innerHTML = c.specs
      .map(([k, v]) => `<div class="comp-spec"><span>${k}</span><b>${v}</b></div>`).join("");
    document.getElementById("compWiring").textContent = c.wiring;
  }

  function init() {
    document.querySelectorAll(".circ-node").forEach((node) => {
      node.addEventListener("click", () => {
        document.querySelectorAll(".circ-node.active").forEach((n) => n.classList.remove("active"));
        node.classList.add("active");
        render(node.dataset.comp);
      });
      node.style.cursor = "pointer";
    });
    render("panel");
  }

  if (document.readyState !== "loading") init();
  else document.addEventListener("DOMContentLoaded", init);
})();
