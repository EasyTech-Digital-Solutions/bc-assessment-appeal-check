window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
// Only measure the live site: local tests and *.pages.dev previews would
// otherwise send fake sessions and events to the production GA4 property.
if (location.hostname === 'propertytaxbc.ca' || location.hostname === 'www.propertytaxbc.ca') {
  gtag('js', new Date());
  gtag('config', 'G-MWPM1ESFFH');
}
