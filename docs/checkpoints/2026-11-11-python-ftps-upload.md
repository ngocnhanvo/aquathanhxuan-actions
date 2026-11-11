# Aqua Thanh Xuân — Python FTP_TLS upload contract (2026-11-11)

## Scope
User requested replacing frequently hanging lftp FTP-TLS uploader with Python. The target is the existing production Astro pipeline in `ngocnhanvo/aquathanhxuan-actions/main`, not a second pipeline. No Astro or PHP application source was edited.

## Changes
- New `scripts/aquathanhxuan-resumable-ftps.py`: stdlib `ftplib.FTP_TLS` with strict OS trust store, protected data channel (`PROT P`), passive transfer, SHA-named partial ZIP, REST/STOR resume where supported, bounded retries and progress logs.
- `.github/workflows/aquathanhxuan-production-deploy.yml`: remove APT/lftp dependency; validate Python script; existing signed PHP unpack and rollback remain as-is; transfer process hard-capped by GNU timeout and job timeout.
- `.github/workflows/aquathanhxuan-deploy-contract-ci.yml`: Python script compile and offline contract tests.
- Added `tests/aquathanhxuan-resumable-ftps.test.py` and updated `tests/aquathanhxuan-build-stage-isolation.test.py` to reflect changed phases. Legacy shell uploader remains in repo for review/rollback but production workflow no longer calls it.

## Evidence
- Main branch code HEAD on completion: `3e4c4c735769484636c129d085384445a11fde5c`.
- [Offline contract run 43047745975](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/43047745975): **SUCCESS**, including 8 new FTP mock tests and existing staging, PHP and isolation tests.
- Production Astro workflow was NOT dispatched, FTP credentials were NOT used for new uploader testing and no production archive was changed.
- Recent unrelated PHP release [42953139192](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42953139192) failed on `socket.gaierror` when connecting to FTP host and rollback reported PASS. This is DNS resolution; changing Python client alone cannot guarantee prevention. Python uploader retries transient failures, including DNS errors.

## Acceptance gap
Next explicitly authorized Astro production build through the existing `repository_dispatch/wp_trigger_build` should be monitored to `BUILD_SUCCESS`, `DEPLOY_READY`, `QA_PASS`, checking archive SHA on signed PHP unpack and URLs. Until then: `CODE_READY / OFFLINE_CI_PASS / PRODUCTION_NOT_TESTED`.

Chế độ code: auto-build
Cổng ghi source: bypass
Trạng thái: PARTIAL — chưa hoàn tất
