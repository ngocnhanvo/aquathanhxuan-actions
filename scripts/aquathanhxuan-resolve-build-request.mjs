import fs from "node:fs";

function fail(message) {
  console.error(`::error::${message}`);
  process.exit(1);
}

// Select the request changed by THIS GitHub push event, not the last
// lexicographically sorted file or whichever historical request is newest.
const eventPath = process.env.GITHUB_EVENT_PATH;
if (!eventPath || !fs.existsSync(eventPath)) fail("Missing authenticated GitHub push event");
let event;
try { event = JSON.parse(fs.readFileSync(eventPath,"utf8")); }
catch { fail("Invalid GitHub push event"); }
if (event.ref !== "refs/heads/main" || !Array.isArray(event.commits)) {
  fail("Unexpected GitHub event or branch");
}
const changed = [...new Set(event.commits.flatMap(commit =>
  [...(commit.added || []), ...(commit.modified || [])]
))].filter(path => /^build-requests\/[a-zA-Z0-9._-]+\.json$/.test(path));
if (changed.length !== 1) fail("Expected exactly one changed production build request in push");
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
