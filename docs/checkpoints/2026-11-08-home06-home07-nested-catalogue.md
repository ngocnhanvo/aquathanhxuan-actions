# Aqua Home 06 / Home 07 — nested equipment catalog continuation

Date: 2026-11-08 Asia/Ho_Chi_Minh
Project: aquathanhxuan.com
Status: IN_PROGRESS — do not report final DONE without actual CMS, deploy and Builder QA
Code mode: auto-build
Source gateway: bypass

## Already complete — never repeat
- Original Home 02 nested Product production: `docs/checkpoints/2026-11-08-home02-nested-tool-products.md`; migration 42494247980, build 42494478116, deploy 42494552586 and Builder QA 42494730962 all SUCCESS.
- Astro production source before these new changes: f86657ebb2fd. PHP: 869b3ad842ef.

## Scope remaining from original two-section request
- Turn "Máy lọc" and "Đèn" into complete independent native ESC Table merchandising sections like Nền: parent tables `home_06` and `home_07`, Product children `tool_home06products` and `tool_home07products`, nested `shortcode-products` mapping, standalone parent Insert Code in native WordPress Page 82454, Builder add/delete/red-blue reorder; preserve existing Page sections, WooCommerce product data and source pages.
- Reuse Astro components `Home_06.astro` and `Home_07.astro` which already share `Home_02.astro`.

## Verified current work
- Initial read-only inventory script regex fixed, commit 4e50af3d; workflow 42496162951 SUCCESS.
- Legacy source `https://aquathanhxuan.com` has 10 verified filter Products (source IDs 350156,269169,269168,269165,269143,269140,269105,269102,267192,267189) and 9 lights/accessories (350158,350149,350144,350137,269193,269138,269135,267097,267093).
- Destination WooCommerce filter root `may-loc` ID 1769 and lights root `den` ID 1768 were present with no children. TablePress parents `home_06` and `home_07` were REST 404 before migration. Native WordPress Page shortcodes were home_00..home_05 only.
- Guarded import run 42496783741 SUCCESS: 19 verified Product mappings (10 filters newly imported, 7 lights reused, 2 accessories imported), real media and original prices, 5 child WooCommerce terms created, no invented records. Product IDs for new filter list: 82577,82579,82580,82581,82583,82585,82587,82589,82591,82592. Lighting list: 82535,82537,82539,82541,82543,82545,82547,82594,82596. Root and child categories assigned preserving existing taxonomy.
- Astro catalog sidebar fix: `src/lib/wordpress/tablepress/home02Catalog.ts` commit 7cc9670, regression tests commit c5e12e2. Source QA run 42497158378 PASS, 3 suites, 26 tests, source SHA c5e12e223e1e92806a32c68c35f759ca1e8a8110.

## Pending and concrete next actions
1. Check workflow `Aqua equipment products guarded CMS migration` run 42497091963 (initial script) and run 42497379069 (newer script `46a48b53...`). These each execute idempotent import and *then* native Page+ESC Table writer using generated mapping artifact; later run includes native fallback for persisting `meta.api=Product`. Do not dispatch more imports unnecessarily. Read job logs, repair actual failure and rerun only if necessary.
2. Writer: `scripts/aquathanhxuan-equipment-sections-create.cjs`, importer `scripts/aquathanhxuan-equipment-products-migrate.py`, workflow `.github/workflows/aquathanhxuan-equipment-products-migrate.yml`. It must verify actual child tables, parent `shortcode-products`, native Page Insert Code `home_06`/`home_07` after home_04 and before home_05. Do not duplicate standalone child shortcodes. Do not touch existing six sections.
3. After CMS PASS, create a JSON build-request under `build-requests/*.json` with pinned Astro SHA c5e12e223e1e92806a32c68c35f759ca1e8a8110; this triggers the *existing* WordPress production Build Website workflow; record build/deploy run IDs and verify source marker.
4. Then create `qa-requests/equipment-production.json` with exactly the deployed source SHA; the existing read-only `.github/workflows/aquathanhxuan-equipment-production-qa.yml` will check both tables, 5 viewports and native Builder add/delete/sort/cancel. Writer and QA scripts already exist. Fix any fails and rerun with evidence.
5. Update this checkpoint and `chatgpt/latest-response.md` with truthfully verified DONE/PARTIAL and direct run links.

Never assume an in-progress job or a trigger submission equals PASS. Never alter source Products from WooCommerce through Builder. The earlier Home02 success is separate from completing Home06/07.

## Continuation — CMS writes and Classic Editor fix (2026-11-08)
- Run 42497091963: import PASS, sections FAIL at immediate REST readback for the first new Product child. On its next run, the table was found/reused and the native Product selector fixed the source.
- Run 42497379069: importer PASS; writer read-after-write confirmed `tool_home06products` (10 refs, Product), `home_06` parent, `tool_home07products` (9 refs, Product) and `home_07` parent; all four relationships PASS. **The Page insertion did not run successfully**: WordPress Quicktags input `#qt_content_tablepress_quicktags_button` was hidden after direct `tinymce.hide()`; the workflow correctly failed without publishing Page 82454.
- Corrective Actions commit `385fe5b7eec332316df8c8887fd80701e6986cd0`: switch to native WordPress Text tab `#content-html` before clicking Quicktags, matching previously verified Home02/Home03 native Insert Code flows. Triggered run `42498167316`; check actual job result before further changes.
- Do **not** duplicate Product children/parents or manually paste shortcode. The pending step is **only** native Insert Code of `home_06` and `home_07` in Page 82454 with full read-after-write and exact order.
- After CMS PASS: build pinned Astro `c5e12e223e1e92806a32c68c35f759ca1e8a8110` through existing production build request, verify deploy SHA, then production equipment QA and Builder interactions.
