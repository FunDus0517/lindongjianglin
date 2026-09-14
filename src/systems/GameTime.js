/**
 * 时间系统（项目书 §3）："天＋小时"结构，每天从 06:00 开始。
 * 任何时间消耗都会触发状态结算、可能的跨日刷新与死亡判定。
 * @module systems/GameTime
 */
import { PHASE_LABEL, fmtClock, dayPhase } from '../core/util.js';
import { toast } from '../core/store.js';
import { chance } from '../core/util.js';
import { TOTAL_DAYS, chapterOf, phaseOf } from '../data/chapters.js';
import * as Achievement from './Achievement.js';
import * as Base from './Base.js';
import * as Crew from './Crew.js';
import * as Daily from './Daily.js';
import * as Death from './Death.js';
import * as Ending from './Ending.js';
import * as Event from './Event.js';
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
import * as Tech from './Tech.js';
import * as Weather from './Weather.js';
import * as WorldMap from './Map.js';

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

  // 人物：关系漂移（冲突会自己长）+ 幸存者成长/转职/受伤/离开
  const drift = NPC.relationshipDrift(state);
  notes.push(...drift.notes);
  if (drift.changes?.members) Faction.syncAid(state);
  notes.push(...NPC.growCrew(state));

  // 排班分工（V3.0 §十三）：幸存者按玩家指派干活，产出走统一结算入口
  const crew = Crew.dailySettlement(state);
  if (Object.keys(crew.items).length > 0) {
    const applied2 = Inventory.applyItems(state, crew.items);
    if (!applied2.ok) notes.push('排班产出因为仓库满了没能全收下。');
  }
  notes.push(...crew.notes);
  state.flags.guard_count = crew.guardCount;

  // 每日任务：先结算昨天的连击，再抽今天的
  notes.push(...Daily.refresh(state, prevDay));
  Quest.refresh(state);
  Market.refresh(state);
  Story.onNewDay(state);

  // 道路阻断（V3.0 §十四）：恶劣天气与尸潮会封路，确定性触发
  if (state.weather === 'blizzard' || state.weather === 'extreme_cold' || state.weather === 'zombie_tide') {
    const pool = WorldMap.routes(state).filter((r) => !r.blocked);
    if (pool.length > 0 && state.day % 4 === 0) {
      const pick = pool[state.day % pool.length];
      WorldMap.block(state, pick.id, 2 + (state.day % 2), state.weather === 'zombie_tide' ? '尸潮占道' : '暴雪封路');
      notes.push(`${pick.name}${state.weather === 'zombie_tide' ? '被尸潮占道' : '被大雪封住'}，这几天得绕路。`);
    }
  }
  // 清掉已经过期很久的记录，别让存档无限增长
  if (state.roads) {
    for (const [id, rec] of Object.entries(state.roads)) if ((rec.until ?? 0) < state.day - 5) delete state.roads[id];
  }

  // 晨报：天气预测 + 基地检查（方案 §八「生存循环」的早晨段）
  const fc = Weather.forecast(state);
  notes.push(`晨报：今日${Weather.weather(state.weather).name}，室外约 ${Weather.ambient(state)}℃；明日预报「${fc.w.name}」。`);
  notes.push(`基地检查：${Base.brief(state)}`);

  // 世界阶段推进：只改变世界状态，不结束游戏
  const prevPhase = phaseOf(prevDay);
  const phase = phaseOf(state.day);
  const phaseChanged = phase.id !== prevPhase.id;
  if (phaseChanged) {
    state.flags[`phase_${phase.id}`] = true;
    state.flags[`phase_${prevPhase.id}_done`] = true;
    const rep = Ending.report(state, prevDay);
    rep.phaseFrom = prevPhase.name;
    rep.phaseTo = phase.name;
    state.reports = [...(state.reports ?? []), rep].slice(-12);
    notes.push(`世界进入「${phase.name}」：${phase.desc}`);
    toast(`世界阶段：${phase.name}｜${phase.tagline}`, 'mind');
  }

  Achievement.sync(state);
  Save.save(state, '每日刷新');
  return {
    day: state.day,
    weather: state.weather,
    notes,
    chapter: chapterOf(state.day),
    phase,
    phaseChanged,
    report: state.reports?.[state.reports.length - 1] ?? null,
  };
}

/**
 * 凌晨灾害（方案 §八：凌晨可能发生灾害）。
 * 触发是**确定性**的：基地防御越低越频繁（3/4/6 天一次），不消耗随机数。
 * 理由同 Weather.roll —— 随机数推进量一变，整局随机序列会全部错位。
 */
export function rollNight(state) {
  if (!state || state.ending || state.active) return null;
  const defense = (state.base?.defense ?? 0) + Tech.bonus(state).defense;
  const risk = Tech.bonus(state).raidRisk;
  // 守夜的人越多，出事间隔越长（排班分工的直接收益）
  const guardsOnWatch = Crew.guards(state);
  const every = Math.max(2, Math.round((defense >= 4 ? 6 : defense >= 2 ? 4 : 3) * (1 + risk)) + guardsOnWatch);
  if (state.day % every !== 0) return null;
  return Event.rollNight(state, state.day);
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
  // 凌晨灾害：睡到一半出的乱子，醒来就要处理（方案 §八）
  const hours = Math.round(minutes / 60);
  const night = rollNight(state, hours);
  Daily.track(state, 'rest', 1);
  Power.refresh(state);
  const notes = [`你休息了 ${hours} 小时。`];
  if (night) notes.push('凌晨出了事——你被声音吵醒。');
  return { minutes, days: rolled, death: death ?? null, notes, night };
}
