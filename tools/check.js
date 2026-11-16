// The checks that fail the build (`npm run check`). They exist because written rules get forgotten,
// by agents above all (PRINCIPLES.md §3 and §10): every rule the system depends on is checked here.
//
//   headers   every source file documents itself, in the fixed format, with the fields its kind needs
//   layers    every file's rules sit in the cascade layer its directory stands for
//   tokens    no unknown token, no primitive outside the theme, and each block's @tokens list is true
//   house     the look's hard rules: no raw colours, no radius, no breakpoints inside blocks, …
//   elements  custom elements wrap markup and never render it
//   utopia    the generated scales match their calculator links
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, KINDS, sourceFiles, parseHeaders } from './lib/headers.js';
import { regions } from './utopia.js';

const problems = [];
const fail = (file, msg) => problems.push(`${file}: ${msg}`);
const files = sourceFiles();
const code = src => src.replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' '));   // comments blanked, lines kept
const lineOf = (src, i) => src.slice(0, i).split('\n').length;

// ---- headers
const seen = new Map();
for (const f of files) {
  const entries = parseHeaders(f.source, f.rel);
  if (!entries.length) { fail(f.rel, 'no header comment (/** @' + f.kind + ' name … */)'); continue; }
  for (const e of entries) {
    const at = `${f.rel}:${e.line}`;
    if (e.kind !== f.kind) fail(at, `@${e.kind} does not belong in src/${f.dir}/ (expected @${f.kind})`);
    if (!/^[a-z][a-z0-9-]*$/.test(e.name)) fail(at, `name "${e.name}" must be lowercase words joined by hyphens`);
    const key = `${e.kind}:${e.name}`;
    if (seen.has(key)) fail(at, `@${e.kind} ${e.name} is already documented in ${seen.get(key)}`);
    seen.set(key, at);
    for (const field of KINDS[e.kind].required) {
      const value = e[field];
      if (!value || (Array.isArray(value) && !value.length)) fail(at, `@${e.kind} ${e.name} is missing @${field}`);
    }
    if (e.states.some(s => !s.note)) fail(at, `every @states line needs a note after " — "`);
    if (e.props.some(s => !s.note)) fail(at, `every @props line needs a note after " — "`);
    if (/<script|\son[a-z]+=/i.test(e.markup)) fail(at, '@markup must not contain scripts or inline event handlers');
  }
}

// ---- layers: outside comments, a CSS file is nothing but @layer <its layer> { … } blocks
for (const f of files.filter(f => f.layer)) {
  const src = code(f.source);
  let depth = 0, i = 0;
  while (i < src.length) {
    if (depth === 0) {
      const rest = src.slice(i);
      const open = rest.match(/^\s*@layer\s+([a-z]+)\s*\{/);
      if (open) {
        if (open[1] !== f.layer) fail(`${f.rel}:${lineOf(src, i + open[0].length)}`, `rules are in @layer ${open[1]}; src/${f.dir}/ is @layer ${f.layer}`);
        depth = 1; i += open[0].length; continue;
      }
      if (/^\s*$/.test(rest)) break;
      fail(`${f.rel}:${lineOf(src, i + rest.match(/^\s*/)[0].length)}`, `rules outside @layer ${f.layer} { … }`);
      break;
    }
    if (src[i] === '{') depth++; else if (src[i] === '}') depth--;
    i++;
  }
}

// ---- tokens
const css = files.filter(f => f.layer);
const declaredIn = f => [...code(f.source).matchAll(/(?<![\w-])(--[a-z_][\w-]*)\s*:/g)].map(m => m[1]);
const tokenFiles = css.filter(f => f.dir === 'tokens' || f.dir === 'themes');
const tokens = new Set(tokenFiles.flatMap(declaredIn));
const primitives = new Set(declaredIn(css.find(f => f.rel === 'src/tokens/color.css')));
const privates = new Set(css.flatMap(declaredIn).filter(n => n.startsWith('--_')));

for (const f of css) {
  const src = code(f.source);
  const used = new Set(), hooks = new Set();
  for (const m of src.matchAll(/var\(\s*(--[\w-]+)\s*([,)])/g)) {
    const [, name, next] = m, at = `${f.rel}:${lineOf(src, m.index)}`;
    if (name.startsWith('--_')) { if (!privates.has(name)) fail(at, `private variable ${name} is never set`); continue; }
    if (primitives.has(name) && f.dir !== 'themes') fail(at, `${name} is a primitive; read a role from themes/theme.css instead`);
    if (tokens.has(name)) used.add(name);
    else if (next === ',') hooks.add(name);
    else fail(at, `${name} is not a token (a typo, or a property that needs a fallback: var(${name}, default))`);
  }
  if (f.kind === 'token') continue;
  const entries = parseHeaders(f.source, f.rel);
  if (entries.length !== 1) continue;   // a file of several utilities shares its tokens between them
  const [e] = entries;
  if (e.tags.includes('tokens')) {
    const listed = new Set(e.tokens);
    for (const t of used) if (!listed.has(t)) fail(f.rel, `@tokens is missing ${t}`);
    for (const t of listed) if (!used.has(t)) fail(f.rel, `@tokens lists ${t}, which the file does not read`);
  }
  const props = new Set(e.props.map(p => p.key));
  for (const h of hooks) if (!props.has(h)) fail(f.rel, `${h} is read with a fallback but not documented under @props`);
  for (const p of props) if (!hooks.has(p)) fail(f.rel, `@props lists ${p}, which the file does not read`);
}

// ---- house rules
const ROUND = new Set(['src/components/dot.css', 'src/components/theme-toggle.css']);   // the only round things
for (const f of css) {
  const src = code(f.source), themed = f.dir === 'tokens' || f.dir === 'themes';
  // Report each match of `re`; `msg` may return '' to let a match pass. A line that carries a
  // "cm-allow: reason" comment is let through: the exception is then written where it is made.
  const raw = f.source.split('\n');
  const each = (re, msg) => {
    for (const m of src.matchAll(re)) {
      const line = lineOf(src, m.index), text = msg(m);
      if (text && !/cm-allow: \S/.test(raw[line - 1])) fail(`${f.rel}:${line}`, text);
    }
  };
  if (!themed) {
    each(/#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|oklch|oklab|lab|lch|color-mix)\(/gi, m => `raw colour ${m[0]}…; use a role from themes/theme.css`);
    each(/\b(?:linear|radial|conic)-gradient\(/g, () => 'no gradients; the look is flat');
    each(/font-size:\s*[\d.]+(?:px|rem)\b/g, m => `${m[0]}: font sizes are --text-* roles or --step-n, never raw lengths`);
  }
  each(/border(?:-[a-z-]+)?-radius:\s*([^;]+);/g, m =>
    (/^0\b/.test(m[1].trim()) || ROUND.has(f.rel) ? '' : 'square corners: only the status dot and the theme toggle are round'));
  each(/\b(?:dashed|dotted)\b/g, () => 'no dashed or dotted borders: ink rules and outlines are solid, and a grey line is background: var(--dots-below)');
  if (f.dir === 'composition' || f.dir === 'components') {
    each(/@media[^{]*\b(?:width|height)\b/g, () => 'no breakpoints inside a block or a primitive; it adapts to its container (PRINCIPLES.md §5)');
  }
  if (f.dir !== 'reset' && f.rel !== 'src/defaults/root.css') each(/!important/g, () => 'no !important; the layer order settles conflicts');
  if (f.dir === 'components') {
    // A block may space its own parts, but never itself: no outer margin on the block's root selector.
    each(/(?<![\w-])margin(?:-(?:block|inline)(?:-(?:start|end))?|-(?:top|right|bottom|left))?:\s*[^;]+;/g, m => {
      const rule = src.slice(0, m.index).match(/([^{}]*)\{[^{}]*$/)?.[1].trim() || '';
      const root = /^\.[a-z-]+(?:\[[^\]]+\])*(?::[a-z-]+(?:\([^)]*\))?)*$/.test(rule.split(',')[0].trim());
      return root ? `${m[0]} on the block's own root: callers own placement (PRINCIPLES.md §4)` : '';
    });
  }
}

// ---- elements: wrap, never render
const BANNED = [
  [/\.innerHTML\b|\.outerHTML\b|insertAdjacentHTML|setHTMLUnsafe|\bsetHTML\(/, 'writes markup from a string'],
  [/attachShadow|shadowRoot/, 'uses shadow DOM, which cuts the cascade'],
  [/replaceChildren|createElement|createElementNS|cloneNode|importNode|createContextualFragment|DOMParser|\.content\b/, 'creates or replaces elements'],
  [/document\.write/, 'writes to the document'],
];
for (const f of files.filter(f => f.kind === 'element')) {
  const src = code(f.source).replace(/\/\/.*$/gm, '');
  src.split('\n').forEach((line, n) => {
    for (const [re, why] of BANNED) if (re.test(line)) fail(`${f.rel}:${n + 1}`, `${why}. An element enhances the markup inside it and never renders its own (PRINCIPLES.md §3)`);
  });
  for (const e of parseHeaders(f.source, f.rel)) {
    if (!new RegExp(`customElements\\.define\\('${e.name}'`).test(f.source)) fail(f.rel, `@element ${e.name} is never defined with customElements.define('${e.name}', …)`);
    if (!e.name.startsWith('cm-')) fail(f.rel, `element names start with cm-: ${e.name}`);
    if (!e.markup.includes(`<${e.name}`)) fail(f.rel, `@markup must show <${e.name}> wrapping its native markup`);
  }
}

// ---- utopia: the generated regions are what their links generate
for (const f of tokenFiles) {
  for (const r of regions(f.source)) {
    if (r.actual !== r.expected) fail(f.rel, `the ${r.kind} scale does not match its link (${r.link}). Run: npm run tokens`);
  }
}
for (const name of ['type.css', 'space.css']) {
  const src = readFileSync(join(ROOT, 'src', 'tokens', name), 'utf8');
  if (!regions(src).length) fail(`src/tokens/${name}`, 'has no utopia region; the scale must be generated from a calculator link');
}

if (problems.length) {
  console.error(`check: ${problems.length} problem${problems.length === 1 ? '' : 's'}\n`);
  for (const p of problems) console.error('  ' + p);
  process.exit(1);
}
const count = files.flatMap(f => parseHeaders(f.source, f.rel)).length;
console.log(`check: ok (${files.length} files, ${count} documented entries)`);
