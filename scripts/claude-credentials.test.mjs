import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import claudeCredentials from '../dist/main/claudeCredentials.js';

const {
  claudeCredentialFileCandidates,
  readClaudeCredentials,
  writeClaudeCredentialsAtomic,
} = claudeCredentials;

const originalClaudeConfigDir = process.env.CLAUDE_CONFIG_DIR;
const originalClaudeHomeForTest = process.env.WMT_CLAUDE_HOME_FOR_TEST;
const originalDisableKeychain = process.env.WMT_DISABLE_CLAUDE_KEYCHAIN;
const originalDisableProcessCredentials = process.env.WMT_DISABLE_CLAUDE_PROCESS_CREDENTIALS;
const originalKeychainServices = process.env.WMT_CLAUDE_KEYCHAIN_SERVICES;
const originalSecurityBin = process.env.WMT_SECURITY_BIN_FOR_TEST;
const originalPgrepBin = process.env.WMT_PGREP_BIN_FOR_TEST;
const originalPsBin = process.env.WMT_PS_BIN_FOR_TEST;
const originalFakeSecurityLog = process.env.WMT_FAKE_SECURITY_LOG;
const tempDirs = [];

function tempDir(prefix) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

function restoreEnv() {
  if (originalClaudeConfigDir === undefined) delete process.env.CLAUDE_CONFIG_DIR;
  else process.env.CLAUDE_CONFIG_DIR = originalClaudeConfigDir;
  if (originalClaudeHomeForTest === undefined) delete process.env.WMT_CLAUDE_HOME_FOR_TEST;
  else process.env.WMT_CLAUDE_HOME_FOR_TEST = originalClaudeHomeForTest;
  if (originalDisableKeychain === undefined) delete process.env.WMT_DISABLE_CLAUDE_KEYCHAIN;
  else process.env.WMT_DISABLE_CLAUDE_KEYCHAIN = originalDisableKeychain;
  if (originalDisableProcessCredentials === undefined) delete process.env.WMT_DISABLE_CLAUDE_PROCESS_CREDENTIALS;
  else process.env.WMT_DISABLE_CLAUDE_PROCESS_CREDENTIALS = originalDisableProcessCredentials;
  if (originalKeychainServices === undefined) delete process.env.WMT_CLAUDE_KEYCHAIN_SERVICES;
  else process.env.WMT_CLAUDE_KEYCHAIN_SERVICES = originalKeychainServices;
  if (originalSecurityBin === undefined) delete process.env.WMT_SECURITY_BIN_FOR_TEST;
  else process.env.WMT_SECURITY_BIN_FOR_TEST = originalSecurityBin;
  if (originalPgrepBin === undefined) delete process.env.WMT_PGREP_BIN_FOR_TEST;
  else process.env.WMT_PGREP_BIN_FOR_TEST = originalPgrepBin;
  if (originalPsBin === undefined) delete process.env.WMT_PS_BIN_FOR_TEST;
  else process.env.WMT_PS_BIN_FOR_TEST = originalPsBin;
  if (originalFakeSecurityLog === undefined) delete process.env.WMT_FAKE_SECURITY_LOG;
  else process.env.WMT_FAKE_SECURITY_LOG = originalFakeSecurityLog;
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function makeFakeSecurity() {
  const dir = tempDir('wmt-fake-security-');
  const script = path.join(dir, 'security');
  const logPath = path.join(dir, 'security.log');
  fs.writeFileSync(script, `#!/bin/sh
if [ "$1" = "find-generic-password" ]; then
  service=""
  wants_password="0"
  while [ "$#" -gt 0 ]; do
    case "$1" in
      -s)
        shift
        service="$1"
        ;;
      -w)
        wants_password="1"
        ;;
    esac
    shift
  done
  if [ "$service" != "Fake Claude" ]; then
    exit 44
  fi
  if [ "$wants_password" = "1" ]; then
    printf '%s\\n' '{"claudeAiOauth":{"accessToken":"keychain-access","refreshToken":"keychain-refresh","expiresAt":1893456000000,"rateLimitTier":"max_5x","subscriptionType":"max"}}'
  else
    printf '%s\\n' '    "acct"<blob>="fake-account"'
  fi
  exit 0
fi

if [ "$1" = "add-generic-password" ]; then
  stdin="$(cat)"
  {
    printf 'args=%s\\n' "$*"
    printf 'stdin=%s\\n' "$stdin"
  } > "$WMT_FAKE_SECURITY_LOG"
  exit 0
fi

exit 45
`);
  fs.chmodSync(script, 0o700);
  return { script, logPath };
}

function makeFakeProcessTools() {
  const dir = tempDir('wmt-fake-process-');
  const pgrep = path.join(dir, 'pgrep');
  const ps = path.join(dir, 'ps');
  fs.writeFileSync(pgrep, `#!/bin/sh
printf '%s\\n' '4242'
`);
  fs.writeFileSync(ps, `#!/bin/sh
printf '%s\\n' ' 4242 ?? S 0:00.00 /Applications/Claude.app/Contents/Helpers/disclaimer /Users/me/Library/Application Support/Claude/claude-code/2.1.170/claude.app/Contents/MacOS/claude CLAUDE_CODE_OAUTH_TOKEN=process-access CLAUDE_CODE_RATE_LIMIT_TIER=max_5x CLAUDE_CODE_SUBSCRIPTION_TYPE=max'
`);
  fs.chmodSync(pgrep, 0o700);
  fs.chmodSync(ps, 0o700);
  return { pgrep, ps };
}

test.afterEach(() => {
  restoreEnv();
});

test('Claude credential file candidates prefer CLAUDE_CONFIG_DIR and include macOS locations', () => {
  const homeDir = path.join(os.tmpdir(), 'wmt-home');
  const configDir = path.join(os.tmpdir(), 'wmt-claude-config');
  const candidates = claudeCredentialFileCandidates({
    env: { ...process.env, CLAUDE_CONFIG_DIR: configDir },
    homeDir,
  });

  assert.equal(candidates[0], path.join(configDir, '.credentials.json'));
  assert.ok(candidates.includes(path.join(homeDir, '.claude', '.credentials.json')));
  assert.ok(candidates.includes(path.join(homeDir, 'Library', 'Application Support', 'Claude', 'credentials.json')));
  assert.ok(candidates.includes(path.join(homeDir, '.claude.json')));
  assert.equal(new Set(candidates).size, candidates.length);
});

test('Claude credentials fall back to the macOS Claude Code keychain item', {
  skip: process.platform !== 'darwin',
}, () => {
  const homeDir = tempDir('wmt-empty-home-');
  const { script } = makeFakeSecurity();
  process.env.WMT_CLAUDE_HOME_FOR_TEST = homeDir;
  process.env.CLAUDE_CONFIG_DIR = path.join(homeDir, 'missing-config');
  process.env.WMT_CLAUDE_KEYCHAIN_SERVICES = 'Fake Claude';
  process.env.WMT_SECURITY_BIN_FOR_TEST = script;
  process.env.WMT_DISABLE_CLAUDE_PROCESS_CREDENTIALS = '1';
  delete process.env.WMT_DISABLE_CLAUDE_KEYCHAIN;

  const resolved = readClaudeCredentials();

  assert.equal(resolved?.source.kind, 'keychain');
  assert.equal(resolved?.source.kind === 'keychain' ? resolved.source.service : '', 'Fake Claude');
  assert.equal(resolved?.source.kind === 'keychain' ? resolved.source.account : '', 'fake-account');
  assert.equal(resolved?.credentials.claudeAiOauth?.accessToken, 'keychain-access');
  assert.equal(resolved?.credentials.claudeAiOauth?.rateLimitTier, 'max_5x');
});

test('Claude credentials can come from an active Desktop-launched Claude Code process', () => {
  const homeDir = tempDir('wmt-empty-home-');
  const { pgrep, ps } = makeFakeProcessTools();
  process.env.WMT_CLAUDE_HOME_FOR_TEST = homeDir;
  process.env.CLAUDE_CONFIG_DIR = path.join(homeDir, 'missing-config');
  process.env.WMT_PGREP_BIN_FOR_TEST = pgrep;
  process.env.WMT_PS_BIN_FOR_TEST = ps;
  process.env.WMT_DISABLE_CLAUDE_KEYCHAIN = '1';

  const resolved = readClaudeCredentials();

  assert.equal(resolved?.source.kind, 'process');
  assert.equal(resolved?.source.kind === 'process' ? resolved.source.pid : 0, 4242);
  assert.equal(resolved?.credentials.claudeAiOauth?.accessToken, 'process-access');
  assert.equal(resolved?.credentials.claudeAiOauth?.rateLimitTier, 'max_5x');
  assert.equal(resolved?.credentials.claudeAiOauth?.subscriptionType, 'max');
});

test('Claude keychain writes pass refreshed credentials through stdin', {
  skip: process.platform !== 'darwin',
}, () => {
  const { script, logPath } = makeFakeSecurity();
  process.env.WMT_SECURITY_BIN_FOR_TEST = script;
  process.env.WMT_FAKE_SECURITY_LOG = logPath;

  writeClaudeCredentialsAtomic({
    claudeAiOauth: {
      accessToken: 'updated-access',
      refreshToken: 'updated-refresh',
      expiresAt: 1893456000000,
    },
  }, { kind: 'keychain', service: 'Fake Claude', account: 'fake-account' });

  const log = fs.readFileSync(logPath, 'utf8');
  assert.match(log, /^args=add-generic-password -U -s Fake Claude -a fake-account -w$/m);
  assert.match(log, /^stdin=.*"accessToken":"updated-access"/m);
  assert.doesNotMatch(log.match(/^args=.*$/m)?.[0] ?? '', /updated-access|updated-refresh/);
});
