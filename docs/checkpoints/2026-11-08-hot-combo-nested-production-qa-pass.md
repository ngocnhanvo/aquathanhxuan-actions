# Checkpoint — Hot Combo ESC Table cha-con production QA PASS

Date: 2026-11-08 (Asia/Ho_Chi_Minh)
Project: aquathanhxuan.com

## Source và dữ liệu CMS
- Original product and Hot Combo facts verified on https://aquathanhxuan.com/ .
- Parent: `home_03`; child Product ESC Table: `tool_combo01`.
- WordPress Page 82454 contains parent shortcode only. Its `shortcode-products` field links to the native child table.
- Child Product IDs and original order: 82561 (LED rọi Kaokui KK-F06; 320.000), 82562 (Chân gỗ 40x40x70; 1.500.000), 82564 (Bể cubic 40 siêu trong; 1.050.000), 82566 (Máy Lọc Treo Xiaoli Sunsun XBL 500; 300.000).
- Product names, prices, images and links are sourced from original real WooCommerce records; no test data.

## Implementation
- Astro/master `f00122d22842c36337857d575f2204605107bfc1`: live Visual Builder hydrates manifest-authorized child blocks of Page.
- PHP/master `ff22a9cac189a3f8d87c09f3682ad8d8f15349bc`: bounded Page-owned recursive `shortcode-*` discovery and nested table authorization in page-state, table-source, table-batch, and page rules.
- Actions/main FTPS allowlist added missing `includes/change-index.php` and checked syntax; deployment verified SHA.
- Original Astro native nested Hot Combo rendering and actual Product table were already committed and deployed before this fix.

## Verified production runs
- PHP production release: 42486874147 SUCCESS; `change-index.php` installed sha256_verified=PASS (13 allowed files).
- Astro build via WordPress: 42486243780 SUCCESS.
- Astro deploy: 42486319332 SUCCESS.
- Final Playwright QA: 42486986008 SUCCESS (job 128750898488):
  - `HOT_COMBO_CMS_CONTRACT_PASS`
  - `HOT_COMBO_VIEWPORT_PASS` on 1440x900, 1024x768, 768x1024, 844x390, 390x844, with real prices/images, no horizontal overflow
  - Builder page manifest contains `tool_combo01` and item_references_only=true
  - Child table-source HTTP 200, Product, 4 rows
  - Builder preview DOM contains child source table
  - `HOT_COMBO_BUILDER_SOURCE_PASS` for IDs 82561/82562/82564/82566, source rows 0/1/2/3 and valid 64-char version hash
  - `HOT_COMBO_NESTED_PRODUCTION_QA_PASS`

## Boundaries / follow-up
- This QA is read-only. It verifies Product identities, row/version metadata, and render readiness but **does not perform an actual save/reorder/delete mutation**. If a future task requires mutation behavior proof, use a scoped reversible QA and restore the original order.
- Only one authentic combo was available/curated, so no additional fake combos created.
- Do not re-run successful production build/releases unless new changes require it.

Chế độ code: auto-build
Cổng ghi source: bypass
Trạng thái: DONE — hoàn tất
