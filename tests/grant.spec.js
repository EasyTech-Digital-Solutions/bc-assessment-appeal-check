const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { blockThirdParty } = require('./helpers');

const rules = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'rules.json'), 'utf8')).home_owner_grant;

async function estimate(page, input) {
  return page.evaluate((i) => window.__grant.estimate(i), input);
}

test.beforeEach(async ({ page }) => {
  await blockThirdParty(page);
  await page.goto('/home-owner-grant/');
});

test('grant rules in js/grant.js match data/rules.json', async ({ page }) => {
  const r = await page.evaluate(() => window.__grant.RULES);
  expect(r.threshold).toBe(rules.threshold);
  expect(r.perThousand).toBe(rules.reduction_per_1000_over);
  expect(r.amounts.metro.regular).toBe(rules.amounts.metro.regular);
  expect(r.amounts.metro.additional).toBe(rules.amounts.metro.additional);
  expect(r.amounts.other.regular).toBe(rules.amounts.other.regular);
  expect(r.amounts.other.additional).toBe(rules.amounts.other.additional);
  expect(r.minTax.regular).toBe(rules.min_tax_regular);
  expect(r.minTax.additional).toBe(rules.min_tax_additional);
});

test('full grant at or below the threshold', async ({ page }) => {
  expect((await estimate(page, { value: 2075000, zone: 'metro', additional: false, tax: null })).grant).toBe(570);
  expect((await estimate(page, { value: 900000, zone: 'other', additional: false, tax: null })).grant).toBe(770);
  expect((await estimate(page, { value: 900000, zone: 'metro', additional: true, tax: null })).grant).toBe(845);
  expect((await estimate(page, { value: 900000, zone: 'other', additional: true, tax: null })).grant).toBe(1045);
});

test('reduction is $5 per $1,000 over the threshold', async ({ page }) => {
  const r = await estimate(page, { value: 2100000, zone: 'metro', additional: false, tax: null });
  expect(r.reduction).toBe(125);
  expect(r.grant).toBe(445);
});

test('grant reaches zero exactly at the gov.bc.ca cutoffs', async ({ page }) => {
  const cut = rules.zero_cutoffs_from_source;
  expect((await estimate(page, { value: cut.regular_metro, zone: 'metro', additional: false, tax: null })).grant).toBe(0);
  expect((await estimate(page, { value: cut.regular_other, zone: 'other', additional: false, tax: null })).grant).toBe(0);
  expect((await estimate(page, { value: cut.additional_metro, zone: 'metro', additional: true, tax: null })).grant).toBe(0);
  expect((await estimate(page, { value: cut.additional_other, zone: 'other', additional: true, tax: null })).grant).toBe(0);
  expect((await estimate(page, { value: cut.regular_metro - 1000, zone: 'metro', additional: false, tax: null })).grant).toBe(5);
});

test('grant never goes negative far above the cutoff', async ({ page }) => {
  const r = await estimate(page, { value: 9000000, zone: 'other', additional: true, tax: null });
  expect(r.grant).toBe(0);
  expect(r.reduction).toBe(1045);
});

test('minimum tax rule limits the grant', async ({ page }) => {
  const reg = await estimate(page, { value: 800000, zone: 'metro', additional: false, tax: 700 });
  expect(reg.grant).toBe(350);
  expect(reg.limitedByTax).toBe(true);
  const add = await estimate(page, { value: 800000, zone: 'metro', additional: true, tax: 500 });
  expect(add.grant).toBe(400);
  const none = await estimate(page, { value: 800000, zone: 'metro', additional: false, tax: 300 });
  expect(none.grant).toBe(0);
});

test('form shows an estimate for typical input', async ({ page }) => {
  await page.fill('#grantValue', '$1,250,000');
  await page.check('input[name=zone][value=metro]');
  await page.check('input[name=additional][value=yes]');
  await page.click('#grant-form button[type=submit]');
  await expect(page.locator('#grant-result h3')).toHaveText('Estimated grant: $845');
});

test('form explains the reduction above the threshold', async ({ page }) => {
  await page.fill('#grantValue', '2100000');
  await page.click('#grant-form button[type=submit]');
  await expect(page.locator('#grant-result')).toContainText('reduces it by $125');
  await expect(page.locator('#grant-result h3')).toHaveText('Estimated grant: $445');
});

test('form shows no grant above the cutoff', async ({ page }) => {
  await page.fill('#grantValue', '3000000');
  await page.click('#grant-form button[type=submit]');
  await expect(page.locator('#grant-result h3')).toHaveText('No grant at this value');
});

test('form rejects missing or invalid value without crashing', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  for (const v of ['', '0', '-5', 'abc']) {
    await page.fill('#grantValue', v);
    await page.click('#grant-form button[type=submit]');
    await expect(page.locator('#grant-result')).toContainText('Check your answers');
  }
  expect(errors).toEqual([]);
});

test('page states the 2027 change and links to the official source', async ({ page }) => {
  await expect(page.locator('main')).toContainText('From January 1, 2027, the regular grant is $570 everywhere');
  await expect(page.locator('a[href*="gov.bc.ca/gov/content/taxes/property-taxes/annual-property-tax/home-owner-grant"]').first()).toBeVisible();
});
