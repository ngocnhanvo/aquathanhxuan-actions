# Phản hồi ChatGPT mới nhất — aquathanhxuan.com

- Ngày: 2026-11-10, Asia/Ho_Chi_Minh.
- Chế độ code: auto-build; Cổng ghi source: bypass.
- Phạm vi: Knowledge chung `ngocnhanvo/knowledge` + Aqua `ngocnhanvo/aquathanhxuan-astro`, `ngocnhanvo/aquathanhxuan-php`, `ngocnhanvo/aquathanhxuan-actions`.

## Yêu cầu

Chương trình khuyến mãi phải luôn được **quản lý bằng Coupons thật trong WordPress/WooCommerce**; hoàn thiện trường hợp giảm **5% từ 200.000đ**, lưu quy tắc áp dụng chung trong Knowledge.

## Kết quả

- Knowledge `main`: `stacks/woocommerce-coupon-promotions.md` + README/AGENTS, chuỗi commit kết thúc ở `608788447a13486dbe1087a173aece9a93fc8a66`.
- WP Admin Marketing → Coupons: code `aqua-auto-5`, **ID 83818**, `publish`, 5% từ >=200.000đ. [Read-after-write PASS #42775054145](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42775054145).
- PHP `master` `bbeae23d8169a8177ab9719eda4cf6040f9d1b8a`: thay virtual hardcoded coupon bằng coupon DB/validator native; sửa CoCart sync không xóa coupon hợp lệ và validator subtotal trước khi WC tính tổng. [PHP release PASS #42777270521](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42777270521).
- Astro `master` `0ac8af50be65a4ead280d2368bd69195c27bcc01` [đã deploy production PASS #42775644106](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42775644106), marker source đã khớp.
- [Anonymous cart QA #42777458941 PASS](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42777458941): 2.700.000đ, coupon 5%, giảm chính xác 135.000đ trước/sau sync, `CLEANUP=PASS`; không gọi checkout, không tạo đơn hàng.
- Các điều kiện biên 199.999 / 200.000đ và thay đổi giá trị coupon trong WP được test offline. Quy tắc thay đổi coupon không cần build frontend; no virtual fallback.

## Bước sau

Đầu việc quản lý coupon 5% **đã hoàn tất**, không chạy lại các build/QA PASS. Riêng luồng checkout/đặt hàng tổng thể thuộc nhiệm vụ trước chưa được nghiệm thu tạo đơn thật; phải xử lý riêng theo chỉ đạo và chốt an toàn thanh toán.

[Checkpoint đầy đủ](https://github.com/ngocnhanvo/aquathanhxuan-actions/blob/main/docs/checkpoints/2026-11-10-native-woocommerce-coupon.md)

Chế độ code: auto-build
Cổng ghi source: bypass
Trạng thái: DONE — hoàn tất
