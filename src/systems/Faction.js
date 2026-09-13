/**
 * 势力关系（项目书 §4 第 14—20 天）。
 * 与人物关系同构但只有一条轴；楼道互助网的立场由互助体系的规模与士气派生。
 * @module systems/Faction
 */
import { FACTIONS, FACTION_LIST, faction } from '../data/factions.js';
import { clamp } from '../core/util.js';

export const standing = (state, id) => state.factions?.[id]?.standing ?? 0;
export const known = (state, id) => state.factions?.[id]?.known === true;

/** 解锁一个势力的情报（首次出现在剧情里）。 */
export function discover(state, id) {
  const rec = state.factions?.[id];
  if (!rec || rec.known) return false;
  rec.known = true;
  return true;
}

export function change(state, id, delta, { discover: reveal = false } = {}) {
  const rec = state.factions?.[id];
  if (!rec) return null;
  if (reveal) rec.known = true;
  rec.standing = clamp(rec.standing + delta, -100, 100);
  return rec;
}

export function band(id, value) {
  const def = faction(id);
  let out = def.bands[0].label;
  for (const b of def.bands) if (value >= b.min) out = b.label;
  return out;
}

/** 互助网的立场跟随互助体系实时派生（成员越多、士气越高，立场越强）。 */
export function syncAid(state) {
  const rec = state.factions?.aidnet;
  if (!rec) return;
  rec.standing = clamp(Math.round((state.aid?.morale ?? 0) / 2) + (state.aid?.members ?? 0) * 8, -100, 100);
  rec.known = true;
}

/** 已解锁的势力列表（未登场的不显示，避免空面板）。 */
export function visible(state) {
  return FACTION_LIST.filter((f) => known(state, f.id)).map((f) => ({
    ...f,
    value: standing(state, f.id),
    label: band(f.id, standing(state, f.id)),
  }));
}

/** 势力关系对行动的修正：掠夺者立场越低，遇敌风险越高。 */
export function riskMod(state) {
  const s = standing(state, 'raiders');
  if (s <= -50) return 1.25;
  if (s >= 50) return 0.85;
  return 1;
}

export { FACTIONS, faction };
