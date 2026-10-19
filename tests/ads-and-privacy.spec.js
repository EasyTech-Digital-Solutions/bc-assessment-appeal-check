const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { PAGES, blockThirdParty } = require('./helpers');

const ROOT = path.resolve(__dirname, '..');
const PUB = 'ca-pub-6309879983967574';
const fileFor = (p) => (p === '/' ? 'index.html' : p === '/404.html' ? '404.html' : p.replace(/^\//, '').replace(/\/$/, '') + '/index.html');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

const NO_ADS = ['/privacy/', '/terms/', '/404.html'];

test('ads.txt names this AdSense publisher', () => {
  expect(read('ads.txt').trim()).toBe(`google.com, ${PUB.replace('ca-', '')}, DIRECT, f08c47fec0942fa0`);
});

for (const p of PAGES) {
  test(`AdSense setup on ${p}`, () => {
    const html = read(fileFor(p));
    if (p !== '/404.html') expect(html).toContain(`<meta name="google-adsense-account" content="${PUB}">`);
    const hasAds = html.includes(`adsbygoogle.js?client=${PUB}`);
    expect(hasAds).toBe(!NO_ADS.includes(p));
    if (hasAds) expect(html).toMatch(/<script async src="https:\/\/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js\?client=ca-pub-\d+" crossorigin="anonymous"><\/script>/);
  });
}

test('CSP allows AdSense, Analytics and the consent message', () => {
  const csp = read('_headers').match(/Content-Security-Policy: (.*)/)[1];
  const directive = (name) => (csp.split(';').map((d) => d.trim()).find((d) => d.startsWith(name + ' ')) || '');
  expect(directive('script-src')).toContain('https://pagead2.googlesyndication.com');
  expect(directive('script-src')).toContain('https://www.googletagmanager.com');
  expect(directive('script-src')).toContain('https://fundingchoicesmessages.google.com');
  expect(directive('frame-src')).toContain('https://*.googlesyndication.com');
  expect(directive('frame-src')).toContain('https://*.doubleclick.net');
  expect(directive('connect-src')).toContain('https://*.google-analytics.com');
  expect(directive('img-src')).toContain('https://*.googlesyndication.com');
  expect(directive('object-src')).toBe("object-src 'none'");
  expect(directive('frame-ancestors')).toBe("frame-ancestors 'none'");
});

test('privacy policy covers AdSense cookies, consent, analytics and affiliates', () => {
  const html = read('privacy/index.html');
  expect(html).toContain('Google AdSense');
  expect(html).toContain('adssettings.google.com');
  expect(html).toContain('European Economic Area');
  expect(html).toContain('Google Analytics');
  expect(html).toContain('Affiliate links');
  expect(html).toContain('info@propertytaxbc.ca');
});

test('site has the pages ad reviewers look for', async ({ request }) => {
  for (const p of ['/about/', '/contact/', '/privacy/', '/terms/', '/editorial-policy/']) {
    const res = await request.get(p);
    expect(res.status(), p).toBe(200);
  }
});

test('footer links to contact, privacy and terms on every content page', async ({ page }) => {
  await blockThirdParty(page);
  for (const p of PAGES.filter((x) => !['/404.html', '/privacy/', '/terms/'].includes(x))) {
    await page.goto(p);
    const footer = page.locator('footer');
    for (const href of ['/contact', '/privacy', '/terms', '/about']) {
      await expect(footer.locator(`a[href="${href}"]`), `${p} ${href}`).toHaveCount(1);
    }
  }
});

test('no lead form, referral or licensed wording anywhere on the site', () => {
  for (const p of PAGES) {
    const html = read(fileFor(p)).toLowerCase();
    expect(html, p).not.toContain('lead-form');
    expect(html, p).not.toContain('lead-section');
    expect(html, p).not.toContain('referral');
    expect(html, p).not.toMatch(/licensed (bc )?property tax professional/);
  }
  expect(fs.existsSync(path.join(ROOT, 'js', 'lead-form.js'))).toBe(false);
  expect(fs.existsSync(path.join(ROOT, 'functions', 'api'))).toBe(false);
  expect(read('wrangler.toml')).not.toContain('kv_namespaces');
});

test('repo only files are hidden from the public site', () => {
  const routes = JSON.parse(read('_routes.json'));
  for (const r of ['/docs/*', '/scripts/*', '/tests/*', '/functions/*', '/README.md', '/package.json', '/package-lock.json', '/wrangler.toml', '/playwright.config.js', '/.github/*']) {
    expect(routes.include, r).toContain(r);
  }
  // Public site files must not be caught by the hide rule.
  for (const r of routes.include) {
    expect(['/', '/js/*', '/css/*', '/data/*', '/brand/*'].includes(r), r).toBe(false);
  }
  expect(read('.gitignore')).toMatch(/^docs\/$/m);
});

test('hide middleware answers with the 404 page and noindex', async () => {
  const src = read('functions/_middleware.js').replace('export async function onRequest', 'async function onRequest') + '\nmodule.exports = { onRequest };';
  const m = { exports: {} };
  new Function('module', 'exports', 'Response', 'URL', src)(m, m.exports, Response, URL);
  let asked = null;
  const res = await m.exports.onRequest({
    request: new Request('https://propertytaxbc.ca/README.md'),
    env: { ASSETS: { fetch: async (u) => { asked = String(u); return new Response('<h1>Not found</h1>'); } } },
  });
  expect(asked).toBe('https://propertytaxbc.ca/404.html');
  expect(res.status).toBe(404);
  expect(res.headers.get('X-Robots-Tag')).toBe('noindex');
  expect(await res.text()).toContain('Not found');
});

test('calculators never send typed values off the page', async ({ page }) => {
  const outbound = [];
  await page.route(/^https?:\/\/(?!localhost(:\d+)?\/)/, (route) => { outbound.push(route.request().url() + ' ' + (route.request().postData() || '')); return route.fulfill({ status: 200, body: '' }); });
  await page.goto('/');
  await page.fill('#currentValue', '987654');
  await page.fill('#previousValue', '876543');
  await page.click('#check-form button[type=submit]');
  await page.goto('/home-owner-grant/');
  await page.fill('#grantValue', '1234567');
  await page.click('#grant-form button[type=submit]');
  await page.goto('/deferment/');
  await page.fill('#annualTax', '4321');
  await page.click('#cost-form button[type=submit]');
  const leak = outbound.filter((u) => /987654|876543|1234567|4321/.test(u));
  expect(leak).toEqual([]);
});
