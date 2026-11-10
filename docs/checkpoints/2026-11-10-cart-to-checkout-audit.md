# Aqua Thanh Xuân — E2E cart → checkout audit (10/11/2026)

## Scope
Read-only audit of Aqua's current checkout, compared with `ngocnhanvo/escvn-astro/master` and `ngocnhanvo/escvn-php/master`. Do **not** write to ESC repos or create live customer orders as part of this audit. Production origins Aqua frontend `https://aquathanhxuan.io.vn`, WP `https://admin.aquathanhxuan.io.vn`.

## Pinned source / evidence

- Aqua Astro `master` `0ac8af50be65a4ead280d2368bd69195c27bcc01` (already deployed via #42775644106); Aqua PHP `master` `bbeae23d8169a8177ab9719eda4cf6040f9d1b8a`; Actions `main`.
- Existing anonymous cart & native 5% WordPress coupon `aqua-auto-5` PASS on product 82477: subtotal 2,700,000 VND, discount 135,000 VND, cleanup PASS; [#42777458941](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42777458941).
- [Aqua checkout readonly audit #42778412178](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42778412178): /cart, /checkout, /order-received and internal /ssr/cart/cart, /ssr/cart/checkout, /ssr/cart/order-received ALL HTTP 404. WP Pages 83808/83810/83812 are `publish` with ACF `ssr-cart/CartPage`, `ssr-checkout/CheckoutPage`, `ssr-checkoutdone/CheckoutDonePage`, respectively. WP Rewrite rules IDs 83814/83815/83816 are published and enabled.
- [Aqua SSR cache diagnostic #42778732005](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42778732005): production `/data/cms-common.json` HTTP 200 but its `pages` index contains **zero** of the 3 SSR Page keys; `/data/page-cart.json`, `page-checkout.json`, `page-order-received.json` all HTTP 404. This is direct evidence of missing **exported SSR Page cache**. The runtime `src/pages/ssr/cart/[slug]/index.astro` uses `getCachePage`; when the Page key is absent, it returns 404. Merely recreating WP Rewrite rules cannot fix the missing exported Page JSON.
- Technical probable cause: Astro `src/lib/wordpress/pages/index.ts` incremental cache path with `get-page-logs` only reconciles `ssrPageIds(allWPPages_old)` and hence cannot find brand-new SSR pages absent from previous cached page index when their WordPress creation was not captured in the change log. Need fix at the WordPress Page data/cache discovery layer; no hardcoded frontend fallback.
- Woo gateways: `onepayus` and `bacs` enabled; `cod` and `cheque` disabled. Astro form fetches `/api/cart/payment-methods` dynamically; PHP validates `$gateway->enabled` and `is_available()`. These are SOURCE-IMPLEMENTED, **NOT E2E VERIFIED**.
- Forms/code exist: billing, shipping address persistence, optional create account, email/password validation, stock check, create Woo order, native coupon copy, gateway process_payment, order redirect and receipt. These are **SOURCE-IMPLEMENTED**, not yet real-order QA. No read-only test creates an order.
- Risk findings: `CartPage.astro` still hardcodes UI label `Tự động giảm 5% đơn trên 200.000đ` even though marketing terms must be WordPress Coupon-owned; `CheckoutDonePage.astro` still uses `ESC {order.id}` as VietQR transfer reference. Do not copy ESC's bank/recipient identity to Aqua.
- Physical shipping is not fully wired: form records shipping address but checkout does not choose/persist WooCommerce shipping methods/rates/order shipping lines. Must confirm shipping policy before accepting paid physical orders.
- Source implementation currently creates the customer/order before checking gateway validity; no order-creation idempotency token in the endpoint. Need verify and harden invalid submissions/timeouts to prevent orphan/duplicate orders.
- ESC.vn reference: public `https://esc.vn/cart/` renders Cart → Checkout → Complete; ESC Astro uses same `ssr-cart`, `ssr-checkout`, `ssr-checkoutdone` Page key concept and `/ssr/cart/[slug]` runtime. ESC PHP also implements a bank-account-by-region BACS flow and stores selected account per order; only adapt patterns to Aqua's actual WordPress bank and Woo settings. Aqua's dynamic payment-gateway discovery is preferable to hardcoded ESC radio options.

## Ordered unfinished actions (not performed in audit)

1. Fix Astro incremental Page cache discovery to include newly published SSR Page records and emit `cms-common.json` + all three `page-<slug>.json` from WP data; add focused regression test. Do not create frontend fallback Pages.
2. Run source checks; build/deploy through Aqua's existing production workflow only if the task includes implementation and current code mode permits it. After deployment, read-after-write verify 3 Page JSONs plus HTTP 200 on public and internal routes.
3. Remove hardcoded coupon descriptive values, ESC bank memo and any ESC identity from Aqua checkout/receipt. Preserve Woo payments from WP.
4. Confirm Woo shipping methods/rates/order shipping data; test guest/logged-in/account creation/form validation/coupon/stock/redirect without creating/charging real orders by default. For real order QA obtain an authorized test environment/approved flow and verify order totals, inventory, email and gateway outcomes, then cleanup according to policy.

## Status

`ANONYMOUS_CART_PASS`, `NATIVE_COUPON_PASS`, `WP_PAGE_RECORDS_PASS`, `WP_REWRITE_RECORDS_PASS`, `SSR_PUBLIC_PAGE_CACHE_FAIL`, `CHECKOUT_PAGE_404`, `ORDER_GATEWAY_E2E_NOT_TESTED`, `ORDER_RECEIPT_NOT_TESTED`. No changes to Aqua Astro/PHP or ESC repositories were made during this read-only review. Audit harness/read-only workflow only.
