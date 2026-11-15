// Screenshots for a look by eye: node tools/shots.js <url-path> <name> [selector …]
// Without selectors it shoots the top of the page; with them, each matching element. Add --dark, --phone.
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright-core';
import { serve } from './serve.js';

const args = process.argv.slice(2), flags = new Set(args.filter(a => a.startsWith('--')));
const [path, name, ...selectors] = args.filter(a => !a.startsWith('--'));
const dir = join(import.meta.dirname, '..', '.screens');
mkdirSync(dir, { recursive: true });
const site = path.startsWith('http') ? null : await serve();
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({
  viewport: flags.has('--phone') ? { width: 360, height: 780 } : { width: 1280, height: 900 },
  colorScheme: flags.has('--dark') ? 'dark' : 'light',
});
await page.goto(site ? site.url + path : path, { waitUntil: 'networkidle' });
if (!selectors.length) await page.screenshot({ path: join(dir, `${name}.png`) });
for (const [i, sel] of selectors.entries()) await page.locator(sel).first().screenshot({ path: join(dir, `${name}-${i}.png`) });
await browser.close();
site?.server.close();
