# ChatGPT latest-response — aquathanhxuan.com

- Ngày: 2026-11-10 (Asia/Ho_Chi_Minh)
- Project: aquathanhxuan.com
- Source reviewed: ngocnhanvo/aquathanhxuan-astro/master
- Task: Phân loại Page Visual Builder preview thường / preview nghiệp vụ theo trạng thái
- Scope: Read-only review; no production mutation or deploy

## Nguyên văn phản hồi gửi người dùng

## Đánh giá 9 trang trong Visual Builder

Đã đối chiếu source Astro `master` và cơ chế `esc-builder/preview/[pageId].astro`. Kết luận: **5 trang cần Preview nghiệp vụ theo trạng thái** và **4 trang có thể hiển thị gần giống production**. Mọi trang vẫn phải dùng đúng bố cục production; chữ cần sửa được chọn tại vị trí thật, không chỉ đưa vào danh sách nhãn.

| Trang | Cách hiển thị trong Visual Builder | Hiện trạng cần lưu ý |
|---|---|---|
| **Đặt lại mật khẩu** | Preview đặc biệt: form khi token hợp lệ, link lỗi/hết hạn, trạng thái thành công | Code không có token sẽ ẩn form và báo link không hợp lệ. Cần dữ liệu trạng thái minh họa, không dùng token thật |
| **Quên mật khẩu** | Hiển thị giao diện form như production, có thể chọn trạng thái thành công/lỗi để sửa thông báo | Form được render trực tiếp; nhiều nhãn còn hard-code, phải vô hiệu hóa thao tác gửi email trong Preview |
| **Lịch sử mua hàng** | Preview đặc biệt: đã đăng nhập/có đơn, chưa có đơn, chưa đăng nhập, loading, lỗi | Đã có ESC Table `order_history_vi` (38 nhãn), nhưng Preview hiện còn render danh sách nhãn riêng; nên hiển thị ngay trong giao diện thẻ đơn và chặn gọi API đơn hàng thật ở Preview |
| **Đơn hàng đã đặt** | Preview đặc biệt: hóa đơn mẫu an toàn, chi tiết sản phẩm, COD, địa chỉ minh họa và trạng thái lỗi | Component cần `order_id/order_key`; không có tham số sẽ chỉ hiện lỗi thiếu đơn |
| **Thanh toán** | Preview đặc biệt: giỏ mẫu, thông tin khách, địa chỉ, phương thức COD, các trường hợp guest/đã đăng nhập | Preview chung chưa cấp `serverCartData/userData` như route production; biểu mẫu đang dùng nhiều nhãn JSON i18n thay vì ESC |
| **Giỏ hàng** | Preview đặc biệt: giỏ có sản phẩm và giỏ rỗng, giảm giá nếu có | Không có `serverCartData` trong Builder dễ rơi về giỏ trống; nhãn đang lấy từ JSON i18n |
| **Liên hệ** | Hiển thị như production | Dùng `SupportPage` + ESC Table `support_contact`, có tọa độ chỉnh sửa phần nội dung |
| **Khiếu nại** | Hiển thị như production | Dùng `SupportPage` + ESC Table `support_complaint` |
| **Đại lý** | Hiển thị như production | Dùng `SupportPage` + ESC Table `support_dealer` |

**Kiến trúc nên triển khai:** một cơ chế Preview trạng thái dùng chung (không tạo 5 hệ thống riêng). Visual Builder chọn trạng thái cần xem, Astro dựng **đúng layout production** nhưng dùng dữ liệu minh họa chỉ trong môi trường Preview; vô hiệu hóa đặt hàng, thanh toán, email, đăng nhập và mọi ghi WooCommerce. Mỗi dòng chữ có tọa độ ESC Table `Table ID + row + field + version` để chọn và sửa tại đúng vị trí. Các nhãn vốn ở trạng thái phụ vẫn chọn được qua chuyển trạng thái.

**Điểm cần bổ sung:** các trang hỗ trợ đã có ESC Table cho nội dung chính, nhưng trong `SupportPage.astro` vẫn có chữ cứng ở breadcrumb/khung tư vấn. Trang Quên/Đặt lại mật khẩu và các trang giao dịch còn nhiều nhãn hard-code hoặc JSON i18n nên chưa thể coi là đã sửa trực quan toàn bộ. Nhóm hỗ trợ ưu tiên giữ nguyên preview production; nhóm nghiệp vụ bổ sung preview trạng thái và ESC Table nội dung trước khi nghiệm thu.

Đây là **kết quả rà soát source**, không phải xác nhận Playwright trên cả 9 trang. Chưa sửa mã, CMS hoặc deploy ở lượt này.

Chế độ code: auto-build  
Cổng ghi source: bypass  
Trạng thái: DONE — hoàn tất
