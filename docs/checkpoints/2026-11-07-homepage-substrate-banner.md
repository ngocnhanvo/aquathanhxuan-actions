# Checkpoint — Homepage substrate banner
Date: 2026-11-07 (Asia/Ho_Chi_Minh)
Project: Aqua Thanh Xuân
Knowledge main: cd7d1e3999e1328bb33ce99dd9a6a7a14e4d4223
Astro master: 197a54fcddb77c02d5d986f71cdc92b14c403341
PHP master: e3dda1b6242aa5a4b95a3f8f84726dd85c5c5b7b
Actions native inventory: 6c28c26cb497e70f0ccc07f0b83dd50f5224770d

## Verified
- Header, WordPress Menu, Hero text toggle and Sale already PASS. Do not redo.
- Sale build #42388459540, deploy #42388529828, QA #42388970820 SUCCESS.
- Public inventory #42392563861 SUCCESS.
- Authenticated WordPress Admin native ESC Table inventory #42392841497 SUCCESS.
- WordPress Admin login PASS. Native table list contains ONLY home_00 (Trang chủ - Hero) and home_01 (Trang chủ - Sale). home_02, home_03 and home_04 are absent.
- Published WordPress Page 82454 includes home_00 and home_01 only.
- Astro has Home_00.astro and Home_01.astro only. No Home_02 component.
- Design reference: docs/design/aquathanhxuan-homepage/HANDOFF.md section 3.5.

## Status
- NATIVE_TABLE_EXISTS: FAIL (home_02 does not exist)
- AUTHENTICATED_INVENTORY: PASS
- HOME_02_CONTENT_SOURCE: NOT STARTED
- CMS_CREATE_HOME_02: NOT STARTED
- ASTRO_HOME_02: NOT STARTED
- VISUAL_BUILDER_MAPPING: NOT STARTED
- BUILD_DEPLOY_VISUAL_QA: NOT STARTED

## Concrete next actions
1. Inventory approved native WordPress media and existing real category/page content for substrate and substrate materials. Do not use mockup text/images as production content or invent products.
2. Create home_02 native ESC Table with appropriate schema and verified content/media; preserve existing home_00/home_01 and Page 82454. CMS writes must be minimal and validated, with rollback and read-after-write.
3. Implement Home_02 Astro mapping from native data, preserving full Visual Builder source coordinates (table_id + row + field + version), with no text matching heuristic or fallback.
4. Run source tests, only trigger production build through existing WordPress Build Website workflow after CMS + mapping are ready; QA 5 viewports.
5. Record resulting commits, test and deploy run IDs.

Cổng ghi source: bypass
Chế độ code: auto-build
