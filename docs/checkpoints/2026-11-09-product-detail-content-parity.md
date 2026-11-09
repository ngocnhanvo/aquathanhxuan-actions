# Aqua Thanh Xuân — audit thông tin trang chi tiết Product (2026-11-09)

## Phạm vi và bằng chứng

- Chỉ **kiểm tra**, không sửa Astro/PHP/WordPress Production.
- Source: https://aquathanhxuan.com
- Đích: https://aquathanhxuan.io.vn ; CMS: https://admin.aquathanhxuan.io.vn
- Astro master: `bc1ebedbe4ed0df5dd180c8f3fa38debc9e9b62d`; PHP master: `dcec014aec735061bcc8af1060a6cd5d64766243`.
- QA read-only run: https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42604260244 (PASS pipeline; audit status GAPS_FOUND vì frontend thiếu nội dung bán hàng).
- Báo cáo chi tiết: `chatgpt/product-detail-parity-report.json`. Artifacts workflow có 8 screenshot nguồn/đích cho 4 Product.
- Công cụ: Playwright Chromium + WooCommerce source Store API và target WooCommerce authenticated GET. **Không chạy migration lại, không chỉnh dữ liệu CMS hay kích hoạt build.**

## Kết quả DATA

- Phạm vi: 157 **distinct** Products trong 20 category thương hiệu, gồm FKSC trống đúng source. Đây **không** phải kiểm toán toàn bộ catalogue ngoài nhóm thương hiệu.
- Tên sản phẩm: **157/157 tương đương** sau giải mã HTML entities `&#8211;`, `&#8217;`, `&#038;`, `&amp;`. Audit thô trước đó báo 27 false positives, đã sửa comparator.
- Giá hiện tại **157/157**, giá gốc **157/157**, stock status **157/157**, mô tả ngắn **157/157** (153 có nội dung), SKU và WC attributes (đều trống trên API nguồn/đích cho scope này) — PASS.
- Mô tả dài: 154/157 khớp tuyệt đối qua `textContent`. Ba khác biệt nhỏ đã xác định vị trí:
  1. `bo-test-kit-kh-prodac-italia`: URL video nguồn `https://aquathanhxuan.com/wp-content/uploads/2022/03/...mp4` chuyển thành `/wp-content/uploads/2022/03/...mp4`; giữ tên file.
  2. `bo-test-kit-ph-prodac-italia`: URL video nguồn `https://aquathanhxuan.com/wp-content/uploads/2022/03/...mp4` chuyển thành `/wp-content/uploads/2026/11/...mp4`; giữ tên file, thay origin/thư mục lưu.
  3. `seachem-purigen`: nguồn có một ký tự `\\` dư trước câu 'Seachem Purigen có thể...'; target bỏ ký tự đó.
- Không tìm thấy đoạn văn mô tả nào bị mất trong ba trường hợp; **chưa kiểm tra HTTP 200 hoặc nội dung byte của hai video được liên kết**, không báo MEDIA_VIDEO_PARITY_PASS.
- Hai source asset 404 ISTA/Seachem và một media phụ JECOD đã có ngoại lệ trong checkpoint migration trước, không liên quan sai khác mới của audit nội dung.

## LIVE PAGE và giao diện

4 mẫu cùng slug truy cập HTTP 200 tại source và target:
`hanging-kits-bo-kit-treo-den-wrgb2-pro-chihiros`, `phan-nen-dennerle-scapers-soil-4lit`, `may-sui-khi-atman-hp-12000`, `seachem-matrix-0-5`.

Các trường thiếu theo cấu trúc `src/astro/pages/ProductDetailsPage.astro` và 4 mẫu live:

1. `itemDescriptionShort` đã mapping từ WooCommerce excerpt nhưng component **không render riêng** như nguồn (153 Product trong scope có nội dung ngắn).
2. Giá gốc/sale badge/percentage ở trang chi tiết **không render**, dù Woo API có giá gốc; ví dụ Dennerle Soil 4L nguồn 259.000đ, gạch 375.000đ, -31%.
3. Tình trạng hàng WooCommerce không được mapping vào `Products`/không hiển thị `Tình trạng: Còn hàng`.
4. Trên 4 mẫu, source có 'Mua ngay', 'Gọi tư vấn', coupon MF5, heading 'Thông tin chi tiết'; target không có các chuỗi tương đương trong vùng trang. Không hardcode coupon — phải đọc nguồn quản trị thực.
5. Source `<title>` hiển thị thêm hậu tố thương hiệu; target chỉ dùng Product name. `src/pages/ssr/products/[slug]/detail.astro` dùng `itemName` và `itemDescription` cho HeadProps thay vì SEO title/description nguồn đã lưu tại WordPress. 4 mẫu source `meta description` trống nhưng target tự lấy description body, phải theo quy tắc SEO nguồn và nguồn metadata xác minh.
6. Woo source/target của 157 Products **không có WC attributes riêng**, vì thế không kết luận thiếu bảng thông số của các Product này. Các thông số viết trong mô tả dài vẫn được render.

## Trạng thái và bước tiếp

- **AUDIT_DONE:** đã kiểm tra 157 sản phẩm và 4 mẫu live, xác định chính xác phần khác nhau.
- **FRONTEND_DETAIL_PARITY_PARTIAL:** trang chi tiết chưa đầy đủ các thành phần thông tin/CTA của web gốc.
- **NOT_TESTED:** HTTP/byte parity 2 file video; toàn bộ Products ngoài scope 157 thương hiệu; nghiệp vụ hoàn tất mua hàng.
- Nếu có yêu cầu sửa tiếp: mapping giá gốc/stock/SEO title-description thật, render mô tả ngắn và UI promotion/CTA qua nguồn CMS hợp lệ; sau đó build production theo workflow hiện hữu, Playwright source-target cùng viewport. **Không nhập lại 157 sản phẩm** hoặc sửa metadata đã PASS.
