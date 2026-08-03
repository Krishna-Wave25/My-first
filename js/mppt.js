/* ============================================================
   MPPT page — animated P-V curve with tracking dot
   ============================================================ */

(function () {
  const canvas = document.getElementById("pvCurve");
  const dot = document.getElementById("mppDot");
  if (!canvas || !dot) return;

  const ctx = canvas.getContext("2d");
  const DPR = Math.min(window.devicePixelRatio || 1, 2);

  let W = 0, H = 0;
  const padL = 44, padR = 16, padT = 16, padB = 40;

  function resize() {
    const box = canvas.parentElement.getBoundingClientRect();
    W = box.width; H = box.height;
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  /* Physical model */
  const Voc = 45, Isc = 8.5;
  function pCurve(v, irr) {
    const voc = Voc * irr, isc = Isc * irr;
    const I = isc * (1 - Math.exp((v - voc) / (0.14 * voc)));
    return { I: Math.max(0, I), P: Math.max(0, v * I) };
  }
  function findPeak(irr) {
    let best = { v: 0, P: 0 };
    for (let v = 0; v <= 48; v += 0.25) {
      const { P } = pCurve(v, irr);
      if (P > best.P) best = { v, P };
    }
    return best;
  }

  function plot() {
    const voc = Voc, isc = Isc;
    const vMax = 50, pMax = 420;
    const iw = W - padL - padR, ih = H - padT - padB;
    const toX = (v) => padL + (v / vMax) * iw;
    const toYp = (p) => padT + ih - (p / pMax) * ih;

    ctx.clearRect(0, 0, W, H);

    /* grid + axis */
    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.fillStyle = "#66749e";
    ctx.font = "10px JetBrains Mono, monospace";
    ctx.lineWidth = 1;
    ctx.textAlign = "right";
    for (let p = 0; p <= pMax; p += 100) {
      const y = toYp(p);
      ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W - padR, y); ctx.stroke();
      ctx.fillText(p + " W", padL - 8, y + 3);
    }
    for (let v = 0; v <= vMax; v += 10) {
      const x = toX(v);
      ctx.beginPath(); ctx.moveTo(x, padT); ctx.lineTo(x, H - padB); ctx.stroke();
      ctx.textAlign = "center";
      ctx.fillText(v + " V", x, H - padB + 16);
    }

    /* ambient 3 curves (low / mid / high irradiance) */
    const irrs = [0.4, 0.7, 1.0];
    const cols = ["rgba(255,200,0,0.18)", "rgba(255,200,0,0.4)", "rgba(255,200,0,0.85)"];
    irrs.forEach((irr, idx) => {
      ctx.beginPath();
      let first = true;
      for (let v = 0; v <= vMax; v += 0.5) {
        const { P } = pCurve(v, irr);
        const x = toX(v), y = toYp(P);
        if (first) { ctx.moveTo(x, y); first = false; } else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = cols[idx];
      ctx.lineWidth = idx === 2 ? 2.6 : 1.4;
      ctx.stroke();
    });

    /* fixed voltage operating point (no MPPT) */
    const fv = 32;
    const fx = toX(fv), fy = toYp(pCurve(fv, 1).P);
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = "rgba(255,255,255,0.45)";
    ctx.beginPath(); ctx.moveTo(fx, padT); ctx.lineTo(fx, H - padB); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx, fy); ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.beginPath(); ctx.arc(fx, fy, 4, 0, Math.PI * 2); ctx.fill();
    ctx.setLineDash([]);
  }

  /* Animation loop */
  let t = 0;
  function animate() {
    t += 0.016;
    /* slow irradiance cycle: high at noon (t phases), some noise */
    const irr = 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(t * 0.35)) + 0.05 * Math.sin(t * 1.7);
    const peak = findPeak(Math.min(1, Math.max(0.3, irr)));
    plot();

    /* oscillate around peak like P&O */
    const osc = 0.7 * Math.sin(t * 4.2);
    const vNow = peak.v + osc;
    const pNow = pCurve(vNow, Math.min(1, Math.max(0.3, irr))).P;

    const vMax = 50, pMax = 420;
    const iw = W - padL - padR, ih = H - padT - padB;
    const x = padL + (vNow / vMax) * iw;
    const y = padT + ih - (pNow / pMax) * ih;

    dot.style.left = (x / W) * 100 + "%";
    dot.style.bottom = ((H - y) / H) * 100 + "%";
    requestAnimationFrame(animate);
  }

  resize();
  window.addEventListener("resize", resize, { passive: true });
  requestAnimationFrame(animate);
})();
