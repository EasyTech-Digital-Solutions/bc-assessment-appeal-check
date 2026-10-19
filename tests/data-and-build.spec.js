const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

test('data files are valid JSON', () => {
  for (const f of ['data/rules.json', 'data/affiliates.json', 'data/municipalities.json', '_routes.json']) {
    expect(() => JSON.parse(read(f)), f).not.toThrow();
  }
});

test('municipalities data is consistent', () => {
  const m = JSON.parse(read('data/municipalities.json'));
  const slugs = m.municipalities.map((x) => x.slug);
  expect(new Set(slugs).size).toBe(slugs.length);
  for (const x of m.municipalities) {
    expect(x.slug).toMatch(/^[a-z0-9-]+$/);
    expect(['metro', 'other']).toContain(x.grant_zone);
    for (const n of x.nearby) expect(slugs, `${x.slug} nearby ${n}`).toContain(n);
    for (const k of m._required) expect(k in x, `${x.slug} has field ${k}`).toBe(true);
    const metroRDs = ['Metro Vancouver', 'Fraser Valley Regional District', 'Capital Regional District'];
    expect(x.grant_zone === 'metro', x.slug).toBe(metroRDs.includes(x.regional_district));
  }
});

test('city pages are only built for cities with complete data', () => {
  const m = JSON.parse(read('data/municipalities.json'));
  for (const x of m.municipalities) {
    const complete = m._required.every((k) => x[k] !== null && x[k] !== '');
    expect(fs.existsSync(path.join(ROOT, 'property-tax', x.slug, 'index.html')), x.slug).toBe(complete);
  }
});

test('generated pages and sitemap are up to date with the build script', () => {
  const generated = ['home-owner-grant/index.html', 'glossary/index.html', 'editorial-policy/index.html', 'contact/index.html', 'deadlines/bc-property-tax-deadlines-2027.ics'];
  const before = Object.fromEntries(generated.map((f) => [f, read(f)]));
  const sitemapBefore = read('sitemap.xml').replace(/<lastmod>[^<]+<\/lastmod>/g, '');
  execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'build_pages.js')], { cwd: ROOT });
  for (const f of generated) expect(read(f), `${f} is stale, run node scripts/build_pages.js`).toBe(before[f]);
  expect(read('sitemap.xml').replace(/<lastmod>[^<]+<\/lastmod>/g, '')).toBe(sitemapBefore);
});

test('calendar file is valid and matches the deadline script', () => {
  const ics = read('deadlines/bc-property-tax-deadlines-2027.ics');
  expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
  expect(ics.trimEnd().endsWith('END:VCALENDAR')).toBe(true);
  expect(ics.split('BEGIN:VEVENT').length - 1).toBe(2);
  expect(ics).not.toMatch(/[^\r]\n/);
  const js = read('js/deadlines.js');
  const parp = js.match(/parp: \{ date: "(\d{4}-\d{2}-\d{2})"/)[1].replace(/-/g, '');
  const paab = js.match(/paab: \{ date: "(\d{4}-\d{2}-\d{2})"/)[1].replace(/-/g, '');
  expect(ics).toContain(`DTSTART;VALUE=DATE:${parp}`);
  expect(ics).toContain(`DTSTART;VALUE=DATE:${paab}`);
});

test('rules file deadlines match the deadline script', () => {
  const rules = JSON.parse(read('data/rules.json'));
  const js = read('js/deadlines.js');
  expect(js).toContain(`parp: { date: "${rules.deadlines.parp_complaint.value}"`);
  expect(js).toContain(`paab: { date: "${rules.deadlines.paab_appeal.value}"`);
});

test('deferment page shows the same rates as the rules file', () => {
  const rules = JSON.parse(read('data/rules.json')).deferment;
  const html = read('deferment/index.html');
  expect(html).toContain(`${rules.new_rate_2026_onward.value}%`);
  expect(html).toContain(`value="${rules.prime_rate.value}"`);
});

test('affiliate link checker handles an empty list', () => {
  const out = execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'check_affiliate_links.js')], { cwd: ROOT }).toString();
  const data = JSON.parse(read('data/affiliates.json'));
  if (Object.values(data.links).every((l) => !l.url)) expect(out).toContain('No affiliate URLs filled in yet');
});
