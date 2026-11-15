// The header parser. One source for the specimen, llms.txt, AGENTS.md's index and the header check
// (PRINCIPLES.md §10). A header is a /** … */ comment whose tags start with a kind: @block button.
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

export const ROOT = join(import.meta.dirname, '..', '..');
export const SRC = join(ROOT, 'src');

// What each source directory holds: its cascade layer and the kind of thing its headers describe.
export const DIRS = {
  reset: { layer: 'reset', kind: 'base' },
  defaults: { layer: 'defaults', kind: 'base' },
  tokens: { layer: 'tokens', kind: 'token' },
  themes: { layer: 'themes', kind: 'token' },
  composition: { layer: 'composition', kind: 'composition' },
  components: { layer: 'components', kind: 'block' },
  utils: { layer: 'utils', kind: 'utility' },
  elements: { layer: null, kind: 'element' },
};

export const KINDS = {
  token: { title: 'Tokens', required: ['purpose'] },
  base: { title: 'Base elements', required: ['purpose'] },
  composition: { title: 'Composition', required: ['purpose', 'markup', 'do'] },
  block: { title: 'Blocks', required: ['purpose', 'markup', 'tokens', 'do', 'dont'] },
  utility: { title: 'Utilities', required: ['purpose', 'markup'] },
  element: { title: 'Custom elements', required: ['purpose', 'markup', 'nojs', 'do', 'dont'] },
};

const flat = s => s.replace(/\s+/g, ' ').trim();

function dedent(text) {
  const lines = text.replace(/\t/g, '  ').split('\n');
  while (lines.length && !lines[0].trim()) lines.shift();
  while (lines.length && !lines.at(-1).trim()) lines.pop();
  const indent = Math.min(...lines.filter(l => l.trim()).map(l => l.match(/^ */)[0].length));
  return lines.map(l => l.slice(indent)).join('\n');
}

// "data-variant="primary" — Filled ink." → { key, note }
function pairs(values) {
  return values.flatMap(v => v.split('\n')).map(l => l.trim()).filter(Boolean).map(l => {
    const [key, ...rest] = l.split(' — ');
    return { key: key.trim(), note: rest.join(' — ').trim() };
  });
}

export function parseHeaders(source, file = '') {
  const entries = [];
  for (const m of source.matchAll(/\/\*\*([\s\S]*?)\*\//g)) {
    const lines = m[1].split('\n').map(l => l.replace(/^\s*\*( |$)/, ''));
    const tags = [];
    let cur = { tag: 'description', lines: [] };
    for (const line of lines) {
      const t = line.match(/^@([a-z]+)(?:\s+(.*))?$/);
      if (t) { tags.push(cur); cur = { tag: t[1], lines: [t[2] || ''] }; } else cur.lines.push(line);
    }
    tags.push(cur);
    const kindTag = tags.find(t => t.tag in KINDS);
    if (!kindTag) continue;
    const raw = {};
    for (const t of tags) (raw[t.tag] ||= []).push(t.lines.join('\n'));
    const one = tag => (raw[tag] ? flat(raw[tag][0]) : '');
    const many = tag => (raw[tag] || []).map(flat).filter(Boolean);
    entries.push({
      kind: kindTag.tag,
      name: flat(kindTag.lines[0]),
      file,
      line: source.slice(0, m.index).split('\n').length,
      tags: Object.keys(raw),
      purpose: one('purpose') || one('description'),
      markup: raw.markup ? dedent(raw.markup[0]) : '',
      tokens: one('tokens').split(' ').filter(Boolean),
      states: pairs(raw.states || []),
      props: pairs(raw.props || []),
      attrs: many('attr'),
      fires: many('fires'),
      do: many('do'),
      dont: many('dont'),
      nojs: one('nojs'),
      render: one('render'),
    });
  }
  return entries;
}

// Every source file that must carry a header, in the order cm.css imports them (elements last).
export function sourceFiles() {
  const out = [];
  const imports = [...readFileSync(join(SRC, 'cm.css'), 'utf8').matchAll(/@import\s+"([^"]+)"/g)].map(m => m[1]);
  for (const rel of imports) out.push(join(SRC, rel));
  for (const dir of Object.keys(DIRS)) {
    for (const f of readdirSync(join(SRC, dir)).sort()) {
      const full = join(SRC, dir, f);
      if (/\.(css|js)$/.test(f) && !out.includes(full)) out.push(full);
    }
  }
  return out.map(full => {
    const rel = relative(ROOT, full).split(sep).join('/');
    const dir = rel.split('/')[1];
    return { full, rel, dir, ...DIRS[dir], source: readFileSync(full, 'utf8') };
  });
}

export function allEntries() {
  return sourceFiles().flatMap(f => parseHeaders(f.source, f.rel));
}

// A header's @markup with its placeholders filled: {{state}} takes one state's attribute, {{id}} a unique id.
export function fillMarkup(markup, { state = '', id = 'example' } = {}) {
  return markup.replace(/ ?\{\{state\}\}/g, state ? ' ' + state : '').replaceAll('{{id}}', id);
}
