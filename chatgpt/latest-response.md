# Phản hồi mới nhất — Aqua Thanh Xuân

- Ngày: 2026-11-09 (Asia/Ho_Chi_Minh)
- Project: aquathanhxuan.com
- Yêu cầu gần nhất: kiểm tra thông tin trang chi tiết Product đã đầy đủ như web gốc hay chưa.
- Astro: `ngocnhanvo/aquathanhxuan-astro` master `bc1ebedbe4ed0df5dd180c8f3fa38debc9e9b62d` (chưa sửa trong task audit)
- PHP: `ngocnhanvo/aquathanhxuan-php` master `dcec014aec735061bcc8af1060a6cd5d64766243` (chưa sửa)
- Report: `chatgpt/product-detail-parity-report.json`
- Checkpoint: `docs/checkpoints/2026-11-09-product-detail-content-parity.md`
- Run read-only QA: [42604260244](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42604260244) completed/success; report `GAPS_FOUND` vì frontend thiếu thành phần.
- Migration Thương hiệu phiên trước vẫn **DONE**: 157/157 Product, 20 category; QA [42600653497](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42600653497).

## Kết quả kiểm tra

- **157/157** tên khớp khi giải mã HTML entities; 27 mismatch từ QA thô là false positives, đã loại.
- **157/157** giá bán, giá gốc, trạng thái tồn kho trong WC, mô tả ngắn lưu trong WC khớp nguồn (153 có nội dung). Không phải vấn đề thiếu dữ liệu trong CMS.
- **154/157** mô tả dài bằng văn bản khớp hoàn toàn. **3 khác biệt đã phân tích rõ**: Product `bo-test-kit-kh-prodac-italia` và `bo-test-kit-ph-prodac-italia` chuyển URL video source sang Media đích; `seachem-purigen` bỏ 1 dấu `\\` dư. Chưa kiểm tra byte/HTTP video.
- **4/4** Product detail mẫu đều HTTP 200 ở nguồn và đích: Chihiros Hanging Kits WRGB2 Pro, Dennerle Soil 4L, Atman HP-12000, Seachem Matrix 1L.
- **Frontend chưa parity**: không render `itemDescriptionShort` ở vị trí riêng; không render giá gốc gạch ngang/% sale; không render trạng thái hàng; thiếu 'Mua ngay', 'Gọi tư vấn', mã coupon và tiêu đề 'Thông tin chi tiết' tương đương nguồn; SEO title và meta description frontend không ưu tiên Yoast source metadata đã lưu.
- Scope QA chỉ 157 Products trong danh mục Thương hiệu; không tuyên bố kiểm tra tất cả sản phẩm ngoài scope. Bốn mẫu so sánh UI đã chụp screenshot trong artifact.
- **Không sửa frontend/CMS và không tự kích hoạt build** trong task audit này. Có một build production khác chạy đồng thời do trigger khác, không phải do audit này.

## Bước triển khai tiếp theo (nếu được giao sửa)

Sửa component `src/astro/pages/ProductDetailsPage.astro` và mapping `src/lib/wordpress/products/getData.ts` để thể hiện dữ liệu WooCommerce thật; lấy coupon/CTA và Yoast SEO từ nguồn quản lý hợp lệ, không hardcode; bổ sung kiểm thử parity, build/QA qua pipeline production hiện hữu. Tránh nhập lại 157 Product đã đúng.

Chế độ code: auto-build  
Cổng ghi source: bypass  
Trạng thái: DONE — hoàn tất
