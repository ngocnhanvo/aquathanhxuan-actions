# Checkpoint — Homepage integration QA PASS

Date: 2026-11-08 (Asia/Ho_Chi_Minh)
Project: aquathanhxuan.com

## Verified repository / production state
- Knowledge: `ngocnhanvo/knowledge/main`, AGENTS and core policies read; CORE-09 logging applies.
- Astro production source: `ngocnhanvo/aquathanhxuan-astro/master` SHA `a88d3981e01911a958fc904a29f49b67df15f2f3`.
- PHP source: `ngocnhanvo/aquathanhxuan-php/master` SHA `647ce3b3c0b976e9dda4d62d2366467d768274d3`.
- Production build run `42412361475` SUCCESS, deployment run `42412441555` SUCCESS.
- Homepage native WordPress Page 82454: processed ESC Table order `home_00,home_01,home_02,home_03,home_04,home_05`, each exactly once.
- Previously completed production parts: Header/Menu, Hero text visibility, Sale, Home02 substrate, Home03 combo, Home04 filters/lights, Home05 benefits, Footer. Do not recreate or repeat already PASS CMS mutations.

## New work in this continuation
- Added read-only integrated production Playwright QA:
  - `scripts/aquathanhxuan-homepage-final-qa.cjs`
  - `.github/workflows/aquathanhxuan-homepage-final-qa.yml`
- QA source commits: `87ca62d`, `275b2fb`, `0588bcc`, `601e375`, `c8617c0`, `94a11e5`, `79626d8`.
- Earlier test attempts correctly failed at (1) stale deployed SHA during a concurrent production release, (2) assuming public pages always emit Builder-only revision tags, (3) wrongly requiring an unconfigured Home02 CTA, (4) counting Footer Builder fields before its preview loaded. Fixed tests to respect the actual source contract; did not alter WordPress data.
- Final run: `42413344960` **SUCCESS**, job `128525976038`, `HOMEPAGE_FINAL_QA=PASS`.
  - Deployed SHA marker PASS: `a88d3981e01911a958fc904a29f49b67df15f2f3`.
  - CMS chain PASS: exactly one each of `home_00..home_05` in the correct order.
  - All five viewports PASS: `1440x900`, `1024x768`, `768x1024`, `844x390`, `390x844`.
  - No horizontal overflow. Twelve real Sale cards, four benefits, 11 native WordPress menu categories.
  - Hero navigation, desktop dropdown/search, mobile drawer open/close and search Escape PASS.
  - Actual image loading and valid CMS-linked CTAs checked; missing CMS button links do not trigger fake buttons.
  - Live authenticated Builder preview: versioned coordinates and fields for Home02–Home05, Footer CMS mapping has 9 fields.
  - In-viewport screenshots specifically captured Home04 equipment and Home05 benefits for all five viewports, with independent visual review confirming both render; Chromium's supplemental full-page screenshot may omit painted offscreen sections and must not by itself be used to judge them missing.
  - GitHub artifact ID `13590646762`, `aquathanhxuan-homepage-final-qa` (26 screenshots), artifact URL https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42413344960/artifacts/13590646762 .
- No additional Astro production build initiated by this QA; no WordPress mutation or PHP release in this continuation.

## Acceptance scope / future changes
- The homepage integration and source/Builder contract are verified at the current deployed SHA. This is a functional/responsive QA acceptance, not a claim of automated pixel-perfect similarity to every design SVG.
- Only reopen specific parts if new owner feedback or a regression establishes a concrete gap. Any later source change requires rebuilding the appropriate production version and rerunning the QA with that new marker.
- Maintain `chatgpt/latest-response.md` per CORE-09 so a fresh conversation sees this checkpoint rather than stale Home02 Insert Code blockers.

Chế độ code: auto-build
Cổng ghi source: bypass
