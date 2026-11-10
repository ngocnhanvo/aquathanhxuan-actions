# Checkpoint — WooCommerce coupon thật, 10/11/2026

## Trạng thái xác minh

- **DONE**: Quy tắc chung mọi dự án WooCommerce được đưa vào `ngocnhanvo/knowledge` `main`, file `stacks/woocommerce-coupon-promotions.md`, và liên kết từ README/AGENTS. Knowledge commit mới nhất của chuỗi: `608788447a13486dbe1087a173aece9a93fc8a66`.
- **DONE**: Coupon thật trên `admin.aquathanhxuan.io.vn`, ID `83818`, code `aqua-auto-5`, trạng thái `publish`, `percent=5`, `minimum_amount=200000.00`, `exclude_sale_items=false`. Created once then verified with no-op REUSE: [coupon run #42775054145](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42775054145). WooCommerce setting `woocommerce_enable_coupons=yes` verified [audit #42776912852](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42776912852).
- **DONE**: WordPress/PHP master `bbeae23d8169a8177ab9719eda4cf6040f9d1b8a`. MU auto coupon bridge uses persisted `WC_Coupon` and native `WC_Discounts`; no hardcoded rate/threshold or virtual coupon filter. Pre-calculation validator uses detached Woo items because `WC_Cart::get_displayed_subtotal()` is zero immediately after `reset_totals()`. CoCart `sync-coupons-db` preserves preexisting native/manual coupons and no longer checks zero discount before totals recalc. Unit contracts PHP PASS.
- **DONE**: Production PHP FTPS deployment [#42777270521](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42777270521), verified protected upload. No Astro build from PHP upload.
- **DONE**: Astro source master `0ac8af50be65a4ead280d2368bd69195c27bcc01` deployed through WordPress-triggered production workflow [trigger #42775519145](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42775519145) → [deploy #42775644106](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42775644106). Marker `DEPLOY_READY=PASS` for exact SHA and header QA PASS.
- **DONE**: Actual anonymous CoCart cart [QA #42777458941](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42777458941), no orders: Product 82477, subtotal 2,700,000 VND, native coupon `aqua-auto-5`, discount 135,000 VND exactly 5% both after add and after sync, `AQUA_CART_PROMOTION_PASS`, `AQUA_CART_CLEANUP=PASS`. Woo total includes tax and other Woo calculations; amount paid is not equal to subtotal-discount alone.
- **DONE**: Offline boundary contract tests at <200,000 and exactly 200,000 (inclusive), and configuration change scenarios, preserving manual coupon, expiry, sale/individual and deleted native record.

## Timeline / root cause

1. Initial real cart QA #42771889672 failed because deployed Astro sent CoCart ID as integer; Astro 0ac8af5 fixed string ID and production build deployed it.
2. QA #42775975583 and #42776753563 failed because CoCart reset the applied coupons in sync-coupons-db before native calculation.
3. After CoCart preserve fix, QA #42776962551 still showed 0 coupon even directly after add. Reading Woo core revealed `WC_Discounts($cart)` in `woocommerce_before_calculate_totals` evaluates minimum against cart subtotal not yet calculated (0). Repaired by native `set_items` with current server-owned prices.
4. QA #42777458941 PASS and disposable session cleaned. No order placement was performed.

## Guardrails

- Do not restore virtual coupons or hardcode rate/minimum in PHP/Astro. Marketing changes happen through WP WooCommerce Coupons and should work without rebuilding Astro.
- Do not rerun passed build, PHP deploy, or anonymous cart QA without a new change.
- Separate the current user request (coupon management) from prior unfinished buyer checkout/order work: no real order has been placed by this migration.

## Final status

`CODE_READY` / `CMS_COUPON_PERSISTED` / `PHP_DEPLOYED` / `ASTRO_DEPLOYED` / `ANONYMOUS_CART_PROMOTION_QA_PASS` / `CLEANUP_PASS`.
