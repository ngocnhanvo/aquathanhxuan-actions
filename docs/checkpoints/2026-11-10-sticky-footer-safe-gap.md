# Aqua Thanh Xuân — Sticky mua hàng không che footer

- Ngày 2026-11-10, user screenshot cho thấy thanh mua cố định chèn lên cuối footer, ẩn dòng bản quyền.
- Dự án: ngocnhanvo/aquathanhxuan-astro `master`, ngocnhanvo/aquathanhxuan-actions `main`, production https://aquathanhxuan.io.vn.
- Code mode: auto-build; Cổng ghi source: bypass.

## Source thay đổi

- Astro commit [`b7c393a7`](https://github.com/ngocnhanvo/aquathanhxuan-astro/commit/b7c393a7cda3116f6ccff1316b7434b0eb4e4f99), chỉ `src/astro/pages/ProductDetailsPage.astro`: body product page class `product-has-sticky-purchase` khi có purchase actions. CSS scoped qua class đó vào `#footer-contact` để `margin-bottom: calc(var(--product-sticky-height, 105px) + 12px)`, dùng chiều cao thực đo bar. Khi cuộn đến cuối, copyright footer được đẩy hẳn lên trên bar; thanh vẫn fixed, không ẩn ở footer. Xóa class + CSS height variable khi astro before-swap.
- Hành vi cart/stock/price, nhãn một dòng và guard chỉ hiện sau khi vượt cụm CTA gốc không đổi.
- Actions test bổ sung đo `sticky.top - copyright.bottom >= 8px` ở đáy trang + body class và footer dynamic bottom margin, cả 4 mẫu Woo desktop/mobile và URL gốc `/san-pham/1443750909` ở 1657/390.

## Unit và build

- Unit/compile + PHP field/price-stock QA [`#42727975935`](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42727975935) completed/success.
- Request build commit `5e360196bd1200c0ecbeec826006705c6222056e` → WordPress wrapper [`#42728082469`](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42728082469), downstream existing Astro production workflow [`#42728214191`](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42728214191) queued at this checkpoint.
- Cần xác nhận wrapper BUILD_SUCCESS + DEPLOY_READY đúng SHA, downstream deploy SUCCESS, tiếp theo QA real page sau deploy và screenshot/log. Không tuyên bố QA_PASS khi chưa có job kết thúc.

## Production QA và nghiệm thu

- Production request [#42728082469](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42728082469) completed SUCCESS; `SOURCE_SHA_VERIFIED=b7c393a7cda3116f6ccff1316b7434b0eb4e4f99`, `BUILD_SUCCESS=PASS`, `DEPLOY_READY=PASS` same SHA.
- Production Astro deploy [#42728214191](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42728214191) completed SUCCESS, signed production activation.
- Read-only browser QA [#42728530894](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42728530894) completed SUCCESS, pinned deployed SHA exact. 4 real Woo product details desktop 1440/mobile 390 = **8/8** existing purchase-flow checks PASS including footer clearance; customer exact `/san-pham/1443750909` at desktop 1657/mobile 390 = **2/2** additional PASS.
- Measured footer copyright clearance at absolute scroll bottom: desktop width 1657 gap **13.296997px**, footer bottom margin 81px, sticky height 69px; mobile width 390 gap **13.548767px**, footer bottom margin 117px, sticky height 105px. Both exceed 8px; no covering. Sticky still fixed and `aria-hidden=false` on footer, cart label `nowrap=true`, one line, overflow=0; no horizontal overflow or cart writes.
- [Browser QA artifact #13722764332](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42728530894/artifacts/13722764332): 22 screenshots and report, including direct user URL desktop/mobile. No PHP/CMS changes.
- **Trạng thái: DONE — hoàn tất**.
