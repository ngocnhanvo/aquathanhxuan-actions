# Aqua Thanh Xuân — Home00 blank banner at the 767–768px breakpoint (2026-11-11)

## User report
- Production screenshot at DevTools responsive ~767×760, DPR 2: top hero region dark/blank, while slider navigation arrows and two desktop dots are visible.
- Source render was `src/astro/tablepress/Home_00.astro`; native WordPress ESC Table `home_00` retains two desktop rows and one mobile-only row. No CMS write or media replacement was required.

## Findings
- Prior implementation only included a viewport-specific desktop `<source media="(min-width: 768px)">` and mobile `<source media="(max-width: 767px)">`, with a one-pixel transparent `<img src>` fallback. These predicates do not logically cover fractional CSS widths strictly between 767px and 768px.
- The browser-side slider uses `matchMedia("(max-width: 767px)")`. Desktop source media was corrected to the exact logical inverse: `not all and (max-width: 767px)`.
- Separate pre-fix production diagnostics: [#42940696022](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42940696022) and [#42940991823](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42940991823) confirmed image requests returned 200 and the normal integer-sized viewport works. This rules out a persistent missing CMS asset at those sizes, but does not independently reproduce the reported Chrome fractional-viewport state.

## Changes
- Repo: `ngocnhanvo/aquathanhxuan-astro`, `master`.
- Commit `b208b9f82c669953ec6685e740f539ee4c21e046`: align desktop source media with inverse of the existing mobile query. No changes to contents, image paths, CSS layout, checkout or production pipeline.
- Source QA workflow [#42941509621](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42941509621): PASS for Astro compilation and four `home00.ts` Vitest cases.
- Production WordPress trigger [#42941605066](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42941605066): PASS.
- Existing production deploy [#42941711725](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42941711725): PASS with exact source SHA above.
- Independent production Playwright QA [#42941999424](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42941999424): PASS. Marker matches the source SHA; mobile 390×844 and 767×760 render one mobile image and hide controls; desktop 768×760, 1024×768 and 1440×900 render original desktop image and two desktop slides. All active images have nonzero natural width. Screenshots uploaded as `aqua-home00-fractional-qa`.

## Boundary limitation
The additional iframe styled 767.5px produced browser `innerWidth=768`; that specific browser did **not** expose a fractional CSS media evaluation. The QA therefore confirms a working image in this iframe, not a reproduction of the narrow prior break. The corrected media strings are logical complements regardless of width. If a user can still reproduce a dark hero after deployment, capture the active slide `data-audience`, computed `matchMedia` results, img `currentSrc`, `naturalWidth`, and actual image network status for that browser before making further changes.

## State
- CODE_READY: PASS
- BUILD_SUCCESS / DEPLOY_READY: PASS
- QA_PASS: PASS for tested production viewports
- No pending source or CMS write for this report.
