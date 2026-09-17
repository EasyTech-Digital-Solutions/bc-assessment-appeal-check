/*
 * Current appeal-cycle deadlines. UPDATE THESE EVERY YEAR: see /deadlines
 * for the sourcing note. PARP deadline is Jan 31, rolled forward to the
 * next business day on weekends/holidays (Interpretation Act). PAAB
 * deadline is April 30 and is firm; it is never rolled forward.
 */
(function () {
  "use strict";

  var DEADLINES = {
    parp: { date: "2027-02-01", label: "PARP complaint deadline", note: "Jan 31, 2027 falls on a Sunday, so the deadline rolls forward to Monday, Feb 1, 2027." },
    paab: { date: "2027-04-30", label: "PAAB appeal deadline", note: "Firm, no extensions, regardless of weekends or holidays." }
  };

  function daysUntil(dateStr) {
    var target = new Date(dateStr + "T23:59:59-08:00");
    var now = new Date();
    var diffMs = target.getTime() - now.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  }

  function nextDeadline() {
    var candidates = [DEADLINES.parp, DEADLINES.paab]
      .map(function (d) { return { deadline: d, days: daysUntil(d.date) }; })
      .filter(function (c) { return c.days >= 0; })
      .sort(function (a, b) { return a.days - b.days; });
    return candidates.length ? candidates[0] : null;
  }

  function renderCountdown(el) {
    var next = nextDeadline();
    if (!next) {
      el.innerHTML = '<p>Next cycle’s dates haven’t been confirmed yet. Check back closer to January.</p>';
      return;
    }
    el.innerHTML =
      '<div class="count-box">' +
      '<div class="n">' + next.days + '</div>' +
      '<div class="l">day' + (next.days === 1 ? "" : "s") + ' until the ' + next.deadline.label + '</div>' +
      "</div>" +
      '<div class="count-box">' +
      '<div class="n">' + formatDate(next.deadline.date) + '</div>' +
      '<div class="l">' + next.deadline.note + '</div>' +
      "</div>";
  }

  function formatDate(dateStr) {
    var d = new Date(dateStr + "T00:00:00-08:00");
    return d.toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" });
  }

  // Visual escalation timeline: Today -> PARP (free, first level) -> PAAB
  // (firm, $30 fee). Node position is proportional to days-remaining, not
  // calendar date, so it stays meaningful year-round rather than jumping
  // around a fixed Jan-1 anchor. Three cases:
  //   A. both deadlines still ahead (the common case most of the cycle)
  //   B. PARP has passed but PAAB hasn't (Feb-Apr window)
  //   C. both have passed (off-season, next cycle not yet confirmed)
  function renderTimeline(el) {
    var daysParp = daysUntil(DEADLINES.parp.date);
    var daysPaab = daysUntil(DEADLINES.paab.date);

    if (daysPaab < 0) {
      el.innerHTML = '<p>Next cycle’s dates haven’t been confirmed yet. Check back closer to January.</p>';
      return;
    }

    var parpPassed = daysParp < 0;
    var parpPct = parpPassed ? 6 : Math.max(4, Math.min(96, (daysParp / daysPaab) * 100));

    var parpNode =
      '<div class="dt-node dt-node-mid" style="left:' + parpPct + '%">' +
      '<span class="dt-dot ' + (parpPassed ? "dt-dot-passed" : "dt-dot-parp") + '"></span>' +
      '<span class="dt-node-label"><strong>PARP' + (parpPassed ? " (passed)" : "") + '</strong>' + formatDate(DEADLINES.parp.date) + "<em>Free to file</em></span>" +
      "</div>";

    var todayNode =
      '<div class="dt-node dt-node-start" style="left:0%">' +
      '<span class="dt-dot dt-dot-today"></span>' +
      '<span class="dt-node-label"><strong>Today</strong></span>' +
      "</div>";

    var paabNode =
      '<div class="dt-node dt-node-end" style="left:100%">' +
      '<span class="dt-dot dt-dot-paab"></span>' +
      '<span class="dt-node-label"><strong>PAAB</strong>' + formatDate(DEADLINES.paab.date) + "<em>$30 fee &middot; firm</em></span>" +
      "</div>";

    // Below the .dt-visual/.dt-stacked breakpoint (see CSS), the horizontal
    // version's fixed-width labels physically collide once PARP and PAAB
    // sit close together on a narrow screen (confirmed by testing at
    // 375px, not a hypothetical). The stacked list is a separate rendition
    // for that breakpoint, not a CSS reflow of the same markup.
    var stackedItems =
      '<li class="dt-stacked-item"><span class="dt-dot dt-dot-today"></span><span><strong>Today</strong></span></li>' +
      '<li class="dt-stacked-item"><span class="dt-dot ' + (parpPassed ? "dt-dot-passed" : "dt-dot-parp") + '"></span><span><strong>PARP' + (parpPassed ? " (passed)" : "") + '</strong> &middot; ' + formatDate(DEADLINES.parp.date) + ' <em>(Free to file)</em></span></li>' +
      '<li class="dt-stacked-item"><span class="dt-dot dt-dot-paab"></span><span><strong>PAAB</strong> &middot; ' + formatDate(DEADLINES.paab.date) + ' <em>($30 fee &middot; firm)</em></span></li>';

    el.innerHTML =
      '<div class="deadline-timeline">' +
      '<div class="dt-visual">' +
      '<div class="dt-track">' +
      '<div class="dt-fill dt-fill-1" style="width:' + parpPct + '%"></div>' +
      '<div class="dt-fill dt-fill-2" style="width:' + (100 - parpPct) + '%"></div>' +
      "</div>" +
      '<div class="dt-nodes">' + todayNode + parpNode + paabNode + "</div>" +
      "</div>" +
      '<ul class="dt-stacked">' + stackedItems + "</ul>" +
      "</div>" +
      '<p class="visually-hidden">' +
      (parpPassed
        ? "The PARP complaint deadline of " + formatDate(DEADLINES.parp.date) + " has already passed for this cycle. "
        : "Today is " + daysParp + " day" + (daysParp === 1 ? "" : "s") + " before the PARP complaint deadline of " + formatDate(DEADLINES.parp.date) + ". ") +
      "Today is " + daysPaab + " day" + (daysPaab === 1 ? "" : "s") + " before the PAAB appeal deadline of " + formatDate(DEADLINES.paab.date) + "." +
      "</p>";
  }

  window.BCA_DEADLINES = {
    data: DEADLINES,
    daysUntil: daysUntil,
    nextDeadline: nextDeadline,
    formatDate: formatDate,
    renderCountdown: renderCountdown,
    renderTimeline: renderTimeline
  };

  document.querySelectorAll("[data-deadline-countdown]").forEach(function (el) {
    renderCountdown(el);
  });

  document.querySelectorAll("[data-deadline-timeline]").forEach(function (el) {
    renderTimeline(el);
  });

  document.querySelectorAll("[data-deadline-table]").forEach(function (el) {
    el.innerHTML =
      "<table>" +
      "<thead><tr><th>Level</th><th>Deadline</th><th>Notes</th></tr></thead>" +
      "<tbody>" +
      "<tr><td>PARP complaint</td><td>" + formatDate(DEADLINES.parp.date) + "</td><td>" + DEADLINES.parp.note + "</td></tr>" +
      "<tr><td>PAAB appeal</td><td>" + formatDate(DEADLINES.paab.date) + "</td><td>" + DEADLINES.paab.note + "</td></tr>" +
      "</tbody></table>";
  });
})();
