const { test, expect } = require('@playwright/test');
const { PAGES, blockThirdParty, events } = require('./helpers');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const fileFor = (p) => (p === '/' ? 'index.html' : p === '/404.html' ? '404.html' : p.replace(/^\//, '').replace(/\/$/, '') + '/index.html');

test.beforeEach(async ({ page }) => {
  await blockThirdParty(page);
});

for (const p of PAGES) {
  test(`analytics loaded on ${p}`, () => {
    const html = fs.readFileSync(path.join(ROOT, fileFor(p)), 'utf8');
    expect(html).toContain('googletagmanager.com/gtag/js?id=G-MWPM1ESFFH');
    expect(html).toContain('<script src="/js/gtag-init.js"></script>');
    expect(html).toContain('<script src="/js/analytics-events.js"></script>');
  });
}

test('appeal check sends started and completed with the tier only', async ({ page }) => {
  await page.goto('/');
  await page.fill('#currentValue', '950000');
  await page.fill('#previousValue', '820000');
  await page.fill('#neighbourhoodChange', '8');
  await page.click('#check-form button[type=submit]');
  const ev = await events(page);
  expect(ev.map((e) => e.name)).toContain('assessment_check_started');
  const done = ev.find((e) => e.name === 'assessment_check_completed');
  expect(done.params).toEqual({ tier: 'investigate' });
});

test('grant check sends started and completed', async ({ page }) => {
  await page.goto('/home-owner-grant/');
  await page.fill('#grantValue', '1000000');
  await page.click('#grant-form button[type=submit]');
  const ev = await events(page);
  expect(ev.map((e) => e.name)).toContain('grant_check_started');
  expect(ev.find((e) => e.name === 'grant_check_completed').params).toEqual({ outcome: 'grant' });
});

test('deferment cost sends started and completed', async ({ page }) => {
  await page.goto('/deferment/');
  await page.fill('#annualTax', '5000');
  await page.click('#cost-form button[type=submit]');
  const names = (await events(page)).map((e) => e.name);
  expect(names).toContain('deferment_cost_started');
  expect(names).toContain('deferment_cost_completed');
});

test('clicking an official source sends official_link_click', async ({ page, context }) => {
  await page.goto('/how-it-works/');
  const link = page.locator('a[href*="bcassessment.ca"]').first();
  const [popup] = await Promise.all([context.waitForEvent('page').catch(() => null), link.click()]);
  if (popup) await popup.close();
  const ev = (await events(page)).find((e) => e.name === 'official_link_click');
  expect(ev).toBeTruthy();
  expect(ev.params.link_domain).toMatch(/bcassessment\.ca$/);
  expect(ev.params.page_path).toBe('/how-it-works/');
});

test('downloading the calendar sends calendar_download', async ({ page }) => {
  await page.goto('/deadlines/');
  await page.evaluate(() => document.addEventListener('click', (e) => e.preventDefault()));
  await page.click('a[href$=".ics"]');
  const ev = (await events(page)).find((e) => e.name === 'calendar_download');
  expect(ev.params.file_name).toBe('bc-property-tax-deadlines-2027.ics');
});

test('tool buttons send tool_cta_click', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => document.addEventListener('click', (e) => e.preventDefault()));
  await page.click('a.btn[href="/home-owner-grant/"]');
  await page.click('a.btn[href="/deferment/"]');
  const tools = (await events(page)).filter((e) => e.name === 'tool_cta_click').map((e) => e.params.tool);
  expect(tools).toEqual(['grant', 'deferment']);
});

test('scroll depth fires once at 50 and once at 90', async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 600 });
  await page.goto('/faq/');
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
    await page.waitForTimeout(100);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  }
  await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
  await page.waitForTimeout(100);
  const marks = (await events(page)).filter((e) => e.name === 'scroll_depth').map((e) => e.params.percent);
  expect(marks.sort()).toEqual([50, 90]);
});

test('404 page sends page_not_found', async ({ page }) => {
  await page.goto('/404.html');
  const ev = (await events(page)).find((e) => e.name === 'page_not_found');
  expect(ev.params.page_path).toBe('/404.html');
});

test('affiliate click sends affiliate_click with the link id', async ({ page }) => {
  await page.route('**/data/affiliates.json', (route) =>
    route.fulfill({ contentType: 'application/json', body: JSON.stringify({ links: { ratehub_heloc: { label: 'Compare home equity rates', url: 'https://example.com/aff' } } }) })
  );
  await page.goto('/deferment/');
  const slot = page.locator('[data-affiliate="ratehub_heloc"]');
  await expect(slot).toBeVisible();
  await page.evaluate(() => document.addEventListener('click', (e) => e.preventDefault()));
  await slot.locator('a').click();
  const ev = (await events(page)).find((e) => e.name === 'affiliate_click');
  expect(ev.params).toEqual({ link_id: 'ratehub_heloc' });
});

test('no event carries a typed dollar value', async ({ page }) => {
  await page.goto('/');
  await page.fill('#currentValue', '987654');
  await page.fill('#previousValue', '876543');
  await page.click('#check-form button[type=submit]');
  const text = JSON.stringify(await page.evaluate(() => (window.dataLayer || []).map((a) => Array.from(a))));
  expect(text).not.toContain('987654');
  expect(text).not.toContain('876543');
});
