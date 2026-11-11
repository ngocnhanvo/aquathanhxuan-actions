# Aqua Thanh Xuân — Agent storefront link audit (2026-11-11)

## Phạm vi
- Dự án: aquathanhxuan.com
- Frontend: https://aquathanhxuan.io.vn; WordPress: https://admin.aquathanhxuan.io.vn
- Astro master: `a41f9af898f11ca7dbf357aeb1f972d34efaf7db` (unchanged)
- PHP master: `f7d743c41bc7f6e54bfc594ed39396a2792e5a28` (new link source)
- Actions main: source QA and PHP release requests below
- Chế độ: auto-build; cổng ghi source: bypass

## Lỗi tái hiện
Khách hỏi "bên bạn có các nền nào"; Agent xuất link Cibi `/cibi` 404, nhưng trang đúng là `/san-pham/cibi`. ProductSkill.categories chỉ cung cấp slug/name, nên LLM tự ghép sai URL; nhiều skill khác dùng permalink WordPress thay vì route Astro.

## Đã sửa trong PHP source
1. `Skills/ProductSkill.php`: category nodes có `url=/san-pham/{slug}`; product search dùng route Astro chuẩn; không dựa vào `get_permalink`.
2. `Core/Agent.php`: `normalizeEvidenceLinks` duyệt nguồn dữ liệu Skill, chữa URL sai theo tên danh mục/sản phẩm xác thực, bỏ link tự sinh không được nguồn xác minh; chạy trước khi lưu bot reply.
3. `Core/AgentSynthesisPrompt.php`: yêu cầu AI chỉ dùng `url`/`link_markdown` do Skill cung cấp, cấm ghép slug.
4. `Skills/ProductDetailSkill.php`, `PromotionSkill.php`, `ProductMaterialSkill.php`: dùng cùng product frontend URL (so sánh kế thừa ProductDetail).
5. `Skills/CompanySkill.php`, `ContactSkill.php`: không biến link tuyệt đối menu thành `/https://...`.
6. `Skills/PaymentSkill.php`: xuất Markdown link thanh toán từ permalink Page thay vì chữ `[Link]: /...`.
7. `tests/aqua-agent-advice.test.php`: offline fixture cho parent-child Cibi, Prodibio, product, policy, link bịa, URL menu tuyệt đối, material, payment. Không phát sinh order/chat record.
8. Actions: update FTPS allowlist, PHP lint and fixture test trên pipeline hiện tại, không tạo pipeline mới.

## Đã gửi kiểm thử và phát hành
- QA request cuối: [commit 5537f47](https://github.com/ngocnhanvo/aquathanhxuan-actions/commit/5537f47cd6b4fec08d082e73c64399ace4cf1871), source pinned đúng PHP `f7d743c`.
- PHP release request cuối: [commit 6f19666](https://github.com/ngocnhanvo/aquathanhxuan-actions/commit/6f1966698b7b0a2a67f46bcfb1ba85902baef034), source pinned PHP `f7d743c`.
- PHP release request trước [4872fe0](https://github.com/ngocnhanvo/aquathanhxuan-actions/commit/4872fe0220a704e7a8cdf0a9d1c3e4de641fbd4e) đã được supersede (trước bản bổ sung PaymentSkill).
- Kiểm tra nội dung source/manifest: PASS. **Không có run ID và conclusion mới được connector hiện tại cung cấp**, do API workflow run gắn commit chỉ lọc PR. Không tuyên bố QA hay release SUCCESS nếu chưa lấy được job/run/log. Source commit khác deploy.

## Bước tiếp nối bắt buộc
1. Tra đúng QA workflow `aqua-agent-storefront-source-qa.yml` từ commit request 5537f47; cần kết quả job, đặc biệt PHP syntax + `AQUA_AGENT_ADVICE_FIXTURE_PASS`.
2. Tra đúng production PHP release `aquathanhxuan-php-release.yml` từ commit request 6f19666; cần verify `AQUATHANHXUAN_PHP_RELEASE completed=PASS`, checksum, rollback state, no Astro build.
3. Nếu release thất bại, đọc job log, sửa đúng nguyên nhân, pin lại PHP SHA và gửi request mới chỉ sau khi an toàn; không báo deploy thành công theo request.
4. Xác minh trên production không còn link `/cibi`, thử Cibi/Prodibio, sản phẩm, khuyến mãi, chính sách, liên hệ, thanh toán; nếu cần kiểm thử LLM thật, dùng môi trường cô lập hoặc probe được cho phép có cleanup/retention (production chat có thể lưu trace).
5. Không tạo đơn/giả giá ship để qua test, không sửa domain cũ `.com` vì khác phạm vi/quyền.

**Trạng thái:** PARTIAL — source đã sửa, QA/release đã kích hoạt nhưng chưa đọc được kết quả production.
