# Aqua Thanh Xuân — MF5 WooCommerce auto coupon repair (2026-11-11)

## Incident and live evidence
- Owner edited coupon `MF5` at `/wp-admin/post.php?post=83818&action=edit`; cart showed 259.000đ subtotal without discount.
- Production WooCommerce read-only audit [#42895498607](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42895498607) PASS: published native coupon ID `83818`, code `mf5`, type `percent`, amount `5.00`, minimum `200001.00`, `individual_use=false`. Only one published Woo coupon; old `aqua-auto-5` absent.
- Root cause: PHP MU plugin `esc-aqua-cart-promotion.php` resolved fixed legacy code `aqua-auto-5`, not the current native coupon `MF5`.

## Repair and verification
- PHP master `67fd85976a25f3bffdbe002355fc0f3fbadb7472`: MU plugin resolves Woo coupon by stable ID (default `83818`) via `get_option('esc_aqua_auto_coupon_id', 83818)`, preserving future coupon-code renames; adds a select in WooCommerce → Settings → General to change or disable the selected automatic coupon. Discount percentage, minimum, expiry and exclusions remain exclusively Woo-managed; no virtual coupon, no hardcoded commercial rules.
- Source unit tests `tests/aqua-auto-cart-promotion.test.php` updated for strict 200.001đ threshold, stable coupon ID, code rename, no-coupon setting and manual coupons.
- PHP source QA [#42896508408](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42896508408) PASS; PHP release [#42896710974](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42896710974) PASS, including guarded FTPS source upload and marker probe. No Astro build.
- Production disposable cart QA [#42896967197](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42896967197) PASS: Woo returned `coupons=["mf5"]`, subtotal `2700000`, discount `135000`, total `2565000`. Cleanup PASS. No order created.
- QA script now asserts a single actual Woo coupon without depending on legacy string `aqua-auto-5`.

## User operation
- Change commercial promotion at WordPress Marketing → Coupons → MF5.
- Change selected automatic coupon (or disable auto-apply) at WooCommerce → Settings → General → "Khuyến mãi tự động (Aqua Thanh Xuân)" → "Coupon tự áp dụng".
- Current 259.000đ cart would be 246.050đ after 5% discount, before any delivery charge.

## Related, still separate
- Prior COD shipping-rate policy remains unconfigured; do not treat coupon fix as approval to enable shipping or place a real order.

Chế độ code: auto-build
Cổng ghi source: bypass
Trạng thái: DONE — hoàn tất
