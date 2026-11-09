# Aqua Thanh Xuân — căn giữa duy nhất ô tìm kiếm trên thanh header trắng

- Ngày: 2026-11-09 (Asia/Ho_Chi_Minh).
- Astro `ngocnhanvo/aquathanhxuan-astro` `master` commit `6785500c81cc2846297e8ffd4b180c7f9f733531`.
- Actions `ngocnhanvo/aquathanhxuan-actions` `main`.
- Chế độ code: auto-build; Cổng ghi source: bypass.
- Phạm vi: **chỉ căn giữa thanh tìm kiếm desktop từ 900px**. Giữ nguyên logo, Tài khoản, Giỏ hàng, menu tím, responsive mobile.

## Thực hiện

- Chỉ sửa `src/astro/components/Layout/Header.astro`: thêm `id=header-desktop-search` cho form tìm kiếm, CSS `@media (min-width:900px)` `position:absolute;left:50%;transform:translateX(-50%);width:min(620px,calc(100% - 580px))`. Tâm form theo wrapper header trắng, không lệch do hai nhóm hai bên có chiều rộng khác nhau. Không thay JS, menu data WordPress, cart, logo.
- Thêm kiểm thử trong `scripts/aquathanhxuan-wordpress-production-build.mjs`: vị trí search với tâm header ≤2px, không đè logo/account (clearance ≥8px), menu vẫn màu cũ ở 900/1024/1440/1920px; mobile 390 vẫn ẩn form desktop, không overflow.
- Không sửa backend/PHP/CMS.

## Kết quả build & QA

- WordPress production wrapper: [#42653754660](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42653754660) completed/success, `SOURCE_SHA_VERIFIED=6785500c...`, `BUILD_SUCCESS=PASS`, `DEPLOY_READY=PASS`.
- Existing Astro production deploy: [#42653912341](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42653912341) completed/success.
- Playwright browser centering PASS 4 desktop widths: `900 -> centerDelta=0px, clearances logo=125px/account=28.36px, search=320px`; `1024 -> 0px, 113px/8.36px, search=444px`; `1440 -> 0px, 233px/128.36px, search=620px`; `1920 -> 0px, 253px/148.36px, search=620px`.
- `HEADER_SEARCH_MOBILE_UNCHANGED_PASS=390`, `QA_PASS header_search=centered account=visible cart=visible contacts=hidden nav=purple logo=visible`.
- QA screenshot artifact [#13690893017](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42653754660/artifacts/13690893017).
- URL production: https://aquathanhxuan.io.vn/
- **DONE — hoàn tất yêu cầu chỉ căn giữa ô tìm kiếm trên header**, không tiếp tục thay đổi menu hoặc các cụm còn lại.
