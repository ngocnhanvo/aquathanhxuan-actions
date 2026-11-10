# Aqua Thanh Xuân — coupon MF5 đã khôi phục auto-apply trên production (2026-11-11)

## Kết quả nhiệm vụ hiện tại
- Xác định root cause: PHP MU plugin trước đó auto-apply mã cũ `aqua-auto-5`, trong khi coupon đang được quản lý trên WooCommerce là `MF5` (ID 83818).
- Woo read-only audit run [#42895498607](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42895498607) PASS: coupon `mf5` published, percent `5.00`, minimum `200001.00`, không có `aqua-auto-5` đang publish.
- PHP master `67fd85976a25f3bffdbe002355fc0f3fbadb7472`: sửa `esc-aqua-cart-promotion.php` lấy coupon theo Woo ID ổn định; thêm dropdown `WooCommerce > Cài đặt > Chung > Khuyến mãi tự động (Aqua Thanh Xuân) > Coupon tự áp dụng` để chọn mã khác/disable từ WordPress. Vẫn dùng WooCommerce native validation, không hard-code mức giảm hoặc minimum.
- Source QA [#42896508408](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42896508408) PASS; PHP production release [#42896710974](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42896710974) PASS. Không chạy build Astro.
- Live disposable cart QA [#42896967197](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42896967197) PASS: `mf5`, subtotal 2.700.000đ, giảm 135.000đ, còn 2.565.000đ; cleanup PASS, không đặt đơn thật.
- Với giỏ 259.000đ trong ảnh của chủ dự án, số tiền dự kiến sau giảm 5% là 246.050đ (trước phí vận chuyển).
- QA source đã bỏ điều kiện kiểm tra mã hard-code `aqua-auto-5`, giữ kiểm tra đúng một coupon tự động và Woo discount.
- Checkpoint: `docs/checkpoints/2026-11-11-mf5-coupon-auto-apply.md` (Actions main commit `1076a154aca247f063bc534870d7756ad7b01e0c`).

## Phạm vi ngoài nhiệm vụ vẫn dang dở
- Luồng vận chuyển COD của checkpoint trước vẫn chờ chủ dự án cung cấp chính sách shipping thật; chưa bật shipping hoặc tạo đơn production thử. Không tự thay đổi chính sách giao hàng.

Chế độ code: auto-build
Cổng ghi source: bypass
Trạng thái: DONE — hoàn tất
