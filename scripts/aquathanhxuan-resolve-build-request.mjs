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

const values = {};
for (const raw of String(process.env.ENV_FILE || "").split(/\r?\n/)) {
  const match = raw.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
  if (!match) continue;
  let value = match[2].trim();
  if (
    value.length >= 2
    && ((value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'")))
  ) {
    value = value.slice(1, -1);
  }
  values[match[1]] = value;
}

function origin(key) {
  let url;
  try {
    url = new URL(values[key] || "");
  } catch {
    fail(`Invalid HTTPS origin: ${key}`);
  }
  if (
    url.protocol !== "https:"
    || !url.hostname
    || url.username
    || url.password
    || (url.port && url.port !== "443")
    || !["", "/"].includes(url.pathname)
    || url.search
    || url.hash
  ) {
    fail(`Invalid HTTPS origin: ${key}`);
  }
  return [`https://${url.hostname}`, url.hostname];
}

const [wpUrl, wpHost] = origin("WC_URL");
const [frontendUrl, frontendHost] = origin("WC_URL_CLIENT");
if (wpHost !== "admin-aquathanhxuan.io.vn" || frontendHost !== "aquathanhxuan.io.vn") {
  fail("ENV_FILE does not point to Aqua production");
}

process.stdout.write([
  `request_file=${requestFile}`,
  `source_sha=${sourceSha}`,
  `wp_url=${wpUrl}`,
  `frontend_url=${frontendUrl}`,
  "",
].join("\n"));
