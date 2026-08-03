/* ============================================================
 * sim.js — Real-time IoT simulation engine (MQTT / Firebase)
 * ------------------------------------------------------------
 * Emulates a live MQTT telemetry broker (topic publish/subscribe)
 * backed by a cloud time-series model, exactly mirroring how the
 * real ESP32 + MQTT/Firebase pipeline behaves:
 *
 *   ESP32 sensors  --MQTT-->  Cloud broker  --subscribe-->  Dashboard
 *
 * Exposed as `window.SGSim`. The dashboard renders exclusively
 * from SGSim events so swapping in a real broker later is trivial.
 * ============================================================ */
(function () {
  "use strict";

  const rand = (min, max) => min + Math.random() * (max - min);

  /* ------------------------------------------------------------------
   * MQTT topic schema (mirrors the real deployment's topic tree)
   * ------------------------------------------------------------------ */
  const TOPICS = {
    CONNECT: "solargrid/status/connection",
    PV_V: "solargrid/telemetry/pv/voltage",
    PV_A: "solargrid/telemetry/pv/current",
    PV_P: "solargrid/telemetry/pv/power",
    BATT_SOC: "solargrid/telemetry/battery/soc",
    BATT_V: "solargrid/telemetry/battery/voltage",
    BATT_CUR: "solargrid/telemetry/battery/current",
    LOAD: "solargrid/telemetry/load/power",
    TEMP: "solargrid/telemetry/env/temperature",
    IRRA: "solargrid/telemetry/env/irradiance",
    EFF: "solargrid/telemetry/system/efficiency",
    CO2: "solargrid/telemetry/env/co2",
    GRID: "solargrid/status/grid",
    FAULT: "solargrid/status/fault",
    SETLOAD: "solargrid/cmd/load/set", // downstream command channel
  };

  /* ------------------------------------------------------------------
   * Internal state store (one "sensor snapshot")
   * ------------------------------------------------------------------ */
  const state = {
    connected: false,
    clientId: "SG-ESP32-" + Math.random().toString(16).slice(2, 8).toUpperCase(),
    v: 37.4,           // PV voltage (V)
    a: 8.2,            // PV current (A)
    batt: 82,          // battery state of charge (%)
    battV: 51.4,       // battery terminal voltage (V)
    battCur: 1.2,      // battery charge/discharge current (A)
    load: 640,         // active load (W)
    temp: 31.2,        // ambient temperature (°C)
    irradiance: 760,   // solar irradiance (W/m²)
    eff: 96.4,         // system efficiency (%)
    co2: 6.2,          // CO₂ saved today (kg)
    energy: 8.4,       // energy generated today (kWh)
    grid: "off-grid",  // grid/off-grid status
    fault: false,      // active fault flag
    loads: { lights: 120, pump: 280, fan: 140, backup: 0 },
  };

  const history = {
    v: [], a: [], power: [], batt: [], load: [], temp: [], eff: [], co2: [],
  };
  const MAX_HISTORY = 40;

  /* Subscriber registry: topic -> [callbacks] */
  const subscribers = {};
  /* Global event listeners: name -> [callbacks] */
  const listeners = {};

  /** Message console log for the MQTT panel. */
  const log = [];
  function pushLog(dir, topic, payload) {
    const entry = { dir, topic, payload, time: Date.now() };
    log.unshift(entry);
    if (log.length > 80) log.pop();
    emit("message", entry);
  }

  /* ------------------------------------------------------------------
   * Event plumbing
   * ------------------------------------------------------------------ */
  function emit(name, data) {
    (listeners[name] || []).slice().forEach((cb) => cb(data));
  }
  function on(name, cb) {
    (listeners[name] = listeners[name] || []).push(cb);
  }

  function subscribe(topic, cb) {
    (subscribers[topic] = subscribers[topic] || []).push(cb);
  }
  function publish(topic, payload) {
    (subscribers[topic] || []).forEach((cb) => cb(payload));
    pushLog("&uarr; PUB", topic, typeof payload === "object" ? JSON.stringify(payload) : String(payload));
  }

  /* ------------------------------------------------------------------
   * Simulation core
   * ------------------------------------------------------------------ */
  let timer = null;
  let tickCount = 0;

  /** Advance the physical model by one step. */
  function step() {
    tickCount++;

    /* --- weather model: smooth irradiance cycle + cloud noise --- */
    const now = new Date();
    const hour = now.getHours() + now.getMinutes() / 60;
    const daylight = Math.sin(Math.max(0, Math.min(Math.PI, ((hour - 6) / 12) * Math.PI))); // ~06:00→18:00
    const clouds = Math.random() < 0.12 ? rand(0.55, 0.85) : 1; // occasional cloud cover
    const targetIrr = Math.max(0, 1080 * daylight * clouds);
    state.irradiance = state.irradiance * 0.85 + targetIrr * 0.15; // low-pass smooth

    /* --- PV model: power ∝ irradiance with MPPT → panel voltage --- */
    const pvPower = Math.max(0, (state.irradiance / 1000) * 1360 * rand(0.93, 1.0));
    state.a = pvPower / 37.4;
    state.v = Math.max(28, Math.min(44, 34 + pvPower / 500 + rand(-0.5, 0.5)));

    /* --- battery: surplus charges, deficit discharges --- */
    const load = Object.values(state.loads).reduce((s, v) => s + v, 0);
    state.load = load;
    const surplus = pvPower - load;
    state.battCur = (surplus > 0 ? 1 : -1) * Math.min(6, Math.abs(surplus) / 24);
    state.batt = Math.max(35, Math.min(99, state.batt + (surplus > 0 ? 0.30 : -0.20)));
    state.battV = 48 + (state.batt - 50) * 0.08 + state.battCur * 0.15;

    /* --- environment --- */
    state.temp = Math.max(22, Math.min(46, 24 + (state.irradiance / 1000) * 9 + rand(-0.5, 0.5)));
    state.eff = state.fault ? rand(88, 92) : Math.min(98.6, 95 + (state.irradiance / 1000) * 2.4);
    state.energy += (pvPower / 1000) * (3 / 3600);
    state.co2 += (pvPower / 1000) * (3 / 3600) * 0.72; // 0.72 kg CO2 per kWh offset

    /* --- faults: randomly appear ~ every 100-160 ticks, clear after ~10 --- */
    if (!state.fault && tickCount % 140 < 4) {
      state.fault = true;
      emit("fault", {
        code: "INV-OVTEMP", severity: "critical",
        title: "Inverter over-temperature",
        detail: "Heatsink 71°C — load shedding engaged on backup circuit.",
      });
    } else if (state.fault && tickCount % 140 > 12) {
      state.fault = false;
      emit("fault-clear", { code: "INV-OVTEMP", severity: "cleared" });
    }

    /* --- push new snapshot to subscribers --- */
    state.power = pvPower;
    ["v", "a", "power", "batt", "load", "temp", "eff", "co2"].forEach((k) => {
      history[k].push(Math.round(state[k] * 10) / 10);
      if (history[k].length > MAX_HISTORY) history[k].shift();
    });

    /* Publish each telemetry channel over its MQTT topic */
    publish(TOPICS.PV_V, state.v.toFixed(1));
    publish(TOPICS.PV_A, state.a.toFixed(2));
    publish(TOPICS.PV_P, state.power.toFixed(0));
    publish(TOPICS.BATT_SOC, state.batt.toFixed(1));
    publish(TOPICS.BATT_V, state.battV.toFixed(1));
    publish(TOPICS.BATT_CUR, state.battCur.toFixed(2));
    publish(TOPICS.LOAD, state.load.toFixed(0));
    publish(TOPICS.TEMP, state.temp.toFixed(1));
    publish(TOPICS.IRRA, state.irradiance.toFixed(0));
    publish(TOPICS.EFF, state.eff.toFixed(1));
    publish(TOPICS.CO2, state.co2.toFixed(2));
    publish(TOPICS.GRID, state.grid);

    emit("state", { state, history });
  }

  /* ------------------------------------------------------------------
   * Public API
   * ------------------------------------------------------------------ */
  const SGSim = {
    TOPICS,
    getState: () => ({ state, history }),
    log,
    subscribe,
    publish,
    on,

    /** Simulate the MQTT connection handshake. */
    connect() {
      state.connected = true;
      publish(TOPICS.CONNECT, `online · client=${state.clientId}`);
      emit("connect", { clientId: state.clientId, broker: "broker.hivemq.com:1883" });
      return state.clientId;
    },

    disconnect() {
      state.connected = false;
      emit("disconnect", {});
    },

    /** Remote load control (downstream command). */
    setLoad(key, watts) {
      state.loads[key] = watts;
      const topic = TOPICS.SETLOAD + "/" + key;
      publish(topic, watts);
      return watts;
    },

    start(intervalMs) {
      if (timer) return;
      timer = setInterval(step, intervalMs || 1600);
    },

    stop() {
      if (timer) { clearInterval(timer); timer = null; }
    },
  };

  window.SGSim = SGSim;
})();
