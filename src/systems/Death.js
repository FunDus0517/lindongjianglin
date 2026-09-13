/**
 * 倒地与复活（商业化升级追加需求：**死亡不算结局**）。
 *
 * 生命归零不再结束这一局：你会丢掉「倒下前最后一段时间里搜集到的物资」，
 * 被人拖回住所，然后继续活下去。代价是那批物资、两个小时和一部分精神。
 *
 * 口径说明：需求写的是"死亡前 1 分钟"。游戏内 1 分钟几乎不可能产生入账
 * （一个动作就是 15—60 分钟），按字面实现等于没有惩罚，所以这里取
 * **最近 60 分钟 = 最近一次外出搜集的收获**。要改口径只动 LOST_WINDOW_MIN。
 * @module systems/Death
 */
import { clamp } from '../core/util.js';
import { item } from '../data/items.js';
import * as Inventory from './Inventory.js';

/** 丢失窗口（游戏内分钟）。 */
export const LOST_WINDOW_MIN = 60;
/**
 * 回退窗口：如果最近 60 分钟里没有入账（例如夜里冻死、或者已经在家待了半天），
 * 就退回到"最近一次入账"所在的这一批，只要它在 12 小时以内。
 * 否则倒地经常一点代价都没有，惩罚形同虚设。
 */
export const FALLBACK_MIN = 720;
/** 复活后的保底状态：必须能撑过接下来的结算，否则会连环倒地。 */
export const REVIVE = { hp: 30, warmth: 42, minutes: 120, mindCost: 6 };
/** 记录保留时长，避免存档无限增长。 */
const KEEP_MIN = 1440;
const MAX_ENTRIES = 40;

export const DEFAULT = () => ({ deaths: 0, recent: [] });

/** 游戏内绝对分钟数（跨日连续）。 */
export const absolute = (state) => (state.day - 1) * 1440 + state.time;

export const deaths = (state) => state.death?.deaths ?? 0;

/**
 * 记录一次物资入账，供倒地时回算。只记正数（搜集/产出），
 * 消耗与花费不参与，免得把"吃掉的饭"也算成丢失。
 */
export function recordGain(state, items, reason = '') {
  if (!items) return;
  const gains = {};
  for (const [id, n] of Object.entries(items)) if (n > 0) gains[id] = n;
  if (Object.keys(gains).length === 0) return;
  state.death = state.death ?? DEFAULT();
  const now = absolute(state);
  state.death.recent.push({ at: now, items: gains, reason });
  state.death.recent = state.death.recent.filter((e) => e.at >= now - KEEP_MIN).slice(-MAX_ENTRIES);
}

/** 这一次倒地会丢哪一批入账（与 handle 用同一套窗口规则，界面预览不会骗人）。 */
export function lossWindow(state) {
  const all = state.death?.recent ?? [];
  const now = absolute(state);
  const inWindow = all.filter((e) => e.at >= now - LOST_WINDOW_MIN);
  if (inWindow.length > 0) return inWindow;
  const recentEnough = all.filter((e) => e.at >= now - FALLBACK_MIN);
  return recentEnough.length > 0 ? [recentEnough[recentEnough.length - 1]] : [];
}

/** 当前"倒地会丢什么"的预览（界面用）。 */
export function atRisk(state) {
  const lost = {};
  for (const e of lossWindow(state)) {
    for (const [id, n] of Object.entries(e.items)) lost[id] = (lost[id] ?? 0) + n;
  }
  const rows = Object.entries(lost)
    .map(([id, n]) => ({ id, name: item(id).name, n: Math.min(n, Inventory.count(state, id)) }))
    .filter((r) => r.n > 0);
  return { total: rows.reduce((a, r) => a + r.n, 0), rows };
}

/**
 * 倒地处理：结算损失 + 把状态抬回安全线。**不推进时间**——
 * 时间由 GameTime 统一推进（那里才有跨日与每日刷新）。
 * @returns {{cause:string, lost:object, lostNames:string[], minutes:number, notes:string[]}}
 */
export function handle(state, cause = 'ice') {
  state.death = state.death ?? DEFAULT();
  const all = state.death.recent ?? [];
  const window = lossWindow(state);

  // 汇总窗口内的入账，再按仓库实际剩余量扣除（可能已经被吃掉/加工掉）
  const want = {};
  for (const e of window) for (const [id, n] of Object.entries(e.items)) want[id] = (want[id] ?? 0) + n;
  const lost = {};
  const lostNames = [];
  for (const [id, n] of Object.entries(want)) {
    const take = Math.min(Inventory.count(state, id), n);
    if (take <= 0) continue;
    Inventory.remove(state, id, take);
    lost[id] = take;
    lostNames.push(`${item(id).name}×${take}`);
  }

  // 这批入账已经清空，避免同一次损失被重复计算
  state.death.recent = all.filter((e) => !window.includes(e));
  state.death.deaths = (state.death.deaths ?? 0) + 1;

  const s = state.stats;
  s.hp = Math.max(s.hp, REVIVE.hp);
  s.warmth = Math.max(s.warmth, REVIVE.warmth);
  s.energy = clamp(s.energy, 10, 100);
  s.mind = clamp(s.mind - REVIVE.mindCost, 0, 100);

  const why = cause === 'starve' ? '你不是被冻死的，是饿到站不起来的' : '失温让你失去了意识';
  const notes = [
    `${why}。有人把你拖回了屋里——你不知道是谁。`,
    lostNames.length > 0
      ? `醒来时，你最近一次搜集的东西不见了：${lostNames.join('、')}。`
      : '醒来时，身上什么都没有少——但那种感觉还在。',
  ];
  return { cause, lost, lostNames, minutes: REVIVE.minutes, notes };
}

export { Inventory };
