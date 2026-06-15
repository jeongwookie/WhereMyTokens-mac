import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const USER_FACING_FILES = [
  'README.md',
  'README.ko.md',
  'src/renderer/views/SettingsView.tsx',
  'src/renderer/views/NotificationsView.tsx',
  'package.json',
];

test('macOS port does not expose stale Windows-first copy in primary surfaces', () => {
  const combined = USER_FACING_FILES
    .map(file => fs.readFileSync(file, 'utf8'))
    .join('\n');

  assert.doesNotMatch(combined, /Start with Windows/);
  assert.doesNotMatch(combined, /Windows notifications/);
  assert.doesNotMatch(combined, /Windows tray/);
  assert.doesNotMatch(combined, /Windows 10 \/ 11/);
  assert.doesNotMatch(combined, /WhereMyTokens-Setup\.exe/);
  assert.match(combined, /macOS menu bar|macOS 메뉴 막대/);
  assert.match(combined, /Start at login|로그인 시 자동 실행/);
});
