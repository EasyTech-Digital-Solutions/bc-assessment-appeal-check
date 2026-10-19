const { test, expect } = require('@playwright/test');

// Mirrors the exact thresholds in Part 4 of the build brief: delta >= 5
// "investigate", 2 <= delta < 5 "borderline", -2 <= delta < 2 "inline",
// delta < -2 "below average", no neighbourhood % => "unknown". The 4th tier
// was added as a deliberate spec change (not a fix for a live bug — the old
// 3-tier version was internally consistent with its own spec) so a strongly
// negative delta gets its own honest label instead of defaulting into
// "Roughly in line."
async function runCheck(page, current, previous, neighbourhood) {
  await page.goto('/');
  await page.fill('#currentValue', String(current));
  await page.fill('#previousValue', String(previous));
  if (neighbourhood !== null) await page.fill('#neighbourhoodChange', String(neighbourhood));
  await page.click('#check-form button[type=submit]');
  await page.waitForSelector('#check-result.is-visible');
  return page.locator('#check-result').innerText();
}

test('delta >= 5 reads "Worth investigating"', async ({ page }) => {
  const text = await runCheck(page, 950000, 820000, 8); // yourChange ~15.9%, delta ~7.9
  expect(text).toContain('Worth investigating');
  expect(text).toContain('+15.9%');
});

test('2 <= delta < 5 reads "Borderline"', async ({ page }) => {
  const text = await runCheck(page, 880000, 820000, 4); // yourChange ~7.3%, delta ~3.3
  expect(text).toContain('Borderline');
});

test('-2 <= delta < 2 reads "Roughly in line"', async ({ page }) => {
  const text = await runCheck(page, 860000, 820000, 5); // yourChange ~4.9%, delta ~-0.1
  expect(text).toContain('Roughly in line');
});

test('delta < -2 reads "Below average", not "Roughly in line"', async ({ page }) => {
  // current == previous => yourChange = 0%; neighbourhood 19.8% => delta = -19.8.
  const text = await runCheck(page, 800000, 800000, 19.8);
  expect(text).toContain('Below average');
  expect(text).not.toContain('Roughly in line');
  expect(text.toLowerCase()).toContain('dropped');
});

test('boundary: delta exactly -2 stays "Roughly in line"', async ({ page }) => {
  // yourChange = 0%, neighbourhood = 2% => delta = exactly -2 (the ">= -2" edge).
  const text = await runCheck(page, 800000, 800000, 2);
  expect(text).toContain('Roughly in line');
});

test('boundary: delta just under -2 flips to "Below average"', async ({ page }) => {
  // yourChange = 0%, neighbourhood = 2.1% => delta = -2.1.
  const text = await runCheck(page, 800000, 800000, 2.1);
  expect(text).toContain('Below average');
});

test('no neighbourhood % shows own change only, with a prompt', async ({ page }) => {
  const text = await runCheck(page, 950000, 820000, null);
  expect(text).toContain('We can show your change');
  expect(text).toContain('average change in your area');
});

test('never surfaces a dollar figure or "you should appeal"', async ({ page }) => {
  const text = await runCheck(page, 950000, 820000, 8);
  expect(text.toLowerCase()).not.toContain('you should appeal');
  expect(text).not.toMatch(/\$[\d,]+/);
});

test('invalid input (previous value zero) shows a validation message, not a crash', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.fill('#currentValue', '950000');
  await page.fill('#previousValue', '0');
  await page.click('#check-form button[type=submit]');
  await expect(page.locator('#check-result')).toContainText('Check your numbers');
  expect(errors).toEqual([]);
});

test('municipality is optional and does not affect the verdict', async ({ page }) => {
  const without = await runCheck(page, 950000, 820000, 8);
  await page.fill('#propertyMunicipality', 'Burnaby');
  await page.click('#check-form button[type=submit]');
  await page.waitForSelector('#check-result.is-visible');
  const withMuni = await page.locator('#check-result h3').innerText();
  expect(without).toContain(withMuni);
});

test('municipality dropdown is searchable and has BC-wide coverage', async ({ page }) => {
  await page.goto('/');
  const count = await page.locator('#bc-municipalities option').count();
  expect(count).toBeGreaterThan(150); // ~160 per the brief; exact count may shift with future edits
  await expect(page.locator('#propertyMunicipality')).toHaveAttribute('list', 'bc-municipalities');
});

test('result shows next steps with official links', async ({ page }) => {
  await runCheck(page, 950000, 820000, 8);
  const steps = page.locator('#check-result .next-steps');
  await expect(steps).toBeVisible();
  await expect(steps.locator('a[href="/evidence"]')).toHaveCount(1);
  await expect(steps.locator('a[href*="bcassessment.ca"]')).toHaveCount(2);
  await expect(steps.locator('a[href*="assessmentappeal.bc.ca"]')).toHaveCount(1);
});

test('no lead form, street address field or referral wording on the home page', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#lead-form')).toHaveCount(0);
  await expect(page.locator('#lead-section')).toHaveCount(0);
  await expect(page.locator('#propertyAddress')).toHaveCount(0);
  const body = (await page.locator('body').innerText()).toLowerCase();
  expect(body).not.toContain('referral');
  expect(body).not.toContain('licensed');
});
