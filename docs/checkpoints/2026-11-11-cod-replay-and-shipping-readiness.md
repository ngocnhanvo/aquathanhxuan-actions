# Checkpoint — Aqua COD checkout replay + shipping readiness (2026-11-11)

Project: aquathanhxuan.com / https://aquathanhxuan.io.vn
WordPress: https://admin.aquathanhxuan.io.vn
Code mode: auto-build; source gateway: bypass

## Pinned source and deployment

- Astro production unchanged: `ngocnhanvo/aquathanhxuan-astro/master@4a361f8c39077f820be5bf0f7d93ce421d67ad0f`.
- WordPress PHP source/deployed: `ngocnhanvo/aquathanhxuan-php/master@76bfe492e53c30cc3346d3154df4d4a56866d665`.
- PHP release workflow: https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42879526175 **SUCCESS**, `checkout_endpoint.php sha256_verified=PASS`, `completed=PASS files_checked=21`, `no_astro_build=PASS`. Other 20 release-managed PHP files unchanged.

## Verified production Woo settings: read-only audit

- Audit: https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42878442799 **SUCCESS**; no customer/order/settings writes.
- COD `enabled=true`; OnePay `enabled=true` in Woo backend but the existing Aqua Astro endpoint exposes ONLY COD; BACS `enabled=true` but configured bank recipients `count=0`, hence not usable.
- Native WP coupon `aqua-auto-5` ID `83818`, discount type `percent`, amount `5.00`, minimum amount `200000.00`.
- WordPress option `woocommerce_ship_to_countries=disabled`. Shipping zone list contains only default zone `id=0` with `methods=[]`. Do not invent shipping fees/methods.
- Frontend `/cart`, `/checkout`, `/order-received` returned HTTP 200; last route correctly shows a failure state without valid receipt arguments.
- `/custom/v1/login`, `/custom/v1/lost-password`, `/custom/v1/reset-password` registered as POST routes.

## Implemented fix: replay completed checkout after cart clear

- Root cause: the existing CoCart callback validated a nonempty cart BEFORE consulting a persisted successful checkout idempotency attempt. Woo COD may clear the cart immediately after processing order; client network retry with identical cart key + attempt ID would incorrectly get `Cart is empty`.
- PHP `wp-content/themes/vibe-code-theme/inc/checkout/checkout_endpoint.php` now derives stable lock-key from `cart_key + checkout_request_id`; performs **read-only success-only replay before the cart check** for well-formed attempts. Prior processing, created, requires_attention, invalid and unknown attempts can never be replayed as success.
- Existing input validation error ordering is preserved for requests with invalid/missing attempts; first source QA run https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42879197748 failed on this preflight ordering and was fixed before release, not ignored.
- Source commits: `cfa7e569` initial replay change, `586e7c3a` COD empty-cart fixture, `f6bf82ab` idempotency fixture, `76bfe492` preflight compatibility fix.
- Exact release HEAD source QA: https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42879378090 **SUCCESS**: PHP lint; preflight; coupon; idempotency; guest, account and logged-in order fixture; **`AQUA_CHECKOUT_COD_EMPTY_CART_REPLAY=PASS created=1 gateway_calls=1 duplicate_orders=0 no_shipping_fee_invented=true`**.
- CoCart `class-cocart-update-cart-controller.php` confirms its `update_cart` invokes the registered callback and accepts its array response before fetching refreshed cart contents, so callback-level replay can run with an empty cart.

## Post-deploy storefront regression

- Browser Playwright: https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42879839001 **SUCCESS** after PHP release.
- Real temporary Woo cart, frontend cart + coupon, checkout COD/form/mobile and history checks; checkout submission was intercepted to ensure **zero real orders and zero payments**. `AQUA_CART_CHECKOUT_CLEANUP=PASS`.
- This is browser and fixture acceptance, **not** an authorized real Woo COD order + stock/email/receipt/customer ownership lifecycle test.

## Additional PHP shipping implementation inspection (2026-11-11, source only)

- Inspected exact PHP production file `wp-content/themes/vibe-code-theme/inc/checkout/checkout_endpoint.php` at `76bfe492e53c30cc3346d3154df4d4a56866d665`.
- Source stores Woo `set_shipping_*` address fields on the order, but its cart-line construction, coupon and total calculation sections have **no `WC_Order_Item_Shipping` creation or selected Woo shipping rate persisted**. This is a confirmed implementation gap, separate from the existing WooCommerce configuration gap.
- Read-only production audit `#42878442799` already found `woocommerce_ship_to_countries=disabled`, default shipping zone with zero methods. Turning on a shipping zone without wiring the **customer-selected applicable Woo rate** to the physical order is NOT by itself sufficient.
- Next independent implementation (only after verifying rate selection contract): use WooCommerce-calculated rates for customer destination; expose available method/rate selection in the existing cart/checkout flow; reject invalid or stale choices server-side; persist the verified native shipping method, title, instance ID, amount and taxes on the order, keeping native coupon/tax totals intact. Cover one/multiple/no applicable rates and idempotent retry with offline PHP fixtures + browser interception. Never invent a flat fee or silently force free shipping. Preserve current production functionality until a verified rollout can be accepted.
- Production real-order QA still needs business-approved shipping policy and an authorized buyer/test order or isolated staging. **No shipping source changes, CMS writes, new orders, builds or deployments performed during this inspection.**

## Boundaries and outstanding acceptance

**DONE:** latest 9 Page Visual Builder source, Save/Restore and production QA (see `2026-11-10-business-pages-visual-builder.md`); COD empty-cart retry fix deployed, source fixture + browser regression PASS.

**PARTIAL:** Business acceptance for real physical orders remains gated by:
1. Shipping policy/charges not configured in WooCommerce; source policy is not authority to invent a shipping rate or activate a method.
2. Approved dedicated test buyer and authorization for a real production order (or isolated staging environment) including Woo records, stock changes and any email notifications. Current QA deliberately creates none.
3. A real COD order's customer ownership, stored line totals, shipping line, stock decrement, notification, receipt and buyer-only order history have not been verified with authorized data; payment gateway transaction testing is not part of COD and OnePay remains hidden.

Next safe action once prerequisites are available: configure actual shipping policy in Woo with owner-approved data and run one authorized COD test order with idempotency token, linked account, receipt and stock/email/clean rollback. **Never silently create an order or fake bank/shipping data.**

Status: PARTIAL — real order/shipping acceptance remains open.

## Continuation — verified 2026-11-11 02:xx (Asia/Ho_Chi_Minh)

- Actual new source since previous checkpoint: Astro master `089d05c6f9d0b49fa67d7801c9c7248edf2568b1` includes live Woo shipping quote proxy, rate choice and SSR ESC labels; PHP master prior `58f8fde2` includes `WC_Order_Item_Shipping` and server-side per-destination rate verification.
- PHP source regression `#42884934241` failed because OFFLINE fixture initialized shipping disabled then asserted an enabled shipping quote. Fixture fixed (enabled quote first, disabled legacy scenario second and fixture counters reset) as PHP commit `436a7ea571ec9db5e23b30e820e2d5248d51241f`. Exact source QA `#42885613310` **SUCCESS**. Astro source QA `#42885078315` **SUCCESS**.
- PHP production release `#42886074121` **SUCCESS**, `checkout_endpoint.php sha256_verified=PASS`, `files_checked=21`, `no_astro_build=PASS`. No real buyer/order records created.
- First Astro production deployment `#42886734754` **SUCCESS** at source `089d05c6`, WordPress build orchestration `#42886550983` **SUCCESS**. This alone does **not** pass buyer checkout QA.
- Critical missing CMS labels surfaced during SSR audit: `readBusinessPageLabels()` strictly requires new 6 keys `shipping_title/shipping_loading/shipping_none/shipping_error/shipping_select/shipping_package`; the installed native `checkout_ui_vi` originally had 59 keys. The existing CMS installer now safely appends ONLY these six if exact 59-row prefix matches, preserves every previous key/label and checks REST readback. Native CMS run `#42887729026` **SUCCESS**: `AQUA_CHECKOUT_SHIPPING_ESC_APPEND_PASS added=6 preserved=59`, checkout rows=65, cart=20, receipt=34. No other CMS writes in this append.
- Initial new Playwright no-real-order run `#42887181154` failed at checkout navigation `net::ERR_HTTP2_PROTOCOL_ERROR` *before* exercising new shipping quote, consistent with missing required runtime ESC labels; this is a test failure and must not be called QA PASS. Its temporary Woo cart cleanup passed.
- A new source-pinned WordPress production build `#42888057217` has been requested **after** the native CMS label append; at this checkpoint it is in progress. Verify downstream signed Astro deployment and exact source marker before rerunning buyer browser QA.
- The existing no-order Playwright script now validates live `/api/cart/shipping-quote` response and selected Woo rate IDs; it intercepts **all** order submission POSTs. Re-trigger only after the CMS-label rebuild is DEPLOY_READY; inspect logs and cleanup.
- The WooCommerce production shipping policy is still disabled by latest read-only audit `#42878442799`; neither new code nor CMS label append enables methods or invents fees. A real COD order/stock/mail lifecycle acceptance still requires owner-approved shipping policy and explicitly authorized test buyer/order or isolated staging.

Next action: verify #42888057217 and downstream production deploy result/source marker; trigger `qa-requests/aqua-checkout-browser-no-order.json` and inspect result. If browser QA fails, read the failed step and fix, not declare DONE. Retain safety boundary: no real COD orders or shipping policy change without owner approval.
