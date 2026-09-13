/**
 * 时间系统（项目书 §3）："天＋小时"结构，每天从 06:00 开始。
 * 任何时间消耗都会触发状态结算、可能的跨日刷新与死亡判定。
 * @module systems/GameTime
 */
import { PHASE_LABEL, fmtClock, dayPhase } from '../core/util.js';
import { toast } from '../core/store.js';
import { TOTAL_DAYS, chapterOf } from '../data/chapters.js';
import * as Achievement from './Achievement.js';
import * as Base from './Base.js';
import * as Daily from './Daily.js';
import * as Death from './Death.js';
import * as Ending from './Ending.js';
import * as Faction from './Faction.js';
import * as Growth from './Growth.js';
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

/**
 * 倒地处理（商业化升级：死亡不算结局）。
 * 结算丢失的物资 → 把状态抬回安全线 → 推进两小时 → 必要时跨日。
 */
function applyDown(state, cause, rolled) {
  const res = Death.handle(state, cause);
  state.time += res.minutes;
  state.playtime += res.minutes;
  while (state.time >= 1440) { state.time -= 1440; rolled.push(rollDay(state)); }
  state.log.push({ day: state.day, time: state.time, text: res.notes.join(' '), kind: 'bad' });
  toast(`你倒下了（第 ${Death.deaths(state)} 次）：${res.lostNames.length ? `丢失 ${res.lostNames.join('、')}` : '这次没丢东西'}`, 'bad');
  return res;
}

/** 推进时间：状态结算 → 跨日刷新 → 倒地判定。所有行动都必须走这里。 */
export function spend(state, minutes, opts = {}) {
  const mins = Math.max(1, Math.round(minutes));
  const indoor = opts.indoor ?? true;
  const gear = indoor ? 0 : Inventory.equipStats(state).warmthResist + Mind.enhanceLevel(state, 'gear') + Growth.bonus(state).warmth;
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

  const cause = Survival.checkDeath(state);
  const revived = cause ? applyDown(state, cause, rolled) : null;
  Power.refresh(state);
  return { minutes: mins, days: rolled, revived, cause: revived?.cause ?? null };
}

/** 每日刷新：06:00 天气变化、状态结算、互助产出、每日任务刷新、成就检查、自动存档。 */
export function rollDay(state) {
  const prevDay = state.day;
  state.day += 1;
  state.time = DAY_START;
  state.weather = Weather.roll(state);
  const notes = [...Base.dailySettlement(state)];
  const aid = NPC.dailySettlement(state);
  const applied = Inventory.applyItems(state, aid.changes ?? {});
  Faction.syncAid(state);
  notes.push(...aid.notes);
  if (applied.ok && aid.changes?.produce) state.log.push({ day: state.day, time: state.time, text: `互助产出：食物 +${aid.changes.produce}`, kind: 'good' });

  // 人物关系漂移：长期高压 + 低好感会让冲突值自己长，必要时退出互助
  const drift = NPC.relationshipDrift(state);
  notes.push(...drift.notes);
  if (drift.changes?.members) Faction.syncAid(state);

  // 每日任务：先结算昨天的连击，再抽今天的
  notes.push(...Daily.refresh(state, prevDay));
  Quest.refresh(state);
  Market.refresh(state);
  Story.onNewDay(state);

  // 商业化升级「不设置固定结局」：第 30 天不再收尾，而是给一份阶段报告后进入无尽模式。
  if (state.day === TOTAL_DAYS + 1 && !state.ending) {
    state.flags.endless = true;
    const rep = Ending.report(state, TOTAL_DAYS);
    state.reports = [...(state.reports ?? []), rep].slice(-12);
    notes.push(`第三十天过去了。按目前的活法，这本该是「${rep.title}」——但冬天没有结束，你也没有。`);
    toast(`阶段总结：${rep.title}｜无尽模式开启`, 'mind');
  } else if (state.day > TOTAL_DAYS + 1 && (state.day - TOTAL_DAYS) % 10 === 1 && !state.ending) {
    const rep = Ending.report(state);
    state.reports = [...(state.reports ?? []), rep].slice(-12);
    notes.push(`又活了十天。当前评价：「${rep.title}」。`);
    toast(`阶段总结：${rep.title}`, 'mind');
  }

  Achievement.sync(state);
  Save.save(state, '每日刷新');
  return { day: state.day, weather: state.weather, notes, chapter: chapterOf(state.day), report: state.reports?.[state.reports.length - 1] ?? null };
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
  if (death && !state.ending) applyDown(state, death, rolled);
  Daily.track(state, 'rest', 1);
  Power.refresh(state);
  return { minutes, days: rolled, death: death ?? null, notes: [`你休息了 ${Math.round(minutes / 60)} 小时。`] };
}
