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

## Latest status / continuation checkpoint
- Production WordPress build: https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42555192451
- Production deploy: https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42555268992
- **IN_PROGRESS at writing:** confirm both actions completed successfully. Then rerun mobile+desktop Lighthouse independently against production and verify scores are numeric (not NO_LCP); run Playwright screenshot/interaction check: red price, scroll snap retained, arrow click scrolls, responsive viewport. Do not claim root-cause issue solved without post-deploy PASS.
- If Lighthouse still emits NO_LCP, inspect current production marker SHA, CSS styles loaded, trace, and retry targeted A/B; do not blindly remove carousel functionality.
- On passing QA update this checkpoint with the run IDs/results, set DONE and report to user. Keep last three status lines per CORE-08.

## Rollback
- Revert CSS-only commit 7fe42e8 and redeploy via same production workflow if regression occurs; red price committed separately in cec62f8 and should remain.
