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

- **BUILD_SUCCESS + DEPLOY_READY**: WordPress wrapper [42610626409](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42610626409) `completed/success`, existing production pipeline [42610738651](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42610738651) `completed/success`, exact source SHA `b6856c2ff4abaaa7d227e7f6e1d8737f3f414ddd` verified by deployment marker.
- **Cache field schema migration PASS**: build log `Woo Product detail fields upgraded from live WordPress REST: 182`; processed Product data rehydrated without regenerating all images.
- **QA_PASS:** workflow [42611391976](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42611391976) completed/success; `DETAIL_DEPLOY_READY` khớp commit, **4 sản phẩm × 2 viewport (1440,390) PASS**. Dennerle Scaper's Soil 4L hiển thị `259000/375000/-31%`, 3 sản phẩm không sale không có giá gốc gạch/xuống giá giả; cả 4 mẫu có mô tả ngắn và trạng thái `instock` theo đúng Woo REST, không overflow/JS errors. **12 screenshot** nguồn/đích: [artifact 13669513851](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42611391976/artifacts/13669513851).
- Nhánh `outofstock` và `onbackorder` đã được xác minh bởi test mapping/nhãn; 4 mẫu đang xuất bản được QA đều `instock`. Không tuyên bố production đã thử đủ 3 trạng thái bằng dữ liệu thật nếu nguồn không có ca mẫu phù hợp.
- Trạng thái toàn nhiệm vụ: **DONE — hoàn tất** cho bốn yêu cầu (mô tả ngắn, giá gốc gạch ngang, phần trăm giảm, trạng thái còn/hết hàng) và dây chuyền API→getData→snapshot→giao diện.
