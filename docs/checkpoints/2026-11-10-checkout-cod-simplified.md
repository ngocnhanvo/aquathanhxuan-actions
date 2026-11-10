# Aqua Thanh Xuân — Checkout COD và form gọn (2026-11-10)

## Phạm vi đã triển khai
- Xóa bộ chọn Cá nhân/Tổ chức và CCCD/MSDN; nhãn Họ và tên.
- Số điện thoại tùy chọn xuyên qua Astro UI, Astro proxy, backend Woo PHP.
- Chuyển Địa chỉ trước Tỉnh/Thành phố và Quận/Huyện/Phường.
- Chỉ hiển thị và chấp nhận WooCommerce native COD; OnePay không bị xóa khỏi cấu hình gốc.
- COD checkout dẫn tới trang xác nhận đơn hàng của frontend; giỏ được clear sau xác nhận.

## Nguồn và phát hành
- Astro: `ngocnhanvo/aquathanhxuan-astro@master`, SHA `3e00ba57d9adfb70d2c5f8658a63ac99f3314098`.
- PHP: `ngocnhanvo/aquathanhxuan-php@master`, SHA `cbaffc1831a40fc85fc829e0ad2d40025107bdeb`.
- Woo COD enable/readback: [run #42817289132](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42817289132), PASS (false => true), 0 orders.
- Astro source compiler/Vitest: [run #42818057110](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42818057110), PASS.
- PHP FTPS syntax + tests + release: [run #42818081582](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42818081582), PASS.
- Production build trigger: [run #42818312059](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42818312059), PASS.
- Production deploy: [run #42818443637](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42818443637), PASS.
- Browser Playwright: [run #42818776565](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42818776565), PASS, `AQUA_CART_CHECKOUT_CLEANUP=PASS`, 0 orders created.

## QA giới hạn có chủ đích
Browser QA kiểm thử giỏ thật và tổng tiền đã gồm thuế, coupon thật, nhập form (bỏ trống số điện thoại), chỉ COD, gọi POST checkout bị chặn bằng Playwright route mock, idempotency, tạo tài khoản giả lập không gửi WordPress, mobile 390px và bảo vệ trang lịch sử đơn hàng. **Không có giao dịch COD/đơn hàng thực tế được tạo trong QA.** Khi cần nghiệm thu trọn vòng đời order thật phải thực hiện kiểm thử được duyệt riêng.

## Hành động tiếp theo
Không còn việc dở trong phạm vi 5 điều chỉnh checkout; nếu tiếp tục kiểm thử tạo đơn thật cần có quyết định riêng về tác động dữ liệu/email/stock.
