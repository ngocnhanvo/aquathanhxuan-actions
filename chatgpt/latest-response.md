# Aqua Thanh Xuân — MF5 coupon note in cart (2026-11-11)

## Completed
- Owner requested a note under MF5 in cart; MF10 has been temporarily deleted and must **not** be recreated.
- WordPress native MF5 coupon ID 83818 description now reads `Giảm 5% cho đơn hàng trên 200.000đ`, corrected from `Giảm 5% với đơn hàng trên 200.000 nghìn`. CMS writer [#42927997388](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42927997388) PASS, updated only coupon description, 5% and minimum 200001 unchanged, MF10 published_count 0 (READ_ONLY_NO_RECREATE).
- Astro master `75ebf52676494f2e06de5f8f303a32c95af2be43`: `cartCouponNotes.ts` retrieves applied coupon descriptions via server-side WooCommerce REST with no-store and credentials confined to backend. `/api/cart` returns separate `couponNotes`; CartPage renders escaped note beneath code label, preserves CoCart totals and dynamics.
- Source QA [#42927646723](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42927646723) PASS 31/31 Vitest, Astro compile.
- WordPress production trigger [#42928271426](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42928271426) PASS; Astro deploy [#42928382632](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42928382632) PASS.
- Production disposable-cart/browser QA [#42928683329](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42928683329) PASS. MF5 only, subtotal 259000, discount 12950, note visible on desktop/mobile, MF10 absent; cleanup PASS, orders_created=0, cleanup_remaining=0.
- Checkpoint `docs/checkpoints/2026-11-11-mf5-cart-note.md` (Actions main commit `851e2abba3a816232409af66a0d1d4703f86f9c2`).

## Merchant management
WordPress Marketing → Coupons → MF5 (ID 83818) → Mô tả (Description). Further description edits flow to cart dynamically on refresh; no source edit/build required. Avoid running prior MF10 group setup scripts while MF10 is deleted.

Chế độ code: auto-build
Cổng ghi source: bypass
Trạng thái: DONE — hoàn tất
