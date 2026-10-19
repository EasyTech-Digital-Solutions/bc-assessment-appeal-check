// Shared page shell for generated pages, matching the hand written pages.
// Used by scripts/build_pages.js. Keep header, footer and head tags in sync
// with the static pages if either changes.
const SITE = "https://propertytaxbc.ca";

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const NAV = [
  ["/", "Free Check", true],
  ["/how-it-works", "How It Works"],
  ["/deadlines", "Deadlines"],
  ["/evidence", "Evidence"],
  ["/faq", "FAQ"],
  ["/deferment", "Deferment Check", true],
  ["/about", "About"],
];

function nav(current) {
  return NAV.map(([href, label, tool]) => {
    const cur = href === current ? ' aria-current="page"' : "";
    return tool
      ? `        <li class="nav-tool"><a href="${href}"${cur}>${label}</a><span class="nav-tool-badge" aria-hidden="true">Tool</span></li>`
      : `        <li><a href="${href}"${cur}>${label}</a></li>`;
  }).join("\n");
}

const FOOTER = `<footer class="site-footer">
  <div class="container">
    <div class="footer-brand">
      <div class="footer-brand-mark">
        <img class="footer-logo-img" src="/brand/propertytaxbc-header-logo.svg" alt="PropertyTaxBC">
      </div>
      <div class="footer-flag">
        <span class="footer-leaf" aria-hidden="true">&#127809;</span>
        Proudly Canadian
      </div>
    </div>
    <div class="footer-grid">
      <div>
        <h4>Guide</h4>
        <ul>
          <li><a href="/how-it-works">How It Works</a></li>
          <li><a href="/deadlines">Deadlines</a></li>
          <li><a href="/evidence">Evidence</a></li>
          <li><a href="/faq">FAQ</a></li>
          <li><a href="/glossary">Glossary</a></li>
        </ul>
      </div>
      <div>
        <h4>Tools</h4>
        <ul>
          <li><a href="/">Appeal Check</a></li>
          <li><a href="/deferment">Deferment Check</a></li>
          <li><a href="/home-owner-grant">Home Owner Grant</a></li>
        </ul>
      </div>
      <div>
        <h4>Site</h4>
        <ul>
          <li><a href="/about">About</a></li>
          <li><a href="/contact">Contact</a></li>
          <li><a href="/editorial-policy">Editorial Policy</a></li>
          <li><a href="/privacy">Privacy Policy</a></li>
          <li><a href="/terms">Terms of Use</a></li>
        </ul>
      </div>
    </div>
    <div class="footer-legal">
      <p>PropertyTaxBC is an independent educational resource. We are not affiliated with, endorsed by, or connected to BC Assessment, the Property Assessment Review Panel, the Property Assessment Appeal Board, or the Government of British Columbia.</p>
      <p>&copy; 2026 PropertyTaxBC. A project of <a href="https://easytechvancouver.ca" target="_blank" rel="noopener">EasyTech Digital Solutions</a>.</p>
    </div>
  </div>
</footer>`;

/**
 * page({ path, title, ogTitle, description, crumb, body, scripts, extraLd, ads })
 * path: "/home-owner-grant" (no trailing slash). crumb: breadcrumb label.
 */
function page(o) {
  const url = SITE + o.path;
  const crumbs = [{ "@type": "ListItem", position: 1, name: "Home", item: SITE + "/" }];
  (o.parents || []).forEach((p, i) =>
    crumbs.push({ "@type": "ListItem", position: i + 2, name: p.name, item: SITE + p.path })
  );
  crumbs.push({ "@type": "ListItem", position: crumbs.length + 1, name: o.crumb, item: url });

  const ld = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: o.ogTitle || o.title,
      url,
      description: o.description,
      inLanguage: "en-CA",
      dateModified: o.dateModified || "2026-10-19",
      isPartOf: { "@type": "WebSite", name: "PropertyTaxBC", url: SITE + "/" },
      breadcrumb: { "@type": "BreadcrumbList", itemListElement: crumbs },
    },
  ].concat(o.extraLd || []);

  const ads = o.ads === false ? "" :
    `<!-- Google AdSense (auto ads; placements controlled in the AdSense dashboard) -->
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6309879983967574" crossorigin="anonymous"></script>
`;

  const scripts = ["/js/analytics-events.js"].concat(o.scripts || []).map((s) => `<script src="${s}"></script>`).join("\n");

  return `<!DOCTYPE html>
<html lang="en-CA">
<head>
<meta charset="UTF-8">
<meta name="google-adsense-account" content="ca-pub-6309879983967574">
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-MWPM1ESFFH"></script>
<script src="/js/gtag-init.js"></script>
${ads}<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(o.title)}</title>
<meta name="description" content="${esc(o.description)}">
<link rel="canonical" href="${url}">
<meta name="theme-color" content="#241f1c">
<meta property="og:type" content="website">
<meta property="og:site_name" content="PropertyTaxBC">
<meta property="og:title" content="${esc(o.ogTitle || o.title)}">
<meta property="og:description" content="${esc(o.description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${SITE}/og-image.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(o.ogTitle || o.title)}">
<meta name="twitter:description" content="${esc(o.description)}">
<meta name="twitter:image" content="${SITE}/og-image.png">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="stylesheet" href="/css/style.css">
${ld.map((x) => `<script type="application/ld+json">\n${JSON.stringify(x, null, 2)}\n</script>`).join("\n")}
</head>
<body>
<a class="skip-link" href="#main">Skip to content</a>
<!-- Generated by scripts/build_pages.js. Edit the script or data, not this file. -->
<header class="site-header">
  <div class="nav-wrap">
    <a class="brand" href="/">
      <img class="brand-logo-img" src="/brand/propertytaxbc-header-logo.svg" alt="PropertyTaxBC">
    </a>
    <nav aria-label="Primary">
      <ul class="main-nav">
${nav(o.navCurrent)}
      </ul>
    </nav>
  </div>
</header>

<main id="main">
${o.body}
</main>

${FOOTER}
${scripts}
</body>
</html>
`;
}

module.exports = { page, esc, FOOTER, SITE };
