/**
 * 时间系统（项目书 §3）："天＋小时"结构，每天从 06:00 开始。
 * 任何时间消耗都会触发状态结算、可能的跨日刷新与死亡判定。
 * @module systems/GameTime
 */
import { PHASE_LABEL, fmtClock, dayPhase } from '../core/util.js';
import { TOTAL_DAYS, chapterOf } from '../data/chapters.js';
import * as Base from './Base.js';
import * as Ending from './Ending.js';
import * as Faction from './Faction.js';
import * as Inventory from './Inventory.js';
import * as Market from './Market.js';
import * as Mind from './Mind.js';
import * as NPC from './NPC.js';
import * as Power from './Power.js';
import * as Quest from './Quest.js';
import * as Save from './Save.js';
import * as Story from './Story.js';
import * as Survival from './Survival.js';
import * as Weather from './Weather.js';

export const DAY_START = 360;   // 06:00
export const NIGHT = 1320;      // 22:00

export const isNight = (state) => state.time >= NIGHT || state.time < DAY_START;
export const phase = (state) => dayPhase(state.time);
export const phaseLabel = (state) => PHASE_LABEL[dayPhase(state.time)];
export const clock = (state) => fmtClock(state.time);
export const remaining = (state) => (state.time >= NIGHT ? 0 : NIGHT - state.time);

/** 推进时间：状态结算 → 跨日刷新 → 死亡判定。所有行动都必须走这里。 */
export function spend(state, minutes, opts = {}) {
  const mins = Math.max(1, Math.round(minutes));
  const indoor = opts.indoor ?? true;
  const gear = indoor ? 0 : Inventory.equipStats(state).warmthResist + Mind.enhanceLevel(state, 'gear');
  Survival.tick(state, mins, {
    indoor,
    indoorBonus: Base.indoorWarmth(state),
    gear,
    activity: opts.activity ?? 1,
    brainMindMod: Mind.brain(state).mindDecay,
  });
  state.time += mins;
  state.playtime += mins;

  const rolled = [];
  while (state.time >= 1440) { state.time -= 1440; rolled.push(rollDay(state)); }

  const death = Survival.checkDeath(state);
  if (death && !state.ending) Ending.apply(state, death);
  Power.refresh(state);
  return { minutes: mins, days: rolled, death: death ?? null };
}

/** 每日刷新：06:00 天气变化、状态结算、互助产出、任务刷新、自动存档（项目书 §3、§21）。 */
export function rollDay(state) {
  state.day += 1;
  state.time = DAY_START;
  state.weather = Weather.roll(state);
  const notes = [...Base.dailySettlement(state)];
  const aid = NPC.dailySettlement(state);
  const applied = Inventory.applyItems(state, aid.changes ?? {});
  Faction.syncAid(state);
  notes.push(...aid.notes);
  if (applied.ok && aid.changes?.produce) state.log.push({ day: state.day, time: state.time, text: `互助产出：食物 +${aid.changes.produce}`, kind: 'good' });
  Quest.refresh(state);
  Market.refresh(state);
  Story.onNewDay(state);
  if (state.day > TOTAL_DAYS && !state.ending) Ending.apply(state, Ending.evaluate(state));
  Save.save(state, '每日刷新');
  return { day: state.day, weather: state.weather, notes, chapter: chapterOf(state.day) };
}

/** 夜间休息：推进到次日 06:00，并按住所等级提高恢复效率。 */
export function sleep(state) {
  const toMorning = state.time >= DAY_START ? 1440 - state.time + DAY_START : DAY_START - state.time;
  const shelter = Base.level(state, 'shelter');
  const minutes = Math.max(60, Math.round(toMorning));
  const before = { ...state.stats };
  Survival.rest(state, minutes, { indoor: true, indoorBonus: Base.indoorWarmth(state), brainMindMod: Mind.brain(state).mindDecay });
  // 住所等级：额外恢复
  const bonus = 1 + shelter * 0.08;
  state.stats.energy = Math.min(100, before.energy + (state.stats.energy - before.energy) * bonus + 10);
  state.stats.mind = Math.min(100, state.stats.mind + 10 + shelter * 3);
  state.time += minutes;
  state.playtime += minutes;
  const rolled = [];
  while (state.time >= 1440) { state.time -= 1440; rolled.push(rollDay(state)); }
  const death = Survival.checkDeath(state);
  if (death && !state.ending) Ending.apply(state, death);
  Power.refresh(state);
  return { minutes, days: rolled, death: death ?? null, notes: [`你休息了 ${Math.round(minutes / 60)} 小时。`] };
}
