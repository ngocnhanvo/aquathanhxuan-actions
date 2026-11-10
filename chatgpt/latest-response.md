# Đã khôi phục checkpoint mới nhất — 10/11/2026

Mình đã đối chiếu các repo Aqua Thanh Xuân với `chatgpt/latest-response.md`. Trạng thái hiện tại:

| Repository | Commit mới nhất |
|---|---|
| Astro `master` | `272290ec` |
| WordPress/PHP `master` | `e8dd6954` |
| Knowledge `main` | `60878844` |
| Actions `main` tại thời điểm bắt đầu | `b0fa3bf4` |

**Phần đã hoàn thành và triển khai production:**

- Thêm sản phẩm, xem và cập nhật giỏ hàng.
- Tự động áp dụng coupon WooCommerce giảm 5% từ 200.000đ.
- Trang checkout, nhập thông tin khách hàng và tạo tài khoản.
- Bảo vệ phiên đăng nhập, lịch sử đơn hàng và chống gửi đơn trùng.
- Sửa lỗi escape HTML/XSS trong giỏ hàng và checkout.

Các lần kiểm thử cuối được ghi nhận thành công:
- [Source QA — 26/26 tests PASS](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42809623082).
- [Production deploy — SUCCESS](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42809847081).
- [Playwright giỏ hàng và checkout — SUCCESS](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42810194245).

**Phần chưa nghiệm thu:** Vận chuyển chưa có cấu hình phí, BACS chưa có tài khoản nhận tiền được xác minh và OnePay chưa có sandbox để kiểm thử giao dịch thực. Vì vậy chưa thể xác nhận toàn bộ luồng thanh toán thực tế đã hoàn tất.

**Kiểm tra bổ sung trong lượt tiếp tục:** Đọc lại `checkout_endpoint.php`: các trường địa chỉ giao hàng được lưu nhưng chưa tạo dòng phí vận chuyển khi tính tổng Woo và gọi OnePay. Đối chiếu thêm `inc/checkout/index.php` cho thấy đã có bộ kiểm HMAC, đúng order ID và số tiền cho callback OnePay, nhưng chưa có giao dịch sandbox E2E. Đọc lại các job Actions cuối: `completed/success`.

Đã lưu bằng chứng vào [checkpoint cập nhật](https://github.com/ngocnhanvo/aquathanhxuan-actions/blob/main/docs/checkpoints/2026-11-10-checkout-html-safety.md), commit `7c5a76c7`. Không sửa source Astro/PHP, không chạy lại build đã PASS, không tạo order/account/giao dịch thật.

**Cần quyết định của chủ shop:** (1) cấu hình shipping zone/method/rate WooCommerce để thu tổng tiền gồm ship ngay; hoặc (2) quy trình xác nhận cước/tổng đơn trước khi gửi yêu cầu thanh toán. BACS chỉ mở khi có tài khoản ngân hàng được xác minh; cần OnePay sandbox hoặc tài khoản test được phê duyệt để nghiệm thu callback/paid receipt/stock/email/đơn hàng. Chưa đủ điều kiện phát hành thay đổi thanh toán an toàn.

Chế độ code: auto-build
Cổng ghi source: bypass
Trạng thái: PARTIAL — chưa hoàn tất
