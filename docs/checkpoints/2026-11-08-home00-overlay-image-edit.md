# Checkpoint — Hero slide 2 image editable through dark overlay

Project: aquathanhxuan.com
Date: 2026-11-08 (Asia/Ho_Chi_Minh)
Status: QA_PASS / PRODUCTION_DEPLOYED
Code mode: auto-build
Source gateway: bypass

## Cause and fix
- User reproduced image uneditable when “Hiện chữ và lớp nền tối” is ON; editable when OFF.
- Source: `src/astro/tablepress/Home_00.astro`. Decorative `.aqua-hero__shade` was above media and layout `.aqua-hero__inner` could intercept image click.
- Fix dark shade `pointer-events:none`, Builder-only layout `pointer-events:none`; explicitly mapped ESC text/link cells still `pointer-events:auto`.
- Astro master SHA: `685c891569c20dccf1381b6374855e247e6b616b`.
- Does not alter slide navigation action attributes, ESC row/field metadata, text toggle or WordPress CMS values.

## Release and verification
- Build request: `build-requests/2026-11-08-hero-overlay-image-select-685c891.json`.
- WordPress production build: https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42433381124 SUCCESS.
- Canonical Astro deploy: https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42433453755 SUCCESS.
- Added read-only QA hit-test + real click to image, asserting dedicated image editor opens native `home_00/image/row 1` and WordPress media chooser enabled. QA script revision `2004589bb6803d084caf13c076614e9391c7156b`.
- Final QA: https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42433918894 SUCCESS.
  - `HOMEPAGE_DEPLOY_READY=PASS 685c891...`
  - `HOMEPAGE_BUILDER_SECOND_IMAGE_HIT=PASS row=1`
  - `HOMEPAGE_BUILDER_SECOND_IMAGE_EDIT=PASS row=1 cms_write=false`
  - `HOMEPAGE_BUILDER_SECOND_SLIDE=PASS row=1 cms_write=false`
  - `HOMEPAGE_FINAL_QA=PASS`.
- Intermediate QA run 42433716076 failed because test checked the text editor row selector instead of the distinct image editor; corrected test without altering application source.
- No CMS write or image replacement. Production image selection path verified; persistent Save of a replacement image was intentionally not performed.
