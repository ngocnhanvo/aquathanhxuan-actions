# Aqua Thanh Xuân — bổ sung thông tin trang chi tiết sản phẩm

- Ngày: 2026-11-09 (Asia/Ho_Chi_Minh).
- Source Astro: `ngocnhanvo/aquathanhxuan-astro` `master` @ `b6856c2ff4abaaa7d227e7f6e1d8737f3f414ddd`.
- Source PHP: `ngocnhanvo/aquathanhxuan-php` `master` @ `4a65e0cab7864a44dbce83f01bf15723a7a5f589`.
- Action branch: `ngocnhanvo/aquathanhxuan-actions` `main`.
- Chế độ: `auto-build`; Cổng ghi: `bypass`.

## Code đã ghi

1. PHP `wp-content/themes/vibe-code-theme/inc/products/product_endpoint.php`: thêm REST field read-only `regular_price`, `stock_status` từ `wc_get_product`, không suy tình trạng từ quantity.
2. Astro `src/lib/wordpress/products/detailFields.ts`: normalize giá gốc/trạng thái, group theo origin_product_id và locale.
3. `src/lib/wordpress/products/getData.ts` đưa `itemRegularPrice` và `itemStockStatus` vào output; `src/entities/Products.ts` khai báo type.
4. `src/lib/wordpress/products/index.ts`: migration một lần cho processed cache cũ, truy vấn REST theo batch ID nhỏ, hydrate các field mới trên dữ liệu đã xử lý, không download lại toàn bộ ảnh. Ghi lại cache với source `migration`; về sau vẫn dùng delta logs/processed-cache.
5. `src/astro/pages/ProductDetailsPage.astro`: mô tả ngắn; giá cũ `<del>`, % giảm chỉ khi giá bán thấp hơn giá gốc; tình trạng `instock/outofstock/onbackorder`. Nhãn vi/en tại `src/data/i18n/product.json`. Không sửa nghiệp vụ giỏ hàng.

## Chứng cứ đã PASS

- Unit CI: [42609931588](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42609931588) completed/success; Astro 10/10 test PASS; PHP REST mock callback PASS.
- PHP release: [42610071417](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42610071417) completed/success; FTPS SHA256 verified `product_endpoint.php`, không build Astro.
- Backend read-after-deploy: [42610409904](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42610409904) completed/success; Dennerle 4L `regular_price=375000`, `stock_status=instock`, so với WooCommerce chính xác; Chihiros và Seachem PASS.

## Phát hành và QA tiếp theo

- Build request WordPress: [42610626409](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42610626409) `IN_PROGRESS` khi ghi checkpoint, source SHA `b6856c2...`.
- Chưa được báo `BUILD_SUCCESS`, `DEPLOY_READY` hoặc `QA_PASS` trước khi run production kết thúc và xác minh marker SHA.
- Sau production PASS, tạo `qa-requests/product-detail-ui.json` chứa `astro_sha` chính xác để kích workflow `.github/workflows/aqua-product-detail-ui-qa.yml`. Test WP WC giá gốc/kho vs REST và DOM, excerpt, % giảm, trang không sale, 1440/390px, source screenshots và lỗi browser.
- Nếu build/QA fail: đọc run/log, sửa đúng nguyên nhân, không đổi pipeline hoặc chạy trùng.
- Trạng thái toàn nhiệm vụ: `PARTIAL — chưa hoàn tất` tới khi production QA PASS.
