import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadModules } from '../../src/p1228/bots/module-loader.js';

test('discovers commands and feature factories for every bot', async () => {
  const botsDir = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../src/p1228/bots',
  );
  const expectedCmds = {
    ai: ['ask'],
    community: ['autorole-check', 'ping', 'server-info'],
    debug: ['debug-echo', 'debug-info', 'debug-permission'],
    entertainment: ['balance', 'daily', 'lottery', 'transfer'],
    minase: ['balance', 'daily', 'history', 'omikuji', 'ranking'],
    music: ['play', 'queue', 'skip', 'stop'],
    tts: ['join', 'leave', 'stop', 'tts'],
  };
  const modules = await Promise.all(
    Object.entries(expectedCmds).map(async ([bot, expected]) => {
      const [cmds, feats] = await Promise.all([
        loadModules(path.join(botsDir, bot, 'commands')),
        loadModules(path.join(botsDir, bot, 'features')),
      ]);
      return { bot, expected, commands: cmds, features: feats };
    }),
  );

  for (const { bot, expected, commands: cmds, features: feats } of modules) {
    assert.deepEqual(
      cmds.map((cmd) => cmd.data.name),
      expected,
      `${bot} command discovery`,
    );
    assert.ok(feats.length > 0, `${bot} feature discovery`);
  }
  assert.ok(
    modules.flatMap(({ features: feats }) => feats).every((create) => typeof create === 'function'),
  );
});

test('loads JavaScript modules in filename order and ignores other entries', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'p1228-bot-modules-'));
  try {
    await fs.writeFile(path.join(dir, 'second.js'), 'export default "second";');
    await fs.writeFile(path.join(dir, 'first.js'), 'export default "first";');
    await fs.writeFile(path.join(dir, 'ignored.txt'), 'not a module');
    await fs.mkdir(path.join(dir, 'nested'));
    await fs.writeFile(path.join(dir, 'nested', 'ignored.js'), 'export default "nested";');

    assert.deepEqual(await loadModules(dir), ['first', 'second']);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('reports modules that do not provide a default export', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'p1228-invalid-module-'));
  try {
    await fs.writeFile(path.join(dir, 'invalid.js'), 'export const value = true;');
    await assert.rejects(loadModules(dir), /must have a default export: invalid\.js/u);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});
