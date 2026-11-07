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

## Tiếp tục 2026-11-07 — hostname đã sửa và dữ liệu thực tế

- Hostname **đúng** theo chủ dự án: `https://admin.aquathanhxuan.io.vn` (dấu chấm sau `admin`), **không phải** `admin-aquathanhxuan.io.vn`.
- Actions writer được khôi phục, sửa hostname và chạy: https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42368054147. REST backend truy cập được, FAIL trước login vì thiếu category `Thương hiệu`.
- Read-only inventory chạy tại https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42368146441: `/wp-json/astro/v1/get-product-categories` chỉ trả `[{"id":16,"name":"Uncategorized","slug":"uncategorized","parent":0}]`. Các danh mục cần cho 11 mục Header chưa tồn tại tại endpoint đó.
- Cả hai run đều fail trước browser login/WordPress write; không có thao tác ghi WordPress DB. Không báo Header WordPress PASS, không thay fallback Astro khi chưa có menu thật.
- Astro `master` đã sửa duy nhất `.env.example` thành `WC_URL=https://admin.aquathanhxuan.io.vn` tại commit `9da84cf2c4a595ffeeebfd3002841725988a3f78`. Secret `ENV_FILE` của Actions/runtime chưa được sửa/xác minh bởi thao tác này.
- Workflow/script one-shot dọn sau khi hoàn tất đọc lỗi; không cần rerun chúng khi dữ liệu vẫn thiếu.

### Next action
1. Xác định nguồn taxonomy đã duyệt / 11 category thực trong WordPress và tạo/khôi phục taxonomy bằng cơ chế CMS có quyền, sau khi đối chiếu danh mục/slug/parent thật. Không bịa slug hoặc link placeholder chết.
2. Chạy lại writer `Header/vi` theo nguyên tắc read-before-write, xác minh 11 item từ REST.
3. Sau khi menu thật PASS: bỏ fallback `src/data/menu.json` / cross-locale trong Astro, vô hiệu cache fallback cũ, commit và deploy bằng production workflow; QA Header desktop/mobile.

## Checkpoint cuối — 2026-11-07

**Trạng thái: PASS / DEPLOYED_PRODUCTION / QA_PASS.** Các mục BLOCKED_DNS và TODO ở các đoạn trên là lịch sử, không còn hiệu lực. Không chạy lại writer/build nếu không có thay đổi mới.

- WordPress backend đúng: `https://admin.aquathanhxuan.io.vn`. Menu `Header/vi` có 11 item thật và taxonomy/page đã đủ. Inventory run [#42370483565](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42370483565): `PREFLIGHT missing=0, header_items=11`, `AQUA_MENU_SETUP=PASS SKIP_UNCHANGED`.
- Astro production `ngocnhanvo/aquathanhxuan-astro@master`: [`50113cce065627566776d1aaae5f127717a43bac`](https://github.com/ngocnhanvo/aquathanhxuan-astro/commit/50113cce065627566776d1aaae5f127717a43bac). Đã xóa `src/data/menu.json`, bỏ fallback Header trong build và livePreview; invalidated shared cache legacy `cacheVersion=2`; thiếu menu WordPress sẽ fail rõ.
- Actions `ngocnhanvo/aquathanhxuan-actions@main`: marker provenance có cả root + `client/`, signed ZIP kiểm hai bản giống nhau; hiện vẫn giữ guard `FULL_ZIP` khi có public provenance marker để fail-safe. Contract CI [#42372880484](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42372880484) **PASS**.
- Production deploy [#42373016945](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42373016945) **SUCCESS**: Astro build, package, FTPS, signed activate đều PASS.
- WordPress trigger + Playwright QA [#42372941621](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42372941621) **SUCCESS**: `SOURCE_SHA_VERIFIED=50113cc...`, `BUILD_SUCCESS=PASS`, `DEPLOY_READY=PASS commit=50113cc...`, `QA_PASS header_search=visible account=visible cart=visible contacts=hidden nav=purple logo=visible`. Screenshot artifact `aquathanhxuan-header-production-qa` trên run.
- Lịch sử đã xử lý: run #42371726514 fail vì livePreview import fallback còn sót; #42371833663 deploy thành công nhưng marker public 404; #42372411550 fail signed PHP static inventory mismatch; tất cả đã sửa và **không cần rerun**.
- PHP production `ngocnhanvo/aquathanhxuan-php@master`: [`3fd09b316898d1a1ab7eab1a19d8005380aa9482`](https://github.com/ngocnhanvo/aquathanhxuan-php/commit/3fd09b316898d1a1ab7eab1a19d8005380aa9482). `aquathanhxuan_static_collect()`/eligibility đã loại `aquathanhxuan-staging-build.json` khỏi static reuse; offline contract PASS và PHP release [#42341480728 attempt 2](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42341480728) PASS FTPS + readiness probe.
- Có hai build-request cùng Astro SHA `50113cc` chạy nối tiếp do request tương đương đã tồn tại trong queue. Run lặp [#42373219015](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42373219015) + wrapper [#42372967202](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42372967202) cũng SUCCESS/QA_PASS, không đổi source. **Không kích lại bất kỳ run nào cho SHA này.**
- **Next:** chỉ nhận yêu cầu thay đổi mới hoặc QA bổ sung nếu người dùng chỉ ra sai lệch cụ thể. Không sửa PHP/unzip hay kích build khác khi trạng thái hiện tại đã PASS.



## Checkpoint Header responsive — 2026-11-07 19:50 +07

**Trạng thái: PASS / DEPLOYED_PRODUCTION / RESPONSIVE_QA_PASS.** Đây là checkpoint mới hơn phần “Checkpoint cuối” phía trên cho phạm vi Header; không chạy lại build/menu writer nếu không có thay đổi mới.

- Astro production `ngocnhanvo/aquathanhxuan-astro@master`: [`c50946d5ee64d170e0537b2a30ebd83c3c2fb961`](https://github.com/ngocnhanvo/aquathanhxuan-astro/commit/c50946d5ee64d170e0537b2a30ebd83c3c2fb961).
- Mobile Header đã bám handoff: hamburger bên trái, logo WordPress ở giữa, search/account/cart bên phải; không còn hotline ở mobile. Search mở panel riêng; drawer trượt cạnh nền tím, có overlay, logo, nút đóng, nhóm tài khoản/giỏ hàng và menu lấy nguyên từ WordPress.
- Hành vi drawer: click/tap submenu, khóa scroll, click overlay/ESC để đóng, focus trap và trả focus về nút mở. Không thay đổi nguồn `Header/vi`, không thêm fallback/hard-code menu.
- Build request [#42373673019](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42373673019) **SUCCESS**: `SOURCE_SHA_VERIFIED=c50946d...`, `BUILD_SUCCESS=PASS`, `DEPLOY_READY=PASS commit=c50946d...`, desktop smoke `QA_PASS`.
- Production deploy [#42373753992](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42373753992) **SUCCESS**: compile, package, FTPS và signed activation đều PASS.
- Responsive browser QA [#42374157670](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42374157670) **SUCCESS** với 5 viewport: `1440x900`, `1024x768`, `768x1024`, `844x390`, `390x844`. PASS: không horizontal overflow, đúng desktop/mobile breakpoint, 11 top-level items, logo/icon không đè nhau, drawer tím/overlay/scroll lock/submenu/ESC/focus, search panel + focus restore. Artifact: `aquathanhxuan-header-responsive-qa`.
- Run [#42374049854](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42374049854) là false-negative của QA tạm vì assertion focus chạy trước `requestAnimationFrame`; chỉ sửa test wait, **không sửa source và không rebuild production**. Run sau đã PASS.
- Workflow QA tạm đã bị xóa sau nghiệm thu; không để file test không tham gia thành phẩm trong repo.
- **Next:** Header đã xong. Chỉ sửa lại Header nếu người dùng chỉ ra sai lệch mới; công việc UI kế tiếp có thể chuyển sang section homepage tiếp theo theo `docs/design/aquathanhxuan-homepage/HANDOFF.md`.
