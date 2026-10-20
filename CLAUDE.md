# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this app is

PropertyTaxBC — free tools for BC homeowners (appeal check, deferment
check and cost calculator, home owner grant calculator), funded by AdSense
and affiliate links. See `README.md` for the full breakdown (file layout,
calculator logic, data files, testing, deploying). This file only adds
what the README doesn't cover.

## Commands

```bash
npm install
npm run serve          # static server at http://localhost:8123
npx playwright install chromium   # first time only
npm test                # full Playwright suite
npm run test:ui          # Playwright UI mode
node scripts/build_pages.js   # regenerate grant, glossary, editorial policy,
                              # contact, city pages, .ics calendar and sitemap.xml
npx wrangler pages dev .      # test functions/_middleware.js (hides repo files) locally
```

Generated pages must be rebuilt and committed after editing
`scripts/build_pages.js`, `scripts/lib/layout.js` or `data/*.json`; a test
fails if they are stale.

## URLs always end with a slash

Cloudflare Pages 308-redirects `/about` to `/about/`. Every internal link,
canonical, `og:url`, structured data URL and sitemap `<loc>` must use the
trailing-slash form, or Search Console reports the pages as "Page with
redirect". `tests/links.spec.js` enforces this.

## Line endings

`.gitattributes` keeps everything LF except `*.ics`, which must stay CRLF
(RFC 5545). Don't "fix" the calendar file's line endings.

## Repo layout gotcha — avoid nested self-clones

This repo has been found nested inside a wrapper folder more than once
(most recently Oct 2026: a second clone at
`bc-assessment-appeal-check/bc-assessment-appeal-check/`, same
`EasyTech-Digital-Solutions/...` remote, untracked inside the outer
clone). Most likely cause: running "Clone Repository" while already inside
this folder. Before deleting any copy, check `git log --oneline`, `git
branch -a`, `git stash list` and `git status` in every copy.

## Production Safeguards

- Never commit or print `.env` files, Pages secrets, or KV namespace
  IDs/credentials.
- Do not run destructive commands (`rm -rf`, force-push, KV namespace
  deletion) without explicit confirmation.
- This site has a live Cloudflare Pages deployment (`propertytaxbc.ca`);
  merging to `main` deploys it. Treat `wrangler.toml`, `_headers` (CSP),
  `_routes.json`, `ads.txt` and Pages settings as production config.
