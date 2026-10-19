/*
 * Site wide Google Analytics 4 events. Loaded on every page after gtag-init.js.
 * No personal data is ever sent: no values typed into tools, no addresses.
 *
 * Events sent from here:
 *   official_link_click  click to an official source (BC Assessment, PAAB, gov.bc.ca, a city)
 *                        params: link_domain, link_url, page_path
 *   calendar_download    click on a .ics deadline calendar file
 *   tool_cta_click       click on a button or card link that opens one of the tools
 *                        params: tool (appeal | deferment | grant), page_path
 *   scroll_depth         50% and 90% of the page read, once each per page view
 *   page_not_found       the 404 page was shown; params: page_path, referrer
 *
 * Events sent by the tool scripts themselves:
 *   assessment_check_started / assessment_check_completed (tier)   js/calculator.js
 *   deferment_check_started / deferment_check_completed (tier)     js/deferment.js
 *   deferment_cost_started / deferment_cost_completed              js/deferment-cost.js
 *   grant_check_started / grant_check_completed (outcome)          js/grant.js
 *   affiliate_click (link_id)                                      js/affiliates.js
 *
 * Suggested key events in GA4 (Admin > Events > mark as key event):
 *   assessment_check_completed, deferment_check_completed, deferment_cost_completed,
 *   grant_check_completed, official_link_click, calendar_download, affiliate_click
 */
(function () {
  "use strict";

  function send(name, params) {
    if (typeof window.gtag === "function") window.gtag("event", name, params || {});
  }

  var OFFICIAL = /(^|\.)(bcassessment\.ca|assessmentappeal\.bc\.ca|gov\.bc\.ca|vancouver\.ca|surrey\.ca|burnaby\.ca|richmond\.ca|coquitlam\.ca|oipc\.bc\.ca)$/i;
  var TOOLS = { "/": "appeal", "/#check": "appeal", "/deferment": "deferment", "/deferment#cost": "deferment", "/home-owner-grant": "grant" };

  document.addEventListener("click", function (e) {
    var a = e.target.closest ? e.target.closest("a[href]") : null;
    if (!a) return;
    var href = a.getAttribute("href");
    var url;
    try { url = new URL(href, location.href); } catch (err) { return; }

    if (/\.ics$/i.test(url.pathname)) {
      send("calendar_download", { file_name: url.pathname.split("/").pop(), page_path: location.pathname });
      return;
    }
    if (url.host !== location.host) {
      if (OFFICIAL.test(url.hostname)) {
        send("official_link_click", { link_domain: url.hostname, link_url: url.href, page_path: location.pathname });
      }
      return;
    }
    var key = url.pathname.replace(/\/$/, "") + url.hash;
    if (key === "") key = "/";
    var tool = TOOLS[key] || TOOLS[url.pathname.replace(/\/$/, "") || "/"];
    var isCta = a.classList.contains("btn") || a.closest(".card");
    if (tool && isCta && url.pathname !== location.pathname) {
      send("tool_cta_click", { tool: tool, page_path: location.pathname });
    }
  });

  var marks = { 50: false, 90: false };
  function onScroll() {
    var doc = document.documentElement;
    var max = doc.scrollHeight - window.innerHeight;
    if (max <= 0) return;
    var pct = (window.scrollY / max) * 100;
    [50, 90].forEach(function (m) {
      if (!marks[m] && pct >= m) { marks[m] = true; send("scroll_depth", { percent: m, page_path: location.pathname }); }
    });
    if (marks[50] && marks[90]) window.removeEventListener("scroll", onScroll);
  }
  window.addEventListener("scroll", onScroll, { passive: true });

  if (document.body && document.body.getAttribute("data-page") === "404") {
    send("page_not_found", { page_path: location.pathname, referrer: document.referrer || "(none)" });
  }
})();
