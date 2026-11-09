# Aqua Thanh Xuân — nút Thêm vào giỏ hàng trên Product card

- Thời điểm: 2026-11-09 (Asia/Ho_Chi_Minh).
- Astro production `ngocnhanvo/aquathanhxuan-astro` `master` @ `beb08cf9c402b53c0ffe603dd540f98ab6082e04`.
- Actions `ngocnhanvo/aquathanhxuan-actions` `main`.
- PHP `master`: không thay đổi trong nhiệm vụ.
- Chế độ code: auto-build; Cổng ghi source: bypass.

## Nhiệm vụ và nguồn thực thi

- Người dùng yêu cầu thay các nút `Liên hệ báo giá` trong khu vực `Sản phẩm tương tự` và các card sản phẩm ở danh mục bằng nút `Thêm vào giỏ hàng` thực sự hoạt động.
- Trước sửa: `src/astroutils/RelatedProducts.astro` gắn cứng `data-product-quote-button`, `ProductsSSRPage.astro` và `ProductsPage.astro` dùng `Xem chi tiết` làm CTA.
- Sau sửa: `src/astro/components/Product/ProductCardCartButton.astro` cung cấp nút card chung, lấy product ID từ WordPress `Products._id`. `RelatedProducts` và danh mục SSR tái sử dụng component. Legacy `ProductsPage` dùng cùng data attributes và delegate trong JS.
- `src/astroreact/productCardCart.ts` là handler dùng chung: `addCartItem()` → `cartToProducts()` → lưu `esc-cart-storage` → phát `cart:updated` và `storage`, đồng bộ header badge và trạng thái nút, bảo vệ chống submit trùng.
- Product đang ở giỏ hiển thị `Xem giỏ hàng`, lần click sau điều hướng đến giỏ; `outofstock` hiển thị disabled `Hết hàng`; Product có variations điều hướng trang chi tiết chọn biến thể; Product domain/no real ID điều hướng chi tiết thay vì gọi Woo API sai. Không bịa giá, stock hoặc ID.
- Không sửa WordPress DB, API, import/source product fields, menu hoặc pipeline production.

## Bằng chứng kiểm thử

- Source QA: [42624862116](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42624862116): completed/success; compile PASS 5 template Astro, binding check PASS, Vitest **3/3 PASS**.
- WordPress production wrapper: [42624992756](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42624992756): completed/success.
- Existing Astro production deployment: [42625156328](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42625156328): completed/success.
- Browser QA [42625442368](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42625442368): completed/success, marker `CARD_DEPLOY_READY=beb08cf9c402b53c0ffe603dd540f98ab6082e04`. Related `/san-pham/may-sui-khi-atman-hp-12000` và category `/san-pham/thuong-hieu-chihiros` ở 1440px/390px, tổng **4/4 PASS**.
- Related: 4 nút add; category Chihiros: 12 nút add. Mỗi viewport nhấn nút lấy product ID thật, giả lập `/api/cart/add` (không gửi giao dịch thật), xác minh chỉ gọi một lần, cart `localStorage` được cập nhật, header badge tăng và nút chuyển `Xem giỏ hàng`; không JS exceptions hay horizontal overflow.
- Artifact screenshots/JSON QA: [13677953102](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42625442368/artifacts/13677953102).
- Ghi chú phạm vi: API POST thực sự tới WooCommerce ở production **chưa được gửi** trong QA để tránh tạo giỏ thử; việc đồng bộ khi phản hồi API hợp lệ được xác nhận bằng mocked request/response và Vitest. Hai trạng thái `outofstock`, `variations` được áp đặt ở nguồn UI nhưng không thử Product source mẫu riêng trên production.

## Kết quả

**DONE — hoàn tất** cho hai nơi UI được giao, đã phát hành đúng `master` và browser QA PASS. Không chạy lại build/test cho source SHA này khi không có thay đổi tiếp theo.
