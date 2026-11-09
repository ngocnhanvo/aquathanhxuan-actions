# Aqua — đồng bộ sản phẩm trong menu Thương hiệu

- Ngày: 2026-11-09 (Asia/Ho_Chi_Minh)
- Trạng thái: **PARTIAL — dữ liệu đang nhập trên WordPress; chưa production QA**
- Knowledge: `ngocnhanvo/knowledge` main `60fb7759787e696f909e11da04a26404cb300b73`
- Astro: `ngocnhanvo/aquathanhxuan-astro` master (chưa cần đổi code từ task)
- Actions: `ngocnhanvo/aquathanhxuan-actions` main
- Source: `https://aquathanhxuan.com/`
- CMS: `https://admin.aquathanhxuan.io.vn`
- Production: `https://aquathanhxuan.io.vn`
- Cổng ghi: bypass / code: auto-build

## SOURCE_INVENTORY_PASS — kiểm kê độc lập

GitHub Actions read-only run [42579127519](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42579127519) PASS.

- WP source root Thương hiệu: product_cat `2019`; WP đích root: `1767`.
- 20 danh mục con đích; trong đó 19 có danh mục nguồn cùng tên và hàng đang bán. `FKSC` là menu liên kết danh mục `/danh-muc/may-loc/may-loc-fksc/` **trống ngay trên source**, không phát sinh sản phẩm.
- Source storefront API có tổng **157 sản phẩm simple**, gồm **9 Atman đã migrated**, còn **148 sản phẩm cần bổ sung**, thuộc 18 thương hiệu. Source Store API trả về số sản phẩm storefront public, có thể nhỏ hơn `category.count` (ví dụ Chihiros source category count=36 nhưng storefront trả 14).
- Chihiros 14, Continuum Aquatics 5, Dennerle 13, Eheim 1, GEX 7, ISTA 4, JEBAO 15, JECOD 10, Moutain Tree 5, MUFAN 6, NEO 6, NUPHAR 6, PRODAC ITALIA 18, PRODIBIO 5, SEACHEM 25, SERA 5, SOBO 2, WEEK AQUA 1. Atman 9 giữ nguyên.
- Thứ tự nhóm batch: A 33; B 36; C 41; D 38.

## Nhập sản phẩm — action đang chạy

- Script: `scripts/aqua-brand-catalog-migrate.py` (độc lập, idempotent), workflow `.github/workflows/aqua-brand-catalog-migrate.yml` với 4 job nối tiếp.
- Run ban đầu [42579877867](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42579877867) fail tại `python -m py_compile` do typo; **không có ghi WordPress** ở run đầu.
- Run tiếp theo [42579994450](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42579994450) chạy batch A rồi tự chuyển batch B/C/D nếu tất cả PASS.
- Script có phạm vi ghi tối thiểu: product đơn giản theo source slug/source ID → category có sẵn; không ghi đè sản phẩm đang có; ảnh gốc tải về Media giữ filename/kiểm tra SHA256 trước tái dùng; nhập giá/giảm giá/trạng thái kho/nội dung/SEO Yoast/ACF product_lang; read-after-write. Ghi JSON trạng thái & deferred vào artifact `aqua-brand-catalog-<batch>`.
- Nếu có lỗi ở job, đọc `BRAND_PRODUCT_FAILED`, `BRAND_ASSET_DEFERRED` và `BRAND_MIGRATION_RESULT`; sau sửa phải rerun idempotent. Không dùng fake products, không tự xóa dữ liệu. Script tải ảnh đã được cập nhật giới hạn retry hữu hạn sau khi run hiện hành khởi động; rerun mới áp dụng.
- **Chưa đánh dấu DATA_PARITY_PASS khi run chưa xong**.

## Link chi tiết, build và QA — tiếp theo

- Atman đã có một WordPress Rewrite scoped (post ID 82743). Các sản phẩm brand mới cũng cần Rewrite có giới hạn slug, nếu không `/san-pham/<product-slug>` bị route nhầm category và lỗi 500.
- Script chuẩn bị `scripts/aqua-brand-product-routes-create.cjs`, workflow `.github/workflows/aqua-brand-product-routes-create.yml`; chạy **sau khi cả 4 batch import PASS** bằng tạo `cms-requests/brand-product-routes.json`. Script chỉ tạo 4 Regex Rewrite native WordPress `^/san-pham/(real-slugs)/?$` → `/ssr/products/$1/detail`, preflight toàn bộ products tồn tại. Không đụng link danh mục, không ghi đè Atman.
- Build Astro bằng **workflow production đang có** `Aqua Thanh Xuân Astro deployment (WordPress Build Website only)` từ đúng master/head; không tạo pipeline thứ 2. Pipeline gần nhất trước migration thành công run 42577878332.
- QA sau deploy: `scripts/aqua-brand-catalog-production-qa.cjs` chạy bởi workflow `.github/workflows/aqua-brand-catalog-production-qa.yml` khi tạo `qa-requests/brand-catalog-production.json` với `sha` production chính xác. Phải xác minh 20 brand route, 157 source/target product identity, giá, gallery media origin, hình ảnh, phân trang, sorting, SEO, product detail, recently viewed, desktop 1440/mobile 390; testcase FKSC rỗng.

## Chốt tiến độ

- `SOURCE_INVENTORY_PASS`: Có.
- `DATA_PARITY_PASS`: Đang chạy.
- `NAV_PARITY_PASS`: Cần kiểm thử lại sau import (menu WordPress cũ đã đúng).
- `VISUAL_PARITY_PASS`: Chưa, chờ QA production.
- `DEPLOYED_PRODUCTION`: Chưa áp dụng cho dữ liệu mới.
- `QA_PASS`: Chưa.
