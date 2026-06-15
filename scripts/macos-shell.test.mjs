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
