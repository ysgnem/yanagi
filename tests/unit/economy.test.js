import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { EconomyRepository } from '../../src/p1228/core/economy.js';

test('account, ledger, claim and transfer remain atomic', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'p1228-test-'));
  const repo = new EconomyRepository(path.join(dir, 'economy.sqlite3'));
  try {
    repo.ensureAccount('1', '10', 100);
    repo.ensureAccount('1', '30', Number.MAX_SAFE_INTEGER);
    assert.equal(repo.balance('1', '10'), 100);
    assert.throws(() => repo.add('1', '30', 1, 'overflow'), RangeError);
    assert.throws(() => repo.claim('1', '30', 1, 'overflow'), RangeError);
    assert.throws(() => repo.lottery('1', '30', 0, 1), RangeError);
    repo.add('1', '10', 25, 'test-credit');
    assert.equal(repo.balance('1', '10'), 125);
    repo.transfer('1', '10', '20', 40);
    assert.equal(repo.balance('1', '10'), 85);
    assert.equal(repo.balance('1', '20'), 40);
    assert.throws(() => repo.transfer('1', '10', '20', 100));
    assert.throws(() => repo.transfer('1', '10', '30', 1), RangeError);
    repo.claim('1', '10', 10, 'test-daily');
    assert.throws(() => repo.claim('1', '10', 10, 'test-daily'));
    assert.ok(repo.history('1', '10').length >= 3);
  } finally {
    repo.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
