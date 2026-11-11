# Aqua Thanh Xuân — menu SEO titles, descriptions, legacy redirects (2026-11-11)

## Request
Review all original `aquathanhxuan.com` menu categories and target `aquathanhxuan.io.vn`; align `<title>`, generate missing description; 301 redirect legacy `/danh-muc/...` on frontend to current real `/san-pham/...`.

## Inventory
- Original menu audit [#42934358348](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42934358348): 88 legacy category URLs; 88/88 404 on new-domain legacy paths, 0 redirects.
- Canonical-source audit [#42935108364](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42935108364): 79 legacy source page titles read (with 200 after following same-host trailing-slash redirect); remaining nine independently verified via web against original URL, including special category `Cây và cá thủy sinh – AQua Thanh Xuân`. Original SEO description absent on all 79 audited pages; target SEO description absent on all 80 tested corresponding new category routes. Source report artifact GitHub Actions ID 13817018627.
- Product category registry: 94 valid Woo taxonomy terms, each returned `seoTitle`/`seoDescription` from Yoast `wpseo_taxonomy_meta` through `/wp-json/astro/v1/get-product-categories`.
- Original and new Header group structures: 11 roots, 86 menu category entries; plus two original extra category links `cibi`, `loc-phu-may-loc`. Targets mapped explicitly via current WordPress Header menu + term slug, not string replacement. 88 unique old/new paths validated.
- Native WordPress term editor and CPT route fields inspected [#42935408703](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42935408703). Confirm `wpseo_title`, `wpseo_desc` hidden fields in native category editor, `chuyen-huong-link` CPT REST supports POST and ACF.
- Pilot CMS writer [#42936671513](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42936671513) PASS: saved Yoast title & description for actual `thuong-hieu` product_cat ID 1767, published exact 301 redirect `/danh-muc/thuong-hieu` → `/san-pham/thuong-hieu`, read-after-write verified.
- Bulk CMS writer [#42936896916](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42936896916) started; monitor conclusion/artifact. Source mapping updated to include nine independently verified old site titles, and writer correction for special `/danh-muc/cay-va-ca-thuy-sinh` SEO title on next run; if bulk succeeds run idempotent second pass before build.
- Existing Astro production source master SHA `75ebf52676494f2e06de5f8f303a32c95af2be43`. No new Astro source required. After CMS PASS, trigger existing production build via one `build-requests/*.json` file, then verify exact run/deploy SHA and 88 routes via `aqua-menu-seo-production-qa` (scripts/workflow already created).
- Old **domain** `aquathanhxuan.com` is hosted independently; new host/CPT cannot redirect the source domain without old-origin DNS/hosting rights. Legacy URLs on the new host are being repaired. Independently state whether domain forwarding is blocked.

## Rules
- Only 88 audited original links, target WordPress taxonomy, native Yoast SEO fields, and 88 new CPT 301 rules. No hardcoded metadata in Astro; no changes to products/orders, no migration of old host. Checkpoint must be updated after deploy/live QA, and `chatgpt/latest-response.md` overwritten at end.
- Never interpret CMS writes, build request trigger, or source QA as finished until production 301 + title + description validated.

Chế độ code: auto-build
Cổng ghi source: bypass
Trạng thái: PARTIAL — chưa hoàn tất
