# Aqua Thanh Xuân — Checkout/cart HTML safety and production QA (2026-11-10)

## Source / verified identity

- Production frontend: `https://aquathanhxuan.io.vn`.
- Production WP: `https://admin.aquathanhxuan.io.vn`.
- Astro: `ngocnhanvo/aquathanhxuan-astro/master`, commit `272290ec59be5687ed88101422408d42a2f333bf`.
- PHP: `ngocnhanvo/aquathanhxuan-php/master`, unchanged `e8dd6954e5b69b84cc25d2ebb31d66168847e8f8`.
- Knowledge: `ngocnhanvo/knowledge/main` `608788447a13486dbe1087a173aece9a93fc8a66`.
- Actions: `ngocnhanvo/aquathanhxuan-actions/main`.
- Code mode `auto-build`; source write gateway `bypass`.

## Changes committed to Astro master

1. Added `src/lib/utils/escapeCartHtml.ts` with escaped HTML interpolation and constrained Woo image URL handling; tests `escapeCartHtml.test.ts` include HTML and URL injection cases.
2. Escaped Woo-originated variation labels, values and item-key HTML attributes in the shared `src/astroreact/renderCustomSelectHTML.ts` renderer.
3. Escaped product name, image URL, item key, quantity, coupon code, subtotal/discount/tax/total in `src/astroutils/CheckoutPage/InfoForm.astro`; replaced direct insertion of `c.saving_html` with escaped Woo numerical saving display. No change to native Woo cart discount calculation.
4. Escaped the same cart display values in `src/astro/pages/CartPage.astro` and protected nullable variation unit from a frontend JavaScript error.
5. Updated Actions checkout source QA regression to cover `escapeCartHtml.test.ts` and ensure safe HTML render in cart/checkout.

## Verified runs (new)

- Source QA checkout patch [#42808903097](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42808903097): **SUCCESS**, compiler + Vitest.
- Production build [#42809037033](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42809037033): **SUCCESS**; first deployment [#42809176289](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42809176289): **SUCCESS**.
- Source QA combined cart + checkout [#42809623082](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42809623082): **SUCCESS** for `272290ec...`.
- Final production WordPress build [#42809711850](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42809711850): **SUCCESS**.
- Final Astro deploy [#42809847081](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42809847081): **SUCCESS** including Astro build, FTPS archive, and signed staging activation/rollback verification.
- Post-deploy route/security read-only QA [#42810188503](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42810188503): **SUCCESS**, WP Page caches and SSR routes cart/checkout/order-received/history, HTTP 200; unsigned/anonymous order API HTTP 401; actual selectable gateway `onepayus` only; created orders 0 and cart items 0.
- Post-deploy real temporary cart Playwright [#42810194245](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42810194245): **SUCCESS**. Add Woo product #82477, cart and checkout HTTP 200, OnePay selection, terms gate, intercepted checkout POST twice and same idempotency token, intercepted create-account POST, mobile checkout 390px no clipping, private order history guest login 401. **0 created orders, 0 created accounts, cleanup PASS**.

## E2E gate — PARTIAL, intentionally unchanged

- The actual Woo shipping setting has been audited as `woocommerce_ship_to_countries=disabled`, no configured shipping zones/method/rates. PHP checkout copies delivery address and computes order totals, but does NOT add a Woo shipping line; do not assume `shipping=0` means legitimate free delivery.
- Origin's remote shopping policy requires store-confirmed stock, shipping costs and final total before transfer. Shop-owner-approved shipping and payment sequencing is required before charging for an unconfirmed final delivered total.
- BACS has no verified recipient in WP (`woocommerce_bacs_accounts` count 0), and frontend correctly hides it. Do not import old bank account information without verification.
- OnePay currently uses production gateway; no authorized sandbox/test merchant or signed transaction E2E; cannot claim actual payment callback, stock changes, email, receipt, refund, and associated signed-customer real order E2E PASS.
- Do NOT create real customer orders, execute charges, or invent shipping rates as a substitute for verification.

## Concrete next step

1. Owner/shop confirms shipping policy and provides Woo Shipping zones/method rates or explicitly approves an order-confirmation-before-payment flow.
2. Configure verified bank recipient in WordPress if BACS is intended; no frontend hardcoding.
3. With sandbox OnePay merchant and an authorized temporary QA buyer, test end-to-end order → callback → payment status → stock/email → receipt/private history with cleanup marker. Continue from this checkpoint, do not rerun already PASS source/route/browser jobs unless source or relevant CMS config changes.

**Overall:** `PARTIAL — chưa hoàn tất`; code hardening + production release + no-order QA `PASS`; full shipping and real-payment E2E still blocked on shop business decision and approved sandbox credentials.

## Resume verification — 2026-11-10 18:54 ICT

- Verified current `knowledge/main` = `608788447a13486dbe1087a173aece9a93fc8a66`, Astro `master` = `272290ec59be5687ed88101422408d42a2f333bf`, PHP `master` = `e8dd6954e5b69b84cc25d2ebb31d66168847e8f8`. No new app commits since prior checkpoint.
- Latest production Deploy #42809847081, route QA #42810188503, browser no-order QA #42810194245 all `completed/success` with successful recorded job steps. Do not rerun unless relevant source/CMS state changes.
- Source verification: `wp-content/themes/vibe-code-theme/inc/checkout/checkout_endpoint.php` (shipping address setters lines 383–392, line item/coupon setup, total calculation at 466, gateway payment at 556). There is no `WC_Order_Item_Shipping` entry in checkout order creation. Absence of rate configuration is independently supported by live Woo audit in earlier checkpoint.
- Existing OnePAY signed-return safety guard `inc/checkout/index.php` validates HMAC, order ID and amount before vendor callback, with offline test `aqua-onepay-return-safety.test.php`. No direct callback test transaction has been performed.
- This resume pass performed read-only inspection. No cart/order/account generated, no payment attempted, no application source modified, no production deploy triggered.
- Dependency: shop owner must choose Woo Shipping zones/methods and confirmed checkout total **or** explicitly authorize order confirmation before payment; test/sandbox merchant required for real E2E. Until that decision, do not change checkout business logic, invent a shipping rate, issue real charges or report paid E2E PASS.
- Resume next: after policy decision, implement Woo shipping line/confirmation sequence and associated no-order fixture QA, then deploy through existing production pipeline, finally signed gateway sandbox test with authorized test buyer.

**Status: PARTIAL — awaiting shipping/payment business confirmation.**
