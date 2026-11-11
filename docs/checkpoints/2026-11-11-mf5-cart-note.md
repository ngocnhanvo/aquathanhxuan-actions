# Aqua Thanh Xuân — Display WooCommerce coupon description in cart (2026-11-11)

## Scope
- Owner asked to show MF5 note in cart summary; MF10 was temporarily deleted by owner. Never recreate MF10 or change tiers.
- WordPress MF5 coupon is ID 83818. Its previous WooCommerce description was malformed: "Giảm 5% với đơn hàng trên 200.000 nghìn".

## Source & behavior
- Astro master `75ebf52676494f2e06de5f8f303a32c95af2be43`.
- Added `src/lib/wordpress/cartCouponNotes.ts`: fetch descriptions of *applied coupons only* using existing server-side WooCommerce REST credentials, never return credentials; no-cache, timeout, fail-soft if unavailable. No hard-coded coupon or marketing terms.
- `src/pages/api/cart/index.ts`: add separate `couponNotes` display model without mutating native CoCart pricing.
- `src/astro/pages/CartPage.astro`: persist latest notes on cart refresh, escape and render note below coupon badge. Other cart/checkout behavior unchanged.
- `src/lib/wordpress/cartCouponNotes.test.ts`: validates code filtering, exact match, HTML stripping, no MF10 fetch, safe fallback.
- Source QA [#42927646723](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42927646723) PASS: Astro compiler, Vitest 31/31.

## WordPress data edit (minimal scope)
- MF5 description corrected to "Giảm 5% cho đơn hàng trên 200.000đ" via scoped CMS workflow [#42927997388](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42927997388), changed=1, other fields unchanged: percent 5, minimum 200001.
- Read-only check MF10: no published coupon (`published_count=0`); no MF10 creation/deletion/update, action READ_ONLY_NO_RECREATE.

## Production
- Existing WordPress production build request [#42928271426](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42928271426) PASS.
- Existing Astro deployment pipeline [#42928382632](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42928382632) PASS.
- Live end-to-end anonymous cart QA [#42928683329](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42928683329) PASS:
  - existing 259000 VND product added to disposable cart; only coupon MF5 applied
  - `/api/cart` returns `couponNotes.mf5="Giảm 5% cho đơn hàng trên 200.000đ"`
  - discount 12,950 VND on subtotal 259,000 VND
  - note visible under MF5 in cart on desktop and mobile; MF10 absent
  - checkout/order creation not invoked; no test orders; cart cleanup PASS, no residue.

## Merchant use
- To update a coupon note, open WooCommerce Marketing → Coupons, edit the coupon's native Description field. Cart refresh pulls new text dynamically; future wording edits require no Astro rebuild.
- MF10 remains not published as of this QA. Do not rerun previously scoped `aqua-coupon-groups-setup` and `aqua-coupon-tier-live-qa` workflows, which assumed MF10 was present.

Chế độ code: auto-build
Cổng ghi source: bypass
Trạng thái: DONE — hoàn tất
