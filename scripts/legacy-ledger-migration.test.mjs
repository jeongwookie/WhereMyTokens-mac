import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import legacyBackupModule from '../dist/main/usageIndex/legacyLedgerBackup.js';

const {
  LEGACY_USAGE_LEDGER_BACKUP_FILENAME,
  LEGACY_USAGE_LEDGER_FILENAME,
  preserveLegacyUsageLedger,
} = legacyBackupModule;

function fixture(t, prefix) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  return {
    directory,
    sourcePath: path.join(directory, LEGACY_USAGE_LEDGER_FILENAME),
    backupPath: path.join(directory, LEGACY_USAGE_LEDGER_BACKUP_FILENAME),
  };
}

test('missing legacy ledger is a no-op', async t => {
  const paths = fixture(t, 'wmt-legacy-ledger-missing-');
  assert.deepEqual(await preserveLegacyUsageLedger(paths.directory), { status: 'no-source' });
  assert.equal(fs.existsSync(paths.backupPath), false);
});

test('first run preserves the source byte-for-byte without changing the original', async t => {
  const paths = fixture(t, 'wmt-legacy-ledger-preserve-');
  const original = Buffer.from('{"version":1,"entries":[1,2,3]}\n', 'utf8');
  fs.writeFileSync(paths.sourcePath, original);

  const result = await preserveLegacyUsageLedger(paths.directory);
  assert.deepEqual(result, { status: 'preserved' });
  assert.deepEqual(fs.readFileSync(paths.sourcePath), original);
  assert.deepEqual(fs.readFileSync(paths.backupPath), original);
  assert.equal(fs.statSync(paths.backupPath).mode & 0o077, 0);
  assert.deepEqual(
    fs.readdirSync(paths.directory).sort(),
    [LEGACY_USAGE_LEDGER_BACKUP_FILENAME, LEGACY_USAGE_LEDGER_FILENAME].sort(),
  );
});

test('an existing backup is never overwritten when the source later changes', async t => {
  const paths = fixture(t, 'wmt-legacy-ledger-once-');
  const first = Buffer.from('{"generation":1}', 'utf8');
  const second = Buffer.from('{"generation":2,"more":"data"}', 'utf8');
  fs.writeFileSync(paths.sourcePath, first);
  assert.equal((await preserveLegacyUsageLedger(paths.directory)).status, 'preserved');

  fs.writeFileSync(paths.sourcePath, second);
  assert.deepEqual(await preserveLegacyUsageLedger(paths.directory), { status: 'already-preserved' });
  assert.deepEqual(fs.readFileSync(paths.sourcePath), second);
  assert.deepEqual(fs.readFileSync(paths.backupPath), first);
});

test('malformed JSON and non-UTF8 bytes are preserved without parsing', async t => {
  const paths = fixture(t, 'wmt-legacy-ledger-malformed-');
  const malformed = Buffer.from([0x7b, 0x22, 0x78, 0x22, 0x3a, 0xff, 0x00, 0x7d]);
  fs.writeFileSync(paths.sourcePath, malformed);

  assert.deepEqual(await preserveLegacyUsageLedger(paths.directory), { status: 'preserved' });
  assert.deepEqual(fs.readFileSync(paths.backupPath), malformed);
});

test('a pre-existing fixed backup remains untouched', async t => {
  const paths = fixture(t, 'wmt-legacy-ledger-existing-');
  const source = Buffer.from('new-source', 'utf8');
  const existing = Buffer.from('original-backup', 'utf8');
  fs.writeFileSync(paths.sourcePath, source);
  fs.writeFileSync(paths.backupPath, existing);

  assert.deepEqual(await preserveLegacyUsageLedger(paths.directory), { status: 'already-preserved' });
  assert.deepEqual(fs.readFileSync(paths.sourcePath), source);
  assert.deepEqual(fs.readFileSync(paths.backupPath), existing);
});

test('parallel startup attempts publish exactly one complete backup', async t => {
  const paths = fixture(t, 'wmt-legacy-ledger-race-');
  const original = Buffer.alloc(2 * 1024 * 1024, 0x5a);
  fs.writeFileSync(paths.sourcePath, original);

  const results = await Promise.all(
    Array.from({ length: 12 }, () => preserveLegacyUsageLedger(paths.directory)),
  );
  assert.equal(results.filter(result => result.status === 'preserved').length, 1);
  assert.equal(results.filter(result => result.status === 'already-preserved').length, 11);
  assert.deepEqual(fs.readFileSync(paths.backupPath), original);
  assert.deepEqual(
    fs.readdirSync(paths.directory).sort(),
    [LEGACY_USAGE_LEDGER_BACKUP_FILENAME, LEGACY_USAGE_LEDGER_FILENAME].sort(),
  );
});

test('source symlinks are rejected without reading or publishing their target', async t => {
  const paths = fixture(t, 'wmt-legacy-ledger-source-link-');
  const outsidePath = path.join(paths.directory, 'outside.json');
  const outside = Buffer.from('private-outside-content', 'utf8');
  fs.writeFileSync(outsidePath, outside);
  fs.symlinkSync(outsidePath, paths.sourcePath);

  assert.deepEqual(await preserveLegacyUsageLedger(paths.directory), {
    status: 'failed',
    reason: 'source-not-regular',
  });
  assert.equal(fs.existsSync(paths.backupPath), false);
  assert.deepEqual(fs.readFileSync(outsidePath), outside);
});

test('backup symlinks are rejected and never overwrite their target', async t => {
  const paths = fixture(t, 'wmt-legacy-ledger-backup-link-');
  const outsidePath = path.join(paths.directory, 'outside-backup.json');
  const outside = Buffer.from('must-not-change', 'utf8');
  fs.writeFileSync(paths.sourcePath, Buffer.from('legacy-source', 'utf8'));
  fs.writeFileSync(outsidePath, outside);
  fs.symlinkSync(outsidePath, paths.backupPath);

  assert.deepEqual(await preserveLegacyUsageLedger(paths.directory), {
    status: 'failed',
    reason: 'backup-not-regular',
  });
  assert.deepEqual(fs.readFileSync(outsidePath), outside);
});

test('non-regular sources return a safe failure result instead of throwing', async t => {
  const paths = fixture(t, 'wmt-legacy-ledger-failure-');
  fs.mkdirSync(paths.sourcePath);

  const result = await preserveLegacyUsageLedger(paths.directory);
  assert.deepEqual(result, { status: 'failed', reason: 'source-not-regular' });
  assert.doesNotMatch(JSON.stringify(result), new RegExp(paths.directory.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.equal(fs.existsSync(paths.backupPath), false);
});

test('startup preserves the legacy ledger before opening UsageIndex', () => {
  const mainSource = fs.readFileSync('src/main/index.ts', 'utf8');
  const preserveAt = mainSource.indexOf('await preserveLegacyUsageLedger(userDataPath)');
  const openAt = mainSource.indexOf("await openUsageIndex(path.join(userDataPath, 'usage-index.sqlite'))");

  assert.ok(preserveAt >= 0, 'legacy ledger preservation is not wired into startup');
  assert.ok(openAt > preserveAt, 'UsageIndex must open only after the legacy ledger is preserved');
  assert.match(mainSource, /legacy-ledger-backup-failed.*reason/s);
});
