/* ===========================================================================
   Sellvia Checkout — behaviour
   - Computes trial dates + totals from config.js
   - Renders the order summary
   - Builds an accessible country-code <select>
   - Mounts REAL Stripe Elements (card + Apple/Google Pay) when a key is set,
     otherwise falls back to a styled DEMO card form
   - Validates and submits (SetupIntent flow — saves the card for the post-trial
     charge; the network calls hit a backend you provide, see createSetupIntent)
   =========================================================================== */
(function () {
  "use strict";

  var CFG = window.SELLVIA_CONFIG || {};
  var SYM = CFG.currencySymbol || "$";
  var $   = function (s, r) { return (r || document).querySelector(s); };
  var $all= function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- money / dates ---------- */
  function money(n, cents) {
    n = Number(n) || 0;
    if (n === 0 && !cents) return SYM + "0";
    return SYM + n.toFixed(cents ? 2 : (n % 1 ? 2 : 0));
  }
  var MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  var trialDays = CFG.trialDays || 14;
  var end = new Date(Date.now() + trialDays * 86400000);
  var trialEndLong  = MONTHS[end.getMonth()] + " " + end.getDate() + ", " + end.getFullYear();
  var trialEndShort = MONTHS[end.getMonth()] + " " + end.getDate();

  /* ---------- totals ---------- */
  var items = CFG.items || [];
  var todayTotal       = items.reduce(function (s, i) { return s + (i.today || 0); }, 0);
  var firstChargeTotal = items.reduce(function (s, i) { return s + (i.recurring || 0); }, 0);

  /* ---------- text bindings ---------- */
  var BIND = {
    trialDays: String(trialDays),
    todayTotal: money(todayTotal),
    todayTotalCents: money(todayTotal, true),
    firstChargeTotal: money(firstChargeTotal, true),
    firstChargeTotalShort: money(firstChargeTotal),
    trialEndLong: trialEndLong,
    trialEndShort: trialEndShort,
    bundleName: CFG.bundleName || "",
    adCredit: money(CFG.adCredit || 0)
  };
  $all("[data-bind]").forEach(function (el) {
    var k = el.getAttribute("data-bind");
    if (BIND[k] != null) el.textContent = BIND[k];
  });

  /* ---------- order summary line items ---------- */
  (function renderItems() {
    var wrap = $("#line-items");
    if (!wrap) return;
    wrap.innerHTML = "";
    items.forEach(function (it) {
      var row = document.createElement("div"); row.className = "line-item";

      var name = document.createElement("div"); name.className = "line-name";
      name.appendChild(document.createTextNode(it.name));
      if (it.badge) {
        var b = document.createElement("span"); b.className = "free-pill"; b.textContent = it.badge;
        name.appendChild(b);
      }

      var price = document.createElement("div"); price.className = "line-price";
      if (it.was) { var w = document.createElement("span"); w.className = "was"; w.textContent = money(it.was); price.appendChild(w); }
      price.appendChild(document.createTextNode(it.priceLabel != null ? it.priceLabel : (it.today === 0 ? (it.recurring ? money(0, true) : "FREE") : money(it.today, true))));

      var sub = document.createElement("div"); sub.className = "line-renewal";
      if (it.recurring > 0) {
        sub.innerHTML = "Free for " + trialDays + " days, then <strong>" + money(it.recurring, true) +
          "/mo</strong> from <strong>" + trialEndLong + "</strong>" + (it.aside ? " <em>(" + it.aside + ")</em>" : "");
      } else {
        sub.className += " included";
        sub.textContent = "✓ " + (it.note || "Included");
      }

      row.appendChild(name); row.appendChild(price); row.appendChild(sub);
      wrap.appendChild(row);
    });
  })();

  /* ---------- country code select (accessible, native = great on mobile) ---------- */
  var COUNTRIES = [
    ["US","1","United States"],["CA","1","Canada"],["GB","44","United Kingdom"],["IE","353","Ireland"],
    ["AU","61","Australia"],["NZ","64","New Zealand"],["DE","49","Germany"],["FR","33","France"],
    ["ES","34","Spain"],["IT","39","Italy"],["PT","351","Portugal"],["NL","31","Netherlands"],
    ["BE","32","Belgium"],["LU","352","Luxembourg"],["AT","43","Austria"],["CH","41","Switzerland"],
    ["SE","46","Sweden"],["NO","47","Norway"],["DK","45","Denmark"],["FI","358","Finland"],
    ["IS","354","Iceland"],["PL","48","Poland"],["CZ","420","Czechia"],["SK","421","Slovakia"],
    ["HU","36","Hungary"],["RO","40","Romania"],["BG","359","Bulgaria"],["GR","30","Greece"],
    ["HR","385","Croatia"],["SI","386","Slovenia"],["EE","372","Estonia"],["LV","371","Latvia"],
    ["LT","370","Lithuania"],["UA","380","Ukraine"],["TR","90","Turkey"],["IL","972","Israel"],
    ["AE","971","United Arab Emirates"],["SA","966","Saudi Arabia"],["QA","974","Qatar"],["KW","965","Kuwait"],
    ["BH","973","Bahrain"],["OM","968","Oman"],["JO","962","Jordan"],["LB","961","Lebanon"],
    ["EG","20","Egypt"],["MA","212","Morocco"],["DZ","213","Algeria"],["TN","216","Tunisia"],
    ["ZA","27","South Africa"],["NG","234","Nigeria"],["KE","254","Kenya"],["GH","233","Ghana"],
    ["IN","91","India"],["PK","92","Pakistan"],["BD","880","Bangladesh"],["LK","94","Sri Lanka"],
    ["NP","977","Nepal"],["CN","86","China"],["HK","852","Hong Kong"],["TW","886","Taiwan"],
    ["JP","81","Japan"],["KR","82","South Korea"],["SG","65","Singapore"],["MY","60","Malaysia"],
    ["TH","66","Thailand"],["VN","84","Vietnam"],["PH","63","Philippines"],["ID","62","Indonesia"],
    ["MX","52","Mexico"],["BR","55","Brazil"],["AR","54","Argentina"],["CL","56","Chile"],
    ["CO","57","Colombia"],["PE","51","Peru"]
  ];
  function flag(iso) { return iso.replace(/./g, function (c) { return String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65); }); }
  (function fillCountries() {
    var sel = $("#phone-country");
    if (!sel) return;
    COUNTRIES.slice().sort(function (a, b) { return a[2].localeCompare(b[2]); }).forEach(function (c) {
      var o = document.createElement("option");
      o.value = "+" + c[1];
      o.textContent = flag(c[0]) + "  +" + c[1];
      o.setAttribute("data-country", c[2]);
      if (c[0] === "US") o.selected = true;
      sel.appendChild(o);
    });
  })();

  /* ---------- mobile collapsible summary ---------- */
  (function () {
    var card = $("#summary"), btn = $("#summary-toggle");
    if (!card || !btn) return;
    btn.addEventListener("click", function () {
      var open = card.classList.toggle("open");
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    });
  })();

  /* ---------- sticky CTA -> submit ---------- */
  (function () {
    var s = $("#sticky-cta-btn"), form = $("#checkout-form");
    if (!s || !form) return;
    s.addEventListener("click", function () {
      if (form.requestSubmit) form.requestSubmit();
      else form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
    });
  })();

  /* ====================== PAYMENTS ====================== */
  var stripe = null, cardNumberEl = null, demo = false;
  var cardState = { complete: false };
  var hasKey = CFG.stripePublishableKey && CFG.stripePublishableKey.indexOf("pk_") === 0;

  if (hasKey && typeof Stripe !== "undefined") { initStripe(); }
  else { demo = true; initDemo(); }

  function stripeStyle() {
    return {
      base: { fontSize: "15px", color: "#1A1E25", fontFamily: '-apple-system, "Segoe UI", Roboto, sans-serif',
              "::placeholder": { color: "#7A7E85" } },
      invalid: { color: "#C44545" }
    };
  }

  function initStripe() {
    try {
      stripe = Stripe(CFG.stripePublishableKey);
      var elements = stripe.elements();
      var st = stripeStyle();

      cardNumberEl   = elements.create("cardNumber", { style: st, showIcon: true });
      var cardExpiry = elements.create("cardExpiry", { style: st });
      var cardCvc    = elements.create("cardCvc",    { style: st });
      cardNumberEl.mount("#card-number");
      cardExpiry.mount("#card-expiry");
      cardCvc.mount("#card-cvc");

      var done = { num: false, exp: false, cvc: false };
      function sync(which, e) {
        done[which] = e.complete;
        cardState.complete = done.num && done.exp && done.cvc;
        setError("card-number", e.error ? e.error.message : "");
      }
      cardNumberEl.on("change", function (e) { sync("num", e); });
      cardExpiry.on("change",   function (e) { sync("exp", e); });
      cardCvc.on("change",      function (e) { sync("cvc", e); });

      /* Apple Pay / Google Pay via Payment Request Button */
      var pr = stripe.paymentRequest({
        country: "US",
        currency: (CFG.currency || "USD").toLowerCase(),
        total: { label: "First charge after " + trialDays + "-day free trial", amount: Math.round(firstChargeTotal * 100) },
        requestPayerName: true, requestPayerEmail: true
      });
      var prButton = elements.create("paymentRequestButton", { paymentRequest: pr });
      pr.canMakePayment().then(function (res) {
        if (res) { prButton.mount("#express-checkout"); var w = $("#express-wrap"); if (w) w.hidden = false; var g = $("#gpay-demo"); if (g) g.hidden = true; }
      });
      pr.on("paymentmethod", function (ev) {
        createSetupIntent(ev.payerEmail).then(function (cs) {
          return stripe.confirmCardSetup(cs, { payment_method: ev.paymentMethod.id }, { handleActions: false });
        }).then(function (r) {
          if (r && r.error) { ev.complete("fail"); showStatus(r.error.message, true); }
          else { ev.complete("success"); onSuccess(); }
        }).catch(function (err) { ev.complete("fail"); showStatus(err.message || "Could not start trial.", true); });
      });
    } catch (e) { demo = true; initDemo(); }
  }

  /* DEMO fallback — styled inputs so the page is fully viewable without a key */
  function initDemo() {
    mountDemo("#card-number", "cc-number", "Card number", fmtCard, 19);
    mountDemo("#card-expiry", "cc-exp",    "MM / YY",     fmtExp,  7);
    mountDemo("#card-cvc",    "cc-csc",    "CVC",         fmtCvc,  4);
    /* show the express (Google/Apple Pay) row with a demo button so the layout matches production */
    var ew = $("#express-wrap"); if (ew) ew.hidden = false;
    var g = $("#gpay-demo");
    if (g) g.addEventListener("click", function () {
      var f = $("#checkout-form");
      if (f) { if (f.requestSubmit) f.requestSubmit(); else f.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true })); }
    });
  }
  function mountDemo(sel, ac, ph, fmt, max) {
    var box = $(sel); if (!box) return;
    var i = document.createElement("input");
    i.type = "text"; i.className = "demo-input"; i.placeholder = ph;
    i.autocomplete = ac; i.inputMode = "numeric"; i.setAttribute("aria-label", ph);
    i.addEventListener("input", function () { i.value = fmt(i.value, max); checkDemo(); });
    box.appendChild(i); box.classList.add("has-demo");
  }
  function checkDemo() {
    var n = $("#card-number .demo-input"), e = $("#card-expiry .demo-input"), c = $("#card-cvc .demo-input");
    cardState.complete = !!(n && e && c &&
      n.value.replace(/\s/g, "").length >= 13 && e.value.length >= 5 && c.value.length >= 3);
  }
  function fmtCard(v) { v = v.replace(/\D/g, "").slice(0, 16); return v.replace(/(.{4})/g, "$1 ").trim(); }
  function fmtExp(v)  { v = v.replace(/\D/g, "").slice(0, 4);  return v.length > 2 ? v.slice(0, 2) + " / " + v.slice(2) : v; }
  function fmtCvc(v, m) { return v.replace(/\D/g, "").slice(0, m || 4); }

  /* ---- Backend contract -----------------------------------------------------
   * POST {backendBaseUrl}/create-setup-intent  { email }  ->  { clientSecret }
   * The backend creates a Stripe Customer + SetupIntent (usage:'off_session')
   * so the saved card can be charged when the trial ends. */
  function createSetupIntent(email) {
    if (!CFG.backendBaseUrl) {
      return Promise.reject(new Error("Payment backend not configured (set backendBaseUrl in assets/config.js)."));
    }
    return fetch(CFG.backendBaseUrl.replace(/\/$/, "") + "/create-setup-intent", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email || ($("#email") || {}).value })
    }).then(function (r) {
      if (!r.ok) throw new Error("Payment server error (" + r.status + ").");
      return r.json();
    }).then(function (d) {
      if (!d.clientSecret) throw new Error("Payment server did not return a clientSecret.");
      return d.clientSecret;
    });
  }

  /* ====================== VALIDATION + SUBMIT ====================== */
  var form = $("#checkout-form");
  function setError(forId, msg) { var el = $('[data-error="' + forId + '"]'); if (el) el.textContent = msg || ""; }
  function showStatus(msg, isErr) { var s = $("#form-status"); if (!s) return; s.textContent = msg; s.className = "form-status " + (isErr ? "err" : "ok"); }
  function validEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

  function validate() {
    var ok = true; showStatus("", false);
    var email = $("#email");
    if (!validEmail((email.value || "").trim())) { setError("email", "Enter a valid email address"); ok = false; } else setError("email", "");
    var name = $("#cardname");
    if (!(name.value || "").trim()) { setError("cardname", "Enter the name on the card"); ok = false; } else setError("cardname", "");
    if (!cardState.complete) { setError("card-number", "Enter your full card details"); ok = false; }
    var consents = $all(".consent input[type=checkbox]");
    var allChecked = consents.every(function (c) { return c.checked; });
    setError("consents", allChecked ? "" : "Please accept both to continue");
    if (!allChecked) ok = false;
    return ok;
  }

  function setLoading(on) {
    var b = $("#submit-btn"); if (!b) return;
    b.disabled = on; b.classList.toggle("loading", on);
    var lbl = b.querySelector(".btn-label");
    if (lbl) lbl.textContent = on ? "Starting your trial…" : b.getAttribute("data-label");
  }
  function onSuccess() {
    setLoading(false);
    showStatus("✓ Trial started" + (demo ? " (demo mode)" : "") + ". Check your email for store access.", false);
    var b = $("#submit-btn");
    if (b) { b.disabled = true; var lbl = b.querySelector(".btn-label"); if (lbl) lbl.textContent = "✓ Trial started"; }
    /* Production: redirect to onboarding, e.g. location.href = "/welcome"; */
  }

  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!validate()) {
        var firstErr = $(".field-error:not(:empty)");
        if (firstErr && firstErr.scrollIntoView) firstErr.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
      setLoading(true);

      if (demo) { setTimeout(onSuccess, 900); return; }

      createSetupIntent($("#email").value.trim())
        .then(function (cs) {
          return stripe.confirmCardSetup(cs, {
            payment_method: {
              card: cardNumberEl,
              billing_details: { name: $("#cardname").value.trim(), email: $("#email").value.trim() }
            }
          });
        })
        .then(function (r) {
          if (r.error) { setLoading(false); showStatus(r.error.message, true); }
          else onSuccess();
        })
        .catch(function (err) { setLoading(false); showStatus(err.message || "Something went wrong. Please try again.", true); });
    });
  }
})();

/* v3: reveal the footer award badges when their row scrolls into view */
(function () {
  var band = document.querySelector(".badges-band");
  if (!band) return;
  if (!("IntersectionObserver" in window)) { band.classList.add("in"); return; }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting) { band.classList.add("in"); io.disconnect(); } });
  }, { threshold: 0.15 });
  io.observe(band);
})();
