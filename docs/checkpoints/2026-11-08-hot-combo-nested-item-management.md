# Aqua Thanh Xuân — nested Hot Combo Product item management (2026-11-08)

Status: IN PROGRESS — production Astro build and live Builder QA pending.
Project: aquathanhxuan.com. Owner Page 82454.
Repos/branches:
- knowledge/main
- aquathanhxuan-php/master @ 869b3ad842ef6d9cf29d7cc5710c7d429c265fee
- aquathanhxuan-astro/master @ 0dfae1294f6371ae16825d71217cd3402f2c613e
- aquathanhxuan-actions/main (current HEAD at read time)

Problem reproduced from user Builder screenshot: nested Product ESC Table tool_combo01 displayed the Product cards, but adding, deleting and swapping failed. Underlying parent is home_03 and shortcode-products=tool_combo01. Product IDs 82561, 82562, 82564, 82566 must be preserved.

Root cause 1: PHP esc_vb_text_page_owns_table() in includes/text-editor.php tested only a direct [table id=...] in WordPress Page content, returning editor_table_denied for every nested shortcode referenced through a parent ESC Table. Fixed to use the existing bounded esc_vb_page_table_ids(page) shortcode-* graph (2 levels/48 max), still requiring current WP user, REST nonce, edit_post and tablepress_edit_table capabilities. Added PHP regression tests for direct + nested + outsider + missing privileges.

Root cause 2: Astro builderSectionDrafts.ts productReferenceHost supported only Sale tracks and Substrate tracks. Hot Combo products are rendered in a third nested grid and live preview add/delete/swap could not reconcile them. Home_03.astro now annotates the generic nested Product track, card/template and relevant Product fields. Shared builder adapters now support generic Product add/delete/reorder and canonical source-row updates. Product attributes remain WooCommerce-owned and read-only in Builder.

Evidence:
- Actions Visual Builder CI run 42488633678 PASS after rerun failed PHP fixture job; preview-browser, native-cells, homepage-data all success. Synthetic Chromium tests explicitly cover Hot Combo Product source click red/blue, cancel, swap, delete and insert; no CMS mutations.
- WordPress PHP production release run 42488801666 SUCCESS, source SHA 869b3ad842ef6d9cf29d7cc5710c7d429c265fee.
- WordPress-triggered Astro production build request run 42488914584 IN PROGRESS as of checkpoint creation, expected Astro SHA 0dfae1294f6371ae16825d71217cd3402f2c613e.

Next:
1. Wait for run 42488914584 to finish and verify its linked Astro deployment repository_dispatch success; inspect logs if failure.
2. Run genuine read-only production Builder QA on Page 82454: click a combo child Product, verify item-schema 200 / selected source row; open Add dialog with Product search; open Sort with red/blue selection then cancel; open Delete confirmation then cancel. Do not save mutations in production QA.
3. Verify canonical tool_combo01 TablePress Product IDs/names/prices unchanged after QA.
4. Update checkpoint with exact production run URL and evidence; overwrite actions/chatgpt/latest-response.md; final DONE only once all pass.

Constraints: no hardcoded Product data, no bypass of WordPress auth, no new build mechanism, source gateway bypass, code mode auto-build.
