/**
 * 仓库与资源（项目书 §6）。任何资源消耗都必须即时同步到仓库 —— 这里是唯一入口。
 * @module systems/Inventory
 */
import { ITEMS, item } from '../data/items.js';
import { enhanceLevel } from './Mind.js';

export const BASE_CAPACITY = 60;
export const STORAGE_PER_LEVEL = 40;
export const FACILITY_ENHANCE_CAPACITY = 10;

export const count = (state, id) => state.inventory[id] ?? 0;
export const has = (state, id, n = 1) => count(state, id) >= n;

/** 按分类统计总量（食物/饮水储备类任务使用）。 */
export function countCategory(state, cat) {
  let total = 0;
  for (const [id, n] of Object.entries(state.inventory)) if (item(id).cat === cat) total += n;
  return total;
}

export const capacity = (state) =>
  BASE_CAPACITY + (state.base.storage ?? 0) * STORAGE_PER_LEVEL + enhanceLevel(state, 'facility') * FACILITY_ENHANCE_CAPACITY;

export function used(state) {
  let total = 0;
  for (const [id, n] of Object.entries(state.inventory)) total += item(id).bulk * n;
  return total;
}

export const free = (state) => capacity(state) - used(state);

/**
 * 容量检查：只有「新增」占用容量；纯消耗永远不该因为容量被拒绝。
 * （曾经的写法把消耗也计入 incoming，导致仓库快满时连升级设施都会被判成容量不足。）
 * 返回 true 或明确的不可行原因。
 */
export function canFit(state, changes) {
  let incoming = 0;
  for (const [id, delta] of Object.entries(changes)) {
    if (delta > 0) incoming += item(id).bulk * delta;
  }
  if (incoming <= 0) return true;
  if (used(state) + incoming > capacity(state)) return `仓库容量不足（需 ${incoming}，剩余 ${free(state)}）`;
  return true;
}

/** 底层写入：不做容量校验。外部请一律使用 applyItems（唯一带容量守卫的入口）。 */
export function add(state, id, n = 1) {
  if (n <= 0) return;
  state.inventory[id] = count(state, id) + n;
}
/** 扣除资源；不足时按现有量扣除并返回 false。 */
export function remove(state, id, n = 1) {
  const have = count(state, id);
  const take = Math.min(have, n);
  if (take <= 0) return false;
  const left = have - take;
  if (left <= 0) delete state.inventory[id]; else state.inventory[id] = left;
  return take >= n;
}

/**
 * 批量结算一次资源变化（正负混合）。容量不足时拒绝全部新增并返回原因，
 * 保证不会出现“半截结果”。
 */
export function applyItems(state, changes = {}) {
  const fit = canFit(state, changes);
  if (fit !== true) return { ok: false, reason: fit };
  for (const [id, delta] of Object.entries(changes)) {
    if (delta >= 0) add(state, id, delta); else remove(state, id, -delta);
  }
  return { ok: true };
}

/** 使用物品：返回状态增量与叙事行，由 effects 统一结算。 */
export function consume(state, id) {
  if (!has(state, id)) return { ok: false, reason: `没有 ${item(id).name}` };
  const def = item(id);
  if (!def.use) return { ok: false, reason: `${def.name}不能直接使用` };
  remove(state, id, 1);
  return { ok: true, stats: { ...def.use }, notes: [`你使用了 ${def.name}。`] };
}

/** 仓库列表：按分类分组，支持搜索（项目书 §6）。 */
export function list(state, { cat, query } = {}) {
  const q = (query ?? '').trim().toLowerCase();
  return Object.entries(state.inventory)
    .filter(([id, n]) => n > 0 && (!cat || item(id).cat === cat) && (!q || item(id).name.toLowerCase().includes(q) || id.includes(q)))
    .map(([id, n]) => ({ ...item(id), qty: n }))
    .sort((a, b) => a.cat.localeCompare(b.cat) || a.name.localeCompare(b.name));
}

/* ---------------- 装备 ---------------- */

export const isWorn = (state, id) => (state.worn ?? []).includes(id);

/** 当前穿戴提供的战斗与御寒加成。 */
export function equipStats(state) {
  let weapon = 0, warmthResist = 0;
  for (const id of state.worn ?? []) {
    const e = item(id).equip ?? {};
    weapon = Math.max(weapon, e.weapon ?? 0);
    warmthResist += e.warmthResist ?? 0;
  }
  return { weapon, warmthResist, gear: warmthResist };
}

/** 装备/卸下。武器槽互斥（同一次只能拿一件近战武器）。 */
export function equip(state, id, on = true) {
  const def = item(id);
  if (on && !has(state, id)) return { ok: false, reason: `没有 ${def.name}` };
  state.worn = state.worn ?? [];
  if (on) {
    if (def.equip?.weapon) {
      state.worn = state.worn.filter((w) => !(item(w).equip?.weapon));
    }
    if (!state.worn.includes(id)) state.worn.push(id);
  } else {
    state.worn = state.worn.filter((w) => w !== id);
  }
  const notes = [on ? `你装备了 ${def.name}。` : `你卸下了 ${def.name}。`];
  const flags = {};
  if (on && id === 'down_jacket') { flags.prepared_out = true; notes.push('外套把风挡在外面，行动范围变大了。'); }
  return { ok: true, minutes: 5, notes, flags, stats: on && id === 'down_jacket' ? { mind: 2 } : {}, toast: { text: `${on ? '装备' : '卸下'} ${def.name}`, kind: 'info' } };
}

/** 交易区购买（项目书 §11 交易区）：货币换物资，容量不足时拒绝。 */
export function purchase(state, id, price) {
  if (!ITEMS[id]) return { ok: false, reason: '没有这种商品' };
  if (state.currency < price) return { ok: false, reason: `货币不足（需要 ${price}）` };
  const fit = canFit(state, { [id]: 1 });
  if (fit !== true) return { ok: false, reason: fit };
  state.currency -= price;
  add(state, id, 1);
  return {
    ok: true,
    minutes: 15,
    notes: [`你花 ${price} 货币买下了 ${item(id).name}。`],
    toasts: [{ text: `${item(id).name} 到手｜货币 −${price}`, kind: 'good' }],
  };
}

/** 某分类下的总数量，用于事件条件与任务。 */
export const categoryTotal = countCategory;
export { ITEMS, item };
