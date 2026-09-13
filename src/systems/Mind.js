/**
 * 光脑（项目书 §11）：游戏核心辅助系统与主要 UI 品牌识别。
 * 管家人格在第 1 天选择，其后所有提示语气与加成都由它决定。
 * @module systems/Mind
 */
import { clamp } from '../core/util.js';

export const BRAINS = {
  analyst: { id: 'analyst', name: '冷静分析型', icon: '📊', desc: '调查与情报收益更高', lootMod: 1.15, mindDecay: 1.0 },
  warm:    { id: 'warm', name: '温和陪伴型', icon: '🫧', desc: '精神衰减更慢', lootMod: 1.0, mindDecay: 0.8 },
  sharp:   { id: 'sharp', name: '毒舌督导型', icon: '⚡', desc: '行动耗时更短', lootMod: 1.0, mindDecay: 1.1, minutesMod: 0.95 },
};

export const brain = (state) => BRAINS[state.brain] ?? BRAINS.analyst;
export const XP_PER_LEVEL = 100;

/** 光脑经验：任何有信息价值的行为都会积累；能源设施提供加成（燃油断供时失效）。 */
export function addXp(state, amount) {
  state.mindXp += Math.max(0, Math.round(amount));
  let leveled = 0;
  while (state.mindXp >= XP_PER_LEVEL && state.mindLevel < 5) {
    state.mindXp -= XP_PER_LEVEL; state.mindLevel += 1; leveled += 1;
  }
  if (state.mindLevel >= 5) state.mindXp = Math.min(state.mindXp, XP_PER_LEVEL - 1);
  return leveled;
}

/** 能源设施当前提供的经验加成倍率（燃油断供时归零）。 */
export const powerBonus = (state) =>
  state.flags?.energy_ok === false ? 1 : 1 + (state.base.power ?? 0) * 0.1;

export const progress = (state) => ({ level: state.mindLevel, xp: state.mindXp, need: XP_PER_LEVEL });

/** 光脑提示语：语气随人格变化，内容来自真实状态。 */
export function hint(state, ctx = {}) {
  const b = brain(state);
  const s = state.stats;
  const raw = [];
  if (s.hp < 40) raw.push('生命值偏低，优先处理伤势');
  if (s.warmth < 35) raw.push('体温进入危险区，立刻回室内或用热源');
  if (s.hunger < 25) raw.push('饥饿影响生命恢复，尽快进食');
  if (s.thirst < 25) raw.push('饮水不足会快速降低行动能力');
  if (s.energy < 20) raw.push('精力见底，休息比行动更划算');
  if (s.mind < 30) raw.push('精神状态不稳，注意幻觉与错误判断');
  if (raw.length === 0) raw.push(ctx.fallback ?? '状态稳定，建议继续囤积食物与燃料');
  const wrap = { analyst: (t) => `分析：${t}。`, warm: (t) => `我们看一眼：${t}。`, sharp: (t) => `别废话：${t}。` }[b.id];
  return { brain: b, lines: raw.map(wrap) };
}

export const level = (state) => clamp(state.mindLevel, 1, 5);

/* ---------------- 晶核强化（项目书 §12） ---------------- */

/** 强化开放日：晶核在这一天之后的高强度战斗中开始出现。 */
export const ENHANCE_UNLOCK_DAY = 11;

export const ENHANCE = {
  person:     { id: 'person', name: '人物强化', icon: '🧍', desc: '生命、体温抗性、精力', cost: (l) => l + 1 },
  weapon:     { id: 'weapon', name: '武器强化', icon: '🗡️', desc: '伤害与稳定性', cost: (l) => l + 2 },
  gear:       { id: 'gear', name: '装备强化', icon: '🎽', desc: '防寒、防御、行动效率', cost: (l) => l + 2 },
  facility:   { id: 'facility', name: '设施强化', icon: '🏗️', desc: '容量与效率', cost: (l) => l + 2 },
  greenhouse: { id: 'greenhouse', name: '温室强化', icon: '🌱', desc: '产量与极寒适应性', cost: (l) => l + 3 },
};

export const enhanceLevel = (state, kind) => state.enhance?.[kind] ?? 0;

/** 强化：消耗晶核，立即产生可观察的数值变化。 */
export function enhance(state, kind) {
  const def = ENHANCE[kind];
  if (!def) return { ok: false, reason: '没有这种强化' };
  if (state.day < ENHANCE_UNLOCK_DAY) return { ok: false, reason: `强化将在第 ${ENHANCE_UNLOCK_DAY} 天开放` };
  const lv = enhanceLevel(state, kind);
  if (lv >= 5) return { ok: false, reason: '已达最高等级' };
  const cost = def.cost(lv);
  if (state.cores < cost) return { ok: false, reason: `晶核不足（需要 ${cost}）` };
  state.cores -= cost;
  state.enhance[kind] = lv + 1;
  const outcome = {
    ok: true,
    minutes: 60,
    notes: [`${def.name} 提升至 Lv.${lv + 1}。`],
    toasts: [{ text: `${def.name} Lv.${lv + 1}｜${def.desc}`, kind: 'mind' }],
  };
  if (kind === 'person') outcome.stats = { hp: 12, warmth: 5, mind: 6 };
  return outcome;
}
