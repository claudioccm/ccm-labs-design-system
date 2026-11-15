// Utopia's fluid scales (utopia.fyi), reproduced so a scale can be regenerated offline and checked.
// The token files hold regions marked "utopia:type <calculator link>" … "utopia:end"; the link is the
// configuration, and the lines between the markers are generated from it. Never edit those lines by hand:
// change the link, then run `npm run tokens`. `npm run check` fails when a region and its link disagree.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const round = n => String(parseFloat(n.toFixed(4)));

function clamp(minPx, maxPx, minWidth, maxWidth) {
  const slope = (maxPx - minPx) / (maxWidth - minWidth);
  const intercept = minPx - slope * minWidth;
  const [lo, hi] = [Math.min(minPx, maxPx), Math.max(minPx, maxPx)];
  return `clamp(${round(lo / 16)}rem, ${round(intercept / 16)}rem + ${round(slope * 100)}vw, ${round(hi / 16)}rem)`;
}

// c=minWidth,minFont,minRatio,maxWidth,maxFont,maxRatio,positiveSteps,negativeSteps
// s=negative multipliers|…,positive multipliers|…,custom pairs|…
export function parseLink(link) {
  const q = new URL(link).searchParams;
  const [minWidth, minFont, minRatio, maxWidth, maxFont, maxRatio, pos, neg] = q.get('c').split(',').map(Number);
  const [below = '', above = '', custom = ''] = (q.get('s') || '').split(',');
  const nums = s => s.split('|').filter(Boolean).map(Number);
  return { minWidth, minFont, minRatio, maxWidth, maxFont, maxRatio, pos, neg,
    below: nums(below), above: nums(above), custom: custom.split('|').filter(Boolean) };
}

export function typeScale(c) {
  const out = [];
  for (let n = -c.neg; n <= c.pos; n++) {
    out.push(`--step-${n}: ${clamp(c.minFont * c.minRatio ** n, c.maxFont * c.maxRatio ** n, c.minWidth, c.maxWidth)};`);
  }
  return out;
}

const NAMES = { below: ['xs', '2xs', '3xs', '4xs'], above: ['m', 'l', 'xl', '2xl', '3xl', '4xl'] };

export function spaceScale(c) {
  const sizes = [
    ...c.below.map((m, i) => ({ name: NAMES.below[i], m })).reverse(),
    { name: 's', m: 1 },
    ...c.above.map((m, i) => ({ name: NAMES.above[i], m })),
  ].map(s => ({ ...s, min: Math.round(c.minFont * s.m), max: Math.round(c.maxFont * s.m) }));
  const line = (name, min, max) => `--space-${name}: ${clamp(min, max, c.minWidth, c.maxWidth)};`;
  const by = Object.fromEntries(sizes.map(s => [s.name, s]));
  return [
    ...sizes.map(s => line(s.name, s.min, s.max)),
    '/* One-up pairs */',
    ...sizes.slice(0, -1).map((s, i) => line(`${s.name}-${sizes[i + 1].name}`, s.min, sizes[i + 1].max)),
    '/* Custom pairs */',
    ...c.custom.map(p => { const [a, b] = p.split('-'); return line(p, by[a].min, by[b].max); }),
  ];
}

const REGION = /(\/\* utopia:(type|space) (\S+) \*\/\n)([\s\S]*?)(\n[ \t]*\/\* utopia:end \*\/)/g;

// Each region of a token file with what it holds and what its link generates.
export function regions(source) {
  return [...source.matchAll(REGION)].map(m => {
    const indent = m[4].match(/^[ \t]*/)[0];
    const lines = (m[2] === 'type' ? typeScale : spaceScale)(parseLink(m[3]));
    return { kind: m[2], link: m[3], actual: m[4], expected: lines.map(l => indent + l).join('\n') };
  });
}

export function regenerate(source) {
  return source.replace(REGION, (all, open, kind, link, body, close) => {
    const indent = body.match(/^[ \t]*/)[0] || '    ';
    const lines = (kind === 'type' ? typeScale : spaceScale)(parseLink(link));
    return open + lines.map(l => indent + l).join('\n') + close;
  });
}

if (import.meta.filename === process.argv[1]) {
  const dir = join(import.meta.dirname, '..', 'src', 'tokens');
  for (const f of ['type.css', 'space.css']) {
    const path = join(dir, f), before = readFileSync(path, 'utf8'), after = regenerate(before);
    if (process.argv.includes('--write')) { if (after !== before) writeFileSync(path, after); console.log(`${f}: ${after === before ? 'unchanged' : 'regenerated'}`); }
    else console.log(after);
  }
}
