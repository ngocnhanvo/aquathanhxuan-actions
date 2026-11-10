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

## Tiếp tục: REST đăng nhập WooCommerce thực tế (10/11/2026)

- Bài thử E2E bằng một khách QA WordPress tạm, [run #42802133987](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42802133987), tạo khách thành công nhưng `POST /api/user/login` trả HTTP 400; **cleanup PASS** và không có đơn.
- Read-only WP audit [#42802710205](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42802710205) xác nhận route `/custom/v1/login` **chưa đăng ký** trong WordPress, trong khi `/custom/v1/lost-password` và `/custom/v1/reset-password` tồn tại. Đây là nguyên nhân thật, không phải sai mật khẩu. Audit cùng lúc xác nhận `woocommerce_ship_to_countries=disabled`, không có shipping zone/method; BACS bank account count 0; OnePay enabled host `onepay.vn`, đủ các trường merchant credentials (chỉ metadata, không log secret).
- PHP `ngocnhanvo/aquathanhxuan-php/master` source mới **`e8dd6954e5b69b84cc25d2ebb31d66168847e8f8`**: tạo `wp-content/themes/vibe-code-theme/inc/user/login.php` auto-loaded bởi theme `functions.php` `inc/user/*.php`, đăng ký public `POST /wp-json/custom/v1/login` trả đúng `success/user_id/display_name/user_email/billing`, xác thực bằng `wp_authenticate`, lỗi mật khẩu không tiết lộ ID/email, không phát hành WordPress cookie. Test `tests/aqua-customer-login-contract.test.php` trong [PHP source QA #42803470553](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42803470553) **PASS** cùng checkout regression.
- [PHP release #42803579093](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42803579093): **SUCCESS**, deployment path `wp-content/themes/vibe-code-theme/inc/user/login.php` `sha256_verified=PASS`, `completed=PASS files_checked=20`. No new Astro build needed.
- [Live temporary buyer customer/session QA #42803822254](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42803822254): **SUCCESS**. Bằng chứng thực: WordPress REST login POST registered; tạo duy nhất một Woo QA user tổng hợp; `/api/user/login` trả 200; trình duyệt nhận session `v1...` HMAC HttpOnly/Secure/SameSite=Lax; `/api/user/info` khớp đúng WP customer ID; `/api/user/order` 200 và danh sách trống, no-store; giả cookie unsigned và HMAC bị sửa đều bị 401; logout xóa phiên, sau logout order API 401. **Xóa user QA thành công `AQUA_CUSTOMER_CLEANUP=PASS`, 0 orders/0 payments**. Không xuất mật khẩu, email hoặc cookie vào artifact/log.
- Chính sách giao hàng công khai trên nguồn `https://aquathanhxuan.com/huong-dan-mua-hang-o-xa/` ghi cửa hàng phải xác nhận tình trạng hàng, phí vận chuyển và tổng tiền **trước khi khách chuyển khoản**. Đây là bằng chứng không nên gán bừa mức phí, không nên giả định sản phẩm vật lý thanh toán online đã bao gồm ship. Trang nguồn có thông tin tài khoản ngân hàng **chưa được chủ sở hữu xác minh là còn sử dụng**: **không tự chuyển vào WooCommerce BACS**.
- Đã thêm `scripts/aqua-customer-session-live-qa.cjs`, workflow `aqua-customer-session-live-qa.yml` và request `qa-requests/aqua-customer-session-live.json`: kiểm tra quyền thực tế, có gate xác minh REST route trước tạo dữ liệu và cleanup `finally` chặn sót record.

**Vẫn chưa hoàn tất giao hàng/thu tiền OnePay:** chưa có chính sách cước vận chuyển nào được cấu hình trong WooCommerce, BACS chưa có tài khoản được xác minh, và không có môi trường giao dịch sandbox OnePay phù hợp để thực hiện một payment/stock/email real E2E. Không tự mở gateway/thu tiền khi tổng phí chưa được chủ shop xác nhận.

**Overall project status: PARTIAL — chưa hoàn tất**, despite the successfully deployed UI, HMAC auth and no-order QA. See earlier checkpoint `docs/checkpoints/2026-11-10-cart-to-checkout-audit.md`.

## Tiếp tục: liên kết đơn Woo với khách Astro đã đăng nhập (10/11/2026)

- Nguyên nhân phát hiện: `/api/cart/checkout` từ Astro đẩy sang CoCart bằng server-to-server, không mang WordPress browser auth; PHP `Checkout_Callback` chỉ nhận customer ID khi `is_user_logged_in()`. Kết quả có thể là `customer_id=0` cho buyer đã đăng nhập Astro HMAC; `/api/user/order` theo customer ID sẽ không thấy đơn. Đây là **rủi ro xác định bằng đối chiếu source**, chưa có sản phẩm thử tạo đơn thật để xác nhận hành vi production.
- Astro `master` commit **`2c1891795dda2b85af0903f19e4dc98b625c3950`**: tạo `src/lib/utils/linkWooOrderCustomer.ts`; sau khi CoCart xác nhận Woo order ID/key, server đọc ID khách từ session HMAC đã xác thực, GET order qua Woo REST, kiểm tra `order_key` và `customer_id` trước khi PUT `customer_id` nếu đơn guest. Từ chối giành đơn đang thuộc user khác; không nhận customer ID do client khai báo; read-after-write và retry idempotent. Logged-in buyer không được đồng thời yêu cầu `create_account`. Guest checkout và coupon không đổi.
- Added `src/lib/utils/linkWooOrderCustomer.test.ts` (7 fixture cases, no orders). [Source QA #42806360718](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42806360718) **SUCCESS**, Astro compiler PASS, **22/22 tests PASS**, không chứa `*.test.*` trong Astro route.
- [WordPress production build #42806552098](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42806552098) **SUCCESS**: `BUILD_SUCCESS=PASS`, `DEPLOY_READY=PASS commit=2c189179...`, header QA PASS. Downstream [Astro deploy #42806700958](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42806700958) **SUCCESS**, actual source SHA matched and signed FTP staging activation/rollback contract passed.
- [Live route QA #42807110476](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42807110476) **SUCCESS**: 4 CMS SSR pages/routes `/cart`, `/checkout`, `/order-received`, `/lich-su-mua-hang` HTTP 200, anonymous and forged unsigned sessions `/api/user/order` HTTP 401; live Woo gateway `onepayus`; 0 created orders/cart items.
- [Live browser Playwright #42807128609](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42807128609) **SUCCESS**: real Woo cart/checkout, idempotency request token, frontend validation and account-create form intercepted, OnePay only, mobile width 390px pass. `created_orders=0`, `created_accounts=0`, `AQUA_CART_CHECKOUT_CLEANUP=PASS`.
- **Chưa E2E verified:** signed user + real newly created Woo order ownership (new code covered by fixture tests only); actual shipping rates/lines (Woo shipping disabled), BACS verified account (count zero), OnePay approved sandbox transaction and paid callback, stock/email/receipt, refunds. Không tạo đơn/thu tiền thật trong production để thử.
- **Next:** owner-confirmed shipping policy and Woo configuration; only use BACS with verified WP bank recipients; use approved OnePay test merchant/sandbox and authorized dedicated buyer for true order→payment→stock/email→private history/receipt QA. Until then do not report full checkout E2E DONE. No source change planned without new grounded business info.

Chế độ code: auto-build
Cổng ghi source: bypass
Trạng thái: PARTIAL — chưa hoàn tất
