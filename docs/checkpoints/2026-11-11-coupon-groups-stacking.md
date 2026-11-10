# Aqua Thanh Xuân — WordPress-managed coupon groups & stacking (2026-11-11)

## Delivered
- WordPress/PHP master `0f2ef126deb7ecdbb090cd086a4482652a560e5c`: `wp-content/mu-plugins/esc-aqua-cart-promotion.php` now implements taxonomy `esc_coupon_group` and per-coupon `_esc_aqua_stack_mode` options:
  - `none`: no other coupons
  - `cross_group`: one per group; can combine with other groups
  - `all`: can combine even within same group if both coupons allow it
- All discounts, minimum/maximum spend, expiry, sale exclusion, usage restrictions and Woo `individual_use` remain governed by native WooCommerce coupons. Auto-apply is selected using the **existing** Auto Coupons for WooCommerce checkbox `_wc_auto_apply=yes`. No coupon ID/discount tier/season is hard-coded in PHP. Group CRUD is via WooCommerce → Nhóm khuyến mãi (WordPress taxonomy), rule selection is in each Marketing → Coupons editor.
- Selector runs at `woocommerce_before_calculate_totals`, based on Woo `WC_Discounts` validation. It chooses highest minimum spend in conflicting groups, with a stable secondary sort, and preserves other eligible groups. No nested recalculation, virtual coupons or double discount.
- WooCommerce/PHP source QA [run #42902072754](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42902072754) PASS: strict min boundaries, same-group MF5/MF10 exclusive selection, cross-group Tet, explicit no-stack and individual use, expired/sale/manual cases, coupon rename, nonce-protected admin save; CoCart sync regression PASS.
- PHP production release [run #42902204133](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42902204133) PASS FTPS/readback; **no Astro build**.
- WordPress CMS configuration [run #42902485026](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42902485026) PASS:
  - Created group `Giá trị đơn hàng` (term ID 1863, slug `gia-tri-don-hang`)
  - Created group `Tết` (term ID 1864, slug `khuyen-mai-tet`)
  - Assigned published coupon `MF5` (ID 83818, percent 5, minimum 200001) and `MF10` (ID 83865, percent 10, minimum 1000001) to `Giá trị đơn hàng`, mode `cross_group`, existing `Auto Apply` on
  - Did **not** create hypothetical Tet coupons; WordPress owner can attach genuine coupon to `Tết`.
- Idempotent CMS QA [run #42903287258](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42903287258) PASS: WordPress group admin form accessible; `changed=0`, `skipped_unchanged=6`, `orders_created=0`.
- Live large-cart QA [run #42902782677](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42902782677) PASS: 2.700.000đ Woo cart returned only `mf10` discount 270.000đ, total 2.430.000đ, cleaned.
- Live exact tier QA [run #42903329493](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42903329493) PASS using existing published Dennerle 4L product ID 82481:
  - qty 1, subtotal 259.000đ, only `mf5`, discount 12.950đ, total 246.050đ
  - qty 5, subtotal 1.295.000đ, only `mf10`, discount 129.500đ, total 1.165.500đ
  - Both disposable carts cleaned; `orders_created=0`, `cleanup_remaining=0`, `temporary_created=0`.

## How the merchant manages campaigns
1. Open `/wp-admin/edit-tags.php?taxonomy=esc_coupon_group&post_type=shop_coupon` to add/rename coupon groups (e.g. Tết, VIP).
2. Open `Marketing → Coupons`, create/edit a **real** WooCommerce coupon, set native minimum/maximum, percentage/fixed discount, expiry and Woo restrictions.
3. Under `Quy tắc kết hợp khuyến mãi` select group and `Không cộng dồn`, `Chỉ nhóm khác` or `Cộng dồn với mọi mã`. Enable `Auto Coupons → Auto Apply` if it should be added automatically.
4. For Tet stacking with price tiers choose group `Tết` + mode `cross_group` or `all`; do not enable native `Individual use only`.

## Boundaries
- No live Tet coupon currently configured; only group and generic rules are ready. A future Tet campaign is created by the merchant in WordPress.
- Previous separate shipping COD policy is still awaiting actual shipping-zone business rules, not part of this task.

Chế độ code: auto-build
Cổng ghi source: bypass
Trạng thái: DONE — hoàn tất
