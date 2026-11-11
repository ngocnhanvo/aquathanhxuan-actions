#!/usr/bin/env python3
"""Offline contract for distinct Aqua production build/deploy phases; no FTP or build."""
import re
import unittest
from pathlib import Path

WORKFLOW = (Path(__file__).resolve().parents[1]
            / ".github/workflows/aquathanhxuan-production-deploy.yml")
TEXT = WORKFLOW.read_text(encoding="utf8")
MATCHES = list(re.finditer(r"^      - name: (.+)$", TEXT, re.M))
STEPS = {
    match.group(1): TEXT[match.start():MATCHES[idx + 1].start()
                             if idx + 1 < len(MATCHES) else len(TEXT)]
    for idx, match in enumerate(MATCHES)
}
ORDER = list(STEPS)


class ProductionBuildStepsContract(unittest.TestCase):
    def test_each_blocking_phase_is_a_separate_actions_step(self):
        required = [
            "Install locked Astro dependencies",
            "Prepare canonical WordPress build environment",
            "Build Astro Production (incremental WordPress data cache)",
            "Validate compiled Astro dist output",
            "Validate built-in Python FTPS upload client",
            "Prepare staging files and SEO metadata (strictly no .env)",
            "Compute signed reusable image/static deltas",
            "Create compiled staging ZIP",
            "Verify staging ZIP security and source provenance",
            "Upload compiled staging archive by Python FTP_TLS",
            "Verify provenance and activate staging bundle using signed PHP rollback",
        ]
        self.assertEqual([x for x in ORDER if x in required], required)
        self.assertEqual(len(STEPS), len(MATCHES), "Duplicate step names")
        for name in required[:9]:
            self.assertIn("timeout-minutes:", STEPS[name], name)

    def test_astro_and_python_ftps_preflight_are_separate_and_bounded(self):
        astro = STEPS["Build Astro Production (incremental WordPress data cache)"]
        dependencies = STEPS["Install locked Astro dependencies"]
        ftps = STEPS["Install encrypted FTPS client"]
        self.assertIn("pnpm install --frozen-lockfile --prefer-offline", dependencies)
        self.assertNotIn("pnpm run build-git", dependencies)
        self.assertIn("timeout --signal=TERM --kill-after=15s 1200s pnpm run build-git", astro)
        self.assertIn("AQUA_BUILD_STAGE=ASTRO_PROCESS_EXIT", astro)
        self.assertNotIn("apt-get", astro)
        self.assertIn("python3 -m py_compile", ftps)
        self.assertIn("AQUA_BUILD_STAGE=PYTHON_FTPS_READY", ftps)
        self.assertNotIn("apt-get", TEXT)
        self.assertNotIn("ftps_install_pid", TEXT)
        self.assertNotIn('wait "$ftps_install_pid"', TEXT)

    def test_staging_and_delta_packaging_guards_are_preserved(self):
        env = STEPS["Prepare canonical WordPress build environment"]
        self.assertIn("AQUATHANHXUAN_CANONICAL_WP_ORIGIN", env)
        self.assertIn("AQUATHANHXUAN_CANONICAL_CLIENT_ORIGIN", env)
        stage = STEPS["Prepare staging files and SEO metadata (strictly no .env)"]
        delta = STEPS["Compute signed reusable image/static deltas"]
        archive = STEPS["Create compiled staging ZIP"]
        check = STEPS["Verify staging ZIP security and source provenance"]
        self.assertIn("cp -a dist/. deploy/", stage)
        self.assertIn("sitemap.xml", stage)
        self.assertIn("test ! -e deploy/.env", stage)
        self.assertIn("aquathanhxuan-image-delta-package.py", delta)
        self.assertIn("aquathanhxuan-static-delta-package.py", delta)
        self.assertIn("zip -q -r ../upload/aquathanhxuan-astro.zip .", archive)
        self.assertIn("with ZipFile('upload/aquathanhxuan-astro.zip') as z:", check)
        self.assertIn("Refusing archive with private runtime secrets", check)
        self.assertIn("Archive provenance marker mismatch", check)

    def test_production_deploy_transport_remains_signed(self):
        upload = STEPS["Upload compiled staging archive by FTP-TLS"]
        activate = STEPS["Verify provenance and activate staging bundle using signed PHP rollback"]
        self.assertIn("aquathanhxuan-resumable-ftps.py", upload)
        self.assertIn("timeout --signal=TERM --kill-after=10s 360s", upload)
        self.assertIn("AQUA_BUILD_STAGE=PYTHON_FTPS_UPLOAD_EXIT", upload)
        self.assertIn("aquathanhxuan-remote-unzip.py unpack", activate)
        self.assertIn("cancel-in-progress: false", TEXT)
        self.assertIn("repository_dispatch:", TEXT)


if __name__ == "__main__":
    unittest.main()
