#!/usr/bin/env python3
"""Offline FTP_TLS upload contracts; no real network, secrets or production writes."""
from __future__ import annotations
import ftplib
import importlib.util
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

SOURCE = Path(__file__).resolve().parents[1] / "scripts" / "aquathanhxuan-resumable-ftps.py"
spec = importlib.util.spec_from_file_location("aqua_resumable_ftps", SOURCE)
upload = importlib.util.module_from_spec(spec)
spec.loader.exec_module(upload)


class FakeFTPS:
    def __init__(self, files=None, fail_after_first_block=False, reject_rest=False):
        self.files = files if files is not None else {}
        self.fail_after_first_block = fail_after_first_block
        self.reject_rest = reject_rest
        self.rest_offsets = []
        self.closed = False

    def voidcmd(self, command):
        assert command == "TYPE I"
        return "200 Binary"

    def size(self, name):
        if name not in self.files:
            raise ftplib.error_perm("550 File not found")
        return len(self.files[name])

    def delete(self, name):
        if name not in self.files:
            raise ftplib.error_perm("550 File not found")
        del self.files[name]

    def rename(self, src, dest):
        self.files[dest] = self.files.pop(src)

    def storbinary(self, command, inp, blocksize=8192, callback=None, rest=None):
        assert command.startswith("STOR ")
        name = command[5:]
        self.rest_offsets.append(rest)
        if rest and self.reject_rest:
            raise ftplib.error_perm("502 REST+STOR not supported")
        content = bytearray(self.files.get(name, b"")[:rest]) if rest else bytearray()
        while True:
            data = inp.read(blocksize)
            if not data:
                break
            content.extend(data)
            self.files[name] = bytes(content)
            if callback is not None:
                callback(data)
            if self.fail_after_first_block:
                self.fail_after_first_block = False
                raise OSError("Temporary network interruption")
        return "226 Transfer complete"

    def close(self):
        self.closed = True


class UploadContracts(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.archive = Path(self.tmp.name) / "astro.zip"
        self.payload = bytes(i % 251 for i in range(1024 * 1024))
        self.archive.write_bytes(self.payload)
        import hashlib
        self.digest = hashlib.sha256(self.payload).hexdigest()
        self.temp_name = f".aquathanhxuan-astro.{self.digest}.zip.uploading"

    def test_verified_target_and_server_contract(self):
        env = {
            "FTP_SERVER": "ftp.example.org", "FTP_USERNAME": "user",
            "FTP_PASSWORD": "secret", "ZIP_PATH": str(self.archive),
            "ASTRO_FTP_TARGET": "/domains/aquathanhxuan.io.vn/public_html/",
            "AQUATHANHXUAN_CLIENT_HOST": "aquathanhxuan.io.vn"
        }
        self.assertEqual(upload.validated_settings(env)[0:3],
                         ("ftp.example.org", 21, env["ASTRO_FTP_TARGET"]))
        env["FTP_SERVER"] = "ftps://ftp.example.org"
        self.assertEqual(upload.validated_settings(env)[0], "ftp.example.org")
        env["ASTRO_FTP_TARGET"] = "/domains/admin.aquathanhxuan.io.vn/public_html/"
        with self.assertRaises(ValueError):
            upload.validated_settings(env)
        env["ASTRO_FTP_TARGET"] = "/domains/aquathanhxuan.io.vn/public_html/"
        for invalid in ("ftp://foo:2121", "ftp://user:secret@foo", "http://foo", "ftp://foo/other"):
            env["FTP_SERVER"] = invalid
            with self.subTest(invalid=invalid), self.assertRaises(ValueError):
                upload.validated_settings(env)

    def test_first_upload_replaces_only_fixed_zip(self):
        ftp = FakeFTPS({"unrelated.txt": b"untouched", upload.FINAL_NAME: b"old"})
        upload.transfer_once(ftp, self.archive, self.digest)
        self.assertEqual(ftp.files[upload.FINAL_NAME], self.payload)
        self.assertNotIn(self.temp_name, ftp.files)
        self.assertEqual(ftp.files["unrelated.txt"], b"untouched")

    def test_resume_partial_sha_specific_archive(self):
        partial = self.payload[:320000]
        ftp = FakeFTPS({self.temp_name: partial})
        upload.transfer_once(ftp, self.archive, self.digest)
        self.assertEqual(ftp.rest_offsets, [len(partial)])
        self.assertEqual(ftp.files[upload.FINAL_NAME], self.payload)

    def test_unsupported_resume_restarts_cleanly(self):
        ftp = FakeFTPS({self.temp_name: self.payload[:123456]}, reject_rest=True)
        upload.transfer_once(ftp, self.archive, self.digest)
        self.assertEqual(ftp.rest_offsets, [123456, None])
        self.assertEqual(ftp.files[upload.FINAL_NAME], self.payload)

    def test_oversize_temporary_archive_is_replaced(self):
        ftp = FakeFTPS({self.temp_name: self.payload + b"invalid"})
        upload.transfer_once(ftp, self.archive, self.digest)
        self.assertEqual(ftp.rest_offsets, [None])
        self.assertEqual(ftp.files[upload.FINAL_NAME], self.payload)

    def test_retry_reconnects_and_resumes_after_interruption(self):
        shared = {}
        clients = []
        def connector(*args):
            client = FakeFTPS(shared, fail_after_first_block=not clients)
            clients.append(client)
            return client
        upload.upload_with_retry("ftp.example.org", 21, "/domains/aquathanhxuan.io.vn/public_html/",
                                 self.archive, self.digest, connector=connector, sleep=lambda _: None)
        self.assertEqual(len(clients), 2)
        self.assertEqual(clients[1].rest_offsets, [upload.BLOCK_SIZE])
        self.assertTrue(all(c.closed for c in clients))
        self.assertEqual(shared[upload.FINAL_NAME], self.payload)

    def test_incomplete_size_never_activates_old_final(self):
        class TruncatingFTP(FakeFTPS):
            def storbinary(self, command, inp, blocksize=8192, callback=None, rest=None):
                self.files[command[5:]] = self.payload[:100] if hasattr(self, "payload") else b"x"
        ftp = TruncatingFTP({upload.FINAL_NAME: b"old"})
        with self.assertRaises(upload.UploadError):
            upload.transfer_once(ftp, self.archive, self.digest)
        self.assertEqual(ftp.files[upload.FINAL_NAME], b"old")

    def test_auth_errors_fail_fast(self):
        def bad_connector(*_args):
            raise ftplib.error_perm("530 Not logged in")
        with patch.object(upload, "MAX_ATTEMPTS", 4):
            with self.assertRaises(ftplib.error_perm):
                upload.upload_with_retry("ftp.example.org", 21, "/", self.archive,
                                         self.digest, connector=bad_connector,
                                         sleep=lambda _: self.fail("Unexpected sleep"))


if __name__ == "__main__":
    unittest.main()
