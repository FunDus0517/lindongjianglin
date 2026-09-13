/**
 * 本地静态服务（零构建交付，为手机访问做过优化）。
 *
 * 三个决定手机加载速度的点：
 * 1. 压缩：所有文本资源按 Accept-Encoding 走 brotli/gzip（events.js 171KB → 约 25KB）；
 * 2. 缓存：不再用 no-store，而是 ETag + no-cache（每次校验、没变就 304 空响应），
 *    第二次打开几乎不传数据，但改了代码立刻生效；
 * 3. 连接：默认绑定 0.0.0.0，同一 Wi-Fi 的手机直连本机，不经公网隧道。
 *
 * 环境变量：PORT（默认 8123）、HOST（默认 0.0.0.0）
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { gzipSync, brotliCompressSync, constants as zlibConstants } from 'node:zlib';
import { createHash } from 'node:crypto';
import { networkInterfaces } from 'node:os';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const PORT = Number(process.env.PORT ?? 8123);
const HOST = process.env.HOST ?? '0.0.0.0';
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};
const TEXTY = new Set(['.html', '.js', '.mjs', '.css', '.json', '.webmanifest', '.svg']);

/** 已压缩内容的缓存：按 路径+mtime+size 复用，避免每次请求重复压缩。 */
const cache = new Map();
const MAX_CACHE = 200;

async function load(file) {
  const info = await stat(file);
  const key = `${file}:${info.mtimeMs}:${info.size}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const raw = await readFile(file);
  const ext = extname(file);
  const type = TYPES[ext] ?? 'application/octet-stream';
  const entry = {
    raw,
    type,
    texty: TEXTY.has(ext),
    etag: `"${createHash('sha1').update(raw).digest('base64url')}"`,
    gzip: null,
    br: null,
  };
  if (cache.size >= MAX_CACHE) cache.clear();
  cache.set(key, entry);
  return entry;
}

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const rel = normalize(decodeURIComponent(url.pathname)).replace(/^([/\\])+/, '');
  const file = join(ROOT, rel === '' ? 'index.html' : rel);
  if (!file.startsWith(ROOT)) { res.writeHead(403).end('forbidden'); return; }

  let entry;
  try {
    entry = await load(file);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('not found');
    return;
  }

  const headers = {
    'content-type': entry.type,
    etag: entry.etag,
    // 缓存但每次校验：没改就是 304（手机第二次打开几乎不传数据），改了立刻生效
    'cache-control': 'no-cache',
    vary: 'Accept-Encoding',
  };

  if (req.headers['if-none-match'] === entry.etag) {
    res.writeHead(304, headers).end();
    return;
  }

  if (!entry.texty) {
    headers['content-length'] = entry.raw.length;
    res.writeHead(200, headers).end(req.method === 'HEAD' ? undefined : entry.raw);
    return;
  }

  const accept = String(req.headers['accept-encoding'] ?? '');
  let body = entry.raw;
  if (/\bbr\b/.test(accept)) {
    entry.br = entry.br ?? brotliCompressSync(entry.raw, {
      params: { [zlibConstants.BROTLI_PARAM_QUALITY]: 5, [zlibConstants.BROTLI_PARAM_SIZE_HINT]: entry.raw.length },
    });
    body = entry.br;
    headers['content-encoding'] = 'br';
  } else if (/\bgzip\b/.test(accept)) {
    entry.gzip = entry.gzip ?? gzipSync(entry.raw, { level: 6 });
    body = entry.gzip;
    headers['content-encoding'] = 'gzip';
  }
  headers['content-length'] = body.length;
  res.writeHead(200, headers).end(req.method === 'HEAD' ? undefined : body);
}).listen(PORT, HOST, () => {
  console.log(`凛冬降临 · 本地预览：http://127.0.0.1:${PORT}/`);
  if (HOST === '0.0.0.0') {
    for (const list of Object.values(networkInterfaces())) {
      for (const net of list ?? []) {
        // 跳过回环与 169.254.* 自动私有地址：对手机没有意义，列出来只会误导
        if (net.family !== 'IPv4' || net.internal) continue;
        if (net.address.startsWith('169.254.')) continue;
        console.log(`凛冬降临 · 手机访问（同一 Wi-Fi，最快）：http://${net.address}:${PORT}/`);
      }
    }
  }
});
