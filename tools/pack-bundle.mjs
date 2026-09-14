/**
 * 把部署目录打成**单文件 JSON 清单**，供 iOS 外壳做「云端更新」。
 *
 * 为什么是 JSON 而不是 zip：iOS 侧解压要么依赖第三方库，要么只能用在 iOS 16+ 的 API；
 * 而这个站点全是文本文件（无图片资源），一次性 JSON 就够了 —— 一个请求、写完即用。
 *
 * 用法：
 *   node tools/pack-bundle.mjs <站点目录> <输出文件> [版本号]
 *   node tools/pack-bundle.mjs ../winterfall-site ../winterfall-site-bundle.json
 */
import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile, stat } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';

const [, , srcDir = '.', outFile = 'site-bundle.json', forcedVersion] = process.argv;

async function walk(dir, base = dir, out = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) await walk(full, base, out);
    else if (entry.isFile()) out.push(relative(base, full).split(sep).join('/'));
  }
  return out;
}

const files = (await walk(srcDir)).sort();
const bundle = {};
const skipped = [];
const assets = [];
const hash = createHash('sha256');
let rawBytes = 0;

for (const rel of files) {
  const full = join(srcDir, rel);
  const info = await stat(full);
  const buf = await readFile(full);
  const text = buf.toString('utf8');
  // 清单的 files 段是纯文本（iOS 侧按 utf8 写盘），二进制/超大文件走 assets 段：
  // 只登记路径，App 更新时自己去服务器按路径拉文件 —— 这样连美术图也不用重新出包/签名。
  if (info.size > 2 * 1024 * 1024 || text.includes('\uFFFD')) {
    assets.push(rel);
    hash.update(rel).update(buf);            // 二进制也要进版本号，否则只换图不会触发更新
    skipped.push(`${rel}（${(info.size / 1048576).toFixed(1)} MB → assets 段，App 自己去服务器拉）`);
    continue;
  }
  bundle[rel] = text;
  hash.update(rel).update(text);
  rawBytes += info.size;
}

const version = forcedVersion ?? hash.digest('hex').slice(0, 16);
const payload = { version, generatedAt: new Date().toISOString(), count: files.length, assets, files: bundle };

await writeFile(outFile, JSON.stringify(payload), 'utf8');
const size = (await stat(outFile)).size;
console.log(`清单已生成：${outFile}`);
console.log(`  版本   : ${version}`);
console.log(`  文件数 : ${files.length - assets.length} 个文本 + ${assets.length} 个资源`);
console.log(`  原始   : ${(rawBytes / 1024).toFixed(0)} KB（文本）`);
console.log(`  清单   : ${(size / 1024).toFixed(0)} KB（gzip 后由服务器自动压缩）`);
if (skipped.length) {
  console.log('  走 assets 段的资源（App 更新时自己去服务器按路径拉）：');
  for (const s of skipped) console.log(`    - ${s}`);
}
