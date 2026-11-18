// Theme choice: follow the phone, or always light or dark. Saved on this device only, not in backups.
// index.html runs the same logic in a small inline script before first paint, so keep the two in sync.

export type Theme = "system" | "light" | "dark";

const KEY = "jars-theme";
// Browser bar color for each look. Matches --bg in styles.css.
const BAR = { light: "#ffffff", dark: "#0b0d10" };

export function loadTheme(): Theme {
  try {
    const t = localStorage.getItem(KEY);
    return t === "light" || t === "dark" ? t : "system";
  } catch {
    return "system";
  }
}

/** Saves the choice and applies it right away. */
export function saveTheme(theme: Theme) {
  try {
    if (theme === "system") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, theme);
  } catch {
    // Still applies for this session.
  }
  applyTheme(theme);
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "system") delete root.dataset.theme;
  else root.dataset.theme = theme;
  // index.html has one theme-color tag per system scheme. A fixed choice makes both use its color.
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((m) => {
    m.content = theme === "system" ? BAR[m.media.includes("dark") ? "dark" : "light"] : BAR[theme];
  });
}
