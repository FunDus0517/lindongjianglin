/**
 * 版本检测：游戏自己判断"服务器上有没有更新"，不依赖 App 重新签名。
 *
 * 原理：站点根目录有一份 `version.json`（由 tools/gen-version.mjs 从 build.js + changelog.js 生成）。
 * 打开游戏时用它跟本地的 BUILD 比一比：不一样 = 服务器已经发了新版 → 顶部弹一个「有新版本」按钮，
 * 点一下刷新页面就是最新内容（内容都在服务器上，所以**改内容永远不用重新出包/签名**）。
 *
 * 离线、拿不到文件、解析失败都返回 null：不打扰玩家，也绝不阻塞游戏。
 * @module systems/Update
 */
import { BUILD, VERSION } from '../data/build.js';
import { CHANGELOG, LATEST } from '../data/changelog.js';

/** 本地这一份的版本信息（离线也能看公告）。 */
export function local() {
  return {
    version: VERSION,
    build: BUILD,
    title: LATEST?.title ?? '',
    notes: LATEST?.notes ?? [],
    history: CHANGELOG,
  };
}

/**
 * 问服务器要版本信息。
 * @returns {Promise<null|{hasUpdate:boolean,version:string,build:string,title:string,notes:string[],history:object[]}>}
 */
export async function check() {
  try {
    if (typeof fetch !== 'function') return null;
    const res = await fetch(`./version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const info = await res.json();
    if (!info || typeof info.build !== 'string') return null;
    return {
      hasUpdate: info.build !== BUILD,
      version: String(info.version ?? ''),
      build: info.build,
      title: String(info.title ?? ''),
      notes: Array.isArray(info.notes) ? info.notes.map(String) : [],
      history: Array.isArray(info.history) ? info.history : CHANGELOG,
    };
  } catch {
    return null;   // 离线/跨域/文件缺失：当作没有更新
  }
}

/** 刷新到最新内容（浏览器会按服务器的 no-cache 头重新校验每个文件）。 */
export function reload() {
  try { globalThis.location?.reload?.(); } catch { /* 垫片环境忽略 */ }
}
