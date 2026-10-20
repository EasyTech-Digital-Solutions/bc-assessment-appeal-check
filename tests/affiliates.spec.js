const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { blockThirdParty } = require('./helpers');

const ROOT = path.resolve(__dirname, '..');
const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'affiliates.json'), 'utf8'));

test.beforeEach(async ({ page }) => blockThirdParty(page));

test('every affiliate slot on the site has an entry in data/affiliates.json', () => {
  const files = ['index.html', 'deferment/index.html', 'home-owner-grant/index.html'];
  for (const f of files) {
    const html = fs.readFileSync(path.join(ROOT, f), 'utf8');
    for (const m of html.matchAll(/data-affiliate="([^"]+)"/g)) {
      expect(data.links[m[1]], `${f} uses ${m[1]}`).toBeTruthy();
    }
  }
});

test('affiliate entries have a label, a signup link and an https url when filled', () => {
  for (const [id, l] of Object.entries(data.links)) {
    expect(l.label, id).toBeTruthy();
    expect(l.signup, id).toMatch(/^https:\/\//);
    if (l.url) expect(l.url, id).toMatch(/^https:\/\//);
  }
});

test('no affiliate link inside any calculator result or on the appeal check', () => {
  const home = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  expect(home).not.toContain('data-affiliate=');
  for (const js of ['calculator.js', 'grant.js', 'deferment-cost.js', 'deferment.js']) {
    expect(fs.readFileSync(path.join(ROOT, 'js', js), 'utf8'), js).not.toMatch(/sponsored|data-affiliate/);
  }
});

test('slots stay hidden while urls are empty', async ({ page }) => {
  await page.route('**/data/affiliates.json', (route) =>
    route.fulfill({ contentType: 'application/json', body: JSON.stringify({ links: { ratehub_heloc: { label: 'X', url: '' } } }) })
  );
  await page.goto('/deferment/');
  await page.waitForTimeout(200);
  await expect(page.locator('[data-affiliate="ratehub_heloc"]')).toBeHidden();
});

test('a filled slot shows a sponsored link with a disclosure', async ({ page }) => {
  await page.route('**/data/affiliates.json', (route) =>
    route.fulfill({ contentType: 'application/json', body: JSON.stringify({ links: { ratehub_mortgage_renewal: { label: 'Compare mortgage renewal rates', url: 'https://example.com/r' } } }) })
  );
  await page.goto('/home-owner-grant/');
  const slot = page.locator('[data-affiliate="ratehub_mortgage_renewal"]');
  await expect(slot).toBeVisible();
  const a = slot.locator('a');
  await expect(a).toHaveAttribute('rel', 'sponsored noopener');
  await expect(a).toHaveAttribute('href', 'https://example.com/r');
  await expect(slot).toContainText('Affiliate link');
});

test('a broken affiliates file leaves the page working', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.route('**/data/affiliates.json', (route) => route.fulfill({ status: 500, body: 'oops' }));
  await page.goto('/deferment/');
  await page.fill('#annualTax', '5000');
  await page.click('#cost-form button[type=submit]');
  await expect(page.locator('#cost-result h3')).toContainText('owed');
  expect(errors).toEqual([]);
});
