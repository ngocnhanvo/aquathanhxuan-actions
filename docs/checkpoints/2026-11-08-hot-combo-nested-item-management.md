# Aqua Thanh Xuân — nested Hot Combo Product item management (2026-11-08)

Status: DONE — all source contracts, PHP release, Astro production build/deploy, and read-only live Builder QA PASS.
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
- WordPress-triggered Astro production build request run [42488914584](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42488914584): SUCCESS, expected Astro SHA 0dfae1294f6371ae16825d71217cd3402f2c613e.
- WordPress-approved Astro production deployment run [42488981812](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42488981812): SUCCESS.
- Real production read-only Builder QA run [42489254452](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42489254452): SUCCESS. Console evidence: HOT_COMBO_CMS_CONTRACT_PASS, five HOT_COMBO_VIEWPORT_PASS viewports, HOT_COMBO_BUILDER_SOURCE_PASS with all four source rows and 64-character versions, HOT_COMBO_BUILDER_ITEM_MANAGEMENT_PASS, HOT_COMBO_NESTED_PRODUCTION_QA_PASS.
- Live QA actions: select combo child Product ID 82561; successfully load scoped Product schema and search published Product in Add dialog (ID already present is disabled); open shared red/blue sorter source 82561 -> target 82562, then CANCEL; open exact-row Delete confirmation and CANCEL; assert no write API requests were sent; re-read ESC Table tool_combo01 after QA and compare entire items list unchanged.
- Public homepage renders original four genuine WooCommerce Products with unchanged names, prices, images across 1440x900,1024x768,768x1024,844x390,390x844. No CMS mutation was performed by QA.
- PHP release run [42488801666](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42488801666) verified WordPress release. CI source contract run [42488633678](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42488633678) verified shared Product handlers and PHP nested authorization test.

Result: DONE. User can add an existing published WooCommerce Product not already in the child table, delete exactly one selected Product reference, or swap two selected references from Visual Builder. Price/name/image remain owned by WooCommerce; live QA tested the controls without committing a real data mutation. If a real write fails later, use its exact REST error/version and rerun scoped QA rather than claiming a write was already tested.

Constraints: no hardcoded Product data, no bypass of WordPress auth, no new build mechanism, source gateway bypass, code mode auto-build.
