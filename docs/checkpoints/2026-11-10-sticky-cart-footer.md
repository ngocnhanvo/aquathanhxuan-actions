# Aqua Thanh Xuân — Sửa sticky cart một dòng và giữ vị trí ở footer

- Ngày: 2026-11-10 (Asia/Ho_Chi_Minh).
- Ảnh/URL khách phản ánh: `https://aquathanhxuan.io.vn/san-pham/1443750909`, desktop 1657×921. “Xem giỏ hàng” xuống dòng và thanh mua tự biến mất khi cuộn đến footer.
- Source: `ngocnhanvo/aquathanhxuan-astro` branch `master` commit `99c476a7f3af13717f7294f23e39b31922ea3320`; PHP không sửa.
- Chế độ code `auto-build`, Cổng ghi source `bypass`.

## Thay đổi có phạm vi nhỏ

- `src/astro/pages/ProductDetailsPage.astro`: tăng độ rộng nhóm CTA sticky lên `sm:min-w-[390px] lg:min-w-[420px]`, `whitespace-nowrap` trên span và anchor, tránh xuống dòng.
- `syncStickyPurchase` bỏ điều kiện `footerVisible` gây ẩn/hiện tại footer; giữ guard gốc `actions.bottom <= 0`: thanh không hiện khi mới vào hoặc chưa cuộn qua nút chính, luôn fixed bottom sau đó (kể cả footer). Các trạng thái giỏ hàng, nút, giá, stock và widget dịch lên giữ nguyên.
- Kiểm thử `scripts/aqua-product-detail-ui-qa.cjs`: xác nhận không wrap/clipping, fixed bottom tại footer, không chặn widget; bổ sung đúng URL `1443750909` tại 1657 và 390 px.

## Kết quả / bước tiếp theo

- Scoped Astro template + PHP REST + price/stock regression [#42725892069](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42725892069) **PASS**.
- Build request commit `89b968e347b70762d321574bad0e3fd1a5d1ee94` pin source SHA ở trên. WordPress trigger [#42726114209](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42726114209), downstream deploy [#42726266559](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42726266559) đang chạy tại checkpoint.
- Khi deploy `BUILD_SUCCESS`, `DEPLOY_READY` đúng pinned SHA, cập nhật `qa-requests/product-detail-ui.json` để chạy lại read-only browser QA 4 product × desktop/mobile và direct user URL 1657/mobile; lấy QA artifact và log. Nếu fail, sửa và build lại đúng source/QA.

## Kết quả production đã nghiệm thu

- Scoped source/compiler + PHP mapping/price-stock regression: [#42725892069](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42725892069) = **PASS**.
- WordPress production build: [#42726114209](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42726114209) = **SUCCESS**, log `BUILD_SUCCESS=PASS`, `DEPLOY_READY=PASS commit=99c476a7f3af13717f7294f23e39b31922ea3320`.
- Downstream Astro deploy: [#42726266559](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42726266559) = **SUCCESS**, signed unzip and PM2 reload; đúng `master` source SHA trên.
- Public browser QA: [#42726612263](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42726612263) = **SUCCESS**, marker `DETAIL_DEPLOY_READY` matches. 4 real Woo products × desktop 1440px/mobile 390px **8/8 PASS**; main CTA hidden/visible guard, footer persistent, cart single-line, delegated add action, no console errors/overflow.
- Exact user URL `/san-pham/1443750909` on screenshot desktop **1657×921** and mobile **390×844**: two `REPORTED_PRODUCT_STICKY_FOOTER_PASS` markers, `nowrap=true`, `lineBoxes=1`, `overflow=0`, `footerVisible=true`, and sticky fixed at bottom. Additional 2/2 targeted tests PASS.
- [QA artifact #13723257226](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42726612263/artifacts/13723257226): 22 screenshots and test report. QA read-only, no Woo cart mutation.
- Fixed `ProductDetailsPage.astro` only (Astro commit `99c476a7`), no PHP/CMS changes, no duplicate production build.

Trạng thái: DONE — hoàn tất
