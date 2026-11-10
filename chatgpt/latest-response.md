# Phản hồi ChatGPT mới nhất — aquathanhxuan.com

- Ngày: 2026-11-10, Asia/Ho_Chi_Minh.
- Chế độ code: auto-build; Cổng ghi source: bypass.
- Task: rà soát **trạng thái** toàn bộ luồng chọn sản phẩm → giỏ → coupon → checkout → chọn gateway → tạo đơn → thanh toán → receipt, tham khảo esc.vn read-only.

## Hiện trạng được kiểm chứng

- Aqua Astro `master` `0ac8af50be65a4ead280d2368bd69195c27bcc01`; PHP `master` `bbeae23d8169a8177ab9719eda4cf6040f9d1b8a`. Không sửa/deploy source Astro/PHP khi trả lời câu hỏi tiến độ; chỉ cập nhật readonly Actions QA.
- Thêm vào giỏ, CoCart cart, coupon thật 5% ≥200k: PASS [anonymous cart QA #42777458941](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42777458941), subtotal 2.7m, giảm 135k, cleanup PASS, no orders.
- WP Pages `cart` (#83808, `ssr-cart/CartPage`), `checkout` (#83810, `ssr-checkout/CheckoutPage`), `order-received` (#83812, `ssr-checkoutdone/CheckoutDonePage`) published; 3 Rewrite rules #83814/83815/83816 enabled.
- Tuy nhiên `/cart`, `/checkout`, `/order-received`, và **cả** `/ssr/cart/cart`, `/ssr/cart/checkout`, `/ssr/cart/order-received` đều HTTP 404, được xác nhận trong [route audit #42778412178](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42778412178).
- [SSR cache QA #42778732005](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42778732005): production `/data/cms-common.json` HTTP 200 nhưng **không có 3 SSR Page keys**; `/data/page-cart.json`, `page-checkout.json`, `page-order-received.json` đều HTTP 404. Root trực tiếp là **bản build thiếu Page JSON**. Nguyên nhân khả dĩ thuộc incremental Page cache: `getPages` dùng get-page-logs, kiểm tra SSR IDs chỉ từ tập cũ, bỏ sót Page mới khi log không phản ánh.
- WordPress gateways active: `onepayus` và `bacs`; COD và cheque disabled. Form frontend lấy gateways động, PHP có tạo đơn/ưu đãi/stock/address/account/process payment, nhưng **chưa E2E QA đơn thật**.
- `CartPage.astro` còn hardcode mô tả 5% >200k trái quy tắc Coupon CMS; `CheckoutDonePage.astro` còn chuỗi `ESC {order.id}` cho VietQR. Phần chọn/tính phí giao hàng cho sản phẩm vật lý chưa chứng minh, PHP có nguy cơ đơn trùng/orphan khi retry lỗi.

## Tham chiếu ESC.vn (chỉ đọc)

Repo `ngocnhanvo/escvn-astro/master` và `ngocnhanvo/escvn-php/master`; public `https://esc.vn/cart/` render Cart → Checkout → Complete. ESC dùng đúng nhóm ACF key `ssr-cart`, `ssr-checkout`, `ssr-checkoutdone`; mô hình SSR tương tự. ESC có logic BACS chọn tài khoản ngân hàng theo vùng, lưu tài khoản vào đơn; không bê danh tính/ngân hàng ESC sang Aqua. Aqua nên tiếp tục dùng payment methods động trong Woo.

## Bước sau — **CHƯA THỰC HIỆN**

1. Sửa nguồn incremental Page cache và xuất các JSON SSR, test, deploy đúng workflow hiện hữu và xác minh HTTP 200.
2. Sửa các chuỗi còn sót ESC và nhãn coupon hardcode, đảm bảo WooCommerce là nguồn duy nhất.
3. Hoàn thiện/kiểm thử vận chuyển, tạo tài khoản, validate form/gateway, ngăn đơn trùng, nhận đơn & redirect BACS/OnePay; tránh tạo đơn thật khi chưa có cấu hình test an toàn.

[Checkpoint đầy đủ](https://github.com/ngocnhanvo/aquathanhxuan-actions/blob/main/docs/checkpoints/2026-11-10-cart-to-checkout-audit.md)

Chế độ code: auto-build
Cổng ghi source: bypass
Trạng thái: PARTIAL — chưa hoàn tất
