# Aqua Thanh Xuân — Tìm kiếm lịch sử đơn hàng và ESC Table nhãn có thể biên tập

Ngày: 2026-11-10 (Asia/Ho_Chi_Minh)
Môi trường: https://aquathanhxuan.io.vn/lich-su-mua-hang
WP admin: https://admin.aquathanhxuan.io.vn
Astro repo: ngocnhanvo/aquathanhxuan-astro @ master
Final deployed SHA: `5dd759aede23c09135a4f4c4f1cc025d347bc398`
Actions repo: ngocnhanvo/aquathanhxuan-actions @ main
PHP code: không thay đổi trong nhiệm vụ này

## Đã hoàn tất

1. Sửa GET `/api/user/order` để hỗ trợ `q`, `page`, `status` kiểm soát và `hasMore`. Chỉ truy vấn các Woo orders của ID khách từ signed session. Tìm theo mã đơn, tên sản phẩm, mã coupon, trạng thái, phương thức, ngày; quét các trang Woo phía server, không chỉ 20 đơn gần nhất. Có giới hạn an toàn tối đa 25 trang x 100 đơn, tối đa 40 kết quả tìm kiếm, `truncated=true` khi đạt giới hạn.
2. OrderHistoryPage có form tìm kiếm, clear, trạng thái không có kết quả, nút xem thêm, skeleton và UX responsive. Các nhãn không còn gắn cứng trong OrderHistoryPage mà lấy từ WordPress TablePress.
3. Tạo native ESC Table ID `order_history_vi`, có `key,label` và **38 hàng nhãn**; trong đó 28 nhãn trang đơn hàng và 10 nhãn form đăng nhập/quên mật khẩu. TablePress lưu bằng native admin; không tạo bảng ảo, không sửa record WooCommerce.
4. Gắn native shortcode duy nhất `[table id=order_history_vi /]` vào WP Page `#83821` (`ssr-order-history`, `OrderHistoryPage`, slug `lich-su-mua-hang`) bằng công cụ **Insert Code** trong Classic Editor. Đọc lại REST/định dạng native wrapper PASS.
5. Astro `src/astro/tablepress/Order_history.astro` render H1, nhận diện ESC Table ID + version + physical row/field, hiện toàn bộ các nhãn trong preview Visual Builder cho thao tác click/sửa. `LoginFormSSG.astro` nhận override `labels` từ Table trong Page này, giữ fallback i18n cho các trang khác.
6. Giữ nguyên các chức năng đăng nhập, giỏ hàng, coupon, đặt hàng và WordPress Pages khác. Không tạo đơn, khách, thanh toán hay dữ liệu thử. Các nhãn đã tồn tại được giữ nguyên khi bổ sung thêm 10 trường.

## Bằng chứng (GitHub Actions)

- WordPress native ESC Table/Page install (28 nhãn): PASS https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42841389141
- Native append 10 nhãn, preserve existing labels: PASS https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42843175445
- Astro source compiler/typecheck baseline/Vitest customer isolation + search across older Woo pages: PASS https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42843409461
- Initial production browser search/Builder edit coordinates 28: PASS https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42842700099
- Final Astro official production build/deploy + signed FTPS activation: PASS https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42843754289
- Final production Playwright browser: PASS https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42844165322
  - Search product, localized status, append older page, clear, empty state
  - Desktop and mobile, guest login access
  - Builder page `esc_vb_page=83821`, all **38 editable label row coordinates**, version SHA-256, text edit input enabled
  - All API order responses in browser were mocked; `NO_ORDERS NO_CUSTOMERS NO_CMS_WRITES`

## Ghi chú và giới hạn

- Build trigger wrapper #42843595370: `BUILD_SUCCESS=PASS`, `DEPLOY_READY=PASS commit=5dd759a...`, sau đó fail ở QA không liên quan `headerSearchTrueCenter` tại viewport 900px `missingElement=true`. Production deploy và browser QA riêng đã PASS. Không khai sai wrapper PASS.
- Kiểm thử Builder xác nhận các nhãn chọn được và input bật; **không thực hiện Save với thay đổi chữ thật trên production** vì muốn tránh tác động nội dung công khai. Tính năng ghi native WordPress đã được chứng minh bằng việc tạo/append và REST readback table; Save frontend Builder không được test mutation.
- API search giới hạn 2.500 đơn khách và tối đa 40 kết quả, báo UI qua nhãn `search_limit` khi cắt. Với khách có lịch sử vượt giới hạn, cần thêm chiến lược lập chỉ mục backend nếu mục tiêu đòi tìm trên toàn bộ không giới hạn.
- Phạm vi chuẩn hóa nội dung: trang Lịch sử mua hàng cùng form đăng nhập nhúng trên trang. **Chưa thực hiện rà soát/migrate chữ cứng trên toàn bộ các trang khác của website**.
- Các 9 lỗi typecheck baseline Astro trước đó vẫn tồn tại, không thuộc thay đổi này.

Status: DONE cho tìm kiếm và ESC Table nội dung của trang lịch sử mua hàng; phạm vi rà soát chữ cứng toàn website ngoài trang hiện tại là việc khác nếu được yêu cầu riêng.
