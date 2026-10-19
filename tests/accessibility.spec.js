const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const { PAGES, blockThirdParty } = require('./helpers');

for (const p of PAGES) {
  test(`no serious accessibility issues on ${p}`, async ({ page }) => {
    await blockThirdParty(page);
    await page.goto(p);
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
    const serious = results.violations
      .filter((v) => v.impact === 'serious' || v.impact === 'critical')
      .map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')}`);
    expect(serious).toEqual([]);
  });
}

test('skip link is the first thing keyboard users reach and moves to main', async ({ page }) => {
  await blockThirdParty(page);
  await page.goto('/');
  await page.keyboard.press('Tab');
  const focused = page.locator(':focus');
  await expect(focused).toHaveText('Skip to content');
  await expect(focused).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#main$/);
});

test('every calculator field has a visible label', async ({ page }) => {
  await blockThirdParty(page);
  for (const p of ['/', '/deferment/', '/home-owner-grant/']) {
    await page.goto(p);
    const unlabeled = await page.$$eval('form input:not([type=hidden]):not([type=radio]), form select, form textarea', (els) =>
      els.filter((el) => !el.id || !document.querySelector(`label[for="${el.id}"]`)).map((el) => el.id || el.name)
    );
    expect(unlabeled, p).toEqual([]);
  }
});

test('calculators work with the keyboard only', async ({ page }) => {
  await blockThirdParty(page);
  await page.goto('/home-owner-grant/');
  await page.focus('#grantValue');
  await page.keyboard.type('1000000');
  await page.keyboard.press('Enter');
  await expect(page.locator('#grant-result h3')).toHaveText('Estimated grant: $570');
});

test('results are announced to screen readers', async ({ page }) => {
  await blockThirdParty(page);
  for (const [p, id] of [['/', '#check-result'], ['/deferment/', '#cost-result'], ['/deferment/', '#deferment-result'], ['/home-owner-grant/', '#grant-result']]) {
    await page.goto(p);
    await expect(page.locator(id), `${p} ${id}`).toHaveAttribute('aria-live', 'polite');
  }
});

test('text is at least 18px on phones', async ({ page }) => {
  await blockThirdParty(page);
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto('/');
  const size = await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector('main p')).fontSize));
  expect(size).toBeGreaterThanOrEqual(18);
});

test('buttons and links in calculators are at least 44px tall on phones', async ({ page }) => {
  await blockThirdParty(page);
  await page.setViewportSize({ width: 375, height: 800 });
  for (const p of ['/', '/deferment/', '/home-owner-grant/']) {
    await page.goto(p);
    const small = await page.$$eval('form button[type=submit]', (bs) => bs.filter((b) => b.getBoundingClientRect().height < 44).length);
    expect(small, p).toBe(0);
  }
});
