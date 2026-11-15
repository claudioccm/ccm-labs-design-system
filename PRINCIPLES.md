# CM Design System: principles

Started 2026-11-15; v0.1.0 was built on it and v0.2.0 followed the first three adoptions. Each principle is marked **Agreed**, **Proposed** or **Open**.
Agreed items change only with a reason written down here. How to apply them day to day is in `AGENTS.md`.

## What this is

The **house design system** for Claudio's internal pet projects: one canonical home for the house look (ink on
paper and its dark twin, Switzer and Montagu Slab, colour only for state) built on the CUBE method we already
use (Utopia tokens, Every Layout composition, CUBE layers).

Out of scope: client projects. Each client has its own particularities and keeps its own system. See
[Parked](#parked).

---

## Principles

### 1. Platform first — Agreed

Prefer, in order: a native HTML element, a light-DOM custom element, a framework component.

- `<dialog>`, `popover`, `<details name>`, invoker commands (`commandfor`) and customizable `<select>`
  come before any JavaScript.
- Framework components (Vue, Astro) are mainly **wrappers for a data layer**: they fetch or receive data
  and output the system's markup. They don't own styling or behaviour.

### 2. The cascade is a feature — Agreed

Global styles do most of the work. One fixed layer order. No shadow DOM, because it cuts the cascade that
CUBE depends on.

- Layer order (from our most mature client setup): `reset, defaults, tokens, themes, composition, components, utils, overrides`.

### 3. Custom elements wrap native elements — Agreed

Molecules and organisms can be custom elements that **wrap** native markup and add behaviour. They never
**render** their own children.

```html
<cm-filter-bar>
  <form class="cluster">
    <label>Search <input type="search" name="q"></label>
    <button>Filter</button>
  </form>
</cm-filter-bar>
```

- The markup is authored or server-rendered inside the element, so it works and shows before JS runs.
- The element only enhances: wiring events, syncing state, managing focus.
- Data-driven organisms are rendered by the project's templating (principle 1); the element enhances the result.
- Open edge: where "enhance" ends and "render" begins (for example, a filter bar that re-sorts a list).
  Settle it on the first real case.

**Enforcement.** Agents forget this rule, so it is enforced in two ways, not just written down:

1. **Instructions:** `AGENTS.md` states the rule with a right and a wrong example, and each element's header
   comment repeats it in one line.
2. **Checks that fail the build:**
   - A lint rule on element classes (`npm run check`): no `innerHTML`, `insertAdjacentHTML`,
     `replaceChildren`, `createElement`, template cloning or `attachShadow`. Moving or toggling existing
     children is fine.
   - A no-JS run of the specimen page (`npm test`, a browser test with JavaScript disabled) that asserts
     every example's content is present and visible.

### 4. CUBE roles — Agreed

- **Composition** owns layout (Every Layout primitives: stack, cluster, grid, switcher, center, ...).
- **Utilities** make single adjustments.
- **Blocks** own meaning.
- **Exceptions** express state through data attributes (`data-state`, `data-variant`).
- **Callers own placement:** a block never sets its own outer margin or position. The parent composition does.

### 5. Intrinsic and fluid — Agreed

Utopia type and space scales. Every Layout primitives for layout. No breakpoints inside blocks; a block
adapts to its container, not the viewport.

Two type scales share the same `--step-n` names, switched by an attribute on the root or on any element:
`data-density="tool"` (dense tools such as the command center, 12–14px body) and the default, "read"
(reading pages such as claudiomendonca.com, 16–17px body). Blocks never know which scale is active: they
read five roles (`--text-label`, `--text-body`, `--text-lead`, `--text-title`, `--text-display`), and each
scale points the roles at its own steps. The space scale is the same in both densities.

### 6. Tiered tokens, Utopia names — Agreed

`primitive` → `semantic` → private block variable (`--_block-prop`). Blocks read only semantic tokens.

Names follow Utopia's own output, unchanged, so a scale can be regenerated from the calculator and pasted in:

- Type: `--step--2` … `--step-9`
- Space: `--space-3xs` … `--space-3xl`, one-up pairs (`--space-s-m`) and custom pairs (`--space-s-l`)
- Composition spacing attribute: `data-space` (Every Layout's name; one name, no alias).

Each generated scale sits between markers that carry its calculator link. Changing the link and running
`npm run tokens` regenerates it; `npm run check` fails if the lines were edited by hand.

The tiers in practice: `--color-*` are the primitives, and only the theme reads them. Colour roles (`--fg`,
`--bg`, `--muted`, `--rule`, `--ok`, `--ask`, `--trouble`…), the Utopia scales and the `--text-*` roles are
what blocks read.

### 7. House look only — Agreed

This system is the house look, not a kit for all work. The `themes` layer holds the light look and its dark
twin and nothing else. There is no multi-brand theming.

The dark twin is written once, with CSS `light-dark()`. The page follows the system setting; `data-theme` on
the root overrides it (the theme toggle sets it), and `data-theme="dark"` on any other element pins that
surface to the dark twin.

### 8. One contract, many renderers — Agreed

Declarative: a block's contract is its HTML markup — element structure, class names, data attributes and the
tokens it reads. Vue, Astro and plain HTML are renderers that all output that same markup. Docs show the
markup first.

### 9. Progressive behaviour — Agreed

Everything works without JS where the platform allows it. JS enhances. A block whose core job fails without
JS says so in its header comment.

### 10. Agent first — Agreed

No docs platform. The code documents itself, in three outputs from one source:

1. **Header comment in every block file**, in a fixed format:

   ```css
   /**
    * @block   cm-popover
    * @purpose Panel for settings and detail, opened from a button.
    * @markup
    *   <button popovertarget="p1">Details</button>
    *   <div id="p1" popover class="popover">…</div>
    * @tokens  --bg --fg --rule --shadow
    * @states  data-state="open"
    * @do      Close with a quiet "Close" text button.
    * @dont    Use an ✕ icon, or nest popovers.
    */
   ```

2. **An index generated from those headers:** `llms.txt` plus a short `AGENTS.md`, so an agent finds the
   right file without reading them all.
3. **The specimen page**, rendering each block's `@markup` example. It is the visual doc for people and the
   visual test, and it is where the no-JS check from principle 3 runs.

**Tooling:** the KSS idea (a living style guide generated from CSS comments) without the KSS tool, whose
last release was in 2022. A small parser of our own (`tools/lib/headers.js`) reads the headers; the specimen,
`llms.txt`, `llms-full.txt`, the index in `AGENTS.md` and the header check all come from it. Borrowed from
KSS: each listed state is rendered as its own specimen example. Custom elements are documented with JSDoc on
the class, from which the standard Custom Elements Manifest (`custom-elements.json`) is also generated.

Because the specimen renders the same examples the comments hold, a stale comment shows up as a broken
specimen. A check fails the build when a file has no header, a header is missing a required field, or a
block's `@tokens` list differs from the tokens its CSS reads.

### 11. Borrow the hard parts — Agreed

Never hand-roll complex interactive widgets (combobox, menu, tabs, date picker, tree). Take their behaviour
from a small, deliberately chosen set of systems we admire, then style them with our tokens. See
[Sources we admire](#sources-we-admire).

### 12. Small and deletable — Agreed

Nothing becomes a block until it has appeared in two projects. Anything unused for six months is a
candidate for deletion.

---

## Distribution — Proposed

A **public** repo on Claudio's personal GitHub (`claudioccm`). Public means no access tokens for anyone or
any agent that uses it.

Start with GitHub alone; add npm only if it starts to hurt:

| Consumer | How it gets the system |
| --- | --- |
| Nuxt, Astro, Vite projects | Git dependency on a tag: `github:claudioccm/ccm-labs-design-system#v0.2.0`, imported as the first line of the project's own stylesheet |
| Plain HTML pages | jsDelivr's GitHub route: `https://cdn.jsdelivr.net/gh/claudioccm/ccm-labs-design-system@0.2/dist/cm.css` |
| Apps that must work offline, or that allow no outside script | A pinned copy of `dist/` kept in the project and refreshed by a script, never edited |

- The built files (`dist/`, the specimen, `llms.txt`) are committed with the source, so every tag works on
  both routes with no build step for the consumer. CI rebuilds and fails if they are stale.
- If npm is added later: a public `@claudioccm/...` package published by GitHub Actions with npm trusted
  publishing (OIDC), so no npm token is stored anywhere.
- **Semver:** the public API is the token names, layer order, class names and data attributes. Renaming any
  of them is a major version.
- **Projects never edit the system.** They override through their own `overrides` layer. If a project needs
  to change the system itself, the change goes upstream.

## Sources we admire

A shortlist to borrow behaviour and patterns from. Each needs a "what we take" before we rely on it.

| Source | What we would take |
| --- | --- |
| GOV.UK Design System / `govuk-frontend` | The closest match in spirit: plain HTML and CSS, vanilla JS enhancing `data-module` markup, progressive enhancement, heavily tested accessibility. MIT. |
| WAI-ARIA Authoring Practices (APG) | The reference keyboard and ARIA behaviour for every widget pattern. |
| Heydon Pickering, *Inclusive Components* | Accessible versions of common widgets, reasoned from first principles. |
| Every Layout / Utopia / Piccalilli (CUBE) | The layout primitives, fluid scales and methodology we already use. |
| Zach Leatherman's HTML web components (`is-land` and others) | The pattern for light-DOM elements that enhance existing markup. |
| Web Awesome | Individual hard widgets taken one at a time (colour picker, tree), never the foundation. |
| Open UI | Where native controls are heading, so we don't build what the platform is about to ship. |

## Decisions log

- 2026-11-15 — Scope is the house look for pet projects only; client work is out.
- 2026-11-15 — Repo: `claudioccm/ccm-labs-design-system`, public.
- 2026-11-15 — Token names follow Utopia's output; two type scales switched by `data-density`.
- 2026-11-15 — First adopter: the teleprompter (`~/_files/_experiments/teleprompter`), a single plain-HTML
  page, so it tests the no-framework case first. It keeps a pinned copy of `dist/` instead of loading from
  jsDelivr, because the app runs offline; its `update-cm.sh` refreshes the copy.
- 2026-11-15 — The dark twin uses `light-dark()` and `color-scheme`, not a second copy of every token under a
  media query and an attribute. It removes the duplication all four pet projects carried and lets any element
  pin a look.
- 2026-11-15 — Blocks read `--text-*` roles, not steps. The command center's popover title is step 4 and the
  teleprompter's is step 2: the same block needs a different step in each scale.
- 2026-11-15 — One space scale for both densities, on the read scale's settings. It is the house scale
  (4 8 12 16 24 32 48 64 96) at a phone and grows about 6% by desktop.
- 2026-11-15 — State colours are named by role: `--ok`, `--ask`, `--trouble` (was `--red`). `--ok-ink` and
  `--ask-ink` are darker shades for text, since the plain teal and yellow fail contrast on paper.
- 2026-11-15 — The theme choice is stored under `cm-theme` in every project.
- 2026-11-15 — v0.2.0, from migrating the command center dashboard and _refs. Five blocks passed the
  two-projects rule: `titlebar` (the command center's list heads, _refs's view head), `disclosure` (the plus
  and minus on both projects' details), `chip` (the command center's dependency chips, claudiomendonca.com's
  filters), `facts` (the command center's Using and Used by, claudiomendonca.com's project facts) and `link`
  (both wrote the link look again for links that carry a class). `button` gained `aria-pressed="true"` (_refs's
  selected buttons, claudiomendonca.com's pressed chip).
- 2026-11-15 — Considered and left out: a bordered message (the command center's banner is red and in the
  flow, _refs's status line is ink and floats; they share a border and nothing else), rename in place and the
  dimmed dragged row (behaviour and one declaration each), a ring-shaped dot and a vertical nav (one project
  each).
- 2026-11-15 — Only a modal dialog dims the page. v0.1.0 put the scrim on every `popover`, so a
  popover-attribute panel dimmed the page too; the command center's routine popover, which the block was drawn
  from, never did.
- 2026-11-15 — The disclosure's mark is one box cut to a plus with `clip-path`, not two gradients (the look
  has none) and not two pseudo-elements (a summary laid out on a grid needs the mark to be one item). Its size
  is rounded to an odd number of pixels so its two 1px lines fall on whole pixels.
- 2026-11-15 — A project with a bundler imports the system as the first line of its own stylesheet. Listed as
  a separate entry, Nuxt's dev server loaded _refs's stylesheet first, which declared `overrides` before the
  system's layer statement and so put it below every other layer.
- 2026-11-15 — _refs ships the stylesheet as its bundler rewrites it: Lightning CSS turns `light-dark()` into
  a custom-property switch for older browsers. The page's light and dark work the same; a surface pinned
  with `data-theme` would not, and _refs has none. A project that pins one raises its CSS target instead.
- 2026-11-15 — A pinned copy is also for a page whose content security policy allows no outside script (the
  command center dashboard: `script-src 'self'`), and it includes `theme-init.js`, which cannot be inlined
  there.
- 2026-11-15 — Where an adopter's look differs from the house look, the adopter keeps its own in its
  `overrides` layer, each rule marked, and the difference goes to Claudio to decide. A migration never changes
  how a project looks. _refs pins the palette, type sizes and spacing it had; the command center keeps its
  dotted row rules, inverting buttons, Switzer popover title and pale asking dot.
- 2026-11-15 — The system's class names stay plain words, so an adopter renames its own on a collision
  (_refs's `sidebar` became `app-sidebar`).

## Parked

- A separate principles doc that guides **creating** a new design system for a client project, reusing the
  method (CUBE, Utopia, Every Layout) without covering every client's particularities.

## Evidence

Prior art this was lifted from, as of 2026-11-15:

- **A recent client site:** the most mature CUBE setup. 8 layers including `composition`, 11 Every Layout
  primitives, Utopia type (`--size-n`, renamed from Utopia's `--step-n`) and space (`--space-*`), tiered
  tokens, and a component decision record ("components own meaning, primitives own layout, callers own
  placement"). Spacing had both `data-space` and `data-gap`, one an alias of the other.
- **An older client site:** an earlier copy. 7 layers with no composition layer, the Every Layout primitives
  together in one base file, and space from a modular scale (`--s0`), not Utopia.
- **Pet projects** (refs, command center, teleprompter, claudiomendonca.com): the house look, with type sizes
  named `--step-n` and spacing written as raw pixels.
