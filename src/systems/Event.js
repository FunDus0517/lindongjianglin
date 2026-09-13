/**
 * 事件系统（项目书 §8）：叙事文本 + 状态信息 + 选项按钮。
 * 事件条件可以读取日期、天气、库存、战力、人物关系、锋芒值、任务状态、故事 Flag。
 * @module systems/Event
 */
import { EVENTS } from '../data/events.js';
import { LOCATIONS } from '../data/locations.js';
import { chance, randInt, weightedPick } from '../core/util.js';
import * as Fame from './Fame.js';
import { item } from '../data/items.js';

export const event = (id) => EVENTS[id];

/** 事件当前是否可触发。 */
export function eligible(state, def) {
  if (!def) return false;
  if (def.once && state.flags[`seen_${def.id}`]) return false;
  if (def.day && state.day !== def.day) return false;
  if (def.dayRange && (state.day < def.dayRange[0] || state.day > def.dayRange[1])) return false;
  if (def.location && state.location !== def.location) return false;
  if (def.condition && !def.condition(state)) return false;
  return true;
}

/** 取事件文本（支持函数插值）。 */
export const textOf = (state, def) => (typeof def.text === 'function' ? def.text(state) : def.text);

/** 过滤出当前可显示的选项（show 条件 + enabled 原因）。 */
export function choicesOf(state, def) {
  return (def.choices ?? [])
    .filter((c) => !c.show || c.show(state))
    .map((c) => {
      const verdict = c.enabled ? c.enabled(state) : true;
      return { id: c.id, label: c.label, hint: c.hint, enabled: verdict === true, reason: verdict === true ? null : verdict };
    });
}

/**
 * 把事件设为当前活动事件，返回该事件的渲染数据。
 * 同一时刻只允许一个待处理事件：已有其它事件在等待玩家决策时拒绝覆盖，
 * 否则行动结算会把玩家还没看到的剧情悄悄顶掉。
 */
export function activate(state, id, source = 'story', { force = false } = {}) {
  const def = EVENTS[id];
  if (!def) return null;
  if (!force && state.active?.kind === 'event' && state.active.id !== id) return null;
  state.active = { kind: 'event', id, source };
  state.eventsSeen += 1;
  return { def, source };
}

/** 从队列取下一个脚本事件（只出队，不改变界面状态）。 */
export function nextQueued(state) {
  while (state.queue.length > 0) {
    const id = state.queue.shift();
    if (EVENTS[id]) return id;
  }
  return null;
}

/**
 * 脚本事件的可用性：只看 once 与 condition。
 * 队列里的剧情可能因为战斗、跨日而延后处理，所以不按 day 字段再判一次 ——
 * 否则一次跨日就会把还没演完的主线静默丢掉。
 */
function scriptEligible(state, def) {
  if (def.once && state.flags[`seen_${def.id}`]) return false;
  if (def.condition && !def.condition(state)) return false;
  return true;
}

/**
 * 原子推进：取出队首中条件成立的剧情并设为待处理事件。
 * 条件不成立的脚本会被跳过（分支剧情），但队列不会因此卡住。
 */
export function advanceStory(state) {
  if (!state || state.ending || state.active) return null;
  while (state.queue.length > 0) {
    const id = state.queue.shift();
    const def = EVENTS[id];
    if (!def || !scriptEligible(state, def)) continue;
    activate(state, id, 'story');
    return id;
  }
  return null;
}

/** 随机事件池：按权重与锋芒值修正抽取（项目书 §9、§5.2）。 */
export function rollRandom(state) {
  const pool = Object.values(EVENTS).filter((e) => e.kind === 'random' && eligible(state, e));
  if (pool.length === 0) return null;
  const entries = pool.map((e) => ({ id: e.id, weight: (e.weight ?? 1) * Fame.eventWeightMod(state, e.kind) }));
  const hit = weightedPick(state, entries);
  if (!hit) return null;
  // 随机事件不是每次行动都出现，避免节奏过密
  return chance(state, 0.45) ? hit.id : null;
}

/** 结算 loot 表：[id, min, max, p]，返回物品增量与叙事行。 */
export function rollLoot(state, table, mods = {}) {
  const items = {};
  const notes = [];
  const weatherMod = mods.lootMod ?? 1;
  const brainMod = mods.brainMod ?? 1;
  const bonus = mods.bonus ?? 0;
  for (const [id, min, max, p] of table ?? []) {
    if (!chance(state, Math.min(0.95, p * weatherMod * brainMod))) continue;
    const n = (max > min ? randInt(state, min, max) : min) + bonus;
    if (n > 0) { items[id] = (items[id] ?? 0) + n; notes.push(`获得 ${item(id).name} ×${n}`); }
  }
  return { items, notes };
}

/** 应用一个选项的结果描述（纯数据，实际结算在 core/effects）。 */
export function choose(state, eventId, choiceId) {
  const def = EVENTS[eventId];
  if (!def || state.active?.id !== eventId) return { ok: false, reason: '事件已失效' };
  const choice = (def.choices ?? []).find((c) => c.id === choiceId);
  if (!choice) return { ok: false, reason: '选项不存在' };
  const verdict = choice.enabled ? choice.enabled(state) : true;
  if (verdict !== true) return { ok: false, reason: verdict };
  state.flags[`seen_${eventId}`] = true;
  return { ok: true, outcome: choice.resolve(state) ?? {}, eventId, choiceId };
}

/** 当前活动事件 + 选项的渲染数据。 */
export function current(state) {
  if (state.active?.kind !== 'event') return null;
  const def = EVENTS[state.active.id];
  if (!def) return null;
  const loc = def.location ? (LOCATIONS[def.location]?.name ?? def.location) : null;
  return {
    id: def.id,
    title: def.title,
    kind: def.kind,
    location: loc,
    text: textOf(state, def),
    choices: choicesOf(state, def),
  };
}
