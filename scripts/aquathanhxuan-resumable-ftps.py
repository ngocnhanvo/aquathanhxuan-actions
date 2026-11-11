#!/usr/bin/env python3
"""Resumable Astro ZIP upload over verified explicit FTPS; signed PHP activates it.

Only replaces lftp as the transport client. Keep the existing SHA-addressed
temporary archive, exact docroot, signed server-side hash check and rollback.
"""
from __future__ import annotations

import ftplib
import hashlib
import os
from pathlib import Path
import re
import ssl
import sys
import time
from urllib.parse import urlsplit

BLOCK_SIZE = 256 * 1024
MAX_ATTEMPTS = 4
SOCKET_TIMEOUT = 25
FINAL_NAME = "aquathanhxuan-astro.zip"


class UploadError(RuntimeError):
    """A transfer integrity or remote-state error that can be retried."""


def validated_settings(env: dict[str, str]) -> tuple[str, int, str, str, Path]:
    required = ("FTP_SERVER", "FTP_USERNAME", "FTP_PASSWORD",
                "ZIP_PATH", "ASTRO_FTP_TARGET", "AQUATHANHXUAN_CLIENT_HOST")
    if any(not env.get(key) for key in required):
        raise ValueError("Missing required FTP/archive/verified-target configuration")
    raw = env["FTP_SERVER"].strip()
    parsed = urlsplit(raw if "://" in raw else "ftp://" + raw)
    if (parsed.scheme not in ("ftp", "ftps") or not parsed.hostname
            or parsed.username or parsed.password or parsed.path not in ("", "/")
            or parsed.query or parsed.fragment or parsed.port not in (None, 21)):
        raise ValueError("FTP_SERVER must be a bare FTP hostname, optionally on port 21")
    client_host = env["AQUATHANHXUAN_CLIENT_HOST"].strip()
    if not re.fullmatch(r"[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?", client_host):
        raise ValueError("Invalid verified frontend hostname")
    target = env["ASTRO_FTP_TARGET"]
    if target != f"/domains/{client_host}/public_html/":
        raise ValueError("FTP target does not match the verified frontend hostname")
    archive = Path(env["ZIP_PATH"])
    if not archive.is_file() or archive.stat().st_size <= 0:
        raise ValueError("Compiled Astro ZIP is missing or empty")
    return parsed.hostname, parsed.port or 21, target, client_host, archive


def remote_size(ftp: ftplib.FTP_TLS, name: str) -> int | None:
    ftp.voidcmd("TYPE I")
    try:
        return ftp.size(name)
    except ftplib.error_perm as exc:
        if str(exc).startswith("550"):
            return None
        raise


def connect_ftps(host: str, port: int, target: str) -> ftplib.FTP_TLS:
    ftp = ftplib.FTP_TLS(context=ssl.create_default_context(), timeout=SOCKET_TIMEOUT)
    try:
        ftp.connect(host, port)
        ftp.auth()
        ftp.login(os.environ["FTP_USERNAME"], os.environ["FTP_PASSWORD"])
        ftp.prot_p()
        ftp.set_pasv(True)
        ftp.cwd(target)
        if ftp.pwd().rstrip("/") != target.rstrip("/"):
            raise ValueError("Server FTP directory differs from verified docroot")
        return ftp
    except BaseException:
        ftp.close()
        raise


def transfer_once(ftp: ftplib.FTP_TLS, archive: Path, digest: str) -> None:
    """Resume only SHA-addressed temp; signed PHP verifies the final ZIP digest."""
    total = archive.stat().st_size
    temp = f".aquathanhxuan-astro.{digest}.zip.uploading"
    offset = remote_size(ftp, temp)
    if offset is None:
        offset = 0
    elif offset > total:
        print("AQUA_FTPS_REMOTE_OVERSIZE: removing invalid temporary archive", flush=True)
        ftp.delete(temp)
        offset = 0

    transferred = offset
    report_after = (offset // (16 * 1024 * 1024) + 1) * (16 * 1024 * 1024)

    def on_block(block: bytes) -> None:
        nonlocal transferred, report_after
        transferred += len(block)
        if transferred >= report_after:
            print(f"AQUA_FTPS_PROGRESS bytes={transferred}/{total}", flush=True)
            report_after += 16 * 1024 * 1024

    if offset < total:
        print(f"AQUA_FTPS_TRANSFER offset={offset} total={total}", flush=True)
        with archive.open("rb") as inp:
            inp.seek(offset)
            if offset:
                try:
                    ftp.storbinary("STOR " + temp, inp, BLOCK_SIZE, on_block, rest=offset)
                except ftplib.error_perm as exc:
                    # Some FTP servers reject REST+STOR. Only those explicit
                    # command errors allow a fresh STOR after removing our own
                    # SHA-specific temporary file; network errors retry later.
                    if not str(exc).startswith(("500", "501", "502", "504", "550")):
                        raise
                    print("AQUA_FTPS_RESUME_UNSUPPORTED: restart this SHA archive", flush=True)
                    ftp.delete(temp)
                    with archive.open("rb") as fresh:
                        ftp.storbinary("STOR " + temp, fresh, BLOCK_SIZE, on_block)
            else:
                ftp.storbinary("STOR " + temp, inp, BLOCK_SIZE, on_block)

    if remote_size(ftp, temp) != total:
        raise UploadError("Remote temporary ZIP size differs from local ZIP")

    # The legacy endpoint reads this fixed filename. Its signed unpack operation
    # verifies SHA-256 before staging and switches live content with rollback.
    if remote_size(ftp, FINAL_NAME) is not None:
        ftp.delete(FINAL_NAME)
    ftp.rename(temp, FINAL_NAME)
    if remote_size(ftp, FINAL_NAME) != total:
        raise UploadError("Activated upload filename has an unexpected size")
    print("AQUA_FTPS_UPLOAD_READY size_verified=PASS signed_php_sha256=NEXT", flush=True)


def upload_with_retry(
    host: str, port: int, target: str, archive: Path, digest: str,
    connector=connect_ftps, sleep=time.sleep,
) -> None:
    for attempt in range(1, MAX_ATTEMPTS + 1):
        ftp = None
        try:
            print(f"AQUA_FTPS_ATTEMPT={attempt}/{MAX_ATTEMPTS}", flush=True)
            ftp = connector(host, port, target)
            transfer_once(ftp, archive, digest)
            return
        except (OSError, EOFError, ftplib.Error, UploadError) as exc:
            # Do not hide permanent authentication failures behind retries.
            if isinstance(exc, ftplib.error_perm) and str(exc).startswith(("530", "534")):
                raise
            print(f"AQUA_FTPS_RETRYABLE_ERROR attempt={attempt} class={type(exc).__name__}", flush=True)
            if attempt == MAX_ATTEMPTS:
                raise
            sleep(min(attempt * 3, 9))
        finally:
            if ftp is not None:
                try:
                    ftp.close()
                except Exception:
                    pass


def main() -> int:
    started = time.monotonic()
    try:
        host, port, target, _client_host, archive = validated_settings(os.environ)
        digest = hashlib.sha256()
        with archive.open("rb") as file:
            for chunk in iter(lambda: file.read(1024 * 1024), b""):
                digest.update(chunk)
        archive_sha = digest.hexdigest()
        print(f"AQUA_FTPS_UPLOAD_START bytes={archive.stat().st_size} sha256={archive_sha}", flush=True)
        upload_with_retry(host, port, target, archive, archive_sha)
        seconds = round(time.monotonic() - started, 1)
        print(f"AQUA_FTPS_UPLOAD_SUCCESS seconds={seconds}", flush=True)
        if os.environ.get("GITHUB_STEP_SUMMARY"):
            with open(os.environ["GITHUB_STEP_SUMMARY"], "a", encoding="utf-8") as out:
                out.write(f"- Python FTPS upload: {archive.stat().st_size} bytes, {seconds}s, SHA prefix {archive_sha[:12]}; signed PHP verification follows.\n")
        return 0
    except Exception as exc:
        print(f"::error::AQUA_FTPS_UPLOAD_FAILED class={type(exc).__name__}", file=sys.stderr, flush=True)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
