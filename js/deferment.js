/*
 * Property Tax Deferment eligibility checker — a simple decision tree, run
 * entirely client-side. The values you enter never leave your browser, and
 * there is no lead form on this tool (see Part 11 of the build brief). The
 * one exception: we log two anonymous GA4 events — one when someone starts
 * filling in the form, and one on a completed check with just the outcome
 * tier (eligible/unsure/ineligible) — no answers ever attached, so we can
 * see how many people start vs. finish.
 *
 * CURRENT RATE / THRESHOLDS — verify against gov.bc.ca before updating:
 * https://www2.gov.bc.ca/gov/content/taxes/property-taxes/annual-property-tax/property-tax-deferment-program/tax-deferment-interest-fees/current-previous-rates
 * Both programs charge compound interest at Prime + 2% for the 2026 tax
 * year onward (this replaced the old, lower, simple-interest formula that
 * differed by program). The rate resets roughly every six months
 * (Apr 1 / Oct 1) — check quarterly, not just annually.
 */
(function () {
  "use strict";

  var CURRENT_RATE = {
    percent: 6.45,
    prime: 4.45,
    spread: 2,
    effectiveFrom: "Jul 1, 2026",
    effectiveTo: "Sep 30, 2026"
  };

  // Illustrative only — Tool 2 never collects a tax amount (see Part 11:
  // "no lead form on this tool," and the eligibility check itself asks for
  // status/residency/equity, never a dollar figure to defer). This chart
  // exists to show the SHAPE of compound growth (it curves, it doesn't stay
  // flat), not to estimate anyone's real bill. Monthly compounding matches
  // the actual program mechanics described above (interest added on the
  // 23rd of each month), not a simplified annual approximation, since the
  // whole point of this page is being honest that compounding costs more
  // than the old simple-interest rules did.
  var ILLUSTRATIVE_PRINCIPAL = 5000;
  var CHART_YEARS = [1, 3, 5, 10];

  function compoundedAmount(principal, annualPercent, years) {
    var monthlyRate = annualPercent / 100 / 12;
    return principal * Math.pow(1 + monthlyRate, 12 * years);
  }

  function formatDollars(n) {
    return "$" + Math.round(n).toLocaleString("en-CA");
  }

  function buildCostChart() {
    var amounts = CHART_YEARS.map(function (y) { return compoundedAmount(ILLUSTRATIVE_PRINCIPAL, CURRENT_RATE.percent, y); });
    var max = amounts[amounts.length - 1];

    var rows = CHART_YEARS.map(function (y, i) {
      var pct = Math.max(8, (amounts[i] / max) * 100);
      var shade = i === 0 ? "1" : i === 1 ? "2" : i === 2 ? "3" : "4";
      return (
        '<div class="cost-chart-row">' +
        '<div class="cost-chart-label">Year ' + y + "</div>" +
        '<div class="cost-chart-track"><div class="cost-chart-bar cost-chart-bar-' + shade + '" style="width:' + pct + '%"></div></div>' +
        '<div class="cost-chart-value">' + formatDollars(amounts[i]) + "</div>" +
        "</div>"
      );
    }).join("");

    var hiddenSummary = CHART_YEARS.map(function (y, i) {
      return "by year " + y + ", " + formatDollars(amounts[i]);
    }).join("; ");

    return (
      '<div class="cost-chart">' +
      '<p class="cost-chart-caption">Example only — a hypothetical ' + formatDollars(ILLUSTRATIVE_PRINCIPAL) + " deferred in year 1, at today's " + CURRENT_RATE.percent + '% compound rate, assuming the rate never changes and nothing is paid down. Not a projection of your own taxes, which this tool never asks for.</p>' +
      rows +
      '<p class="visually-hidden">Illustrative growth of a hypothetical ' + formatDollars(ILLUSTRATIVE_PRINCIPAL) + " at " + CURRENT_RATE.percent + "% compound interest: " + hiddenSummary + ".</p>" +
      "</div>"
    );
  }

  var EQUITY_BANDS = {
    "75": 75,
    "50": 50,
    "25": 25,
    "15": 15,
    "under15": 0,
    "unsure": null
  };

  var form = document.getElementById("deferment-form");
  if (!form) return;
  var resultBox = document.getElementById("deferment-result");

  var hasFiredStart = false;
  form.addEventListener("focusin", function () {
    if (hasFiredStart) return;
    hasFiredStart = true;
    if (typeof window.gtag === "function") {
      window.gtag("event", "deferment_check_started");
    }
  });

  function evaluate(data) {
    if (data.residency !== "yes") {
      return {
        tier: "ineligible",
        title: "Not eligible yet",
        reasons: ["Both programs require you to have lived in B.C. for at least one year immediately before applying."]
      };
    }
    if (data.taxesArrears === "yes") {
      return {
        tier: "ineligible",
        title: "Not eligible until arrears are cleared",
        reasons: ["Both programs require that you've already paid all previous years' property taxes, utility fees, penalties, and interest. Deferment only applies to the current year's taxes."]
      };
    }

    var qualifiesRegularStatus = data.status === "55plus" || data.status === "survivingSpouse" || data.status === "disability";
    var qualifiesFamiliesStatus = data.supportingChild === "yes";

    if (!qualifiesRegularStatus && !qualifiesFamiliesStatus) {
      return {
        tier: "ineligible",
        title: "Doesn't look like a fit, based on status",
        reasons: ["Neither program's status requirement seems to apply: the Regular Program requires being 55+, a surviving spouse, or a person with disabilities; the Families with Children Program requires financially supporting a dependent child."]
      };
    }

    var equity = EQUITY_BANDS[data.equity];
    var equityUnsure = data.equity === "unsure";

    var regularEligible = qualifiesRegularStatus && !equityUnsure && equity >= 25;
    var familiesEligible = qualifiesFamiliesStatus && !equityUnsure && equity >= 15;

    var notes = [];
    if (data.currentPaid === "yes") {
      notes.push("You mentioned this year's property taxes are already paid in full. Deferment only applies to taxes not yet paid — this would apply starting next tax year, not the one you already paid.");
    }

    if (equityUnsure) {
      return {
        tier: "unsure",
        title: "Status looks promising — but we need your equity position to say more",
        reasons: [
          (qualifiesRegularStatus ? "You may meet the Regular Program's status requirement (minimum 25% equity needed). " : "") +
          (qualifiesFamiliesStatus ? "You may meet the Families with Children Program's status requirement (minimum 15% equity needed)." : "")
        ],
        notes: notes
      };
    }

    if (regularEligible && familiesEligible) {
      return {
        tier: "eligible",
        title: "You may qualify for both programs",
        reasons: [
          "Based on what you entered, you may meet the requirements for both the Regular Program and the Families with Children Program.",
          "Both currently charge the same interest rate. The Families with Children Program has no application or renewal fees, while the Regular Program charges a $60 one-time application fee plus $10/year to renew — worth factoring in if you qualify for both."
        ],
        notes: notes
      };
    }
    if (regularEligible) {
      return {
        tier: "eligible",
        title: "You may qualify for the Regular Program",
        reasons: ["Based on what you entered, you may meet the Regular Program's requirements (55+, a surviving spouse, or a person with disabilities, with at least 25% equity)."],
        notes: notes
      };
    }
    if (familiesEligible) {
      return {
        tier: "eligible",
        title: "You may qualify for the Families with Children Program",
        reasons: ["Based on what you entered, you may meet the Families with Children Program's requirements (financially supporting a qualifying dependent child, with at least 15% equity)."],
        notes: notes
      };
    }

    // Status qualifies but equity doesn't clear either threshold.
    var neededList = [];
    if (qualifiesRegularStatus) neededList.push("25% for the Regular Program");
    if (qualifiesFamiliesStatus) neededList.push("15% for the Families with Children Program");
    return {
      tier: "ineligible",
      title: "Equity looks too low right now",
      reasons: ["Your status may otherwise qualify, but both programs require minimum equity you maintain throughout the deferment: " + neededList.join(" or ") + ". Based on what you entered, that threshold doesn't look met."],
      notes: notes
    };
  }

  var COPY_CLASS = {
    eligible: "result-tier-investigate",
    unsure: "result-tier-borderline",
    ineligible: "result-tier-inline"
  };

  function render(outcome) {
    resultBox.className = "result is-visible " + COPY_CLASS[outcome.tier];

    if (typeof window.gtag === "function") {
      window.gtag("event", "deferment_check_completed", { tier: outcome.tier });
    }

    var html = "<h3>" + outcome.title + "</h3>";
    outcome.reasons.forEach(function (r) {
      if (r) html += "<p>" + r + "</p>";
    });
    if (outcome.notes && outcome.notes.length) {
      outcome.notes.forEach(function (n) {
        html += '<p class="disclaimer">' + n + "</p>";
      });
    }

    if (outcome.tier === "eligible") {
      html +=
        '<div class="card" style="margin-top:1rem; background:#fff;">' +
        "<h4 style=\"margin-top:0;\">What this actually costs over time</h4>" +
        "<p>Deferment is a loan against your home equity, not free money. Currently, both programs charge <strong>" + CURRENT_RATE.percent + "% compound interest</strong> (prime of " + CURRENT_RATE.prime + "% + " + CURRENT_RATE.spread + "%), compounding monthly — for taxes deferred in the 2026 tax year and later. Unlike the old simple-interest rules, interest now accrues on interest, so the amount owed grows faster the longer it's deferred.</p>" +
        buildCostChart() +
        "<p>The deferred taxes plus all accumulated interest become due when you sell or transfer the property, and the province places a restrictive lien on your title for as long as taxes are deferred. This can affect refinancing or a future sale until it's paid off.</p>" +
        "<p style=\"margin-bottom:0;\">Whether that trade, cash flow relief now against a larger bill later, makes sense depends on your own plans and finances. This tool doesn't make that call for you.</p>" +
        "</div>" +
        '<p style="margin-top:1.25rem;"><a class="btn" href="https://www2.gov.bc.ca/gov/content/taxes/property-taxes/annual-property-tax/property-tax-deferment-program/apply" target="_blank" rel="noopener">Apply on the official gov.bc.ca portal →</a></p>';
    }

    resultBox.innerHTML = html;
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var data = {
      status: form.status.value,
      supportingChild: form.querySelector('input[name="supportingChild"]:checked') ? form.querySelector('input[name="supportingChild"]:checked').value : "no",
      residency: form.querySelector('input[name="residency"]:checked') ? form.querySelector('input[name="residency"]:checked').value : "no",
      taxesArrears: form.querySelector('input[name="taxesArrears"]:checked') ? form.querySelector('input[name="taxesArrears"]:checked').value : "no",
      currentPaid: form.querySelector('input[name="currentPaid"]:checked') ? form.querySelector('input[name="currentPaid"]:checked').value : "no",
      equity: form.equity.value
    };

    if (!data.status || !data.equity) {
      resultBox.className = "result is-visible result-tier-unknown";
      resultBox.innerHTML = "<h3>A couple more answers needed</h3><p>Please select your status and your rough equity position to see a result.</p>";
      return;
    }

    render(evaluate(data));
  });

  window.__DEFERMENT_RATE__ = CURRENT_RATE;
})();
