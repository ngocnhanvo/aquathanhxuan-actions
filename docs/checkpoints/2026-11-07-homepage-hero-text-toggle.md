# Checkpoint — Hero banner text overlay from ESC Table / Visual Builder

Date: 2026-11-07
Project: aquathanhxuan.com
Production: https://aquathanhxuan.io.vn
WordPress: https://admin.aquathanhxuan.io.vn

## Status

- CMS_WRITE_PASS: yes
- PHP_DEPLOY_PASS: yes
- ASTRO_BUILD_SUCCESS: yes
- ASTRO_DEPLOY_READY: yes
- PRODUCTION_QA_PASS: yes (5 viewports)
- Previous Header and original Hero checkpoints remain valid.
- Next homepage work: Sale bùng nổ (existing next checkpoint).

## CMS

WordPress Page 82454; native ESC Table `home_00` contains two slide rows and new column `show_text`.
The added column was inserted via the actual WordPress TablePress editor without replacing existing 13 columns or image data.
- First slide (`cropped-banner-8-1.png`): `show_text=0`, no copy or dark scrim; original image has baked-in typography.
- Second slide (`cropped-banner-6.png`): `show_text=1`, copy remains.
- Canonical source: ESC Table column `show_text`, no hardcoded per-slide toggle in Astro.

CMS setup verification: Actions run 42379922645 SUCCESS and REST readback both values PASS.

## Source and management

- Astro production commit: `f4a9131ae7a4d23236386be3bee1a6cf53c47a5f`.
- Files: `src/lib/wordpress/tablepress/home00.ts`, `src/astro/tablepress/Home_00.astro`, `src/lib/wordpress/tablepress/home00.test.ts`.
- PHP commit: `ada54535e097dce9aac584a91b306d5bc2b934e6`.
- Files: `wp-content/plugins/esc-visual-builder/includes/site-config.php`, `text-editor-ui.php`.
- Visual Builder uses existing scoped text-cell editing API, offers a native select labeled `Hiện chữ và lớp nền tối` / `Ẩn chữ, chỉ hiện ảnh banner`.
- Other Hero text fields remain editable from the native ESC Table and permitted fields through Visual Builder.
- Empty `show_text` on legacy tables retains previous overlay visibility (compatibility with existing data).

## Release and evidence

- PHP release workflow 42341480728 attempt 4 SUCCESS.
- Production wrapper build 42380148389 SUCCESS.
- Actual Astro deployment 42380222652 SUCCESS with exact source SHA.
- Post-deploy browser QA 42380432536 SUCCESS for 1440x900, 1024x768, 768x1024, 844x390, 390x844.
- Browser verified production source SHA, first slide `data-show-text=false` with no `.aqua-hero__shade` or copy, second slide `data-show-text=true` with headline/CTA; images preserved; carousel works; no horizontal overflow.
- One-shot CMS and QA workflows were removed after successful verification.

## Future edits

Change ESC Table `home_00` column `show_text` (0 hide, 1 show) or use the Visual Builder's select and existing save-text endpoint; change actual copy in ESC Table / Visual Builder. Rebuild Astro through existing production pipeline as required to refresh static generated homepage.
