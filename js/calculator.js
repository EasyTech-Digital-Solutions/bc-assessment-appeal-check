/*
 * Free assessment check. Implements the exact logic in Part 6 of the build brief.
 * Educational estimate only. Never surfaces a dollar figure or tells the user to appeal.
 */
(function () {
  "use strict";

  var form = document.getElementById("check-form");
  if (!form) return;

  var resultBox = document.getElementById("check-result");
  var currentInput = document.getElementById("currentValue");
  var previousInput = document.getElementById("previousValue");
  var neighbourhoodInput = document.getElementById("neighbourhoodChange");
  var municipalityInput = document.getElementById("propertyMunicipality");

  var hasFiredStart = false;
  form.addEventListener("focusin", function () {
    if (hasFiredStart) return;
    hasFiredStart = true;
    if (typeof window.gtag === "function") {
      window.gtag("event", "assessment_check_started");
    }
  });

  function parseMoney(value) {
    if (!value) return null;
    var n = parseFloat(String(value).replace(/[^0-9.\-]/g, ""));
    return isNaN(n) ? null : n;
  }

  function parsePercent(value) {
    if (value === null || value === undefined || String(value).trim() === "") return null;
    var n = parseFloat(String(value).replace(/[^0-9.\-]/g, ""));
    return isNaN(n) ? null : n;
  }

  function fmtPercent(n) {
    var sign = n > 0 ? "+" : "";
    return sign + n.toFixed(1) + "%";
  }

  function computeVerdict(yourChange, neighbourhoodChange) {
    if (neighbourhoodChange === null) {
      return { tier: "unknown", delta: null };
    }
    var delta = yourChange - neighbourhoodChange;
    if (delta >= 5) return { tier: "investigate", delta: delta };
    if (delta >= 2) return { tier: "borderline", delta: delta };
    if (delta >= -2) return { tier: "inline", delta: delta };
    return { tier: "below", delta: delta };
  }

  var COPY = {
    investigate: {
      title: "Worth investigating",
      body: "Your assessment rose noticeably more than the average in your area. This may be worth a closer look."
    },
    borderline: {
      title: "Borderline",
      body: "Your increase is somewhat above average. It may or may not be worth pursuing; the details matter here."
    },
    inline: {
      title: "Roughly in line",
      body: "Your increase is close to the average for your area. This doesn’t necessarily mean an appeal is worth it."
    },
    below: {
      title: "Below average",
      body: "Your assessment rose less than the average in your area, or dropped. This isn’t typically something worth appealing."
    },
    unknown: {
      title: "We can show your change, but not how it compares",
      body: "For a more useful read, check your notice for the average change in your area and enter it above."
    }
  };

  function render(yourChange, verdict) {
    resultBox.className = "result is-visible result-tier-" + verdict.tier;
    var copy = COPY[verdict.tier];

    if (typeof window.gtag === "function") {
      window.gtag("event", "assessment_check_completed", { tier: verdict.tier });
    }

    var deltaStat = "";
    if (verdict.delta !== null) {
      deltaStat =
        '<div class="stat">' +
        '<div class="stat-value">' + fmtPercent(verdict.delta) + '</div>' +
        '<div class="stat-label">vs. neighbourhood average</div>' +
        "</div>";
    }

    resultBox.innerHTML =
      "<h3>" + copy.title + "</h3>" +
      '<div class="stat-row">' +
      '<div class="stat">' +
      '<div class="stat-value">' + fmtPercent(yourChange) + "</div>" +
      '<div class="stat-label">Your year-over-year change</div>' +
      "</div>" +
      deltaStat +
      "</div>" +
      "<p>" + copy.body + "</p>" +
      '<p class="disclaimer">This is a general educational estimate based on the figures you entered, ' +
      "not a professional opinion of value, and not a recommendation to appeal. " +
      "Whether an appeal makes sense depends on comparable sales and property details this tool doesn’t see.</p>" +
      nextSteps();
  }

  function nextSteps() {
    return (
      '<div class="next-steps">' +
      "<h4>What to do next</h4>" +
      "<ul>" +
      '<li><a href="https://www.bcassessment.ca" target="_blank" rel="noopener">Look up recent sales near you</a> on BC Assessment’s free property search.</li>' +
      '<li><a href="/evidence">See what evidence actually helps</a> a complaint.</li>' +
      '<li><a href="https://info.bcassessment.ca/services-and-products/Pages/About-Appeals.aspx" target="_blank" rel="noopener">File a free complaint</a> with BC Assessment before the <a href="/deadlines">deadline</a>.</li>' +
      '<li>Already had a review panel decision? The <a href="https://www.assessmentappeal.bc.ca" target="_blank" rel="noopener">Property Assessment Appeal Board</a> is the next step.</li>' +
      "</ul></div>"
    );
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    var current = parseMoney(currentInput.value);
    var previous = parseMoney(previousInput.value);
    var neighbourhood = parsePercent(neighbourhoodInput.value);

    if (current === null || previous === null || previous <= 0) {
      resultBox.className = "result is-visible result-tier-unknown";
      resultBox.innerHTML =
        "<h3>Check your numbers</h3><p>Enter both your current and previous assessed values (previous year’s value must be greater than zero) to see your result.</p>";
      return;
    }

    var yourChange = ((current - previous) / previous) * 100;
    var verdict = computeVerdict(yourChange, neighbourhood);
    render(yourChange, verdict);
  });
})();
