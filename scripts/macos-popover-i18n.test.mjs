import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync('src/renderer/views/MacMenuBarPopoverView.tsx', 'utf8');
const en = JSON.parse(fs.readFileSync('src/renderer/i18n/locales/en.json', 'utf8'));
const ja = JSON.parse(fs.readFileSync('src/renderer/i18n/locales/ja.json', 'utf8'));

function leafKeys(value, prefix = '', out = new Set()) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    out.add(prefix);
    return out;
  }
  for (const [key, child] of Object.entries(value)) {
    leafKeys(child, prefix ? `${prefix}.${key}` : key, out);
  }
  return out;
}

test('macOS popover routes fixed user-facing copy through i18n', () => {
  assert.match(source, /useTranslation\(\)/);
  assert.match(source, /macMenuBarPopover\.status\.resetsIn/);
  assert.match(source, /macMenuBarPopover\.updatedAt/);
  assert.match(source, /macMenuBarPopover\.usageSummary/);
  assert.match(source, /common\.state\.\$\{session\.state\}/);

  for (const text of [
    'Waiting for quota data',
    'Close popover',
    'Quota windows',
    'Quota data is loading.',
    'Now coding',
    'No live coding sessions.',
    'Refresh now',
    'Open full dashboard',
    'Open settings',
  ]) {
    assert.equal(source.includes(`'${text}'`) || source.includes(`"${text}"`), false, `${text} must not remain hard-coded`);
  }
});

test('macOS popover controls expose localized accessible names', () => {
  assert.equal(source.match(/aria-label=\{title\}/g)?.length, 2);
  assert.match(source, /role="group"/);
  assert.match(source, /aria-label=\{t\('macMenuBarPopover\.periodToggle'\)\}/);
  assert.match(source, /aria-pressed=\{period === item\}/);
});

test('macOS popover translation namespace has English and Japanese parity', () => {
  const enKeys = [...leafKeys(en.macMenuBarPopover)].sort();
  const jaKeys = [...leafKeys(ja.macMenuBarPopover)].sort();

  assert.deepEqual(jaKeys, enKeys);
  assert.equal(ja.macMenuBarPopover.close, 'ポップオーバーを閉じる');
  assert.equal(ja.macMenuBarPopover.status.localShort, 'ローカル');
});

test('macOS popover presents unlimited and unreported quota windows as ready data', () => {
  assert.match(source, /row\.quota\.limitState === 'unlimited'/);
  assert.match(source, /row\.quota\.limitState === 'unreported'/);
  assert.match(source, /selected\.limitState === 'unlimited'/);
  assert.match(source, /noCapState \? '100%'/);

  assert.equal(en.tokenStatsCard.unlimited, 'Unlimited');
  assert.equal(en.tokenStatsCard.unreported, 'Unlimited');
  assert.equal(ja.tokenStatsCard.unlimited, 'Unlimited');
  assert.equal(ja.tokenStatsCard.unreported, 'Unlimited');
  assert.equal(en.macMenuBarPopover.status.unlimited.includes('{{title}}'), true);
  assert.equal(ja.macMenuBarPopover.status.unreported.includes('{{label}}'), true);
});

test('macOS popover keeps its compact menu-bar layout without taskbar concepts', () => {
  assert.match(source, /gridTemplateRows: 'auto 1fr auto'/);
  assert.match(source, /\.\.\.noDrag,\s*minHeight: 0,\s*overflowY: 'auto'/s);
  assert.doesNotMatch(source, /taskbar/i);
  assert.deepEqual([...leafKeys(en)].filter(key => /taskbar/i.test(key)), []);
  assert.deepEqual([...leafKeys(ja)].filter(key => /taskbar/i.test(key)), []);
});
