# Latest ChatGPT response

Date (Asia/Ho_Chi_Minh): 2026-11-08
Project: aquathanhxuan.com
Task: Fix Visual Builder Product-source ESC Table source/target selection for item swap
Code mode: auto-build
Source gateway: bypass

## Final response

DONE — Product-source item swap selection now works on the production homepage Visual Builder.

Problem: In home_01 (meta.api=Product), sorting forced `from=null` and only let editors select source/target through indexed ID list. WooCommerce-hydrated Product cards lacked canonical source row metadata; clicking products could not select source. WordPress Product attributes remain read-only, but Product ID references in ESC Table can be reordered.

Implemented:
- `aquathanhxuan-astro/src/astro/tablepress/Home_01.astro`: add immutable `data-esc-builder-product-id` to each Product card in Builder preview only.
- `aquathanhxuan-astro/src/lib/wordpress/builderSectionDrafts.ts`: shared Product ID -> exact ESC Table source row mapping (not rendered DOM index), source/target click selection, red/blue visual marks, carousel arrows continue working, safe Product-card DOM reorder after confirmed WordPress save; guard ambiguous product IDs. WooCommerce names/prices/images not edited.
- `aquathanhxuan-php/wp-content/plugins/esc-visual-builder/includes/item-section-ui.php`: open product visual picker and keep indexed list as fallback for unrendered products; accept `esc-vb-item-source-picked` and target; after versioned backend swap success send Product reference order to iframe.
- No CMS product data or ESC Table item positions were changed as part of QA.

Commits:
PHP master cebbc88028498a241c45037a7d21a5fe1395932a, 5211812e8ec8a20c28afa3371c6949d5662e0d2b.
Astro master 4a7e461dce729c170beaf2259ff1de6a12c49761, 52ac002b68aab8463af973d341d34d86085de6ff, e21ff0d453b026f6ee927dbbf4aecc92ecf8986b, 07733ebb92aa255db8f141e382b8e7556cf809c5, 3388ab1988d083eaf3a0c149a09e9367a69b0640.

Evidence:
- Source/Chromium contracts: https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42445989329 SUCCESS, 3 jobs PASS.
- PHP production deployment: https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42446094205 SUCCESS with SHA-256 verification.
- WordPress-controlled Astro build: https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42446176356 SUCCESS.
- Astro production deployment: https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42446243621 SUCCESS; deployed Astro source SHA 3388ab1988d083eaf3a0c149a09e9367a69b0640.
- Authenticated real-production read-only Playwright: https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42446709013 SUCCESS. Tested 1440x900 and 390x844, item schema HTTP 200, indexed list 12, visually clicked Product source ID 82477 and destination ID 82479, save action became enabled, red/blue marks present, canceled without CMS write, no product navigation/cart mutation.

Chế độ code: auto-build
Cổng ghi source: bypass
Trạng thái: DONE — hoàn tất
