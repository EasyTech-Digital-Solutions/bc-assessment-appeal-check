/*
 * Lead capture form: client-side validation + submission to /api/lead.
 * The consent checkbox is required and never pre-checked; see Part 2 / Part 10 of the brief.
 */
(function () {
  "use strict";

  var form = document.getElementById("lead-form");
  if (!form) return;

  var statusBox = document.getElementById("lead-form-status");
  var submitBtn = document.getElementById("lead-submit");
  var consentBox = document.getElementById("consent");

  // Allows calculator.js to prefill values without the two scripts needing to know about each other directly.
  window.__setLeadPrefill = function (data) {
    var currentField = document.getElementById("lead-currentValue");
    var previousField = document.getElementById("lead-previousValue");
    var addressField = document.getElementById("address");
    if (currentField && data.currentValue) currentField.value = data.currentValue;
    if (previousField && data.previousValue) previousField.value = data.previousValue;
    if (addressField && data.address && !addressField.value) addressField.value = data.address;
  };

  function showStatus(kind, message) {
    statusBox.className = "form-status is-visible " + kind;
    statusBox.textContent = message;
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    if (!consentBox.checked) {
      showStatus("err", "Please check the consent box above to let us share your information with a referred professional.");
      consentBox.focus();
      return;
    }

    // Honeypot field; real users never fill this in.
    var honeypot = form.querySelector('[name="company_website"]');
    if (honeypot && honeypot.value) {
      showStatus("ok", "Thanks, we’ll be in touch.");
      form.reset();
      return;
    }

    var payload = {
      name: form.name.value.trim(),
      email: form.email.value.trim(),
      phone: form.phone.value.trim(),
      address: form.address.value.trim(),
      rollNumber: form.rollNumber.value.trim(),
      currentValue: form.currentValue.value.trim(),
      previousValue: form.previousValue.value.trim(),
      situation: form.situation.value.trim(),
      consent: true
    };

    if (!payload.name || !payload.email || (!payload.address && !payload.rollNumber)) {
      showStatus("err", "Please fill in your name, email, and either your property address or roll number.");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Sending…";

    fetch("/api/lead", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
      .then(function (res) {
        if (res.status === 429) throw new Error("rate-limited");
        if (!res.ok) throw new Error("request-failed");
        return res.json();
      })
      .then(function () {
        showStatus("ok", "Thanks, we’ve received your information. A referred professional may reach out to discuss your situation.");
        form.reset();
      })
      .catch(function (err) {
        if (err && err.message === "rate-limited") {
          showStatus("err", "Too many submissions from this connection recently. Please try again in a while, or email us directly.");
        } else {
          showStatus("err", "Something went wrong sending your information. Please try again, or email us directly.");
        }
      })
      .finally(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = "Submit";
      });
  });
})();
