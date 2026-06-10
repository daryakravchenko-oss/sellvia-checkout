# Sellvia Checkout — redesign

Production-leaning rebuild of the `/checkout` page, addressing the conversion audit:
clear post-trial breakdown, ad↔checkout message match (footwear bundle), real Stripe
payments (card + Apple/Google Pay), accessible markup, and a system-font, no-marketing-pixel
critical path for speed.

## Structure

```
index.html              # markup
assets/styles.css        # styles (system fonts, responsive, mobile re-ordering)
assets/config.js         # ⚠ prices, terms, Stripe key  — EDIT THIS
assets/checkout.js       # dates, summary, country select, Stripe, validation, submit
```

No build step. Open `index.html` or serve the folder statically.

## Run / preview

```bash
npx serve .              # or: python -m http.server 8000
```
Then open the printed URL. (Opening `index.html` via `file://` also works in demo mode.)

## Configure (assets/config.js)

| Field | What |
|---|---|
| `stripePublishableKey` | Empty → **demo mode** (styled inputs, simulated submit). Set `pk_test_…`/`pk_live_…` → real Stripe Elements + Apple/Google Pay. |
| `backendBaseUrl` | Your API base. Must expose `POST /create-setup-intent`. |
| `trialDays`, `bundleName`, `adCredit` | Offer copy. |
| `items[]` | Order-summary lines: `today`, `recurring` (monthly after trial), `was`. |

### Payment model
This is a **free trial**, so the client confirms a **SetupIntent** (saves the card) rather than
charging today. Your backend endpoint must create a Stripe Customer + SetupIntent
(`usage: 'off_session'`) and return `{ clientSecret }`, so the saved card can be charged when the
trial ends. Apple/Google Pay use the same flow via the Payment Request Button.

## ⚠ Before you go live (BLOCKERS)

1. **Confirm every price/term with finance & legal.** `was: 1199`, `$39/mo`, the `$40`
   ad credit and the `$39` first charge are **placeholders**. Showing a wrong price is worse than
   showing none.
2. **Footwear pack is now a free bonus** (`recurring: 0`), so the only post-trial charge is Sellvia
   Pro at **$39/mo** – the standard plan price. Confirm with finance the pack is genuinely free; if
   it should be one-time or monthly instead, set `recurring` in `assets/config.js`.
3. **Wire a real backend** for `/create-setup-intent` and verify the post-trial charge job.
4. **Award badges** in the sidebar load from Sellvia's CDN (Forbes, Entrepreneur, Inc., G2 ×2).
   Confirm these are current and approved for use on the checkout.

## Performance notes (the #1 audit finding)

The live page scored **35/100** on mobile Lighthouse (TBT ~17.7 s, ~8.5 MB) — caused by ~51
scripts and marketing pixels (TikTok/FB/Reddit/Taboola/Google Ads/Bing/LinkedIn/Clarity) on the
critical path, plus ~1.4 s TTFB. This rebuild keeps that path clean:

- **No marketing pixels here.** If analytics/pixels are required, load them **deferred / after first
  interaction**, never render-blocking. Keep the checkout path minimal.
- **System fonts** (no Google Fonts request). Self-host Inter only if brand requires it.
- Only Stripe.js (payments) is third-party, loaded with `defer`.
- Still TODO on the server side: reduce **TTFB** (<0.8 s) and cache policy.

## Mobile block order (the deliberate part)

Desktop = two columns (form left, sticky summary right). On screens ≤900px the columns collapse
into **one ordered stream** via `display:contents` + CSS `order` (no duplicated markup). Order and
why:

| # | Block | Why here |
|---|---|---|
| 1 | **Order summary** (collapsible) | First thing after the hero: shows the *footwear bundle* (matches the ad) and anchors **$0 today** — kills the "why a card if it's free?" fear immediately. Collapsed by default so the form stays reachable; tap to expand the full breakdown. |
| 2 | **Account** (express + email) | Apple/Google Pay one-tap path is high on the page for high-intent users; then contact details. |
| 3 | **Payment** | Card details, with the "you won't be charged today" reassurance attached. |
| 4 | **CTA** | The ask, with the $0-today / $39-on-date recap right above it. |
| 5 | **Guarantee** | Cancellation reassurance *immediately under the button*, where doubt peaks. |
| 6 | **Awards** | Recognition badges (Forbes, Entrepreneur, Inc., G2 ×2) in one row, at the decision point. |

A **sticky bottom CTA** ("$0 today / $39 on <date> – Start free trial") stays visible the whole
scroll, so the conversion action is always one tap away. Logic preserved: nothing chargeable is
hidden, the recurring terms travel with the summary and the consent checkboxes.

## Accessibility

Semantic landmarks, labelled inputs, `aria-expanded` on the summary toggle, native `<select>` for
the country code (great keyboard + mobile UX), visible focus rings, `prefers-reduced-motion`
support, valid `<!DOCTYPE>` and a zoom-friendly viewport (no `user-scalable=no`).
