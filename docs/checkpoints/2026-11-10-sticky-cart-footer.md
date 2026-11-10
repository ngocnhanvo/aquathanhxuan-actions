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

Trạng thái: PARTIAL — chưa hoàn tất
