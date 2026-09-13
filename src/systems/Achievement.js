/**
 * 成就系统（商业化升级 §七：成就系统）。
 * 判定条件全部写在 data/achievements.js 里，这里只负责：跑判定 → 发奖励 → 广播给界面。
 * 每次 Outcome 结算后与每日刷新时各跑一次，成本是 25 次纯状态读取，可以忽略。
 * @module systems/Achievement
 */
import { ACHIEVEMENTS, ACHIEVEMENT_CATS, TOTAL_ACHIEVEMENTS, achievement } from '../data/achievements.js';
import { toast } from '../core/store.js';
import * as Fame from './Fame.js';
import * as Growth from './Growth.js';
import * as Inventory from './Inventory.js';

export const DEFAULT = {};
export const isUnlocked = (state, id) => Boolean(state.achievements?.[id]);
export const unlockedCount = (state) => Object.keys(state.achievements ?? {}).length;

/**
 * 派生两个"跨系统才看得出来"的 Flag，成就条件就能写得像规则：
 * - storage_nearly_full：仓库占用到 80%
 * - near_death_survived：生命掉到 15 以下之后又回到 25 以上
 */
function derivedFlags(state) {
  state.flags = state.flags ?? {};
  const cap = Inventory.capacity(state);
  if (cap > 0 && Inventory.used(state) >= cap * 0.8) state.flags.storage_nearly_full = true;

  const hp = state.stats?.hp ?? 100;
  if (hp < 15) { state.flags.low_hp_seen = state.day; return; }
  if (state.flags.low_hp_seen && hp >= 25) state.flags.near_death_survived = true;
}

/** 跑一遍判定，返回本次新解锁的成就定义列表。 */
export function sync(state, opts = {}) {
  state.achievements = state.achievements ?? {};
  derivedFlags(state);
  const newly = [];
  for (const a of ACHIEVEMENTS) {
    if (state.achievements[a.id]) continue;
    let ok = false;
    // 单条成就判定出错不能拖垮整局游戏
    try { ok = a.check(state) === true; } catch { ok = false; }
    if (!ok) continue;

    state.achievements[a.id] = { day: state.day, time: state.time };
    const r = a.reward ?? {};
    if (r.currency) state.currency = Math.max(0, (state.currency ?? 0) + r.currency);
    if (r.cores) state.cores = Math.max(0, (state.cores ?? 0) + r.cores);
    if (r.fame) Fame.change(state, r.fame);
    Growth.addXp(state, 15 + (r.growth ?? 0));

    const parts = [];
    if (r.currency) parts.push(`货币 +${r.currency}`);
    if (r.cores) parts.push(`晶核 +${r.cores}`);
    if (r.fame) parts.push(`锋芒 +${r.fame}`);
    toast(`成就解锁：${a.icon} ${a.name}${parts.length ? `｜${parts.join(' ')}` : ''}`, 'mind');
    (state.log = state.log ?? []).push({
      day: state.day, time: state.time,
      text: `成就解锁：${a.icon} ${a.name}${parts.length ? `（${parts.join(' ')}）` : ''}`,
      kind: 'mind',
    });
    newly.push(a);
  }
  if (newly.length > 0 && opts.onUnlock) opts.onUnlock(newly);
  return newly;
}

/** 单条成就的当前进度（没有 progress 的返回 null）。 */
export function progressOf(state, id) {
  const a = achievement(id);
  if (!a?.progress) return null;
  try { return a.progress(state); } catch { return null; }
}

/** 界面视图：按分类分组，未解锁的显示进度。 */
export function view(state) {
  const list = ACHIEVEMENTS.map((a) => {
    const at = state.achievements?.[a.id] ?? null;
    const p = at ? null : progressOf(state, a.id);
    const hidden = Boolean(a.hidden) && !at;
    return {
      id: a.id,
      name: hidden ? '???' : a.name,
      icon: hidden ? '🔒' : a.icon,
      cat: a.cat,
      desc: hidden ? '达成后才会显示。' : a.desc,
      hidden,
      unlocked: Boolean(at),
      at,
      reward: a.reward ?? {},
      progress: p,
      ratio: p && p.goal ? Math.min(1, p.now / p.goal) : at ? 1 : 0,
    };
  });
  return {
    list,
    total: TOTAL_ACHIEVEMENTS,
    unlocked: unlockedCount(state),
    cats: ACHIEVEMENT_CATS,
  };
}

export { ACHIEVEMENTS, ACHIEVEMENT_CATS, TOTAL_ACHIEVEMENTS, achievement };
