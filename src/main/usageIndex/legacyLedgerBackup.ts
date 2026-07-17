import { randomUUID } from 'crypto';
import {
  constants as fsConstants,
  type BigIntStats,
  type promises as FsPromises,
} from 'fs';
import { link, lstat, open, unlink } from 'fs/promises';
import * as path from 'path';

export const LEGACY_USAGE_LEDGER_FILENAME = 'usage-ledger.json';
export const LEGACY_USAGE_LEDGER_BACKUP_FILENAME = 'usage-ledger.legacy-v1.json';

export type LegacyLedgerBackupFailure =
  | 'unsafe-directory'
  | 'source-not-regular'
  | 'backup-not-regular'
  | 'source-changed'
  | 'io-error';

export type LegacyLedgerBackupResult =
  | { status: 'no-source' }
  | { status: 'preserved' }
  | { status: 'already-preserved' }
  | { status: 'failed'; reason: LegacyLedgerBackupFailure };

type FileHandle = FsPromises.FileHandle;

function errorCode(error: unknown): string | undefined {
  if (!error || typeof error !== 'object' || !('code' in error)) return undefined;
  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' ? code : undefined;
}

async function lstatOrNull(filePath: string): Promise<BigIntStats | null> {
  try {
    return await lstat(filePath, { bigint: true });
  } catch (error) {
    if (errorCode(error) === 'ENOENT') return null;
    throw error;
  }
}

function sameIdentity(first: BigIntStats, second: BigIntStats): boolean {
  return first.dev === second.dev && first.ino === second.ino;
}

function sameSnapshot(first: BigIntStats, second: BigIntStats): boolean {
  return sameIdentity(first, second)
    && first.size === second.size
    && first.mtimeNs === second.mtimeNs
    && first.ctimeNs === second.ctimeNs;
}

async function copyOpenFile(source: FileHandle, target: FileHandle): Promise<void> {
  const buffer = Buffer.allocUnsafe(64 * 1024);
  let position = 0;
  while (true) {
    const { bytesRead } = await source.read(buffer, 0, buffer.length, position);
    if (bytesRead === 0) return;
    let bytesWritten = 0;
    while (bytesWritten < bytesRead) {
      const result = await target.write(
        buffer,
        bytesWritten,
        bytesRead - bytesWritten,
        position + bytesWritten,
      );
      if (result.bytesWritten === 0) throw new Error('Legacy ledger backup write made no progress');
      bytesWritten += result.bytesWritten;
    }
    position += bytesRead;
  }
}

async function classifyExistingBackup(backupPath: string): Promise<LegacyLedgerBackupResult> {
  try {
    const target = await lstatOrNull(backupPath);
    if (!target) return { status: 'failed', reason: 'io-error' };
    return target.isFile()
      ? { status: 'already-preserved' }
      : { status: 'failed', reason: 'backup-not-regular' };
  } catch {
    return { status: 'failed', reason: 'io-error' };
  }
}

/**
 * Preserves the pre-UsageIndex ledger exactly once without parsing or deleting it.
 *
 * The result intentionally contains no file path, source bytes, or raw error text,
 * so callers may report the status without exposing user data. All failures are
 * returned rather than thrown to keep application startup non-blocking.
 */
export async function preserveLegacyUsageLedger(
  userDataDirectory: string,
): Promise<LegacyLedgerBackupResult> {
  const sourcePath = path.join(userDataDirectory, LEGACY_USAGE_LEDGER_FILENAME);
  const backupPath = path.join(userDataDirectory, LEGACY_USAGE_LEDGER_BACKUP_FILENAME);
  const temporaryPath = `${backupPath}.tmp-${process.pid}-${randomUUID()}`;
  let sourceHandle: FileHandle | null = null;
  let temporaryHandle: FileHandle | null = null;
  let temporaryCreated = false;

  try {
    const directory = await lstatOrNull(userDataDirectory);
    if (!directory) return { status: 'no-source' };
    if (!directory.isDirectory() || directory.isSymbolicLink()) {
      return { status: 'failed', reason: 'unsafe-directory' };
    }

    const sourceAtDiscovery = await lstatOrNull(sourcePath);
    if (!sourceAtDiscovery) return { status: 'no-source' };
    if (!sourceAtDiscovery.isFile() || sourceAtDiscovery.isSymbolicLink()) {
      return { status: 'failed', reason: 'source-not-regular' };
    }

    const existingBackup = await lstatOrNull(backupPath);
    if (existingBackup) {
      return existingBackup.isFile() && !existingBackup.isSymbolicLink()
        ? { status: 'already-preserved' }
        : { status: 'failed', reason: 'backup-not-regular' };
    }

    const noFollow = fsConstants.O_NOFOLLOW ?? 0;
    sourceHandle = await open(sourcePath, fsConstants.O_RDONLY | noFollow);
    const sourceAtOpen = await sourceHandle.stat({ bigint: true });
    if (!sourceAtOpen.isFile() || !sameSnapshot(sourceAtDiscovery, sourceAtOpen)) {
      return { status: 'failed', reason: 'source-changed' };
    }

    temporaryHandle = await open(
      temporaryPath,
      fsConstants.O_WRONLY | fsConstants.O_CREAT | fsConstants.O_EXCL | noFollow,
      0o600,
    );
    temporaryCreated = true;
    await copyOpenFile(sourceHandle, temporaryHandle);
    await temporaryHandle.sync();
    await temporaryHandle.close();
    temporaryHandle = null;

    const sourceAfterCopy = await sourceHandle.stat({ bigint: true });
    const sourcePathAfterCopy = await lstatOrNull(sourcePath);
    if (!sourcePathAfterCopy
      || sourcePathAfterCopy.isSymbolicLink()
      || !sameSnapshot(sourceAtOpen, sourceAfterCopy)
      || !sameSnapshot(sourceAtOpen, sourcePathAfterCopy)) {
      return { status: 'failed', reason: 'source-changed' };
    }

    try {
      // Hard-link publication is atomic and fails with EEXIST instead of replacing
      // a backup created by another process or an attacker during the copy.
      await link(temporaryPath, backupPath);
    } catch (error) {
      if (errorCode(error) === 'EEXIST') return classifyExistingBackup(backupPath);
      return { status: 'failed', reason: 'io-error' };
    }
    return { status: 'preserved' };
  } catch (error) {
    if (errorCode(error) === 'ELOOP') {
      return { status: 'failed', reason: 'source-not-regular' };
    }
    return { status: 'failed', reason: 'io-error' };
  } finally {
    try { await temporaryHandle?.close(); } catch { /* best-effort cleanup */ }
    try { await sourceHandle?.close(); } catch { /* best-effort cleanup */ }
    if (temporaryCreated) {
      try { await unlink(temporaryPath); } catch { /* best-effort cleanup */ }
    }
  }
}
