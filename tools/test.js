// Browser tests against the specimen (`npm test`, after `npm run build`). They use the Chrome that is
// already installed, so nothing is downloaded. Screenshots land in .screens/ for a look by eye.
//
// The no-JavaScript run is the enforcement half of PRINCIPLES.md §3: an element that renders its own
// markup shows up here as an example with nothing in it.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright-core';
import AxeBuilder from '@axe-core/playwright';
import { serve } from './serve.js';

const SCREENS = join(import.meta.dirname, '..', '.screens');
let browser, site;

before(async () => {
  mkdirSync(SCREENS, { recursive: true });
  site = await serve();
  browser = await chromium.launch({ channel: 'chrome' });
});
after(async () => { await browser?.close(); site?.server.close(); });

async function open(path, options = {}) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: 'light', ...options });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('response', r => { if (r.status() >= 400 && r.url().startsWith(site.url)) errors.push(`${r.status()} ${r.url()}`); });
  await page.goto(site.url + path, { waitUntil: 'networkidle' });
  return { page, context, errors };
}
const shot = (page, name) => page.screenshot({ path: join(SCREENS, name + '.png'), fullPage: true });

// Every example on the page: does it show something?
const examples = page => page.$$eval('.specimen-example', nodes => nodes.map(n => {
  const box = n.getBoundingClientRect();
  const seen = [...n.querySelectorAll('*')].some(c => {
    const r = c.getBoundingClientRect(), s = getComputedStyle(c);
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden';
  });
  return { name: n.dataset.specimen, nojs: n.dataset.nojs || '', seen: seen && box.height > 0 };
}));

test('without JavaScript, every example still shows its content', async () => {
  const { page, context, errors } = await open('/specimen/', { javaScriptEnabled: false });
  const all = await examples(page);
  assert.ok(all.length > 30, `expected the whole specimen, found ${all.length} examples`);
  const empty = all.filter(e => !e.seen && e.nojs !== 'hidden').map(e => e.name);
  assert.deepEqual(empty, [], 'these examples show nothing without JavaScript');
  const shown = all.filter(e => e.seen && e.nojs === 'hidden').map(e => e.name);
  assert.deepEqual(shown, [], 'these are documented "@nojs hidden" but are visible without JavaScript');
  assert.deepEqual(errors, []);
  await shot(page, 'nojs');
  await context.close();
});

test('with JavaScript: no errors, elements defined, every example shows', async () => {
  const { page, context, errors } = await open('/specimen/');
  assert.equal(await page.evaluate(() => !!customElements.get('cm-theme-toggle')), true);
  const hidden = (await examples(page)).filter(e => !e.seen).map(e => e.name);
  assert.deepEqual(hidden, []);
  assert.deepEqual(errors, []);
  await shot(page, 'light');
  await context.close();
});

test('the theme toggle flips the page, remembers the choice and forgets the system\'s own', async () => {
  const { page, context } = await open('/specimen/');
  const state = () => page.evaluate(() => ({
    attr: document.documentElement.dataset.theme || null,
    stored: localStorage.getItem('cm-theme'),
    pressed: document.querySelector('cm-theme-toggle button').getAttribute('aria-pressed'),
    bg: getComputedStyle(document.body).backgroundColor,
  }));
  assert.deepEqual(await state(), { attr: null, stored: null, pressed: 'false', bg: 'rgb(255, 255, 255)' });
  await page.click('cm-theme-toggle button');
  assert.deepEqual(await state(), { attr: 'dark', stored: 'dark', pressed: 'true', bg: 'rgb(7, 10, 20)' });
  await page.reload({ waitUntil: 'networkidle' });
  assert.deepEqual(await state(), { attr: 'dark', stored: 'dark', pressed: 'true', bg: 'rgb(7, 10, 20)' }, 'the choice survives a reload');
  await shot(page, 'dark');
  await page.click('cm-theme-toggle button');
  assert.deepEqual(await state(), { attr: null, stored: null, pressed: 'false', bg: 'rgb(255, 255, 255)' }, 'back on the system\'s look, nothing is stored');
  await context.close();
});

test('the page follows the system setting, and a pinned surface keeps its own look', async () => {
  const { page, context } = await open('/specimen/', { colorScheme: 'dark' });
  const bg = sel => page.$eval(sel, n => getComputedStyle(n).backgroundColor);
  assert.equal(await bg('body'), 'rgb(7, 10, 20)');
  assert.equal(await page.$eval('cm-theme-toggle button', b => b.getAttribute('aria-pressed')), 'true');
  await page.emulateMedia({ colorScheme: 'light' });
  assert.equal(await bg('body'), 'rgb(255, 255, 255)');
  assert.equal(await bg('[data-specimen="token-theme"] [data-theme="dark"]'), 'rgb(7, 10, 20)', 'pinned dark inside a light page');
  await context.close();
});

test('the tool density is the smaller scale, and space does not shrink with it', async () => {
  const size = async path => {
    const { page, context } = await open(path);
    const out = await page.evaluate(() => ({
      body: parseFloat(getComputedStyle(document.body).fontSize),
      gap: parseFloat(getComputedStyle(document.querySelector('main')).rowGap),
    }));
    if (path.includes('tool')) await shot(page, 'tool');
    await context.close();
    return out;
  };
  const read = await size('/specimen/'), tool = await size('/specimen/tool.html');
  assert.ok(read.body >= 16 && read.body <= 17, `read body is ${read.body}px`);
  assert.ok(tool.body >= 12 && tool.body <= 14, `tool body is ${tool.body}px`);
  assert.equal(tool.gap, read.gap);
});

test('at phone width nothing scrolls sideways', async () => {
  const { page, context } = await open('/specimen/', { viewport: { width: 360, height: 780 } });
  const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert.equal(over, 0, `the page is ${over}px wider than a 360px screen`);
  await shot(page, 'phone');
  await context.close();
});

test('a dialog opens from its button and closes from its Close, with no script of ours', async () => {
  const { page, context } = await open('/specimen/', { javaScriptEnabled: false });
  const open_ = () => page.$eval('[data-specimen="block-popover"] dialog', d => d.open);
  await page.click('[data-specimen="block-popover"] > button');
  assert.equal(await open_(), true);
  await page.screenshot({ path: join(SCREENS, 'popover.png') });
  await page.click('[data-specimen="block-popover"] dialog form button');
  assert.equal(await open_(), false);
  await context.close();
});

for (const scheme of ['light', 'dark']) {
  test(`accessibility (axe, WCAG 2.1 AA) in ${scheme}`, async () => {
    const { page, context } = await open('/specimen/', { colorScheme: scheme });
    const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    const found = violations.map(v => `${v.id} (${v.impact}): ${v.nodes.slice(0, 4).map(n => n.target.join(' ')).join(' | ')}`);
    assert.deepEqual(found, []);
    await context.close();
  });
}
