import fs from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import dns from 'node:dns/promises';
import https from 'node:https';
import net from 'node:net';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';

function ipv4Number(ip) {
  return ip.split('.').reduce((value, part) => value * 256 + Number(part), 0) >>> 0;
}
function inCidr(ip, base, bits) {
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  return (ipv4Number(ip) & mask) === (ipv4Number(base) & mask);
}
function isPublicIpv4(ip) {
  const blocked = [
    ['0.0.0.0', 8],
    ['10.0.0.0', 8],
    ['100.64.0.0', 10],
    ['127.0.0.0', 8],
    ['169.254.0.0', 16],
    ['172.16.0.0', 12],
    ['192.0.0.0', 24],
    ['192.0.2.0', 24],
    ['192.168.0.0', 16],
    ['198.18.0.0', 15],
    ['198.51.100.0', 24],
    ['203.0.113.0', 24],
    ['224.0.0.0', 4],
    ['240.0.0.0', 4],
  ];
  return !blocked.some(([base, bits]) => inCidr(ip, base, bits));
}
function isPublicIp(ip) {
  const version = net.isIP(ip);
  if (version === 4) return isPublicIpv4(ip);
  if (version !== 6) return false;
  const normalized = ip.toLowerCase();
  if (!/^[23][0-9a-f]{0,3}:/u.test(normalized)) return false;
  if (normalized.startsWith('2001:db8:') || normalized.startsWith('2001:0db8:')) return false;
  if (normalized.startsWith('2002:') || normalized.startsWith('2001:')) return false;
  return true;
}

async function resolvePublicHttpsUrl(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || !url.hostname)
    throw new Error('HTTPSの音声URLを指定してください。');
  if (url.username || url.password || (url.port && url.port !== '443'))
    throw new Error('認証情報付きURLや443以外のポートには対応していません。');
  if (url.hostname === 'localhost' || url.hostname.endsWith('.localhost'))
    throw new Error('ローカルホストへの接続は許可されていません。');
  const host = url.hostname.replace(/^\[|\]$/gu, '');
  let addrs;
  if (net.isIP(host)) addrs = [{ address: host }];
  else addrs = await dns.lookup(host, { all: true, verbatim: true });
  if (!addrs.length || addrs.some((entry) => !isPublicIp(entry.address)))
    throw new Error('非公開IPアドレスへの接続は許可されていません。');
  return { url, addrs };
}

export async function validatePublicHttpsUrl(value) {
  const { url } = await resolvePublicHttpsUrl(value);
  return url;
}

function pinnedLookup(addrs) {
  return (_hostname, opts, cb) => {
    const resolved = addrs.map(({ address }) => ({
      address,
      family: net.isIP(address),
    }));
    if (opts?.all) cb(null, resolved);
    else cb(null, resolved[0].address, resolved[0].family);
  };
}

function requestHttps(url, addrs, signal) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { lookup: pinnedLookup(addrs), signal }, (res) => resolve(res));
    req.once('error', reject);
  });
}

export async function downloadPublicAudio(
  value,
  destPath,
  { maxBytes = 50 * 1024 * 1024, timeoutMs = 60000, signal } = {},
) {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1)
    throw new RangeError('maxBytes must be a positive safe integer');
  let dest = await resolvePublicHttpsUrl(value);
  for (let redirects = 0; redirects <= 5; redirects += 1) {
    const reqSignal = signal
      ? AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)])
      : AbortSignal.timeout(timeoutMs);
    const res = await requestHttps(dest.url, dest.addrs, reqSignal);
    if ([301, 302, 303, 307, 308].includes(res.statusCode)) {
      const location = res.headers.location;
      res.destroy();
      if (!location) throw new Error('音声URLのリダイレクト先が不正です。');
      dest = await resolvePublicHttpsUrl(new URL(location, dest.url).toString());
      continue;
    }
    if (res.statusCode < 200 || res.statusCode >= 300) {
      res.destroy();
      throw new Error(`音声URLの取得に失敗しました (HTTP ${res.statusCode})`);
    }
    const type = (res.headers['content-type'] ?? '').split(';')[0].toLowerCase();
    if (type && !type.startsWith('audio/') && type !== 'application/octet-stream') {
      res.destroy();
      throw new Error('音声ファイルではないContent-Typeが返されました。');
    }
    const declared = Number(res.headers['content-length'] ?? 0);
    if (declared > maxBytes) {
      res.destroy();
      throw new Error('音声ファイルがサイズ上限を超えています。');
    }
    let total = 0;
    let fileOpen = false;
    const output = createWriteStream(destPath, { flags: 'wx' });
    output.once('open', () => {
      fileOpen = true;
    });
    try {
      await pipeline(
        res,
        new Transform({
          transform(chunk, _enc, cb) {
            total += chunk.length;
            if (total > maxBytes) {
              cb(new Error('音声ファイルがサイズ上限を超えています。'));
              return;
            }
            cb(null, chunk);
          },
        }),
        output,
        { signal: reqSignal },
      );
    } catch (err) {
      if (fileOpen) {
        try {
          await fs.rm(destPath, { force: true });
        } catch (cleanupErr) {
          throw new AggregateError(
            [err, cleanupErr],
            'Audio download failed and its partial file could not be removed.',
          );
        }
      }
      throw err;
    }
    if (!total) {
      await fs.rm(destPath, { force: true });
      throw new Error('空の音声ファイルが返されました。');
    }
    return { path: destPath, url: dest.url.toString() };
  }
  throw new Error('リダイレクト回数が上限を超えました。');
}
