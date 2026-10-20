/*
 * BC home owner grant estimate (2026 rules). Runs in the browser only.
 * Source: gov.bc.ca home owner grant page, checked October 19, 2026.
 *   Threshold $2,075,000. Grant drops $5 per $1,000 of value above it.
 *   Regular: $570 (Metro Vancouver, Capital, Fraser Valley RDs), $770 elsewhere.
 *   Additional (seniors 65+, veterans, persons with disabilities and related
 *   cases): $845 and $1,045. The zero points on gov.bc.ca ($2,189,000 /
 *   $2,229,000 regular, $2,244,000 / $2,284,000 additional) match these amounts.
 *   Owner must still pay at least $350 tax ($100 with the additional grant).
 * Keep in sync with data/rules.json.
 */
(function () {
  "use strict";

  var RULES = {
    threshold: 2075000,
    perThousand: 5,
    amounts: { metro: { regular: 570, additional: 845 }, other: { regular: 770, additional: 1045 } },
    minTax: { regular: 350, additional: 100 }
  };

  function estimate(input) {
    var type = input.additional ? "additional" : "regular";
    var full = RULES.amounts[input.zone][type];
    var over = Math.max(0, input.value - RULES.threshold);
    var reduction = (over / 1000) * RULES.perThousand;
    var grant = Math.max(0, full - reduction);
    var limitedByTax = false;
    if (input.tax !== null) {
      var maxByTax = Math.max(0, input.tax - RULES.minTax[type]);
      if (maxByTax < grant) { grant = maxByTax; limitedByTax = true; }
    }
    return { type: type, full: full, reduction: Math.min(reduction, full), grant: Math.round(grant * 100) / 100, limitedByTax: limitedByTax, minTax: RULES.minTax[type] };
  }

  window.__grant = { estimate: estimate, RULES: RULES };

  var form = document.getElementById("grant-form");
  if (!form) return;
  var resultBox = document.getElementById("grant-result");

  function num(id) {
    var raw = document.getElementById(id).value;
    if (String(raw).trim() === "") return null;
    var n = parseFloat(String(raw).replace(/[^0-9.\-]/g, ""));
    return isNaN(n) ? null : n;
  }
  function money(n) {
    return n.toLocaleString("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 });
  }

  var started = false;
  form.addEventListener("focusin", function () {
    if (started) return;
    started = true;
    if (typeof window.gtag === "function") window.gtag("event", "grant_check_started");
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var value = num("grantValue");
    var tax = num("grantTax");
    var zone = form.querySelector('input[name="zone"]:checked');
    var additional = form.querySelector('input[name="additional"]:checked');

    if (value === null || value <= 0 || !zone || !additional || (tax !== null && tax < 0)) {
      resultBox.className = "result is-visible result-tier-unknown";
      resultBox.innerHTML = "<h3>Check your answers</h3><p>Enter your assessed value and choose your area and whether you qualify for the additional grant.</p>";
      return;
    }

    var r = estimate({ value: value, tax: tax, zone: zone.value, additional: additional.value === "yes" });
    if (typeof window.gtag === "function") window.gtag("event", "grant_check_completed", { outcome: r.grant > 0 ? "grant" : "none" });

    var label = r.type === "additional" ? "additional grant" : "regular grant";
    var heading = r.grant > 0 ? "Estimated grant: " + money(r.grant) : "No grant at this value";
    var lines = [];
    lines.push("Full " + label + " in your area: " + money(r.full) + ".");
    if (r.reduction > 0) lines.push("Your value is over the $2,075,000 threshold, which reduces it by " + money(r.reduction) + ".");
    if (r.limitedByTax) lines.push("You must still pay at least " + money(r.minTax) + " in property tax, so the grant is limited to " + money(r.grant) + ".");

    resultBox.className = "result is-visible " + (r.grant > 0 ? "result-tier-investigate" : "result-tier-inline");
    resultBox.innerHTML =
      "<h3>" + heading + "</h3>" +
      "<ul>" + lines.map(function (l) { return "<li>" + l + "</li>"; }).join("") + "</ul>" +
      '<p class="disclaimer">Estimate based on 2026 rules. You still have to claim the grant each year, through your municipality or the province. ' +
      'The final amount is set by the Province of BC.</p>' +
      '<p><a href="https://www2.gov.bc.ca/gov/content/taxes/property-taxes/annual-property-tax/home-owner-grant/apply" target="_blank" rel="noopener" class="btn btn-secondary">How to claim on gov.bc.ca →</a></p>';
  });
})();
