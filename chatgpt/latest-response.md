# Aqua Thanh Xuân — Coupon groups, stacking and MF5/MF10 (2026-11-11)

Đã hoàn thành code, triển khai production WordPress và QA thật cho quản lý nhóm khuyến mãi; mã Tết tương lai quản lý hoàn toàn trong WordPress, không hard-code.

## Thành quả
- PHP master `0f2ef126deb7ecdbb090cd086a4482652a560e5c`: tạo taxonomy `esc_coupon_group`, trường group và stacking `none/cross_group/all` trong trang coupon. Coupon tự động lấy từ `_wc_auto_apply` của plugin Auto Coupons hiện hữu; chỉ lựa mã hợp lệ có ngưỡng tiền cao nhất khi cùng nhóm, đọc tỷ lệ/ngưỡng/Woo restrictions gốc, cho phép chồng ưu đãi khác nhóm. Không hard-code MF5/MF10/Tết, không tạo coupon ảo.
- Source PHP QA [#42902072754](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42902072754) PASS; PHP production release [#42902204133](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42902204133) PASS, không build Astro.
- CMS setup [#42902485026](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42902485026) PASS: Nhóm `Giá trị đơn hàng` term 1863, `Tết` term 1864. MF5 coupon 83818 (5% >200k), MF10 coupon 83865 (10% >1 triệu) ở cùng group `Giá trị đơn hàng`, mode cross_group, Auto Apply yes. Không tạo coupon Tết giả.
- WP admin regression [#42903287258](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42903287258) PASS trang quản lý nhóm; re-run idempotent changed=0.
- High-value cart QA [#42902782677](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42902782677) PASS: chỉ mf10, 2.700.000đ → 2.430.000đ.
- Exact product tier QA [#42903329493](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42903329493) PASS: Dennerle 4L ID 82481: 1 x 259.000đ → MF5 giảm 12.950đ → 246.050đ; 5 x 259.000đ → MF10 giảm 129.500đ → 1.165.500đ. Cả hai giỏ thử cleanup PASS, không tạo đơn, residue 0.
- Checkpoint bền vững: `docs/checkpoints/2026-11-11-coupon-groups-stacking.md` Actions main commit `ba67b962475d42cc03c9aa2092d42e62ec724583`.

## Hướng dẫn WordPress
1. WooCommerce → Nhóm khuyến mãi (`/wp-admin/edit-tags.php?taxonomy=esc_coupon_group&post_type=shop_coupon`): thêm/chỉnh tên nhóm.
2. Marketing → Mã ưu đãi: tạo mã thật, dùng trường WooCommerce gốc cho mức giảm/ngưỡng; chọn Nhóm và quy tắc cộng dồn `Không`/`Chỉ nhóm khác`/`Mọi mã` trong tab Chung; bật Auto Coupons → Auto Apply.
3. Tết: chọn nhóm Tết + quy tắc Chỉ nhóm khác (hoặc Mọi mã) để cộng dồn với MF5/MF10; không bật Woo `Individual use only` cho mã đó.

## Ngoài phạm vi
Chính sách phí vận chuyển COD của checkpoint trước chưa chốt; đây là công việc độc lập, không liên quan coupon.

Chế độ code: auto-build
Cổng ghi source: bypass
Trạng thái: DONE — hoàn tất
