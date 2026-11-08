# Aqua Thanh Xuân — ESC Builder Hero slide 2 navigation fix (2026-11-08)

## Status: QA_PASS / PRODUCTION_DEPLOYED

- Knowledge: `ngocnhanvo/knowledge@main`; source gateway `bypass`; code mode `auto-build`.
- Previous checkpoint: `2026-11-08-homepage-hero-sale-visual-builder.md` (kept intact, previous jobs not repeated).
- Astro `master`: `28e6a2fa8e5d32a71babf6375e8160290d3d3312`.
- Root cause: Hero arrows/dots lacked `data-esc-builder-preview-action` while the Builder capture listener only permits native, explicitly opted-in UI interaction. The click was intercepted as section selection, preventing slide navigation.
- Fix: apply `data-esc-builder-preview-action` to previous, next and slide dot buttons in `src/astro/tablepress/Home_00.astro`. Actual links remain navigation-blocked in Builder; existing edit-cell coordinates are retained.
- Regression QA: updated `scripts/aquathanhxuan-homepage-final-qa.cjs` to expect new Astro SHA and click Next inside the Builder, then click slide 2 `show_text` and assert `1:show_text` exact native cell.
- Build request: `build-requests/2026-11-08-hero-slider-builder-controls-28e6a2f.json`.
- WordPress production build: https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42432376811 — SUCCESS.
- Canonical Astro production deploy: https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42432445283 — SUCCESS.
- Final Playwright QA: https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42432710459 — SUCCESS; `HOMEPAGE_DEPLOY_READY=PASS 28e6a2f...`, `HOMEPAGE_BUILDER_SECOND_SLIDE=PASS row=1 cms_write=false`, `HOMEPAGE_BUILDER_HERO_TOGGLE=PASS`, `HOMEPAGE_BUILDER_SALE_CELLS=PASS`, `HOMEPAGE_FINAL_QA=PASS`.
- Two failed intermediate runs were timing/fixture conditions: first ran while old Astro was still deployed; second QA script pinned old expected SHA. The final QA run corrected both and passed.
- No WordPress content mutation. Banner 2 image contains text pixels (PRODAC) which must be replaced by editing the image rather than by modifying an ESC text cell; ESC overlay cells remain editable via row/field mapping.
