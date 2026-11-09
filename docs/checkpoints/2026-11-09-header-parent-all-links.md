# Checkpoint — Header parent only toggles / Tất cả children (2026-11-09)

Status: IN_PROGRESS. Preserve existing deployed state until WordPress menu order and final QA pass.

## Owner requirement
- The eleven Header parent labels should not navigate. Clicking/tapping the label toggles the submenu.
- The original parent destination must be available as a native WordPress custom child named "Tất cả", first in its submenu.
- Preserve original 75 child links, original 11 roots, WordPress Menu Manager as authority, and desktop/mobile interactions.

## Source
- Astro master `282aac0a62bf4dd2d860faaa927e5a55bab8aed5` (parent anchor removed for nodes with children in Desktop.astro and MobileBranch.astro; whole label is one toggle; leaf links still navigate; footerCmsContract.test.ts covers).
- WordPress PHP master unchanged `dcec014aec735061bcc8af1060a6cd5d64766243`.
- Source contract CI Actions run [42544643430](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42544643430): SUCCESS (all 4 jobs).
- Astro production source `282aac0a62bf4dd2d860faaa927e5a55bab8aed5` has been built/deployed; WordPress build [42545372518](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42545372518) SUCCESS with `BUILD_SUCCESS=PASS`, `DEPLOY_READY=PASS`, source SHA confirmed; deployment [42545446332](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42545446332) SUCCESS.

## WordPress CMS
- Real WordPress Header VI native menu ID 1778, eleven parents. Scoped writer `scripts/aquathanhxuan-header-all-children.cjs`, workflow `aquathanhxuan-header-all-children.yml`.
- Initial run [42544339462](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42544339462) FAILED before write because WordPress menu_order must be >= 1.
- Run [42544481100](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42544481100) created exactly eleven native custom children (IDs 82685–82695), one per parent, preserving the original parent URL. Readback failed over a harmless slash prefix mismatch; children persist.
- Run [42544745106](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42544745106) confirmed 97 menu items and detected existing sibling menu_order conflicts: Tất cả not necessarily first in every submenu.
- Current writer `9c61ffd9d2e94819a20dec1aea3082d91f5300af` preserves current sibling order while assigning stable 1-based menu_order only within the affected parent subtrees, skips unchanged records, and validates final WordPress REST hierarchy.
- Run [42545042895](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42545042895) SUCCESS: `HEADER_ALL_CMS_PASS={parents:11,added:0,reused:11,reordered:75,firstChild:Tất cả,childCounts:[21,8,9,6,9,5,7,5,8,5,3]}`. 75 existing children received stable order; original 11 parent URLs/IDs and original child routes preserved.
- No product categories or parent menu items are created/deleted/modified by this writer.

## Remaining steps
1. DONE: WordPress CMS run 42545042895 PASS with all 11 first-child Tất cả items and 75 original children retained.
2. DONE: production build/deploy 42545372518 / 42545446332 PASS for exact Astro SHA. No rerun.
3. IN PROGRESS: QA request `qa-requests/footer-consultation-20261109.json` updated and [production Playwright run 42545625065](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42545625065) is running. Script checks 11 Tất cả children, parent button-only navigation, 5 viewports, Footer/Home05. Investigate if failure, do not rerun blindly.
4. Update this checkpoint with verified SHA, run IDs and outcomes, then write `chatgpt/latest-response.md` in this Actions repo. No repeat of successful CMS writes/builds.

Chế độ code: auto-build
Cổng ghi source: bypass
Trạng thái: PARTIAL — chưa hoàn tất
