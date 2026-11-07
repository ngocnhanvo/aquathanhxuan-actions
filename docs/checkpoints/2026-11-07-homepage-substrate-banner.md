# Checkpoint — Homepage substrate banner
Date: 2026-11-07
Project: Aqua Thanh Xuân
Astro HEAD master: 197a54fcddb77c02d5d986f71cdc92b14c403341
PHP HEAD master: e3dda1b6242aa5a4b95a3f8f84726dd85c5c5b7b
Actions inventory commit: 92fb59ca3778fc0f6623921b06749737da3b71a0

## Verified
- Header, Hero, Hero text toggle and Sale: PASS. Do not redo.
- Sale build 42388459540, deploy 42388529828, QA 42388970820: SUCCESS.
- Read-only inventory 42392563861: SUCCESS.
- WordPress Page 82454 published; rendered shortcodes: home_00 and home_01; no home_02.
- Public TablePress /tables and /tables/home_02|home_03|home_04 returned HTTP 404. This does not prove native tables absent.
- Astro currently has Home_00.astro and Home_01.astro only.
- Design contract: docs/design/aquathanhxuan-homepage/HANDOFF.md, section 3.5.

## Status
- NEXT_SECTION_INVENTORY: PARTIAL PASS
- NATIVE_TABLE_EXISTS: NOT TESTED
- CODE_READY: NOT STARTED
- BUILD_SUCCESS: NOT STARTED
- DEPLOY_READY: NOT STARTED
- VISUAL_QA: NOT STARTED

## Next
1. Inventory native ESC Table from authenticated WP Admin, determine actual table IDs and content/media.
2. If needed, create structured home_02 with real images/copy and insert into Page 82454 via native Insert Code; preserve home_00 and home_01.
3. Implement Home_02 Astro component and data mapping from ESC Table, with editable text/image/CTA and Visual Builder coordinates.
4. Test, build/deploy only through existing production pipeline, QA five reference viewports, record all run IDs.