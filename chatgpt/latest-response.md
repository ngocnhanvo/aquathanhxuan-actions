# Latest ChatGPT response

Date: 2026-11-08 Asia/Ho_Chi_Minh
Project: aquathanhxuan.com
Chế độ code: auto-build
Cổng ghi source: bypass

## Current objective
Complete requested homepage Nền section: NO sidebar image, NO Tất cả sản phẩm/filter; left side 9 genuine Nền child category navigation links; right side ordered 10 genuine products sourced by native ESC Table **home_02products** (reserved third underscore for _vi/_en).

## VERIFIED DONE so far
1. Source Astro master includes independent table selection, sidebar link navigation, no sidebar image / filter, product row identity / instant add template, localized home_02products_en support; latest relevant commits: d254c5404499a7fe344bbba99d52951eaa41d4cc, f2c1cdb1db73b0765f65bc6d280c86cfda3797e3 and 74f99b0af7bab4873ec525149051bf738bc375fc.
2. Real original WooCommerce site https://aquathanhxuan.com has 10/10 matching products with actual IDs, slugs, pricing, original images. Source evidence chatgpt/home02products-legacy.json, run 42459677742 PASS.
3. Real destination WooCommerce has all 10 genuine imported products, verified name/slug/prices/media, source→target IDs: 350158→82535; 350149→82537; 350144→82539; 350137→82541 (COCO FA with original slug den-kaokui-70w-pro); 269193→82543; 269138→82545; 269135→82547; 267614→82549; 267612→82551; 267608→82552. Migrator run 42460343206, imported_step SUCCESS; table_step failure only. Source details and IDs preserved; no invented product records.
4. WordPress ESC Table home_02products ACTUALLY EXISTS with 10 ordered ID rows. Table inspection run 42461070871 succeeded; native meta.api was blank (not Product). Inspected home_01 as known working example (meta.api Product, native source selector).
5. Astro Builder/source test run 42460545238 all preview-browser/native-cells/homepage-data SUCCESS; prior 42460056562 24/24 vitest tests PASS.

## CURRENT ACTIVE ACTION
- Native repair script scripts/aquathanhxuan-home02products-api-fix.cjs checks verified IDs against original table data, sets existing table #js_custom_api_source to Product, saves via native TablePress UI, verifies rows unchanged and REST meta.api Product.
- After repair, same workflow runs scripts/aquathanhxuan-home02products-create.cjs to verify products+locale then insert '[table id=home_02products /]' into WordPress homepage Page ID 82454 using native Insert Code.
- Workflow .github/workflows/aquathanhxuan-home02products-create.yml updated at commit 422f485288572e6e02ba428c58ca9e870237a068; auto push trigger launched. Status via chatgpt/home02products-status.json, CHECK for source_sha matching 422f485... and api_repair_step/cms_step SUCCESS; older source_sha ca548... was failure and is stale.

## Pending
1. Inspect CMS workflow status and logs, repair until both native API and native insert PASS; no more product migration.
2. Confirm WooCommerce/WordPress table REST meta.api=Product, items exactly 10 IDs; Page native shortcode inserted once; verify public Page serialized /data/page-default.json after build.
3. Trigger existing ONE production build workflow through build-requests/*.json with EXACT latest Astro/master SHA (do not invent/reuse stale SHA). Workflow .github/workflows/aquathanhxuan-wordpress-production-build.yml validates source SHA and invokes existing WordPress Build Website, checks actual success. Keep normal pipeline, no second deploy mechanism.
4. After build success, trigger prepared QA workflow .github/workflows/aquathanhxuan-home02products-qa.yml by controlled workflow-file push (no generic dispatch GitHub connector available). Script scripts/aquathanhxuan-home02products-qa.cjs tests 5 viewports, genuine 10 cards, nine category links, no filter/image, Page data, Visual Builder Product IDs, images; inspect chatgpt/home02products-live.json. Fix any issues and rerun.
5. Disable automatic CMS writer workflow triggers after PASS (manual workflow_dispatch only) to prevent accidental future duplicate writes.
6. Update latest-response to DONE only after actual build + production QA all PASS.

Never claim DONE until proof. Real WP products already imported, so do not recreate. Read live repo/HEAD before every commit.

Chế độ code: auto-build
Cổng ghi source: bypass
Trạng thái: PARTIAL — chưa hoàn tất
