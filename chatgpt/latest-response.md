# Phản hồi ChatGPT mới nhất — aquathanhxuan.com

- Ngày: 2026-11-10 (Asia/Ho_Chi_Minh).
- Chế độ code: auto-build. Cổng ghi source: bypass.
- Mục tiêu tiếp tục: hoàn thiện WooCommerce đặt hàng từ sản phẩm → giỏ → coupon → checkout → thanh toán → xác nhận đơn, không làm lại bước đã PASS.

## Chính xác đã làm xong trong lượt mới

1. Kiểm tra lại Knowlege `ngocnhanvo/knowledge/main`, checkpoint checkout và latest-response của Aqua, cùng trạng thái các production pipelines. Các QA giỏ/checkout/route từ lượt trước vẫn PASS; không chạy lại hoặc thay code Astro/PHP cho các phần đó.
2. Đọc chính sách mua hàng gốc `https://aquathanhxuan.com/huong-dan-mua-hang-o-xa/`: cửa hàng xác nhận tình trạng hàng, phí ship, tổng đơn **trước khi chuyển tiền**. Không áp dữ liệu ngân hàng cũ chưa được chủ shop xác thực.
3. Thêm live QA khách Woo tạm tại `scripts/aqua-customer-session-live-qa.cjs`, workflow `aqua-customer-session-live-qa.yml`: scope một account tổng hợp, xóa trong finally, không ghi PII/cookie/secrets, không tạo đơn hay thanh toán.
4. [Run #42802133987](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42802133987) phát hiện thực tế WordPress customer tạo được nhưng Astro login trả HTTP 400. **Cleanup PASS**.
5. [Read-only WP audit #42802710205](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42802710205) chỉ rõ nguyên nhân: route `/custom/v1/login` **missing**; `/custom/v1/lost-password` và `/custom/v1/reset-password` có đăng ký. Cùng audit: shipping `woocommerce_ship_to_countries=disabled`, zero zones/methods, BACS bank accounts count 0, OnePay enabled / production URL `https://onepay.vn`.
6. Sửa source PHP `ngocnhanvo/aquathanhxuan-php/master` SHA **`e8dd6954e5b69b84cc25d2ebb31d66168847e8f8`**: thêm `wp-content/themes/vibe-code-theme/inc/user/login.php` đăng ký POST REST, xác thực `wp_authenticate()`, trả ID + Woo billing, generic errors, không ghi cookie/secret. Thêm `tests/aqua-customer-login-contract.test.php`; source QA [#42803470553](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42803470553) **PASS**.
7. PHP release [#42803579093](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42803579093) **PASS**, xác thực SHA256 path login.php trên WordPress production. Không kích Astro build vì chỉ thay PHP.
8. Live end-to-end [#42803822254](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42803822254) **SUCCESS**: REST login route đúng; QA Woo customer mới đăng nhập Astro trả 200, cookie v1 HMAC HttpOnly/Secure/SameSite Lax; `/api/user/info` đúng customer ID; `/api/user/order` 200, chỉ đơn của chính khách (tài khoản mới trống), no-store; cookie giả unsigned và cookie ký bị sửa 401; logout → order API 401. **AQUA_CUSTOMER_CLEANUP=PASS, created_orders=0, created_payments=0**. QA PHP + phiên Astro + quyền đơn thực tế đạt.
9. Checkpoint đầy đủ đã cập nhật tại `docs/checkpoints/2026-11-10-checkout-secure-session-live.md`. Không lặp bài QA đã PASS nếu source không thay đổi.

## Toàn luồng còn CHƯA DONE

- **Cước vận chuyển:** WooCommerce shipping đang disabled và không có shipping zone/method. Nguồn AQUA gốc yêu cầu cửa hàng xác nhận phí giao hàng và tổng tiền trước chuyển khoản; không thể bịa hoặc tự coi 0đ.
- **BACS:** chưa có tài khoản ngân hàng được chủ shop xác minh và nhập vào WordPress, frontend tiếp tục ẩn BACS cho an toàn.
- **OnePay:** môi trường hiện cấu hình production gateway; chưa có giao dịch sandbox với merchant credential test được xác nhận, chưa có E2E thật tạo Woo order → trả kết quả OnePay → paid stock & email & receipt. Không bấm thu tiền thật chỉ để QA. Những kiểm thử OnePay hiện có là no-order browser hoặc in-memory PHP.
- Khi có mức vận chuyển được duyệt/luồng xác nhận phí và tài khoản ngân hàng hợp lệ, tiếp tục cấu hình trong Woo, nghiệm thu nhánh ship/BACS và sandbox OnePay. Không thay business terms tự ý.

Source Astro production hiện tại: `c3d5714f9ec37e1f1d030524abc852be95cdfb0b` (build/deploy success #42799397565/#42799520104). Source PHP mới: `e8dd6954e5b69b84cc25d2ebb31d66168847e8f8` (release #42803579093).

[Checkpoint chi tiết](https://github.com/ngocnhanvo/aquathanhxuan-actions/blob/main/docs/checkpoints/2026-11-10-checkout-secure-session-live.md).

Chế độ code: auto-build
Cổng ghi source: bypass
Trạng thái: PARTIAL — chưa hoàn tất
