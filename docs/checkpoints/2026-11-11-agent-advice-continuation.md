# Aqua Thanh Xuân — checkpoint tiếp nối Agent advice (2026-11-11 10:05 ICT)

## Scope
- Project: aquathanhxuan.com — Astro production https://aquathanhxuan.io.vn, WordPress https://admin.aquathanhxuan.io.vn
- Knowledge: ngocnhanvo/knowledge/main; code mode: auto-build; source gateway: bypass
- Astro: ngocnhanvo/aquathanhxuan-astro/master@a41f9af898f11ca7dbf357aeb1f972d34efaf7db (unchanged, no Astro build)
- PHP: ngocnhanvo/aquathanhxuan-php/master@0610ae4b1017b43b0a4bf4729db9793681f600c1 (source and production PHP deploy)
- Actions: ngocnhanvo/aquathanhxuan-actions/main; release request commit 79279adcee496c0e4ea587f82b9ab9de6bab7e33 (additional checkpoint/logging commits later)

## Prior successful checkpoints confirmed
- Banner fractional media CSS: #42941999424 PASS
- Responsive header: #42944057918 PASS
- Aqua storefront Agent frontend/PHP adaptation: #42947322544 PASS (mocked chat, not live LLM inference)
- New-host SEO redirects: 88/88 PASS in #42939469959
- COD checkout no-order browser and WordPress Builder: #42888566052 and #42889046860 PASS

## Newly fixed residual Aqua Agent copy and truthfulness
- Found old gift/bulk commerce language in PHP Core/Agent.php advice fallback ("đối tượng nhận", generic gift suggestion) and misleading unverified "sản phẩm phù hợp" intro in nested product list.
- Fixed advice to ask for actual aquarium-related parameters (tank volume when relevant, use, budget), keep known Woo product facts, and refrain from unverified compatibility claims.
- Updated renderProductAdvicePayload() product-list call to choose broad catalog copy so it will not assert suitability when none is demonstrated.
- Added offline pure fixture: php/tests/aqua-agent-advice.test.php. It checks real-format list links/prices, parameter follow-up, broad catalog intro, and rejects legacy bulk/gift language and suitability assertion.
- PHP commits: 3f58925e, 42da9afa, 2cecc682, final 0610ae4b.
- Existing FTPS allowlist expanded for exactly the changed Core/Agent.php file; production release and source QA workflows now lint and run the offline fixture. No second pipeline.
- Exact final source QA run #42949987879 SUCCESS. Earlier QA run #42949614726 SUCCESS.
- Exact final PHP release run #42950075015 SUCCESS. Log contains:
  AQUA_AGENT_ADVICE_FIXTURE_PASS items=2 no_production_writes=true
  AQUATHANHXUAN_PHP_RELEASE installed=wp-content/mu-plugins/esc-agent/src/Core/Agent.php sha256_verified=PASS
  AQUATHANHXUAN_PHP_RELEASE completed=PASS files_checked=27
  AQUATHANHXUAN_PHP_RELEASE no_astro_build=PASS
  AQUATHANHXUAN_WP_UNZIP_READY_MARKER=PASS
  All other 26 allowlisted production PHP files unchanged.
- Prior release #42949737408 SUCCESS (intermediate commit); final release above supersedes it.
- No WordPress content edits, customer records, LLM generation probes, Woo orders or Astro builds performed.

## Remaining blockers, do not claim overall DONE
1. Legacy https://aquathanhxuan.com/danh-muc/thuong-hieu/ still serves an old-origin category rather than 301 redirect to new .io.vn. Redirect rules on new host cannot rewrite legacy origin; requires access/authorization to old server/hosting/WordPress rule. Preserve exact path mappings and audit Location from .com.
2. Real Woo COD order lifecycle + shipping still blocked on business-approved native shipping zones/rates and an authorized test buyer/order or isolated staging. Do not invent fees, alter stock, create checkout orders, or send real emails merely to pass tests.
3. Agent live LLM response quality not tested; existing Playwright mocks generation to avoid persisting production chat/trace records. Requires isolated staging or an explicitly authorized probe with cleanup/retention plan. The offline prompt/fixture and safe UI tests passed but do NOT establish real model accuracy.

## Next safe steps
- Request old-origin hosting rewrite access/approval; carry out reversible 301 audit.
- Obtain native shipping policy/approval for a real controlled COD order before testing production order flow.
- Arrange isolated inference acceptance for published Woo products, accurate price/promo guidance and no hallucinated compatibility, then secure cleanup.
- If new code/CMS changes, use only the existing QA/release pipeline with exact source SHA pinning.
Status: PARTIAL — externally gated acceptance remains.