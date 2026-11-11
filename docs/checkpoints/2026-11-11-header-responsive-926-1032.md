# Aqua Thanh Xuân — sửa header responsive 926–1032px (2026-11-11)

## Yêu cầu và hiện trạng
- Người dùng cung cấp ảnh tại 926×760, 1032×760 và header desktop rộng: ở vùng tablet-landscape / desktop nhỏ, icon tài khoản và tên user sát/đè vào nút search; phần search được canh giữa bằng absolute nên không chừa chỗ cho nhóm tài khoản/giỏ hàng.
- Source đã kiểm tra: `src/astro/components/Layout/Header.astro`, dùng `UserAccount.astro` và `Cart.astro`. Logo lấy từ WP `data_info.logo`, navigation từ WordPress Menu Manager; không thay nguồn CMS.

## Giải pháp production
- Astro repository: `ngocnhanvo/aquathanhxuan-astro` branch `master`, commit `53bf9cf226b28fdecae47fa658fb6882ce5eebe3`.
- Ở từ 900px, chuyển chính header row sang grid 3 cột đối xứng `minmax(185px,1fr) minmax(0,620px) minmax(185px,1fr)` để ô search nằm giữa nhưng không chồng logo và controls. Thay search absolute bằng vị trí static chiếm đúng cột grid.
- Ở 900–1279px, ẩn chữ tên tài khoản trong header, vẫn hiển thị icon và menu có tên/đơn hàng/đăng xuất; giữ giỏ hàng có nhãn và badge. 1280–1399px giới hạn nhãn tài khoản 92px, >=1400px giữ độ dài mặc định. Mobile (<900px) giữ nguyên layout/header/drawer.
- Không sửa dữ liệu WordPress, user session logic, cart, menu hay pipeline phát hành.

## Kiểm thử và triển khai
- Source compile QA [#42943189971](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42943189971): PASS.
- Build qua WordPress [#42943294721](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42943294721): PASS.
- Deploy đúng production pipeline [#42943396629](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42943396629): PASS.
- Browser QA [#42943850270](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42943850270): PASS; QA ban đầu [#42943680416](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42943680416) chỉ lỗi selector nhận hai Account controls; đã sửa selector desktop và kiểm tra lại, không phải lỗi production.
- QA mở rộng [#42944057918](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42944057918): PASS. Đã xác nhận source SHA trên production, mô phỏng trạng thái đăng nhập bằng tài khoản giả không chứa thông tin người dùng thật, xác nhận search nằm giữa chính xác (centerOffset=0) và không đè logo/account/cart ở 900, 926, 1032, 1200, 1279, 1280, 1440, **1600**. Mobile 390px vẫn có menu/search icons.
- Screenshot artifacts `aqua-header-tablet-production-qa` trong run mở rộng, retention 7 ngày.

## Kết quả
- CODE_READY: PASS
- BUILD_SUCCESS: PASS
- DEPLOYED_PRODUCTION: PASS
- VISUAL/GEOMETRY_QA: PASS 9 viewport, synthetic authenticated username
- Không cần sửa thêm cho ticket này.
