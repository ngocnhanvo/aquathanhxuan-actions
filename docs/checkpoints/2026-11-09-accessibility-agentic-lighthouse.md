# Checkpoint — Accessibility and Agentic Browsing Lighthouse (2026-11-09)

Project: aquathanhxuan.com  
Source: ngocnhanvo/aquathanhxuan-astro master  
Actions: ngocnhanvo/aquathanhxuan-actions main  
Code mode: auto-build  
Source gateway: bypass

## Baseline from user-provided Lighthouse 13.5.0 (2026-11-09T03:49:32Z)

- Production https://aquathanhxuan.io.vn/
- Accessibility 0.92, Agentic Browsing 0.67.
- `aria-hidden-focus`: `#consultation-menu` had `aria-hidden=true` but links/buttons remained focusable.
- `color-contrast`: Home_01 `.aqua-sale__prices del` #9699aa on white, contrast 2.82:1.
- `label-content-name-mismatch`: seven Home_01 image links had visible discount badges (e.g. -15%) but accessible names lacked them.
- `agent-accessibility-tree`: same underlying hidden-but-focusable menu issue.

## Source changes

- `src/astro/components/Tool/ContactWidget.astro`: add initial `inert` to consultation menu, synchronize `.inert` on open/close, move focus back to launcher when closing focused panel. Commit `0915838f31ce8338c651ca4606dc5cf7799daf79`.
- `src/astro/tablepress/Home_01.astro`: accessible name includes discount badge; old price color #646a7c, calculated contrast ~5.39:1 against white. Commit `48ff075e2fbc2f1ce880a984017ffe4e3541c271`.
- The Sale price strong #e32335 is unchanged; WordPress ESC Table data and Visual Builder structure unchanged.

## Production deployment evidence

- Trigger request `build-requests/2026-11-09-accessibility-agentic-48ff075e.json` points to exact Astro SHA `48ff075e2fbc2f1ce880a984017ffe4e3541c271`.
- WordPress Build Website run `42559734896` SUCCESS: https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42559734896
- Existing Astro production deploy run `42559809750` SUCCESS: https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42559809750

## Independent production QA — PASS

- Read-only workflow `.github/workflows/aquathanhxuan-accessibility-agentic-qa.yml`.
- Trigger request `qa-requests/accessibility-agentic-20261109.json`.
- QA run `42560016292` SUCCESS: https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42560016292
- Browser Playwright PASS: 1440x900 desktop and 390x844 mobile, seven Sale products per viewport, correct current production SHA, inert closed panel, menu opens and closes via Escape, focus returned, switching to AI chat, discount label included in accessible name, old-price computed color `rgb(100, 106, 124)`.
- Lighthouse CLI `13.5.0` category scores:
  - Desktop: Accessibility 1.00; Agentic Browsing 1.00.
  - Mobile: Accessibility 1.00; Agentic Browsing 1.00.
- All four audits `aria-hidden-focus`, `color-contrast`, `label-content-name-mismatch`, `agent-accessibility-tree` scored 1 on desktop and mobile, zero failing items.
- Full JSON and browser screenshots are saved in workflow artifact `aquathanhxuan-accessibility-agentic-qa`.

## Status

DONE — source committed, production build/deploy PASS, browser and Lighthouse 13.5.0 QA PASS. No PHP/WordPress CMS changes.

Rollback: revert both Astro commits and redeploy using the existing production pipeline; retain unrelated Home_01 Sale price strong red and mobile hero optimizations.
