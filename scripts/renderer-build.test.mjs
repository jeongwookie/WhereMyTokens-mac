import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const sourceHtmlPath = 'src/renderer/index.html';
const builtHtmlPath = 'dist/renderer/index.html';

test('renderer entry keeps the isolated local-content security contract', () => {
  const html = fs.readFileSync(sourceHtmlPath, 'utf8');

  assert.match(html, /Content-Security-Policy/);
  assert.match(html, /default-src 'self'/);
  assert.match(html, /script-src 'self'/);
  assert.match(html, /style-src 'self' 'unsafe-inline'/);
  assert.doesNotMatch(html, /script-src[^;]*'unsafe-inline'/);
  assert.doesNotMatch(html, /'unsafe-eval'/);
  assert.match(html, /<div id="splash">/);
  assert.match(html, /<div id="root"/);
  assert.match(html, /<script src="app\.js"><\/script>/);
  assert.match(html, /src="\.\.\/\.\.\/assets\/source-icon\.png"/);
});

test('full build emits the complete renderer shell', () => {
  assert.ok(fs.existsSync('dist/renderer/app.js'), 'renderer JavaScript bundle is missing');
  assert.ok(fs.existsSync('dist/renderer/app.js.map'), 'renderer source map is missing');
  assert.equal(fs.readFileSync(builtHtmlPath, 'utf8'), fs.readFileSync(sourceHtmlPath, 'utf8'));

  for (const font of ['noto-sans', 'noto-sans-kr', 'noto-sans-jp', 'jetbrains-mono']) {
    assert.ok(fs.existsSync(`dist/renderer/fonts/${font}/400.css`), `${font} 400 CSS is missing`);
    assert.ok(fs.existsSync(`dist/renderer/fonts/${font}/700.css`), `${font} 700 CSS is missing`);
  }
});

test('test command exercises the full build before running tests', () => {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

  assert.match(pkg.scripts.test, /^npm run typecheck:reset-contract && /);
  assert.match(pkg.scripts.test, /npm run build && node --test /);
  assert.match(pkg.scripts.test, /scripts\/renderer-build\.test\.mjs/);
});
