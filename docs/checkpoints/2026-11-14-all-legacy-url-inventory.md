# Aqua Thanh Xuân — kiểm kê toàn bộ URL legacy trên frontend mới (2026-11-14)

## Phạm vi và chứng cứ
- Website cũ: `https://aquathanhxuan.com`; website kiểm tra: `https://aquathanhxuan.io.vn`.
- Workflow chỉ đọc: [run 43619005007](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/43619005007) **SUCCESS**, không chỉnh CMS/production và không tạo đơn hàng.
- Artifact: `aqua-all-legacy-url-inventory` gồm `report.json`, `urls.csv`, `published-redirect-rules.json`.
- Source runner: `scripts/aqua-all-legacy-url-inventory.cjs`; workflow `.github/workflows/aqua-all-legacy-url-inventory.yml`.
- Phương pháp: 7 XML sitemap nguồn (971 URL), WordPress REST (11 posts, 10 pages, 499 products, 97 product_cat, 2 post categories), WooCommerce Store API xác nhận 499 sản phẩm, quét 164 trang HTML archive/menu/pagination, đọc 88 rule CPT WordPress và kiểm tra HEAD với GET lại cho lỗi HTTP.

## Kết quả toàn bộ danh sách ứng viên
| Kết quả HTTP / kiểm tra | Số URL |
|---|---:|
| `OK_SAME_PATH_200` | 469 |
| `PASS_301` (đúng Location và đích HTTP 200) | 88 |
| `MISSING_404` | 455 |
| `FAIL_EXPECTED_301` (danh mục có đích hợp lệ nhưng chưa chuyển) | 3 |
| `ERROR` (HTTP 500, kiểm tra lại bằng GET) | 36 |
| **Tổng** | **1.051** |

- 1.051 là tổng URL ứng viên từ nguồn công khai và một ít URL điều hướng dự phòng; trong đó **3 URL chỉ thuộc danh sách điều hướng dự phòng**, chưa chứng minh tồn tại ở site cũ.
- `MISSING_404` gồm 360 trang tag sản phẩm `/tu-khoa/*`, 67 trang phân trang danh mục `/danh-muc/*/page/N`, 6 danh mục sản phẩm còn thiếu, `/danh-muc` và 21 đường dẫn khác.
- **9** danh mục không thuộc bộ 88 rule cũ đều HTTP 404: `chua-phan-loai`, `den/coco`, `den/khac-den`, `den/zetlight`, `nen-cho-be-thuy-sinh/prodibio-nen-cho-be-thuy-sinh`, `thuong-hieu/odyssea-2`, `thuong-hieu/sunsun`, `thuong-hieu/tropica`, `vat-lieu-loc/khac-vat-lieu-loc`.
- 3 trường hợp `FAIL_EXPECTED_301`: `/danh-muc/nen-cho-be-thuy-sinh/prodibio-nen-cho-be-thuy-sinh`, `/danh-muc/thuong-hieu/tropica`, `/danh-muc/vat-lieu-loc/khac-vat-lieu-loc`.
- 36 trang sản phẩm URL cũ `/san-pham/<slug>` trả **500**, đã thử GET lại (không chỉ HEAD); đây là lỗi sản phẩm/render cần điều tra, không phải chỉ thiếu 301.
- 88/88 danh mục đã cấu hình vẫn `301` đúng `/san-pham/... ` và đích `200`; các category renaming như `thuong-hieu/chihiros` dùng chính mapping CPT thật, không đoán `/san-pham/chihiros`.
- Cảnh báo: có URL blog cũ mang dấu hiệu spam casino; không tự 301 URL không liên quan về trang chủ. Không tự 301 360 thẻ sản phẩm khi chưa có trang tag/taxonomy tương ứng.

## Tình trạng và việc tiếp theo
- **DONE cho kiểm kê phạm vi public discoverable:** sitemap cũ, WordPress REST, Store API và archive links đã được quét; `discoveries_complete=true`, không lỗi nguồn trong báo cáo.
- **Chưa sửa lỗi production**: việc ưu tiên là khắc phục 36 trang 500, mapping 9 danh mục + 67 URL phân trang, xử lý 360 tag theo taxonomy mới, đối chiếu các bài/trang còn thiếu và riêng nhóm URL spam.
- Chưa thể bảo đảm URL lịch sử đã bị xóa khỏi sitemap/REST/menu, URL chỉ tồn tại trong backlinks hoặc access logs: muốn phát hiện nhóm đó cần đối chiếu Google Search Console / server access log.
- Khi tiếp tục xử lý, sử dụng chính báo cáo artifact và không tạo redirect hàng loạt từ suy đoán slug.

Chế độ code: auto-build
Cổng ghi source: bypass
Trạng thái: DONE — hoàn tất
