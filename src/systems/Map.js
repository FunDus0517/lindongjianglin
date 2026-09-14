/**
 * 地图（V3.0 策划案 §十四：大型地图、更多区域）。
 * 地点按区域分组、各有网格坐标；跨区移动要花时间，天气越差走得越慢。
 * 移动只改 state.location 与时间/体温，所有消耗仍走统一的 Outcome 结算入口。
 * @module systems/Map
 */
import { PLACES, REGIONS, place, region } from '../data/regions.js';
import { location } from '../data/locations.js';
import * as Weather from './Weather.js';
import { clamp } from '../core/util.js';

export const MINUTES_PER_TILE = 8;

export const regions = () => REGIONS;
export const regionOf = (locId) => region(place(locId).region);

/** 两点之间的街区距离（曼哈顿距离）。 */
export function distance(fromId, toId) {
  const a = place(fromId).grid;
  const b = place(toId).grid;
  return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
}

/** 当前地点（没有记录就从自家公寓算起）。 */
export const currentPlace = (state) => (state.location && PLACES[state.location] ? state.location : 'apartment');

/** 移动耗时：距离 × 每格时间 × 天气系数。 */
export function travelMinutes(state, toId) {
  const tiles = distance(currentPlace(state), toId);
  if (tiles === 0) return 0;
  const w = Weather.weather(state.weather);
  return Math.max(10, Math.round(tiles * MINUTES_PER_TILE * w.minutesMod));
}

/** 该地点是否已解锁；返回 true 或原因。 */
export function unlockReason(state, toId) {
  const loc = location(toId);
  if (!loc) return '没有这个地方';
  if ((loc.unlockDay ?? 1) > state.day) return `${loc.name}将在第 ${loc.unlockDay} 天开放`;
  return true;
}

/**
 * 移动到某个地点：返回 Outcome（时间 + 体温消耗 + 位置变更）。
 * 同区内移动很便宜，跨区就是半天。
 */
export function travel(state, toId) {
  const ok = unlockReason(state, toId);
  if (ok !== true) return { ok: false, reason: ok };
  if (currentPlace(state) === toId) return { ok: false, reason: '你已经在这里了' };
  const minutes = travelMinutes(state, toId);
  if (minutes <= 0) return { ok: false, reason: '不需要移动' };
  const loc = location(toId);
  const tiles = distance(currentPlace(state), toId);
  return {
    ok: true,
    minutes,
    indoor: loc.indoor === true,
    location: toId,
    stats: { warmth: -clamp(Math.round(minutes / 40), 1, 12), energy: -clamp(Math.round(minutes / 60), 1, 8) },
    notes: [`你走了 ${tiles} 个街区到${loc.name}（${minutes} 分钟）。`],
    toast: { text: `${loc.icon} ${loc.name}｜${minutes} 分钟`, kind: 'info' },
    flags: { [`visited_region_${place(toId).region}`]: true },
  };
}

/** 界面视图：按区域分组的地点（只列已解锁的；整片都没解锁的区域不出现）。 */
export function view(state) {
  const here = currentPlace(state);
  return REGIONS.map((r) => {
    const list = Object.entries(PLACES)
      .filter(([, p]) => p.region === r.id)
      .filter(([id]) => unlockReason(state, id) === true)
      .map(([id, p]) => {
        const loc = location(id);
        return {
          id,
          name: loc?.name ?? id,
          icon: loc?.icon ?? '❓',
          danger: loc?.danger ?? 0,
          indoor: loc?.indoor === true,
          tiles: distance(here, id),
          minutes: travelMinutes(state, id),
          locked: false,
          reason: null,
          here: id === here,
        };
      })
      .sort((a, b) => a.minutes - b.minutes);
    return { ...r, places: list, open: list.length };
  }).filter((r) => r.places.length > 0);
}

/** 一行地图概览（晨报/助手用）。 */
export function brief(state) {
  const here = currentPlace(state);
  const loc = location(here);
  const r = regionOf(here);
  return `当前位置 ${r.icon} ${r.name} · ${loc?.name ?? here}`;
}
