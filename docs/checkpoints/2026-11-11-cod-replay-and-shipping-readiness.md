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
