/*! ccm-labs-design-system v0.2.0 — github.com/claudioccm/ccm-labs-design-system — built from src/, do not edit */
(() => {
/**
 * Flips the page between the light look and its dark twin, and remembers the choice in this browser.
 * It wraps a native button and never renders markup of its own (PRINCIPLES.md §3).
 *
 * The page follows the system setting until a choice is made. Choosing the system's own look again forgets
 * the choice, so the page goes back to following the system. The choice is applied before paint by
 * theme-init.js, which belongs in the page's head.
 *
 * @element cm-theme-toggle
 * @purpose The behaviour of the theme toggle: flips data-theme on the root between light and dark, keeps
 *   aria-pressed on its button in step, and stores the choice under "cm-theme" in localStorage.
 * @markup
 *   <cm-theme-toggle>
 *     <button type="button" class="theme-toggle" aria-label="Dark mode" aria-pressed="false">
 *       <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.25" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M8 1.75a6.25 6.25 0 0 1 0 12.5z" fill="currentColor"/></svg>
 *     </button>
 *   </cm-theme-toggle>
 * @nojs hidden — Without JavaScript the toggle is not shown and the page follows the system setting.
 * @fires {CustomEvent<{theme: 'light' | 'dark'}>} cm-theme-change - On the document, after the theme flips.
 * @do Load theme-init.js in the head as well, so a stored choice is applied before the page paints.
 * @dont Give it anything but one button to wrap, or set data-theme on the root from your own code.
 */
class CmThemeToggle extends HTMLElement {
  static storageKey = 'cm-theme';

  #dark = matchMedia('(prefers-color-scheme: dark)');

  connectedCallback() {
    this.addEventListener('click', this);
    this.#dark.addEventListener('change', this);
    document.addEventListener('cm-theme-change', this);
    // The button may not be parsed yet if this script ran from the head.
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', this, { once: true });
    this.#show();
  }

  disconnectedCallback() {
    this.removeEventListener('click', this);
    this.#dark.removeEventListener('change', this);
    document.removeEventListener('cm-theme-change', this);
  }

  handleEvent(event) {
    if (event.type === 'click') {
      if (event.target.closest('button') && this.contains(event.target)) this.#flip();
    } else this.#show();
  }

  get #system() {
    return this.#dark.matches ? 'dark' : 'light';
  }

  get #now() {
    return document.documentElement.dataset.theme || this.#system;
  }

  #flip() {
    const root = document.documentElement, key = CmThemeToggle.storageKey;
    const next = this.#now === 'dark' ? 'light' : 'dark';
    if (next === this.#system) delete root.dataset.theme; else root.dataset.theme = next;
    try {
      if (next === this.#system) localStorage.removeItem(key); else localStorage.setItem(key, next);
    } catch { /* no storage: the choice lasts for this page only */ }
    document.dispatchEvent(new CustomEvent('cm-theme-change', { detail: { theme: next } }));
  }

  #show() {
    this.querySelector('button')?.setAttribute('aria-pressed', String(this.#now === 'dark'));
  }
}

if (!customElements.get('cm-theme-toggle')) customElements.define('cm-theme-toggle', CmThemeToggle);
})();
