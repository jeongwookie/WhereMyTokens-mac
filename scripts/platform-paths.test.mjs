import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';

import platformPaths from '../dist/shared/platformPaths.js';

const {
  liveSessionFilePath,
  whereMyTokensDataDir,
  whereMyTokensLogDir,
} = platformPaths;

test('platform paths use macOS Application Support and Logs locations', () => {
  const homeDir = '/Users/example';
  assert.equal(
    whereMyTokensDataDir({ platform: 'darwin', homeDir, env: {} }),
    path.join(homeDir, 'Library', 'Application Support', 'WhereMyTokens'),
  );
  assert.equal(
    whereMyTokensLogDir({ platform: 'darwin', homeDir, env: {} }),
    path.join(homeDir, 'Library', 'Logs', 'WhereMyTokens'),
  );
  assert.equal(
    liveSessionFilePath({ platform: 'darwin', homeDir, env: {} }),
    path.join(homeDir, 'Library', 'Application Support', 'WhereMyTokens', 'live-session.json'),
  );
});

test('platform paths preserve Windows roaming/local app data locations', () => {
  const env = {
    APPDATA: 'C:\\Users\\example\\AppData\\Roaming',
    LOCALAPPDATA: 'C:\\Users\\example\\AppData\\Local',
  };
  assert.equal(
    whereMyTokensDataDir({ platform: 'win32', homeDir: 'C:\\Users\\example', env }),
    path.join(env.APPDATA, 'WhereMyTokens'),
  );
  assert.equal(
    whereMyTokensLogDir({ platform: 'win32', homeDir: 'C:\\Users\\example', env }),
    path.join(env.LOCALAPPDATA, 'WhereMyTokens'),
  );
});
