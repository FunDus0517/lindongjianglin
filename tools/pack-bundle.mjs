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
const hash = createHash('sha256');
let rawBytes = 0;

for (const rel of files) {
  const full = join(srcDir, rel);
  const info = await stat(full);
  // 清单是「一堆文本文件」的 JSON（iOS 侧直接 Data(utf8) 写盘），所以只收文本。
  // 二进制资源（如中央场景图 assets/*.png）跳过并明确报出来——不能让整条 App 更新链断掉。
  if (info.size > 2 * 1024 * 1024) { skipped.push(`${rel}（${(info.size / 1048576).toFixed(1)} MB，超 2 MB）`); continue; }
  const buf = await readFile(full);
  const text = buf.toString('utf8');
  if (text.includes('\uFFFD')) { skipped.push(`${rel}（二进制）`); continue; }
  bundle[rel] = text;
  hash.update(rel).update(text);
  rawBytes += info.size;
}

const version = forcedVersion ?? hash.digest('hex').slice(0, 16);
const payload = { version, generatedAt: new Date().toISOString(), count: files.length, files: bundle };

await writeFile(outFile, JSON.stringify(payload), 'utf8');
const size = (await stat(outFile)).size;
console.log(`清单已生成：${outFile}`);
console.log(`  版本   : ${version}`);
console.log(`  文件数 : ${files.length - skipped.length}（跳过 ${skipped.length}）`);
console.log(`  原始   : ${(rawBytes / 1024).toFixed(0)} KB`);
console.log(`  清单   : ${(size / 1024).toFixed(0)} KB（gzip 后由服务器自动压缩）`);
if (skipped.length) {
  console.log('  跳过的非文本资源（App 离线包不带，站点原样照样能用）：');
  for (const s of skipped) console.log(`    - ${s}`);
}
