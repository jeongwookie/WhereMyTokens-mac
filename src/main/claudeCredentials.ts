import { execFileSync } from 'child_process';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const CLAUDE_CODE_KEYCHAIN_SERVICE = 'Claude Code-credentials';
const DEFAULT_SECURITY_BIN = '/usr/bin/security';
const DEFAULT_PGREP_BIN = '/usr/bin/pgrep';
const DEFAULT_PS_BIN = '/bin/ps';
const KEYCHAIN_TIMEOUT_MS = 15_000;
const PROCESS_LOOKUP_TIMEOUT_MS = 3_000;

export interface ClaudeCredentialsFile {
  claudeAiOauth?: {
    accessToken?: unknown;
    refreshToken?: unknown;
    expiresAt?: unknown;
    rateLimitTier?: unknown;
    subscriptionType?: unknown;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export type ClaudeCredentialsSource =
  | { kind: 'file'; path: string }
  | { kind: 'keychain'; service: string; account: string | null }
  | { kind: 'process'; pid: number };

export interface ResolvedClaudeCredentials {
  credentials: ClaudeCredentialsFile;
  source: ClaudeCredentialsSource;
  marker: string;
  fileStat: {
    mtimeMs: number | null;
    size: number | null;
  };
}

interface CredentialPathOptions {
  env?: NodeJS.ProcessEnv;
  homeDir?: string;
}

function lookupHomeDir(explicitHomeDir?: string): string {
  return explicitHomeDir ?? process.env.WMT_CLAUDE_HOME_FOR_TEST?.trim() ?? os.homedir();
}

function uniq(paths: string[]): string[] {
  return [...new Set(paths.filter(Boolean))];
}

export function claudeCredentialFileCandidates(options: CredentialPathOptions = {}): string[] {
  const env = options.env ?? process.env;
  const homeDir = lookupHomeDir(options.homeDir);
  const configDir = env.CLAUDE_CONFIG_DIR?.trim();
  const appSupport = path.join(homeDir, 'Library', 'Application Support');
  const candidates: string[] = [];

  if (configDir) candidates.push(path.join(configDir, '.credentials.json'));
  candidates.push(
    path.join(homeDir, '.claude', '.credentials.json'),
    path.join(homeDir, '.config', 'claude', '.credentials.json'),
    path.join(appSupport, 'Claude', '.credentials.json'),
    path.join(appSupport, 'Claude', 'credentials.json'),
    path.join(appSupport, 'Claude Code', '.credentials.json'),
    path.join(appSupport, 'Claude Code', 'credentials.json'),
    path.join(appSupport, 'ClaudeCode', '.credentials.json'),
    path.join(appSupport, 'ClaudeCode', 'credentials.json'),
    path.join(appSupport, 'com.anthropic.claude', '.credentials.json'),
    path.join(appSupport, 'com.anthropic.claude', 'credentials.json'),
    path.join(homeDir, '.claude.json'),
  );

  return uniq(candidates);
}

function defaultCredentialFilePath(): string {
  const configDir = process.env.CLAUDE_CONFIG_DIR?.trim();
  return path.join(configDir || path.join(lookupHomeDir(), '.claude'), '.credentials.json');
}

export function hasClaudeAccessToken(credentials: ClaudeCredentialsFile | null): boolean {
  const accessToken = credentials?.claudeAiOauth?.accessToken;
  return typeof accessToken === 'string' && accessToken.length > 0;
}

function hasClaudeRefreshToken(credentials: ClaudeCredentialsFile | null): boolean {
  const refreshToken = credentials?.claudeAiOauth?.refreshToken;
  return typeof refreshToken === 'string' && refreshToken.length > 0;
}

function readJsonCredentials(payload: string): ClaudeCredentialsFile | null {
  try {
    const parsed = JSON.parse(payload) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    return parsed as ClaudeCredentialsFile;
  } catch {
    return null;
  }
}

function readCredentialsFromFile(filePath: string): ClaudeCredentialsFile | null {
  try {
    return readJsonCredentials(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return null;
  }
}

function keychainDisabled(): boolean {
  return process.platform !== 'darwin' || process.env.WMT_DISABLE_CLAUDE_KEYCHAIN === '1';
}

function processCredentialsDisabled(): boolean {
  return process.env.WMT_DISABLE_CLAUDE_PROCESS_CREDENTIALS === '1';
}

function keychainServices(): string[] {
  const override = process.env.WMT_CLAUDE_KEYCHAIN_SERVICES?.trim();
  if (!override) return [CLAUDE_CODE_KEYCHAIN_SERVICE];
  return uniq(override.split(',').map(service => service.trim()));
}

function security(args: string[], input?: string): string {
  const securityBin = process.env.WMT_SECURITY_BIN_FOR_TEST?.trim() || DEFAULT_SECURITY_BIN;
  return execFileSync(securityBin, args, {
    encoding: 'utf8',
    input,
    stdio: [input == null ? 'ignore' : 'pipe', 'pipe', 'ignore'],
    timeout: KEYCHAIN_TIMEOUT_MS,
  });
}

function runProcessLookup(binEnvName: string, fallbackBin: string, args: string[]): string {
  const bin = process.env[binEnvName]?.trim() || fallbackBin;
  return execFileSync(bin, args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
    timeout: PROCESS_LOOKUP_TIMEOUT_MS,
  });
}

function keychainAccount(service: string): string | null {
  try {
    const metadata = security(['find-generic-password', '-s', service]);
    return metadata.match(/"acct"<blob>="([^"]*)"/)?.[1] ?? null;
  } catch {
    return null;
  }
}

function readCredentialsFromKeychain(service: string): ResolvedClaudeCredentials | null {
  try {
    const credentials = readJsonCredentials(security(['find-generic-password', '-s', service, '-w']).trim());
    if (!credentials || !hasClaudeAccessToken(credentials)) return null;
    const source: ClaudeCredentialsSource = {
      kind: 'keychain',
      service,
      account: keychainAccount(service),
    };
    return {
      credentials,
      source,
      marker: credentialMarker(credentials, source, { mtimeMs: null, size: null }),
      fileStat: { mtimeMs: null, size: null },
    };
  } catch {
    return null;
  }
}

function credentialMarker(
  credentials: ClaudeCredentialsFile,
  source: ClaudeCredentialsSource,
  fileStat: { mtimeMs: number | null; size: number | null },
): string {
  const oauth = credentials.claudeAiOauth;
  const accessToken = typeof oauth?.accessToken === 'string' ? oauth.accessToken : '';
  const refreshToken = typeof oauth?.refreshToken === 'string' ? oauth.refreshToken : '';
  const digest = crypto
    .createHash('sha256')
    .update(JSON.stringify({ accessToken, refreshToken, expiresAt: oauth?.expiresAt ?? null }))
    .digest('hex')
    .slice(0, 16);

  return [
    source.kind,
    source.kind === 'file' ? source.path : source.kind === 'keychain' ? source.service : source.pid,
    fileStat.mtimeMs ?? 'no-mtime',
    fileStat.size ?? 'no-size',
    oauth?.expiresAt ?? 'no-expiry',
    hasClaudeAccessToken(credentials) ? 'access' : 'no-access',
    hasClaudeRefreshToken(credentials) ? 'refresh' : 'no-refresh',
    digest,
  ].join(':');
}

function envValue(psOutput: string, key: string): string {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = psOutput.match(new RegExp(`(?:^|\\s)${escaped}=([^\\s]+)`));
  return match?.[1] ?? '';
}

function activeClaudeCodePids(): number[] {
  try {
    const out = runProcessLookup(
      'WMT_PGREP_BIN_FOR_TEST',
      DEFAULT_PGREP_BIN,
      ['-f', 'claude-code/.*/claude\\.app/Contents/MacOS/claude'],
    );
    return out
      .split(/\s+/)
      .map(value => Number(value))
      .filter(value => Number.isInteger(value) && value > 0)
      .slice(0, 16);
  } catch {
    return [];
  }
}

function readCredentialsFromClaudeProcess(pid: number): ResolvedClaudeCredentials | null {
  try {
    const psOutput = runProcessLookup('WMT_PS_BIN_FOR_TEST', DEFAULT_PS_BIN, ['eww', '-p', String(pid)]);
    const accessToken = envValue(psOutput, 'CLAUDE_CODE_OAUTH_TOKEN');
    if (!accessToken) return null;
    const credentials: ClaudeCredentialsFile = {
      claudeAiOauth: {
        accessToken,
        rateLimitTier: envValue(psOutput, 'CLAUDE_CODE_RATE_LIMIT_TIER'),
        subscriptionType: envValue(psOutput, 'CLAUDE_CODE_SUBSCRIPTION_TYPE'),
      },
    };
    const source: ClaudeCredentialsSource = { kind: 'process', pid };
    return {
      credentials,
      source,
      marker: credentialMarker(credentials, source, { mtimeMs: null, size: null }),
      fileStat: { mtimeMs: null, size: null },
    };
  } catch {
    return null;
  }
}

function readCredentialsFromActiveClaudeProcesses(
  validator: (credentials: ClaudeCredentialsFile | null) => boolean,
): ResolvedClaudeCredentials | null {
  if (processCredentialsDisabled()) return null;
  for (const pid of activeClaudeCodePids()) {
    const credentials = readCredentialsFromClaudeProcess(pid);
    if (credentials && validator(credentials.credentials)) return credentials;
  }
  return null;
}

function resolveFileCredentials(
  validator: (credentials: ClaudeCredentialsFile | null) => boolean,
): ResolvedClaudeCredentials | null {
  for (const filePath of claudeCredentialFileCandidates()) {
    const credentials = readCredentialsFromFile(filePath);
    if (!validator(credentials)) continue;
    let mtimeMs: number | null = null;
    let size: number | null = null;
    try {
      const stat = fs.statSync(filePath);
      mtimeMs = stat.mtimeMs;
      size = stat.size;
    } catch {
      // The parsed credentials remain valid for this read.
    }
    const source: ClaudeCredentialsSource = { kind: 'file', path: filePath };
    return {
      credentials: credentials as ClaudeCredentialsFile,
      source,
      marker: credentialMarker(credentials as ClaudeCredentialsFile, source, { mtimeMs, size }),
      fileStat: { mtimeMs, size },
    };
  }
  return null;
}

export function readClaudeCredentials(
  validator: (credentials: ClaudeCredentialsFile | null) => boolean = hasClaudeAccessToken,
): ResolvedClaudeCredentials | null {
  const fileCredentials = resolveFileCredentials(validator);
  if (fileCredentials) return fileCredentials;

  const processCredentials = readCredentialsFromActiveClaudeProcesses(validator);
  if (processCredentials) return processCredentials;

  if (keychainDisabled()) return null;
  for (const service of keychainServices()) {
    const credentials = readCredentialsFromKeychain(service);
    if (credentials && validator(credentials.credentials)) return credentials;
  }
  return null;
}

export function writeClaudeCredentialsAtomic(
  updated: ClaudeCredentialsFile,
  source: ClaudeCredentialsSource | null = null,
): void {
  if (source?.kind === 'process') {
    throw new Error('Cannot write Claude credentials back to a running process environment.');
  }

  if (source?.kind === 'keychain') {
    const account = source.account ?? keychainAccount(source.service) ?? source.service;
    security([
      'add-generic-password',
      '-U',
      '-s',
      source.service,
      '-a',
      account,
      '-w',
    ], JSON.stringify(updated));
    return;
  }

  const target = source?.kind === 'file' ? source.path : defaultCredentialFilePath();
  fs.mkdirSync(path.dirname(target), { recursive: true, mode: 0o700 });
  const tmp = `${target}.tmp.${process.pid}`;
  let fd: number | null = null;

  try {
    fd = fs.openSync(tmp, 'w', 0o600);
    fs.writeFileSync(fd, JSON.stringify(updated, null, 2), 'utf-8');
    fs.fsyncSync(fd);
    fs.closeSync(fd);
    fd = null;
    fs.renameSync(tmp, target);
  } finally {
    if (fd !== null) {
      try {
        fs.closeSync(fd);
      } catch {
        // Preserve the original failure.
      }
    }
    try {
      if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
    } catch {
      // Best effort cleanup.
    }
  }
}

export function readClaudeRefreshCredentials(): ResolvedClaudeCredentials | null {
  return readClaudeCredentials(hasClaudeRefreshToken);
}
