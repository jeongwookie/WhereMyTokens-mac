import * as os from 'os';
import * as path from 'path';

export interface PlatformPathOptions {
  appName?: string;
  env?: NodeJS.ProcessEnv;
  homeDir?: string;
  platform?: NodeJS.Platform;
}

const DEFAULT_APP_NAME = 'WhereMyTokens';

function optionsWithDefaults(options: PlatformPathOptions = {}) {
  return {
    appName: options.appName ?? DEFAULT_APP_NAME,
    env: options.env ?? process.env,
    homeDir: options.homeDir ?? os.homedir(),
    platform: options.platform ?? process.platform,
  };
}

export function whereMyTokensDataDir(options: PlatformPathOptions = {}): string {
  const { appName, env, homeDir, platform } = optionsWithDefaults(options);
  if (platform === 'win32') {
    return path.join(env.APPDATA || path.join(homeDir, 'AppData', 'Roaming'), appName);
  }
  if (platform === 'darwin') {
    return path.join(homeDir, 'Library', 'Application Support', appName);
  }
  return path.join(env.XDG_CONFIG_HOME || path.join(homeDir, '.config'), appName);
}

export function whereMyTokensLogDir(options: PlatformPathOptions = {}): string {
  const { appName, env, homeDir, platform } = optionsWithDefaults(options);
  if (platform === 'win32') {
    return path.join(env.LOCALAPPDATA || path.join(homeDir, 'AppData', 'Local'), appName);
  }
  if (platform === 'darwin') {
    return path.join(homeDir, 'Library', 'Logs', appName);
  }
  return path.join(env.XDG_STATE_HOME || path.join(homeDir, '.local', 'state'), appName);
}

export function liveSessionFilePath(options: PlatformPathOptions = {}): string {
  return path.join(whereMyTokensDataDir(options), 'live-session.json');
}
