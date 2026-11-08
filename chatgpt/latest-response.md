# Khôi phục và hoàn tất hai section Máy lọc / Đèn — Aqua Thanh Xuân

Đã đọc quy tắc `ngocnhanvo/knowledge/main`, đối chiếu commit, log, checkpoint và tiếp tục từ `home_02` đã hoàn tất, không làm lại hạng mục cũ.

**Trạng thái hiện tại: Hoàn tất trên production và Visual Builder QA PASS.**

- Astro `master`: `c5e12e223e1e92806a32c68c35f759ca1e8a8110`, đã sửa tách taxonomy của Máy lọc và Đèn khỏi danh mục Nền. Kiểm thử 26/26 PASS, run [42497158378](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42497158378).
- Nguồn sản phẩm: xác minh từ `https://aquathanhxuan.com`, nhập 10 Máy lọc và bổ sung hai phụ kiện Đèn, tái sử dụng bảy sản phẩm Đèn có sẵn, bảo toàn giá/ảnh/tên gốc; năm danh mục con được đặt đúng root.
- ESC Table: `home_06` → `tool_home06products` (10 Product) và `home_07` → `tool_home07products` (9 Product), bảng con khai báo `meta.api=Product`; cha có khóa `shortcode-products`.
- Trang chủ WordPress Page `82454` đã chèn native Insert Code, giữ nguyên sáu section cũ, thứ tự `home_00 → home_01 → home_02 → home_03 → home_04 → home_06 → home_07 → home_05`. Đọc lại sau lưu PASS: [run 42499333049](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42499333049).
- WordPress Build Website chuẩn [run 42499512154](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42499512154) và Astro deploy [run 42499591212](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42499591212) SUCCESS. Production marker khớp đúng SHA.
- [QA production run 42500127511](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42500127511) SUCCESS: 5 viewport `1440×900`, `1024×768`, `768×1024`, `844×390`, `390×844` PASS; hiển thị dữ liệu Product thật; Visual Builder xác minh được bảng Product con, menu thêm/xóa, chọn sắp xếp đỏ/xanh. QA **chỉ mở và hủy thao tác**, không ghi thay đổi Product lên production; kiểm thử lưu-thật-hoàn-nguyên không nằm trong kết quả này.

Checkpoint kết thúc: [Home 06 / Home 07 nested catalogue](https://github.com/ngocnhanvo/aquathanhxuan-actions/blob/main/docs/checkpoints/2026-11-08-home06-home07-nested-catalogue.md).

Chế độ code: auto-build
Cổng ghi source: bypass
Trạng thái: DONE — hoàn tất
