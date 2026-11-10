# Aqua Thanh Xuân — Latest response 10/11/2026: ảnh và giá giỏ hàng /cart, giá đã gồm thuế

**Yêu cầu hiện tại hoàn tất và nghiệm thu trên production:** user chụp màn hình `/cart` thiếu ảnh, đơn giá và thành tiền = 0; tổng tiền cộng thêm VAT. Astro master `06d58e417dfbd62cbc471755a58c08e58428cfb6` đã sửa CoCart mapping ảnh/giá, refresh trên `/cart` kể cả khi không có query cart_key, hỗ trợ cập nhật giỏ và checkout theo giá gộp VAT, không render VAT surcharge. Woo Admin đã xác minh 3 setting giá VAT-inclusive; giữ nguyên native coupon `aqua-auto-5`.

**Giá trị Woo được xác nhận bằng kiểm thử:** combo 82477 giá 2.700.000đ, coupon giảm 135.000đ, tổng phải trả 2.565.000đ, ship 0, không có VAT cộng thêm; Woo vẫn tính/report VAT nội bộ.

| Công đoạn | Kết quả |
|---|---|
| [CMS Woo VAT settings + QA #42814147919](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42814147919) | SUCCESS, cleanup PASS |
| [Astro source QA #42814401425](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42814401425) | SUCCESS |
| [Production trigger #42814543204](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42814543204) | SUCCESS |
| [Production deploy #42814669203](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42814669203) | SUCCESS |
| [Playwright production #42814974242](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42814974242) | SUCCESS, ảnh/tất cả giá, checkout, cleanup |
| [Playwright direct /cart #42815362692](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42815362692) | SUCCESS, URL không có query cart_key, localStorage restore, cleanup |

Checkpoint chi tiết: [docs/checkpoints/2026-11-10-cart-image-tax-inclusive.md](https://github.com/ngocnhanvo/aquathanhxuan-actions/blob/main/docs/checkpoints/2026-11-10-cart-image-tax-inclusive.md).

**Chưa hoàn tất phần rộng hơn của checkout E2E:** chính sách shipping/chi phí vận chuyển, BACS cần tài khoản ngân hàng được xác minh, OnePay sandbox/paid receipt/stock/email chưa thử giao dịch. Không tạo đơn thật trong QA giỏ hàng.

Chế độ code: auto-build
Cổng ghi source: bypass
Trạng thái: PARTIAL — chưa hoàn tất
