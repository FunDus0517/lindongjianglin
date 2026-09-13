/**
 * 基地与设施（项目书 §10）。等级制：升级需要材料与时间，且每天最多升两处设施，
 * 升级后必须有明显数值反馈。10 级封顶，后期收益做了饱和处理，避免数值失控。
 * @module systems/Base
 */
import { ITEMS, RECIPES } from '../data/items.js';
import { applyItems, canFit, count, has } from './Inventory.js';
import { enhanceLevel } from './Mind.js';

/** 每天最多升级的设施数量：让「今天先升哪个」成为一个真实选择。 */
export const DAILY_UPGRADE_LIMIT = 2;
export const MAX_LEVEL = 10;

const cap = (l, max) => Math.min(l, max);

export const FACILITIES = [
  { id: 'shelter', name: '住所', icon: '🏠', desc: '提升休息恢复效率与室内保温。', max: MAX_LEVEL,
    cost: (l) => ({ wood: l, metal: l }), minutes: (l) => 60 + 30 * l,
    effect: (l) => `休息恢复 +${l * 8}%｜室内 +${Math.round(l * 0.8)}℃` },
  { id: 'storage', name: '仓库', icon: '📦', desc: '提升存储容量。', max: MAX_LEVEL,
    cost: (l) => ({ wood: l + 1, metal: l }), minutes: (l) => 40 + 20 * l,
    effect: (l) => `容量 +${l * 40}` },
  { id: 'heating', name: '供暖', icon: '🔥', desc: '降低寒冷带来的体温压力（每级每天耗 1 份燃料）。', max: MAX_LEVEL,
    cost: (l) => ({ metal: l, parts: l >= 2 ? l - 1 : 0, insulation: l }), minutes: (l) => 60 + 25 * l,
    effect: (l) => `室内 +${l * 6}℃｜每日耗燃料 ${l}` },
  { id: 'power', name: '能源', icon: '🔌', desc: '维持照明与光脑运算（每级每天耗 1 份燃油）。', max: MAX_LEVEL,
    cost: (l) => ({ parts: Math.ceil(l / 2) + 1, fuel: Math.ceil(l / 3) }), minutes: (l) => 60 + 30 * l,
    effect: (l) => `光脑经验 +${cap(l, 5) * 10}%｜精神衰减 −${cap(l, 8) * 5}%` },
  { id: 'greenhouse', name: '温室', icon: '🌱', desc: '生产稳定食物并开启农业路线。', max: MAX_LEVEL,
    cost: (l) => ({ wood: l, insulation: l, seeds: Math.ceil(l / 3) }), minutes: (l) => 90 + 30 * l,
    effect: (l) => `每日产出 ${l} 份种植产物` },
  { id: 'medical', name: '医疗区', icon: '⛑️', desc: '降低治疗消耗。', max: MAX_LEVEL,
    cost: (l) => ({ wood: l, medicine: Math.ceil(l / 3) }), minutes: (l) => 60 + 30 * l,
    effect: (l) => `医疗品效果 +${cap(l, 5) * 15}%` },
  { id: 'defense', name: '防御设施', icon: '🛡️', desc: '降低遇敌与尸潮风险。', max: MAX_LEVEL,
    cost: (l) => ({ metal: l + 2, wood: l }), minutes: (l) => 90 + 30 * l,
    effect: (l) => `遇敌风险 −${cap(l, 8) * 8}%` },
  { id: 'workshop', name: '加工设施', icon: '🔨', desc: '解锁加工配方，高级后提升产量。', max: MAX_LEVEL,
    cost: (l) => ({ metal: l, parts: Math.ceil(l / 2) + 1 }), minutes: (l) => 90 + 30 * l,
    effect: (l) => `解锁 ${cap(l, 3)} 级配方｜每次加工额外产出 +${cap(Math.max(l - 3, 0), 2)}` },
];

export const facility = (id) => FACILITIES.find((f) => f.id === id);
export const RECIPES_COUNT = RECIPES.length;
export const level = (state, id) => state.base[id] ?? 0;
export const heatingBonus = (state) => level(state, 'heating');
/** 室内保温：供暖每级 6℃，住所每级 0.8℃（不进燃料消耗）。 */
export const indoorWarmth = (state) => heatingBonus(state) * 6 + level(state, 'shelter') * 0.8;
export const defenseMod = (state) => 1 - cap(level(state, 'defense'), 8) * 0.08;

/** 今日剩余升级次数（每天 06:00 刷新）。 */
export function upgradesLeft(state) {
  const used = state.baseUpgrades?.day === state.day ? (state.baseUpgrades.count ?? 0) : 0;
  return Math.max(0, DAILY_UPGRADE_LIMIT - used);
}

function noteUpgrade(state) {
  if (state.baseUpgrades?.day !== state.day) state.baseUpgrades = { day: state.day, count: 0 };
  state.baseUpgrades.count += 1;
}

/** 升到下一级的消耗；已满级返回 null。 */
export function upgradeCost(state, id) {
  const f = facility(id);
  const l = level(state, id);
  if (l >= f.max) return null;
  return { items: f.cost(l + 1), minutes: f.minutes(l + 1) };
}

export function canUpgrade(state, id) {
  const cost = upgradeCost(state, id);
  if (!cost) return `已达到最高等级（${MAX_LEVEL} 级）`;
  if (upgradesLeft(state) <= 0) return `今日升级次数已用完（每天 ${DAILY_UPGRADE_LIMIT} 处，06:00 刷新）`;
  // 升级只消耗材料，不占容量，因此这里不做容量检查（曾经误用 canFit 的正数语义，
  // 导致仓库快满时把「花掉材料」判成「容量不足」，设施直接升不动）。
  for (const [itemId, n] of Object.entries(cost.items)) {
    if (count(state, itemId) < n) return `材料不足：${itemName(itemId)}×${n}（现有 ${count(state, itemId)}）`;
  }
  return true;
}

const itemName = (id) => ITEMS[id]?.name ?? id;

/** 执行升级，返回可被 effects 结算的结果（含耗时，由 effects 统一推进时间）。 */
export function upgrade(state, id) {
  const ok = canUpgrade(state, id);
  if (ok !== true) return { ok: false, reason: ok };
  const cost = upgradeCost(state, id);
  const applied = applyItems(state, Object.fromEntries(Object.entries(cost.items).map(([k, v]) => [k, -v])));
  if (!applied.ok) return applied;
  state.base[id] = level(state, id) + 1;
  noteUpgrade(state);
  const f = facility(id);
  const left = upgradesLeft(state);
  return {
    ok: true,
    minutes: cost.minutes,
    notes: [`花了 ${cost.minutes} 分钟，把${f.name}升到 ${state.base[id]} 级。${f.effect(state.base[id])}`],
    toasts: [{
      text: `${f.name} Lv.${state.base[id]}/${MAX_LEVEL}（耗时 ${cost.minutes} 分钟）｜今日还可升级 ${left} 处`,
      kind: 'good',
    }],
    flags: id === 'heating' ? { heat_on: true } : {},
  };
}

/** 可用配方：按加工设施等级解锁。 */
export const recipes = (state) => RECIPES.filter((r) => level(state, 'workshop') >= r.workshop);

/** 是否拥有配方所需材料。 */
export function canCraft(state, recipeId) {
  const r = RECIPES.find((x) => x.id === recipeId);
  if (!r) return '配方不存在';
  if (level(state, 'workshop') < r.workshop) return `需要加工设施 ${r.workshop} 级`;
  for (const [id, n] of Object.entries(r.in)) if (!has(state, id, n)) return `材料不足：${id}×${n}`;
  return true;
}

export function craft(state, recipeId) {
  const r = RECIPES.find((x) => x.id === recipeId);
  const ok = canCraft(state, recipeId);
  if (ok !== true) return { ok: false, reason: ok };
  const changes = { ...Object.fromEntries(Object.entries(r.in).map(([k, v]) => [k, -v])), ...r.out };
  const applied = applyItems(state, changes);
  if (!applied.ok) return applied;
  return { ok: true, minutes: r.minutes, notes: [`加工完成：${r.name}。`], toasts: [{ text: `产出 ${r.name}`, kind: 'good' }], daily: { craft: 1 } };
}

/** 每日产出（供暖/能源消耗、温室产出），在每日刷新时结算。 */
export function dailySettlement(state) {
  const notes = [];
  const changes = {};
  const gh = level(state, 'greenhouse') + enhanceLevel(state, 'greenhouse');
  if (gh > 0) changes.produce = (changes.produce ?? 0) + gh;

  const heat = level(state, 'heating');
  if (heat > 0) {
    const useCharcoal = Math.min(count(state, 'charcoal'), heat);
    const useWood = Math.min(count(state, 'firewood'), heat - useCharcoal);
    if (useCharcoal + useWood > 0) {
      changes.charcoal = -useCharcoal;
      changes.firewood = -useWood;
      notes.push(`供暖消耗燃料 ${useCharcoal + useWood} 份。`);
    }
    if (useCharcoal + useWood < heat) notes.push('燃料不足，供暖效果下降。');
  }

  const power = level(state, 'power');
  if (power > 0) {
    const useFuel = Math.min(count(state, 'fuel'), power);
    if (useFuel > 0) {
      changes.fuel = -useFuel;
      notes.push(`能源设施消耗燃油 ${useFuel} 份，照明与光脑运算正常。`);
      state.flags.energy_ok = true;
    } else {
      notes.push('能源设施燃油耗尽：光脑加成失效，夜间照明中断。');
      state.flags.energy_ok = false;
    }
  } else {
    state.flags.energy_ok = true;
  }

  if (Object.keys(changes).length > 0) applyItems(state, changes);
  return notes;
}
