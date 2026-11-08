# Latest ChatGPT response — Aqua Thanh Xuân

Date: 2026-11-08 Asia/Ho_Chi_Minh
Project: aquathanhxuan.com
Chế độ code: auto-build
Cổng ghi source: bypass

## User complaint
The Visual Builder Product item sorter displayed a redundant numbered ID list in the sidebar, even though another ESC Table already uses direct item source red outline / item destination blue outline picking. User explicitly requested reuse of the existing standard item picker mechanism, not a separate Product-specific process.

## Root cause and fix
- PHP `wp-content/plugins/esc-visual-builder/includes/item-section-ui.php` previously forced `fallbackPicker=true` for every `meta.api=Product` table even when the iframe identified the card, so it rendered an unnecessary indexed ID chooser. Fixed so Product and ordinary ESC Tables use exactly the same direct visual picker, with list fallback only when the actual component has no matching item identifiers. Preserve existing guarded WordPress save and cancel behavior.
- Astro `src/lib/wordpress/builderSectionDrafts.ts`: `beginItemPicking` looked only for outer `[data-tablepress-preview=ID]`; nested Product table `home_02products` has a separate `[data-esc-source-table=home_02products]` underneath the visible `home_02` section. Fixed nearest verified source lookup to support direct red-blue picking from actual Product cards, same `esc-vb-item-source-picked`/`esc-vb-item-target-picked` events as ordinary ESC Table items.
- Existing Preview immediate Product order sync, product data immutability, and public frontend unchanged.
- PHP master SHA `701346d9416dd393cfb9afc03b51c00e424be2ef` (regression included); Astro master SHA `89e03da33f38661dcd996e0a3c29808022b7b4ad` (regression included).
- Actions synthetic Chromium test now clicks nested source and target cards and asserts native red/blue outlines and correct source table ID/row, avoiding a second ID UI.
- Production read-only Playwright QA now requires Product index list HIDDEN, checks red outline on 82535, clicks blue outline on 82537, confirms save enabled; cancels with ZERO backend writes and restores simulated preview order.

## Verified deployments and QA
- CI contract run `42479214159`: PASS across native-cells, preview-browser and homepage-data.
- PHP release run `42479373646`: SUCCESS for PHP SHA 701346d9.
- WordPress-controlled Astro production build run `42479395068`: SUCCESS for Astro SHA 89e03da3; underlying Astro deploy run `42479465659`: SUCCESS.
- Live production Visual Builder QA run `42479686697`: SUCCESS.
  - Product 82535 preselected as source (red outline).
  - Clicking Product 82537 creates destination blue outline.
  - `sortDryRun={directVisual:true,listHidden:true,redOutline:true,blueOutline:true,saveEnabled:true}`.
  - Preview correctly reflects simulated authoritative Product reorder (first card 82537) and is restored to the original 82535 order.
  - No WordPress/WooCommerce writes: `forbiddenWrites=0`. Ten original Product IDs unchanged.
  - Add/Delete dialog controls intact; responsive 5 viewports 1440,1024,768,844,390 widths PASS; 10 Product cards and 7 authentic Nền subcategories, no horizontal overflow.
- QA workflow `.github/workflows/aquathanhxuan-home02products-qa.yml` restored to manual-only `workflow_dispatch` in Actions commit `8837e6da1c9f910541ad8bf7dbc2d791783d7b1a`.

## References
- https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42479686697
- https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42479214159
- https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42479373646
- https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42479395068

No remaining build, source or QA task for the user's request to use the old shared direct ESC item reorder picker.

Chế độ code: auto-build
Cổng ghi source: bypass
Trạng thái: DONE — hoàn tất
