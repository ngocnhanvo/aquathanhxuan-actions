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
