# Aqua Thanh Xuân — bootstrap readiness checkpoint (2026-11-06)

Status: **CLONE_READY_FOR_SITE_IMPLEMENTATION**. Source foundation only; no production Astro build or PHP FTP release is claimed here.

## Locked project scope

- Astro: `ngocnhanvo/aquathanhxuan-astro@master`; public origin `https://aquathanhxuan.io.vn`.
- WordPress/PHP: `ngocnhanvo/aquathanhxuan-php@master`; backend origin `https://admin-aquathanhxuan.io.vn`.
- Actions: `ngocnhanvo/aquathanhxuan-actions@main`.
- Central source-write gate: `ngocnhanvo/source-commit-actions`; all three Aqua targets are allowlisted for their declared branches.
- Astro production builds remain WordPress-controlled through **Build Website**; this checkpoint does not authorize a parallel Actions build path.

## Template source actually cloned

One-time bootstrap run `42244755704` completed successfully for all three matrix jobs and refused overwrite of non-empty targets.

- `template-astro@0291d7d5640def31f9ee0d29328ed829fd44397b` -> initial Aqua Astro `fc6b48c44fbc7cfc3d2adc4490e040a002ef7312`.
- `template-php@baa1ed583e14b27c9cdc6278b6c5b66ba734f8b4` -> initial Aqua PHP `a781da3b8023292ece9e083a24a923337c6b74f1`.
- `template-actions@8c7d4f8dcb7a6be42e95357e4611819e6cbccf88` -> initial Aqua Actions `3a003b2ef8bc8b3797d6f109d708e8e4ad0c453f`.
- Control-plane allowlist commit: `73f7492b32e07673b5a47dde3e351bfc4b8a6b7b`.

The bootstrap personalized repository names, Aqua domain examples, deployment contract filenames, environment token prefixes and WordPress GitHub-routing documentation without importing template Git history into the new repositories.

## Post-bootstrap corrections and validation

- Aqua PHP current source includes `e98a65e8e74a87f79375cc3b0b55cb0ee5cd19e5`, which points backend deployment documentation to `ngocnhanvo/aquathanhxuan-actions`.
- `SOURCE_REPO_PAT` access was revalidated after credential rotation: Visual Builder run `42244788389` completed successfully and checked out both private Aqua Astro and PHP repositories.
- The template personalizer had replaced `Template` inside one Python class identifier with the display brand containing spaces. Aqua Actions commit `6d150771e93aa9e89d0a5c4ce4cf232ca9f907bc` repairs that identifier through `source-commit-actions`.
- Deploy transport contract run `42253742995` on the repaired Actions commit completed successfully, including private PHP checkout, PHP syntax/contracts and Python packaging/ZIP round-trip contracts.
- Visual Builder contracts remain PASS from run `42244788389`; they were not rerun after the Python-only transport-test correction because the changed file is outside that workflow's contract surface.

## Inherited documentation boundary

Files whose names still contain `template-` under `docs/checkpoints/` or `docs/plans/` are retained because the source-write gate does not allow deletions. They are historical template references only. Their pre-bootstrap SHAs, run IDs, completed checkboxes and `normal`-mode statements are **not** Aqua execution evidence and must not override this checkpoint or the current project context.

## Ready / not yet released

The clone is ready for actual website implementation: Astro/PHP/Actions repositories exist on the correct branches, the source-write allowlist works, the shared PAT can read the private source repos, and the two source-only contract surfaces exercised after bootstrap are green.

The following are intentionally **not** part of clone completion and must be handled when the website implementation reaches release:

- populate/manage real Aqua Thanh Xuân WordPress content, menus, ESC Tables, media and project integrations;
- verify the live server's private `wp-config.php` values route `VCS_GH_OWNER/VCS_GH_REPO` to the Aqua Actions repository;
- deploy future PHP changes through the approved FTP path when required;
- trigger Astro build/deploy only from WordPress **Build Website** under the active code mode, then verify `BUILD_SUCCESS`, `DEPLOY_READY` and `QA_PASS` separately.

No template customer database, production content, credentials or old-site runtime identity is claimed as migrated by this source bootstrap.
