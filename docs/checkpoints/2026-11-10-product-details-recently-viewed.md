# Aqua Thanh Xuân — Sản phẩm đã xem trong trang chi tiết

- Ngày 2026-11-10 (Asia/Ho_Chi_Minh).
- Chủ dự án yêu cầu bổ sung section `Sản phẩm đã xem` vào Product Details, giữ nhất quán với section đã có ở Product SSR listing.
- Repo Astro: `ngocnhanvo/aquathanhxuan-astro`, `master` production. Repo Actions: `ngocnhanvo/aquathanhxuan-actions`, `main`.
- Chế độ code: auto-build; Cổng ghi source: bypass.

## Source đã sửa

- Pinned Astro SHA `c465bc2eff875dfdbb65e802f86031fad3e91452`.
- `src/astro/components/Product/RecentlyViewedProducts.astro`: component chung, một UI cho trang danh sách và chi tiết, ảnh/tên/giá, empty state localized, dạng grid responsive, link dữ liệu lịch sử thật, không render lại Product đang xem trên detail.
- `src/astro/pages/ProductsSSRPage.astro` đổi section+script lặp thành `<RecentlyViewedProducts language={language} />`, giữ nguyên khu vực cũ.
- `src/astro/pages/ProductDetailsPage.astro` render `<RecentlyViewedProducts language={language} currentProductId={String(product._id)} embedded />` ngay sau `<RelatedProducts>` và trước footer. History tracking vẫn giữ, hỗ trợ `astro:page-load`.
- `src/lib/wordpress/products/recentlyViewed.ts`: sửa lỗi read history cũ gán ngôn ngữ yêu cầu lên record khác ngôn ngữ; giữ nguyên mã locale nguồn và khử trùng theo `(id,lang)`. `recentlyViewed.test.ts` xác minh đọc, dedup, locale isolation và dữ liệu không hợp lệ.
- Không thay Product API/CMS, cart, data source, sticky CTA, SEO, hay WordPress/PHP.

## Chứng cứ và bước kế tiếp

- [Source/compile/unit test #42761725076](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42761725076) **PASS** (source đúng SHA).
- Build request commit `5ee5dc101be44f18034cccd31984f7eb407f52ef`, pin SHA trên; WordPress build wrapper [#42761913327](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42761913327); downstream Astro deploy [#42762007229](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42762007229), đang chạy tại checkpoint.
- `scripts/aqua-product-detail-ui-qa.cjs` bổ sung kiểm tra end-to-end read-only: ở sản phẩm đầu empty state; mở sản phẩm thứ hai, xem sản phẩm đầu, không hiện sản phẩm hiện tại, có ảnh/tên/link, không tràn ngang desktop 1440/mobile 390; kiểm tra hồi quy 4 Woo Products cùng sticky/footer.
- Bước tiếp: chờ `BUILD_SUCCESS/DEPLOY_READY` + deployment success exact SHA; cập nhật `qa-requests/product-detail-ui.json` và chạy public Playwright QA; chốt DONE chỉ khi result true.

Trạng thái: PARTIAL — chưa hoàn tất
