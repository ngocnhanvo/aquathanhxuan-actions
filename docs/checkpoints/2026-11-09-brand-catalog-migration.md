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

- **Batch A PASS** (job `brand-a` trong run 42579994450): `expected=33, created=24, reused=9, category_linked=9, failed=0`. Chihiros 14, Continuum Aquatics 5, Dennerle 13, Eheim 1 đã đủ trong WordPress; 9 reused là sản phẩm có sẵn ở danh mục khác, không tạo trùng.
- **Batch B kết thúc PARTIAL** (run [42579994450](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42579994450)): `expected=36, created=34, reused=0, failed=2`. Hai nguồn lỗi:
  - Source Product 3178 `su-ista-active-bio-pearl`: media ID 266663 ảnh `Thiet-ke-chua-co-ten-2024-05-19T115829.070.png` HTTP 404 trên source, kể cả thumbnail và tất cả kích thước srcset. Product chưa tạo tại WP đích.
  - Source Product 15280 `bom-jecod-fa-1000`: ảnh đầu `Thiet-ke-chua-co-ten-34.png` xung đột filename/hash với media ID 82763 trên WP đích; source có ba ảnh gallery khác hợp lệ. Không ghi đè, không đổi tên; Product chưa tạo.
- **Hai Product B bị hoãn đã được phục hồi thành công** qua run [42585734376](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42585734376) PASS: ISTA nguồn `3178` → WP `82944` và JECOD nguồn `15280` → WP `82945`. Tên, category, giá, kho, SEO, locale đều read-after-write.
  - ISTA `su-ista-active-bio-pearl`: ảnh gốc, thumbnail và tất cả srcset trên source **404**; WP Product hiển thị placeholder, lưu metadata/cảnh báo `_esc_source_media_deferred`. Không tự gán ảnh sản phẩm khác.
  - JECOD `bom-jecod-fa-1000`: đúng **3 ảnh mà trang chi tiết web gốc đang hiển thị**, giữ nguyên filename, nguồn WP đã xác minh SHA256 bằng 3 Media ID `82867, 82866, 82869`. File phụ Store API `Thiet-ke-chua-co-ten-34.png` bị xung đột khác hash, tuyệt đối không ghi đè hoặc mạo nhận.
  - Như vậy **36/36 Product Identity của batch B đã có**; media source parity của ISTA vẫn là `ASSET_DEFERRED`. Không tuyên bố hoàn tất 100% gallery.
- **Batch C/D tiếp tục độc lập** bằng run [42583628239](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42583628239) do B partial không được chặn các record độc lập. Workflow `.github/workflows/aqua-brand-catalog-remaining.yml`. Không chạy song song ghi cùng ảnh trong một job.
- Lượt chẩn đoán read-only 42584186049 xác minh image gốc ISTA thật sự HTTP 404 mọi kích thước, gallery JECOD có ba ảnh hợp lệ. `ASSET_DEFERRED` phải được duy trì, không tuyên bố đủ media.
- Đã có snapshot đối chiếu độc lập run [42581260357](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42581260357) PASS tại 07:47 UTC: Chihiros đủ 14, Continuum đủ 5, Dennerle đang 8/13.

- Script: `scripts/aqua-brand-catalog-migrate.py` (độc lập, idempotent), workflow `.github/workflows/aqua-brand-catalog-migrate.yml` với 4 job nối tiếp.
- Run ban đầu [42579877867](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42579877867) fail tại `python -m py_compile` do typo; **không có ghi WordPress** ở run đầu.
- Run tiếp theo [42579994450](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42579994450) chạy batch A rồi tự chuyển batch B/C/D nếu tất cả PASS.
- Script có phạm vi ghi tối thiểu: product đơn giản theo source slug/source ID → category có sẵn; không ghi đè sản phẩm đang có; ảnh gốc tải về Media giữ filename/kiểm tra SHA256 trước tái dùng; nhập giá/giảm giá/trạng thái kho/nội dung/SEO Yoast/ACF product_lang; read-after-write. Ghi JSON trạng thái & deferred vào artifact `aqua-brand-catalog-<batch>`.
- Nếu có lỗi ở job, đọc `BRAND_PRODUCT_FAILED`, `BRAND_ASSET_DEFERRED` và `BRAND_MIGRATION_RESULT`; sau sửa phải rerun idempotent. Không dùng fake products, không tự xóa dữ liệu. Script tải ảnh đã được cập nhật giới hạn retry hữu hạn sau khi run hiện hành khởi động; rerun mới áp dụng.
- **Chưa đánh dấu DATA_PARITY_PASS khi run chưa xong**.

## Cập nhật bổ sung — 09/11/2026, từ 15:42 giờ Việt Nam

- Batch D [42586832096](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42586832096) kết thúc `PARTIAL`: `expected=38, created=28, reused=4, category_linked=4, failed=6`. Các source Product ID cần xử lý: `265594,265379,265293,265292,265290` (trùng basename/khác SHA256); `184` (ảnh source HTTP 404).
- Batch C source 10 IDs đang phục hồi bằng size variants *thật từ source WordPress media_details*: [run 42588861095](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42588861095), workflow `aqua-brand-collision-rescue.yml`. Không ghi đè/rename file gốc; metadata `source_media_variants` ghi ngoại lệ original full-size collision. Đã sửa fallback ảnh trong description theo source media ID cùng sản phẩm.
- Batch D 5 IDs tên ảnh xung đột đã gửi [run 42589466504](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42589466504), chờ chung `concurrency.group=aqua-brand-catalog-writes` với C. Script `scripts/aqua-brand-d-collision-rescue.py` chỉ nhận đúng 5 IDs.
- Source Product `184` (`seachem-matrix-0-5`) đã được xác minh [run 42589471431](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42589471431): media ID `266903`, `src` và **tất cả ảnh resized** (300x199, 1024x678, 768x509, 600x398, 300x300) HTTP 404 trên chính source. Gửi script phục hồi gốc, không dùng ảnh giả: [run 42589893222](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42589893222). QA phải chấp nhận ngoại lệ `sourceMediaDeferred:184`, vẫn kiểm tra giá/slug/category/meta.
- Lượt inventory độc lập [42588537709](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42588537709) PASS: `157` memberships nguồn, `138` đã có ở WordPress tính tại thời điểm đọc, `19` missing (C=10; D=9 tại lúc đang nhập), **0 price mismatches** trong từng category. Con số thay đổi khi D và recovery chạy, phải kiểm kê lại trước build.
- Chưa đánh dấu QA/DATA_PARITY/DEPLOY_PASS cho toàn bộ thương hiệu cho tới khi cả 157 memberships và permalink/ảnh đại diện (ngoại lệ source 404) được xác minh.

## Đã nghiệm thu phục hồi batch C — 09/11/2026

- **C: PASS 10/10** [run 42591540748](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42591540748): `created=10, reused=0, failed=0, deferred_ids=[]`. Kết hợp batch C ban đầu `31/41` → đã đủ **41/41**.
- Khi tên ảnh gốc đụng Media ở tháng upload hiện tại, batch C tạo **bản ghi nháp tạm**, chọn tháng/năm gốc, nạp *byte ảnh thật* vào thư mục lịch sử, xác minh SHA256, tách ảnh khỏi nháp và **xóa nháp tạm**. Log có `BRAND_MEDIA_SOURCE_MONTH_UPLOADED` và `BRAND_TEMP_POST_CLEANUP_PASS` cho mọi ảnh cần backdate; không ghi đè ảnh khác hash. Media `.mp4` đi cùng source cũng được nhập đúng loại file khi source có.
- **D: đang chạy** bản sửa cùng cơ chế cho 5 Product [run 42591602696](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42591602696); trước đó batch D `32/38`, Seachem Product `184` đã được phục hồi riêng thành công vào WP `83068` qua [run 42589893222](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42589893222), với media `SOURCE_IMAGE_AND_ALL_DERIVATIVES_HTTP_404` và placeholder đúng.
- Astro `master` `7d8ee2f15d5375a50432a0e329f05ec7a31a8422` đã sửa chi tiết WooCommerce lấy giá hiện hành thay vì trường domain registration; unit QA [42590655716](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42590655716) PASS.
- **Chưa deploy production**; chờ D, inventory lại, Rewrite scope, production build, Playwright desktop/mobile cùng permalink QA. Không coi Unit QA/Writer PASS là QA production.

## Hoàn tất import sản phẩm batch A/B/C/D

- Batch C phục hồi 10/10: [run 42591540748](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42591540748), tất cả 10 source Product đã tạo, 0 lỗi, giữ nguyên tên file/thư mục tháng nguồn, cleanup nháp tạm PASS.
- Batch D phục hồi 5/5: [run 42591602696](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42591602696), tạo tất cả `265594,265379,265293,265292,265290`, 0 lỗi; cộng với 32 bản ghi trước đó và Product `184` `83068` từ run 42589893222 → **38/38**.
- Cộng các batch và Atman dự kiến `9+33+36+41+38=157` lần hiện diện danh mục thương hiệu. Phải dựa vào inventory độc lập, **không coi cộng số importer là DATA_PARITY_PASS**.
- Astro `master` hiện `bc1ebedbe4ed0df5dd180c8f3fa38debc9e9b62d` đã sửa thêm label vật lý `Giá` (thay `Giá đăng ký`) cùng giá thực. Unit workflow [42593709890](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42593709890) PASS.
- **DATA_PARITY_PASS**: độc lập run [42593789909](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42593789909) `completed/success`. Đã đối chiếu 20 brand categories, `sourceProducts=157,targetProducts=157,missing=0`, mỗi brand có `priceMismatchCount=0`.
- Các ảnh nguồn mất thật `3178` ISTA và `184` Seachem vẫn phải `SOURCE_MEDIA_DEFERRED` dù có đủ Product bản ghi. JECOD `15280` dùng đúng 3 ảnh đang hiển thị trên trang nguồn, không đổi file phụ trùng hash khác.

## Link chi tiết, build và QA — tiếp theo

- Atman đã có một WordPress Rewrite scoped (post ID 82743). Các sản phẩm brand mới cũng cần Rewrite có giới hạn slug, nếu không `/san-pham/<product-slug>` bị route nhầm category và lỗi 500.
- Script chuẩn bị `scripts/aqua-brand-product-routes-create.cjs`, workflow `.github/workflows/aqua-brand-product-routes-create.yml`; chạy **sau khi cả 4 batch import PASS** bằng tạo `cms-requests/brand-product-routes.json`. Script chỉ tạo 4 Regex Rewrite native WordPress `^/san-pham/(real-slugs)/?$` → `/ssr/products/$1/detail`, preflight toàn bộ products tồn tại. Không đụng link danh mục, không ghi đè Atman.
- Build Astro bằng **workflow production đang có** `Aqua Thanh Xuân Astro deployment (WordPress Build Website only)` từ đúng master/head; không tạo pipeline thứ 2. Pipeline gần nhất trước migration thành công run 42577878332.
- QA sau deploy: `scripts/aqua-brand-catalog-production-qa.cjs` chạy bởi workflow `.github/workflows/aqua-brand-catalog-production-qa.yml` khi tạo `qa-requests/brand-catalog-production.json` với `sha` production chính xác. Phải xác minh 20 brand route, 157 source/target product identity, giá, gallery media origin, hình ảnh, phân trang, sorting, SEO, product detail, recently viewed, desktop 1440/mobile 390; testcase FKSC rỗng.

## Rewrite, production pipeline và QA — kết quả đang chạy

- WordPress native product Regex Rewrite writer [42594217244](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42594217244) **PASS**: 148 source occurrences = 148 distinct product slugs, đã preflight từng sản phẩm đích, tạo 4 quy tắc `chuyen-huong-link` ID `83150` (A33), `83151` (B36), `83152` (C41), `83153` (D38). Regex chỉ match danh sách sản phẩm nguồn chính xác, target `/ssr/products/$1/detail`; không ảnh hưởng category/Atman URL.
- Source Astro `master` `bc1ebedbe4ed0df5dd180c8f3fa38debc9e9b62d`; unit QA [42593709890](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42593709890) PASS.
- Trigger `cms-requests/brand-catalog-build.json` → [dispatch 42595061526](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42595061526) PASS, đã kích **duy nhất** existing `aquathanhxuan-production-deploy.yml` qua `wp_trigger_build`.
- **BUILD_SUCCESS + PRODUCTION_ACTIVATION_PASS:** run [42595077807](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42595077807) `completed/success`; compile, package, FTPS upload và signed PHP staging activation đều success. `DEPLOY_READY` theo public marker/SHA sẽ được bộ QA xác nhận riêng.
- QA sau deploy bằng `scripts/aqua-brand-catalog-production-qa.cjs`: 20 brand category routes, 157 nguồn, Media, Yoast, tất cả public Product permalinks có **Product detail markup** (không chỉ 200), sorting, banner, recently-viewed, title, overflow, source/target screenshots 1440x900 và 390x844; ghi exceptions cho ảnh source missing 184/3178 và JECOD 15280. Khởi chạy sau production PASS, không trộn trigger với kết quả.

- Production browser QA đang chạy run [42595915988](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42595915988), riêng desktop/mobile/URL/SEO; chưa đánh dấu QA_PASS trước kết quả.

## QA production — phát hiện và sửa đếm gallery

- Lượt QA đầu [42595915988](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42595915988) FAIL tại Atman `may-sui-khi-atman-hp-12000`, assert so sánh *độ dài thô* `product.images` của nguồn với target. `TEMP_DRAFT_CLEANUP_PASS` và marker source chính xác trước khi assert.
- Kiểm toán đọc độc lập [42596581622](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42596581622) PASS: Woo Store API nguồn **lặp ảnh chính** trong array gallery. HP-12000 source có 4 entries nhưng **3 URL/filename khác nhau**, target có đủ 3; nhiều sản phẩm Atman khác có 2-3 entries nhưng chỉ 1-2 URL duy nhất. Nội dung HTML full/short đã được enrich sau khi migrate. Không ghi thêm media trùng.
- QA script đã sửa so **mọi URL ảnh nguồn duy nhất + filename** với WordPress target, vẫn fail nếu thiếu một ảnh duy nhất. Workflow test lại [42596794623](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42596794623). Production Astro không thay đổi; không build lại khi chỉ test sửa.
- QA vẫn phải kiểm tra 20 brand, 157 memberships, Product detail cho từng URL, layout/banner/sort/recent, 1440/390px và ảnh nguồn exception.

## QA ảnh gallery sau deploy — 17:02–17:05, 09/11/2026 (Asia/Ho_Chi_Minh)

- [QA production 42595077807](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42595077807) **BUILD/UPLOAD/ACTIVATION PASS** ở Astro SHA `bc1ebedbe4ed0df5dd180c8f3fa38debc9e9b62d`; không build lại cho dữ liệu WordPress nếu không cần.
- [QA 42596794623](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42596794623) **FAIL** có thật tại `hanging-kits-bo-kit-treo-den-wrgb2-pro-chihiros`, nguồn 3 ảnh duy nhất nhưng đích 1. Atman duplicate-source-array QA đã khắc phục bằng unique source filenames (audit 42596581622).
- Inventory độc lập [42597184215](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42597184215) PASS xác nhận `157/157` sản phẩm đúng danh mục/giá; 20 categories. Chỉ **6 sản phẩm có 9 ảnh gallery nguồn thật còn thiếu** ngoài 3 ngoại lệ cũ:
  - Chihiros source Product `267097`: thiếu `Thiet-ke-chua-co-ten-58.png`, `Thiet-ke-chua-co-ten-60.png`; `267093`: thiếu `Thiet-ke-chua-co-ten-59.png`, `Thiet-ke-chua-co-ten-60.png`.
  - Dennerle `234252`: thiếu `Thiet-ke-chua-co-ten-85.png`; `36878`: thiếu `Thiet-ke-chua-co-ten-85.png`, `ScapersSoil_DENNERLE_AQUA-THANH-XUAN-1.jpg`; `15166`: thiếu `Thiet-ke-chua-co-ten-2024-05-18T160104.453.png`; `15117`: thiếu `Thiet-ke-chua-co-ten-2024-05-18T160124.275.png`.
  - 3 ngoại lệ nguồn đã xác minh: Product 3178 ISTA ảnh nguồn HTTP404, Product 184 Seachem ảnh nguồn HTTP404; Product 15280 JECOD Store API thêm file không nằm trong gallery công khai và bị filename collision khác hash; không thay bằng ảnh giả.
- Script phục hồi idempotent `scripts/aqua-brand-catalog-collision-rescue.py` thêm profile khóa chặt `brand-gallery-six` với 6 ID và danh mục `thuong-hieu-chihiros,thuong-hieu-dennerle`; giữ nguyên cover, không ghi đè Media khác hash; sử dụng ảnh gốc theo thư mục tháng/năm nếu cần; dọn nháp tạm sau upload.
- **GALLERY_WRITER_PASS:** [42598203773](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42598203773) hoàn thành `status=PASS, expected=6, created=0, reused=6, failed=0, deferred_ids=[]`; mỗi Product được thêm đúng ảnh thiếu: Chihiros 2+2, Dennerle 1+2+1+1 = **9 ảnh**. Ảnh gốc được kiểm tra SHA256, WordPress temp cleanup PASS. Không chạm 157 Product identity hay ảnh cover đã có.
- **READONLY_GALLERY_AUDIT_IN_PROGRESS:** [42598746988](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42598746988) đối chiếu source–target cho 20 brand + 157 source memberships; yêu cầu `galleryUnresolved=[]` (ngoại trừ 3 source-media exceptions 184/3178/15280 đã xác minh). Kế tiếp: sau khi audit PASS **phải rebuild Astro** vì runtime SSR Products archive đọc từ `cms-products.json` *được đóng gói tại build*, không phải dữ liệu CMS mới mỗi request. Dùng duy nhất existing production pipeline, rồi chạy lại QA browser desktop/mobile toàn bộ danh mục.

## Production rebuild sau đồng bộ gallery

- Inventory [42598746988](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42598746988) **PASS:** `source=157,target=157,missing=0,galleryUnresolved=[]`, còn 3 source-media exceptions nguồn đã có bằng chứng.
- Do `src/pages/san-pham/[...parts].astro` đọc `cms-products.json` từ snapshot build nên phải chạy lại production pipeline sau sửa gallery (không chỉ cập nhật WordPress).
- Dispatcher lần 1 [42599186749](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42599186749), lần 2 [42599487661](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42599487661) cùng `completed/success` nhưng GitHub không tạo *bất kỳ* `repository_dispatch` production run; kiểm tra danh sách runs đã xác nhận.
- Sửa đúng `.github/workflows/aqua-brand-catalog-dispatch-production.yml` để dùng secret token `SOURCE_REPO_PAT` đã có thay token mặc định `GITHUB_TOKEN`, thêm `request_id` (không thay production workflow, SHA, target, rollback hay lock); dispatcher [42599830507](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42599830507) PASS, sản sinh **production run thật** [42599850218](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42599850218).
- Astro nguồn đúng SHA `bc1ebedbe4ed0df5dd180c8f3fa38debc9e9b62d`; prod run 42599850218 đang chạy tại thời điểm ghi. Tiếp theo: verify build/FTPS/activation status PASS, rồi chạy lại `scripts/aqua-brand-catalog-production-qa.cjs` (update `qa-requests/brand-catalog-production.json`) và khắc phục fail thật đến PASS.

## Production phát hành đủ gallery và QA cuối — 09/11/2026

- Writer gallery [42598203773](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42598203773) **PASS 6/6**; inventory [42598746988](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42598746988) **PASS:** 157/157 sản phẩm, `galleryUnresolved=[]`.
- Trigger build bằng GITHUB_TOKEN (2 lượt 42599186749 / 42599487661) nhận HTTP success nhưng GitHub không tạo production run; chẩn đoán bằng danh sách `repository_dispatch` jobs. Sửa `aqua-brand-catalog-dispatch-production.yml` dùng secret `SOURCE_REPO_PAT` của chính repo Actions và payload thêm `request_id=context.sha`. Dispatcher [42599830507](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42599830507) **PASS** và tạo production run thật.
- Rebuild nguyên pipeline production cũ [42599850218](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42599850218) **PASS**; log `Products.ts xong (157 changed, logs)`, gồm compile, FTPS, signed activation. Astro SHA giữ `bc1ebedbe4ed0df5dd180c8f3fa38debc9e9b62d`; mã frontend không cần thay.
- Browser QA [42600653497](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42600653497) **IN_PROGRESS** tại lúc ghi; kiểm tra tất cả public Product links, 157 CMS identities, 20 category pages, gallery sửa của 6 Product ở frontend, banner/sort/recently viewed, source/target 1440/390 và ngoại lệ source image 184/3178/15280.
- **Không báo DONE nếu QA chưa PASS.** Nếu QA fail, đọc `BRAND_CATALOG_PRODUCTION_PARITY_FAIL`, khắc phục đúng lỗi, rerun QA; không build lại nếu chỉ thay script QA.

## Chốt tiến độ

- `SOURCE_INVENTORY_PASS`: Có.
- `DATA_PARITY_PASS`: Có — inventory 42593789909.
- `NAV_PARITY_PASS`: Cần kiểm thử lại sau import (menu WordPress cũ đã đúng).
- `VISUAL_PARITY_PASS`: Chưa, chờ QA production.
- `DEPLOYED_PRODUCTION`: Có — build/deploy run 42595077807 success, chờ public marker QA.
- `QA_PASS`: Chưa.
