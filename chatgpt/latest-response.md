# Latest ChatGPT response

Date (Asia/Ho_Chi_Minh): 2026-11-08
Project: aquathanhxuan.com
Task: Fix missing selected/hover dashed outline on live-added Sale Product cards in ESC Visual Builder
Code mode: auto-build
Source gateway: bypass

## Final response

DONE — Visual Builder Sale Product cards inserted after initial preview load now have identical readonly hover affordance and persistent selected dashed border as the server-rendered cards.

Root cause:
- `builderEditabilityCues.ts` only marks `[data-esc-vb-product-readonly]` once during initial preview bootstrap. Cards inserted using `esc-vb-product-item-added` never inherited `data-esc-vb-region-state=readonly`, so the CSS dashed hover outline and the source hint were absent despite correct Product ID selection.
- Ordinary Product click in `builderSectionDrafts.ts` notified PHP but did not persist a visual marker for the selected Product. Added one shared marker for initial and dynamically inserted Product cards.

Changes (Astro only):
- `src/lib/wordpress/builderEditabilityCues.ts`: rerun readonly Product markings on the `esc:builder-items-updated` event that already fires after insert/delete/reorder; use a Set to avoid duplicate tracking and clean listeners on dispose. WordPress/WooCommerce readonly permission unchanged.
- `src/lib/wordpress/builderSectionDrafts.ts`: when ordinary click selects any Product card, set `data-esc-vb-product-selected`, clear previous selection, and render a Builder-only persistent dashed outline; remove mark when a different nonproduct item is selected or Builder tears down. Existing Product ID -> ESC Table row logic unchanged.
- `aquathanhxuan-actions/scripts/aquathanhxuan-visual-builder-browser.mjs`: expanded Chromium regression verifying initial and dynamic Product selected marker, readonly state, dashed hover, and highlight transfer between cards.
- `aquathanhxuan-actions/scripts/aquathanhxuan-builder-interactions-qa.cjs`: authenticated read-only production QA verifies live-added ephemeral Product card receives readonly classification and dashed selected outline, then selects existing card and verifies highlight transfer. No actual Product inserted or edited in production.

Commits: Astro master 6b98c406bc8b696f74b0730bcd16fbe04d512563, ec243562bfa9bc185e1e9eb480989e10a2f75b52. Actions main test 509ead53daae8653360e1abfe352502b958a7ae3 and c156ab6c45f4966c839a01e622c8b60efac857b3.

Evidence:
- Source/Chromium regression: https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42449777661 SUCCESS (native-cells, homepage-data, preview-browser all PASS).
- WordPress-controlled Astro build trigger: https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42449866502 SUCCESS.
- Production Astro deployment: https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42449933697 SUCCESS, deployed Astro source SHA ec243562bfa9bc185e1e9eb480989e10a2f75b52.
- Authenticated production Playwright QA: https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42449887692 attempt 2 SUCCESS. Tested 1440x900 and 390x844; `BUILDER_PRODUCT_INSERT_LIVE=PASS`, `BUILDER_PRODUCT_DELETE_CONFIRM=PASS`, `BUILDER_PRODUCT_PICK=PASS`, `BUILDER_SAFE_INTERACTIONS=PASS`. Synthetic post-insert Product card, no CMS writes. Attempt 1 ran before deployment and correctly failed SHA guard; attempt 2 passes.

Chế độ code: auto-build
Cổng ghi source: bypass
Trạng thái: DONE — hoàn tất
