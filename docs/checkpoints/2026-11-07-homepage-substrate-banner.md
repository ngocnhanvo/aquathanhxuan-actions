# Checkpoint — Homepage substrate banner
Date: 2026-11-07 (Asia/Ho_Chi_Minh)
Project: Aqua Thanh Xuân
Knowledge main: cd7d1e3999e1328bb33ce99dd9a6a7a14e4d4223
Astro master: d03f1d72c7b8cea06caed96025e7fc5ee1a6358c
PHP master: e3dda1b6242aa5a4b95a3f8f84726dd85c5c5b7b
Actions main: 2eecf10881132c0c0df8c7ad8f14d136b9a87465 (before checkpoint write)

## Verified PASS
- Header, WordPress Menu, Hero text toggle and Sale were previously completed; do not redo.
- Sale build #42388459540, deploy #42388529828, QA #42388970820 SUCCESS.
- Public inventory #42392563861 SUCCESS.
- Authenticated native Admin inventory #42392841497 SUCCESS: only home_00 and home_01 exist; home_02/home_03/home_04 do not.
- Astro code-only scaffold for home_02 committed on master at d03f1d7 (Home_02.astro, home02.ts, home02.test.ts).
- Code renders no fabricated content and skips missing CMS image/title. Source zero-based row index retained.
- Offline targeted Vitest #42393147043 SUCCESS. No Astro build/deploy.
- Read-only WordPress media discovery #42393241953 SUCCESS. Searches for nền, cốt nền, soil, substrate, phân nền, ada, aquasoil returned zero media assets. Category 1775 Nền (slug nen-cho-be-thuy-sinh) exists, image absent. Category 1772 Đá / Lũa / Cát exists, image absent.

## Status
- AUTHENTICATED_INVENTORY: PASS
- ASTRO_HOME_02_SCAFFOLD: PASS source test
- CMS_HOME_02: NOT STARTED (no native table and no verified image/copy)
- VISUAL_BUILDER_CELL_MAPPING: NOT STARTED (must include source/version and backend validation, not heuristic)
- PRODUCTION_BUILD_DEPLOY: NOT STARTED
- VISUAL_QA: NOT STARTED

## Next smallest executable steps
1. Inspect WordPress media inventory beyond keyword search and real WooCommerce products in category 1775 to identify an appropriate approved genuine source image and copy without fabricating data.
2. Create new home_02 native ESC Table with verified real media/copy, then insert [table id=home_02 /] after home_01 into Page 82454. Use authenticated minimal CMS writer with read-after-write and rollback; protect existing sections.
3. Align Astro home_02 field schema with actual native ESC Table and implement full Visual Builder cell identity: table_id, original row, field, rendered_version and PHP validation before enabling editing.
4. Execute source/Builder tests, then WordPress Build Website production pipeline only, 5 viewport visual QA, save URLs and result.
5. Continue Hot combo, Máy lọc/Đèn, benefits and Footer after banner.

Chế độ code: auto-build
Cổng ghi source: bypass

## Continuation 2026-11-07 23:52 +07:00
- Revalidated current repository commits and chatgpt/latest-response.md; prior PASS remains unchanged.
- Expanded existing read-only workflow `.github/workflows/aquathanhxuan-substrate-media-inventory.yml` in Actions main commit `562fdf42cec268525db1f402a775149763cfe626`.
- It now enumerates up to 300 newest WordPress media records and queries product category 1775 across the store/product endpoints, with bounded output. Existing origin checks retained; no CMS write.
- The workflow uses push on its own file, so this commit is eligible to trigger the existing inventory workflow. NEW_RUN_STATUS: UNVERIFIED; this session's GitHub connector lacks workflow-run listing/dispatch and external HTTP was unavailable. Do not mark a new inventory PASS or infer identified images/products without logs.
- Next: inspect run logs for the 562fdf4 workflow; select verified genuine media/products; only then create native home_02 and continue the steps above. No production build/deploy, no WordPress mutation in this continuation.

## Follow-up inventory 2026-11-07 23:54 (Asia/Ho_Chi_Minh)
- Workflow extension commit bc6712aa069846825197bb17b866b772c97f44a6; run #42393568056 inspection steps SUCCESS, URL https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42393568056
- WooCommerce /wp-json/wc/store/v1/products?category=1775&per_page=50 => HTTP 200, x-wp-total=0; no products in category 1775, cannot claim product-linked CTA.
- WordPress native media listing identified actual substrate media with WordPress-origin relative image paths:
  - 82490 — Shrimp King Active Soil 4L — /wp-content/uploads/2026/11/Thiet-ke-chua-co-ten-2024-05-18T160040.341.png
  - 82488 — Shrimp King Active Soil 8L — /wp-content/uploads/2026/11/Thiet-ke-chua-co-ten-2024-05-18T160124.275.png
  - 82482 — Dennerle Scaper’s Soil 8L — /wp-content/uploads/2026/11/Thiet-ke-chua-co-ten-87.png
  - 82480 — Dennerle Scaper’s Soil 4L — /wp-content/uploads/2026/11/Thiet-ke-chua-co-ten-86.png
- Existing Astro Home_02.astro and home02.ts still render one section image/title; no new CMS/Builder/deploy modifications in this continuation.
- Next action: select genuine relevant existing media and approved banner copy for one Home_02 row, create the native ESC Table and page shortcode via authenticated CMS writer, then implement versioned cell mapping and test. Do not invent product links or claim new section deployed.
