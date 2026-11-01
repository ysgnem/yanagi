import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadModules } from '../../src/p1228/bots/module-loader.js';

test('discovers commands and feature factories for every bot', async () => {
  const botsDirectory = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../src/p1228/bots',
  );
  const expectedCommands = {
    ai: ['ask'],
    community: ['autorole-check', 'ping', 'server-info'],
    debug: ['debug-echo', 'debug-info', 'debug-permission'],
    entertainment: ['balance', 'daily', 'lottery', 'transfer'],
    minase: ['balance', 'daily', 'history', 'omikuji', 'ranking'],
    music: ['play', 'queue', 'skip', 'stop'],
    tts: ['join', 'leave', 'stop', 'tts'],
  };
  const modules = await Promise.all(
    Object.entries(expectedCommands).map(async ([bot, expected]) => {
      const [commands, features] = await Promise.all([
        loadModules(path.join(botsDirectory, bot, 'commands')),
        loadModules(path.join(botsDirectory, bot, 'features')),
      ]);
      return { bot, expected, commands, features };
    }),
  );

  for (const { bot, expected, commands, features } of modules) {
    assert.deepEqual(
      commands.map((command) => command.data.name),
      expected,
      `${bot} command discovery`,
    );
    assert.ok(features.length > 0, `${bot} feature discovery`);
  }
  assert.ok(
    modules
      .flatMap(({ features }) => features)
      .every((createFeature) => typeof createFeature === 'function'),
  );
});

test('loads JavaScript modules in filename order and ignores other entries', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'p1228-bot-modules-'));
  try {
    await fs.writeFile(path.join(directory, 'second.js'), 'export default "second";');
    await fs.writeFile(path.join(directory, 'first.js'), 'export default "first";');
    await fs.writeFile(path.join(directory, 'ignored.txt'), 'not a module');
    await fs.mkdir(path.join(directory, 'nested'));
    await fs.writeFile(path.join(directory, 'nested', 'ignored.js'), 'export default "nested";');

    assert.deepEqual(await loadModules(directory), ['first', 'second']);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test('reports modules that do not provide a default export', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'p1228-invalid-module-'));
  try {
    await fs.writeFile(path.join(directory, 'invalid.js'), 'export const value = true;');
    await assert.rejects(loadModules(directory), /must have a default export: invalid\.js/u);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});
