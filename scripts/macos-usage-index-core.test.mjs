import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import usageIndexModule from '../dist/main/usageIndex/index.js';
import breakdownModule from '../dist/shared/breakdownTypes.js';

const {
  DefaultUsageIndex,
  InMemoryUsageIndexStorage,
  SqliteUsageIndexStorage,
  openUsageIndex,
  usageIndexSchemaVersion,
} = usageIndexModule;
const { emptyBreakdownDelta } = breakdownModule;

const NOW = Date.parse('2026-07-17T12:00:00Z');

function source(sourceId, token, size, projectKeys = ['project-a']) {
  return {
    sourceId,
    provider: 'codex',
    kind: 'file',
    parserVersion: 1,
    version: { token, size, mtimeMs: size },
    projectKeys,
  };
}

function entry(requestId, timestampMs, inputTokens, overrides = {}) {
  return {
    requestId,
    timestampMs,
    provider: 'codex',
    model: 'gpt-5-codex',
    inputTokens,
    outputTokens: 0,
    cacheCreationTokens: 0,
    cacheReadTokens: 0,
    costUSD: 0,
    cacheSavingsUSD: 0,
    ...overrides,
  };
}

function batch(byteOffset, entries, overrides = {}) {
  return {
    checkpoint: { byteOffset },
    entries,
    rebuildCoverage: { kind: 'full' },
    ...overrides,
  };
}

function withBreakdown(values = {}) {
  return { ...emptyBreakdownDelta(), ...values };
}

test('memory and SQLite adapters share rebuild, tail, query, and project-filter semantics', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wmt-macos-usage-index-parity-'));
  const adapters = [
    ['memory', new InMemoryUsageIndexStorage()],
    ['sqlite', new SqliteUsageIndexStorage(path.join(tempDir, 'usage-index.sqlite'))],
  ];

  try {
    for (const [name, storage] of adapters) {
      const index = new DefaultUsageIndex(storage, () => NOW);
      const initial = source(`codex:${name}`, 'v1', 10, ['Project-A', 'Project-Alias']);
      index.declareSources('codex', [initial], true);
      const first = await index.refreshSource(initial, {
        scan: async plan => {
          assert.equal(plan.mode, 'rebuild');
          assert.equal(plan.checkpoint, null);
          return batch(10, [
            entry('request-1', NOW - 3_600_000, 10, {
              breakdown: withBreakdown({ thinking: 2, read: 1 }),
            }),
          ], {
            providerMetadata: { format: 'fixture-v1' },
            sessionProjection: {
              sourceId: initial.sourceId,
              provider: 'codex',
              updatedAt: NOW - 3_600_000,
              byteSize: 10,
              payload: { sessionId: 'session-one' },
            },
          });
        },
      });
      assert.equal(first.status, 'rebuilt');

      const current = source(initial.sourceId, 'v2', 20, initial.projectKeys);
      const second = await index.refreshSource(current, {
        scan: async plan => {
          assert.equal(plan.mode, 'tail');
          assert.equal(plan.checkpoint.byteOffset, 10);
          assert.equal(plan.previousSessionProjection.payload.sessionId, 'session-one');
          return {
            checkpoint: { byteOffset: 20 },
            entries: [
              entry('request-1', NOW - 3_600_000, 6, {
                breakdown: withBreakdown({ thinking: 1, read: 1 }),
              }),
              entry('request-2', NOW - 1_800_000, 4, {
                breakdown: withBreakdown({ response: 3, terminal: 1 }),
              }),
            ],
          };
        },
      });
      assert.equal(second.status, 'tailed');

      const usage = await index.queryUsage({ grain: 'hour', providers: new Set(['codex']) });
      assert.equal(usage.aggregate.requestCount, 2, `${name}: deduplicated requests`);
      assert.equal(usage.aggregate.totalTokens, 10, `${name}: replacement bucket delta`);
      assert.equal(usage.models[0].model, 'gpt-5-codex');
      assert.equal(usage.coverage.state, 'complete');

      const breakdown = await index.queryBreakdown({ grain: 'hour' });
      assert.equal(breakdown.aggregate.thinking, 1, `${name}: replaced breakdown`);
      assert.equal(breakdown.aggregate.response, 3, `${name}: appended breakdown`);
      assert.equal(breakdown.aggregate.terminal, 1);

      const excluded = await index.queryUsage({
        grain: 'month',
        excludedProjectKeys: ['PROJECT-ALIAS'],
      });
      assert.equal(excluded.aggregate.requestCount, 0, `${name}: source-level project exclusion`);
      assert.deepEqual((await index.readSessionProjections()).map(row => row.payload.sessionId), ['session-one']);
      await index.close();
    }
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('SQLite persists source checkpoints, projections, and aggregate buckets across restart', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wmt-macos-usage-index-restart-'));
  const databasePath = path.join(tempDir, 'usage-index.sqlite');
  const descriptor = source('codex:restart', 'v1', 10);
  let scans = 0;

  try {
    let index = new DefaultUsageIndex(new SqliteUsageIndexStorage(databasePath), () => NOW);
    await index.refreshSource(descriptor, {
      scan: async () => {
        scans += 1;
        return batch(10, [entry('restart-request', NOW - 60_000, 17)], {
          sessionProjection: {
            sourceId: descriptor.sourceId,
            provider: 'codex',
            updatedAt: NOW,
            byteSize: 10,
            payload: { cwd: '/tmp/project' },
          },
        });
      },
    });
    await index.close();

    index = new DefaultUsageIndex(new SqliteUsageIndexStorage(databasePath), () => NOW);
    const unchanged = await index.refreshSource(descriptor, {
      scan: async () => {
        scans += 1;
        throw new Error('an unchanged source must not be rescanned');
      },
    });
    assert.equal(unchanged.status, 'unchanged');
    assert.equal(scans, 1);
    assert.equal((await index.queryUsage({ grain: 'month' })).aggregate.totalTokens, 17);
    assert.deepEqual((await index.readSessionProjections())[0].payload, { cwd: '/tmp/project' });
    await index.close();

    const database = new DatabaseSync(databasePath, { readOnly: true });
    assert.equal(database.prepare('PRAGMA user_version').get().user_version, usageIndexSchemaVersion());
    assert.equal(database.prepare('SELECT COUNT(*) AS count FROM usage_bucket').get().count, 3);
    assert.equal(database.prepare('PRAGMA integrity_check').get().integrity_check, 'ok');
    database.close();
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('SQLite reset cascades canonical state, survives restart, and forces a rebuild', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wmt-macos-usage-index-reset-'));
  const databasePath = path.join(tempDir, 'usage-index.sqlite');
  const descriptor = source('codex:reset', 'v1', 10);

  try {
    let index = new DefaultUsageIndex(new SqliteUsageIndexStorage(databasePath), () => NOW);
    await index.refreshSource(descriptor, {
      scan: async () => batch(10, [entry('before-reset', NOW, 23)], {
        sessionProjection: {
          sourceId: descriptor.sourceId,
          provider: 'codex',
          updatedAt: NOW,
          byteSize: 10,
          payload: { state: 'before-reset' },
        },
      }),
    });
    await index.reset();
    assert.equal((await index.queryUsage({ grain: 'month' })).aggregate.requestCount, 0);
    assert.deepEqual(await index.readSessionProjections(), []);
    await index.close();

    index = new DefaultUsageIndex(new SqliteUsageIndexStorage(databasePath), () => NOW);
    let mode;
    await index.refreshSource(descriptor, {
      scan: async plan => {
        mode = plan.mode;
        return batch(10, [entry('after-reset', NOW, 5)]);
      },
    });
    assert.equal(mode, 'rebuild');
    assert.equal((await index.queryUsage({ grain: 'month' })).aggregate.totalTokens, 5);
    await index.close();
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('reset invalidates an in-flight tail scan before stale history can be committed', async () => {
  const index = new DefaultUsageIndex(new InMemoryUsageIndexStorage(), () => NOW);
  const initial = source('codex:reset-race', 'v1', 10);
  await index.refreshSource(initial, {
    scan: async () => batch(10, [entry('initial', NOW, 10)]),
  });

  let releaseScan;
  const release = new Promise(resolve => { releaseScan = resolve; });
  let markEntered;
  const entered = new Promise(resolve => { markEntered = resolve; });
  const staleRefresh = index.refreshSource(source(initial.sourceId, 'v2', 20), {
    scan: async plan => {
      assert.equal(plan.mode, 'tail');
      markEntered();
      await release;
      return { checkpoint: { byteOffset: 20 }, entries: [entry('stale', NOW + 1, 4)] };
    },
  });
  await entered;
  await index.reset();
  releaseScan();
  await assert.rejects(staleRefresh, /invalidated by UsageIndex reset/);
  assert.equal((await index.queryUsage({ grain: 'month' })).aggregate.requestCount, 0);
  await index.close();
});

test('a corrupt database is preserved until explicit reset creates a clean index', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wmt-macos-usage-index-corrupt-'));
  const databasePath = path.join(tempDir, 'usage-index.sqlite');
  const damagedBytes = Buffer.from('not a sqlite database: preserve me', 'utf8');
  fs.writeFileSync(databasePath, damagedBytes);

  try {
    const index = await openUsageIndex(databasePath);
    assert.equal(index.getHealth().state, 'unavailable');
    assert.deepEqual(fs.readFileSync(databasePath), damagedBytes);
    assert.equal((await index.queryUsage({
      grain: 'month',
      providers: new Set(['codex']),
    })).coverage.state, 'incomplete');

    await index.reset();
    const health = index.getHealth();
    assert.equal(health.state, 'ready');
    assert.ok(health.preservedPath);
    assert.deepEqual(fs.readFileSync(health.preservedPath), damagedBytes);
    assert.equal((await index.queryUsage({ grain: 'month' })).aggregate.requestCount, 0);
    await index.close();
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('SQLite source commits roll back source and checkpoint changes on entry failure', async () => {
  const storage = new SqliteUsageIndexStorage(':memory:');
  const descriptor = source('codex:rollback', 'v1', 10);
  try {
    await assert.rejects(storage.commitSource({
      mode: 'rebuild',
      source: descriptor,
      batch: {
        checkpoint: { byteOffset: 10 },
        entries: [{ ...entry('invalid', NOW, 1), model: null }],
        rebuildCoverage: { kind: 'full' },
      },
    }));
    assert.equal(await storage.getSource(descriptor.sourceId), null);
  } finally {
    await storage.close();
  }
});

test('compaction retains monthly history without double-counting a later source rebuild', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wmt-macos-usage-index-retention-'));
  const dayMs = 24 * 60 * 60 * 1_000;
  const historicalEntries = [200, 100, 40, 10, 1]
    .map(daysAgo => entry(`retention-${daysAgo}`, NOW - daysAgo * dayMs, 1));
  const adapters = [
    ['memory', new InMemoryUsageIndexStorage()],
    ['sqlite', new SqliteUsageIndexStorage(path.join(tempDir, 'usage-index.sqlite'))],
  ];

  try {
    for (const [name, storage] of adapters) {
      const index = new DefaultUsageIndex(storage, () => NOW);
      const descriptor = source(`codex:retention-${name}`, 'v1', 10);
      await index.refreshSource(descriptor, {
        scan: async () => batch(10, historicalEntries),
      });
      assert.deepEqual(await storage.compact(NOW), {
        deletedRequestRows: 4,
        deletedHourBuckets: 3,
        deletedDayBuckets: 1,
      });
      assert.equal((await index.readProjectionEntries({})).length, 1);
      assert.equal((await index.queryUsage({ grain: 'hour' })).aggregate.requestCount, 2);
      assert.equal((await index.queryUsage({ grain: 'day' })).aggregate.requestCount, 4);
      assert.equal((await index.queryUsage({ grain: 'month' })).aggregate.requestCount, 5);

      await index.refreshSource(source(descriptor.sourceId, 'v2', 10), {
        scan: async plan => {
          assert.equal(plan.mode, 'rebuild');
          return batch(10, historicalEntries);
        },
      });
      assert.equal((await index.queryUsage({ grain: 'month' })).aggregate.requestCount, 5);
      assert.equal((await storage.getSource(descriptor.sourceId)).sealedBeforeMs, NOW - 8 * dayMs);
      await index.close();
    }
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('SQLite schema v1 migrates in place and backfills aggregate buckets', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wmt-macos-usage-index-v1-'));
  const databasePath = path.join(tempDir, 'usage-index.sqlite');

  try {
    const database = new DatabaseSync(databasePath);
    database.exec(`
      PRAGMA foreign_keys = ON;
      CREATE TABLE usage_source (
        source_id TEXT PRIMARY KEY,
        provider TEXT NOT NULL,
        source_kind TEXT NOT NULL,
        parser_version INTEGER NOT NULL,
        version_token TEXT NOT NULL,
        source_size INTEGER,
        mtime_ms REAL,
        checkpoint_json TEXT NOT NULL,
        provider_metadata_json TEXT
      ) STRICT;
      CREATE TABLE usage_source_project (
        source_id TEXT NOT NULL REFERENCES usage_source(source_id) ON DELETE CASCADE,
        project_key TEXT NOT NULL,
        PRIMARY KEY (source_id, project_key)
      ) STRICT;
      CREATE TABLE usage_entry (
        source_id TEXT NOT NULL REFERENCES usage_source(source_id) ON DELETE CASCADE,
        request_id TEXT NOT NULL,
        timestamp_ms INTEGER NOT NULL,
        provider TEXT NOT NULL,
        model TEXT NOT NULL,
        input_tokens INTEGER NOT NULL,
        output_tokens INTEGER NOT NULL,
        cache_creation_tokens INTEGER NOT NULL,
        cache_read_tokens INTEGER NOT NULL,
        cost_usd REAL NOT NULL,
        cache_savings_usd REAL NOT NULL,
        breakdown_json TEXT,
        PRIMARY KEY (source_id, request_id)
      ) STRICT;
      CREATE INDEX usage_entry_time_provider_model
        ON usage_entry(timestamp_ms, provider, model);
      CREATE TABLE usage_session_hot (
        source_id TEXT PRIMARY KEY REFERENCES usage_source(source_id) ON DELETE CASCADE,
        provider TEXT NOT NULL,
        updated_at INTEGER NOT NULL,
        byte_size INTEGER NOT NULL,
        payload_json TEXT NOT NULL
      ) STRICT;
      PRAGMA user_version = 1;
    `);
    database.prepare(`
      INSERT INTO usage_source (
        source_id, provider, source_kind, parser_version, version_token,
        source_size, mtime_ms, checkpoint_json, provider_metadata_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('codex:v1', 'codex', 'file', 1, 'v1', 10, 10, '{"byteOffset":10}', null);
    database.prepare(`
      INSERT INTO usage_entry (
        source_id, request_id, timestamp_ms, provider, model,
        input_tokens, output_tokens, cache_creation_tokens, cache_read_tokens,
        cost_usd, cache_savings_usd, breakdown_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'codex:v1',
      'v1-request',
      NOW,
      'codex',
      'gpt-5-codex',
      9,
      0,
      0,
      0,
      0,
      0,
      null,
    );
    database.close();

    const storage = new SqliteUsageIndexStorage(databasePath);
    assert.equal((await storage.queryUsage({ grain: 'month' })).aggregate.totalTokens, 9);
    await storage.close();

    const migrated = new DatabaseSync(databasePath, { readOnly: true });
    assert.equal(migrated.prepare('PRAGMA user_version').get().user_version, usageIndexSchemaVersion());
    assert.deepEqual(
      migrated.prepare(`
        SELECT bucket_kind, request_count, total_tokens
        FROM usage_bucket ORDER BY bucket_kind
      `).all().map(row => ({ ...row })),
      [
        { bucket_kind: 'day', request_count: 1, total_tokens: 9 },
        { bucket_kind: 'hour', request_count: 1, total_tokens: 9 },
        { bucket_kind: 'month', request_count: 1, total_tokens: 9 },
      ],
    );
    assert.equal(migrated.prepare('PRAGMA integrity_check').get().integrity_check, 'ok');
    migrated.close();
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
