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

## Đã hoàn tất lô đầu và kiểm toán menu con (mốc tiếp nối)

- [Run import #42663313074](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42663313074): pilot 3/3 PASS; `import (0)` **PASS** 19 selected / 6 created / 13 reused / 10 category linked / failed=0; `import (1)` **PASS** 31 selected / 19 created / 12 reused / 11 category linked / failed=0. Gộp theo source ID sau pilot: **50 processed, 28 mới, 22 có từ trước** (3 pilot-created được tái sử dụng ở batch0); 11 lô còn lại chưa kết thúc tại mốc này.
- [Read-only menu gap audit #42666095893](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42666095893): 6 mục header con không có Woo child term tương ứng trên source: Eheim (Máy lọc), Đèn UV (Phụ kiện), Bonsai (Đá/Lũa/Cát), Bể đúc (Bể kính), Contro Soil (Nền), Cá thủy sinh (Sinh vật). Những term này tồn tại ở WordPress đích, không tự xóa/sửa menu.
- [Source ID verification #42666557375](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42666557375): Product nguồn `5054 / den-uv-30w / Đèn UV Gebo 30W` (400.000đ, 2 ảnh, categories `[]`), `4355 / den-uv-40w / Đèn UV Gebo 40W` (460.000đ, 2 ảnh, categories `[]`) và `3321 / cay-bonsai-to / Cây Bonsai` (490.000đ, source category Đá ID 2058, no source cover) là identity đã kiểm chứng. Hai UV không thuộc 389 Product của 9 source roots do không có category nguồn. Cây Bonsai đã thuộc 389, chỉ cần thêm liên kết target menu Bonsai.
- Các kết quả nguồn khác: Eheim có 2 Product name candidates nhưng thuộc source Sứ lọc và Máy sưởi, không phải Máy lọc; Bể đúc, Contro Soil, Cá thủy sinh không có exact title candidates. Không tự gán SKU theo tên suy đoán.
- Đã chuẩn bị nhưng **CHƯA kích hoạt** `scripts/aqua-special-menu-product-migrate.py` + `scripts/aqua-special-uv-product-routes.cjs` + `.github/workflows/aqua-special-menu-products.yml`: nhập đúng 2 UV source Product và tạo route của chúng, đồng thời liên kết đúng `Cây Bonsai` vào category target 1841, bảo toàn category Đá gốc 1839. Chỉ tạo request `cms-requests/special-menu-products.json` **sau khi toàn bộ import 389 + verify PASS**.
- Đã chuẩn bị `scripts/aqua-remaining-catalog-production-qa.cjs` cùng các workflow data QA/prod QA: dự kiến so độc lập 389 source/target Product, dữ liệu WooCommerce, SEO Yoast và 36 checks browser (9 root + 9 detail × desktop/mobile); **chưa được chạy**.

## Tiếp tục 2026-11-10 — tám lô PASS và kiểm thử sớm

- [Import #42663313074](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42663313074): preflight + pilot 3/3 PASS; batches 0..7 đều PASS. Tổng scoped 237 Product ID được xử lý (143 Created trong matrix + 94 Reused, trong số reused có 3 Product đã Created từ pilot); tính từ trước toàn đợt: **146 Product mới / 91 Product đã tồn tại**, 88 lần cập nhật liên kết danh mục, failed=0. Batches 8/9 đang in_progress, 10/11/12 queued tại thời điểm ghi; tuyệt đối không đánh dấu toàn bộ DONE.
- Đã thêm QA độc lập `scripts/aqua-remaining-catalog-production-qa.cjs` với chế độ `AQUA_QA_BATCHES` để so sánh Product đã nhập trước khi mọi lô hoàn tất; trong Production mode bắt buộc kiểm tra đủ 389 và 36 browser cases.
- [Early QA #42675861683](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42675861683) gặp lỗi kiểm kê slug lặp do WooCommerce phân trang theo mặc định khi importer đang thêm Product song song. Chưa chứng minh là duplicate record; **không xóa / sửa CMS từ kết quả này**. Đã sửa QA thành phân trang `orderby=id&order=asc`, cho phép lặp lại cùng ID qua hai trang nhưng chặn slug thuộc hai ID khác nhau; chạy lại [#42676337353](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42676337353) (đang chạy tại checkpoint).
- QA production bổ sung yêu cầu Product published và catalog_visibility không hidden; mọi Product card của 9 root category phải có target ID nằm trong tập source đã kiểm chứng, không lặp ID.
- Chỉ tạo `cms-requests/remaining-product-routes.json` khi import 13 batch + verify của #42663313074 thành công. Tiếp theo kích `cms-requests/special-menu-products.json` cho 2 UV và Bonsai, QA toàn bộ 389 + SEO, build production bằng pipeline hiện hành, browser QA 36 checks.
- Trạng thái: **PARTIAL — chưa hoàn tất**.


## Kiểm thử độc lập hai đợt — 270/389 nguồn Product PASS

- [Read-only QA 7 lô đầu #42676337353](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42676337353) **success**: 210 Product ID chính xác, price/regular price, stock status, source child taxonomy, mô tả, 210 SEO titles khớp; source SEO metadesc không tồn tại cho 210/210.
- [Read-only QA lô 7,8 #42677338267](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42677338267) **success**: 60 Product khác, price/regular price, stock, taxonomy, mô tả và 60 SEO titles khớp, không có SEO metadesc nguồn; source list toàn bộ 389 nhưng chỉ audit ID modulo 13 thuộc 7,8.
- Tổng **270/389 Product IDs đã qua independent source-target parity**, không chỉ qua write confirmations. Trong report `AQUA_REMAINING_TARGET_PAGING` id-ascending không có slug/ID collision.
- Import workflow #42663313074: **9/13 lô PASS** (0..8), batches 9/10 in progress, 11/12 queued, verify full chưa chạy tại mốc này.
- No production route/build/36-case browser QA fired. Still PARTIAL.

## QA 299/389 và tăng coverage submenu

- [Early QA batch 9 #42678118188](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42678118188) **PASS**: thêm 29 Product IDs xác minh giá hiện tại/gốc, tồn kho, source category, short/long descriptions và 29 Yoast SEO title; không có source SEO metadesc. Tổng **299/389 source Products** đã QA độc lập tính cả các batch 0..9, còn 90 Product ở các batch 10..12 chưa chạy xong.
- [Import workflow #42663313074](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42663313074): 10/13 batch PASS (0..9), 10/11 in progress, 12 queued tại mốc này. Không có batch failed trong 10 batch PASS.
- `scripts/aqua-remaining-catalog-production-qa.cjs` đã tăng từ 36 lên **134 browser cases**: 9 danh mục gốc + 9 source detail + 3 exact verified special details (2 Gebo UV + 1 Cây Bonsai) + **46 danh mục con nguồn** trên desktop/mobile. QA source taxonomy được xác minh bằng source ID và Product card Woo ID, không chỉ HTTP 200.
- `scripts/aqua-remaining-product-routes.cjs` và UV route script chỉ xem rule đã published/enabled là "covered", không tái dùng draft/disabled rule. **Chưa trigger URL writers**, vẫn chờ import + verify PASS.
- Trạng thái: PARTIAL — chưa hoàn tất.

## Tiếp nối 2026-11-10 — mười lô PASS và QA 299/389

- [Import #42663313074](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42663313074): batches **0..9 / 13 PASS**, không batch FAILED; batches 10, 11 còn `in_progress`, 12 `queued`. Chưa có job `verify` toàn bộ, không tạo Rewrite/UV khi thiếu gate.
- [Read-only QA #42678118188](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42678118188) **SUCCESS**: batch 9 **29/29** parity Product price, regular price, stock, category, mô tả dài/ngắn, SEO source title → Yoast 29/29; source không có metadesc 29 item.
- Cộng kết quả QA độc lập không trùng: batches 0..6 **210** + batches 7..8 **60** + batch 9 **29** = **299/389**. Còn batches 10,11,12 chưa nghiệm thu.
- Sau import 13/13 + `verify` PASS: tạo `cms-requests/remaining-product-routes.json`, rồi `cms-requests/special-menu-products.json` cho 2 UV + Bonsai, tiếp `qa-requests/remaining-catalog-data.json`, production Astro build theo pipeline hiện có và `qa-requests/remaining-catalog-production.json`.
- Không nhập lại lô thành công, không thay ảnh giả cho nguồn 404. Trạng thái **PARTIAL — chưa hoàn tất**.

## Tiếp nối 2026-11-10 — batch 10 PASS, 329 Product đã xử lý

- [Import #42663313074](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42663313074): **11/13 batches PASS (0..10)**, batch 11 và 12 `in_progress`, toàn bộ `verify` chưa bắt đầu. Không có batch nào FAILED trong các batch đã xong.
- Batch 10: `AQUA_REMAINING_MIGRATION_RESULT` PASS, expected **30**, created **21**, reused **9**, category_linked **8**, failed **0**. Một số ảnh URL nguồn HTTP 404 đã được ghi ASSET_DEFERRED, không thay hình giả.
- Tổng đã đi qua 11 batch PASS: **329/389** source Product ID (0..10). Tổng đã QA độc lập: **299/389** (batches 0..9). Chưa được coi là full DATA_PASS.
- [Checkpoint commit](https://github.com/ngocnhanvo/aquathanhxuan-actions/commit/3a26f03e5c22d340596c5494be2e64c534e5e4a9) đã lưu tình trạng 10/13; cập nhật này ghi bổ sung 11/13 và media deferred.
- Các bước chưa thực hiện: verify 389 → tạo native Rewrites → 2 UV + Bonsai → QA 389 → production Astro pipeline → browser QA.
- Trạng thái: PARTIAL — chưa hoàn tất.

## Tiếp tục 2026-11-10 — 12/13 batch PASS, 356/389 QA

- Import [#42663313074](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42663313074): **12/13 batches 0..11 PASS**; batch 12 vẫn chạy, `verify` chưa được queued. Không lặp batch đã PASS.
- Batch 11 `AQUA_REMAINING_MIGRATION_RESULT`: expected 27, created 18, reused 9, category_linked 8, failed 0. Batches 0..11 đã nhập/xử lý **356/389** Product IDs.
- QA independent [#42679696661](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42679696661) **PASS 30/30** của batch 10, source SEO title 30/30, metadesc không có nguồn; [#42680375081](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42680375081) **PASS 27/27** của batch 11, SEO title 27/27. Tổng QA không trùng batch 0..11: **356/389** Product IDs.
- Tiếp tục gate: job batch 12 SUCCESS -> verify 389 unique source ID/category SUCCESS -> Native Rewrites -> special 2 UV + Bonsai -> full DATA_ONLY QA -> production Build Website -> 134 browser checks. Chưa trigger CMS writers/production trong mốc này.
- Trạng thái: PARTIAL — chưa hoàn tất.

## Tiếp tục 2026-11-10 — 13/13 batch PASS, verify đang chạy

- [Run #42663313074](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42663313074) đã **PASS 13/13 import batch** (0..12), mỗi batch 0 errors; batch cuối 12 expected 33, created 21, reused 12, category_linked 12, failed 0. 389/389 Products đã được importer xử lý nhưng **chưa công bố DATA_PASS** khi `verify` cuối còn in_progress.
- QA độc lập đã PASS 356/389 Product (batches 0..11): #42676337353 (210), #42677338267 (60), #42678118188 (29), #42679696661 (30), #42680375081 (27). Batch 12 chưa có QA độc lập; job `verify` đang đọc nguồn/đích.
- Chỉ khi `verify` job SUCCESS và toàn bộ run SUCCESS mới tạo request `cms-requests/remaining-product-routes.json`; tiếp theo 2 UV + Bonsai, full QA, production build, 134 browser cases. `ASSET_DEFERRED` tiếp tục giữ nguyên chứng cứ media gốc HTTP 404.
- Trạng thái: PARTIAL — chưa hoàn tất.
