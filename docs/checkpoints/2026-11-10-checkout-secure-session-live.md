# Aqua Thanh Xuân — cart → checkout → order history / session integrity (10/11/2026)

## Source/production identity (verified)

- Astro production source: `ngocnhanvo/aquathanhxuan-astro/master` **`c3d5714f9ec37e1f1d030524abc852be95cdfb0b`**.
- PHP production source (last deployed for checkout): `ngocnhanvo/aquathanhxuan-php/master` **`6374593a847f2826844413a6719825478bc49992`**.
- Knowledge `ngocnhanvo/knowledge/main`: `608788447a13486dbe1087a173aece9a93fc8a66`.
- WordPress backend: `https://admin.aquathanhxuan.io.vn`; public Astro: `https://aquathanhxuan.io.vn`.
- Sources are **not** equivalent to deployment; actual [WordPress production trigger run #42799397565](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42799397565) **success**, verified `BUILD_SUCCESS=PASS`, `DEPLOY_READY=PASS commit=c3d5714f...`. Downstream [Astro deploy #42799520104](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42799520104) **success**.

## Completed and independently verified

1. Anonymous real Woo cart add/read/sync, real WordPress coupon `aqua-auto-5` discount 5% from 200k; demonstrated via prior [cart+coupon QA #42777458941](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42777458941), no order.
2. WordPress Pages with real ACF SSR actions:
   - cart #83808 / `ssr-cart/CartPage`;
   - checkout #83810 / `ssr-checkout/CheckoutPage`;
   - order-received #83812 / `ssr-checkoutdone/CheckoutDonePage`;
   - order history #83821 / `ssr-order-history/OrderHistoryPage`.
   - Native WP Rewrite for history #83823 to `/ssr/cart/lich-su-mua-hang`. WordPress Page creation [#42796129841](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42796129841).
   - Astro incremental Page cache detects new SSR Pages independently of logs; CMS Page data and public routes live.
3. WordPress Woo `woocommerce_cart_page_id=83808`, `woocommerce_checkout_page_id=83810`, native shortcode Pages support native OnePay backend callback, [#42788844918](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42788844918). No test order created.
4. PHP checkout validates stock and enabled gateway before order/customer creation; BACS requires real WP bank recipients; idempotency lock prevents duplicate Woo order and replayed gateway payment processing; coupon line, billing, customer and gateway validated by in-memory fixture. Signed OnePay HMAC/order ID/amount callback guard, paid-only Astro order-received return and account URL fix deployed by PHP #42790542372, #42794084796 and #42795198155. Source contracts [#42794755129](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42794755129) PASS for guest, create-account and logged-in customer fixture.
5. Astro customer session previously accepted editable unsigned JSON cookie. Fixed: `src/lib/utils/signedSession.ts` HMAC-signed, expiring cookie derived from existing **server-only** Woo secret using domain-separated HMAC; legacy unsigned cookies rejected, spoofed ID denied; `src/lib/utils/user.ts` verifies signature; `src/pages/api/user/login.ts` issues signed cookie after actual WP login; `src/pages/api/user/order.ts` queries by strictly verified numeric customer ID, post-filters Woo order `customer_id`, never falls back to searching email; HTTP `Cache-Control: no-store`. Existing unsigned user sessions must log in again.
6. XSS escaping applied to dynamic OrderHistoryPage HTML rendering.
7. Previous failed build #42798682090: `src/pages/api/user/order.test.ts` was mistakenly exposed as an Astro route. Moved test to `src/lib/utils/orderHistoryApi.test.ts` and updated source QA to fail when any `*.test.*`/`*.spec.*` appears under `src/pages`. Regression [#42799262653](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42799262653) **PASS 15/15 tests, route-test-files NONE**.
8. Production read-only route/security [#42799975264](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42799975264) PASS: 3 WP Page cache exports, cart/checkout/order-received public and internal SSR routes HTTP 200; `/lich-su-mua-hang` HTTP 200 and real CMS key/action; `/api/user/order` anonymous HTTP 401; forged unsigned JSON cookie with synthetic customer ID HTTP 401; current selectable Woo method **onepayus** only, BACS disabled for incomplete WP bank configuration.
9. Production Playwright browser [#42800019442](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42800019442) PASS: add product #82477 to temporary anonymous cart, cart page and checkout page HTTP 200, OnePay from WP method list, blocked submit without terms, address and guest form, intercepted `POST /api/cart/checkout` twice (same idempotency token), intercepted create-account form data, mobile checkout 390px not clipped; `/lich-su-mua-hang` guest login form visible, order API 401; temporary cart cleanup PASS. **Created orders: 0, created accounts: 0, no payment attempts**.

## Outstanding end-to-end gates — NOT DONE

- WooCommerce shipping has been observed **disabled**. Physical product shipping charges, rates and Woo shipping order lines have not been configured/validated; must use owner's actual shipping policy and WooCommerce data, never invent charges.
- WordPress BACS enabled but **no BACS bank recipient configured**, so the Aqua frontend deliberately hides BACS; cannot assume any bank identity and must not copy from ESC.
- OnePay configuration is present and directs to HTTPS `onepay.vn`, but **actual bank/gateway sandbox transaction, paid status callback, stock, customer notifications, receipt, refunds/error paths have NOT been E2E tested with live/sandbox payment**. Read-only and in-memory tests are not substitute for gateway acceptance.
- Valid WordPress customer login with a **real authorized test customer** and an actual WooCommerce order remains to be end-to-end verified; production QA deliberately does not create or reveal other people's orders/accounts.
- Signed session migration intentionally forces existing unsigned sessions to log in again.

## Next safe sequence

1. Check available WooCommerce shipping zones/methods and the store's approved actual shipping policy; configure rates only if authorized and grounded.
2. Configure BACS only after owner supplies/manages the actual bank account in WordPress, then Woo-based BACS filter automatically enables it.
3. Use the approved OnePay sandbox/test environment (not live customer payment) and a dedicated authorized QA buyer to verify order creation exactly once, HMAC callback, confirmed order paid, stock behavior, order email, signed login, buyer-only order history and receipts; cleanup test records by explicit QA marker.
4. Re-run existing Actions source and browser QA after any subsequent code/CMS change. Never claim full E2E DONE until real payment flow and shipping are accepted.

**Overall project status: PARTIAL — chưa hoàn tất**, despite the successfully deployed UI, HMAC auth and no-order QA. See earlier checkpoint `docs/checkpoints/2026-11-10-cart-to-checkout-audit.md`.

Chế độ code: auto-build
Cổng ghi source: bypass
Trạng thái: PARTIAL — chưa hoàn tất
