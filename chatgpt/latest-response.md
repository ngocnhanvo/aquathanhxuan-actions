# Latest ChatGPT response

Date: 2026-11-08 (Asia/Ho_Chi_Minh)
Project: aquathanhxuan.com
Code mode: auto-build
Source gateway: bypass

## Current goal
Restore Nền homepage layout with true child-category sidebar navigation and an independently curated Product ESC Table. User corrected table ID to **home_02products** (third underscore reserved for locale suffix _vi/_en) and forbids invented products.

## Verified legacy data
Public source https://aquathanhxuan.com homepage under "PHÂN NỀN & CỐT NỀN" has exactly these 10 displayed products in order:
1. Đèn Led UFO BAO YOU WRGB
2. Đèn A60-80W ZAQUA
3. ĐÈN KAOKUI 70W PRO
4. Đèn COCO FA Series 100w
5. Đèn thủy sinh Neo Helios Flat Nano S3 Pro 13W
6. Đèn Rọi Coco Spotlight SD300 5W
7. Đèn Rọi Coco Spotlight SD300 7W
8. Phân nền cao cấp Prodibio Aqua Growth Soil 9L
9. Cốt nền cao cấp Prodibio Aqua Terra 6L
10. Cốt nền cao cấp Prodibio Aqua Terra 3L

This is source/reference, NOT confirmation these IDs/products exist in destination WordPress.

## Source commits
Previous:
- 4b06bfa: removed sidebar image, All products selector, client-side product filtering; now category anchors.
- 2393d71: ordered selection ID support independent of Nền taxonomy.
- 95b5841, cb01713: separate ESC Table lookup (old wrong ID).
Latest:
- 107686c018d30208e72bbd4b37a5ba1bb7526153: Astro Home_02 now references **home_02products** exactly; source in src/astro/tablepress/Home_02.astro.

## CMS writer prepared and auto-trigger workflow committed
- Actions script: scripts/aquathanhxuan-home02products-create.cjs (commit 8b3c9d703164960912d8cf283ce02ecfe14e7d53).
- Actions push + workflow_dispatch: .github/workflows/aquathanhxuan-home02products-create.yml (commit 5799ca759533eb022f900ce3a43e33fccafb7dcb).
- Writer authenticates to WordPress, matches legacy names to REAL published WooCommerce products using the Store API, verifies each WordPress record and ACF product_lang=vi, creates only the subset with real verified IDs, writes home_02products with native TablePress custom_api=Product, uses native Quicktags Insert Code to attach to homepage Page ID 82454, and performs readback. No product/media imports, no fabricated IDs/prices/images.
- Writer fails closed if no products matched or relevant WP/CMS contracts differ, and does not overwrite an existing curated table with divergent contents.
- A workflow push trigger was submitted but run ID/status CANNOT be confirmed by available GitHub connector; fetch_commit_workflow_runs only returns pull_request-triggered jobs and yielded no runs. **DO NOT CLAIM TABLE ACTUALLY EXISTS YET.**

## Remaining required
1. Inspect GitHub Actions run for workflow aquathanhxuan-home02products-create.yml. The current connected GitHub tool has no generic list/dispatch workflow runs; attempt alternative authorized API/connector paths rather than assume success.
2. If workflow failed, inspect logs; fix true error and rerun only the permitted workflow, prevent duplicate CMS writes. Confirm remote WordPress table home_02products has meta.api Product and exact existing IDs, and Page shortcode [table id=home_02products /] via native insert. Count unimported legacy source products.
3. Confirm Astro Home_02 receives page.contents and maps selected IDs correctly; Visual Builder add/reorder/delete of Product items on home_02products must be verified.
4. Verify sidebar child category link routes (current URL is based on parent href path prefix and may need native product_cat.link field instead); QA real browser.
5. Run source tests, production build through existing pipeline, and five-viewport QA; no build/production PASS confirmed this turn. After success, change workflow to manual dispatch-only to avoid accidental repeat on workflow file edits.
6. If any old source product missing in destination WooCommerce, report it; source migration only through verified separate scoped import (no invented details).
7. Observe WordPress writer write scope, accurate product_lang, and locale closure (home_02products defaults VI according to Knowledge).

Chế độ code: auto-build
Cổng ghi source: bypass
Trạng thái: PARTIAL — chưa hoàn tất
