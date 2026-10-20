#!/usr/bin/env node
// Builds generated pages, the sitemap and the deadline calendar file.
// Run: node scripts/build_pages.js   (no dependencies)
//
// Generated:
//   home-owner-grant/index.html, glossary/index.html, editorial-policy/index.html
//   property-tax/<slug>/index.html for each city with complete data
//   property-tax/index.html (only when at least one city page exists)
//   deadlines/bc-property-tax-deadlines-2027.ics
//   sitemap.xml
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const { page, esc, SITE } = require("./lib/layout");

const ROOT = path.resolve(__dirname, "..");
const read = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), "utf8"));
function write(rel, content) {
  const full = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content);
}

const rules = read("data/rules.json");
const munis = read("data/municipalities.json");
const REVIEWED = "October 2026";
const money = (n) => "$" + Math.round(n).toLocaleString("en-CA");

function reviewed(sources) {
  return `  <section class="section">
    <div class="container">
      <p class="last-reviewed"><em>Last reviewed: ${REVIEWED}.</em> Sources: ${sources
        .map(([u, t]) => `<a href="${u}" target="_blank" rel="noopener">${t}</a>`)
        .join(", ")}.</p>
    </div>
  </section>`;
}

const GRANT_SRC = "https://www2.gov.bc.ca/gov/content/taxes/property-taxes/annual-property-tax/home-owner-grant";

// ---------- Home owner grant ----------
function grantPage() {
  const g = rules.home_owner_grant;
  const body = `  <section class="hero">
    <div class="container">
      <h1>BC Home Owner Grant Calculator</h1>
      <p class="lead">Estimate your 2026 home owner grant, see how much a value over the threshold reduces it, and check whether you qualify for the larger additional grant.</p>
      <div class="badge-row">
        <span class="badge">Free, nothing to sign up for</span>
        <span class="badge">Runs in your browser</span>
        <span class="badge">Not affiliated with the Province of BC</span>
      </div>
    </div>
  </section>

  <section class="section" id="check">
    <div class="container">
      <div style="display:grid; grid-template-columns: minmax(0,1.1fr) minmax(0,0.9fr); gap:2.5rem; align-items:start;" class="check-grid">
        <div>
          <h2>Grant estimate</h2>
          <form id="grant-form" class="calc-card" novalidate>
            <div class="field">
              <label for="grantValue">Assessed value of your home ($)</label>
              <input type="text" inputmode="numeric" id="grantValue" name="grantValue" placeholder="e.g. 1250000" required>
              <div class="hint">From your BC Assessment notice. For a home with a business or farm on the same lot, the province may use a partitioned value instead.</div>
            </div>
            <fieldset class="field">
              <legend>Where is the home?</legend>
              <label class="choice"><input type="radio" name="zone" value="metro" checked> Metro Vancouver, Capital Regional District, or Fraser Valley Regional District</label>
              <label class="choice"><input type="radio" name="zone" value="other"> Anywhere else in BC (northern and rural areas)</label>
            </fieldset>
            <fieldset class="field">
              <legend>Do you qualify for the additional grant?</legend>
              <div class="hint" style="margin:0 0 0.5rem;">Seniors 65 or older this year, veterans, persons with a disability, people living with a spouse or relative with a disability, and some surviving spouses or relatives. <a href="${GRANT_SRC}/senior" target="_blank" rel="noopener">Check the rules</a>.</div>
              <label class="choice"><input type="radio" name="additional" value="no" checked> No</label>
              <label class="choice"><input type="radio" name="additional" value="yes"> Yes</label>
            </fieldset>
            <div class="field">
              <label for="grantTax">Your property tax before the grant ($) <span style="font-weight:400;">(optional)</span></label>
              <input type="text" inputmode="numeric" id="grantTax" name="grantTax" placeholder="e.g. 3800">
              <div class="hint">Lets us apply the rule that you must still pay at least $${g.min_tax_regular} ($${g.min_tax_additional} with the additional grant).</div>
            </div>
            <button type="submit" class="btn btn-block">Estimate my grant</button>
          </form>
          <div id="grant-result" class="result" role="status" aria-live="polite"></div>
          <p class="affiliate" data-affiliate="ratehub_mortgage_renewal" hidden></p>
        </div>

        <aside>
          <div class="card">
            <h3 style="margin-top:0;">2026 amounts</h3>
            <div class="table-wrap"><table>
              <thead><tr><th scope="col">Area</th><th scope="col">Regular</th><th scope="col">Additional</th></tr></thead>
              <tbody>
                <tr><th scope="row">Metro Van, Capital, Fraser Valley</th><td>$${g.amounts.metro.regular}</td><td>$${g.amounts.metro.additional.toLocaleString("en-CA")}</td></tr>
                <tr><th scope="row">Northern and rural</th><td>$${g.amounts.other.regular}</td><td>$${g.amounts.other.additional.toLocaleString("en-CA")}</td></tr>
              </tbody>
            </table></div>
            <p class="hint" style="margin-bottom:0;">Threshold: ${money(g.threshold)}. Above it, the grant drops by $5 for every $1,000 of value.</p>
          </div>
          <div class="card" style="margin-top:1.25rem;">
            <h3 style="margin-top:0;">Changing in 2027</h3>
            <p style="margin-bottom:0;">From January 1, 2027, the regular grant is $570 everywhere in BC, including northern and rural areas, because the extra $200 northern and rural amount ended with the carbon tax. The 2027 threshold is usually announced in early January.</p>
          </div>
        </aside>
      </div>
    </div>
  </section>

  <section class="section section-soft">
    <div class="container prose" style="max-width:44em;">
      <h2>How the home owner grant works</h2>
      <p>The home owner grant lowers the property tax you pay on your principal residence. It is not automatic. You claim it each year, either through your municipality (usually online or with your tax notice) or through the province if you live in a rural area.</p>
      <h3>Who can claim it</h3>
      <p>You must own the home, live in it as your principal residence, and be a Canadian citizen or permanent resident living in BC. The additional grant is for owners who are 65 or older this year, veterans, persons with a disability, and a few related cases.</p>
      <h3>The threshold</h3>
      <p>The full grant applies when your home is assessed at ${money(g.threshold)} or less. Above that, it shrinks by $5 for every $1,000 of value. At this rate, the regular grant reaches zero at $2,189,000 in Metro Vancouver, the Capital Region and the Fraser Valley, and at $2,229,000 elsewhere. The additional grant reaches zero at $2,244,000 and $2,284,000.</p>
      <h3>The minimum tax rule</h3>
      <p>The grant can't bring your bill below $${g.min_tax_regular}, or $${g.min_tax_additional} if you get the additional grant. If your tax is low, your grant is limited to whatever is left above that minimum.</p>
      <h3>Grant or deferment?</h3>
      <p>They work together. You claim the grant first, then you can defer what's left of your tax if you qualify. Use the <a href="/deferment/">deferment check</a> to see whether you're eligible and what deferring would cost.</p>
      <p><a href="${GRANT_SRC}/apply" target="_blank" rel="noopener" class="btn btn-secondary">How to claim on gov.bc.ca →</a></p>
    </div>
  </section>

  <section class="section">
    <div class="container">
      <div class="disclaimer">
        <strong>This is a free educational estimate, not tax advice.</strong> We are not affiliated with the Province of British Columbia. Grant amounts and eligibility are decided by the province.
      </div>
    </div>
  </section>

${reviewed([[GRANT_SRC + "#grant-threshold", "gov.bc.ca: Home owner grant"], [GRANT_SRC + "/apply", "gov.bc.ca: Apply for the grant"]])}`;

  return page({
    path: "/home-owner-grant/",
    title: "BC Home Owner Grant Calculator 2026 | PropertyTaxBC",
    ogTitle: "BC Home Owner Grant Calculator 2026",
    description: "Estimate your 2026 BC home owner grant: $570 or $770 regular, $845 or $1,045 additional, reduced above the $2,075,000 threshold. Free and runs in your browser.",
    crumb: "Home Owner Grant",
    body,
    scripts: ["/js/grant.js", "/js/affiliates.js"],
    extraLd: [{
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: "BC Home Owner Grant Calculator",
      url: SITE + "/home-owner-grant/",
      applicationCategory: "FinanceApplication",
      operatingSystem: "Any",
      browserRequirements: "Requires JavaScript",
      isAccessibleForFree: true,
      inLanguage: "en-CA",
      areaServed: { "@type": "AdministrativeArea", name: "British Columbia" },
      offers: { "@type": "Offer", price: "0", priceCurrency: "CAD" },
    }],
  });
}

// ---------- Glossary ----------
const TERMS = [
  ["Actual value", "The market value BC Assessment puts on your property as of July 1 of the year before your notice. It is the number you can complain about."],
  ["Assessment notice", "The letter (or online record) BC Assessment issues each January with your property's actual value, its classification and the average change for your area."],
  ["Assessment roll number", "Also called the folio or roll number. The ID BC Assessment uses for your property. It is on your notice and your tax bill."],
  ["Average change in your area", "The typical percentage change for similar properties near you, printed on your notice. Comparing your own change with it is a quick first check."],
  ["Class 1", "The residential property class. Almost all homes in BC are Class 1."],
  ["Comparable sales", "Recent sales of similar homes near you, close to the July 1 valuation date. They are the strongest evidence in a complaint."],
  ["Home owner grant", "A yearly reduction in property tax on your principal residence that you have to claim. See the home owner grant calculator."],
  ["Mill rate", "The tax rate, set by your municipality and other taxing bodies, usually shown per $1,000 of taxable value."],
  ["PAAB", "Property Assessment Appeal Board. The second level of appeal, after a PARP decision. The residential filing fee is $30 and the deadline is April 30."],
  ["PARP", "Property Assessment Review Panel. The first, free level of complaint. Hearings are short, usually by phone, between February and mid March."],
  ["Principal residence", "The home you mainly live in. Needed to claim the home owner grant."],
  ["Property tax deferment", "A provincial loan that pays your property tax for you, repaid with interest when you sell or transfer the home. See the deferment check."],
  ["Valuation date", "July 1 of the year before your notice. Your value reflects the market and your property's physical condition on that date."],
];

function glossaryPage() {
  const items = TERMS.map(([t, d]) => `        <dt id="${t.toLowerCase().replace(/[^a-z0-9]+/g, "-")}">${esc(t)}</dt>\n        <dd>${esc(d)}</dd>`).join("\n");
  const body = `  <section class="hero">
    <div class="container">
      <h1>BC Property Assessment Glossary</h1>
      <p class="lead">Plain language meanings for the terms on your assessment notice, your tax bill and in the appeal process.</p>
    </div>
  </section>

  <section class="section">
    <div class="container prose" style="max-width:44em;">
      <dl class="glossary">
${items}
      </dl>
      <p><a href="/how-it-works/" class="btn btn-secondary">How the appeal process works →</a></p>
    </div>
  </section>

${reviewed([["https://info.bcassessment.ca/services-and-products/Pages/About-Appeals.aspx", "BC Assessment: About appeals"], ["https://www.assessmentappeal.bc.ca", "Property Assessment Appeal Board"], [GRANT_SRC, "gov.bc.ca: Home owner grant"]])}`;
  return page({
    path: "/glossary/",
    title: "BC Property Assessment Glossary: PARP, PAAB, Roll Number | PropertyTaxBC",
    ogTitle: "BC Property Assessment Glossary",
    description: "Plain language meanings of PARP, PAAB, actual value, roll number, valuation date, mill rate and other terms on your BC assessment notice.",
    crumb: "Glossary",
    body,
    extraLd: [{
      "@context": "https://schema.org",
      "@type": "DefinedTermSet",
      name: "BC Property Assessment Glossary",
      url: SITE + "/glossary/",
      hasDefinedTerm: TERMS.map(([t, d]) => ({ "@type": "DefinedTerm", name: t, description: d })),
    }],
  });
}

// ---------- Editorial policy ----------
function editorialPage() {
  const body = `  <section class="hero">
    <div class="container">
      <h1>Editorial Policy</h1>
      <p class="lead">Where the information on this site comes from, how often it's checked, and how to report a mistake.</p>
    </div>
  </section>

  <section class="section">
    <div class="container prose" style="max-width:44em;">
      <h2>Sources</h2>
      <p>Every rule, fee, rate and deadline on this site comes from an official source: BC Assessment, the Property Assessment Appeal Board, the Province of BC (gov.bc.ca), or a municipality's own website. Each page links to the sources it uses.</p>
      <h2>Reviews</h2>
      <p>Each page shows the month it was last reviewed. We check every page at least once a year, in late December and early January when new assessments, deadlines and grant thresholds come out, and whenever the province announces a change. Deferment interest rates are checked each quarter.</p>
      <h2>What we don't do</h2>
      <ul>
        <li>We don't give legal, tax or appraisal advice, and the calculators are estimates.</li>
        <li>We don't collect what you type into the tools. They run in your browser.</li>
        <li>We don't republish BC Assessment's property records or sales data.</li>
      </ul>
      <h2>How the site is paid for</h2>
      <p>Ads and a small number of clearly labelled affiliate links. A company never pays to change what a guide says, and affiliate links never appear inside a calculator result.</p>
      <h2>Report a mistake</h2>
      <p>If something looks wrong or out of date, email <a href="mailto:info@propertytaxbc.ca">info@propertytaxbc.ca</a> with the page and what you found. We fix confirmed errors as quickly as we can and update the review date.</p>
    </div>
  </section>`;
  return page({
    path: "/editorial-policy/",
    title: "Editorial Policy | PropertyTaxBC",
    description: "How PropertyTaxBC sources and reviews its BC property tax information, how the site is paid for, and how to report a mistake.",
    crumb: "Editorial Policy",
    body,
  });
}


// ---------- Contact ----------
function contactPage() {
  const body = `  <section class="hero">
    <div class="container">
      <h1>Contact PropertyTaxBC</h1>
      <p class="lead">Questions, corrections or feedback about the site.</p>
    </div>
  </section>

  <section class="section">
    <div class="container prose" style="max-width:44em;">
      <p>Email <a href="mailto:info@propertytaxbc.ca">info@propertytaxbc.ca</a>. We read every message and usually reply within a few business days.</p>
      <h2>Good reasons to write</h2>
      <ul>
        <li>Something on a page looks wrong or out of date.</li>
        <li>A calculator gave a result that doesn't match your notice or tax bill.</li>
        <li>A link is broken.</li>
        <li>Privacy questions about this site.</li>
      </ul>
      <h2>What we can't help with</h2>
      <p>We can't look up your property, review your assessment, file a complaint for you or give tax or legal advice. For your own assessment, contact <a href="https://info.bcassessment.ca/services-and-products/Pages/About-Appeals.aspx" target="_blank" rel="noopener">BC Assessment</a>. For the home owner grant or deferment, contact the <a href="https://www2.gov.bc.ca/gov/content/taxes/property-taxes/annual-property-tax" target="_blank" rel="noopener">Province of BC</a> or your municipality.</p>
      <p>PropertyTaxBC is run by EasyTech Digital Solutions in Metro Vancouver, BC.</p>
    </div>
  </section>`;
  return page({
    path: "/contact/",
    title: "Contact | PropertyTaxBC",
    description: "Contact PropertyTaxBC with questions, corrections or feedback. Email info@propertytaxbc.ca.",
    crumb: "Contact",
    body,
    extraLd: [{ "@context": "https://schema.org", "@type": "ContactPage", name: "Contact PropertyTaxBC", url: SITE + "/contact/" }],
  });
}

// ---------- City pages ----------
function hasData(m) {
  return munis._required.every((k) => m[k] !== null && m[k] !== undefined && m[k] !== "");
}

function cityPage(m, bySlug) {
  const zone = rules.home_owner_grant.amounts[m.grant_zone];
  const per100k = (m.residential_rate_total * 100).toFixed(0);
  const nearby = (m.nearby || []).map((s) => bySlug[s]).filter((n) => n && hasData(n));
  const body = `  <section class="hero">
    <div class="container">
      <h1>${esc(m.name)} property tax and assessment guide</h1>
      <p class="lead">Tax rates, a typical home's tax bill, the home owner grant and the steps to appeal your assessment in ${esc(m.name)}.</p>
    </div>
  </section>

  <section class="section">
    <div class="container prose" style="max-width:44em;">
      <h2>${esc(m.name)} at a glance (${m.data_year})</h2>
      <div class="table-wrap"><table>
        <tbody>
          <tr><th scope="row">Total residential tax rate</th><td>$${m.residential_rate_total.toFixed(4)} per $1,000</td></tr>
          <tr><th scope="row">What each $100,000 of value adds</th><td>About $${per100k} a year</td></tr>
          <tr><th scope="row">Representative house value</th><td>${money(m.rep_house_value)}</td></tr>
          <tr><th scope="row">Taxes and charges on that house</th><td>${money(m.rep_house_taxes_total)}</td></tr>
          <tr><th scope="row">Regional district</th><td>${esc(m.regional_district)}</td></tr>
          <tr><th scope="row">2026 home owner grant</th><td>$${zone.regular} regular, $${zone.additional.toLocaleString("en-CA")} additional</td></tr>
        </tbody>
      </table></div>
      <p class="hint">The rate and representative house figures are from the Province of BC's local government statistics (Schedules 702 and 704). Your own bill depends on your value and any local parcel taxes or fees.</p>

      <h2>About ${esc(m.name)}</h2>
      <p>${esc(m.local_notes)}</p>

      <h2>Think your ${esc(m.name)} assessment is too high?</h2>
      <p>Compare your change with the average change printed on your notice using the <a href="/#check">free appeal check</a>, then look at recent sales of similar homes nearby. If you file, the complaint is free and goes to BC Assessment before the <a href="/deadlines/">deadline</a>.</p>
      <p class="affiliate" data-affiliate="kanetix_home_insurance" hidden></p>
      ${m.city_tax_page_url ? `<p><a href="${m.city_tax_page_url}" target="_blank" rel="noopener">${esc(m.name)} property tax page →</a></p>` : ""}
      ${nearby.length ? `<h2>Nearby</h2>\n      <ul>${nearby.map((n) => `<li><a href="/property-tax/${n.slug}/">${esc(n.name)}</a></li>`).join("")}</ul>` : ""}
      <p><a href="/property-tax/">All cities →</a></p>
    </div>
  </section>

${reviewed([[munis._sources.schedules_page, "gov.bc.ca: Municipal tax rates and tax burden"], [GRANT_SRC, "gov.bc.ca: Home owner grant"]].concat(m.city_tax_page_url ? [[m.city_tax_page_url, m.name + " property tax"]] : []))}`;
  return page({
    path: "/property-tax/" + m.slug + "/",
    title: `${m.name} Property Tax Rate ${m.data_year} and Assessment Appeal Guide | PropertyTaxBC`,
    ogTitle: `${m.name} property tax and assessment guide`,
    description: `${m.name} total residential tax rate is $${m.residential_rate_total.toFixed(2)} per $1,000 (${m.data_year}). See a typical home's tax bill, the home owner grant and how to appeal your assessment.`,
    crumb: m.name,
    parents: [{ name: "Property tax by city", path: "/property-tax/" }],
    body,
    scripts: ["/js/affiliates.js"],
  });
}

function cityIndex(list) {
  const rows = list
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((m) => `          <tr><th scope="row"><a href="/property-tax/${m.slug}/">${esc(m.name)}</a></th><td>$${m.residential_rate_total.toFixed(4)}</td><td>${money(m.rep_house_taxes_total)}</td><td>${esc(m.regional_district)}</td></tr>`)
    .join("\n");
  const body = `  <section class="hero">
    <div class="container">
      <h1>BC property tax by city</h1>
      <p class="lead">Residential tax rates and a typical home's tax bill for BC municipalities, from the Province of BC's local government statistics.</p>
    </div>
  </section>

  <section class="section">
    <div class="container">
      <div class="table-wrap"><table>
        <thead><tr><th scope="col">Municipality</th><th scope="col">Residential rate per $1,000</th><th scope="col">Representative house taxes</th><th scope="col">Regional district</th></tr></thead>
        <tbody>
${rows}
        </tbody>
      </table></div>
    </div>
  </section>

${reviewed([[munis._sources.schedules_page, "gov.bc.ca: Municipal tax rates and tax burden"]])}`;
  return page({
    path: "/property-tax/",
    title: "BC Property Tax Rates by City | PropertyTaxBC",
    ogTitle: "BC property tax rates by city",
    description: "Compare BC residential property tax rates and a typical home's tax bill by municipality, with links to each city's assessment and tax guide.",
    crumb: "Property tax by city",
    body,
  });
}

// ---------- Calendar ----------
function ics() {
  const d = rules.deadlines;
  const ev = [
    ["parp-2027", d.parp_complaint.value, "BC assessment complaint (PARP) deadline", "Last day to file a free complaint with BC Assessment. Confirm at bcassessment.ca. https://propertytaxbc.ca/deadlines/"],
    ["paab-2027", d.paab_appeal.value, "PAAB appeal deadline", "Last day to appeal a PARP decision to the Property Assessment Appeal Board. Firm, no extensions. https://propertytaxbc.ca/deadlines/"],
  ];
  const stamp = "20261019T000000Z";
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//PropertyTaxBC//Deadlines//EN", "CALSCALE:GREGORIAN", "X-WR-CALNAME:BC property tax deadlines 2027"];
  for (const [id, date, title, desc] of ev) {
    const dt = date.replace(/-/g, "");
    const next = new Date(date + "T00:00:00Z");
    next.setUTCDate(next.getUTCDate() + 1);
    const end = next.toISOString().slice(0, 10).replace(/-/g, "");
    lines.push("BEGIN:VEVENT", `UID:${id}@propertytaxbc.ca`, `DTSTAMP:${stamp}`, `DTSTART;VALUE=DATE:${dt}`, `DTEND;VALUE=DATE:${end}`, `SUMMARY:${title}`, `DESCRIPTION:${desc}`,
      "BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${title} in 7 days`, "TRIGGER:-P7D", "END:VALARM", "END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}

// ---------- Sitemap ----------
function lastmod(rel) {
  try {
    const out = execSync(`git log -1 --format=%cs -- "${rel}"`, { cwd: ROOT, stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
    if (out) return out;
  } catch (e) { /* not a git checkout */ }
  return new Date().toISOString().slice(0, 10);
}

function sitemap(urls) {
  const body = urls
    .map(([loc, file, pri]) => `  <url><loc>${SITE}${loc}</loc><lastmod>${lastmod(file)}</lastmod><priority>${pri}</priority></url>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

// ---------- Run ----------
write("home-owner-grant/index.html", grantPage());
write("glossary/index.html", glossaryPage());
write("editorial-policy/index.html", editorialPage());
write("contact/index.html", contactPage());
write("deadlines/bc-property-tax-deadlines-2027.ics", ics());

const bySlug = Object.fromEntries(munis.municipalities.map((m) => [m.slug, m]));
const ready = munis.municipalities.filter(hasData);
const notes = new Set();
for (const m of ready) {
  if (notes.has(m.local_notes)) throw new Error(`Duplicate local_notes for ${m.slug}; every city needs its own summary.`);
  notes.add(m.local_notes);
  write(`property-tax/${m.slug}/index.html`, cityPage(m, bySlug));
}
const cityIndexFile = "property-tax/index.html";
if (ready.length) write(cityIndexFile, cityIndex(ready));
else if (fs.existsSync(path.join(ROOT, cityIndexFile))) fs.rmSync(path.join(ROOT, cityIndexFile));

const urls = [
  ["/", "index.html", "1.0"],
  ["/how-it-works/", "how-it-works/index.html", "0.9"],
  ["/deadlines/", "deadlines/index.html", "0.9"],
  ["/deferment/", "deferment/index.html", "0.8"],
  ["/home-owner-grant/", "home-owner-grant/index.html", "0.8"],
  ["/evidence/", "evidence/index.html", "0.8"],
  ["/faq/", "faq/index.html", "0.8"],
  ["/glossary/", "glossary/index.html", "0.6"],
];
if (ready.length) {
  urls.push(["/property-tax/", cityIndexFile, "0.7"]);
  ready.forEach((m) => urls.push([`/property-tax/${m.slug}/`, `property-tax/${m.slug}/index.html`, "0.6"]));
}
urls.push(["/about/", "about/index.html", "0.5"], ["/contact/", "contact/index.html", "0.3"], ["/editorial-policy/", "editorial-policy/index.html", "0.3"], ["/privacy/", "privacy/index.html", "0.2"], ["/terms/", "terms/index.html", "0.2"]);
write("sitemap.xml", sitemap(urls));

console.log(`Built grant, glossary, editorial policy, calendar. City pages: ${ready.length} of ${munis.municipalities.length} (others skipped until their data is filled in). Sitemap: ${urls.length} URLs.`);
