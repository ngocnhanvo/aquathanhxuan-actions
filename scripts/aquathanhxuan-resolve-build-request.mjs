import fs from "node:fs";

function fail(message) {
  console.error(`::error::${message}`);
  process.exit(1);
}

// A push represents ONE newly committed request. Never infer intent from a
// lexicographic filename sort of historical requests (stale SHA hazard).
// fetch-depth: 2 in the caller guarantees HEAD^ is available.
const { execFileSync } = await import("node:child_process");
let changed;
try {
  changed = execFileSync("git", [
    "diff", "--name-only", "--diff-filter=AM", "HEAD^", "HEAD", "--", "build-requests/",
  ], { encoding: "utf8" }).trim().split(/\r?\n/).filter(Boolean);
} catch {
  fail("Cannot inspect pushed request delta; refusing ambiguous production build");
}
if (changed.length !== 1 || !/^build-requests\/[a-zA-Z0-9._-]+\.json$/.test(changed[0])) {
  fail("Expected exactly one new or modified production build request in this push");
}
const requestFile = changed[0];
if (!fs.existsSync(requestFile)) {
  fail(`Aqua build request does not exist in checkout: ${requestFile}`);
}

let request;
try {
  request = JSON.parse(fs.readFileSync(requestFile, "utf8"));
} catch {
  fail("Aqua build request is invalid JSON");
}

const sourceSha = String(request.source_sha || "");
if (!/^[0-9a-f]{40}$/.test(sourceSha)) {
  fail("Invalid source_sha");
}
if (request.environment !== "production") {
  fail("Only production request is accepted");
}
if (request.frontend_host !== "aquathanhxuan.io.vn") {
  fail("Unexpected frontend host in request");
}

const wpUrl = "https://admin.aquathanhxuan.io.vn";
const frontendUrl = "https://aquathanhxuan.io.vn";

process.stdout.write([
  `request_file=${requestFile}`,
  `source_sha=${sourceSha}`,
  `wp_url=${wpUrl}`,
  `frontend_url=${frontendUrl}`,
  "",
].join("\n"));
