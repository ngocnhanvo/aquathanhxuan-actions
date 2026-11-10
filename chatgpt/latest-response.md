# Aqua Thanh Xuân — continuation from previous conversation (2026-11-11)

Đã kiểm tra Knowledge, Astro/PHP master, Actions main, commit, workflow log và checkpoint, rồi tiếp tục công việc dở liên quan COD checkout và vận chuyển WooCommerce. Không lặp lại phạm vi 9 trang Visual Builder đã hoàn tất từ phiên trước.

## Đã hoàn thành và xác minh
- PHP master: `436a7ea571ec9db5e23b30e820e2d5248d51241f`. Sửa phase bật/tắt trong fixture kiểm thử báo giá vận chuyển, source QA [#42885613310](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42885613310) PASS. PHP production [#42886074121](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42886074121) PASS; `checkout_endpoint.php` được SHA-256 verified, không tự chạy build Astro.
- Astro master: `089d05c6f9d0b49fa67d7801c9c7248edf2568b1`. Woo shipping quote và phương thức vận chuyển từ Woo; source QA [#42885078315](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42885078315) PASS. Source build sau CMS label [#42888057217](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42888057217), signed deployment [#42888200487](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42888200487) PASS.
- Bổ sung sáu nhãn giao diện thật `shipping_title`, `shipping_loading`, `shipping_none`, `shipping_error`, `shipping_select`, `shipping_package` vào bảng native ESC `checkout_ui_vi`: 59 → 65 rows; giữ nguyên 59 nhãn gốc, REST readback PASS; CMS run [#42887729026](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42887729026).
- Safe buyer browser regression [#42888566052](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42888566052) PASS: cart, checkout HTTP 200; ảnh, giá đã gồm VAT và coupon Woo 5%; COD-only; actual Woo shipping quote trả `enabled=false, required=false, packages=[]`; retry idempotency; mobile; guest history protected. Toàn bộ POST tạo order bị Playwright intercept, `created_orders=0`, test cart cleanup PASS.
- Nine business/support Pages Visual Builder read-only regression [#42889046860](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42889046860) PASS: 9/9 Pages, các Preview states; 65/65 Checkout label options, chọn được physical row 64; row 58 draft/revert; không cho sửa `key`, không save dữ liệu thực.
- Checkpoint cập nhật trong `docs/checkpoints/2026-11-11-cod-replay-and-shipping-readiness.md` (Actions main commit `4038ae96723b71b223cf60f382b948225cc83e4f`).

## Phần còn dở
WooCommerce production vẫn tắt vận chuyển (`woocommerce_ship_to_countries=disabled`), chưa có bảng cước và shipping zones được chủ cửa hàng chốt. Vì vậy chưa thể kiểm thử case báo giá thực có phí, các rate phù hợp vùng, hay nghiệp vụ tạo đơn COD thật kèm dòng vận chuyển/thuế/vận hành kho/gửi email. Không tự đặt phí, bật chính sách Woo, hay tạo đơn thật ở production khi chưa được phép.

Hành động tiếp theo khi có chính sách: cấu hình phương thức và phí trong WordPress/WooCommerce theo quyết định chủ sở hữu, chạy QA read-only với báo giá enabled/rates, sau đó chỉ thực hiện test tạo đơn thật trên staging hoặc theo phê duyệt cụ thể và dọn record test đúng quy trình.

Chế độ code: auto-build
Cổng ghi source: bypass
Trạng thái: PARTIAL — chưa hoàn tất
