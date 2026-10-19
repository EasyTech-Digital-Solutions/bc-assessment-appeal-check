const { test, expect } = require('@playwright/test');

const { PAGES, blockThirdParty } = require('./helpers');

for (const path of PAGES) {
  test.describe(`page: ${path}`, () => {
    test('loads with no console errors and exactly one h1', async ({ page }) => {
      const errors = [];
      page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
      page.on('console', (msg) => { if (msg.type() === 'error') errors.push('console: ' + msg.text()); });

      await blockThirdParty(page);
      const response = await page.goto(path);
      expect(response.status()).toBe(200);

      await expect(page.locator('h1')).toHaveCount(1);
      expect(errors).toEqual([]);
    });

    test('any JSON-LD blocks are valid JSON', async ({ page }) => {
      await page.goto(path);
      const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
      for (const block of blocks) {
        expect(() => JSON.parse(block)).not.toThrow();
      }
    });

    test('no duplicate element ids', async ({ page }) => {
      await page.goto(path);
      const dupes = await page.evaluate(() => {
        const ids = Array.from(document.querySelectorAll('[id]')).map((el) => el.id);
        return ids.filter((id, i) => ids.indexOf(id) !== i);
      });
      expect(dupes).toEqual([]);
    });
  });
}

test('favicon and social assets resolve', async ({ request }) => {
  for (const asset of ['/favicon.svg', '/favicon-32.png', '/apple-touch-icon.png', '/og-image.png', '/robots.txt', '/sitemap.xml']) {
    const res = await request.get(asset);
    expect(res.status(), asset).toBe(200);
  }
});
