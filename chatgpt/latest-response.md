# Latest ChatGPT response — Aqua Thanh Xuân

Date: 2026-11-08, Asia/Ho_Chi_Minh
Project: aquathanhxuan.com
Chế độ code: auto-build
Cổng ghi source: bypass

## Goal
Homepage Nền sidebar shows only genuine direct children of WordPress ProductCategory Nền; click a category navigates to listing products belonging to it. No sidebar image, no Tất cả sản phẩm filter/select. Right grid is an independent Product ESC Table **home_02products** containing the 10 verified products from legacy aquathanhxuan.com.

## Verified PASS
- WordPress has 10 imported real products: IDs 82535, 82537, 82539, 82541, 82543, 82545, 82547, 82549, 82551, 82552. Legacy record/name/slug/price/media verified by run 42460343206. No dummy data. Import workflow switched to manual.
- Native WordPress ESC Table home_02products includes these 10 exact IDs in order, `meta.api=Product`; native Insert Code placed shortcode once in Home Page 82454. CMS writer run 42462179020 PASS both api repair and shortcode.
- Initial Astro production release d254c5404499a7fe344bbba99d52951eaa41d4cc build run 42462368676 PASS.
- Initial production QA run 42462688926 proved CMS + serialized cache ID list exact 10/10; grid emitted all cards. It failed because sidebar had 7 while old checkpoint expected 9.
- Read-only WP native taxonomy: Nền term id=1775 has **exactly 7 direct child terms** in current WordPress: 1781 Chihiros, 1782 Contro Soil, 1783 Master Soil, 1784 Tropica, 1785 Vũ Aqua, 1786 Dennerle, 1787 Gex. Prior guessed term IDs 1779/1780 do NOT exist on current WP; do not fabricate or recreate. Native/custom source confirmed by run 42462940021.
- Old frontend sidebar href /chihiros et al was HTTP 404; direct legacy archive candidate URLs also 404 (run 42463079726). Missing archive routes were the actual blocker.
- PHP item-manager native Product ESC Table supports adding/removing/reordering Product ID references while source product data remains read-only; table schema is valid.
- Latest source Visual Builder contract test run 42463495770: preview-browser/native-cells/homepage-data all SUCCESS (Astro master at that test was 21225387).

## Recent code
Astro master latest SHA **21225387b1b766d566cd0611bc0b7da9c1a60b69**:
- Home_02.astro sidebar links now use existing Product listing Page '/san-pham?cat=' + real category slug instead of broken /slug/category paths. Sidebar category taxonomy remains real WP.
- ProductsPage.astro includes per-product categorySlugs from actual WooCommerce categories[], matches query against this structured metadata; uses WP category tree labels for selected category heading. Existing product listing UI otherwise unchanged.
- src/pages/[...slug].astro passes cache productCategories to ProductsPage.
- Added regression test of mapping and route.
- Does not create imaginary WordPress Pages or hardcode products/category labels.

Actions repo:
- New build request `build-requests/2026-11-08-home02-category-listing-21225387.json` at commit d4e3567b462beefaa03ab2b6f8c19f350d42f25e, targets latest Astro SHA above. Uses ONLY existing production pipeline `.github/workflows/aquathanhxuan-wordpress-production-build.yml`.
- Build status checkpoint `chatgpt/aquathanhxuan-build-latest.json` is **currently stale** (run 42462368676 for previous Astro SHA). Do not claim latest build passed until status contains `21225387...` with production_step success and logs verify.
- Production QA `scripts/aquathanhxuan-home02products-qa.cjs` updated: compares exactly 7 real WP child slugs with sidebar links and verifies navigation to /san-pham?cat=... and client H1. Run `.github/workflows/aquathanhxuan-home02products-qa.yml` on latest deployed revision, not before.

## Still required
1. Watch production build run for request source SHA 21225387 and verify success logs, marker source SHA.
2. Trigger current Home02 QA workflow by modifying its workflow file (currently push trigger path), inspect `chatgpt/home02products-live.json`, fix any runtime/Visual Builder QA failures.
3. After PASS, set QA workflow and native CMS writer to manual-only if not already, without triggering another unnecessary build.
4. Confirm actual Visual Builder item add/delete/reorder access read-only (avoid writes to real production products just to test), production visual 5 viewports, image health, category nav.
5. Store actual final response/checkpoint in this file as last step. Only DONE if all real QA/production checks PASS.

Chế độ code: auto-build
Cổng ghi source: bypass
Trạng thái: PARTIAL — chưa hoàn tất
