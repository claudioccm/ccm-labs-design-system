# ccm-labs-design-system

The house design system for Claudio's pet projects: ink on paper and its dark twin, Switzer and Montagu Slab,
square corners, colour only for state. Plain CSS in cascade layers (CUBE CSS, Utopia tokens, Every Layout
composition) plus light-DOM custom elements. No framework, no build step for the projects that use it.

- **Why it is built this way:** [PRINCIPLES.md](PRINCIPLES.md)
- **How to use it, and the rules that are enforced:** [AGENTS.md](AGENTS.md)
- **Everything in it, one line each:** [llms.txt](llms.txt)

## See it

```sh
npm install
npm run dev      # http://127.0.0.1:4173/specimen/
```

The specimen renders every token, primitive, block and element from the header comment at the top of its
source file. There is no other documentation: the headers are the docs.

## Work on it

```sh
npm run verify   # build, check and browser tests
```

`dist/`, `specimen/`, `llms.txt`, `llms-full.txt` and `custom-elements.json` are generated and committed, so a
project can load a release straight from GitHub or jsDelivr. See [AGENTS.md](AGENTS.md) before changing anything.

## What is in v0.1.0

| Layer | Contents |
| --- | --- |
| Tokens | Palette, two Utopia type scales (read and tool), one space scale, typefaces, focus and motion |
| Theme | Colour roles for light and dark, following the system or pinned per surface |
| Base | Reset, page, typography, form controls, tables |
| Composition | stack, cluster, center, sidebar, switcher, grid, cover, frame, reel, imposter |
| Blocks | label, display, button, field, dot, toolbar, nav, popover, theme-toggle |
| Elements | `cm-theme-toggle` |
| Utilities | visually-hidden, tone, tabular, measure |
