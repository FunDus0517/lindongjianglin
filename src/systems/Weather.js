/**
 * 天气（项目书 §5.2 + 商业化升级 §四.1「动态天气」）。
 * 天气同时影响体温、行动时间、探索收益、战斗风险和事件触发概率。
 *
 * 重要约束：**每天必须消耗且只消耗一次 RNG**（原实现用 chance() 抽签）。
 * 存档里的 rngCursor 驱动搜刮与随机事件，游标推进量一变，整局随机序列全部错位——
 * 实测会造成第 5 天断水、第 6 天渴死的平衡崩坏。所以这里的"动态化"只改**怎么挑**，
 * 不改**消耗多少随机数**。
 * 天气 id 与商业化文档的命名对应：sunny→clear、snowstorm→blizzard、extremeCold→extreme_cold。
 * @module systems/Weather
 */
import { chapterOf } from '../data/chapters.js';
import { chance, clamp } from '../core/util.js';

export const WEATHERS = {
  // 商业化文档点名的三种：晴 / 暴雪 / 极寒
  clear:        { id: 'clear', name: '晴', icon: '☀️', tempMod: -2, lootMod: 1.15, riskMod: 0.95, minutesMod: 0.9, outdoor: -3, devWeight: 1.0, desc: '天很干净，能见度好，代价是地面散热更快。' },
  blizzard:     { id: 'blizzard', name: '暴雪', icon: '🌨️', tempMod: -4, lootMod: 0.85, riskMod: 1.25, minutesMod: 1.3, outdoor: -6, devWeight: 1.0, desc: '能见度极低，行进速度大幅下降。' },
  extreme_cold: { id: 'extreme_cold', name: '极寒', icon: '❄️', tempMod: -8, lootMod: 1.15, riskMod: 1.2, minutesMod: 1.2, outdoor: -9, devWeight: 0.25, desc: '暴露超过一小时就会开始冻伤。' },

  normal_cold:  { id: 'normal_cold', name: '正常寒冷', icon: '🌥️', tempMod: 0, lootMod: 1.0, riskMod: 1.0, minutesMod: 1.0, outdoor: -2, devWeight: 1.3, desc: '风不大，但冷是持续的。' },
  hail:         { id: 'hail', name: '冰雹', icon: '🧊', tempMod: -3, lootMod: 0.9, riskMod: 1.35, minutesMod: 1.35, outdoor: -7, devWeight: 0.6, desc: '冰雹砸下来的时候，最好有屋顶。' },
  // 下面三种是"剧情天气"：只由章节表点名，不在偏离池里随机出现，
  // 否则随机叠加会把 30 天的难度抬到没人能活下来（实测自动游玩会冻死在第 3 天附近）。
  polar_night:  { id: 'polar_night', name: '极夜', icon: '🌑', tempMod: -6, lootMod: 1.1, riskMod: 1.3, minutesMod: 1.15, outdoor: -8, devWeight: 0.1, desc: '一整天都不会天亮。' },
  cold_snap:    { id: 'cold_snap', name: '异常寒潮', icon: '🥶', tempMod: -10, lootMod: 0.9, riskMod: 1.4, minutesMod: 1.25, outdoor: -11, devWeight: 0, desc: '寒潮主线：留在室外就是赌命。' },
  zombie_tide:  { id: 'zombie_tide', name: '丧尸潮', icon: '🧟', tempMod: -5, lootMod: 1.2, riskMod: 2.0, minutesMod: 1.2, outdoor: -8, devWeight: 0, desc: '没有人会在这个时候出门搜物资。' },
};

/** 商业化文档里的命名 → 本项目 id，方便按文档调参数。 */
export const ALIASES = { sunny: 'clear', snowstorm: 'blizzard', extremeCold: 'extreme_cold' };

export const weather = (id) => WEATHERS[ALIASES[id] ?? id] ?? WEATHERS.normal_cold;

/** 预报可信度：偏离基准的概率就是预报出错的风险。 */
export const FORECAST_ACCURACY = 0.78;

/** 基准天气出现概率：偏离是调味，不是主菜（与原实现一致）。 */
export const BASE_CHANCE = 0.78;

/** 章节基准天气（也用作次日预报）。 */
export const baseFor = (day) => {
  const w = chapterOf(day).weather;
  return ALIASES[w] ?? w;
};

/**
 * 每日天气：基准 78%，其余从"可偏离池"按权重抽。
 * 只消耗一次 RNG（chance），与旧实现保持一致；不会连续两天出现同一种非基准天气。
 */
export function roll(state) {
  const base = baseFor(state.day);
  if (!chance(state, 1 - BASE_CHANCE)) return base;
  const pool = Object.values(WEATHERS).filter((w) => w.id !== base && w.id !== state.weather && (w.devWeight ?? 0) > 0);
  const total = pool.reduce((a, w) => a + (w.devWeight ?? 0), 0);
  if (total <= 0) return base;
  let pick = (state.rngCursor * 0.6180339887 % 1) * total;
  for (const w of pool) {
    pick -= w.devWeight ?? 0;
    if (pick <= 0) return w.id;
  }
  return pool[pool.length - 1].id;
}

/**
 * 明日预报：报的是章节基准天气，可信度就是 BASE_CHANCE。
 * 偏离（1 − BASE_CHANCE）正是"预报不准"的那部分风险，不是另算一个数字。
 */
export function forecast(state) {
  const id = baseFor(state.day + 1);
  return { id, w: weather(id), accuracy: FORECAST_ACCURACY, deviates: 1 - FORECAST_ACCURACY };
}

/** 当日基准气温（章节基准 + 天气修正 + 时段修正）。 */
export function ambient(state) {
  const w = weather(state.weather);
  const hour = state.time / 60;
  const nightDip = hour < 6 || hour >= 20 ? -5 : hour < 10 ? -2 : hour >= 14 && hour < 18 ? 1 : 0;
  return Math.round(chapterOf(state.day).temp + w.tempMod + nightDip);
}

/** 行动相关修正，供 Explore / Battle / Event 使用。 */
export function effects(state) {
  const w = weather(state);
  return { lootMod: w.lootMod, riskMod: w.riskMod, minutesMod: w.minutesMod, outdoor: w.outdoor, weather: w, ambient: ambient(state) };
}

export const label = (state) => `${weather(state.weather).icon} ${weather(state.weather).name}`;
export const tempSeverity = (state) => clamp((0 - ambient(state)) / 40, 0, 1).toFixed(2);
