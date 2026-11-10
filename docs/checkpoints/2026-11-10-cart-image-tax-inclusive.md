# Checkpoint — Aqua giỏ hàng có ảnh, giá đã gồm thuế (10/11/2026)

## Kết quả nhiệm vụ

Người dùng báo production `/cart` hiển thị Combo bể Cubic 40 không có ảnh, đơn giá/thành tiền 0đ, tổng cộng có VAT cộng thêm (2.821.500đ) dù giá sản phẩm đã gồm VAT.

**Đã sửa, triển khai và nghiệm thu trên production.**

- Source Astro `ngocnhanvo/aquathanhxuan-astro/master` commit `06d58e417dfbd62cbc471755a58c08e58428cfb6` (5 file).
- `cartToProducts` lấy ảnh từ CoCart `featured_image`, tên từ Woo và fallback giá từ line subtotal + VAT. `GET /api/cart` trả thêm `products` giàu metadata đã map vào CMS products cache; dữ liệu CoCart raw giữ nguyên để phục vụ checkout.
- `CartPage` tự refresh từ Woo khi mở `/cart` trực tiếp không có query cart_key (khôi phục từ localStorage) và sau thao tác cập nhật/xóa; hiển thị ảnh + đơn giá + thành tiền, tổng đơn giá gộp VAT, không hiện dòng +VAT.
- `InfoForm` checkout dùng cùng display VAT-inclusive, không có phụ phí VAT. `productCardCart` và Store giữ các trường `subtotal_tax`, `discount_tax`.
- WooCommerce settings đã được thay đổi bằng Playwright REST admin có phân quyền, chỉ 3 option: `woocommerce_prices_include_tax=yes`, `woocommerce_tax_display_shop=incl`, `woocommerce_tax_display_cart=incl`. **Không tắt tính thuế kế toán.**
- Coupon vẫn là Woo native `aqua-auto-5`, percent=5, min=200000, không hard-code discount phía Astro.

## Bằng chứng

| Giai đoạn | Kết quả | Workflow |
|---|---|---|
| Woo CMS settings + temporary cart QA | PASS; written only 3 options; cleanup PASS | [42814147919](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42814147919) |
| Astro source compiler + security/Vitest regression | PASS | [42814401425](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42814401425) |
| WordPress production build trigger and tracking | completed/success | [42814543204](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42814543204) |
| Official Astro production deploy | completed/success | [42814669203](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42814669203) |
| Production Playwright cart+checkout+mobile (no order) | PASS; cleanup PASS | [42814974242](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42814974242) |
| Added direct `/cart` without query param regression | PASS; cleanup PASS; no orders | [42815362692](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42815362692) |

Actual Woo anonymous cart test, product 82477:
- Subtotal inclusive VAT: 2,700,000 VND
- Coupon: aqua-auto-5, discount inclusive VAT: 135,000 VND
- Total paid: **2,565,000 VND**; shipping 0; no separate tax surcharge.
- Woo reporting still carries subtotalTax 245455 and totalTax 233182 internally; these are not paid twice.
- Playwright real product image loads from `/wp-content/uploads/2026/11/Thiet-ke-chua-co-ten.png`; unit price and line price both 2,700,000đ.
- Cart `/cart?cart_key=...` PASS, direct `/cart` with browser persisted state PASS, checkout image and total PASS.
- Payment gateway selection + account checkbox tests intercept `POST /api/cart/checkout` before WordPress: **0 orders, 0 payment attempts**. Disposable CoCart item cleaned.

## Outstanding unrelated to this cart presentation fix

Earlier checkout work still has shipping policy/fee configuration, validated BACS recipient and OnePay sandbox/payment completion and receipts tests outstanding. Do not create live orders or bypass payment gateway verification to claim E2E completion.

## Future guidance

- Woo pricing and VAT are authoritative; do not remove Woo tax accounting lines or fake totals on frontend. The Astro UI uses inclusive totals from Woo. Do not hard-code promotion conditions.
- Maintain direct `/cart` persisted-state QA to prevent regression.
- Do not rerun successful build or CMS jobs unless a new source/settings change warrants it.
