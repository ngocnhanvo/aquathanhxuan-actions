# AQUATHANHXUAN — Hero + Sale Visual Builder checkpoint (2026-11-08)

## Status: IN_PROGRESS — production source deployed, final live QA running

- Knowledge authority: `ngocnhanvo/knowledge@main` SHA `fc6fcf484455c9c80335c97b5819cfb4d58e8843`. Mode: `auto-build`; source gateway: `bypass`.
- Current Astro production source: `ngocnhanvo/aquathanhxuan-astro@master` SHA `a98b3ffb94496875512508dc25e3e65bc0a7d2d8`.
- Current WordPress PHP source: `ngocnhanvo/aquathanhxuan-php@master` SHA `7b10c4d92d42f1afaeb953b5bb24d19b48b98004`.
- Last-known sticky bottom removal and prior home_02..home_05 QA: PASS; do not repeat.

## Root cause, fix, tests

- In `wp-content/plugins/esc-visual-builder/includes/site-config.php`, Product-backed `home_01` config permission discovery initialized a static cache entry to `null` but returned the valid rule without storing it. Repeated authorization in the same request consequently rejected legitimate Sale edits. Fixed with `return $cache[$id] = [ ... ];`, commit `7b10c4d`.
- In-memory native PHP regression checks `site-config.dynamic.test.php` and `text-image-cells.test.php` PASS after isolating the test fixture's source timing.
- Astro `home00.test.ts`, `home01.test.ts` mapping tests PASS. Chromium Visual Builder source controls PASS.
- Source-only workflow `42427413828` completed SUCCESS in all three jobs after selective job reruns, no WordPress data mutation.

## Production release evidence

- PHP FTPS release request `php-release-requests/2026-11-08-hero-sale-builder-7b10c4d.json`, run `42427860869` SUCCESS. Released and SHA256-verified `site-config.php`, `text-editor.php`, `text-editor-ui.php`; no Astro build on the PHP job.
- Astro build request `build-requests/2026-11-08-hero-sale-visual-builder-a98b3ff.json`, WordPress production build run `42427965690` SUCCESS; canonical Astro deploy run `42428031861` SUCCESS and deploy-ready commit `a98b3ff...`.
- Live homepage QA five viewports PASS in runs `42428226138`, `42428264606`. Exact Builder row/field mapping for `home_00`, `home_01` PASS; Hero text switch preview + Cancel PASS; Sale native title, label, link selection PASS.
- Initial QA scripts failed a regex typo and an immediate postMessage cancellation assertion, not production build. The latest QA revision `bae167dc0b75a9c484f3f72b6b727df075341760` retries the Sale cancel check with bounded asynchronous wait.
- **Current live QA run: `42428419509` IN_PROGRESS.**

## Exact next action (do not redo completed work)

1. Inspect `42428419509` result and logs. If Sale cancellation still fails after 4-second wait, fix iframe draft state (Astro preview source) and redo only necessary production release/QA.
2. On complete live QA PASS, update this checkpoint to PASS with run SHA and overwrite `chatgpt/latest-response.md` in the same Actions repository.
3. Do not write test content into customer CMS; production QA is read-only/draft-and-cancel, and PHP save transaction is tested in memory.
