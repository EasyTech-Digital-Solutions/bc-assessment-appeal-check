/*
 * Fills affiliate link slots from /data/affiliates.json.
 * A slot looks like: <p class="affiliate" data-affiliate="ratehub_heloc" hidden></p>
 * Slots stay hidden until their link has a url, so nothing shows before
 * a program approves the site. Edit data/affiliates.json, never the pages.
 */
(function () {
  "use strict";

  var slots = document.querySelectorAll("[data-affiliate]");
  if (!slots.length || !window.fetch) return;

  fetch("/data/affiliates.json", { cache: "no-cache" })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (data) {
      if (!data || !data.links) return;
      Array.prototype.forEach.call(slots, function (slot) {
        var link = data.links[slot.getAttribute("data-affiliate")];
        if (!link || !link.url) return;

        var a = document.createElement("a");
        a.href = link.url;
        a.rel = "sponsored noopener";
        a.target = "_blank";
        a.textContent = link.label + " →";

        var note = document.createElement("span");
        note.className = "affiliate-note";
        note.textContent = "Affiliate link";

        slot.textContent = "";
        slot.appendChild(a);
        slot.appendChild(document.createTextNode(" "));
        slot.appendChild(note);
        slot.hidden = false;

        a.addEventListener("click", function () {
          if (typeof window.gtag === "function") {
            window.gtag("event", "affiliate_click", { link_id: slot.getAttribute("data-affiliate") });
          }
        });
      });
    })
    .catch(function () { /* no affiliate links is a fine fallback */ });
})();
