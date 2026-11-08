# Checkpoint — Product-backed ESC Table item management

Project: aquathanhxuan.com
Date: 2026-11-08 (Asia/Ho_Chi_Minh)
Status: QA_PASS / PHP_PRODUCTION_DEPLOYED
Code mode: auto-build
Source gateway: bypass

## Requirement

For ESC Table with `meta.api = Product`, protect WooCommerce product attributes (name, image, prices), while allowing ESC Table membership and order changes: add an existing WooCommerce product ID, remove an ID reference without deleting the product, and swap ID rows.

## Implementation

PHP source: `ngocnhanvo/aquathanhxuan-php@master` SHA `a8df8414296d48820a0cee71b7ad7ceb037f3760`.

- `wp-content/plugins/esc-visual-builder/includes/item-manager.php`: allow Product source while rejecting other nonempty API sources; detect key-based row boundary with optional section config; keep reserved header/labels/config rows immutable; only key writable for Product; validate WooCommerce product ID and duplicates; version/hash-guarded insert/delete/swap; no Product card hydration spoofing.
- `wp-content/plugins/esc-visual-builder/includes/item-section-ui.php`: Product key-only insert form, select real row from the list for deletion, list-based source/target selection for swaps, no raw Product preview payload replacing API-hydrated card DOM.
- `wp-content/plugins/esc-visual-builder/tests/items-and-sections.test.php`: native tests for Product configurations, no-config Product tables, insert, delete, swap, stale/invalid inputs, duplicate references and immutable source attributes.
- Actions FTPS release allowlist includes both changed plugin files. Existing release pipeline skips unchanged files and verifies changed file SHA256 and rollback.

## Verification

- Source-only CI `42439698259`: SUCCESS, native-cells + homepage-data + Chromium preview-browser.
- PHP production FTPS run `42439789842`: SUCCESS. SHA-verified installation of exactly the two changed plugin files; other release-allowlisted files unchanged; no Astro build.
- Read-only production homepage/Builder Playwright QA `42439908394`: SUCCESS:
  - `HOMEPAGE_BUILDER_PRODUCT_ADD=PASS id_input=true product_fields_readonly=true cms_write=false`
  - `HOMEPAGE_BUILDER_PRODUCT_SORT=PASS source_ids=true cms_write=false`
  - `HOMEPAGE_BUILDER_PRODUCT_DELETE=PASS source_ids=true cms_write=false`
  - `HOMEPAGE_FINAL_QA=PASS`.
- Existing Astro production SHA remains `685c891569c20dccf1381b6374855e247e6b616b`, QA confirmed deployed; no Astro rebuild needed.

## Safety / remaining scope

Production browser QA opened Product add/sort/delete controls and cancelled without changing WordPress product IDs. Native PHP in-memory tests verified actual ESC Table save semantics; no live persistent Product list mutation was performed to protect production content. There was no WooCommerce product write or delete.

Future work only if requested: searchable WooCommerce product picker instead of typing an ID; move/drag drop rather than pairwise swap; stronger user-facing list previews without a section refresh. Do not repeat current PHP release or QA without an actual regression.
