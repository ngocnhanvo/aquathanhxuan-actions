# Checkpoint — tối ưu banner responsive và mobile LCP

Ngày: 2026-11-09 (Asia/Ho_Chi_Minh)
Project: aquathanhxuan.com
Frontend: ngocnhanvo/aquathanhxuan-astro master
Backend: ngocnhanvo/aquathanhxuan-php master (unchanged)
Actions: ngocnhanvo/aquathanhxuan-actions main
Code mode: auto-build
Source gate: bypass

## Yêu cầu
Kiểm tra mobile LCP cao, tác động tải chéo banner desktop/mobile, phạm vi tối ưu render vùng offscreen và sửa nguyên nhân khi có thể.

## Baseline và nguyên nhân
- Trước chỉnh sửa: Lighthouse production Mobile Performance 87, LCP 2.639s; Desktop Performance 99, LCP 0.696s; NO_LCP đã khắc phục trước đó tại Astro 7fe42e8; không sửa hồi quy này.
- Home_00 render img thật cho mọi slide; desktop đầu tiên eager/high kể cả viewport mobile; mobile slide tải lazy và chọn bằng JS. Head preload dùng breakpoint 639/640px trong khi slider chọn ở 767px.

## Sửa mã và sản xuất
- Astro commit a2b3542aeac5e21dde6b9f96c54b1fc7f080deab: responsive picture/source[media] tách desktop/mobile, fallback data URI, chọn đúng initial desktop/mobile không phụ thuộc JS, trì hoãn slide chưa hiển thị, warm ảnh slide tiếp theo sau window.load.
- Astro commit dfa0ca0db2b12d0a9c0c6c6e5825fc411d8532d8: đồng bộ Head preload ở max-width:767px / min-width:768px; source SHA đang triển khai.
- Không sửa ESC Table/ảnh gốc/WordPress/PHP; giữ cả hai ảnh desktop và ảnh mobile hiện tại.
- Build request: build-requests/2026-11-09-home00-mobile-lcp-dfa0ca0.json, source SHA dfa0ca0.
- Production build SUCCESS: https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42557808129
- Production deploy SUCCESS: https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42557882690

## Chứng cứ nghiệm thu
- Playwright 6 viewport PASS: https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42558130249
- 1440x900 chỉ tải cropped-banner-8-1-1536w.webp
- 1024x768 chỉ tải cropped-banner-8-1-1024w.webp
- 768x1024 chỉ tải cropped-banner-8-1-768w.webp
- 844x390 chỉ tải cropped-banner-8-1-1024w.webp
- 390x844 và 320x700 chỉ tải aqua-thanh-xuan-mobile-hero-480w.webp
- Không tải chéo banner desktop/mobile trong request capture; chuyển slide desktop, CTA mobile, object-fit, icon section, không overflow, CMS image ALT, số slide (2 desktop, 1 mobile) đạt.
- Lighthouse sau deploy SUCCESS: https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42558164485
- Mobile Performance 94/100, LCP 2.092399s, FCP 1.842399s, Speed Index 5.050479s, TBT 54ms, CLS 0.
- Desktop Performance 99/100, LCP 0.594196s, FCP 0.474196s, TBT 0ms, CLS ~0.00042.
- Không còn NO_LCP và Lighthouse auditErrors rỗng; native LCP đúng mobile/desktop hero, requestFailures=[] và jsErrors=[]. Google PageSpeed API vẫn HTTP 429 quota, độc lập với bài Lighthouse.
- LCP mobile giảm khoảng 0.547s (~20.7%) trong hai lần đo; là so sánh lab, không phải field data.

## Offscreen rendering
- HomePage.astro sử dụng content-visibility:auto + contain-intrinsic-size:auto 900px trên section có data-scroll-reveal.
- scrollReveal.ts chỉ gắn marker cho Home_03 trở về sau; Home_01/Home_02 chưa áp dụng content-visibility, nhưng các ảnh sản phẩm có loading=lazy và responsive srcset/sizes.
- ExtractHTML.astro vẫn server-render section CMS trên server; content-visibility chỉ bỏ layout/paint ngoài viewport, không ngăn HTML server render hay tất cả requests.
- GoogleServices GTM mode được hoãn sau tương tác hoặc 8 giây sau load.
- Speed Index mobile khoảng 5.1s còn có thể nghiên cứu tiếp bằng waterfall, nhưng không nới logic lazy/render khi chưa chứng minh nguyên nhân.

## Kết luận
BUILD_SUCCESS / DEPLOY_READY / QA_PASS. Yêu cầu hiện hành DONE. Sau chỉnh sửa nếu phát sinh hồi quy, revert theo thứ tự commit dfa0ca0 rồi a2b3542 và production deploy chuẩn; không revert CSS Sale NO_LCP fix 7fe42e8.
