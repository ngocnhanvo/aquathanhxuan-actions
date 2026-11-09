# Aqua Thanh Xuân — nhập sản phẩm thực từ menu Đèn

- Thời điểm: 2026-11-09 (Asia/Ho_Chi_Minh)
- Project: aquathanhxuan.com — `ngocnhanvo/aquathanhxuan-actions` main
- Source WordPress: https://aquathanhxuan.com
- Destination WordPress: https://admin.aquathanhxuan.io.vn
- Frontend: https://aquathanhxuan.io.vn
- Astro source: `ngocnhanvo/aquathanhxuan-astro` master @ `beb08cf9c402b53c0ffe603dd540f98ab6082e04` (unchanged so far)
- Cổng ghi: bypass; mode: auto-build

## SOURCE_INVENTORY_PASS

Run [42627591343](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42627591343) completed/success:
- Root Đèn source ID 1546, destination 1768, 59 storefront Products (simple), 24 existing, 35 missing.
- WeekAqua source cat 1525 → target 1813 `den-weekaqua`: 4 source, 3 missing.
- Chihiros 1482 → 1814 `den-chihiros`: 8 source, 5 missing.
- Neo Helios 1545 → 1815 `neo-helios`: 7 source, 0 missing.
- Xuanmailong 1526 → 1816 `xuanmailong`: 15 source, 15 missing.
- Kaokui 2175 → 1817 `kaokui`: 2 source, 0 missing.
- Odyssea 2176 → 1818 `odyssea`: 6 source, 6 missing.
- Phụ kiện đèn source 1524 `phu-kien-do-thay-the-den` → target 1792 `den-phu-kien`: 7 source, 1 missing.
- 7 child category occurrences overlap root; total unique remains 59. All 59 are simple Product.
- Original assets, descriptions, stock, price and Yoast title/meta description are copied only from actual source. No synthetic metadata or image.

## CMS migration, initial attempt

- Import workflow [42628551840](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42628551840) — batch 0 PARTIAL, batch 1/2 skipped due needs dependency.
- Batch 0: `expected=23, created=12, reused=6, category_linked=5, failed=5`. Source Product IDs `1815` (no Store image), `3054,3057,3060,3063` (source original image HTTP404), no incorrect placeholder media uploaded.
- Proven image collision case source ID `265482` handled via original 2022-05 folder with SHA256 verification and `TEMP_POST_CLEANUP_PASS`, no overwritten image.
- Content/media enriched on existing source ID `269193` (Neo Helios).
- Continue independent remaining batches 1/2 via [42630053730](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42630053730) — IN_PROGRESS at checkpoint save. Do not repeat successful batch 0; separate failed IDs for recovery.
- Read-only source media diagnostic for 5 IDs via [42630327380](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42630327380) — IN_PROGRESS at checkpoint save.

## Next gates and constraints

1. Read complete results from remaining batch 1/2 and media diagnostic; continue non-dependent products even if one source image fails.
2. Recover only verified source-media-deferred Products without fabricating pictures; if real resized image belongs to same WP attachment and works, import that; if original and variants 404, create truthful Product record with documented deferred asset metadata.
3. Re-run independent WooCommerce category/slug/source-id/price/stock parity for all 59, preserve existing media/content and category relationships.
4. Only after all target products verified: execute scoped native WordPress `chuyen-huong-link` Rewrites using prepared `scripts/aqua-light-product-routes-create.cjs` + `cms-requests/light-product-routes.json`, preflight all source Product IDs.
5. Trigger only existing Astro production pipeline for `beb08cf9...` via approved build request. Verify build success and public marker SHA.
6. Execute `scripts/aqua-light-catalog-production-qa.cjs` via `qa-requests/light-catalog-production.json` and check desktop 1440/mobile 390, category cards and product data, record screenshots.
7. Record final result and overwrite `chatgpt/latest-response.md`.

Current status: **PARTIAL — import in progress; not production QA PASS**.


## Tiến độ tiếp tục từ 21:11 (Asia/Ho_Chi_Minh)

- Batch 2 chạy độc lập [42632639554](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42632639554): 19 source IDs; **created 7, reused 7, linked 5, deferred 5**, log complete. Không nhập lại 14 bản ghi thành công.
- 5 ngoại lệ batch 2: source ID `1814` (không có ảnh), `3056,3059,3062` (2 file gốc HTTP 404), `350144` Kaokui (WordPress tự đổi basename `kaokui2-300x300.jpg` → `-1.jpg`, phải phục hồi đúng filename).
- Như vậy source-media missing riêng biệt từ cả ba batch là **13 Product IDs**: `1814,1815,1816,3052,3054,3056,3057,3058,3059,3060,3061,3062,3063`. Không lấy ảnh gợi ý sản phẩm khác làm ảnh sản phẩm. Chỉ ghi `_esc_source_media_deferred` khi chứng cứ 404/không có cover đã xác minh.
- Recovery 9 records batch 0/1: [42632797438](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42632797438), đã được gửi và đang chạy khi cập nhật.
- Recovery 4 records batch 2: [42634349942](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42634349942), đã gửi và đang đợi lock ghi WordPress.
- Sửa importer `aa590238`: nhánh upload đổi tên sẽ dọn attachment vừa tạo, có fallback upload đúng year/month và checksum; thêm điều kiện cho phép tái chạy chỉ source ID `350144`, bảo vệ các source ID khác. Workflow `aqua-light-kaokui-repair.yml` và `aqua-light-kaokui-orphan-cleanup.py` đã chuẩn bị nhưng CHƯA kích khi hai recovery còn chờ.
- QA `scripts/aqua-light-catalog-production-qa.cjs` bổ sung đối chiếu SEO title, description, short/full product description từ HTML legacy và meta Yoast đích trên toàn bộ 59 sản phẩm. Chưa thể chạy trước đủ 59 records.
- Trạng thái: **PARTIAL — chưa hoàn tất**. Sau recovery 13, chạy Kaokui 350144, inventory 0 missing, native Rewrites, build Astro production và QA live 8 danh mục trên desktop/mobile.

## Tiếp tục nghiệm thu — các cổng đã PASS (2026-11-09)

- **Kaokui** source Product `350144`: run [42638590689](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42638590689) completed/success; importer `expected=1, reused=1, category_linked=1, failed=0`. Media URL resized xung đột tên được resolve đúng WordPress source attachment, dùng ảnh gốc `kaokui2.jpg`, `kaokui5.jpg`, `kaokui6.jpg`, `kaokui.jpg` (không bịa ảnh). Đã làm sạch phần mã dư sau first exit, importer hiện biên dịch và chạy PASS.
- **59/59 sản phẩm từ 8 nhóm danh mục** (gốc Đèn + 7 con): source-target data + SEO parity run [42639768313](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42639768313) completed/success. `LIGHT_WOO_PARITY_PASS unique=59 categories=8`; `LIGHT_SEO_SOURCE_TARGET_PASS total=59 seoTitleChecked=59 seoDescriptionChecked=0 seoDescriptionMissing=59`. Không tự sinh meta description khi web gốc thiếu. 13 nguồn thiếu ảnh được gắn `_esc_source_media_deferred` có source ID/URL và QA xác minh.
- **Route WordPress**: [42639822903](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42639822903) completed/success, 59 source ID được xác minh, 16 Product slugs đã có Rewrite, thêm 2 native `chuyen-huong-link` quy tắc Rewrite (IDs `83252,83253`) cho 43 slugs còn lại.
- **Production**: build request `build-requests/2026-11-09-light-catalog.json` đã kích hoạt WordPress production pipeline run [42640498372](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42640498372), source Astro `beb08cf9c402b53c0ffe603dd540f98ab6082e04`. **Chưa xác nhận build/deploy/Playwright** tại mốc ghi checkpoint.
- Bước tiếp: chờ run WordPress build kết thúc PASS rồi xác nhận actual Astro deploy run/source marker, tạo QA request `qa-requests/light-catalog-production.json` để kiểm tra 8 category × desktop/mobile và source Product route representative; chỉ DONE khi QA PASS.

## Production release + UI QA hoàn tất (cập nhật 2026-11-09)

- **WordPress production build trigger** [42640498372](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42640498372): completed/success.
- **Astro production build/deploy** [42640656902](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42640656902): completed/success; deploy source SHA `beb08cf9c402b53c0ffe603dd540f98ab6082e04` trên `master`. Không thay source Astro/PHP vì chỉ nhập sản phẩm thật vào WordPress.
- **Production Playwright parity** [42641456578](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42641456578): completed/success, marker `LIGHT_DEPLOY_READY` khớp SHA trên, `LIGHT_WOO_PARITY_PASS unique=59 categories=8`, `LIGHT_SEO_SOURCE_TARGET_PASS total=59 seoTitleChecked=59 seoDescriptionChecked=0 seoDescriptionMissing=59` (nguồn thiếu meta description). Test 8 trang danh mục × 2 viewport = 16, cộng 4 trang chi tiết × 2 viewport = 8, tổng **24/24 PASS**. Card IDs đối chiếu WooCommerce; kiểm tra H1 đúng tên nguồn, HTTP200, không JS errors hay horizontal overflow.
- Artifact 24 screenshots + JSON [13684983793](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42641456578/artifacts/13684983793).
- **Lazy-load card image QA** [42642675336](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42642675336): completed/success, 4 Product có nguồn ảnh gốc thật × desktop/mobile = **8/8 PASS**, ảnh decode được `naturalWidth > 0` sau scroll (192/195/360px); screenshots và report [13685897817](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42642675336/artifacts/13685897817).
- **Ngoại lệ source media vẫn chờ**: đúng 13 source Product IDs `1814,1815,1816,3052,3054,3056,3057,3058,3059,3060,3061,3062,3063`: file ảnh gốc và resized versions trả HTTP404, hoặc Woo nguồn không có ảnh Store; lưu `_esc_source_media_deferred` trên các Product thật. Read-only diagnostic [42630327380](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42630327380) và hai recovery runs [42632797438](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42632797438), [42634349942](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42634349942). Các ảnh còn thấy trong chi tiết nguồn thuộc logo/placeholder/related products, không được gán nhầm.

**Trạng thái tại mốc này:** Product data 59/59, native Rewrite 59/59, production build/deploy và UI QA đã **DONE**. Phần image source parity **PARTIAL**, 13 source cover assets không còn tồn tại ở web gốc; cần ảnh gốc đáng tin cậy hoặc quyền quyết định ngoại lệ để đóng hoàn toàn. Không tự retry vô hạn ảnh 404 và không build trùng với Astro SHA đã phát hành.

## Xác minh sâu ảnh nguồn — không thể tự khôi phục từ URL khác (2026-11-09)

- Read-only audit [42643781321](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42643781321) = PASS. Hai nguồn Media attachment thực tế của 10 Product thiếu ảnh là `266690` và `266681`, cùng kích thước metadata `1440×954` và `date=2024-05-19`.
- Cả hai URL `2017/09` từ `media_details.file`/Store API và URL `2024/05` suy ra trực tiếp từ metadata ngày/tên attachment **đều trả HTTP404**. Những kích thước WooCommerce resized thuộc chính attachment cũng đã kiểm 404 từ [42630327380](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42630327380).
- Ba Product source ID `1814,1815,1816` không có ảnh Store ngay tại nguồn; không gắn ảnh của related products hoặc placeholder giả thành product cover. **Không còn đường truy xuất asset gốc đã xác minh từ nguồn public hiện tại.**
- Giữ `13` records trong manifest cấu trúc [2026-11-09-light-media-deferred.json](./2026-11-09-light-media-deferred.json), bảo toàn source ID/URL/status. Chỉ xử lý lại khi nguồn thay đổi (file thật phục hồi) hoặc nhận được asset gốc có chứng cứ thuộc sản phẩm. Không retry vô hạn HTTP404, không lặp build khi source SHA không đổi.
- Kết quả overall: dữ liệu WooCommerce, SEO hiện hữu, routing, deploy production, UI + card media QA đã PASS. **Ngoại lệ 13 source cover images vẫn PARTIAL** do phụ thuộc dữ liệu ngoài, không phải lỗi frontend.
