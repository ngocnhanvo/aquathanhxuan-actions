import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

function fail(message) {
  console.error(`::error::${message}`);
  process.exit(1);
}

// Select the request changed in this exact push; the event's commits[]
// can omit file lists, so read the authoritative before..after Git diff.
const eventPath = process.env.GITHUB_EVENT_PATH;
if (!eventPath || !fs.existsSync(eventPath)) fail('Missing authenticated GitHub push event');
let event;
try { event = JSON.parse(fs.readFileSync(eventPath, 'utf8')); }
catch { fail('Invalid GitHub push event'); }
if (event.ref !== 'refs/heads/main') fail('Unexpected GitHub event or branch');
const before = String(event.before || '');
const after = String(event.after || '');
if (!/^[0-9a-f]{40}$/.test(before) || !/^[0-9a-f]{40}$/.test(after)) {
  fail('Missing push before/after SHAs');
}
let checkoutSha, delta;
// Playwright container may have a different UID than actions/checkout.
// Trust only this exact checkout directory, never all Git repositories.
const gitOptions = ['-c', `safe.directory=${process.cwd()}`];
try {
  checkoutSha = execFileSync('git', [...gitOptions, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  if (checkoutSha !== after || (process.env.GITHUB_SHA && process.env.GITHUB_SHA !== after)) {
    fail('Checked-out Actions SHA differs from authenticated push');
  }
  delta = execFileSync('git', [
    ...gitOptions, 'diff', '--no-ext-diff', '--no-renames', '--name-status', before, after,
    '--', 'build-requests/'
  ], { encoding: 'utf8' });
} catch {
  fail('Cannot inspect pushed request delta; refusing ambiguous production build');
}
const changes = delta.trim().split('\n').filter(Boolean)
  .map(line => line.split('\t'))
  .filter(([, path]) => /^build-requests\/[a-zA-Z0-9._-]+\.json$/.test(path || ''));
if (changes.length !== 1 || !/^[AM]$/.test(changes[0][0])) {
  fail('Expected exactly one added or modified production build request in push');
}
const requestFile = changes[0][1];
if (!fs.existsSync(requestFile)) fail(`Aqua build request does not exist: ${requestFile}`);
let request;
try { request = JSON.parse(fs.readFileSync(requestFile, 'utf8')); }
catch { fail('Aqua build request is invalid JSON'); }
const sourceSha = String(request.source_sha || '');
if (!/^[0-9a-f]{40}$/.test(sourceSha)) fail('Invalid source_sha');
if (request.environment !== 'production') fail('Only production request is accepted');
if (request.frontend_host !== 'aquathanhxuan.io.vn') fail('Unexpected frontend host in request');
process.stdout.write([
  `request_file=${requestFile}`,
  `source_sha=${sourceSha}`,
  'wp_url=https://admin.aquathanhxuan.io.vn',
  'frontend_url=https://aquathanhxuan.io.vn',
  ''
].join('\n'));
