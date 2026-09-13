/**
 * 行动与探索（项目书 §7）。地点卡 → 行动 → 消耗时间与资源 → 触发事件。
 * 行动词表与地点数据在 data/locations.js，这里只负责规则、风险与收益计算。
 * @module systems/Explore
 */
import { ACTIONS, LOCATIONS } from '../data/locations.js';
import { chance } from '../core/util.js';
import * as Base from './Base.js';
import * as Event from './Event.js';
import * as Faction from './Faction.js';
import * as Fame from './Fame.js';
import * as Mind from './Mind.js';
import * as Weather from './Weather.js';

export const HOME = ['apartment', 'basement'];

/** 当前可进入的地点（进入条件 = 解锁天数）。 */
export function available(state) {
  return Object.values(LOCATIONS).filter((l) => state.day >= l.unlockDay);
}

export const here = (state) => (state.location ? LOCATIONS[state.location] : null);

/** 地点卡的“已知事件”：未触发过的地点事件数量。 */
export function knownEvents(state, locationId) {
  const loc = LOCATIONS[locationId];
  return (loc?.events ?? []).filter((id) => !state.flags[`seen_${id}`]);
}

function encounterFor(state, loc, risk) {
  const w = Weather.effects(state);
  const base = 0.05 * loc.danger * risk * w.riskMod * Base.defenseMod(state) * Fame.eventWeightMod(state, 'hostile') * Faction.riskMod(state);
  const p = Math.min(0.7, base);
  if (!chance(state, p)) return null;
  if (loc.danger >= 5) return chance(state, 0.5) ? 'horde' : 'mutant_infected';
  if (loc.danger >= 4) {
    // 第 12 天之后的高危区域开始出现榜上强者与掠夺者头目
    if (state.day >= 15 && chance(state, 0.3)) return 'raider_elite';
    if (state.day >= 12 && chance(state, 0.25)) return 'challenger';
    return chance(state, 0.5) ? 'scavenger_trio' : 'raider_pair';
  }
  if (loc.danger === 3) {
    if (state.day >= 17 && chance(state, 0.25)) return 'mutant_infected';
    return chance(state, 0.5) ? 'raider_pair' : 'raider';
  }
  return 'raider';
}

/**
 * 执行一次地点行动，返回可直接交给 core/effects 结算的 Outcome。
 * 资源不足、时间不足、地点未解锁都会返回明确原因。
 */
export function performAction(state, locationId, actionId) {
  const loc = LOCATIONS[locationId];
  const act = ACTIONS[actionId];
  const spec = loc?.actions?.[actionId];
  if (!loc) return { ok: false, reason: '地点不存在' };
  if (state.day < loc.unlockDay) return { ok: false, reason: `该地点将在第 ${loc.unlockDay} 天开放` };
  if (!act || !spec) return { ok: false, reason: '该地点不支持这个行动' };
  if (state.stats.energy < 5) return { ok: false, reason: '精力不足，先休息或进食' };

  const w = Weather.effects(state);
  const brain = Mind.brain(state);
  const minutes = Math.round(act.minutes * w.minutesMod * (brain.minutesMod ?? 1));
  const indoor = loc.indoor === true;

  const loot = Event.rollLoot(state, spec.loot, { lootMod: w.lootMod, brainMod: brain.lootMod });
  const notes = [spec.note ?? `${act.label}：${loc.name}。`, ...loot.notes];

  const stats = {
    energy: -(2 + minutes / 12) * (act.risk > 1.5 ? 1.25 : 1),
    mind: -0.8,
    hunger: -0.4,
  };
  if (!indoor) stats.warmth = w.outdoor * (minutes / 60) * 1.2;

  const outcome = {
    ok: true,
    minutes,
    indoor,
    items: loot.items,
    stats,
    notes,
    log: `第${state.day}天 ${act.label} · ${loc.name}`,
    mind: { xp: 4 + Math.round(act.minutes / 15) },
    flags: { left_home: HOME.includes(locationId) ? state.flags.left_home === true : true },
    location: locationId,
  };

  const enemy = encounterFor(state, loc, act.risk);
  if (enemy) {
    outcome.battle = enemy;
    outcome.notes.push('有东西朝你走过来。');
  } else if (spec.loot?.length === 0 && act.id === 'trade') {
    outcome.notes.push('这里没人愿意交易，至少现在没有。');
  } else if (loot.notes.length === 0) {
    outcome.notes.push('什么也没找到。');
  }
  return outcome;
}

/** 撤退：结束本次外出，回到室内。 */
export function retreat(state, locationId) {
  const loc = LOCATIONS[locationId];
  if (!loc) return { ok: false, reason: '地点不存在' };
  return {
    ok: true,
    minutes: 20,
    indoor: true,
    notes: ['你退出这里，把注意力放回自己的呼吸上。'],
    stats: { energy: -2, mind: 1 },
    location: loc.indoor ? locationId : null,
    flags: { left_home: HOME.includes(locationId) ? false : true },
    log: `撤离 ${loc.name}`,
  };
}

/** 随机遭遇的敌人 id（用于 UI 提示）。 */
export const rollEncounter = (state, locationId, risk = 1) => encounterFor(state, LOCATIONS[locationId], risk);

export { ACTIONS, LOCATIONS };
