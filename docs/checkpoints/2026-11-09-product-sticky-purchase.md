# Aqua Thanh Xuân — nút mua hàng dễ thao tác ở đầu trang và khi cuộn

- Ngày: 2026-11-09 (Asia/Ho_Chi_Minh).
- Astro: `ngocnhanvo/aquathanhxuan-astro` `master` @ `5f158c4ea8d214f2f83f94dc2285032a81e983f8`.
- PHP: `ngocnhanvo/aquathanhxuan-php` `master` @ `4a65e0cab7864a44dbce83f01bf15723a7a5f589` (không thay đổi).
- Actions: `ngocnhanvo/aquathanhxuan-actions` `main`.
- Chế độ code: auto-build. Cổng ghi source: bypass.

## Thay đổi được phát hành

1. `src/astro/pages/ProductDetailsPage.astro`: chuyển nhóm hành động lên trước mô tả ngắn/dài; giữ thông tin giá, tồn kho, chọn số lượng và biến thể.
2. Thêm nút `Xem giỏ hàng` dẫn đúng route cart đang lấy từ Pages/CMS; sản phẩm domain giữ hành động riêng, sản phẩm giá liên hệ không bị ép nút mua.
3. Thêm thanh mua cố định dưới màn hình (desktop/mobile, safe-area, a11y) khi cụm nút chính ra khỏi viewport; ẩn khi cụm nút chính đang thấy hoặc đến footer.
4. Sticky add-to-cart chuyển click tới `main-action-btn`, giữ một API/cart handler duy nhất; chặn submit trùng, đồng bộ trạng thái đang thêm / đã thêm; tắt thêm hàng khi `outofstock`, không tự sinh trạng thái tồn kho.
5. Khi chọn variation, cập nhật giá trên sticky bar; dịch bong bóng tư vấn/back-to-top lên khi bar hiện để không che CTA.
6. `src/data/i18n/product.json`: nhãn trạng thái giỏ vi/en.

## Bằng chứng xác minh

- Unit + scoped Astro compiler + Woo REST mapping: [42615577040](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42615577040) = completed/success.
- Lượt CI trước [42615192440](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42615192440) thất bại vì `astro check --js-only` báo 9 lỗi TS có trước ở module không liên quan; đã thay bằng compile template đúng phạm vi, không sửa lan code cũ.
- Lượt build WordPress đầu [42615766705](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42615766705) thất bại vì timeout login **trước trigger**; retry hữu hạn, không có build trùng.
- WordPress wrapper [42616310341](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42616310341) = completed/success.
- Existing production pipeline [42616446692](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42616446692) = completed/success, đúng nguồn `5f158c4ea8d214f2f83f94dc2285032a81e983f8`.
- Browser QA [42616766306](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42616766306) = completed/success, marker `DETAIL_DEPLOY_READY` khớp source SHA; **4 sản phẩm × desktop 1440/mobile 390 = 8 PASS**.
- Assert: CTA đặt trước mô tả dài, link giỏ từ CMS, sticky hiển thị khi cuộn mô tả và ẩn ở footer, không che bong bóng tư vấn, sticky click ủy quyền đúng nút chính (intercepted để QA read-only), tình trạng kho và giá chi tiết vẫn đúng, không có browser error hoặc horizontal overflow.
- [QA artifact #13671854052](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42616766306/artifacts/13671854052): 20 screenshots và JSON report.
- QA read-only: không tạo/xóa Product/cart record; không thực hiện gọi ghi giỏ hàng production. Bốn mẫu thực đang `instock`; `outofstock` được khóa theo dữ liệu nguồn ở UI nhưng chưa có sample live trong lượt này.

## Kết quả

- **CODE_READY / DEPLOYED_PRODUCTION / Browser QA PASS** cho yêu cầu bố trí 2 nút mua và thanh cố định.
- Không cần build hoặc kiểm thử lặp lại cho cùng commit.
- Trạng thái: DONE — hoàn tất.
