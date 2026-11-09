# Aqua Thanh Xuân — Mobile-only homepage banner (2026-11-09)

## Owner request
Verify native desktop/mobile image handling in Home_00; design/upload one new portrait mobile banner; keep both current desktop banner image cells unchanged.

## Verified WordPress and asset
- Native ESC Table: `home_00` on WordPress `https://admin.aquathanhxuan.io.vn`, homepage Page `82454`.
- Existing header fields include `image`, `mobile`, `show_text`, `link` and 10 other fields; original two desktop rows (0,1) initially had empty `mobile`.
- Original image source cells were and remain `cropped-banner-8-1.png` and `cropped-banner-6.png`, preserved byte-for-byte in native TablePress grid.
- New generated mobile aquascape artwork optimized to WebP 420x525, SHA256 `d9bf3fe3855df0fa49381bf356c8b91ba1a56aed5a5eb3e02640866bad111d71`, committed in `assets/aqua-thanh-xuan-mobile-hero.webp` of Actions repo.
- Exact verified Media Library upload: Media ID `82696`, source filename `aqua-thanh-xuan-mobile-hero.webp`, SEO descriptive alt text.
- Writer `scripts/aquathanhxuan-home00-mobile-upload.cjs` made scoped edits: `mobile` flags of original rows = `0` (desktop), added one third row `mobile=1` and image `<img src="/wp-content/uploads/.../aqua-thanh-xuan-mobile-hero.webp" alt="...">`, `show_text=0` to avoid duplicating embedded text, link `/san-pham`.
- WordPress native media/table Save → Reload → Readback **PASS** in [Actions #42547865785](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42547865785): `HOME00_MOBILE_CMS_PASS` with `mediaId=82696`, `originalDesktopImagesPreserved=2`, `mobileSlides=1`, `deviceFlags=["0","0","1"]`, `tableRows=5`.
- Initial read-only preflight [Actions #42547410623](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42547410623) PASS.
- Temporary ChatGPT Library base64 transfer file was deleted after GitHub blob checksum verification. No library residue intended.

## Frontend source
- Astro `master` source SHA `1a835b579a239ea6dc87ce4cf02018c4ec62c4c9`:
  - Existing `mobile` selector keeps 2 desktop slides and the third mobile-only.
  - Dedicated portrait height (125vw) and image containment, hide redundant controls when only one mobile slide is eligible, interactive CTA hotspot backed by CMS `link`, not hardcoded.
  - Existing ESC Table image row/field edit metadata remains intact.
  - Unit test `home00.test.ts` verifies desktop/mobile separation and original sources.
- Source-only CI [Actions #42548056437](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42548056437): SUCCESS all 4 jobs.

## Production release and final QA
- Production build [42548269209](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42548269209) SUCCESS, `SOURCE_SHA_VERIFIED=1a835b5...`, `BUILD_SUCCESS=PASS`, `DEPLOY_READY=PASS commit=1a835b579a239ea6dc87ce4cf02018c4ec62c4c9`, WordPress-triggered canonical pipeline. Deploy [42548344975](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42548344975) SUCCESS. No duplicate build.
- Final read-only Playwright [42548911873](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42548911873) SUCCESS:
  - `HOME00_DESKTOP_VIEWPORT_PASS`: 1440x900, 1024x768, 768x1024, 844x390. Both original desktop banners retained and carousel Next works.
  - `HOME00_MOBILE_VIEWPORT_PASS`: 390x844 and 320x700. CMS-sourced optimized portrait image `/images/pages/aqua-thanh-xuan-mobile-hero-480w.webp` loads, object-fit contain prevents crop, CTA hotspot links to /san-pham, no horizontal overflow.
  - `HOME00_NATIVE_CMS_READBACK_PASS=desktop:2,mobile:1,row:2`.
  - `HOME00_MOBILE_MEDIA_PASS=82696`, `HOME00_MOBILE_PRODUCTION_QA=PASS`.
  - QA screenshot artifact ID `13644476593` (six viewport screenshots).
- Intermediate read-only QA runs 42548569826 and 42548722560 failed test implementation assertions only: compared .png names against processed .webp and read authenticated Media REST without nonce. Corrected QA; no additional CMS writes or deployment required.
- All requested work is complete and verified. Do not repeat image upload, CMS update or build on next chat. Re-run only if a new regression is reported.

Chế độ code: auto-build
Cổng ghi source: bypass
Trạng thái: DONE — hoàn tất
