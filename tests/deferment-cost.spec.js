const { test, expect } = require('@playwright/test');
const { blockThirdParty } = require('./helpers');

// Reference values worked out by hand / spreadsheet:
//   new rules: sum over k=1..N of T * (1 + r/12)^(12k), r = prime + 2%
//   old rules: sum over k=1..N of T * (1 + r_old * k), simple interest
function ref(tax, years, prime, program, loc) {
  let n = 0, o = 0, l = 0;
  const oldRate = program === 'families' ? prime : Math.max(prime - 2, 0);
  for (let k = 1; k <= years; k++) {
    n += tax * Math.pow(1 + (prime + 2) / 100 / 12, 12 * k);
    o += tax * (1 + (oldRate / 100) * k);
    if (loc != null) l += tax * Math.pow(1 + loc / 100 / 12, 12 * k);
  }
  const fees = program === 'regular' ? 60 + 10 * (years - 1) : 0;
  return { owedNew: n + fees, owedOld: o + fees, owedLoc: loc != null ? l : null, fees, principal: tax * years };
}

const CASES = [
  { annualTax: 5400, years: 10, primeRate: 4.45, program: 'regular', locRate: 6.95 },
  { annualTax: 3000, years: 1, primeRate: 4.45, program: 'families', locRate: null },
  { annualTax: 8200, years: 25, primeRate: 3.2, program: 'regular', locRate: null },
  { annualTax: 1200, years: 5, primeRate: 1.5, program: 'regular', locRate: 0 },
];

test.beforeEach(async ({ page }) => {
  await blockThirdParty(page);
  await page.goto('/deferment/');
});

for (const c of CASES) {
  test(`estimate matches reference: ${c.annualTax} x ${c.years}y ${c.program} prime ${c.primeRate}`, async ({ page }) => {
    const got = await page.evaluate((i) => window.__defermentCost.estimate(i), c);
    const want = ref(c.annualTax, c.years, c.primeRate, c.program, c.locRate);
    expect(got.principal).toBeCloseTo(want.principal, 2);
    expect(got.owedNew).toBeCloseTo(want.owedNew, 2);
    expect(got.owedOld).toBeCloseTo(want.owedOld, 2);
    expect(got.fees).toBe(want.fees);
    if (c.locRate === null) expect(got.owedLoc).toBeNull();
    else expect(got.owedLoc).toBeCloseTo(want.owedLoc, 2);
  });
}

test('old regular rate never goes below zero when prime is under 2%', async ({ page }) => {
  const got = await page.evaluate(() => window.__defermentCost.estimate({ annualTax: 1000, years: 3, primeRate: 1, program: 'regular', locRate: null }));
  expect(got.oldRate).toBe(0);
  expect(got.interestOld).toBe(0);
});

test('new rules always cost more than old rules at the same prime', async ({ page }) => {
  const got = await page.evaluate(() => window.__defermentCost.estimate({ annualTax: 5000, years: 15, primeRate: 4.45, program: 'families', locRate: null }));
  expect(got.owedNew).toBeGreaterThan(got.owedOld);
});

test('form shows the comparison table', async ({ page }) => {
  await page.fill('#annualTax', '5,400');
  await page.fill('#years', '10');
  await page.selectOption('#program', 'regular');
  await page.fill('#locRate', '6.95');
  await page.click('#cost-form button[type=submit]');
  const result = page.locator('#cost-result');
  await expect(result.locator('h3')).toContainText('owed after 10 years');
  await expect(result.locator('tbody tr')).toHaveCount(3);
  await expect(result).toContainText('6.45% compound');
  await expect(result).toContainText('2.45% simple');
  await expect(result).toContainText('Fees add');
});

test('families program shows no fees and no line of credit row when blank', async ({ page }) => {
  await page.fill('#annualTax', '3000');
  await page.fill('#years', '1');
  await page.selectOption('#program', 'families');
  await page.click('#cost-form button[type=submit]');
  const result = page.locator('#cost-result');
  await expect(result.locator('h3')).toContainText('after 1 year');
  await expect(result).not.toContainText('Fees add');
  await expect(result.locator('tbody tr')).toHaveCount(2);
});

test('invalid input shows a message, not a crash', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const bad = [['', '10', '4.45'], ['5000', '0', '4.45'], ['5000', '41', '4.45'], ['5000', '10', ''], ['5000', '10', '40'], ['-100', '10', '4.45']];
  for (const [tax, years, prime] of bad) {
    await page.fill('#annualTax', tax);
    await page.fill('#years', years);
    await page.fill('#primeRate', prime);
    await page.click('#cost-form button[type=submit]');
    await expect(page.locator('#cost-result h3')).toHaveText('Check your numbers');
  }
  expect(errors).toEqual([]);
});

test('rate card shows the current quarter', async ({ page }) => {
  await expect(page.locator('aside').first()).toContainText('effective Oct 1');
  await expect(page.locator('#primeRate')).toHaveValue('4.45');
});
