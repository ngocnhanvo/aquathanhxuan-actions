# Aqua Thanh Xuân — checkpoint tiếp nối 11/11/2026 (09:44 ICT)

## Scope and source truth

- Project: aquathanhxuan.com; live Astro https://aquathanhxuan.io.vn; WordPress https://admin.aquathanhxuan.io.vn.
- Knowledge `ngocnhanvo/knowledge/main`, tree SHA `0a316918e9de25c531d06cffd487b7411c72c11e`.
- Astro `ngocnhanvo/aquathanhxuan-astro/master@a41f9af898f11ca7dbf357aeb1f972d34efaf7db` (09:23 ICT).
- PHP `ngocnhanvo/aquathanhxuan-php/master@10b6e584c6f7afd59702bee1b4cb438dd1e81fda` (09:26 ICT).
- Actions `ngocnhanvo/aquathanhxuan-actions/main@cafb4497a720d88cf90c093701e302da9c412df4` before this checkpoint (09:42 ICT).
- Read required `chatgpt/latest-response.md` at start; previous final state was DONE for the Agent adaptation ticket.
- No open PR in any of the three Aqua repos at inspection; no new commit or production build needed for the already-passed ticket.

## Most recent tickets verified complete

1. Dark/blank Home00 banner at fractional 767–768px media boundary: Astro `b208b9f`; source QA #42941509621, WordPress build #42941605066, Astro deploy #42941711725, browser QA #42941999424 all SUCCESS. See `2026-11-11-home00-fractional-banner.md`. Exact fractional media condition was not reproduced in the QA browser; CSS queries are complementary.
2. Header search/account overlap at 900–1600px: Astro `53bf9cf`; source QA #42943189971, build #42943294721, deploy #42943396629, extended browser QA #42944057918 SUCCESS. See `2026-11-11-header-responsive-926-1032.md`.
3. Aqua Agent storefront UI/PHP advice: Astro `a41f9af`, PHP `10b6e58`; source QA #42946287879, PHP release #42946448388, WordPress production build #42946934192, Astro deploy #42947043396, browser QA #42947322544 SUCCESS. Mocked generation avoided polluting production conversation records; live LLM advice remains NOT TESTED. See `2026-11-11-aqua-agent-storefront.md`.
4. New-host old category redirects and Yoast SEO: 88/88 live 301 destinations, titles, descriptions, canonicals SUCCESS in #42939469959. See `2026-11-11-menu-seo-redirect.md`.
5. Commerce: native coupons/COD/replay/shipping quote code and no-order browser QA passed (including #42888566052 and Visual Builder #42889046860). Production shipping method policy is not enabled and no real order was created. See `2026-11-11-cod-replay-and-shipping-readiness.md`.

## Outstanding externally gated acceptance (do not call DONE)

- **Legacy .com redirect:** old-origin `https://aquathanhxuan.com/danh-muc/thuong-hieu/` remains a live category page (fresh public read on 11/11/2026); old host did not redirect in earlier independent audit. WordPress redirects on `.io.vn` cannot control the old `.com` origin. Need authorized access to old site hosting/DNS/WordPress rewrite; do not modify the new production repo or invent credentials to claim cross-domain cutover.
- **Real COD order lifecycle and shipping:** owner-approved Woo shipping zones/rates and explicitly authorized real test-buyer/order or staging are absent in current verified checkpoints. Source is ready to quote/verify native rates, but policy is disabled. Do not enable a method, invent fees, place orders, send notifications or alter stock merely for QA. Once prerequisites exist, perform one controlled end-to-end order receipt/stock/ownership/email/idempotency acceptance.
- **LLM-generated response quality:** Agent UI/session/security/source guidance has passed; production model generation was intentionally mocked. Real content/provider inference not yet verified. A production POST would persist chat/trace data; prefer isolated staging or specifically authorized test with a documented cleanup/retention boundary. Repeating mocked browser QA does not close this gap.

## Next safe steps

1. For old-domain forwarding: obtain and verify old-origin administrative rights/hosting rule access, then deploy a reversible 301 mapping preserving exact old URL paths and audit HTTP status/Location from the old origin to new, not only on new origin.
2. For shipping/COD: receive actual policy and test authorization, verify Woo native rates against address and order shipping line/tax, then run authorized buyer test.
3. For Agent: arrange non-production isolated inference test or approved real production probe, assess product-price/category/coupon grounding and ensure no residue of test conversations.
4. On any new source/CMS change: only then rerun relevant source/build/deploy/Playwright tests. Keep prior successful runs as evidence.

## This continuation's actual actions

- Compared live GitHub tree/HEAD/commit history, production workflow runs, source/checkpoint policy and open PRs.
- Opened public old-category page to confirm legacy origin remains served rather than silently assuming forwarding.
- No source changes, CMS writes, shopper data, new production runs or builds performed.

**Status: PARTIAL — external old-origin, shipping/order and live model acceptance remain open.**
