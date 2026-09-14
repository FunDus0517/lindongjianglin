/**
 * 科技（无限生存方案 §四）。四条线各自独立升级，成本是晶核与蓝图。
 *
 * 接入点（都是加性加成，等级 0 时全为 0，保证旧存档行为不变）：
 *   warmth    → Base.indoorWarmth（室内保温℃）
 *   fuelSave  → Base.dailySettlement（每日燃油消耗打折）
 *   loot      → Event.rollLoot（搜刮收益）
 *   defense   → Battle.playerDef 与夜袭频率
 *   raidRisk  → GameTime.rollNight 的触发间隔
 * @module systems/Tech
 */
import { MAX_TECH_LEVEL, TECH_LINES, costOf, techLine } from '../data/tech.js';
import { clamp } from '../core/util.js';

export const DEFAULT = {};
export const level = (state, id) => clamp(state.tech?.[id] ?? 0, 0, MAX_TECH_LEVEL);
export const maxed = (state, id) => level(state, id) >= MAX_TECH_LEVEL;

/** 汇总所有科技线在当前等级下的加成。 */
export function bonus(state) {
  const out = { warmth: 0, fuelSave: 0, loot: 0, defense: 0, raidRisk: 0, waterLoop: 0, foodSave: 0 };
  for (const line of TECH_LINES) {
    const lv = level(state, line.id);
    if (lv <= 0) continue;
    for (const [k, v] of Object.entries(line.effect)) out[k] = (out[k] ?? 0) + v * lv;
  }
  return out;
}

/** 下一级的成本；已满级返回 null。 */
export function nextCost(state, id) {
  if (maxed(state, id)) return null;
  return costOf(id, level(state, id));
}

/** 能不能研究：true 或明确原因。 */
export function canResearch(state, id) {
  const line = techLine(id);
  if (!line) return '没有这条科技线';
  if (maxed(state, id)) return '已经研究到顶了';
  const cost = nextCost(state, id);
  if ((state.cores ?? 0) < (cost.cores ?? 0)) return `晶核不足（需要 ${cost.cores}）`;
  if ((state.inventory?.blueprint ?? 0) < (cost.blueprint ?? 0)) return `蓝图不足（需要 ${cost.blueprint}）`;
  return true;
}

/** 研究一级：返回标准 Outcome，由 effects 统一结算。 */
export function research(state, id) {
  const line = techLine(id);
  if (!line) return { ok: false, reason: '没有这条科技线' };
  const ok = canResearch(state, id);
  if (ok !== true) return { ok: false, reason: ok };
  const cost = nextCost(state, id);
  const next = level(state, id) + 1;
  // 研究室缩短研究时间（直接读 base，避免 Base ↔ Tech 循环依赖）
  const fast = 1 - Math.min(0.5, 0.08 * (state.base?.research ?? 0));
  return {
    ok: true,
    minutes: Math.round(180 * fast),
    cores: -(cost.cores ?? 0),
    items: cost.blueprint ? { blueprint: -cost.blueprint } : {},
    tech: { [id]: 1 },
    notes: [`你花了大半天拆改管线，把${line.name}推进到 ${next} 级。`, line.levels[next - 1]?.desc ?? ''],
    toast: { text: `${line.icon} ${line.name} Lv.${next}`, kind: 'mind' },
    flags: { [`tech_${id}_${next}`]: true },
  };
}

/** 界面视图：四条线的等级、下一级成本与可用状态。 */
export function view(state) {
  return TECH_LINES.map((line) => {
    const lv = level(state, line.id);
    const lock = canResearch(state, line.id);
    return {
      ...line,
      level: lv,
      max: lv >= MAX_TECH_LEVEL,
      next: lv >= MAX_TECH_LEVEL ? null : line.levels[lv],
      cost: nextCost(state, line.id),
      available: lock === true,
      reason: lock === true ? null : lock,
      current: lv > 0 ? line.levels[lv - 1]?.desc ?? '' : '尚未研究',
    };
  });
}

export const totalLevels = (state) => TECH_LINES.reduce((a, l) => a + level(state, l.id), 0);

export { TECH_LINES, MAX_TECH_LEVEL };
