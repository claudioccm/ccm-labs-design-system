// Builds everything that is generated: dist/ (the files projects load), the specimen pages, llms.txt,
// llms-full.txt, custom-elements.json and the index inside AGENTS.md. Run with `npm run build`.
// No bundler: the CSS is the source files joined in cm.css's import order.
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, SRC, KINDS, sourceFiles, parseHeaders, fillMarkup } from './lib/headers.js';
import { specimenPage } from './lib/specimen.js';

const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
const banner = `/*! ${pkg.name} v${pkg.version} — github.com/claudioccm/${pkg.name} — built from src/, do not edit */\n`;
const out = (rel, text) => { writeFileSync(join(ROOT, rel), text); console.log(`  ${rel}`); };

const files = sourceFiles();
const entries = files.flatMap(f => parseHeaders(f.source, f.rel));
const sources = Object.fromEntries(files.map(f => [f.rel, f.source]));

console.log('build');
rmSync(join(ROOT, 'dist'), { recursive: true, force: true });
mkdirSync(join(ROOT, 'dist'));
mkdirSync(join(ROOT, 'specimen'), { recursive: true });

// ---- dist/cm.css: the layer order, then each imported file in order
const entry = readFileSync(join(SRC, 'cm.css'), 'utf8');
const layers = entry.match(/@layer [^;{]+;/)[0];
const css = [...entry.matchAll(/@import\s+"([^"]+)"/g)].map(m => readFileSync(join(SRC, m[1]), 'utf8').trim());
out('dist/cm.css', `${banner}${layers}\n\n${css.join('\n\n')}\n`);

// ---- dist/cm.js: the custom elements as one plain script (works from a script tag, a file:// page or an import)
const elements = readdirSync(join(SRC, 'elements')).filter(f => f.endsWith('.js')).sort()
  .map(f => readFileSync(join(SRC, 'elements', f), 'utf8').trim().replace(/^export /gm, ''));
out('dist/cm.js', `${banner}(() => {\n${elements.join('\n\n')}\n})();\n`);
out('dist/theme-init.js', banner + readFileSync(join(SRC, 'theme-init.js'), 'utf8'));

// ---- custom-elements.json: the standard manifest, from the same JSDoc the headers are parsed from
execFileSync(join(ROOT, 'node_modules', '.bin', 'cem'), ['analyze', '--globs', 'src/elements/*.js', '--outdir', '.', '--quiet'], { cwd: ROOT, stdio: 'inherit' });
console.log('  custom-elements.json');

// ---- specimen
for (const [name, density] of [['index', 'read'], ['tool', 'tool']]) {
  out(`specimen/${name}.html`, specimenPage({ entries, sources, version: pkg.version, density }));
}
copyFileSync(join(ROOT, 'tools', 'specimen.css'), join(ROOT, 'specimen', 'specimen.css'));

// ---- llms.txt (the index) and llms-full.txt (every header in full)
const ORDER = ['token', 'base', 'composition', 'block', 'element', 'utility'];
const groups = ORDER.map(kind => ({ kind, title: KINDS[kind].title, entries: entries.filter(e => e.kind === kind) }));
const intro = `# ${pkg.name}

> ${pkg.description} Version ${pkg.version}.

The contract is HTML: class names, data attributes and the tokens a block reads. Read AGENTS.md before
writing markup; it holds the rules and the head snippet. Each entry below is documented in a header comment
at the top of its source file. llms-full.txt has every header in one file.
`;
out('llms.txt', `${intro}
## Start here

- [AGENTS.md](AGENTS.md): How to use the system and the rules that are enforced
- [PRINCIPLES.md](PRINCIPLES.md): Why it is built this way
- [dist/cm.css](dist/cm.css): The whole stylesheet, one file
- [dist/cm.js](dist/cm.js): The custom elements
- [llms-full.txt](llms-full.txt): Every entry below with its markup, states, tokens and do/don't

${groups.map(g => `## ${g.title}\n\n${g.entries.map(e => `- [${e.name}](${e.file}): ${e.purpose}`).join('\n')}`).join('\n\n')}
`);

const full = e => [
  `### ${e.name}`,
  `${e.purpose}\n\nSource: ${e.file}`,
  e.markup && '```html\n' + fillMarkup(e.markup) + '\n```',
  e.states.length && 'States:\n' + e.states.map(s => `- \`${s.key}\`: ${s.note}`).join('\n'),
  e.props.length && 'Properties:\n' + e.props.map(s => `- \`${s.key}\`: ${s.note}`).join('\n'),
  e.attrs.length && 'Attributes:\n' + e.attrs.map(s => `- ${s}`).join('\n'),
  e.fires.length && 'Events:\n' + e.fires.map(s => `- ${s}`).join('\n'),
  e.tokens.length && `Tokens: ${e.tokens.map(t => '`' + t + '`').join(' ')}`,
  e.nojs && `Without JavaScript: ${e.nojs}`,
  e.do.length && e.do.map(d => `Do: ${d}`).join('\n'),
  e.dont.length && e.dont.map(d => `Don't: ${d}`).join('\n'),
].filter(Boolean).join('\n\n');
out('llms-full.txt', `${intro}\n${groups.map(g => `## ${g.title}\n\n${g.entries.map(full).join('\n\n')}`).join('\n\n')}\n`);

// ---- AGENTS.md: refresh the generated index between its markers
const agentsPath = join(ROOT, 'AGENTS.md');
const index = groups.map(g => `**${g.title}**\n\n| Name | File | What it is for |\n| --- | --- | --- |\n${g.entries.map(e => `| \`${e.name}\` | \`${e.file}\` | ${e.purpose.split(/(?<=\.)\s/)[0]} |`).join('\n')}`).join('\n\n');
const agents = readFileSync(agentsPath, 'utf8');
const marked = /(<!-- cm:index:start -->)[\s\S]*?(<!-- cm:index:end -->)/;
if (!marked.test(agents)) throw new Error('AGENTS.md has lost its cm:index markers');
out('AGENTS.md', agents.replace(marked, (all, a, b) => `${a}\n${index}\n${b}`));
