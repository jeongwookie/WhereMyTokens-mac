import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('main process uses macOS menu bar shell behavior', () => {
  const source = fs.readFileSync('src/main/index.ts', 'utf8');

  assert.match(source, /process\.platform === 'darwin' \? 'icon\.png' : 'icon\.ico'/);
  assert.match(source, /icon\.setTemplateImage\(true\)/);
  assert.match(source, /app\.dock\?\.hide\(\)/);
  assert.match(source, /trayIsNearTop/);
  assert.match(source, /trayBounds\.y \+ trayBounds\.height \+ POPUP_MARGIN/);
  assert.match(source, /providerMenuBarLabel/);
  assert.match(source, /Claude 5h/);
  assert.match(source, /Codex 5h/);
  assert.match(source, /win\.on\('blur'/);
});

test('macOS popover keeps its scrollable body outside the drag region', () => {
  const source = fs.readFileSync('src/renderer/views/MacMenuBarPopoverView.tsx', 'utf8');

  assert.match(source, /const noDrag = \{ WebkitAppRegion: 'no-drag' \}/);
  assert.match(source, /\.\.\.noDrag,\s*minHeight: 0,\s*overflowY: 'auto'/s);
  assert.match(source, /gridTemplateRows: 'auto 1fr auto',\s*minHeight: 0/s);
});

test('main process pins Electron userData to the shared WhereMyTokens macOS path', () => {
  const source = fs.readFileSync('src/main/index.ts', 'utf8');

  assert.match(source, /whereMyTokensDataDir/);
  assert.match(source, /app\.setPath\('userData', whereMyTokensDataDir\(\)\)/);
  assert.ok(
    source.indexOf("app.setPath('userData', whereMyTokensDataDir())") < source.indexOf('new Store<AppSettings>'),
    'userData must be pinned before electron-store is constructed',
  );
});

test('login item settings are synchronized only when the desired state differs', () => {
  const helper = fs.readFileSync('src/main/loginItems.ts', 'utf8');
  const main = fs.readFileSync('src/main/index.ts', 'utf8');
  const ipc = fs.readFileSync('src/main/ipc.ts', 'utf8');

  assert.match(helper, /app\.getLoginItemSettings\(\)\.openAtLogin === openAtLogin/);
  assert.match(helper, /app\.setLoginItemSettings\(\{ openAtLogin \}\)/);
  assert.match(main, /syncLoginItemSettings\(settings\.openAtLogin\)/);
  assert.match(ipc, /syncLoginItemSettings\(sanitized\.openAtLogin\)/);
});

test('Claude bridge path resolves packaged resources and local dist builds', () => {
  const source = fs.readFileSync('src/main/ipc.ts', 'utf8');

  assert.match(source, /app\.isPackaged/);
  assert.match(source, /process\.resourcesPath, 'bridge', 'bridge\.js'/);
  assert.match(source, /app\.getAppPath\(\), 'dist', 'bridge', 'bridge\.js'/);
});

test('macOS packaging target and icon generation stay configured', () => {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const makeIcons = fs.readFileSync('scripts/make-icons.mjs', 'utf8');

  assert.equal(pkg.name, 'wheremytokens-mac');
  assert.equal(pkg.build.mac.icon, 'assets/icon.icns');
  assert.deepEqual(pkg.build.mac.target, ['dmg', 'zip']);
  assert.match(makeIcons, /assets\/icon\.icns/);
  assert.match(makeIcons, /icns\.write\('icns'/);
});
