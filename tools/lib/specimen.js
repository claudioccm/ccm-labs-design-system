// The specimen: every documented thing, rendered from its header's @markup. It is the visual doc for
// people and the page the browser tests run against (PRINCIPLES.md §10). Two pages, one per type scale.
import { KINDS, fillMarkup } from './headers.js';

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const slug = e => `${e.kind}-${e.name}`;
const ORDER = ['token', 'base', 'composition', 'block', 'element', 'utility'];

const TOGGLE = `<cm-theme-toggle>
        <button type="button" class="theme-toggle" aria-label="Dark mode" aria-pressed="false">
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.25" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M8 1.75a6.25 6.25 0 0 1 0 12.5z" fill="currentColor"/></svg>
        </button>
      </cm-theme-toggle>`;

// A token file's custom properties, in order, without repeats (the two type scales share their names).
function declared(source) {
  const seen = new Map();
  for (const m of source.matchAll(/^\s*(--[a-z][\w-]*):\s*([^;]+);/gm)) if (!seen.has(m[1])) seen.set(m[1], m[2].trim());
  return [...seen].map(([name, value]) => ({ name, value }));
}

function tokenTable(entry, source) {
  const vars = declared(source);
  const rows = {
    swatch: () => vars.filter(v => v.value.startsWith('light-dark(')).map(v =>
      `<div class="specimen-swatch"><span style="background-color: var(${v.name})"></span><code>${v.name}</code></div>`),
    palette: () => vars.filter(v => v.name.startsWith('--color-')).map(v =>
      `<div class="specimen-swatch"><span style="background-color: ${v.value}"></span><code>${v.name}</code></div>`),
    type: () => vars.filter(v => /^--(step|text)-/.test(v.name)).map(v =>
      `<div class="specimen-type"><code>${v.name}</code><span style="font-size: var(${v.name})">Ink on paper</span></div>`),
    space: () => vars.filter(v => /^--space-/.test(v.name)).map(v =>
      `<div class="specimen-space"><code>${v.name}</code><span style="inline-size: var(${v.name})"></span></div>`),
    font: () => vars.filter(v => /^--font-/.test(v.name)).map(v =>
      `<div class="specimen-type"><code>${v.name}</code><span style="font-family: var(${v.name}); font-size: var(--text-lead)">Ink on paper, and its dark twin 0123456789</span></div>`),
  }[entry.render];
  if (!rows) return '';
  return `<div class="specimen-tokens" data-render="${entry.render}">\n${rows().join('\n')}\n</div>`;
}

function example(entry, n, state = '') {
  const id = `ex-${slug(entry)}-${n}`;
  const hidden = entry.nojs.startsWith('hidden') ? ' data-nojs="hidden"' : '';
  return `<div class="specimen-example" data-specimen="${slug(entry)}" data-kind="${entry.kind}"${hidden}>\n${fillMarkup(entry.markup, { state, id })}\n</div>`;
}

function list(title, items) {
  if (!items.length) return '';
  return `<div><dt class="label">${title}</dt>${items.map(i => `<dd>${i}</dd>`).join('')}</div>`;
}

function article(entry, sources) {
  const parts = [`<header class="stack" data-space="3xs">
  <h3>${esc(entry.name)}</h3>
  <p class="tone-soft measure">${esc(entry.purpose)}</p>
  <p class="tone-muted"><code>${entry.file}</code></p>
</header>`];
  if (entry.kind === 'token') parts.push(tokenTable(entry, sources[entry.file]));
  if (entry.markup) {
    parts.push(example(entry, 0));
    // KSS's idea: every listed state is rendered as its own example.
    const shown = entry.markup.includes('{{state}}') ? entry.states : [];
    if (shown.length) {
      parts.push(`<div class="specimen-states stack">${shown.map((s, i) => `<figure class="stack" data-space="2xs">
${example(entry, i + 1, s.key)}
<figcaption class="tone-muted"><code>${esc(s.key)}</code> ${esc(s.note)}</figcaption>
</figure>`).join('\n')}</div>`);
    }
    parts.push(`<details><summary class="label">Markup</summary>\n<pre><code>${esc(fillMarkup(entry.markup))}</code></pre></details>`);
  }
  const pair = p => `<code>${esc(p.key)}</code> ${esc(p.note)}`;
  const meta = [
    list('States', entry.markup.includes('{{state}}') ? [] : entry.states.map(pair)),
    list('Properties', entry.props.map(pair)),
    list('Attributes', entry.attrs.map(esc)),
    list('Events', entry.fires.map(esc)),
    list('Tokens', entry.tokens.length ? [entry.tokens.map(t => `<code>${t}</code>`).join(' ')] : []),
    list('Without JavaScript', entry.nojs ? [esc(entry.nojs)] : []),
    list('Do', entry.do.map(esc)),
    list('Don’t', entry.dont.map(esc)),
  ].filter(Boolean);
  if (meta.length) parts.push(`<dl class="specimen-meta">\n${meta.join('\n')}\n</dl>`);
  return `<article class="specimen-entry stack" id="${slug(entry)}">\n${parts.join('\n')}\n</article>`;
}

export function specimenPage({ entries, sources, version, density }) {
  const groups = ORDER.map(kind => ({ kind, title: KINDS[kind].title, entries: entries.filter(e => e.kind === kind) })).filter(g => g.entries.length);
  const toc = groups.map(g => `<div class="stack" data-space="2xs">
        <p class="label"><a class="specimen-quiet" href="#${g.kind}">${g.title}</a></p>
        <ul role="list" class="stack" data-space="3xs">
${g.entries.map(e => `          <li><a class="specimen-quiet" href="#${slug(e)}">${esc(e.name)}</a></li>`).join('\n')}
        </ul>
      </div>`).join('\n      ');
  const sections = groups.map(g => `<section class="stack" data-space="xl" id="${g.kind}">
<h2 class="label" data-rule>${g.title}</h2>
${g.entries.map(e => article(e, sources)).join('\n')}
</section>`).join('\n');
  const current = d => (d === density ? ' aria-current="page"' : '');
  return `<!doctype html>
<html lang="en" data-density="${density}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<title>House design system</title>
<link rel="icon" href="data:,">
<!-- Generated by tools/build.js from the headers in src/. Do not edit. -->
<link rel="preconnect" href="https://api.fontshare.com">
<link rel="stylesheet" href="https://api.fontshare.com/v2/css?f[]=switzer@300,400,500,600&display=swap">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montagu+Slab:opsz,wght@16..144,300&display=swap">
<script src="../dist/theme-init.js"></script>
<link rel="stylesheet" href="../dist/cm.css">
<link rel="stylesheet" href="specimen.css">
<script src="../dist/cm.js" defer></script>
</head>
<body>
<div class="center stack" data-gutter data-space="xl" style="--center-max: 76rem">
  <header class="specimen-head cluster" data-justify="between" data-align="start">
    <div class="stack" data-space="3xs">
      <p class="label">ccm-labs-design-system · v${version}</p>
      <h1 class="display">House design system</h1>
    </div>
    <div class="cluster" data-space="m">
      <nav class="nav" aria-label="Type scale">
        <a href="index.html"${current('read')}>Read</a>
        <a href="tool.html"${current('tool')}>Tool</a>
      </nav>
      ${TOGGLE}
    </div>
  </header>
  <div class="sidebar" data-space="xl" style="--sidebar-width: 11rem; --sidebar-content-min: 60%">
    <nav class="specimen-toc stack" data-space="m" aria-label="Contents">
      ${toc}
    </nav>
    <main class="stack" data-space="2xl">
${sections}
    </main>
  </div>
</div>
</body>
</html>
`;
}
