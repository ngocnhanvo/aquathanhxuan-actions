# Aqua Thanh Xuân — sửa banner tối ở breakpoint 767–768px (2026-11-11)

## Đã xử lý
- Tiếp nhận ảnh chụp trang chủ production DevTools khoảng 767×760, banner nền tối nhưng còn nút điều hướng/chấm slider.
- Phát hiện nguồn HTML đặt `source` desktop `min-width:768px` và mobile `max-width:767px`, trong khi fallback `img` là GIF trong suốt. Sửa điều kiện desktop thành `not all and (max-width: 767px)` để phủ toàn bộ độ rộng không phải mobile, kể cả trường hợp độ rộng CSS nằm giữa hai mốc.
- Astro `ngocnhanvo/aquathanhxuan-astro` branch `master`: `b208b9f82c669953ec6685e740f539ee4c21e046`.
- Source QA [#42941509621](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42941509621) PASS (Astro compile + 4 Vitest).
- WordPress Build Website trigger [#42941605066](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42941605066) PASS, existing deploy [#42941711725](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42941711725) PASS.
- Production Playwright QA [#42941999424](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42941999424) PASS, đúng marker source. 390px và 767px chỉ hiện mobile hero; 768px, 1024px, 1440px hiện desktop hero; ảnh active tải được; điều hướng desktop và ẩn controls mobile đúng; screenshot artifact `aqua-home00-fractional-qa`.
- Chi tiết & hạn chế phép đo fractional iframe ở `docs/checkpoints/2026-11-11-home00-fractional-banner.md`.

## Ghi chú QA
- Trường hợp iframe style 767.5px được Chromium làm tròn thành layoutWidth 768px, vì vậy QA không tuyên bố đã tái hiện lỗi đúng subpixel trong trình duyệt của người báo lỗi. Lỗi khoảng trống media-query đã được đóng bằng điều kiện bù nhau; nếu vẫn đen cần lấy `currentSrc`, `naturalWidth`, network và browser zoom thực tế.
- Không chỉnh CMS, banner thật, logic checkout hay pipeline deploy.
- Không làm lại công việc menu SEO/redirect đã hoàn tất trước đó.

Chế độ code: auto-build
Cổng ghi source: bypass
Trạng thái: DONE — hoàn tất
