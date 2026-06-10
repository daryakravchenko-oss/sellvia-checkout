/*
 * Sellvia Checkout — runtime configuration
 * ---------------------------------------------------------------------------
 *  EVERY price, term and key below is a PLACEHOLDER.
 *  Confirm all numbers with the Sellvia finance & legal teams before launch.
 *  See README.md -> "Before you go live".
 * ---------------------------------------------------------------------------
 */
window.SELLVIA_CONFIG = {
  /* ---- Payments (Stripe) -------------------------------------------------
   * Leave `stripePublishableKey` empty to run in DEMO mode:
   *   the card form renders as styled inputs and submit is simulated.
   * Set a real key (pk_test_... or pk_live_...) to mount real Stripe Elements
   * (card + Apple Pay / Google Pay) and confirm a real SetupIntent. */
  stripePublishableKey: "",        // e.g. "pk_test_xxxxx"
  backendBaseUrl: "",              // e.g. "https://api.sellvia.com" — must expose POST /create-setup-intent

  /* ---- Offer -------------------------------------------------------------*/
  currency: "USD",
  currencySymbol: "$",
  trialDays: 14,
  bundleName: "Free Ecommerce Store + Footwear Bundle",
  adCredit: 40,                    // "$40 ad credit" hero claim — must be true

  /* Order-summary line items.
   *   today     - charged immediately (trial => 0)
   *   recurring - charged monthly AFTER the trial (0 = free, never charged)
   *   was       - original value for the struck-through price (null = none)
   *
   *  FOOTWEAR PACK is a FREE bonus bundle (recurring: 0) so the only recurring
   *    charge after the trial is Sellvia Pro at $39/mo — the standard plan price. */
  items: [
    { name: "Turnkey online store",     was: 1199, today: 0, recurring: 0,  badge: "Included", note: "One-time setup · no recurring charge" },
    { name: "Hosting + SSL",            was: null, today: 0, recurring: 0,  badge: "Included", note: "Bundled with Sellvia Pro · no separate charge" },
    { name: "Sellvia Pro subscription", was: null, today: 0, recurring: 39, badge: null,       note: null },
    { name: "Footwear product pack",    was: null, today: 0, recurring: 0,  badge: "Bonus",    note: "Free bonus bundle · no recurring charge" }
  ]
};
