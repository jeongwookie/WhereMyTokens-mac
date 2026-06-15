import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import {
  parsePosixListeningPorts,
  parsePosixProcessCandidates,
  parseWindowsProcessCandidates,
} from '../dist/main/providers/antigravity/processFinder.js';

test('Antigravity process finder parses Windows CIM JSON arrays and filters unrelated processes', () => {
  const rows = [
    {
      ProcessId: 101,
      CommandLine: 'language_server_windows_x64.exe --csrf_token secret-a --app_data_dir antigravity --extension_server_port 54321 --server_port 12345 --workspace_id ws-1',
      CreationDate: '20260601090000.000000+480',
    },
    {
      ProcessId: 102,
      CommandLine: 'language_server_windows_x64.exe --csrf_token secret-b --app_data_dir other --extension_server_port 33333',
    },
  ];

  const candidates = parseWindowsProcessCandidates(JSON.stringify(rows));

  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].pid, 101);
  assert.equal(candidates[0].csrfToken, 'secret-a');
  assert.equal(candidates[0].extensionPort, 54321);
  assert.equal(candidates[0].serverPort, 12345);
  assert.equal(candidates[0].workspaceId, 'ws-1');
  assert.equal('commandLine' in candidates[0], false);
});

test('Antigravity process finder parses single-object CIM JSON output', () => {
  const candidate = parseWindowsProcessCandidates(JSON.stringify({
    ProcessId: '201',
    CommandLine: 'language_server_windows_x64.exe --csrf_token="secret-c" --app_data_dir="antigravity" --extension_server_port=23456',
  }));

  assert.equal(candidate.length, 1);
  assert.equal(candidate[0].pid, 201);
  assert.equal(candidate[0].csrfToken, 'secret-c');
  assert.equal(candidate[0].extensionPort, 23456);
});

test('Antigravity process finder accepts absolute Antigravity app data paths', () => {
  const candidate = parseWindowsProcessCandidates(JSON.stringify({
    ProcessId: '301',
    CommandLine: 'language_server_windows_x64.exe --csrf_token="secret-d" --app_data_dir="C:\\Users\\example\\AppData\\Roaming\\Antigravity" --extension_server_port=34567',
  }));

  assert.equal(candidate.length, 1);
  assert.equal(candidate[0].pid, 301);
  assert.equal(candidate[0].csrfToken, 'secret-d');
  assert.equal(candidate[0].extensionPort, 34567);
});

test('Antigravity process finder parses macOS ps output with Application Support paths', () => {
  const stdout = [
    ' 401 /Applications/Antigravity.app/Contents/Resources/app/bin/language_server_macos_arm --csrf_token mac-secret --app_data_dir /Users/example/Library/Application Support/Antigravity --extension_server_port 45678 --server_port=45679 --workspace_id mac-ws',
    ' 402 /usr/bin/other --csrf_token nope --app_data_dir /tmp/other --extension_server_port 11111',
  ].join('\n');

  const candidates = parsePosixProcessCandidates(stdout);

  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].pid, 401);
  assert.equal(candidates[0].csrfToken, 'mac-secret');
  assert.equal(candidates[0].extensionPort, 45678);
  assert.equal(candidates[0].serverPort, 45679);
  assert.equal(candidates[0].workspaceId, 'mac-ws');
});

test('Antigravity process finder parses lsof listening ports', () => {
  const ports = parsePosixListeningPorts([
    'p401',
    'n127.0.0.1:45678',
    'n*:45679',
    'n[::1]:45678',
  ].join('\n'));

  assert.deepEqual(ports, [45678, 45679]);
});

test('Antigravity process finder threads a discovery timeout through process and port probes', () => {
  const source = fs.readFileSync('src/main/providers/antigravity/processFinder.ts', 'utf8');

  assert.match(source, /function remainingTimeoutMs\(stopAt: number, maxMs: number\)/);
  assert.match(source, /findWindowsProcessCandidates\(remainingTimeoutMs\(stopAt, 15_000\)\)/);
  assert.match(source, /findPosixProcessCandidates\(remainingTimeoutMs\(stopAt, 15_000\)\)/);
  assert.match(source, /findWorkingPort\(candidate, stopAt\)/);
  assert.match(source, /testPortWithProtocol\(port, candidate\.csrfToken, 'http', remainingTimeoutMs\(stopAt, 3_000\)\)/);
  assert.match(source, /testPortWithProtocol\(port, candidate\.csrfToken, 'https', remainingTimeoutMs\(stopAt, 3_000\)\)/);
});
