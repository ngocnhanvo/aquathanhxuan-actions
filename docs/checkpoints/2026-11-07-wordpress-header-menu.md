# Aqua Thanh Xuân — WordPress Header menu checkpoint (2026-11-07)

Status: **BLOCKED_DNS**. Không thay đổi WordPress DB; không gỡ fallback Astro trước khi nguồn menu thật được xác minh.

## Trạng thái repository

- Astro: `ngocnhanvo/aquathanhxuan-astro@master` = `fa12988222e7a9849a531dde52d627f85222e22f` (`Bổ sung menu header`).
- PHP: `ngocnhanvo/aquathanhxuan-php@master` = `8ced51433cc39648db889649858f481cc40ef6ea`.
- Knowledge áp dụng: `ea27fce0da99463f100aacc5416fa1f513f2c8e7` + `1595cea61c121e350544dbc5b8b6634cc7beae45`: Header phải lấy duy nhất từ WordPress Menu Manager; cấm `src/data/menu.json`/hard-code/fallback trong production.

## Checkpoint thực tế

Astro hiện vẫn còn legacy fallback:
- `src/lib/wordpress/cache.ts` import `@/data/menu.json`, ưu tiên WordPress nhưng fallback theo locale khi thiếu menu.
- `src/lib/wordpress/menus/index.ts` còn nhánh trả rỗng khi API lỗi và thông báo dùng menu.json fallback.
- `src/data/menu.json` hiện chứa 11 mục Header tiếng Việt từ commit `fa129882`. Đây chỉ là trạng thái tạm, không phải nguồn hợp lệ cuối cùng theo Knowledge mới.

Các run one-shot `Aqua header menu setup` đã dừng trước khi đăng nhập WordPress do DNS `ENOTFOUND admin-aquathanhxuan.io.vn`; vì vậy chưa có thao tác ghi WordPress từ task này.

Lần xác minh mới nhất:
- Writer được khôi phục từ logic commit `4c184d17` và bổ sung read-before-write: nếu `Header/vi` đã đúng 11 mục thì `SKIP_UNCHANGED`; chỉ khi khác mới đăng nhập và replace đúng menu đó.
- Commit tạm: `6ce24d3ccc4a4feb77d6a6fac67e437aa5e1fe8a` + `ff370254c35c35ea324019761e9fcdc9341b7290`.
- Run: https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42367726151
- Kết quả: **FAIL** tại fetch đầu tiên sau 8 lần retry, `getaddrinfo ENOTFOUND admin-aquathanhxuan.io.vn`.
- Không đến bước REST preflight menu, browser login, tạo menu hoặc import JSON. WordPress DB vẫn chưa bị thay đổi.
- Workflow/script one-shot được xóa lại cùng lần cập nhật checkpoint này.

## Bước tiếp theo khi DNS backend resolve lại

1. Chạy lại cơ chế ghi hẹp cho đúng `Header / vi` và 11 mục đã duyệt; giữ read-before-write và verify `/wp-json/esc-api/v1/menus` trả `menus.Header.vi.items` đầy đủ.
2. Chỉ sau khi menu thật PASS mới sửa Astro: xóa `src/data/menu.json` khỏi luồng Header, bỏ mọi nhánh fallback/cross-locale, API/menu schema lỗi phải fail rõ ràng; cache chỉ được dùng khi chứng minh là cache WordPress hợp lệ.
3. Kiểm tra cache cũ `.cache/data.json` không thể giữ lại menu fallback sau khi source đổi.
4. Commit Astro `master`, kích production bằng pipeline hiện hữu, đọc log menu fetch/merge và QA desktop/mobile trên `https://aquathanhxuan.io.vn`.
