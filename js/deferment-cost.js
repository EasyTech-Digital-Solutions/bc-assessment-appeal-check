/*
 * Deferment cost estimate. Runs in the browser only; nothing is sent anywhere.
 *
 * Model: the same tax amount is deferred once a year for N years (around the
 * July due date). Each year's amount grows until the end of year N.
 *   New rules (2026+): prime + 2%, compounded monthly, both programs.
 *   Old rules (2025 and earlier, comparison only): Regular prime - 2% simple,
 *     Families prime simple.
 *   Line of credit: user's rate, compounded monthly.
 *   Fees: Regular only, $60 application + $10 renewal each later year.
 * Rates are assumed constant, which the page states plainly.
 */
(function () {
  "use strict";

  function compoundMonthly(amount, annualRatePct, years) {
    var r = annualRatePct / 100 / 12;
    return amount * Math.pow(1 + r, 12 * years);
  }

  function simple(amount, annualRatePct, years) {
    return amount * (1 + (annualRatePct / 100) * years);
  }

  function estimate(input) {
    var tax = input.annualTax;
    var n = input.years;
    var prime = input.primeRate;
    var newRate = prime + 2;
    var oldRate = input.program === "families" ? prime : Math.max(prime - 2, 0);

    var principal = 0, owedNew = 0, owedOld = 0, owedLoc = 0;
    for (var k = 0; k < n; k++) {
      var yearsGrowing = n - k;
      principal += tax;
      owedNew += compoundMonthly(tax, newRate, yearsGrowing);
      owedOld += simple(tax, oldRate, yearsGrowing);
      if (input.locRate !== null) owedLoc += compoundMonthly(tax, input.locRate, yearsGrowing);
    }
    var fees = input.program === "regular" ? 60 + 10 * (n - 1) : 0;

    return {
      principal: principal,
      newRate: newRate,
      oldRate: oldRate,
      owedNew: owedNew + fees,
      interestNew: owedNew - principal,
      owedOld: owedOld + fees,
      interestOld: owedOld - principal,
      owedLoc: input.locRate !== null ? owedLoc : null,
      fees: fees
    };
  }

  // Exposed for tests.
  window.__defermentCost = { estimate: estimate };

  var form = document.getElementById("cost-form");
  if (!form) return;
  var resultBox = document.getElementById("cost-result");

  function num(id) {
    var raw = document.getElementById(id).value;
    if (raw === null || String(raw).trim() === "") return null;
    var n = parseFloat(String(raw).replace(/[^0-9.\-]/g, ""));
    return isNaN(n) ? null : n;
  }

  function money(n) {
    return n.toLocaleString("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 });
  }

  function pct(n) {
    return (Math.round(n * 100) / 100).toFixed(2) + "%";
  }

  var started = false;
  form.addEventListener("focusin", function () {
    if (started) return;
    started = true;
    if (typeof window.gtag === "function") window.gtag("event", "deferment_cost_started");
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var input = {
      annualTax: num("annualTax"),
      years: num("years"),
      primeRate: num("primeRate"),
      locRate: num("locRate"),
      program: document.getElementById("program").value
    };

    if (input.annualTax === null || input.annualTax <= 0 ||
        input.years === null || input.years < 1 || input.years > 40 ||
        input.primeRate === null || input.primeRate < 0 || input.primeRate > 25 ||
        (input.locRate !== null && (input.locRate < 0 || input.locRate > 30))) {
      resultBox.className = "result is-visible result-tier-unknown";
      resultBox.innerHTML = "<h3>Check your numbers</h3><p>Enter a yearly tax amount above zero, between 1 and 40 years, and rates between 0% and 25% (30% for a line of credit).</p>";
      return;
    }
    input.years = Math.round(input.years);

    var r = estimate(input);
    if (typeof window.gtag === "function") window.gtag("event", "deferment_cost_completed");

    var locRow = r.owedLoc !== null
      ? '<tr><th scope="row">Line of credit, ' + pct(input.locRate) + "</th><td>" + money(r.owedLoc) + "</td><td>" + money(r.owedLoc - r.principal) + "</td></tr>"
      : "";

    resultBox.className = "result is-visible result-tier-unknown";
    resultBox.innerHTML =
      "<h3>About " + money(r.owedNew) + " owed after " + input.years + " year" + (input.years === 1 ? "" : "s") + "</h3>" +
      "<p>You'd defer " + money(r.principal) + " in total. Under the 2026 rules, interest adds about " + money(r.interestNew) + "." +
      (r.fees ? " Fees add " + money(r.fees) + "." : "") + "</p>" +
      '<div class="table-wrap"><table class="cost-table">' +
      '<thead><tr><th scope="col">Option</th><th scope="col">Total owed</th><th scope="col">Interest</th></tr></thead><tbody>' +
      '<tr><th scope="row">2026 rules, ' + pct(r.newRate) + " compound</th><td>" + money(r.owedNew) + "</td><td>" + money(r.interestNew) + "</td></tr>" +
      '<tr><th scope="row">Old rules, ' + pct(r.oldRate) + " simple</th><td>" + money(r.owedOld) + "</td><td>" + money(r.interestOld) + "</td></tr>" +
      locRow +
      "</tbody></table></div>" +
      '<p class="disclaimer">Estimate only. Assumes the same tax every year and a rate that never changes; the province resets it every quarter. ' +
      "Deferred taxes and interest are repaid when the home is sold or transferred, usually from the estate. Totals for deferment include program fees. Old rules apply only to taxes deferred for 2025 and earlier and are shown for comparison.</p>";
  });
})();
