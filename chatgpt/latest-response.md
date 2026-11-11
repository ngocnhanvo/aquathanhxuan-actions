# Aqua Thanh Xuân — điều chỉnh Chat với Agent theo cửa hàng thủy sinh (2026-11-11)

## Đã làm và phát hành
- Frontend Astro `ngocnhanvo/aquathanhxuan-astro` `master` commit `a41f9af898f11ca7dbf357aeb1f972d34efaf7db`:
  - Đổi màu popup tư vấn/chat sang tím–cyan, tiêu đề “Trợ lý thủy sinh”, lời chào dựa trên tên cửa hàng do WordPress cung cấp; gợi ý khách hỏi sản phẩm, giá, khuyến mãi, đặt hàng.
  - Bỏ lời hứa “Hỗ trợ 24/7” chưa được nguồn xác nhận.
  - Sửa làm mới cuộc trò chuyện dùng POST đúng API; chỉ làm mới sau phản hồi thành công. Đồng bộ session dùng cookie HttpOnly do server tạo; bỏ session ID giả từ localStorage.
  - Render Markdown an toàn, lọc HTML/script/attribute nguy hiểm, giữ link HTTPS tới sản phẩm.
- Backend PHP `ngocnhanvo/aquathanhxuan-php` `master` commit `10b6e584c6f7afd59702bee1b4cb438dd1e81fda`: cập nhật Planner/Synthesis để tư vấn bán lẻ thủy sinh dùng WooCommerce, coupon thật, không suy đoán giá/tồn kho/độ tương thích/liều lượng hoặc khuyến mãi; bỏ yêu cầu logo/MOQ kiểu đơn quà tặng; CompanySkill giới thiệu danh mục thật từ WooCommerce.

## Kết quả kiểm thử và phát hành
- QA source [#42946287879](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42946287879): PASS (Astro compiler + PHP syntax + fixture taxonomy).
- PHP release [#42946448388](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42946448388): PASS, xác thực SHA-256 trên 5 file Agent, các file khác không đổi.
- WordPress Build Website [#42946934192](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42946934192): PASS.
- Astro deploy [#42947043396](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42947043396): PASS.
- Production Playwright [#42947322544](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42947322544): PASS tại 390×844, 926×760, 1440×900; test live GET lịch sử khách mới, mở chat, lời chào Aqua, phản hồi giả lập, lọc HTML nguy hiểm, xóa/mới hội thoại POST. Screenshot artifact `aqua-agent-storefront-qa`.

## Giới hạn đã ghi nhận
- QA chat không gửi tin nhắn thật tới LLM production để tránh ghi hội thoại thử nghiệm/tồn dư log vào WordPress. Vì vậy trạng thái model live và chất lượng từng câu trả lời LLM chưa được đo trực tiếp, dù prompts đã deploy và UI/API đọc lịch sử hoạt động.
- Lịch sử được soft-clear theo cơ chế WordPress hiện tại, không bị xóa khỏi admin.
- Checkpoint: `docs/checkpoints/2026-11-11-aqua-agent-storefront.md`. Không tạo đơn hàng, tài khoản hoặc CMS test record.

Chế độ code: auto-build
Cổng ghi source: bypass
Trạng thái: DONE — hoàn tất
