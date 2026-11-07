import fs from "node:fs";

function fail(message) {
  console.error(`::error::${message}`);
  process.exit(1);
}

const requestNames = fs.readdirSync("build-requests", { withFileTypes: true })
  .filter((entry) => entry.isFile() && /^[^/]+\.json$/.test(entry.name))
  .map((entry) => entry.name)
  .sort();

if (requestNames.length === 0) {
  fail("No Aqua build request exists in checkout");
}

const requestFile = `build-requests/${requestNames.at(-1)}`;
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
