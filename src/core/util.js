/** 通用工具：确定性随机、数值夹取、时间与文本格式化。@module core/util */

export const clamp = (v, lo = 0, hi = 100) => (v < lo ? lo : v > hi ? hi : v);
export const round1 = (v) => Math.round(v * 10) / 10;
export const sum = (obj) => Object.values(obj).reduce((a, b) => a + b, 0);

/**
 * 确定性随机（mulberry32）。种子与游标都保存在存档里，
 * 因此同一存档重放同一行动序列得到同一结果 —— 引擎测试可复现。
 */
export function nextRandom(state) {
  state.rngCursor = (state.rngCursor + 1) >>> 0;
  let t = (state.seed + state.rngCursor * 0x6d2b79f5) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
export const chance = (state, p) => nextRandom(state) < p;
export const randInt = (state, lo, hi) => lo + Math.floor(nextRandom(state) * (hi - lo + 1));
export function pick(state, list) { return list.length === 0 ? undefined : list[Math.floor(nextRandom(state) * list.length)]; }
export function weightedPick(state, entries) {
  const total = entries.reduce((a, e) => a + (e.weight ?? 1), 0);
  if (total <= 0) return undefined;
  let r = nextRandom(state) * total;
  for (const e of entries) { r -= e.weight ?? 1; if (r <= 0) return e; }
  return entries[entries.length - 1];
}

/** 分钟 → HH:MM（游戏内时钟）。 */
export function fmtClock(minutes) {
  const m = ((minutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(Math.floor(m % 60)).padStart(2, '0')}`;
}
/** 分钟 → “1小时30分”。 */
export function fmtDuration(minutes) {
  if (minutes < 60) return `${Math.round(minutes)}分`;
  const h = Math.floor(minutes / 60), m = Math.round(minutes % 60);
  return m === 0 ? `${h}小时` : `${h}小时${m}分`;
}
export function dayPhase(minutes) {
  if (minutes < 360) return 'night';
  if (minutes < 720) return 'morning';
  if (minutes < 1080) return 'afternoon';
  if (minutes < 1320) return 'evening';
  return 'night';
}
export const PHASE_LABEL = { morning: '上午', afternoon: '下午', evening: '晚上', night: '夜间' };
export const CAT_LABEL = { food: '食物', water: '饮水', energy: '能源', build: '建筑', medical: '医疗', weapon: '武器', agri: '农业', special: '特殊' };

/** '+3' / '-12' 形式的数值反馈文本。 */
export const signed = (v) => (v > 0 ? `+${round1(v)}` : `${round1(v)}`);
export const pct = (v, max = 100) => `${Math.round((v / max) * 100)}%`;
export const idOf = (s) => String(s).replace(/\s+/g, '_').toLowerCase();
