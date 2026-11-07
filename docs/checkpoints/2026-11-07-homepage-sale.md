# Checkpoint — Homepage Sale bùng nổ production

Date: 2026-11-07
Project: Aqua Thanh Xuân
Production: https://aquathanhxuan.io.vn
WordPress: https://admin.aquathanhxuan.io.vn
Astro source: ngocnhanvo/aquathanhxuan-astro / master
Actions: ngocnhanvo/aquathanhxuan-actions / main

## Final state

- CODE_READY: PASS
- BUILD_SUCCESS: PASS
- DEPLOY_READY: PASS
- PRODUCTION_VISUAL_QA: PASS
- Exact production Astro SHA: `197a54fcddb77c02d5d986f71cdc92b14c403341`.
- Sale section **complete**. Do NOT rerun its build or QA absent a new discrepancy.
- Earlier Header, Hero and Hero text toggle checkpoints remain PASS.

## Source

- `9ebd9b9451a025c9cd05ebe3a6a1b5db0897a49a`: Sale real product data.
- `83cbeb2f42168da546c6715abdbd78bed6ca275f`: Sale carousel.
- `f9736ca7d253f7048733c37816b4113952144aa6`: Sale source tests.
- `c51a6c91570142d5e7e6e62e93de08ed4c4b39c3`: homepage Page-cache synchronization.
- `197a54fcddb77c02d5d986f71cdc92b14c403341`: fix Sale horizontal overflow.
- Implementation: `src/astro/tablepress/Home_01.astro`; data conversion: `src/lib/wordpress/tablepress/home01.ts`; tests: `home01.test.ts`.
- Products, prices, discounts and images are sourced from actual WooCommerce data; do not replace with mockup examples.

## Verified release and QA

- Production build wrapper: [42388459540](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42388459540) SUCCESS.
- Astro production deploy: [42388529828](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42388529828) SUCCESS.
- Final visual QA: [42388970820](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42388970820) SUCCESS.
- QA log: `SALE_VISUAL_QA=PASS source=197a54fcddb77c02d5d986f71cdc92b14c403341`; 12 product cards; all images loaded by final image check; no horizontal overflow.
- Baseline viewports: 1440x900, 1024x768, 768x1024, 844x390, 390x844.
- Screenshots: artifact `aquathanhxuan-sale-visual-qa` on run 42388970820.
- Previous failed QA runs 42388700912 / 42388825606 were superseded by PASS 42388970820; do not rerun them.

## Next work

Implement the next approved homepage section **PHÂN NỀN & CỐT NỀN**, then **Hot combo**, **MÁY LỌC / ĐÈN**, benefits strip and Footer as defined in `aquathanhxuan-astro/docs/design/aquathanhxuan-homepage/HANDOFF.md`.

Before implementation:
1. Read actual WordPress Page 82454 and existing ESC Table sections; inventory real media/content and preserve current valid data.
2. Use structured ESC Table section(s) and Astro/Tailwind components, with Visual Builder editability; do not hard-code section copy, image, links, or mockup product data.
3. Preserve existing Header/Hero/Sale; follow Knowledge and production source policy.
4. Deploy through existing single production pipeline, then responsive QA at all five reference viewports.
5. Record run IDs, exact source SHA, build, deploy and visual QA separately.
