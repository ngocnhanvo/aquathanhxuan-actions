# Aqua Thanh Xuân — bong bóng nước nhẹ quanh logo header

- Thời điểm: 2026-11-09 (Asia/Ho_Chi_Minh).
- Astro source: `ngocnhanvo/aquathanhxuan-astro`, branch `master`, commit `40d900bb6c2d8f3d1e4aceec8d4f6c819f15591d`.
- PHP: không đổi. Actions: `ngocnhanvo/aquathanhxuan-actions` branch `main`.
- Chế độ code: auto-build. Cổng ghi source: bypass.

## Phạm vi / source

- `src/astro/components/Layout/Header.astro`: giữ nguyên logo WordPress `thong-tin-chung`, logo/link, thanh tìm kiếm đã căn giữa, Tài khoản/Giỏ hàng và menu tím.
- Thêm lớp `header-logo-bubbles` nằm trong link logo với `aria-hidden=true`, `pointer-events:none`; 5 bong bóng nhỏ dùng CSS border/radial-gradient và `header-bubble-rise` @keyframes, thời lượng khác nhau 5.4–7s, di chuyển mờ lên trên khoảng 20px, không chiếm diện tích layout.
- `@media (max-width:899px), (prefers-reduced-motion: reduce)` tắt toàn bộ hiệu ứng; không tạo JS bundle, không đổi dữ liệu CMS hay hành động link.
- `scripts/aquathanhxuan-wordpress-production-build.mjs`: bổ sung QA số lượng 5, hiệu ứng desktop, pointer-events, mobile 390 ẩn, reduced-motion ẩn; giữ regression search-center 900/1024/1440/1920, logo/cart/menu cũ.

## Production và bằng chứng

- WordPress wrapper + QA Playwright: [run #42656742113](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42656742113) **completed/success**.
- Existing Astro production deployment: [run #42656892157](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42656892157) **completed/success**.
- Marker `SOURCE_SHA_VERIFIED=40d900bb6c2d8f3d1e4aceec8d4f6c819f15591d`, `BUILD_SUCCESS=PASS`, `DEPLOY_READY=PASS` đúng commit trên.
- `HEADER_LOGO_BUBBLES_DESKTOP_PASS`: count 5, animation `header-bubble-rise` duration 6.3s cho bubble đầu, pointer-events none, logo contains bubbles, horizontal overflow 0.
- `HEADER_BUBBLES_MOBILE_HIDDEN_PASS=390` và `HEADER_LOGO_BUBBLES_REDUCED_MOTION_PASS=hidden`.
- `HEADER_SEARCH_CENTER_PASS` ở 900,1024,1440,1920px đều `centerDeltaPx=0`, không chồng logo/account; nav đúng màu `rgb(51,43,142)`.
- Playwright screenshot [artifact #13692956597](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42656742113/artifacts/13692956597).
- Production: https://aquathanhxuan.io.vn/

## Kết quả

- **DONE — hoàn tất** yêu cầu triển khai thử bong bóng quanh logo lên production.
- Không build lại commit này nếu không có yêu cầu điều chỉnh mới.
- Ngoại lệ 13 ảnh gốc sản phẩm Đèn nằm ở checkpoint riêng, không thuộc phạm vi công việc header.
