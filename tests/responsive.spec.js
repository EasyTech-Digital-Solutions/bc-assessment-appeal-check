const { test, expect } = require('@playwright/test');

const { PAGES, blockThirdParty } = require('./helpers');
const WIDTHS = [320, 375, 414];

for (const width of WIDTHS) {
  for (const path of PAGES) {
    test(`no horizontal overflow: ${path} @ ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await blockThirdParty(page);
      await page.goto(path);
      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
    });
  }
}
