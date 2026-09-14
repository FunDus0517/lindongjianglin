/**
 * 区域与坐标（V3.0 策划案 §十四：大型地图、更多区域）。
 * 把地点按城区分组并给一个网格坐标，行动/地点之间的**移动要花时间**，
 * 这样"今天去哪一片"就成了一个真实决策，而不是在同一张列表里随便点。
 * @module data/regions
 */

export const REGIONS = [
  { id: 'home', name: '老城区', icon: '🏘️', desc: '你家和几栋老楼。熟悉、近、没什么好东西了。', danger: 1 },
  { id: 'market', name: '商业区', icon: '🏬', desc: '超市、药房、地下商场。物资多，人也多。', danger: 3 },
  { id: 'industry', name: '工业区', icon: '🏭', desc: '五金、变电站、停车场、矿道。零件与能源在这里。', danger: 3 },
  { id: 'north', name: '城北', icon: '🌫️', desc: '医院、隧道、军用检查站。走一趟要一整天。', danger: 4 },
  { id: 'mountain', name: '山区与江边', icon: '🏔️', desc: '码头、观测站、冰封穹顶、深层矿脉。后期的资源都在这里。', danger: 5 },
];

/** 地点 → 区域 + 网格坐标（x 向东，y 向北，1 格约等于城市里的一个街区）。 */
export const PLACES = {
  apartment: { region: 'home', grid: [1, 1] },
  basement: { region: 'home', grid: [1, 1] },
  block: { region: 'home', grid: [2, 1] },
  supermarket: { region: 'market', grid: [4, 2] },
  pharmacy: { region: 'market', grid: [4, 3] },
  school: { region: 'market', grid: [5, 2] },
  underground_mall: { region: 'market', grid: [5, 3] },
  hardware: { region: 'industry', grid: [3, 5] },
  parking: { region: 'industry', grid: [4, 5] },
  substation: { region: 'industry', grid: [5, 5] },
  gym: { region: 'industry', grid: [3, 6] },
  ruins: { region: 'industry', grid: [2, 6] },
  gas_station: { region: 'industry', grid: [6, 5] },
  hospital: { region: 'north', grid: [6, 8] },
  tunnel: { region: 'north', grid: [7, 9] },
  military_checkpoint: { region: 'north', grid: [8, 9] },
  mine: { region: 'north', grid: [8, 7] },
  frozen_port: { region: 'mountain', grid: [3, 11] },
  science_station: { region: 'mountain', grid: [5, 13] },
  ice_cathedral: { region: 'mountain', grid: [7, 12] },
  deep_mine: { region: 'mountain', grid: [9, 11] },
};

export const region = (id) => REGIONS.find((r) => r.id === id) ?? REGIONS[0];
export const place = (id) => PLACES[id] ?? PLACES.apartment;

/**
 * 区域之间的道路（V3.0 策划案 §十四：大型地图）。
 * 每条路可以被**动态阻断**：暴雪封路、尸潮占道、检查站戒严。
 * 阻断只影响"能不能走这条路"，不会删掉区域本身。
 */
export const ROUTES = [
  { id: 'home_market', from: 'home', to: 'market', name: '和平路', tiles: 3 },
  { id: 'market_industry', from: 'market', to: 'industry', name: '环城高架', tiles: 3 },
  { id: 'industry_north', from: 'industry', to: 'north', name: '城北大道', tiles: 4 },
  { id: 'north_mountain', from: 'north', to: 'mountain', name: '盘山公路', tiles: 5 },
  { id: 'home_industry', from: 'home', to: 'industry', name: '老铁路', tiles: 4 },
  { id: 'market_north', from: 'market', to: 'north', name: '医院支路', tiles: 4 },
];

/** 阻断原因（写进 state.roads[routeId] = { until: 天数, why: '暴雪封路' }）。 */
export const BLOCK_REASONS = {
  blizzard: '暴雪封路',
  horde: '尸潮占道',
  check: '检查站戒严',
};

export const route = (id) => ROUTES.find((r) => r.id === id) ?? null;
