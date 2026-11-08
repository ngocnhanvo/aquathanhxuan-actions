# Latest ChatGPT response

Date: 2026-11-08 (Asia/Ho_Chi_Minh)
Project: aquathanhxuan.com
Goal: Restore legacy Nền sidebar navigation and independently curated mixed-product listing.
Code mode: auto-build
Source gateway: bypass

## Current checkpoint — PARTIAL

User requested:
- Remove the lower sidebar image, remove the sidebar "Tất cả sản phẩm" selector and item selection/filtering.
- Left sidebar: only real direct children of WordPress ProductCategory Nền, each clicked category navigates to its own product listing page, not filtering right-side products.
- Right: independent WooCommerce product collection chosen and ordered by a separate WordPress ESC Table, including items outside Nền (e.g. đèn rọi, coco). Preserve CMS/Visual Builder ownership.

Previous checkpoint: Astro production aca33f1; WordPress Nền parent category ID 1775 and 9 real direct child terms, including 7 empty ones, had passed production QA.

Source updates committed to ngocnhanvo/aquathanhxuan-astro/master:
- 4b06bfa23170deac41e6ccd6a1bde90462be189f: Home_02 sidebar now uses navigational anchors to subcategory routes based on the existing parent category path; removed sidebar image, removed "Tất cả sản phẩm", removed client-side category filtering.
- 2393d71b68846c734520ebe1184843c9e1db2e56: getHome02Catalog accepts an ordered optional selection of exact WooCommerce product IDs, independent of Nền taxonomy.
- 95b584194590719509017b2f97976b61a355898d: Home_02 accepts curated IDs from a separate home_02_products ESC Table in page.contents.
- cb0171362ce5bab9054c36ad92f9bb5d53e86b7b: correct table shortcode match logic.

IMPORTANT REMAINING WORK:
1. Create real ESC Table with ID home_02_products in WordPress/TablePress (not created in this turn), set meta.api=Product. Its item rows must store exact product IDs via api-key, with order matching desired visual ordering. Add actual existing WooCommerce products including đèn rọi/coco, verify names and availability. Insert shortcode into WordPress homepage Page using native Insert Code. Do not invent products.
2. Confirm Page contents actually exposes the processed table to Home_02; if renderer passes only current table, adjust integration through the existing CMS pipeline rather than hardcode.
3. Verify category link routes, especially parent button_href prefix. Do not claim working without route QA.
4. Run production-compatible source tests and browser/Visual Builder QA desktop/mobile; inspect build/deploy status. No build/test/deployment PASS has been independently verified for these commits in this turn.
5. Verify Visual Builder edit/add/remove/reorder for curated Product table, with product fields read-only. Update source if needed.
6. Recheck legacy product listing parity using actual products; do not fill gaps with fabricated data.

Do not mark DONE until real CMS table and production QA pass. Preserve rollback and source SHA.

Chế độ code: auto-build
Cổng ghi source: bypass
Trạng thái: PARTIAL — chưa hoàn tất
