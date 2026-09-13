/**
 * 锋芒值（项目书 §9）：0—100，衡量玩家在末世中的存在感。
 * 低锋芒适合隐藏发育，中锋芒更容易接触人物与交易，高锋芒会招来挑战与掠夺者。
 * @module systems/Fame
 */
import { clamp } from '../core/util.js';

export const BANDS = [
  { id: 'low', max: 30, label: '低锋芒', color: 'good', desc: '更适合隐藏、发育和苟活。' },
  { id: 'mid', max: 65, label: '中锋芒', color: 'warn', desc: '更容易接触人物、任务和交易机会。' },
  { id: 'high', max: 100, label: '高锋芒', color: 'bad', desc: '更容易被挑战、掠夺者和势力注意。' },
];

export function band(value) {
  return BANDS.find((b) => value <= b.max) ?? BANDS[BANDS.length - 1];
}

export function change(state, delta) {
  state.fame = clamp(Math.round(state.fame + delta), 0, 100);
  return state.fame;
}

/** 随机事件权重修正：高锋芒更容易被盯上，中锋芒更容易遇到交易机会。 */
export function eventWeightMod(state, kind) {
  const b = band(state.fame).id;
  if (kind === 'hostile') return b === 'high' ? 1.8 : b === 'mid' ? 1.2 : 0.7;
  if (kind === 'trade') return b === 'mid' ? 1.6 : b === 'high' ? 1.2 : 0.8;
  return 1;
}

export const status = (state) => ({ value: state.fame, ...band(state.fame) });
