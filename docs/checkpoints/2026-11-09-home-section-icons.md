# Checkpoint — Homepage section heading icons (2026-11-09)

Project: aquathanhxuan.com
Knowledge: ngocnhanvo/knowledge main @ 78865ea3036b8d816f82d97b7bdecb1e3361c30a
Astro: ngocnhanvo/aquathanhxuan-astro master @ 88a501b95e7063434defc701658a9438837bf23c
PHP: ngocnhanvo/aquathanhxuan-php master @ dcec014aec735061bcc8af1060a6cd5d64766243
Actions: ngocnhanvo/aquathanhxuan-actions main
Mode: auto-build
Source gate: bypass
Status: DONE

## Scope and source changes
- Home_03.astro: add decorative white SVG gift icon before native ESC Table title “Hot combo”; match heading gradient and responsive sizing.
  Commit: https://github.com/ngocnhanvo/aquathanhxuan-astro/commit/88a501b95e7063434defc701658a9438837bf23c
- Home_02.astro: replace generic leaf icon in reused Home_06 (Máy lọc) with filter cartridge + water-drop outline; in Home_07 (Đèn) with lightbulb outline; preserve original leaf for Home_02 (Nền).
  Commit: https://github.com/ngocnhanvo/aquathanhxuan-astro/commit/82b4406dae19cbad2e72b6ce74aaa9df6268ab5d
- ESC Table content, item selection, categories and WordPress data were not modified. Icons are decorative SVG in Astro; section titles and controls retain existing editable native source coordinates.

## Production release
- Build request: build-requests/2026-11-09-home-section-icons-88a501b.json
- Build SHA locked to 88a501b95e7063434defc701658a9438837bf23c
- Production build (WordPress trigger): https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42550231371 — PASS.
- Production deploy: https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42550308260 — PASS.
- Production URL: https://aquathanhxuan.io.vn

## Production QA
- Automated read-only Chromium/Playwright: https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42550539940 — PASS.
- Six viewports: 1440×900, 1024×768, 768×1024, 844×390, 390×844, 320×700.
- All three headings checked at each viewport: native title text, correct icon SVG shape, gradient background, screenshot.
- 18/18 heading icon checks PASS; mobile/desktop hero regression PASS; no horizontal overflow.
- WordPress native Home_00 and Media ID 82696 readback PASS (no CMS changes).
- Screenshot artifact: https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42550539940/artifacts/13645058504

## Rollback
- Revert the two Astro commits above (or redeploy preceding Astro master 1a835b579a239ea6dc87ce4cf02018c4ec62c4c9 through approved production pipeline). No database rollback required.

Outcome: DONE — source, production deployment and six-viewport QA verified.
