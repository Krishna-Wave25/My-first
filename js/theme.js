/* ============================================================
 * theme.js — Dark/Light theme controller
 * ------------------------------------------------------------
 * 1. A tiny inline snippet in <head> (injected into every page)
 *    applies the theme BEFORE first paint to avoid flashing.
 * 2. This module wires the toggle button, persists the choice,
 *    follows OS preference by default, and broadcasts a
 *    `theme:change` event so charts can re-color themselves.
 * ============================================================ */
(function () {
  "use strict";

  const STORAGE_KEY = "sg-theme";
  const root = document.documentElement;

  /** Read stored preference (safe against blocked storage). */
  function stored() {
    try { return localStorage.getItem(STORAGE_KEY); } catch (e) { return null; }
  }

  /** Persist the current preference. */
  function persist(theme) {
    try { localStorage.setItem(STORAGE_KEY, theme); } catch (e) { /* ignore */ }
  }

  /** Apply a theme and notify listeners. */
  function apply(theme) {
    root.setAttribute("data-theme", theme);
    window.dispatchEvent(new CustomEvent("theme:change", { detail: { theme } }));
  }

  /** Active theme ("dark" | "light"). */
  function get() { return root.getAttribute("data-theme") || "dark"; }

  /** Set + persist a theme. */
  function set(theme) { persist(theme); apply(theme); }

  /** Flip the current theme. */
  function toggle() { set(get() === "dark" ? "light" : "dark"); }

  /** Re-apply system preference (used when no manual choice). */
  function useSystem() {
    const light = window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches;
    apply(light ? "light" : "dark");
  }

  /** Public API used by main.js and page scripts. */
  window.SGTheme = { get, set, toggle, useSystem, STORAGE_KEY };

  /* Follow OS preference changes while the user has no manual choice. */
  const mq = window.matchMedia && window.matchMedia("(prefers-color-scheme: light)");
  if (mq && mq.addEventListener) {
    mq.addEventListener("change", () => { if (!stored()) useSystem(); });
  }

  /* Boot fallback: apply the persisted or OS theme on every page load.
     (Each page also carries an inline head snippet to avoid a first-paint
     flash; this guarantees correct state even if that snippet is absent.) */
  if (!root.getAttribute("data-theme")) {
    apply(stored() || ((mq && mq.matches) ? "light" : "dark"));
  }
})();
