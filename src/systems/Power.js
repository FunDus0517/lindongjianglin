/**
 * 战力（项目书 §13 战力榜）。战力由武器、装备、晶核、状态与队友共同决定，
 * 榜单随日期动态变化，排名提升解锁挑战与任务。
 * @module systems/Power
 */
import { equipStats } from './Inventory.js';
import { enhanceLevel } from './Mind.js';

export const BOARD_UNLOCK_DAY = 11;

/** 其他幸存者：随日期推进的对手曲线（数值数据，席位固定以便排名可复现）。 */
export const RIVALS = [
  { id: 'r_zhang', name: '张队长', tag: '前保安', base: 42, growth: 2.4 },
  { id: 'r_liu', name: '刘工', tag: '电工', base: 30, growth: 1.8 },
  { id: 'r_chen', name: '陈姐', tag: '便利店老板', base: 26, growth: 1.5 },
  { id: 'r_wang', name: '王大伟', tag: '402', base: 38, growth: 2.1 },
  { id: 'r_hei', name: '黑子', tag: '掠夺者', base: 46, growth: 3.0 },
  { id: 'r_yao', name: '姚医生', tag: '医院', base: 24, growth: 1.2 },
];

export function calc(state) {
  const { weapon, gear } = equipStats(state);
  const raw =
    10 +
    weapon * 9 +
    gear * 6 +
    enhanceLevel(state, 'weapon') * 6 +
    enhanceLevel(state, 'gear') * 3 +
    Math.floor((state.cores ?? 0) * 2.5) +
    Math.floor(state.stats.hp * 0.12) +
    Math.floor(state.stats.energy * 0.05) +
    Object.values(state.base).reduce((a, b) => a + b, 0) * 1.5 +
    (state.allies ?? 0) * 12;
  return Math.round(raw);
}

export function refresh(state) {
  state.power = calc(state);
  return state.power;
}

/** 战力榜快照：玩家 + 对手，按战力排序。 */
export function board(state) {
  const rows = RIVALS.map((r) => ({ id: r.id, name: r.name, tag: r.tag, power: Math.round(r.base + r.growth * (state.day - 1)) }));
  rows.push({ id: 'player', name: '你', tag: '幸存者', power: state.power, self: true });
  return rows.sort((a, b) => b.power - a.power).map((r, i) => ({ ...r, rank: i + 1 }));
}

export const myRank = (state) => board(state).find((r) => r.self).rank;
export const locked = (state) => state.day < BOARD_UNLOCK_DAY;
/** 排名变化带来的关注度：进入前 3 会显著提高锋芒值压力。 */
export const attention = (state) => (locked(state) ? '未开放' : myRank(state) <= 3 ? '被高度关注' : myRank(state) <= 8 ? '开始有人提起你' : '无人注意');
