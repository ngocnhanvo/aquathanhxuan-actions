# Phản hồi mới nhất — Aqua Thanh Xuân

- Ngày: 2026-11-09 (Asia/Ho_Chi_Minh)
- Project: aquathanhxuan.com
- Yêu cầu: bổ sung Mô tả ngắn, Giá gốc gạch ngang, % giảm và Trạng thái còn/hết hàng trên trang chi tiết WooCommerce từ REST → `getData.ts` → output Astro.
- Astro: `ngocnhanvo/aquathanhxuan-astro` `master` @ `b6856c2ff4abaaa7d227e7f6e1d8737f3f414ddd`
- PHP: `ngocnhanvo/aquathanhxuan-php` `master` @ `4a65e0cab7864a44dbce83f01bf15723a7a5f589`
- Checkpoint: `docs/checkpoints/2026-11-09-product-detail-commerce-fields.md`
- Chế độ code: auto-build; Cổng ghi source: bypass.

## Kết quả đã hoàn tất

1. WordPress `wp/v2/product` bổ sung 2 field `regular_price` và `stock_status` lấy trực tiếp WooCommerce. Mô tả ngắn vẫn dùng `excerpt.rendered`. PHP release [42610071417](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42610071417) PASS, FTPS readback SHA256 PASS; REST live readback [42610409904](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42610409904) PASS.
2. Astro `Products.ts`, `getData.ts`, `detailFields.ts`, `index.ts` bổ sung mapping giá gốc/tồn kho cùng xử lý cached Products không đủ schema. Build production đã nâng cấp **182 sản phẩm** theo REST mà không reprocess toàn bộ ảnh. Khi giá bán không nhỏ hơn giá gốc thì không hiện giá cũ hay % giảm.
3. Trang chi tiết `src/astro/pages/ProductDetailsPage.astro` render mô tả ngắn, giá cũ có `<del>`, badge -%, tình trạng `instock/outofstock/onbackorder`; nhãn vi/en cấu hình tại `src/data/i18n/product.json`.
4. Source unit QA [42609931588](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42609931588) PASS 10/10 tests Astro, PHP REST mock PASS.
5. Production build [42610738651](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42610738651) và WordPress build verification [42610626409](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42610626409) `completed/success`, đúng Astro SHA `b6856c2...`.
6. Browser QA [42611391976](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42611391976) `completed/success`: 4 Product live × 1440/390px, giá sale Dennerle 259000/375000 = -31%, 3 Product giá thường không có sale ảo, mô tả ngắn/status đúng WC, không JS errors/overflow. [12 screenshot artifact](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42611391976/artifacts/13669513851).

Trạng thái 4 yêu cầu: DONE. QA live đã xác minh trực tiếp trường hợp `instock`; nhánh `outofstock`/`onbackorder` xác minh qua test contract/logic do 4 mẫu live đều `instock`. Không tự thêm dữ liệu giả để tạo ca hết hàng.

## Phản hồi gửi người dùng

Đã triển khai xong và phát hành production bốn mục: **Mô tả ngắn; Giá gốc gạch ngang; phần trăm giảm; Trạng thái còn/hết hàng**. WooCommerce REST trả `regular_price`/`stock_status` thật, `getData.ts` và cache Astro đã truyền đủ đến giao diện, đã kiểm tra Dennerle 4L hiện giá **259.000đ**, giá cũ **375.000đ**, giảm **31%**. 10 unit tests PASS, 4 Product × 2 viewport QA PASS, 12 screenshot được lưu trong Actions.

Chế độ code: auto-build  
Cổng ghi source: bypass  
Trạng thái: DONE — hoàn tất
