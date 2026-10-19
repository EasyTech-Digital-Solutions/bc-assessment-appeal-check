// Shared test helpers.
const PAGES = [
  '/', '/how-it-works/', '/deadlines/', '/evidence/', '/faq/', '/about/', '/privacy/', '/terms/',
  '/deferment/', '/home-owner-grant/', '/glossary/', '/editorial-policy/', '/contact/', '/404.html',
];
const INDEXABLE = PAGES.filter((p) => p !== '/404.html');

// Third party scripts (Google Analytics, AdSense) are answered with an empty
// script so tests are the same with or without internet, and ads never load.
async function blockThirdParty(page) {
  await page.route(/^https?:\/\/(?!localhost(:\d+)?\/)/, (route) =>
    route.fulfill({ status: 200, contentType: 'application/javascript', body: '' })
  );
}

// Events pushed through gtag() land in window.dataLayer as ["event", name, params].
async function events(page) {
  return page.evaluate(() =>
    (window.dataLayer || [])
      .map((a) => Array.from(a))
      .filter((a) => a[0] === 'event')
      .map((a) => ({ name: a[1], params: a[2] || {} }))
  );
}

module.exports = { PAGES, INDEXABLE, blockThirdParty, events };
