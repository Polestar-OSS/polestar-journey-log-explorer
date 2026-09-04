/**
 * Visual and end-to-end check against the production build.
 *
 *   make build && make preview &
 *   cd app && node ../tests/e2e/screenshots.mjs [file1.xlsx,file2.csv] [outDir]
 *
 * Loads the built-in sample (no argument) or the given exports, asserts the
 * sources bar, walks the three experience levels and their tabs at desktop
 * dark, desktop light and mobile, and fails on page errors. Screenshots are
 * written to outDir (default ./screenshots, git-ignored when it holds real data).
 */
import { createRequire } from 'node:module';
import path from 'node:path';

// The script lives outside app/, so resolve playwright from the app package (run it with cwd = app)
const { chromium } = createRequire(path.join(process.cwd(), 'package.json'))('playwright');
import fs from 'fs';
const BASE = process.env.APP_URL || 'http://localhost:4173/polestar-journey-log-explorer/';
const FILES = process.argv[2] ? process.argv[2].split(',') : [];
const OUT = process.argv[3] || './screenshots';
fs.mkdirSync(OUT, { recursive: true });
// PLAYWRIGHT_CHROMIUM_PATH points at a preinstalled Chromium when the Playwright-managed build is unavailable
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined });
const errors = [];
const checks = [];
async function run(name, { width, height, scheme, mobile = false }) {
    const ctx = await browser.newContext({ viewport: { width, height }, colorScheme: scheme, isMobile: mobile, hasTouch: mobile });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(`[${name}] pageerror: ${e.message}`));
    page.on('console', (m) => { if (m.type() === 'error' && !/googletagmanager|iubenda|ERR_|net::|Failed to load resource/.test(m.text())) errors.push(`[${name}] console: ${m.text().slice(0, 300)}`); });
    for (let a = 0; a < 30; a++) { try { await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 }); break; } catch (e) { if (a === 29) throw e; await page.waitForTimeout(1000); } }
    await page.waitForSelector('text=Your journeys', { timeout: 30000 });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('text=Your journeys', { timeout: 30000 });
    // Set the colour scheme after the storage reset, otherwise the reload drops it and every run is dark
    const current = await page.evaluate(() => document.documentElement.getAttribute('data-mantine-color-scheme'));
    if (current !== scheme) await page.getByRole('button', { name: /Toggle colour scheme/i }).click();
    await page.waitForTimeout(300);
    checks.push(`[${name}] colour scheme: ${await page.evaluate(() => document.documentElement.getAttribute('data-mantine-color-scheme'))}`);
    if (!mobile) await page.screenshot({ path: `${OUT}/${name}-consent.png`, fullPage: false });
    await page.getByRole('button', { name: /^Decline$/ }).click();
    await page.waitForTimeout(300);
    if (!mobile) await page.screenshot({ path: `${OUT}/${name}-landing.png`, fullPage: false });
    if (FILES.length) await page.locator('input[type=file]').setInputFiles(FILES);
    else await page.getByRole('button', { name: /sample data/i }).click();
    await page.waitForSelector('text=Distance driven', { timeout: 60000 });
    await page.waitForTimeout(1500);
    const bodyText = await page.evaluate(() => document.body.innerText);
    const m = bodyText.match(/(\d+) files? · ([\d,]+) trips( · ([\d,]+) duplicates removed)?/);
    checks.push(`[${name}] sources bar: ${m ? m[0] : 'NOT FOUND'}`);
    // Simple level (default on fresh storage)
    await page.screenshot({ path: `${OUT}/${name}-simple.png`, fullPage: true });
    // Detailed
    await page.locator('label', { hasText: /^Detailed$/ }).first().click();
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${OUT}/${name}-detailed.png`, fullPage: true });
    // Expert → Explore tab
    await page.locator('label', { hasText: /^Expert$/ }).first().click();
    await page.waitForTimeout(600);
    await page.getByRole('tab', { name: 'Explore' }).click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${OUT}/${name}-explore.png`, fullPage: true });
    await page.getByRole('tab', { name: 'Trips' }).click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${OUT}/${name}-trips-expert.png`, fullPage: false });
    if (!mobile) {
        await page.getByRole('tab', { name: 'Insights' }).click();
        await page.waitForTimeout(800);
        await page.screenshot({ path: `${OUT}/${name}-insights.png`, fullPage: true });
        // Map (lazy chunk; basemap tiles are external so the frame may be blank offline)
        await page.getByRole('tab', { name: 'Map' }).click();
        await page.waitForSelector('.ol-viewport', { timeout: 30000 });
        await page.waitForTimeout(2500);
        await page.screenshot({ path: `${OUT}/${name}-map.png`, fullPage: false });
        // Tariff settings: open from the overview, switch to time-of-use
        await page.getByRole('tab', { name: 'Overview' }).click();
        await page.waitForTimeout(500);
        await page.getByRole('button', { name: /Electricity.*settings/i }).click();
        await page.waitForSelector('text=Effective price', { timeout: 15000 });
        await page.getByPlaceholder(/ottawa, texas/).fill('Time of use');
        await page.waitForTimeout(300);
        await page.keyboard.press('ArrowDown'); // first match: Hydro Ottawa · Time of use (named providers list first)
        await page.keyboard.press('Enter');
        await page.waitForTimeout(1200);
        const modalText = await page.evaluate(() => document.body.innerText);
        checks.push(`[${name}] tariff modal: ${modalText.includes('charging sessions inferred') ? 'sessions priced' : 'proportional'} · ${modalText.includes('Hydro Ottawa') ? 'preset applied' : 'PRESET MISSING'}`);
        await page.screenshot({ path: `${OUT}/${name}-tariff.png`, fullPage: false });
        await page.keyboard.press('Escape');
    } else {
        // Mobile: the tariff modal goes full-screen
        await page.locator('label', { hasText: /^Detailed$/ }).first().click();
        await page.waitForTimeout(600);
        await page.getByRole('button', { name: /Electricity.*settings/i }).click();
        await page.waitForSelector('text=Effective price', { timeout: 15000 });
        await page.waitForTimeout(800);
        await page.screenshot({ path: `${OUT}/${name}-tariff.png`, fullPage: false });
        await page.keyboard.press('Escape');
    }
    await ctx.close();
}
await run('dark-desktop', { width: 1440, height: 900, scheme: 'dark' });
await run('light-desktop', { width: 1440, height: 900, scheme: 'light' });
await run('dark-mobile', { width: 390, height: 844, scheme: 'dark', mobile: true });
await browser.close();
console.log(checks.join('\n'));
if (errors.length) {
    console.error(`ERRORS (${errors.length}):\n${errors.join('\n')}`);
    process.exit(1);
}
console.log('no page errors');
