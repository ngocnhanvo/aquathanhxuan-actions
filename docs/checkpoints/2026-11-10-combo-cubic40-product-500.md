# Aqua Thanh Xuân — Sửa HTTP 500 trang combo Cubic 40

- Ngày 2026-11-10 (Asia/Ho_Chi_Minh).
- Trang lỗi: `https://aquathanhxuan.io.vn/san-pham/combo-be-cubic-40-sieu-trong`.
- Chế độ code: auto-build. Cổng ghi source: bypass.

## Chẩn đoán nguồn–đích

- Read-only diagnostics [#42758709944](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42758709944) và [#42759007728](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42759007728): URL public trả **500** ở desktop/mobile, nhưng endpoint Astro `/ssr/products/combo-be-cubic-40-sieu-trong/detail?curUrl=...` trả **200**, render đúng Woo product ID 82477.
- Sản phẩm gốc WordPress source ID 266939 tồn tại, slug đúng, Woo target published ID 82477, type simple, `_esc_origin_product_id`=266939, giá 2700000, regular 3170000, tồn kho instock, 1 ảnh, danh mục nguồn và đích `uncategorized` (không tự đổi). Không có native WordPress Rewrite match URL công khai.
- Nguyên nhân: missing WordPress-managed `chuyen-huong-link` Rewrite cho đúng source slug, không phải dữ liệu Product hoặc lỗi render SSR.

## Thay đổi nhỏ nhất

- [Writer #42759530760](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42759530760) **SUCCESS**, chỉ tạo đúng 1 WP native Rewrite ID **83801** và xác minh đọc lại: `from=^/san-pham/(combo-be-cubic-40-sieu-trong)/?$`, `to=/ssr/products/$1/detail`, type Rewrite/Regex, published, enabled.
- Không sửa Product, category, giá, stock, description, source Astro/PHP. Astro source master pinned SHA `b7c393a7cda3116f6ccff1316b7434b0eb4e4f99`.
- WordPress production build request commit `7c91c562b86535cce6d5909e86cbd24ef19d2b4b` triggers wrapper [#42759753974](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42759753974) and deploy [#42759851013](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42759851013); running at checkpoint.
- Next: verify wrapper BUILD_SUCCESS and DEPLOY_READY, downstream deploy SUCCESS, then trigger `qa-requests/combo-cubic40-production.json` for exact user URL desktop 1440/mobile 390 plus existing product regression; inspect screenshot and status 200. Mark DONE only after public URL passes.

## Kết quả production 200 — PASS

- CMS WordPress Rewrite ID **83801** tạo và readback qua [#42759530760](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42759530760) PASS. No other WP Product/category records changed.
- Production WordPress build wrapper [#42759753974](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42759753974) **SUCCESS**, exact Astro `master` source `b7c393a7cda3116f6ccff1316b7434b0eb4e4f99`, `BUILD_SUCCESS=PASS`, `DEPLOY_READY=PASS`. Downstream deployment [#42759851013](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42759851013) **SUCCESS**.
- QA run #42760257903 failed at **QA script only**: global Node `fetch` response `.ok` is a property, not `.ok()` call; no evidence of site failure. Fixed in Actions commit `3474ecfc82ab6b05aada9748e26986e8e9747fca` without another build.
- Final production browser QA [#42760645632](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42760645632) **COMPLETED SUCCESS**: public URL `https://aquathanhxuan.io.vn/san-pham/combo-be-cubic-40-sieu-trong` HTTP **200** desktop 1440/mobile 390, true Woo Product ID **82477**, exact source product name, sale **2700000**, regular **3170000**, **instock**, purchase CTA and sticky CTA visible, no JS errors or horizontal overflow. Existing Dennerle product route regression PASS.
- QA screenshot/report [artifact #13736943381](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42760645632/artifacts/13736943381): 2 screenshots and JSON report.
- **Trạng thái: DONE — hoàn tất**.
