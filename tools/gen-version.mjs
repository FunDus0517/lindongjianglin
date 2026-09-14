/**
 * 生成站点根目录的 version.json —— 给游戏内「版本检测」用。
 * 事实来源只有两处：src/data/build.js（版本号/构建时间）与 src/data/changelog.js（更新公告）。
 * 用法：node tools/gen-version.mjs <输出目录>   （默认写到仓库根目录）
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { BUILD, VERSION } from '../src/data/build.js';
import { CHANGELOG } from '../src/data/changelog.js';

const outDir = process.argv[2] ?? '.';
const latest = CHANGELOG[0] ?? { title: '', notes: [] };
const payload = {
  version: VERSION,
  build: BUILD,
  title: latest.title ?? '',
  notes: Array.isArray(latest.notes) ? latest.notes : [],
  history: CHANGELOG,
  generatedAt: new Date().toISOString(),
};
const file = join(outDir, 'version.json');
writeFileSync(file, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
console.log(`version.json 已生成：${file}`);
console.log(`  版本 ${VERSION} · 构建 ${BUILD} · 公告 ${payload.notes.length} 条 · 历史 ${CHANGELOG.length} 版`);
