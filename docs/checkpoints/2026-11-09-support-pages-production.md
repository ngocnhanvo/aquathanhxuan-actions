# Checkpoint — Five support pages production (2026-11-09)

Project: aquathanhxuan.com  
Frontend: https://aquathanhxuan.io.vn  
WordPress: https://admin.aquathanhxuan.io.vn  
Astro repo: ngocnhanvo/aquathanhxuan-astro (master)  
PHP repo: ngocnhanvo/aquathanhxuan-php (master, unchanged)  
Actions repo: ngocnhanvo/aquathanhxuan-actions (main)  
Code mode: auto-build  
Source gateway: bypass

## User objective
Build five new CMS-managed support Pages, matching current Aqua homepage style. No legacy source exists, so draft useful original editorial content. Change footer Support links to their new published routes.

## Authoring architecture
- Existing WordPress Page -> ACF action `SupportPage`, unique key, `product_lang=vi`.
- Native WordPress TablePress Insert Code embeds one corresponding ESC Table on each Page.
- Reusable Astro `SupportPage.astro` displays responsive header/breadcrumb and live WordPress contact data.
- Shared `SupportSection.astro` renders native ESC Table `lead`, `heading`, `feature`, `step`, `faq` and `note` rows with Visual Builder cell/row/source markers.
- Five thin shortcode registries in `src/astro/tablepress/Support_*.astro`; section copy is not hardcoded in Astro.
- Colors aligned with approved website: purple #332B8E, aqua #1BB4DF, soft blue gradients, 1376px max-width. No new images or changed WordPress Product data.
- Footer links updated through existing global native ESC Table `pub_aquafooterlinks`, exactly five href cells only.

## Published WordPress Pages and native ESC Tables

| Page | Page ID | ACF key | Table | Table items | Public URL |
|---|---:|---|---|---:|---|
| Chính sách đổi trả hàng | 82710 | support-policy | support_policy | 14 | /chinh-sach-doi-tra-hang |
| Giới thiệu | 82712 | support-about | support_about | 11 | /gioi-thieu |
| Đại lý | 82714 | support-dealer | support_dealer | 13 | /dai-ly |
| Khiếu nại | 82716 | support-complaint | support_complaint | 14 | /khieu-nai |
| Liên hệ | 82718 | support-contact | support_contact | 11 | /lien-he |

- Writer workflow first run 42562572878: five Tables created successfully, then failed on hidden Yoast title input. No Page or footer mutated in that failed run.
- Fixed hidden Yoast form-field handling; successful idempotent rerun 42562870596, all existing five tables read back unchanged; five Pages published, ACF/shortcodes verified; footer five hrefs updated. No duplicate Tables/Pages.
- Writer success: https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42562870596

## Build and deployment

- Production Astro master SHA: `29bee66d86918943d79da74af91355cf19065e64`.
- Build request: `build-requests/2026-11-09-support-pages-29bee66d.json`.
- Build success: https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42563116978
- Deploy success: https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42563204071
- Existing production workflow, env, FTP and WordPress Build Website trigger preserved; PHP source unchanged.

## Independent production QA

- Read-only workflow `.github/workflows/aquathanhxuan-support-pages-qa.yml` and script `scripts/aquathanhxuan-support-pages-qa.cjs`.
- Run 42563351997 SUCCESS: https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42563351997
- Verified production marker exact Astro SHA, HTTP 200 for five Pages, expected H1, expected ACF key rendered, five native ESC Table wrappers, 11–14 source rows per Page, live SEO meta description 100–120 characters.
- Desktop 1440x900 and mobile 390x844, 10 full-page screenshots stored under run artifact `aquathanhxuan-support-pages-production`.
- Verified all five footer URLs from each new Page (no empty/# footer shortcuts), no horizontal overflow on either viewport, FAQ open on returns page, and zero pageerror events.

## Status
DONE — WordPress Page authoring, native ESC Table data, Footer URLs, Astro code, build/deploy and independent production browser QA passed. Future editorial wording/policy adjustments can be made in WordPress ESC Tables without hardcoding text in Astro.

Rollback: revert the Astro support page commits and restore the five corresponding footer hrefs in `pub_aquafooterlinks` if explicitly requested; do not delete WordPress Pages or Tables without separate content audit and approval.
