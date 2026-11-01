import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import dns from 'node:dns/promises';
import https from 'node:https';
import os from 'node:os';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import { Readable } from 'node:stream';
import { downloadPublicAudio, validatePublicHttpsUrl } from '../../src/p1228/core/security.js';

test('rejects non-HTTPS, userinfo, and local hostnames before resolving', async () => {
  await assert.rejects(validatePublicHttpsUrl('http://example.com/audio.mp3'));
  await assert.rejects(validatePublicHttpsUrl('https://user:pass@example.com/audio.mp3'));
  await assert.rejects(validatePublicHttpsUrl('https://localhost/audio.mp3'));
});

test('streams public audio to disk and enforces the byte limit', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'p1228-audio-test-'));
  const destPath = path.join(dir, 'audio.mp3');
  const largePath = path.join(dir, 'oversized.mp3');
  const origGet = https.get;
  try {
    https.get = (_url, _opts, cb) => {
      const req = new EventEmitter();
      queueMicrotask(() => {
        const res = Readable.from([Buffer.from('audio')]);
        res.statusCode = 200;
        res.headers = { 'content-type': 'audio/mpeg' };
        cb(res);
      });
      return req;
    };

    const result = await downloadPublicAudio('https://8.8.8.8/audio.mp3', destPath, {
      maxBytes: 5,
    });
    assert.equal(result.path, destPath);
    assert.deepEqual(await fs.readFile(destPath), Buffer.from('audio'));

    await assert.rejects(
      downloadPublicAudio('https://8.8.8.8/audio.mp3', largePath, { maxBytes: 4 }),
      /size limit|サイズ上限/u,
    );
    await assert.rejects(fs.access(largePath));

    await assert.rejects(
      downloadPublicAudio('https://8.8.8.8/audio.mp3', destPath, { maxBytes: 5 }),
      { code: 'EEXIST' },
    );
    assert.deepEqual(await fs.readFile(destPath), Buffer.from('audio'));
  } finally {
    https.get = origGet;
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('pins the validated DNS address and rejects redirects to private hosts', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'p1228-audio-pin-test-'));
  const destPath = path.join(dir, 'audio.mp3');
  const origLookup = dns.lookup;
  const origGet = https.get;
  let lookups = 0;
  let pinnedAddr;
  let reqs = 0;
  let privateRedirect = false;
  try {
    dns.lookup = async () => {
      lookups += 1;
      return [{ address: lookups === 1 ? '8.8.8.8' : '127.0.0.1', family: 4 }];
    };
    https.get = (url, opts, cb) => {
      reqs += 1;
      if (!privateRedirect)
        opts.lookup(new URL(url).hostname, {}, (err, addr) => {
          assert.ifError(err);
          pinnedAddr = addr;
        });
      const req = new EventEmitter();
      queueMicrotask(() => {
        const res = Readable.from([Buffer.from('audio')]);
        res.statusCode = privateRedirect ? 302 : 200;
        res.headers = privateRedirect
          ? { location: 'https://127.0.0.1/private' }
          : { 'content-type': 'audio/mpeg' };
        cb(res);
      });
      return req;
    };

    await downloadPublicAudio('https://media.example/audio.mp3', destPath, { maxBytes: 5 });
    assert.equal(pinnedAddr, '8.8.8.8');
    assert.equal(lookups, 1);
    privateRedirect = true;
    await assert.rejects(
      downloadPublicAudio('https://8.8.8.8/audio.mp3', destPath, { maxBytes: 5 }),
      /非公開IPアドレス/u,
    );
    assert.equal(reqs, 2);
  } finally {
    dns.lookup = origLookup;
    https.get = origGet;
    await fs.rm(dir, { recursive: true, force: true });
  }
});
