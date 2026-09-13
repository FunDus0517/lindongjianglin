/**
 * 任务系统（项目书 §16）。任务按天刷新，完成判定在每次行动后同步执行，
 * 完成后立即发放奖励 —— 每教会一个操作就应立即给出反馈（§20）。
 * @module systems/Quest
 */
import { QUESTS, QUEST_LIST, quest } from '../data/quests.js';
import { chapterOf } from '../data/chapters.js';
import { toast } from '../core/store.js';
import * as Inventory from './Inventory.js';

export const ACTIVE = 'active';
export const DONE = 'done';

export const status = (state, id) => state.quests[id]?.status ?? null;
export const isActive = (state, id) => status(state, id) === ACTIVE;
export const isDone = (state, id) => status(state, id) === DONE;

/** 每日刷新：把当日章节任务加入列表。 */
export function refresh(state) {
  const ch = chapterOf(state.day);
  for (const id of ch.quests) {
    if (!state.quests[id]) state.quests[id] = { status: ACTIVE, day: state.day };
  }
}

/** 手动接取（任务页可接取当日及以前未完成的任务）。 */
export function accept(state, id) {
  if (!quest(id) || state.quests[id]) return false;
  state.quests[id] = { status: ACTIVE, day: state.day };
  return true;
}

export function progressOf(state, id) {
  const q = quest(id);
  if (!q) return [0, 1];
  const [cur, target] = q.progress(state);
  return [Math.min(cur, target), target];
}

/** 结算所有在列任务；返回本次完成的任务列表。 */
export function sync(state) {
  const finished = [];
  for (const [id, rec] of Object.entries(state.quests)) {
    if (rec.status !== ACTIVE) continue;
    const q = QUESTS[id];
    if (!q) continue;
    if (q.check(state)) {
      rec.status = DONE;
      rec.doneDay = state.day;
      grant(state, q);
      finished.push(q);
    }
  }
  return finished;
}

function grant(state, q) {
  const r = q.reward ?? {};
  if (r.items) Inventory.applyItems(state, r.items);
  if (r.currency) state.currency += r.currency;
  if (r.fame) state.fame = Math.min(100, state.fame + r.fame);
  if (r.mindXp) state.mindXp += r.mindXp;
  const parts = [];
  for (const [id, n] of Object.entries(r.items ?? {})) parts.push(`${Inventory.item(id).name}×${n}`);
  if (r.currency) parts.push(`货币+${r.currency}`);
  if (r.fame) parts.push(`锋芒+${r.fame}`);
  if (r.mindXp) parts.push(`光脑经验+${r.mindXp}`);
  toast(`任务完成：${q.title}${parts.length ? `｜奖励 ${parts.join('、')}` : ''}`, 'good');
}

/** 任务页列表：进行中优先，已完成置底。 */
export function list(state) {
  const rows = QUEST_LIST.filter((q) => state.quests[q.id]);
  const rank = (q) => (isActive(state, q.id) ? 0 : 1);
  return rows.sort((a, b) => rank(a) - rank(b) || (a.day ?? 0) - (b.day ?? 0));
}

export const today = (state) => list(state).filter((q) => isActive(state, q.id)).slice(0, 4);
