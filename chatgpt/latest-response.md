# ChatGPT latest-response — aquathanhxuan.com

- Ngày: 2026-11-10 (Asia/Ho_Chi_Minh)
- Project: aquathanhxuan.com
- Knowledge repo: ngocnhanvo/knowledge
- Branch: main
- Last Knowledge commit: 3d61b6ca942f438b16d773e5ed97f0ef7ea19b8a
- Scope: Knowledge-only; no app code changes, no WordPress writes, no build/deploy
- Files: stacks/wordpress-editor-esc-table.md, AGENTS.md, README.md, CHANGELOG.md
- Verified: main commits chain and readback for all changed docs
- Mode: auto-build / bypass

## Nguyên văn phản hồi gửi người dùng

Đã ghi quy tắc **ESC Table cho các trang nghiệp vụ đặc biệt** vào repo `ngocnhanvo/knowledge` trên nhánh `main`.

Quy tắc áp dụng cho các trang như **Lịch sử mua hàng, Giỏ hàng, Thanh toán, Tài khoản, Đăng nhập và Quên mật khẩu**: Page WordPress thật + ESC Table chèn bằng **Insert Code**; nhãn/placeholder/CTA/loading/trạng thái nằm trong bảng `key | label`; dữ liệu đơn hàng, thanh toán và xác thực vẫn nằm ở API/WooCommerce, không đưa vào ESC Table hay Preview. Visual Builder phải cho sửa đúng từng ô theo `Table ID + row + field + version`, và QA phân biệt mở được ô với lưu/đọc lại thành công.

Đã cập nhật 4 file: [quy tắc chính](https://github.com/ngocnhanvo/knowledge/blob/main/stacks/wordpress-editor-esc-table.md), [AGENTS.md](https://github.com/ngocnhanvo/knowledge/blob/main/AGENTS.md), [README.md](https://github.com/ngocnhanvo/knowledge/blob/main/README.md) và [CHANGELOG.md](https://github.com/ngocnhanvo/knowledge/blob/main/CHANGELOG.md).

**Commit cuối:** [`3d61b6c`](https://github.com/ngocnhanvo/knowledge/commit/3d61b6ca942f438b16d773e5ed97f0ef7ea19b8a). Đã đọc lại cả bốn file và xác minh chuỗi commit trên `main`. Đây là thay đổi tài liệu Knowledge, **không sửa hay build/deploy website**.

Chế độ code: auto-build
Cổng ghi source: bypass
Trạng thái: DONE — hoàn tất
