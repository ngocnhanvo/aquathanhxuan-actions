# Aqua Thanh Xuân — Đồng bộ 9 menu sản phẩm còn lại

Ngày checkpoint: 2026-11-09 (Asia/Ho_Chi_Minh).

## Phạm vi đã xác nhận
- Source gốc: https://aquathanhxuan.com — WooCommerce Store API.
- CMS đích: https://admin.aquathanhxuan.io.vn — WooCommerce REST/v3, ACF `product_lang=vi`, Yoast SEO.
- Frontend: https://aquathanhxuan.io.vn — Astro `ngocnhanvo/aquathanhxuan-astro` master.
- Chín menu: Máy lọc, Vật liệu lọc, Phụ kiện, Đá/Lũa/Cát, Hóa chất, Bể kính, Nền, CO2, Sinh vật. **Đèn (59 Product) đã nghiệm thu ở checkpoint riêng, không nhập lại Đèn**.
- Đã đọc `ngocnhanvo/knowledge` main và `AGENTS.md` của Astro.
- Chế độ code: auto-build; Cổng ghi source: bypass.

## Kiểm kê nguồn thật
- [Run #42660517291](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42660517291) xác minh slug gốc 9 taxonomy roots (có tên khác menu ở Phụ kiện, Đá/Lũa/Cát, Sinh vật).
- [Run #42660766962](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42660766962) xác định 389 source Products `simple`, 146 đã có, 243 thiếu, không conflict; bốn danh mục con thiếu ở đích.
- [Run #42661708486](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42661708486) **PASS**, tạo đúng 4 terms chỉ trong WC, không đổi menu:
  - Source 2184 Khác (Vật liệu lọc) -> target 1859
  - Source 2204 Lọc phụ (Máy lọc) -> target 1860
  - Source 2307 Cibi (Nền) -> target 1861
  - Source 2323 Prodibio (Nền) -> target 1862
- [Run #42662410500](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42662410500) **PASS independent preflight**: `state=PASS unique_count=389 unique_missing=243 type_counts={simple:389} identity_conflicts=0 missing_target_category_count=0`. Có hai Product nguồn không có ảnh Store.
- Manifest của inventory được tạo tại `artifacts/aqua-remaining-catalog/inventory.json`, không đoán source ID.

## Import đã kích hoạt
- Workflow hiện hữu của công việc import tại `.github/workflows/aqua-remaining-catalog-migration.yml`, request `cms-requests/remaining-catalog-migration.json`.
- [Run #42663313074](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42663313074): preflight PASS, pilot 3/3 PASS (source IDs 702, 858, 1885; new Product IDs 83255, 83256, 83258). ID 858 không có source cover và được đánh dấu `_esc_source_media_deferred`.
- **13 batches** (mỗi khoảng 30 Source Product ID theo modulo 13), `max-parallel=2` đang tiếp tục tại checkpoint. Chỉ PASS khi toàn bộ 13 batch và `verify` độc lập kết thúc success; kiểm tra log+artifact từng batch, không lấy `triggered` làm DONE.
- Importer `scripts/aqua-remaining-catalog-migrate.py`: source ID + slug + category verified; reuse/create idempotent; giữ ảnh có chứng cứ / tải bytes gốc, không trộn ảnh khác; ảnh HTTP404 hoặc nguồn không có ảnh được ghi `ASSET_DEFERRED`, không cản Product record; cập nhật giá/giá gốc/tồn kho, description, short description, `product_lang=vi`, Yoast SEO title/meta description chỉ khi nguồn có; không ghi đè SEO hợp lệ bằng rỗng.
- Phải thống kê imported/reused/deferred, QA lỗi và temporary media cleanup trước khi build.

## Đã chuẩn bị bước sau (CHƯA chạy)
1. `scripts/aqua-remaining-product-routes.cjs` + `.github/workflows/aqua-remaining-product-routes.yml` — 389 source IDs được kiểm độc lập trước khi tạo các native WordPress `chuyen-huong-link` Rewrite theo lô 25 slugs; chỉ kích `cms-requests/remaining-product-routes.json` **sau khi import và verify PASS**.
2. `scripts/aqua-remaining-catalog-production-qa.cjs`, các workflow `aqua-remaining-catalog-data-qa.yml` và `aqua-remaining-catalog-production-qa.yml`: parity đủ 389 nguồn/đích, giá/tồn kho/category, SEO nguồn `<title>` + meta description -> Yoast, marker đúng Astro SHA; 9 trang danh mục + 9 trang chi tiết × desktop/mobile = 36 checks. Chỉ tạo QA requests sau khi dữ liệu và routing PASS.
3. Trigger **cùng production Astro workflow hiện có**, chỉ khi data QA PASS; xác nhận `BUILD_SUCCESS`/`DEPLOY_READY`/`QA_PASS`; không deploy pipeline mới và không build trùng khi source SHA chưa thay đổi.
4. Ghi lại tổng Product hoàn tất, ngoại lệ nguồn ảnh, artifacts, source/deploy SHA; cập nhật `chatgpt/latest-response.md`.

**Trạng thái: PARTIAL — chưa hoàn tất** do 13 batch còn chạy và chưa có QA/deploy production.
