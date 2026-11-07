# Checkpoint — Hot Combo và Máy lọc/Đèn

Ngày: 2026-11-08 (Asia/Ho_Chi_Minh)
Project: aquathanhxuan.com

## PASS đã xác minh
- Home 02 đã có native ESC Table và Visual Builder production QA PASS (run 42405585888), không làm lại.
- Home 03 Hot Combo: ESC Table một sản phẩm thật, shortcode Page 82454, Astro parser sửa nguồn tiêu đề `table.title`.
- Home 04 Máy lọc và Đèn: ESC Table native 2 sản phẩm/Media thật (run 42408720436), shortcode Page 82454 xác nhận không trùng (run 42409118303). Sửa Playwright browser context trong Actions.
- Source Astro production: `ngocnhanvo/aquathanhxuan-astro/master` SHA `d9b42a6dbc68bc4fd68be442afe3f5645f834dc6`.
- Production build chính thức via WordPress: run 42409331736 SUCCESS.
- Production deploy: run 42409398485 SUCCESS.
- 5 viewport + Builder read-only QA: run 42410091791 SUCCESS, đầy đủ ảnh thật, CTA URLs, horizontal overflow, cell table/row/field/version. Các option Builder hiển thị dạng `row:field` (ví dụ `0:button_href`), không phải tên field trần; đồng bộ test với UI và chờ Ajax tải khi chuyển bảng.
- Page content đã xác nhận thứ tự `home_00,home_01,home_02,home_03,home_04`.

## Tiếp tục
- Hai banner và Hot Combo: DONE, không chạy lại khi không có thay đổi.
- Theo `aquathanhxuan-astro/docs/design/aquathanhxuan-homepage/HANDOFF.md`, phần tiếp theo là benefits strip 4 mục và hoàn thiện Footer theo thiết kế. Chưa đánh dấu hoàn tất toàn bộ homepage.
- Benefits phải dùng dữ liệu thật từ ESC Table/WordPress, Insert Code native, giữ metadata cell, không hardcode text trong Astro.
- Footer phải lấy logo và contact/menu từ dữ liệu WordPress, không đổi nguồn sự thật.
- Trước phát hành phần mới: test source, build cùng production workflow đã phê duyệt, QA 5 viewport và Builder.

Chế độ code: auto-build
Cổng ghi source: bypass
