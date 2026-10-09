# CLAUDE.md — SolarGrid MPPT design system rules

Rules for turning Figma designs (via the Figma MCP server) into code in this repo.
Read this before writing any HTML, CSS or JS here.

**What this project is:** "SolarGrid MPPT", a marketing + demo site for an IoT solar
microgrid with MPPT. It is a **static multi-page site**: plain HTML, hand-written CSS
and vanilla JavaScript. No framework, no package manager, no bundler, no build step.

---

## TL;DR for Figma → code

1. **Output plain HTML + CSS, not React/Tailwind.** Figma MCP output (`get_design_context`)
   is usually React + Tailwind. Treat it as a reference and translate it into this repo's
   HTML structure and existing CSS classes.
2. **Map every Figma color, font, radius and shadow to a CSS variable** from `css/style.css`
   `:root`. Never paste raw hex values into new rules if a token exists.
3. **Reuse existing classes first:** `.container`, `.section`, `.section-head`, `.eyebrow`,
   `.card`, `.icn`, `.btn .btn-primary|.btn-ghost|.btn-outline-yellow`, `.grid-2|3|4`,
   `.chip`, `.grad-text`, `.reveal`.
4. **Every new surface must work in both themes.** Dark is the default; if you add a
   surface with a hardcoded dark color, add a `html[data-theme="light"]` override in
   `css/themes.css`.
5. **Don't touch the nav/footer in HTML.** They are injected by `js/main.js`; edit the
   `NAV_LINKS`, `RESOURCE_LINKS`, `FOOTER_COLS` arrays there.
6. **Follow the page skeleton** (below) for any new page, including the inline
   theme snippet in `<head>`.

---

## 1. Token definitions

### Where tokens live

| File | What it holds |
|---|---|
| `css/style.css` (`:root`, lines ~12–70) | All base tokens: colors, gradients, surfaces, fonts, radii, layout, shadows/glows. **Dark theme values.** |
| `css/themes.css` (`html[data-theme="light"]`) | Light-theme overrides of the same variables, plus per-component light fixes. |
| `js/main.js` → `chartTheme()` | Chart text/grid colors per theme (JS duplicates of CSS values). |
| `tools/generate_brochure.py` | RGB tuples of the same palette for the PDF brochure. |

### Format

Plain CSS custom properties. **No token pipeline**: no Style Dictionary, no JSON tokens,
no Tokens Studio, no preprocessor. Values are edited by hand.

```css
/* css/style.css */
:root {
  /* Brand colors */
  --navy-950: #05091c;  --navy-900: #08102b;  --navy-850: #0b1437;
  --navy-800: #101d4a;  --navy-700: #1a2a63;  --navy-600: #23357d;

  --yellow: #ffc800;  --yellow-soft: #ffd94d;
  --green:  #00e676;  --green-soft:  #5df5a3;
  --cyan:   #00e5ff;  --cyan-soft:   #6ef0ff;

  --white: #ffffff;                     /* = heading color (flips in light theme!) */
  --slate-100: #e9eefc; --slate-300: #b8c2e0;   /* body text = slate-300 */
  --slate-400: #8f9cc4; --slate-500: #66749e;   /* muted / captions */
  --red: #ff4d6d;  --orange: #ffab2e;

  /* Gradients */
  --grad-solar:  linear-gradient(135deg, #ffc800 0%, #ffab2e 50%, #ff7a00 100%);
  --grad-energy: linear-gradient(135deg, #00e5ff 0%, #00e676 100%);
  --grad-cta:    linear-gradient(90deg, #ffc800, #00e676);
  --grad-text:   linear-gradient(90deg, #ffc800, #ffab2e);

  /* Surfaces (translucent glass over the navy background) */
  --bg: var(--navy-950);
  --surface: rgba(255,255,255,0.035);
  --surface-strong: rgba(255,255,255,0.06);
  --surface-hover: rgba(255,255,255,0.09);
  --border: rgba(255,255,255,0.09);
  --border-strong: rgba(255,255,255,0.16);

  /* Typography */
  --font-head: 'Space Grotesk', sans-serif;
  --font-body: 'Inter', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;

  /* Layout */
  --container: 1200px;
  --radius-sm: 10px; --radius: 16px; --radius-lg: 24px; --radius-xl: 32px;
  --nav-h: 76px;

  /* Effects */
  --shadow: 0 20px 60px rgba(2,6,23,0.55);
  --glow-yellow: 0 0 24px rgba(255,200,0,0.35);
  --glow-green:  0 0 24px rgba(0,230,118,0.35);
  --glow-cyan:   0 0 24px rgba(0,229,255,0.35);
  --blur: blur(14px);
}
```

### Important quirk: names are semantic-by-role, not literal

In the light theme the **navy and white variables are inverted**:

```css
/* css/themes.css */
html[data-theme="light"] {
  --navy-900: #131f45;   /* still dark, used for text in light mode */
  --white:   #0a1128;    /* "white" becomes near-black ink */
  --slate-300: #3a4a74;
  --bg: #eef1f9;
  --surface: rgba(255,255,255,0.72);
  --border: rgba(20,32,66,0.12);
  --yellow: #e6a800;  --green: #00a65c;  --cyan: #0099c9;   /* darker for contrast */
}
```

So `color: var(--white)` means "heading/primary ink", not literally white. **Use the
variable, never `#fff`**, or the text disappears in light mode. (Several existing rules
do use `#fff` and then patch it in `themes.css` — don't copy that pattern.)

### Figma → token mapping

| Figma value | Use |
|---|---|
| Page background `#05091C` / `#08102B` | `var(--bg)` / `var(--navy-900)` |
| Headings, white text | `var(--white)` |
| Body text `#B8C2E0` | `var(--slate-300)` (inherited from `body`) |
| Secondary text `#8F9CC4` | `var(--slate-400)` |
| Captions/meta `#66749E` | `var(--slate-500)` |
| Solar yellow `#FFC800` | `var(--yellow)` (accent, eyebrows, primary data) |
| Electric green `#00E676` | `var(--green)` (success, battery, "live") |
| Cyan `#00E5FF` | `var(--cyan)` (IoT/data, hover glows) |
| Red `#FF4D6D` / orange `#FFAB2E` | `var(--red)` / `var(--orange)` (faults, warnings) |
| Translucent white fills (3–9%) | `var(--surface)` / `--surface-strong` / `--surface-hover` |
| 1px translucent strokes | `var(--border)` / `var(--border-strong)` |
| Yellow→green gradient | `var(--grad-cta)` |
| Corner radius 10/16/24/32 | `--radius-sm` / `--radius` / `--radius-lg` / `--radius-xl` |
| Buttons, icon tiles: radius 12–14 | literal `14px` (existing convention) |
| Pills/badges | `border-radius: 999px` |

If Figma uses a value with no token match, pick the nearest token. Only add a new
`:root` variable when the value is genuinely new to the system, and add its light-theme
counterpart in `css/themes.css` at the same time.

### Tinted accent recipe (used everywhere)

Accent badges, icon tiles and status pills use the accent color as rgba at low alpha:

```css
background: rgba(255, 200, 0, 0.06);       /* fill 6–14% */
border: 1px solid rgba(255, 200, 0, 0.28); /* border 25–40% */
color: var(--yellow);
```
RGB triplets: yellow `255,200,0` · green `0,230,118` · cyan `0,229,255` · red `255,77,109`.

---

## 2. Component library

There is no component framework. "Components" are **CSS classes + HTML patterns**,
plus a few **JS-rendered widgets** (template strings injected with `innerHTML` /
`insertAdjacentHTML`).

### Where they're defined

| File | Contents |
|---|---|
| `css/style.css` | Core system: reset, typography, `.eyebrow`, `.btn*`, `.nav`, hero, `.card`, `.grid-*`, sections, stat band, charts, dashboard (`.kpi`, `.alerts`, `.load-btn`), architecture, MPPT, timeline, contact form, CTA band, footer, responsive. Organized by `/* ---------- Section ---------- */` banners. |
| `css/components.css` | Newer widgets: energy-flow SVG (`.ef-*`), MQTT console, fault center (`.fault-*`, `.sev-*`), telemetry cards (`.tele-*`), weather, circuit diagram (`.circ-*`), hardware gallery, team, brochure, nav dropdown, footer socials. |
| `css/themes.css` | Light-theme overrides, theme toggle, loading screen, reduced-motion. |
| `js/main.js` | App shell: navbar, footer, loader, scroll reveal, counters, particles, dropdown, `sparkline()`, `chartTheme()`. |
| `js/energyflow.js` | `window.SGEnergyFlow` — animated SVG energy-flow diagram. |
| `js/sim.js` | `window.SGSim` — simulated MQTT telemetry engine for the dashboard. |
| `js/hardware.js`, `js/circuit.js`, `js/mppt.js`, `js/home.js`, `js/dashboard.js`, `js/charts.js` | Page-specific renderers (each an IIFE). |

### Documentation / Storybook

None. No Storybook, no pattern library page. `README.md` contains only a title.
The page HTML files are the de-facto examples. Good references:
- `index.html` — hero, cards, stat band, CTA band
- `dashboard.html` — KPIs, charts, alerts, console, fault table
- `contact.html` — form patterns

### Core patterns to reuse

**Section with header**
```html
<section class="section">
  <div class="container">
    <div class="section-head center reveal">
      <div class="eyebrow"><span class="dot"></span> Label</div>
      <h2>Heading with <span class="grad-text">accent</span></h2>
      <p>Supporting copy.</p>
    </div>
    <div class="grid-3"> … cards … </div>
  </div>
</section>
```

**Card with icon tile** (`.icn` variants: default yellow, `.cyan`, `.green`)
```html
<div class="card reveal reveal-d1">
  <div class="icn cyan"><span>&#128200;</span></div>
  <h3>Title</h3>
  <p>Description.</p>
</div>
```
`.card` already has: glass surface, `--radius-lg`, 30px padding, hover lift
(`translateY(-8px)`), and a gradient top bar that animates in on hover.

**Buttons**
```html
<a class="btn btn-primary" href="…">Primary</a>          <!-- yellow→green gradient, dark text -->
<a class="btn btn-ghost" href="…">Secondary</a>          <!-- glass, cyan glow on hover -->
<a class="btn btn-outline-yellow" href="…">Tertiary</a>
<a class="btn btn-primary btn-lg" href="…">Large</a>
```

**Pills**: `.eyebrow` (section label), `.chip` (mono meta tag), `.flag` (yellow tag),
`.live-pill`, `.conn-indicator` (`.disconnected` modifier), `.sev-critical|major|minor|cleared`.

**Inner page hero**
```html
<section class="page-hero">
  <canvas id="energyCanvas" data-particles aria-hidden="true"></canvas>
  <div class="container">
    <div class="eyebrow reveal visible"><span class="dot"></span> Page Name</div>
    <h1 class="reveal visible">Title <span class="grad-text">Accent</span></h1>
    <p class="reveal reveal-d1 visible">Intro.</p>
    <div class="crumbs reveal reveal-d2 visible"><a href="index.html">Home</a> <span>&#8250;</span> <span style="color:var(--yellow)">Page Name</span></div>
  </div>
</section>
```

### Naming convention

- Plain, short, hyphenated class names (`.kpi`, `.hero-panel`, `.alert-item`).
- Page/feature prefixes for scoped widgets: `.ef-` (energy flow), `.circ-` (circuit),
  `.tele-` (telemetry), `.fault-`, `.mqtt-`, `.arch-`, `.tl-` (timeline).
- Modifiers are extra classes, not BEM: `.icn.cyan`, `.fault-status.critical`,
  `.section-head.center`, `.split-col.problem`.
- New Figma components: pick a short prefix and follow the same style.

### JS-rendered component pattern

Data array + template string + inject. Each file is an IIFE that exposes at most one
`window.SG*` global.

```js
// js/hardware.js
(function () {
  "use strict";
  const ITEMS = [
    { name: "Solar Panel", role: "Power Source", img: `<svg viewBox="0 0 240 170">…</svg>`,
      desc: "…", specs: ["1.28 kWp array", "37.4 V Vmpp"] },
  ];
  // ...render ITEMS into a container with innerHTML
})();
```

---

## 3. Frameworks & libraries

| Concern | What's used |
|---|---|
| UI framework | **None.** Vanilla ES2015+ JavaScript, `"use strict"`, IIFEs, `window.SG*` globals. |
| Styling | **Plain CSS** with custom properties. No Sass, PostCSS, Tailwind or CSS-in-JS. |
| Charts | **Chart.js 4.4.1** from jsDelivr CDN — only on `dashboard.html`, `analytics.html`, `ai-forecasting.html`. |
| Fonts | Google Fonts `@import` at top of `css/style.css`: Space Grotesk, Inter, JetBrains Mono. |
| Build / bundler | **None.** No `package.json`. Files are served as-is (open `index.html` or any static server, e.g. GitHub Pages). |
| Tooling | `tools/generate_brochure.py` (Python + `fpdf2`) regenerates `assets/SolarGrid_MPPT_Brochure.pdf`. |

**Do not introduce** React, a bundler, npm dependencies or Tailwind when implementing a
Figma design unless the user explicitly asks to migrate.

### Script load order (matters)

```html
<!-- end of <body> -->
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script> <!-- only if charts -->
<script src="js/theme.js"></script>   <!-- always first: defines window.SGTheme -->
<script src="js/main.js"></script>    <!-- always: shell, defines chartTheme(), sparkline() -->
<script src="js/<page>.js"></script>  <!-- page-specific, after main.js -->
```
`dashboard.html` loads `sim.js` and `energyflow.js` before `main.js`, then `dashboard.js`.

---

## 4. Asset management

```
assets/
  logo.svg                       # brand mark (navy tile, sun + bolt gradients)
  favicon.svg
  SolarGrid_MPPT_Brochure.pdf    # generated by tools/generate_brochure.py
IoT_Solar_Microgrid_MPPT_Premium_Final.pptx   # presentation (repo root)
```

- Referenced with **relative paths** from the HTML root: `assets/logo.svg`.
- **No raster images** in the repo. Visuals are CSS (gradients, orbs, the CSS-drawn
  `.solar-panel`), inline SVG illustrations, or `<canvas>` particles.
- **No optimization pipeline** and **no CDN for own assets**. Only external CDNs:
  Google Fonts and jsDelivr (Chart.js).

When a Figma design includes images:
- Prefer SVG; export from Figma (`download_assets`) into `assets/` with lowercase,
  hyphenated names (`assets/battery-pack.svg`). For photos use `.webp`, sized for
  their display width, with `loading="lazy"` and meaningful `alt`.
- Decorative illustrations can be inline SVG (as in `js/hardware.js`); use token-matching
  hex values, since CSS variables don't apply inside standalone SVG files.

---

## 5. Icon system

There is **no icon library or sprite**. Three patterns exist:

1. **HTML entity / emoji glyphs** — the most common, inside `.icn` tiles and lists:
   `&#9889;` ⚡, `&#9728;` ☀, `&#128267;` 🔋, `&#128200;` 📈, `&#128225;` 📡,
   `&#9888;` ⚠, `&#10003;` ✓, `&#10005;` ✕, `&#10148;` ➤ (list bullets), `&#8250;` › (breadcrumbs).
2. **Inline stroke SVGs** (Feather/Lucide style: `viewBox="0 0 24 24"`, `fill="none"`,
   `stroke="currentColor"`, `stroke-width="2"`, round caps/joins). Used for UI chrome:
   theme toggle, footer socials, buttons.
   ```js
   // js/main.js
   function bookIcon() {
     return '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="…"/></svg>';
   }
   ```
3. **Illustrative SVGs** with hardcoded palette colors — hardware gallery
   (`js/hardware.js`), circuit diagram (`circuit.html`, `js/circuit.js`), energy flow
   (`js/energyflow.js`).

**Rules for new icons from Figma**
- UI icons: inline SVG, 24×24 viewBox, `stroke="currentColor"` so color comes from CSS
  (`.icn`, `.btn svg` already size them to 24px / 19px).
- If an icon is reused across pages, add a `xxxIcon()` helper function in `js/main.js`
  next to `githubIcon()`/`bookIcon()`, named `<thing>Icon`.
- Don't mix an emoji and an SVG icon in the same row of cards; match whatever the
  surrounding section uses.
- Decorative icons get `aria-hidden="true"`; icon-only buttons need `aria-label`.

---

## 6. Styling approach

- **Methodology:** global CSS, hand-organized by section banners. No CSS Modules,
  no scoping. Class names must be unique across the whole site — grep before adding.
- **Where to put new CSS:**
  - Generic / reusable → `css/style.css` in the matching section.
  - New page-specific widget → `css/components.css` under a new
    `/* ---------- Name ---------- */` banner.
  - Light-theme fixes → `css/themes.css`.
- **Global styles:** reset (`* { box-sizing: border-box; margin: 0; padding: 0 }`),
  `body` (Inter, `--slate-300`, 16px, line-height 1.65), headings (Space Grotesk, 700,
  `--white`, line-height 1.15), custom scrollbar, `::selection`, `.ambient` fixed
  background with three blurred orbs and a masked grid.
- **Typography scale:** fluid headings with `clamp()`, e.g.
  `.section-head h2 { font-size: clamp(30px, 4.4vw, 48px); letter-spacing: -0.02em; }`.
  Body copy 14.5–16.5px; mono labels 11–12.5px, often uppercase with
  `letter-spacing: .08em–.18em`. Numbers/telemetry use `var(--font-mono)`.
- **Motion:** easing `cubic-bezier(.2,.8,.3,1)`, ~.28s–.45s for hovers. Hover = lift
  (`translateY(-3px)` buttons, `-8px` cards) + glow token. Scroll reveal via
  `.reveal` (+ `.reveal-d1`…`.reveal-d6` stagger); `main.js` adds `.visible`.
  `prefers-reduced-motion` is already handled globally in `themes.css`.
- **Theming:** `<html data-theme="dark|light">`. Toggle via `window.SGTheme.toggle()`;
  preference in `localStorage["sg-theme"]`; follows the OS until the user chooses.
  JS that draws with colors (charts, canvas) must listen for the event:
  ```js
  window.addEventListener("theme:change", () => { const t = chartTheme(); /* re-color */ });
  ```

### Responsive design

Desktop-first `max-width` media queries at the **bottom** of each stylesheet,
with three breakpoints:

| Breakpoint | Typical changes |
|---|---|
| `≤1024px` | `.grid-4`/`.kpi-grid` → 2 cols; hero, dashboard, split, contact → 1 col; footer → 2 cols |
| `≤768px` | Nav links hidden, burger shown; `.grid-2`/`.grid-3` → 1 col; flows go vertical; `.section` padding 110px → 80px |
| `≤480px` | Remaining multi-col grids → 1 col |

Layout tools: CSS Grid for page layouts (`grid-template-columns: repeat(n, 1fr)` or
fractional like `1.4fr 1fr`), Flexbox for rows/alignment, `.container` =
`width: min(1200px, 92%)`. Add a new component's breakpoint rules to the
existing `@media` blocks rather than creating new breakpoints.

When implementing a Figma frame: map the desktop frame to the default styles, then
the tablet/mobile frames to the 1024 / 768 / 480 blocks.

### Inline styles

Many pages use one-off `style="…"` attributes (e.g. `style="padding-top:20px"`,
`style="color:var(--slate-400)"`). Acceptable for a single tweak, but for anything
repeated or more than two properties, create a class. Inline styles must still
use tokens, never raw hex.

---

## 7. Project structure

```
/                      # site root — every page is a top-level .html file
  index.html           # home (hero, problem/solution, flow, stats, CTA)
  dashboard.html       # live simulated IoT dashboard (Chart.js + SGSim)
  architecture.html  mppt.html  analytics.html  ai-forecasting.html
  security.html  applications.html  future.html  contact.html
  circuit.html  hardware.html  team.html  brochure.html   # "Resources" pages
  css/
    style.css          # tokens + core system + responsive
    components.css     # widget styles
    themes.css         # light theme, toggle, loader, reduced motion
  js/
    theme.js  main.js  # shared on every page
    <page>.js          # one script per interactive page
  assets/              # logo, favicon, brochure PDF
  tools/generate_brochure.py
  README.md            # title only
```

**Feature organization pattern:** one page = one HTML file + (optionally) one
`js/<page>.js` + its styles in a banner section of `style.css` or `components.css`.

### New page skeleton (copy this)

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="description" content="…" />
  <title>Page Name | SolarGrid MPPT</title>
  <link rel="icon" href="assets/favicon.svg" type="image/svg+xml" />
  <link rel="stylesheet" href="css/style.css" />
  <link rel="stylesheet" href="css/themes.css" />
  <link rel="stylesheet" href="css/components.css" />
  <script>
  (function () {
    try {
      var t = localStorage.getItem("sg-theme");
      if (!t) t = (window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches) ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", t);
    } catch (e) {}
  })();
  </script>
</head>
<body>
  <div class="ambient" aria-hidden="true">
    <div class="orb orb-1"></div><div class="orb orb-2"></div><div class="orb orb-3"></div>
  </div>
  <header id="nav"></header>       <!-- filled by js/main.js -->
  <main>
    <section class="page-hero">…</section>
    <section class="section">…</section>
  </main>
  <!-- footer is injected by js/main.js -->
  <script src="js/theme.js"></script>
  <script src="js/main.js"></script>
</body>
</html>
```
Then register the page in `NAV_LINKS` or `RESOURCE_LINKS` (and `FOOTER_COLS` if
relevant) in `js/main.js`.

### Built-in data attributes

| Attribute | Effect (handled by `js/main.js`) |
|---|---|
| `data-count="98" data-suffix="%" data-decimals="1"` | Animated counter when scrolled into view |
| `data-particles` on a `<canvas>` | Energy particle background |
| `data-spark`, `data-spark-color` | Sparkline |
| `data-load`, `data-comp` | Dashboard load toggles / circuit component selection (page JS) |

---

## Figma MCP workflow checklist

1. Load the Figma design-to-code skill, then `get_design_context` (and
   `get_screenshot` for visual reference) for the node.
2. Run `get_variable_defs` and map each Figma variable to the tokens in §1.
3. Identify which existing classes cover the frame (§2). Write new CSS only for what's left.
4. Write semantic HTML in the page skeleton (§7); no React, no Tailwind classes.
5. Export any needed images/icons to `assets/` or inline SVG per §4–5.
6. Add responsive rules into the existing 1024/768/480 blocks (§6).
7. Check both themes: toggle to light and fix any hardcoded colors in `css/themes.css`.
8. Add `.reveal` (with stagger classes) to match the site's entrance animation.
