// theme.js — dark/light mode toggle. Dark is the default; the user's choice
// is remembered in localStorage. No flash-of-wrong-theme because this file
// is loaded (and applies the theme) before the rest of the page paints.

const STORAGE_KEY = "site-theme";

function getPreferredTheme() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return "dark"; // dark mode by default, per spec — ignore prefers-color-scheme
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  const btn = document.getElementById("theme-toggle");
  if (btn) btn.setAttribute("aria-pressed", theme === "light" ? "true" : "false");
}

// Apply immediately (this script is loaded with no `defer`, inline in <head>)
applyTheme(getPreferredTheme());

// Wire up the toggle button once the DOM is ready.
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("theme-toggle");
  if (!btn) return;
  btn.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme");
    const next = current === "light" ? "dark" : "light";
    localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
  });
});
