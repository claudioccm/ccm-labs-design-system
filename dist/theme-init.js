/*! ccm-labs-design-system v0.2.0 — github.com/claudioccm/ccm-labs-design-system — built from src/, do not edit */
// Light or dark, before the page paints: the choice made with cm-theme-toggle if there is one, else the
// system setting. Load it in the head with a plain script tag (no defer, no type="module"), or paste it inline.
(() => {
  try {
    const theme = localStorage.getItem('cm-theme');
    if (theme === 'light' || theme === 'dark') document.documentElement.dataset.theme = theme;
  } catch { /* no storage: follow the system */ }
})();
