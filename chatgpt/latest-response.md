# Latest ChatGPT response — Aqua Thanh Xuân

Date: 2026-11-08 Asia/Ho_Chi_Minh
Project: aquathanhxuan.com
Chế độ code: auto-build
Cổng ghi source: bypass

## Objective and cause
User screenshot shows Product cards inside WordPress ESC Table `home_02products` with misleading readonly Sale tooltip; user cannot reorder items effectively. Previous acceptance checked opening Sort and selected count, but did not prove source/target selection or preview DOM reconciliation.
Root causes:
1. PHP `item-section-ui.php` always cleared the selected Product source row at Sort open, forcing a duplicate source choice; UI status only suggested Delete.
2. Astro `builderEditabilityCues.ts` hardcoded a Sale-only WooCommerce lock tooltip for all readonly Product cards; obscured ESC Table membership/order capability.
3. Astro `builderSectionDrafts.ts` `syncProductReferenceOrder`, add/delete live adapters only operated on `[data-sale-track]`, not nested `[data-esc-source-table=home_02products][data-substrate-products]`. Consequently a saved Product ID reorder would not change the visible Home_02 cards immediately.
4. Astro Home_02 pagination captured the initial card array and did not recompute after Builder DOM changes.

## Implemented fixes
- PHP `master` deployed application code from commit `2cbeede37da1799383df59aec77a1df08ea7706e` (PHP release source SHA `7f46db6a738f7f27e6a5c29488cc46f23706546c` includes regression test):
  - Preselect exactly the Product card row verified against the current WordPress item-schema by immutable key ID.
  - Reveal Sort button in inspector after selection, state clearly that the ESC Table can add/delete/reorder Product references while WooCommerce owns name/price/image.
  - Item sort source defaults to selected Product; user only picks target and confirms. Generic section selection still requires choosing source.
  - PHP UI output regression checks in `tests/item-ui-script.test.php` (test-only follow-up source SHA `69ae115380905422509b7105665d14a407026965`).
  - Live PHP release run `42476091669` PASS.
- Astro `master` latest deployed source SHA `d3e6c112d2d3da52ee2b7e651f3af06354d9f937`:
  - Source-aware tooltip with exact `home_02products`, available sorting, immutable WooCommerce fields.
  - Reusable `productReferenceHost` resolves nested ESC Table Product grid or Sale carousel, syncing Product order, delete, and insertion of genuine non-discounted Product cards.
  - Sale retains filtered subset semantics (do not require all IDs present in visible carousel), but full curated Product grids verify all referenced IDs.
  - Reindex rows and dispatch bubbling `esc:builder-items-updated`; Home_02 pagination re-reads current cards rather than stale initial array.
  - Source regression test in `home02Catalog.test.ts`.
  - Existing full-height Nền sidebar and 10 verified Product IDs remain unchanged.

## Verified tests, release and evidence
- WordPress Product swap backend mock regression (WordPress TablePress Product reference key swap + rollback/locked fields) PASS via native-cells test.
- Actual Playwright Chromium synthetic test for Sale carousel filtered Product subset and independent nested ESC Product grid: source-selected Product, saved-order DOM reconciliation, correct row indices, Product reference deletion and non-sale addition; no external requests. CI `42477302319` all preview-browser/native-cells/homepage-data SUCCESS.
- Astro production pipeline run `42477515906` PASS for exact source SHA `d3e6c112d2d3da52ee2b7e651f3af06354d9f937`, underlying Astro deploy run `42477571716` PASS.
- Read-only live production QA run `42477938962` **SUCCESS**:
  - ESC Table meta.api=Product, 10 reference IDs unchanged, CMS Page shortcode and cached Product order match.
  - 1440x900,1024x768,768x1024,844x390,390x844 all PASS (10 Product cards, 7 genuine Nền category links, no horizontal overflow, correct archive).
  - Authenticated Visual Builder Product 82535 maps to table `home_02products`, displays new source-aware sorting tooltip; Add/Delete dialog opens and closes.
  - Sort opens with **Product 82535 already source**, source button disabled as preselected, destination Product 82537 selectable, **Save enabled**; user QA cancels without WordPress mutation.
  - Test sends a simulated already-saved order event to real Builder iframe, sees first DOM card change to 82537, restores original 82535 in finally; proves **immediate Preview sorting works**.
  - `forbiddenWrites=0`. The test did not commit any real WooCommerce/Product/ESC Table data or change persisted production order.
- QA workflow `.github/workflows/aquathanhxuan-home02products-qa.yml` returned to workflow_dispatch-only via Actions commit `9fc06e597dd21ab2c126e9194be98dc41d7958e2`.

## User-facing behavior
In WordPress Visual Builder, click a Product card in Nền section, inspector reveals `home_02products` selected item and button `↕ Sắp xếp item`. Click Sort, chosen Product is already source, select a destination card or indexed Product item, then click `Chấp nhận hoán đổi`. WordPress saves the two reference IDs; Builder updates DOM order. Names/prices/images remain readonly in Builder and editable only in WooCommerce.

## References
- https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42477938962
- https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42477515906
- https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42476091669

No pending code, build, or live QA steps remain in the requested Product reference sorting issue.

Chế độ code: auto-build
Cổng ghi source: bypass
Trạng thái: DONE — hoàn tất
