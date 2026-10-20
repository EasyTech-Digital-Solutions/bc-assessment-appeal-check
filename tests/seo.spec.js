const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { INDEXABLE, blockThirdParty } = require('./helpers');

const ROOT = path.resolve(__dirname, '..');
const SITE = 'https://propertytaxbc.ca';
const fileFor = (p) => (p === '/' ? 'index.html' : p.replace(/^\//, '').replace(/\/$/, '') + '/index.html');
const urlFor = (p) => SITE + p;

for (const p of INDEXABLE) {
  test.describe(`seo: ${p}`, () => {
    const html = fs.readFileSync(path.join(ROOT, fileFor(p)), 'utf8');

    test('title is present, unique to the site brand, and a sensible length', () => {
      const t = html.match(/<title>([^<]+)<\/title>/);
      expect(t).not.toBeNull();
      expect(t[1]).toContain('PropertyTaxBC');
      expect(t[1].length).toBeGreaterThanOrEqual(15);
      expect(t[1].length).toBeLessThanOrEqual(75);
    });

    test('meta description is present and 50 to 175 characters', () => {
      const d = html.match(/<meta name="description" content="([^"]+)">/);
      expect(d).not.toBeNull();
      expect(d[1].length).toBeGreaterThanOrEqual(50);
      expect(d[1].length).toBeLessThanOrEqual(175);
    });

    test('canonical points at this exact page', () => {
      const c = html.match(/<link rel="canonical" href="([^"]+)">/);
      expect(c[1]).toBe(urlFor(p));
    });

    test('open graph and twitter tags are complete', () => {
      for (const tag of ['og:title', 'og:description', 'og:url', 'og:image', 'og:type', 'og:site_name']) {
        expect(html, tag).toContain(`property="${tag}"`);
      }
      for (const tag of ['twitter:card', 'twitter:title', 'twitter:description', 'twitter:image']) {
        expect(html, tag).toContain(`name="${tag}"`);
      }
      expect(html).toContain(`<meta property="og:url" content="${urlFor(p)}">`);
    });

    test('language is Canadian English and viewport is set', () => {
      expect(html).toMatch(/<html lang="en-CA">/);
      expect(html).toContain('name="viewport"');
    });

    test('page is not marked noindex', () => {
      expect(html).not.toMatch(/name="robots" content="[^"]*noindex/);
    });

    test('structured data is valid and describes the page', async ({ page }) => {
      await blockThirdParty(page);
      await page.goto(p);
      const blocks = (await page.locator('script[type="application/ld+json"]').allTextContents()).map((b) => JSON.parse(b));
      expect(blocks.length).toBeGreaterThan(0);
      const types = blocks.map((b) => b['@type']);
      expect(types.some((t) => ['WebPage', 'Organization', 'FAQPage', 'WebApplication', 'ContactPage', 'DefinedTermSet'].includes(t))).toBe(true);
    });

    test('images have alt text', async ({ page }) => {
      await blockThirdParty(page);
      await page.goto(p);
      const missing = await page.$$eval('img', (imgs) => imgs.filter((i) => !i.hasAttribute('alt')).map((i) => i.src));
      expect(missing).toEqual([]);
    });

    test('headings do not skip from h1 straight to h3 or lower', async ({ page }) => {
      await blockThirdParty(page);
      await page.goto(p);
      const levels = await page.$$eval('main h1, main h2, main h3, main h4', (hs) => hs.map((h) => Number(h.tagName[1])));
      expect(levels[0]).toBe(1);
      if (levels.length > 1) expect(levels[1]).toBeLessThanOrEqual(2);
    });
  });
}

test('calculator pages carry WebApplication markup', () => {
  for (const f of ['index.html', 'deferment/index.html', 'home-owner-grant/index.html']) {
    expect(fs.readFileSync(path.join(ROOT, f), 'utf8'), f).toContain('"WebApplication"');
  }
});

test('guide pages show a last reviewed date and sources', () => {
  for (const f of ['how-it-works', 'evidence', 'faq', 'deferment', 'home-owner-grant', 'glossary']) {
    const html = fs.readFileSync(path.join(ROOT, f, 'index.html'), 'utf8');
    expect(html, f).toMatch(/class="last-reviewed"><em>Last reviewed: [A-Z][a-z]+ 20\d\d\.<\/em> Sources: <a /);
  }
});

test('404 page is noindex', () => {
  expect(fs.readFileSync(path.join(ROOT, '404.html'), 'utf8')).toContain('<meta name="robots" content="noindex">');
});

test('sitemap lists every indexable page and nothing else', () => {
  const xml = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]).sort();
  const expected = INDEXABLE.map(urlFor).sort();
  const cityPages = locs.filter((l) => l.startsWith(SITE + '/property-tax'));
  expect(locs.filter((l) => !l.startsWith(SITE + '/property-tax'))).toEqual(expected);
  for (const l of cityPages) {
    const rel = l.replace(SITE, '');
    expect(fs.existsSync(path.join(ROOT, fileFor(rel))), rel).toBe(true);
  }
  for (const m of xml.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)) expect(m[1]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
});

test('robots.txt allows crawling and points to the sitemap', () => {
  const robots = fs.readFileSync(path.join(ROOT, 'robots.txt'), 'utf8');
  expect(robots).toContain('Allow: /');
  expect(robots).not.toMatch(/Disallow: \/\s*$/m);
  expect(robots).toContain('Sitemap: https://propertytaxbc.ca/sitemap.xml');
});

test('titles and descriptions are unique across pages', () => {
  const titles = new Map();
  const descs = new Map();
  for (const p of INDEXABLE) {
    const html = fs.readFileSync(path.join(ROOT, fileFor(p)), 'utf8');
    const t = html.match(/<title>([^<]+)<\/title>/)[1];
    const d = html.match(/<meta name="description" content="([^"]+)">/)[1];
    expect(titles.has(t), `duplicate title on ${p} and ${titles.get(t)}`).toBe(false);
    expect(descs.has(d), `duplicate description on ${p} and ${descs.get(d)}`).toBe(false);
    titles.set(t, p);
    descs.set(d, p);
  }
});
