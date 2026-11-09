# Checkpoint — Header submenus and consultation floating controls (2026-11-09)

## Requirement
Owner requests: increase gap between Back to Top / Tư vấn buttons; consultation panel must layer above arrow; modern SVG phone/Messenger/Zalo channel icons without emoji; add legacy menu children to all existing 11 Header parents from uploaded Aqua site markup.

## Source and CMS changes
- Astro `master` commit `cebdd48dd73a41ba130cbbeddda8ae5252621730` (includes commits f820918, 216bc56, 7e3c81a, 0a16ff8, cebdd48):
  - `ContactWidget.astro` consultant stacking z70, panel z10, back-to-top z40, arrow bottom 7.25rem, modern channel SVGs.
  - `Layout.astro` back-to-top global bottom override matches 7.25rem.
  - Desktop and mobile Header components show separate navigable parent link and click-to-open submenu button. Desktop long lists use bounded scrollable popup.
  - `footerCmsContract.test.ts` expanded for icon/stacking and parent link/toggle contracts.
- WordPress real menu `Header VI` id 1778, remains exactly 11 original parents. Owner-supplied legacy structure has 75 children.
- Scoped WordPress CMS writer `scripts/aquathanhxuan-header-submenus-sync.cjs` added 66 missing `product_cat` children, reused 9 existing ones, created 75 WordPress native child menu items, no root deletion/replacement and no existing Product modification. Source URIs use real `/san-pham/<category.slug>` routes, not static Astro menu or legacy links.
- The 66 new categories may have no WooCommerce products assigned yet; assigning products is out of scope of the Header menu request.

## Execution and evidence
- Read-only menu inventory: Actions [42538047120](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42538047120) SUCCESS.
- Read-only WP REST/admin preflight: [42538314055](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42538314055) SUCCESS.
- Scoped CMS creation/readback: [42538691882](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42538691882) SUCCESS; `HEADER_SUBMENUS_CMS_PASS` includes 11 groups, 75 children, 66 new categories, 75 menu items, 9 reused categories. Artifact retains initial menu snapshot and IDs created.
- Source contract CI [42538938980](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42538938980) SUCCESS (4/4 jobs).
- WordPress-controlled production build [42539210197](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42539210197) SUCCESS; production Astro deploy [42539285414](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42539285414) SUCCESS.
- Production Playwright [42539445503](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42539445503) SUCCESS: `HEADER_WORDPRESS_MENU_CHILDREN_PASS=20,7,8,5,8,4,6,4,7,4,2`; `HEADER_DESKTOP_SUBMENU_PASS`; `HEADER_MOBILE_SUBMENU_PASS`; `CONSULTATION_OVERLAY_ICONS_PASS` at all 5 viewports 1440×900 / 1024×768 / 768×1024 / 844×390 / 390×844; original Footer wave, Home_05, native Footer Visual Builder inspector also PASS.
- QA read-only, no production CMS test writes. No further build needed.

## Carry-forward
- Current task fully implemented, deployed and QA PASS. Do not re-run.
- Future product assignment to newly-created child categories can be done separately only when owner requests it.
- Existing native Visual Builder save/readback/rollback remains a distinct, previously untested workflow; don't claim it was tested by read-only QA.

Chế độ code: auto-build
Cổng ghi source: bypass
Trạng thái: DONE — hoàn tất
