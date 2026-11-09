# Checkpoint — Sale price red + Lighthouse NO_LCP (2026-11-09)

Project: aquathanhxuan.com
Repos: ngocnhanvo/aquathanhxuan-astro master, ngocnhanvo/aquathanhxuan-php master, ngocnhanvo/aquathanhxuan-actions main
Code mode: auto-build
Source write gate: bypass

## User objective
1. Display homepage Home_01 Sale bùng nổ sale prices red, matching the substrate product section.
2. Diagnose and resolve the red exclamation / absent Lighthouse Performance score for https://aquathanhxuan.io.vn/ without breaking the site.

## Completed
- Astro commit cec62f84974dd7ce68f6cbb56a06641814f8050c changed `.aqua-sale__prices strong` to `#e32335`.
- Production build 42552377664 + deploy 42552465887 both PASS. Playwright computed sale price `rgb(227, 35, 53)` mobile+desktop.
- Reproduced Lighthouse `NO_LCP` on both form factors via Actions runs 42552493826, 42552722039, 42553062995. Some initial `NO_NAVSTART` also observed transiently. First paint and CLS reported; browser loaded 49 images, no JS errors/request failures. PageSpeed public API on runner HTTP429 quota, independent issue.
- CSS-only A/B: blocking all external styles restores native Chrome LCP. Of two loaded CSS files, blocking `Layout.CqAepo0p.css` restores LCP; blocking compiler CSS does not (run 42554218345).
- PostCSS rule bisection of the exact production CSS: 1,240 top-level rules; removing Sale track rule 58 OR Sale card rule 60 restores hero LCP (run 42554781631).
- Declaration-level test run 42554957962 confirms removing `scroll-behavior: smooth` from Sale track alone restores visible hero LCP, while maintaining display:flex, horizontal overflow, scroll snap. Removing `scroll-snap-type`, `scroll-snap-align`, or overscroll behavior can also recover LCP but would change more UI behavior.
- Existing `Home_01.astro` carousel arrows explicitly use `track.scrollBy({ ..., behavior: "smooth" })`; CSS smooth property is redundant.
- Astro commit 7fe42e89648c13dc84d72db8d80bf77086c13306 removed only Sale track CSS `scroll-behavior: smooth`, leaving arrow smooth and snap intact.
- Build request `build-requests/2026-11-09-lighthouse-lcp-7fe42e8.json` pinned to Astro SHA 7fe42e89648c13dc84d72db8d80bf77086c13306.

## Final production verification — DONE
- WordPress production build: https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42555192451 — SUCCESS; build source SHA verified `7fe42e89648c13dc84d72db8d80bf77086c13306`.
- Production deploy: https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42555268992 — SUCCESS; signed ZIP upload and provenance verified.
- Post-deploy independent Lighthouse (rerun attempt 2): https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42553553595 — SUCCESS. Mobile Performance 0.87; LCP 2.639 s; Desktop Performance 0.99; LCP 0.696 s; both have 0 audit errors and non-null LCP. Native PerformanceObserver captured LCP entries for hero images, no JS errors or request failures.
- External PageSpeed Insights API returned 429 (Google daily quota) on the runner; independent Lighthouse run succeeded and is the acceptance oracle.
- Read-only Playwright Sale UI regression: https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42556424357 — SUCCESS. Five viewports 1440×900, 1024×768, 768×1024, 844×390 and 390×844. Assertions: production SHA; real homepage ESC Table source; seven current cards and valid images; computed price `rgb(227, 35, 53)`; computed CSS scroll-behavior auto and scroll-snap `x mandatory`; Next arrow scroll; no horizontal overflow. Screenshots available in run artifact.
- QA-only script updated in Actions `aquathanhxuan-sale-visual-qa.yml` to avoid obsolete hardcoded 12-card assertion and isolate arrow test from test-induced snap state. No additional Astro/PHP changes, no CMS writes, no further deploy needed.
- Status: **DONE**. Root cause fixed and post-deploy QA passed.

## Rollback
- Revert CSS-only commit 7fe42e8 and redeploy via same production workflow if regression occurs; red price committed separately in cec62f8 and should remain.
