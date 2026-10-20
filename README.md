# PropertyTaxBC

Free tools and plain language guides for BC homeowners, paid for by ads and a
few labelled affiliate links. No forms, no accounts, nothing typed into a tool
leaves the browser.

1. **Assessment Appeal Check** (`/`): does a BC Assessment notice look worth
   a closer look, plus next steps for filing a free complaint yourself.
2. **Property Tax Deferment Check** (`/deferment`): eligibility check and a
   cost calculator comparing the 2026 rules, the old rules and a line of credit.
3. **Home Owner Grant Calculator** (`/home-owner-grant`): 2026 grant estimate
   with the threshold reduction and the additional grant.

Generated pages (grant, glossary, contact, editorial policy, city pages,
sitemap, deadline calendar) come from `node scripts/build_pages.js`. Edit the
script or the files in `data/`, then run it. City pages are only built for
cities whose data in `data/municipalities.json` is complete.

Yearly numbers live in `data/rules.json` and `js/deadlines.js`. Affiliate
links live in `data/affiliates.json` and stay hidden until a URL is filled in.
Repo only files are hidden from the public site by `_routes.json` and
`functions/_middleware.js`. Internal notes go in `docs/`, which is gitignored.

## What's here

Plain static HTML/CSS/JS (no framework). One small Cloudflare Pages
Function hides repo only files; a Node script builds the generated pages.

```
index.html               Landing page: hero, free check calculator, PARP
                          summary, next steps, mini-FAQ
how-it-works/index.html  /how-it-works — main PARP/PAAB guide (primary SEO page)
deadlines/index.html     /deadlines — current-cycle deadlines (update yearly)
evidence/index.html      /evidence — comparables, bracketing, what helps
faq/index.html           /faq — Q&A content with FAQPage JSON-LD
about/index.html         /about — trust page (needs your real voice, see note in file)
privacy/index.html       /privacy — PIPA-oriented privacy policy
terms/index.html         /terms — terms of use
deferment/index.html     /deferment — Tool 2: deferment eligibility checker + education
404.html                 Kept flat at the root — Cloudflare Pages looks for it there
favicon.svg               Browser-tab icon (primary — modern browsers)
favicon-32.png            Legacy PNG fallback for favicon.svg
apple-touch-icon.png      180×180, solid background — iOS home-screen icon
brand/logo-mark.svg       Logo mark, charcoal stroke — for use on light backgrounds
brand/logo-mark-reversed.svg  Same mark, white stroke — standalone asset, not used live
brand/propertytaxbc-favicon.svg  Portable copy of /favicon.svg for external use (app stores, avatars) — kept byte-identical to the live one, not a separate design
brand/propertytaxbc-header-logo.svg  Combined mark+wordmark as one flat image. Used live as the header and footer logo on every page (`<img class="brand-logo-img">` / `.footer-logo-img`), and also the file to hand out for contexts needing a single flat image (email signatures, print, social)
og-image.png              1200×630 social share preview (source is a scratch file, see "Color palette")
robots.txt / sitemap.xml
css/style.css
js/calculator.js         Free-check scoring logic (see "Calculator logic" below)
js/deadlines.js          Deadline countdown + table, shared by index and /deadlines
js/deferment.js          Deferment eligibility decision tree (see "Deferment checker" below)
js/deferment-cost.js     Deferment cost estimate (2026 vs old rules vs line of credit)
js/grant.js              Home owner grant estimate (2026 rules)
js/affiliates.js         Fills affiliate slots from data/affiliates.json
js/analytics-events.js   Site wide GA4 events (see the comment at the top for the full list)
functions/_middleware.js Returns 404 for repo only paths listed in _routes.json
scripts/build_pages.js   Builds generated pages, sitemap.xml and the .ics calendar
scripts/check_affiliate_links.js  Weekly affiliate link check (.github/workflows/check-links.yml)
data/                    rules.json, affiliates.json, municipalities.json
wrangler.toml
_headers                 Security headers incl. CSP for Cloudflare Pages (see "Security")
package.json / package-lock.json   Dev-only — test tooling, not a build step for the site itself
playwright.config.js     Test runner config (see "Testing")
tests/                   Playwright test suite (see "Testing")
.github/workflows/test.yml   CI, runs the test suite on push/PR to main
```

Each content page lives in its own directory as `index.html` (e.g.
`how-it-works/index.html`) rather than a flat `how-it-works.html`, so
`/how-it-works` resolves natively via directory-index behavior on any
static host — not just Cloudflare Pages' specific `.html`-stripping
feature. All internal links already use extensionless absolute paths
(`/how-it-works`, `/privacy`, etc.), so nothing else needed to change.
`index.html` (site root) and `404.html` (Cloudflare Pages' custom-404
convention) are the only files kept flat.

## Before you launch — open items

1. ~~Domain~~ — done. `propertytaxbc.ca` and `www.propertytaxbc.ca` are
   both live on Cloudflare Pages (migrated off an earlier stray GitHub
   Pages deployment of the same domain — see git history around
   2026-08-23 if this ever needs re-diagnosing). GitHub Pages has been
   disabled for the repo so there's no ambiguity about which host serves
   traffic.
2. ~~Contact email~~ — done. `info@propertytaxbc.ca` is live in
   `privacy/index.html`, `terms/index.html`, and `about/index.html`,
   routed via Cloudflare Email Routing to `admin@easytechvancouver.ca`.
   Worth sending a real test email once to confirm delivery actually
   works end to end, if that hasn't been done yet.
3. ~~`/about` page copy~~ — done. Real first-person copy from the site's
   actual owner is in place as of 2026-08-22, not a placeholder.
4. **Business name / entity.** Legal operator stays "EasyTech Digital
   Solutions" per the existing sole proprietorship (Part 9 of the brief)
   — that's unrelated to the public-facing PropertyTaxBC brand name above.
   No new registration needed for launch.

## Logo

A checkmark whose long upstroke also reads as a roof pitch, sitting on a
terracotta ground line inside a square outline — one mark ties together
both tools (an eligibility *check*, on a *property*) instead of picking
one or the other. The square border was added after the first version
(bare checkmark, no frame) looked too small and unanchored next to the
wordmark; framing it let the whole mark scale up (42×42 in the header,
30×30 in the footer, both up from ~26×23) without looking oversized.
Charcoal `#241f1c` stroke on light backgrounds, white stroke on
charcoal — the header uses the reversed white version inline
(`.brand-mark` in `css/style.css`), since it sits directly on the
charcoal header bar; the same 64×64 viewBox and path data live in
`brand/logo-mark.svg` (charcoal-on-light) and
`brand/logo-mark-reversed.svg` (white-on-dark) as reusable standalone
assets. `favicon.svg` keeps its own, separate solid-fill charcoal badge
treatment rather than the outlined square — a thin border stroke
anti-aliases away at 16–32px, so the favicon needed a different,
simpler shape to stay legible that small; `favicon-32.png` and
`apple-touch-icon.png` are Chromium-rasterized fallbacks of that badge
(ImageMagick wasn't usable in this environment — Windows' own
`convert.exe` shadows it in PATH). Four other icon directions were
explored and set aside early on — wordmark-only, a plain house
roofline, a document+check, and a monogram badge — in case a different
mark is wanted later.

## Color palette

Went through two rebrands so far. Originally navy `#10253e` / gold
`#c9862f`; then the on-page brand became **PropertyTaxBC** (see below)
while colors stayed navy/gold; then, after mocking up several
alternatives side by side, settled on **warm charcoal `#241f1c` /
terracotta `#c1592f`** — same two-tone structure, warmer and less
generic-bank-blue.

The CSS custom properties in `css/style.css` are named for what they
are now, not their history: `--charcoal` / `--charcoal-light` (was
`--navy` / `--navy-light`) and `--terracotta` / `--terracotta-dark`
(was `--gold` / `--gold-dark`). If you ever grep old design notes or
screenshots and see `--navy`/`--gold`, that's the pre-rebrand names —
they don't exist in the stylesheet anymore.

Swapping the two root variables' *values* propagates through most of
the site automatically, but a few things don't go through the
variables and need updating by hand if the palette ever changes again:

- Inline `<svg>` icon strokes in every page's header/footer brand mark
  (`stroke="#c1592f"` etc.) and in `favicon.svg` / `brand/*.svg`
- The secondary "light text on the dark header/hero/footer" colors,
  which were hand-tuned to complement whichever hue is primary (nav
  links, hero lead paragraph, tagline, footer text/legal) — currently a
  warm-neutral scale (`#e2ddd8`, `#d9d2c9`, `#c7bcb0`, `#a99e92`,
  `#f5f0ea` for badges) that would need to shift again for a cooler
  primary color
- `theme-color` meta tag on every page
- `og-image.png` and its source (the source lives only as a scratch
  file used to render it, not in this repo — regenerate by rebuilding a
  similarly-styled 1200×630 HTML page and screenshotting it, same
  approach as the favicon PNGs)
- The `.btn` text color (`#ffffff`) was chosen for contrast against
  terracotta specifically — gold's higher luminance had used a dark
  near-black instead; re-check contrast if the accent color changes
  again
- `--terracotta-btn` (`#b3532c`) exists as a separate, slightly darker
  variable used ONLY for `.btn`'s background. Plain `--terracotta`
  (`#c1592f`) with white button text computes to 4.43:1 — just under
  the 4.5:1 WCAG AA threshold for normal-size text (16px bold doesn't
  qualify as "large text," which needs ≥18.66px bold). `--terracotta`
  itself is otherwise only ever used as a background/decoration
  (border, rule bar, icon accent), never as text or a text background,
  so it didn't need to move — only the one spot with text sitting on
  it did. If the accent hue changes again, re-run the contrast check
  specifically for whatever sits behind button text.

The header lockup (`.brand` in `css/style.css`) merges two of those
explored directions: the checkmark/roofline icon, plus a short gold
`.brand-rule` divider between the wordmark and tagline that was originally
just the wordmark-only option's accent. Same idea in `og-image.png`,
the social-share preview image.

## SEO

Beyond the per-page `<title>`/meta description and FAQPage JSON-LD already
in place:

- **Canonical URLs are now absolute** (`https://propertytaxbc.ca/...`)
  instead of root-relative, on every page.
- **Open Graph + Twitter Card tags** on every page (`og:title`,
  `og:description`, `og:url`, `og:image`, `twitter:card`, etc.), each
  pointing at `og-image.png` — a 1200×630 social preview built from the
  same brand mark/wordmark, rendered via headless Chromium (see
  `brand/` above — no design tool was needed, just the existing SVG mark
  plus Google Fonts).
- **`theme-color`** (`#241f1c`) so mobile browser chrome picks up the
  brand charcoal.
- **Organization JSON-LD** on the homepage only (name, url, logo,
  description) — no `sameAs` or search-action markup, since there are no
  social profiles or on-site search to point at honestly.
- **`sitemap.xml` is generated** by `scripts/build_pages.js`, with `<lastmod>`
  taken from each page's last git commit.

Not done here, worth doing before launch: verifying og-image.png renders
correctly in an actual link-preview tool (Facebook's Sharing Debugger,
Twitter Card Validator) once the real domain is live, and adding
`hreflang`/`lang="en-CA"` refinements if that's ever a priority — skipped
since the site is single-language and this wasn't flagged as a gap.

## Calculator logic (js/calculator.js)

Implements the brief's Part 6 exactly:

```
yourChange = (current - previous) / previous * 100
delta = yourChange - neighbourhoodChange   (only if neighbourhood % was entered)

delta >= 5        → "Worth investigating"
2 <= delta < 5     → "Borderline"
delta < 2          → "Roughly in line"
no neighbourhood % → show yourChange alone, prompt for the area average
```

Never surfaces a dollar figure, never says "you should appeal." All
calculation happens client-side; nothing typed is ever sent anywhere.

## Deadlines (js/deadlines.js)

`DEADLINES` at the top of the file holds the current cycle's confirmed
PARP and PAAB dates. **Update this every year** — it's a hardcoded
same-purpose to the `/deadlines` page being a "living page" per the SEO
section of the brief. Currently set for the cycle ending in the PARP
deadline of **Monday, February 1, 2027** (Jan 31, 2027 falls on a Sunday)
and the PAAB deadline of **April 30, 2027** (firm, never rolled forward).
Always cross-check against BC Assessment's own published dates before
updating.

## Deferment checker (js/deferment.js, /deferment)

Tool 2, per Part 11 of the brief. A client-side-only decision tree plus a cost
calculator (js/deferment-cost.js), no data collected. Facts were verified directly against
gov.bc.ca on 2026-08-20 (not taken from the brief as-written, which had
gone stale — see below):

- **Both programs now share one interest rate**: compound interest at
  Prime + 2%, effective for the 2026 tax year onward. This *replaced* the
  old, lower, differentiated simple-interest rates (Regular was
  prime−2%, Families was prime) that the brief's Part 11 still cited
  (1.2% / 3.2%). Taxes deferred in 2025 or earlier keep the old
  simple-interest terms.
- **Current rate: 6.45%** (prime 4.45% + 2%), effective Jul 1–Sep 30,
  2026. It resets roughly every six months (Apr 1 / Oct 1) — check
  `CURRENT_RATE` at the top of `js/deferment.js` against
  [gov.bc.ca's current/previous rates page](https://www2.gov.bc.ca/gov/content/taxes/property-taxes/annual-property-tax/property-tax-deferment-program/tax-deferment-interest-fees/current-previous-rates)
  roughly quarterly — this needs more frequent upkeep than the yearly
  PARP/PAAB deadlines.
- **Minimum equity**: Regular Program 25% (the brief didn't mention this
  figure — verified against gov.bc.ca and added), Families with Children
  15% (brief had this one right).
- **Fees**: Regular — $60 one-time application + $10/year renewal.
  Families with Children — none.
- **Residency**: 1+ year in BC before applying, both programs.

The decision tree in `js/deferment.js` checks residency and tax-arrears
status first as hard gates, then evaluates status (age/spouse/disability
vs. supporting a dependent child) against the relevant equity threshold.
It never recommends deferring, presents the interest/lien trade-off
neutrally, and ends eligible results with a direct link to the official
gov.bc.ca application portal. The Privacy Policy's "What we collect"
section was updated to state plainly that this tool collects nothing.

## Security

- **Content-Security-Policy** in `_headers`: `script-src` allows `'self'`
  plus Google Analytics, AdSense and Google's consent message domains, and no
  `unsafe-inline` or `unsafe-eval`. There is no inline executable JS, only
  external `/js/*.js` files and inert `application/ld+json` blocks.
  `frame-src` allows only AdSense frames. `style-src` allows `'unsafe-inline'`
  for the inline `style=""` attributes used for one off layout. If AdSense
  starts serving from a new domain, the browser console shows a CSP error;
  add that domain here. Also sets HSTS, `X-Frame-Options: DENY`,
  `X-Content-Type-Options: nosniff`, and a restrictive `Permissions-Policy`.
- **Repo only files** (README, tests, scripts, config, `docs/`) are served as
  404 with `noindex` by `functions/_middleware.js`. `_routes.json` limits the
  function to those paths, so normal pages never invoke it.
- **No personal data**: there are no forms. Tests check that values typed
  into the calculators never appear in any outbound request.

## Testing

```
npm install
npx playwright install chromium   # first time only
npm test
```

`tests/` covers, against a plain static server (no Functions — see above
for testing those separately):

- **`pages.spec.js`** — every page returns 200, has exactly one `<h1>`,
  zero console errors, valid JSON-LD where present, no duplicate ids
- **`calculator.spec.js`** — all four verdict tiers from Part 6's exact
  thresholds, the "no neighbourhood %" fallback, and that it never
  surfaces a dollar figure or "you should appeal"
- **`deferment.spec.js`** — the eligibility decision tree's branches
  (each program alone, both together, equity-too-low, no-residency,
  arrears, no-qualifying-status), and that it never tells anyone to defer
- **`lead-form.spec.js`** — consent checkbox defaults unchecked, submission
  is blocked without it, required-field validation, the honeypot's
  off-screen positioning
- **`responsive.spec.js`** — no horizontal overflow on any page at
  320/375/414px (this caught two real bugs during development — a
  `white-space: nowrap` button and a table — see git history)
- **`links.spec.js`** — every internal `href`/`src` resolves to a real
  file under this project's directory-based routing, every page has
  exactly one absolute canonical URL

`npm run test:ui` opens Playwright's UI mode for debugging a specific
failure; `npm run serve` just runs the static server on its own
(`http://localhost:8123`) if you want to poke at the site by hand.

## CI

`.github/workflows/test.yml` runs the full suite (`npm ci`, installs the
Chromium browser, `npm test`) on every push and PR targeting `main`, and
uploads the HTML report as a build artifact either way — check that if a
run fails on GitHub rather than re-running blind locally.

## Deploying

Static site + Pages Functions, so a standard Cloudflare Pages Git
integration deploy works. This needs your Cloudflare account — none of
these steps can be run from here, but here's the exact sequence:

1. **Push this repo to GitHub** (or GitLab), if it isn't already.
2. **Create the Pages project**: Cloudflare dashboard → Workers & Pages →
   Create → Pages → Connect to Git → pick this repo. Build settings:
   leave the build command **empty** and the output directory as `/`
   (repo root) — there's no build step.
3. **Point the domain**: in the Pages project → Custom domains → add
   `propertytaxbc.ca`.
4. **After merging the ads and affiliate changes**, remove the old `LEADS`
   KV binding and the `ADMIN_TOKEN` secret in the Pages project settings
   (export and delete any stored leads first), and turn on the AdSense
   consent message for the EEA, UK and Switzerland in AdSense → Privacy and
   messaging.
5. **Verify the live site**: `/README.md` and `/tests/` return 404, the
   browser console shows no CSP errors on a page with ads, and
   `sitemap.xml` lists every page.

After that, every push to `main` auto-deploys (Cloudflare Pages' default
Git integration behavior) — the CI workflow above runs the test suite
independently of that deploy, it doesn't gate it.

## Analytics

Google Analytics 4 (`G-MWPM1ESFFH`) via `js/gtag-init.js`, with custom events
from the tool scripts and `js/analytics-events.js`. The full event list and the
suggested GA4 key events are in the comment at the top of
`js/analytics-events.js`. Events never include values typed into a tool.

## Explicitly out of scope for v1

Document generation of any kind, homeowner-facing payments, other
provinces, hardcoded partner integrations, individualized legal/tax
advice in the copy, and any lead form or referral component.
