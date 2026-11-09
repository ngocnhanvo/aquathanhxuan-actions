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
- Astro source not yet built/deployed. Production still at `cebdd48dd73a41ba130cbbeddda8ae5252621730` pending final CMS/QA.

## WordPress CMS
- Real WordPress Header VI native menu ID 1778, eleven parents. Scoped writer `scripts/aquathanhxuan-header-all-children.cjs`, workflow `aquathanhxuan-header-all-children.yml`.
- Initial run [42544339462](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42544339462) FAILED before write because WordPress menu_order must be >= 1.
- Run [42544481100](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42544481100) created exactly eleven native custom children (IDs 82685–82695), one per parent, preserving the original parent URL. Readback failed over a harmless slash prefix mismatch; children persist.
- Run [42544745106](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42544745106) confirmed 97 menu items and detected existing sibling menu_order conflicts: Tất cả not necessarily first in every submenu.
- Current writer `9c61ffd9d2e94819a20dec1aea3082d91f5300af` preserves current sibling order while assigning stable 1-based menu_order only within the affected parent subtrees, skips unchanged records, and validates final WordPress REST hierarchy.
- Run [42545042895](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42545042895) was IN_PROGRESS at last check; MUST inspect its actual conclusion/job log/artifact before deployment.
- No product categories or parent menu items are created/deleted/modified by this writer.

## Remaining steps
1. Confirm run 42545042895 SUCCESS and `HEADER_ALL_CMS_PASS` in log; if not, inspect failure and repair minimal scope. Verify WordPress REST first child `Tất cả` for all 11, href equals the original parent route, 75 original child entries preserved.
2. Verify Astro `master` HEAD still 282aac0a. Trigger **existing** production pipeline via new `build-requests/*.json` using exact source_sha; watch its run and associated deploy until both BUILD_SUCCESS and DEPLOY_READY.
3. Production QA script `scripts/aquathanhxuan-footer-consultation-home05-qa.cjs` already updated for new SHA 282aac0a and expects 11 Tất cả items. Trigger via updated `qa-requests/footer-consultation-20261109.json` only after deploy. Check Playwright 5 viewports, desktop/mobile toggle no navigation, all links, Footer/Home05 unaffected.
4. Update this checkpoint with verified SHA, run IDs and outcomes, then write `chatgpt/latest-response.md` in this Actions repo. No repeat of successful CMS writes/builds.

Chế độ code: auto-build
Cổng ghi source: bypass
Trạng thái: PARTIAL — chưa hoàn tất
