/* ============================================================
 * main.js — Shared app shell (injected into every page)
 * ------------------------------------------------------------
 * Responsibilities:
 *   - render navbar (with theme toggle + Resources dropdown)
 *   - render footer (with GitHub / documentation links)
 *   - hide the loading screen once the page is ready
 *   - scroll-reveal animations, animated counters
 *   - canvas particle backgrounds
 *   - broadcast chart colour refresh on theme change
 * ============================================================ */

"use strict";

const SITE = {
  name: "SolarGrid MPPT",
  subtitle: "IoT MICROGRID SYSTEM",
  github: "https://github.com/solargrid-mppt/solar-microgrid-mppt",
  docs: "brochure.html",
};

/* Top-level navigation (keep this lean; extra pages live in "Resources") */
const NAV_LINKS = [
  { label: "Home", href: "index.html" },
  { label: "Dashboard", href: "dashboard.html" },
  { label: "Architecture", href: "architecture.html" },
  { label: "MPPT", href: "mppt.html" },
  { label: "Analytics", href: "analytics.html" },
  { label: "AI Forecasting", href: "ai-forecasting.html" },
  { label: "Security", href: "security.html" },
  { label: "Applications", href: "applications.html" },
  { label: "Future", href: "future.html" },
  { label: "Contact", href: "contact.html" },
];

/* Dropdown group for documentation-style pages */
const RESOURCE_LINKS = [
  { label: "Circuit Diagram", href: "circuit.html" },
  { label: "Hardware Gallery", href: "hardware.html" },
  { label: "Team & About", href: "team.html" },
  { label: "IEEE Brochure (PDF)", href: "assets/SolarGrid_MPPT_Brochure.pdf" },
  { label: "Documentation", href: "brochure.html" },
];

const FOOTER_COLS = [
  {
    title: "Platform",
    links: [
      { label: "Live Dashboard", href: "dashboard.html" },
      { label: "System Architecture", href: "architecture.html" },
      { label: "MPPT Technology", href: "mppt.html" },
      { label: "Energy Analytics", href: "analytics.html" },
    ],
  },
  {
    title: "Intelligence",
    links: [
      { label: "AI Forecasting", href: "ai-forecasting.html" },
      { label: "Security Layer", href: "security.html" },
      { label: "Applications", href: "applications.html" },
      { label: "Future Scope", href: "future.html" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Circuit Diagram", href: "circuit.html" },
      { label: "Hardware Gallery", href: "hardware.html" },
      { label: "Team & About", href: "team.html" },
      { label: "IEEE Brochure (PDF)", href: "assets/SolarGrid_MPPT_Brochure.pdf" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Contact Us", href: "contact.html" },
      { label: "Project Overview", href: "index.html#about" },
      { label: "Problem & Solution", href: "index.html#problem" },
      { label: "Get a Demo", href: "contact.html" },
    ],
  },
];

const SOCIALS = [
  { label: "GitHub", href: SITE.github, icon: githubIcon() },
  { label: "Documentation", href: "brochure.html", icon: bookIcon() },
  { label: "IEEE", href: "https://www.ieee.org", icon: ieeeIcon() },
];

/* ---------- Helpers ---------- */
function currentPage() {
  return (location.pathname.split("/").pop() || "index.html").toLowerCase();
}
function activeCls(href) {
  return href === currentPage() ? " active" : "";
}

/* ---------- Navbar ---------- */
function buildNav() {
  const current = currentPage();
  const links = NAV_LINKS.map((l) => `<a class="${activeCls(l.href).trim()}" href="${l.href}">${l.label}</a>`).join("");

  const resLinks = RESOURCE_LINKS.map((l) => `<a href="${l.href}">${l.label}</a>`).join("");

  const burgerLinks = [...NAV_LINKS, ...RESOURCE_LINKS].map((l, i) => {
    const active = l.href === current ? ' style="color:var(--yellow)"' : "";
    return `<a href="${l.href}" ${active}><span>${l.label}</span><span class="idx">0${String(i + 1).padStart(2, "0").slice(-2)}</span></a>`;
  }).join("");

  const nav = document.getElementById("nav");
  nav.insertAdjacentHTML("afterbegin", `
    <div class="nav-inner container">
      <a href="index.html" class="logo" aria-label="SolarGrid MPPT home">
        <img src="assets/logo.svg" alt="SolarGrid MPPT logo" class="logo-img" />
        <span class="logo-text">
          <strong>${SITE.name}</strong>
          <span>${SITE.subtitle}</span>
        </span>
      </a>
      <nav class="nav-links" aria-label="Primary">
        ${links}
        <div class="dropdown">
          <a class="drop-trigger" href="#" onclick="return false">Resources <span class="caret"></span></a>
          <div class="dropdown-menu">${resLinks}</div>
        </div>
      </nav>
      <div class="nav-cta">
        <button class="theme-toggle" id="themeToggle" aria-label="Toggle dark / light theme" title="Toggle theme">
          <span class="icon-moon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/></svg>
          </span>
          <span class="icon-sun">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>
          </span>
        </button>
        <a href="assets/SolarGrid_MPPT_Brochure.pdf" class="btn btn-primary" download>Brochure</a>
        <button class="burger" id="burger" aria-label="Menu"><span></span><span></span><span></span></button>
      </div>
    </div>
  `);
  nav.insertAdjacentHTML("beforeend", `<div class="mobile-menu" id="mobileMenu">${burgerLinks}</div>`);

  /* Theme toggle */
  document.getElementById("themeToggle").addEventListener("click", () => window.SGTheme.toggle());

  /* Mobile menu */
  const burger = document.getElementById("burger");
  const menu = document.getElementById("mobileMenu");
  burger.addEventListener("click", () => {
    const open = menu.classList.toggle("open");
    burger.classList.toggle("open", open);
    document.body.style.overflow = open ? "hidden" : "";
  });
  menu.addEventListener("click", (e) => {
    if (e.target.closest("a")) {
      menu.classList.remove("open");
      burger.classList.remove("open");
      document.body.style.overflow = "";
    }
  });
}

/* ---------- Footer ---------- */
function buildFooter() {
  const cols = FOOTER_COLS.map((c) => `
    <div class="footer-col">
      <h4>${c.title}</h4>
      ${c.links.map((l) => `<a href="${l.href}" ${l.href.endsWith(".pdf") ? 'download' : ""}>${l.label}</a>`).join("")}
    </div>`).join("");

  const socials = SOCIALS.map((s) => `<a href="${s.href}" target="_blank" rel="noopener" aria-label="${s.label}" title="${s.label}">${s.icon}</a>`).join("");

  const footer = document.getElementById("footer");
  footer.insertAdjacentHTML("afterbegin", `
    <div class="container">
      <div class="footer-top">
        <div class="footer-brand">
          <a href="index.html" class="logo">
            <img src="assets/logo.svg" alt="SolarGrid MPPT logo" class="logo-img" style="width:38px;height:38px" />
            <span class="logo-text">
              <strong>${SITE.name}</strong>
              <span>${SITE.subtitle}</span>
            </span>
          </a>
          <p>Intelligent solar microgrid management powered by IoT, MPPT optimization, and real-time energy analytics. A final-year engineering project platform.</p>
          <div class="footer-socials">${socials}</div>
        </div>
        ${cols}
      </div>
      <div class="footer-bottom">
        <span>&copy; <span id="year"></span> SolarGrid MPPT · IEEE-style project showcase</span>
        <span class="mono">IoT · MPPT · MQTT · Cloud · AI</span>
      </div>
    </div>`);
  document.getElementById("year").textContent = new Date().getFullYear();
}

/* ---------- Navbar scroll state ---------- */
function initNavScroll() {
  const nav = document.getElementById("nav");
  const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 30);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
}

/* ---------- Loading screen ---------- */
function initLoader() {
  const loader = document.getElementById("loader");
  if (!loader) return;
  const hide = () => {
    loader.classList.add("hidden");
    document.body.classList.add("page-fade");
  };
  if (document.readyState === "complete") setTimeout(hide, 900);
  else window.addEventListener("load", () => setTimeout(hide, 900));
  /* Safety: never leave the loader up > 5s */
  setTimeout(() => loader.classList.add("hidden"), 5000);
}

/* ---------- Scroll reveal ---------- */
function initReveal() {
  const items = document.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window)) {
    items.forEach((el) => el.classList.add("visible"));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => entries.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add("visible"); io.unobserve(en.target); }
    }),
    { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
  );
  items.forEach((el) => io.observe(el));
}

/* ---------- Animated counters ---------- */
function initCounters() {
  document.querySelectorAll("[data-count]").forEach((el) => {
    const target = parseFloat(el.dataset.count);
    const dec = parseInt(el.dataset.decimals || "0", 10);
    const suffix = el.dataset.suffix || "";
    const duration = parseInt(el.dataset.duration || "2000", 10);
    let started = false;

    const run = () => {
      if (started) return;
      started = true;
      const t0 = performance.now();
      const step = (now) => {
        const p = Math.min((now - t0) / duration, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = (target * eased).toFixed(dec) + suffix;
        if (p < 1) requestAnimationFrame(step);
        else el.textContent = target.toFixed(dec) + suffix;
      };
      requestAnimationFrame(step);
    };

    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver((en) => {
        en.forEach((e) => { if (e.isIntersecting) { run(); io.unobserve(e.target); } });
      }, { threshold: 0.4 });
      io.observe(el);
    } else run();
  });
}

/* ---------- Canvas particle field ---------- */
function initParticles() {
  document.querySelectorAll("canvas[data-particles]").forEach((canvas) => {
    const ctx = canvas.getContext("2d");
    const parent = canvas.parentElement;
    const colors = ["255,200,0", "0,229,255", "0,230,118"];
    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    let w, h, dots = [];

    const spawn = (anywhere) => ({
      x: Math.random() * w,
      y: anywhere ? Math.random() * h : h + 10,
      r: Math.random() * 2 + 0.6,
      vy: -(Math.random() * 0.7 + 0.25),
      vx: (Math.random() - 0.5) * 0.25,
      a: Math.random() * 0.5 + 0.15,
      c: colors[Math.floor(Math.random() * colors.length)],
      tw: Math.random() * Math.PI * 2,
    });

    const resize = () => {
      const r = parent.getBoundingClientRect();
      w = r.width; h = r.height;
      canvas.width = w * DPR; canvas.height = h * DPR;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      dots = Array.from({ length: Math.min(70, Math.floor((w * h) / 16000)) }, () => spawn(true));
    };

    const tick = () => {
      ctx.clearRect(0, 0, w, h);
      dots.forEach((d, i) => {
        d.x += d.vx; d.y += d.vy; d.tw += 0.03;
        const alpha = d.a * (0.6 + 0.4 * Math.sin(d.tw));
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${d.c},${alpha})`;
        ctx.fill();
        if (d.y < -10) dots[i] = spawn(false);
      });
      requestAnimationFrame(tick);
    };

    resize();
    tick();
    window.addEventListener("resize", resize, { passive: true });
  });
}

/* ---------- Chart theme helper (shared with charts/dashboard) ---------- */
function chartTheme() {
  const light = (document.documentElement.getAttribute("data-theme") || "dark") === "light";
  return {
    text: light ? "#4b5a86" : "#8f9cc4",
    grid: light ? "rgba(20,32,66,0.10)" : "rgba(255,255,255,0.06)",
    tick: light ? "#7a87ad" : "#8f9cc4",
  };
}

/* ---------- Boot ---------- */
document.addEventListener("DOMContentLoaded", () => {
  buildNav();
  buildFooter();
  initNavScroll();
  initLoader();
  initReveal();
  initCounters();
  initParticles();
  initSpark();
  initDropdown();
});

function initSpark() {
  document.querySelectorAll("[data-spark]").forEach((el) => {
    const pts = (el.dataset.spark || "1,2,1.5,2.5,2,3,2.2").split(",").map(Number);
    sparkline(el, pts, el.dataset.sparkColor || "#00e676");
  });
}

function initDropdown() {
  document.querySelectorAll(".dropdown").forEach((dd) => {
    const trigger = dd.querySelector(".drop-trigger");
    trigger.addEventListener("click", (e) => {
      e.preventDefault();
      const open = dd.classList.toggle("open");
      document.querySelectorAll(".dropdown.open").forEach((other) => { if (other !== dd) other.classList.remove("open"); });
      if (open) {
        const close = (ev) => { if (!dd.contains(ev.target)) { dd.classList.remove("open"); document.removeEventListener("click", close); } };
        setTimeout(() => document.addEventListener("click", close), 0);
      }
    });
  });
}

/* ---------- Sparkline SVG helper ---------- */
function sparkline(el, points, color, fill = true) {
  if (!el) return;
  const W = 300, H = 60;
  const max = Math.max(...points), min = Math.min(...points);
  const range = max - min || 1;
  const step = W / (points.length - 1);
  const coords = points.map((p, i) => [i * step, H - 6 - ((p - min) / range) * (H - 12)]);
  const line = coords.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${W},${H} L0,${H} Z`;
  const gid = "spk" + Math.random().toString(36).slice(2, 7);
  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" style="width:100%;height:100%">
    <defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${color}" stop-opacity="0.28"/>
      <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
    </linearGradient></defs>
    ${fill ? `<path d="${area}" fill="url(#${gid})"/>` : ""}
    <path d="${line}" fill="none" stroke="${color}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}

/* ---------- Inline SVG icon helpers for the footer ---------- */
function githubIcon() {
  return '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 .5A11.5 11.5 0 0 0 .5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.56v-2c-3.2.7-3.87-1.54-3.87-1.54-.53-1.34-1.28-1.7-1.28-1.7-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.23-1.28-5.23-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.41-2.69 5.38-5.25 5.67.41.35.77 1.05.77 2.12v3.15c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12 11.5 11.5 0 0 0 12 .5z"/></svg>';
}
function bookIcon() {
  return '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>';
}
function ieeeIcon() {
  return '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3.1 6.3L22 9.3l-5 4.9 1.2 6.9L12 17.8 5.8 21.1 7 14.2 2 9.3l6.9-1z"/></svg>';
}
