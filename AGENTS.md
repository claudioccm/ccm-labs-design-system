# ccm-labs-design-system: instructions for agents

The house design system for Claudio's pet projects. It is plain CSS in cascade layers (CUBE CSS, Utopia
tokens, Every Layout composition) plus light-DOM custom elements. The reasons are in `PRINCIPLES.md`; this
file is what to do.

There is no docs site. Every token group, primitive, block, utility and element is documented in a header
comment at the top of its source file. `llms.txt` is the index and `llms-full.txt` has every header in one
file. Read the header before using a thing.

## Using the system in a project

Put this in the page's head. It loads the two typefaces, applies a stored light or dark choice before the
page paints, and loads the stylesheet and the elements.

```html
<meta name="color-scheme" content="light dark">
<link rel="preconnect" href="https://api.fontshare.com">
<link rel="stylesheet" href="https://api.fontshare.com/v2/css?f[]=switzer@300,400,500,600&display=swap">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montagu+Slab:opsz,wght@16..144,300&display=swap">
<script src="https://cdn.jsdelivr.net/gh/claudioccm/ccm-labs-design-system@0.2/dist/theme-init.js"></script>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/claudioccm/ccm-labs-design-system@0.2/dist/cm.css">
<script src="https://cdn.jsdelivr.net/gh/claudioccm/ccm-labs-design-system@0.2/dist/cm.js" defer></script>
```

- **A project with a bundler** (Nuxt, Astro, Vite): `npm i github:claudioccm/ccm-labs-design-system#v0.2.0`.
  - Import the stylesheet as the **first line of the project's own stylesheet**:
    `@import "ccm-labs-design-system/cm.css";`, then write the project's rules below it in `@layer overrides`.
    Do not list it as a separate entry beside the project's stylesheet: a bundler may load the two in either
    order, and if the project's comes first its `overrides` layer is declared first and loses to everything.
  - Import `ccm-labs-design-system/cm.js` once, in the browser only (in Nuxt, a `.client.ts` plugin).
  - Put `theme-init.js` in the head, inline: read `ccm-labs-design-system/theme-init.js` at build time. Keep
    the font links too, unless the project hosts Switzer itself.
  - In Vue, tell the compiler the elements are not components:
    `vue: { compilerOptions: { isCustomElement: (tag) => tag.startsWith('cm-') } }`.
  - In Nuxt, all of it is a few lines of `nuxt.config.ts`:

    ```ts
    const themeInit = readFileSync(createRequire(import.meta.url).resolve('ccm-labs-design-system/theme-init.js'), 'utf8');
    export default defineNuxtConfig({
      app: { head: { htmlAttrs: { 'data-density': 'tool' }, script: [{ innerHTML: themeInit }] } },
      css: ['~/assets/main.css'],   // its first line: @import "ccm-labs-design-system/cm.css";
      vue: { compilerOptions: { isCustomElement: (tag) => tag.startsWith('cm-') } },
    });
    ```
  - A build that rewrites `light-dark()` for older browsers (Vite with Lightning CSS does by default) keeps
    the page's own light and dark working, but a surface pinned with `data-theme` on another element then
    keeps the page's colours. A project that pins a surface sets its CSS target to browsers that have
    `light-dark()` (Chrome 123, Safari 17.5, Firefox 120), so the function ships as written.
- **An app that must work offline, or whose content security policy lets no script in from elsewhere:** keep a
  pinned copy of `dist/cm.css`, `dist/cm.js` and `dist/theme-init.js` in the project and refresh it with a
  script. The teleprompter does this (`update-cm.sh`). Never edit the copy.
- **The class names are plain words** (`sidebar`, `grid`, `label`, `chip`, `link`, `nav`…). Before adopting the
  system, check the project's own class names against the index below and rename the ones that collide.
- **A choice saved under a project's old theme key** is carried over to `cm-theme` by the project, in a few
  lines that run before `theme-init.js`.
- **Dense tools** set `data-density="tool"` on `<html>`. Reading pages set nothing.
- **A surface that is always dark** (a prompter, a player) sets `data-theme="dark"` on its own element.

## Writing markup with it

1. **Native element first**, then a `cm-` custom element, then a framework component. A framework component
   is a wrapper for data: it outputs the markup below and owns no styling.
2. **Layout is composition.** Space things with `stack`, `cluster`, `grid`, `sidebar`, `switcher`, `center`,
   and set the space with `data-space="s"`. Never put a margin on a block to place it.
3. **Variants and state are data attributes** (`data-variant="primary"`, `data-state="ok"`) or the native or
   ARIA attribute that already says it (`disabled`, `aria-current="page"`, `aria-pressed`). No modifier classes.
4. **Read tokens, not values.** Colours are the roles in `src/themes/theme.css` (`--fg`, `--bg`, `--muted`,
   `--rule`…). Sizes are `--text-*` roles or `--step-n`. Space is `--space-*`.
5. **A project's own CSS goes in the `overrides` layer:** `@layer overrides { … }`. It wins over the system
   without `!important`. If the system itself needs to change, change it here, not in the project.
   Where a project's look differs from the house look on purpose, it sets the system's own token or restyles
   the system's own class there, with a comment that says what differs; deleting that rule takes the
   system's look back.
6. **Keep the look.** Ink on paper and its dark twin, square corners, solid 1px rules, colour only for
   state. No gradients, tinted panels, shadows other than the popover's, or brand accents.

## Working on the system

```sh
npm run build    # dist/, specimen/, llms.txt, llms-full.txt, custom-elements.json, the index below
npm run check    # the rules below, enforced
npm test         # browser tests against the specimen, with and without JavaScript
npm run dev      # the specimen at http://127.0.0.1:4173/specimen/
npm run tokens   # regenerate the Utopia scales from their calculator links
```

Run `npm run verify` (all three) before finishing. Commit the generated files with the source; CI fails
when they are stale.

### Adding or changing something

- One file per block in `src/components/`, per primitive in `src/composition/`. Add it to `src/cm.css`.
- **Nothing becomes a block until it has appeared in two projects.** Until then it is the project's own CSS.
- Wrap the rules in the directory's layer (`@layer components { … }`).
- Start the file with a header. `npm run check` fails without one, or with a required field missing:

```css
/**
 * @block button
 * @purpose One or two sentences: what it is and when to use it.
 * @markup
 *   <button type="button" class="button" {{state}}>Start</button>
 * @states
 *   data-variant="primary" — Filled ink: the one main action in a view.
 * @props
 *   --dot-size — A custom property the block reads with a fallback. Default: 0.5em.
 * @tokens --fg --bg --rule
 * @do One thing to do.
 * @dont One thing not to do.
 */
```

  - The first tag is the kind: `@token`, `@base`, `@composition`, `@block`, `@utility` or `@element`.
  - `{{state}}` marks where a state's attribute goes; the specimen renders the example once per state.
    `{{id}}` becomes a unique id.
  - `@tokens` must list exactly the tokens the file reads, and `@props` exactly the custom properties it
    reads with a fallback. The check compares them with the CSS.
- Never edit `dist/`, `specimen/`, `llms*.txt`, `custom-elements.json` or the index below; they are built.
- Never hand-edit the lines between `utopia:` markers in `src/tokens/`. Change the link, run `npm run tokens`.

### The custom element rule

**A custom element wraps native markup and adds behaviour. It never renders its own children.** The markup
is written (or server-rendered) inside the element, so it shows and works before any script runs.

```html
<!-- Right: the element wraps a real button and only adds behaviour to it. -->
<cm-theme-toggle>
  <button type="button" class="theme-toggle" aria-label="Dark mode" aria-pressed="false">…</button>
</cm-theme-toggle>

<!-- Wrong: empty until JavaScript runs, and its styles are cut off from the cascade. -->
<cm-theme-toggle label="Dark mode"></cm-theme-toggle>
```

```js
// Wrong, and `npm run check` fails on each of these:
this.innerHTML = '<button>…</button>';
this.attachShadow({ mode: 'open' });
this.append(document.createElement('button'));
```

An element may move or toggle the children it was given, set attributes on them, listen to them and
dispatch events. Document it with JSDoc on the class (`@element`, `@purpose`, `@markup`, `@nojs`, `@attr`,
`@fires`, `@do`, `@dont`). `@nojs` says what a visitor without JavaScript gets; start it with `hidden` if the
element hides itself until it is defined. `npm test` loads the specimen with JavaScript off and fails if an
example shows nothing.

**Never hand-roll a complex widget** (combobox, menu, tabs, date picker, tree). Use the native element
(`dialog`, `popover`, `details`, `select`), or take the behaviour from a source listed in `PRINCIPLES.md`.

### What `npm run check` enforces

| Rule | Where |
| --- | --- |
| Every source file has a header with its kind's required fields | all of `src/` |
| Rules sit in the layer their directory stands for | all CSS |
| No unknown token; `--color-*` primitives are read only by the theme | all CSS |
| `@tokens` and `@props` match what the file reads | compositions, blocks |
| No raw colours, gradients, or font sizes in px or rem | outside `tokens/` and `themes/` |
| Square corners (the dot and the theme toggle are the only round things); no dashed or dotted lines | all CSS |
| No viewport breakpoints | compositions, blocks |
| No `!important` | outside the reset and reduced-motion |
| No margin on a block's own root | blocks |
| No `innerHTML`, shadow DOM, `createElement`, `replaceChildren` or template cloning | elements |
| The Utopia scales match their calculator links | `src/tokens/` |

A real exception is written where it is made, with its reason: `/* cm-allow: why */` on that line.

## Index

Generated by `npm run build` from the headers. Do not edit between the markers.

<!-- cm:index:start -->
**Tokens**

| Name | File | What it is for |
| --- | --- | --- |
| `palette` | `src/tokens/color.css` | The raw colours of the house look. |
| `type-scale` | `src/tokens/type.css` | Fluid type from utopia.fyi. |
| `space-scale` | `src/tokens/space.css` | Fluid space from utopia.fyi: the house scale 4 8 12 16 24 32 48 64 96 at a phone, growing a little with the type. |
| `typefaces` | `src/tokens/font.css` | Two typefaces: Switzer (Fontshare, 300 to 600) for all text, Montagu Slab Light (Google) only for display: a page or app name, dialog titles, big numerals. |
| `controls-and-motion` | `src/tokens/misc.css` | The focus ring, control padding and the one quiet transition. |
| `theme` | `src/themes/theme.css` | Colour roles for the light look and its dark twin. |

**Base elements**

| Name | File | What it is for |
| --- | --- | --- |
| `reset` | `src/reset/reset.css` | A small modern reset (after Andy Bell's): border-box sizing, no default margins on text, media that fits its container, controls that inherit the page's type. |
| `page` | `src/defaults/root.css` | The page itself: ink on paper in Switzer at the body step, an inverted selection, one focus ring, and no motion for people who asked for none. |
| `typography` | `src/defaults/typography.css` | Text elements with no class. |
| `controls` | `src/defaults/controls.css` | Native form controls with no class: square, one rule colour. |
| `table` | `src/defaults/tables.css` | Tables with no class: column heads as small uppercase labels, one rule under each row, tabular numerals so columns of numbers line up. |

**Composition**

| Name | File | What it is for |
| --- | --- | --- |
| `stack` | `src/composition/stack.css` | Children in a column with one space between them. |
| `cluster` | `src/composition/cluster.css` | Things in a row that wrap when they run out of room: buttons, a title and its actions, meta. |
| `center` | `src/composition/center.css` | A centred column with a maximum width. |
| `sidebar` | `src/composition/sidebar.css` | Two columns, one narrow and one that takes the rest. |
| `switcher` | `src/composition/switcher.css` | Equal columns that all switch to a single column at once when the container gets narrower than a threshold. |
| `grid` | `src/composition/grid.css` | As many equal columns as fit, each at least a minimum width. |
| `cover` | `src/composition/cover.css` | A full-height column: one child, marked data-principal, sits in the vertical centre, with an optional header above and footer below. |
| `frame` | `src/composition/frame.css` | Crops media to an aspect ratio, so a row of images or videos lines up whatever their sizes. |
| `reel` | `src/composition/reel.css` | A row that scrolls sideways instead of wrapping, for a strip of items that should stay on one line. |
| `imposter` | `src/composition/imposter.css` | Centres one element over its positioned parent, or over the viewport with data-fixed. |
| `space` | `src/composition/space.css` | The data-space attribute shared by stack, cluster, sidebar, switcher, grid, cover and reel: one name for the space between children, taking any step or pair of the space scale. |

**Blocks**

| Name | File | What it is for |
| --- | --- | --- |
| `label` | `src/components/label.css` | The small uppercase label: field names, column heads, section heads. |
| `display` | `src/components/display.css` | The display face, Montagu Slab Light, on anything that is not an h1: an app name, a dialog title, a big numeral. |
| `button` | `src/components/button.css` | An action. |
| `link` | `src/components/link.css` | The link look, ink over a 1px rule and muted on hover, for a link that carries a class (the classless default does not reach it) and for a button that reads as a link. |
| `field` | `src/components/field.css` | A form control with its name. |
| `dot` | `src/components/dot.css` | A small round status dot. |
| `toolbar` | `src/components/toolbar.css` | A row of controls over a rule, between a view's title and its content. |
| `nav` | `src/components/nav.css` | A row of links between a site's or a tool's views. |
| `popover` | `src/components/popover.css` | A panel over the page for settings or detail: an ink border, a soft shadow, a display title and a quiet Close. |
| `theme-toggle` | `src/components/theme-toggle.css` | The half-filled circle, top right, that flips the page between the light look and its dark twin. |
| `titlebar` | `src/components/titlebar.css` | A view's or a list's title row: the title, then a count or controls, over an ink rule. |
| `disclosure` | `src/components/disclosure.css` | A details element whose summary carries a drawn plus that becomes a minus when it is open, in place of the browser's triangle. |
| `chip` | `src/components/chip.css` | A small boxed word: a tag, a dependency, a filter. |
| `facts` | `src/components/facts.css` | A short list of names and their values in two columns: what a routine uses, a project's year and role, the keys a record is tied to. |

**Custom elements**

| Name | File | What it is for |
| --- | --- | --- |
| `cm-theme-toggle` | `src/elements/cm-theme-toggle.js` | The behaviour of the theme toggle: flips data-theme on the root between light and dark, keeps aria-pressed on its button in step, and stores the choice under "cm-theme" in localStorage. |

**Utilities**

| Name | File | What it is for |
| --- | --- | --- |
| `visually-hidden` | `src/utils/utils.css` | Hides text from the screen but keeps it for screen readers: a name for an icon button, a heading for a section that needs none visually. |
| `tone` | `src/utils/utils.css` | Text colour by role: muted or soft for quiet text, and the three state colours in their text-safe shades. |
| `tabular` | `src/utils/utils.css` | Numerals of equal width, so a number that changes does not shift its neighbours and columns line up. |
| `measure` | `src/utils/utils.css` | Keeps running text to a readable line length (--measure, 65 characters). |
<!-- cm:index:end -->
