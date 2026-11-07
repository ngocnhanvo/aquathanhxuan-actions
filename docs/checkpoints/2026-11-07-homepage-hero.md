# Checkpoint — Homepage Hero production

- Date: 2026-11-07
- Project: AQua Thanh Xuân
- Frontend: `ngocnhanvo/aquathanhxuan-astro` / `master`
- Backend: `ngocnhanvo/aquathanhxuan-php` / `master`
- Production: https://aquathanhxuan.io.vn
- WordPress: https://admin.aquathanhxuan.io.vn

## Status

- `CODE_READY`: PASS
- `DEPLOYED_PRODUCTION`: PASS
- `VISUAL_QA_PASS`: PASS
- Header/menu checkpoint remains PASS and must not be reworked unless a new discrepancy is reported.
- Homepage Hero is complete. Continue with **Sale bùng nổ**.

## Source

Production Astro source:

- `aeb6c1f29e1e43ca3de44851c5a0c807b9d00299` — `Thêm test Hero`
- Hero component: `src/astro/tablepress/Home_00.astro`
- Hero data mapping: `src/lib/wordpress/tablepress/home00.ts`
- Runtime data source: WordPress Page `82454` + ESC Table `home_00`

## WordPress data

Inventory before implementation:

- Run `42374530847`: Page `82454` (`Trang chủ`, ACF key `home`) had no homepage ESC Table shortcode.
- Run `42374696706`: legacy Hero assets identified.

Migrated Media assets, preserving filenames:

- `cropped-banner-8-1.png`
- `cropped-banner-6.png`

ESC Table `home_00`:

- 2 real CMS slides.
- Real Media Library images.
- Image source stored as current-site relative path, not legacy hotlink.
- Useful alt text present.
- Product CTA resolves from current WordPress product page to `/san-pham`.
- Trust content is CMS data.

Native CMS setup success:

- One-shot setup run: `42377383887` — SUCCESS.
- Read-before-write: `table_exists=true`, `table_ready=true`, `page_has_home00=false`.
- Existing valid table was skipped instead of rewritten.
- ESC Table inserted into Page `82454` with the native TablePress/ESC Table picker.
- Final marker: `HOME_HERO_CMS_SETUP=PASS page_id=82454 table=home_00 assets=2`.

## Production build/deploy

Build request pins exact Astro SHA `aeb6c1f29e1e43ca3de44851c5a0c807b9d00299`.

- Production wrapper run: `42377562653` — SUCCESS.
- WordPress build trigger: PASS.
- `BUILD_SUCCESS=PASS`.
- `DEPLOY_READY=PASS commit=aeb6c1f29e1e43ca3de44851c5a0c807b9d00299`.
- Deployment run: `42377653031` — SUCCESS.

## Responsive production QA

Final Hero QA run:

- `42377932944` — SUCCESS.
- Desktop `1440x900`: PASS, Hero height 520.
- Tablet landscape `1024x768`: PASS, Hero height 390.
- Tablet portrait `768x1024`: PASS, Hero height 445.
- Phone landscape `844x390`: PASS, Hero height 310.
- Phone portrait `390x844`: PASS, Hero height 390.
- No horizontal overflow.
- 2 real Hero slides.
- Current-site images load successfully; no legacy `aquathanhxuan.com` hotlink.
- Alt text present.
- Product CTA points to `/san-pham`.
- Carousel switching works.
- Final marker: `RESPONSIVE_HERO_QA=PASS`.

Run `42377849478` was a QA-only false failure because it required the inactive `loading="lazy"` second slide to be loaded before activation. QA logic was corrected; production source did not require a change or rebuild.

## Next checkpoint

Implement **Sale bùng nổ** from the approved homepage handoff:

1. Read actual WooCommerce sale/product data first.
2. Reuse current product/cart/search architecture; do not hard-code mockup products, prices or sale state.
3. Prefer CMS/ESC Table only for section configuration/content when needed; product cards must use real WooCommerce data.
4. Desktop: horizontal product carousel, red discount badge, clean image area, sale/current prices, cyan add-to-cart control, edge arrows.
5. Responsive intent: compact density on tablet; about 2 cards visible on phone; phone landscape remains mobile by available height.
6. Run production build and QA at `1440x900`, `1024x768`, `768x1024`, `844x390`, `390x844`.
