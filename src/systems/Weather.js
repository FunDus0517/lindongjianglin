/**
 * 天气（项目书 §5.2）。天气同时影响体温、行动时间、探索收益、战斗风险和事件触发概率。
 * @module systems/Weather
 */
import { chapterOf } from '../data/chapters.js';
import { chance, clamp } from '../core/util.js';

export const WEATHERS = {
  normal_cold: { id: 'normal_cold', name: '正常寒冷', icon: '🌥️', tempMod: 0, lootMod: 1.0, riskMod: 1.0, minutesMod: 1.0, outdoor: -2, desc: '风不大，但冷是持续的。' },
  blizzard:    { id: 'blizzard', name: '暴雪', icon: '🌨️', tempMod: -4, lootMod: 0.85, riskMod: 1.25, minutesMod: 1.3, outdoor: -6, desc: '能见度极低，行进速度大幅下降。' },
  extreme_cold:{ id: 'extreme_cold', name: '极寒', icon: '❄️', tempMod: -8, lootMod: 1.15, riskMod: 1.2, minutesMod: 1.2, outdoor: -9, desc: '暴露超过一小时就会开始冻伤。' },
  hail:        { id: 'hail', name: '冰雹', icon: '🧊', tempMod: -3, lootMod: 0.9, riskMod: 1.35, minutesMod: 1.35, outdoor: -7, desc: '冰雹砸下来的时候，最好有屋顶。' },
  polar_night: { id: 'polar_night', name: '极夜', icon: '🌑', tempMod: -6, lootMod: 1.1, riskMod: 1.3, minutesMod: 1.15, outdoor: -8, desc: '一整天都不会天亮。' },
  cold_snap:   { id: 'cold_snap', name: '异常寒潮', icon: '🥶', tempMod: -10, lootMod: 0.9, riskMod: 1.4, minutesMod: 1.25, outdoor: -11, desc: '寒潮主线：留在室外就是赌命。' },
  zombie_tide: { id: 'zombie_tide', name: '丧尸潮', icon: '🧟', tempMod: -5, lootMod: 1.2, riskMod: 2.0, minutesMod: 1.2, outdoor: -8, desc: '没有人会在这个时候出门搜物资。' },
};

export const weather = (id) => WEATHERS[id] ?? WEATHERS.normal_cold;

/** 每日刷新时决定当天天气：以章节表为准，允许小幅偏离。 */
export function roll(state) {
  const ch = chapterOf(state.day);
  const base = ch.weather;
  if (chance(state, 0.2)) {
    const pool = Object.keys(WEATHERS).filter((id) => id !== 'zombie_tide' && id !== 'polar_night' && id !== base);
    return pool[Math.floor((state.rngCursor * 0.618) % pool.length)];
  }
  return base;
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
