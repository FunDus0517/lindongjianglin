/**
 * 交易区（项目书 §4 第 21 天、§11 光脑·交易区）。
 * 买卖共用一套价格模型；每日库存有限，价格随日期、锋芒值与势力立场波动。
 * @module systems/Market
 */
import { GOODS, MARKET_UNLOCK_DAY, good } from '../data/market.js';
import { clamp } from '../core/util.js';
import * as Faction from './Faction.js';
import * as Inventory from './Inventory.js';
import { item } from '../data/items.js';

export { MARKET_UNLOCK_DAY };

export const isOpen = (state) => state.day >= MARKET_UNLOCK_DAY;

/** 当日波动系数：由种子与日期决定，可复现。 */
function volatility(state, id) {
  const idx = GOODS.findIndex((g) => g.id === id);
  const raw = (state.seed + state.day * 31 + idx * 7) % 31;
  return 0.85 + raw / 100;
}

/** 日期系数：越晚越贵。 */
const dayFactor = (state) => 1 + Math.max(0, state.day - MARKET_UNLOCK_DAY) * 0.035;
/** 锋芒系数：被认出来就要加价。 */
const fameFactor = (state) => 1 + (clamp(state.fame, 0, 100) - 30) / 250;
/** 势力折扣：与凛冬城有往来时可以拿到平价。 */
const factionFactor = (state) => 1 - clamp(Faction.standing(state, 'lindong') / 400, -0.1, 0.15);

export function buyPrice(state, id) {
  const g = good(id);
  if (!g) return 0;
  return Math.max(1, Math.round(g.base * dayFactor(state) * fameFactor(state) * factionFactor(state) * volatility(state, id)));
}

export const sellPrice = (state, id) => Math.max(1, Math.round(buyPrice(state, id) * 0.55));

/** 当日库存：每日刷新时重置。 */
export function refresh(state) {
  state.market = { day: state.day, stock: {} };
  for (const g of GOODS) state.market.stock[g.id] = g.stock;
}

export const remaining = (state, id) => state.market?.stock?.[id] ?? 0;

/** 交易区面板数据。 */
export function offers(state) {
  return GOODS.map((g) => ({
    ...g,
    buy: buyPrice(state, g.id),
    sell: sellPrice(state, g.id),
    left: remaining(state, g.id),
    owned: g.scalar ? (state.cores ?? 0) : Inventory.count(state, g.id),
  }));
}

export function canBuy(state, id, n = 1) {
  const g = good(id);
  if (!g) return '商品不存在';
  if (!isOpen(state)) return `交易区将在第 ${MARKET_UNLOCK_DAY} 天开放`;
  if (remaining(state, id) < n) return `今日库存不足（剩 ${remaining(state, id)}）`;
  const cost = buyPrice(state, id) * n;
  if (state.currency < cost) return `货币不足（需要 ${cost}）`;
  if (!g.scalar) {
    const fit = Inventory.canFit(state, { [id]: n });
    if (fit !== true) return fit;
  }
  return true;
}

export function canSell(state, id, n = 1) {
  const g = good(id);
  if (!g) return '商品不存在';
  if (!isOpen(state)) return `交易区将在第 ${MARKET_UNLOCK_DAY} 天开放`;
  if (g.scalar) return (state.cores ?? 0) >= n ? true : `晶核不足（当前 ${state.cores ?? 0}）`;
  return Inventory.has(state, id, n) ? true : `库存不足（需要 ${item(id).name}×${n}）`;
}

export function buy(state, id, n = 1) {
  const ok = canBuy(state, id, n);
  if (ok !== true) return { ok: false, reason: ok };
  const g = good(id);
  const cost = buyPrice(state, id) * n;
  state.market.stock[id] -= n;
  const outcome = {
    ok: true,
    minutes: 15 * n,
    currency: -cost,
    notes: [`你花 ${cost} 货币买下 ${g.scalar ? '晶核' : item(id).name} ×${n}。`],
    toasts: [{ text: `${g.scalar ? '晶核' : item(id).name} ×${n}｜货币 −${cost}`, kind: 'good' }],
    flags: { traded: true },
  };
  if (g.scalar) outcome.cores = n; else outcome.items = { [id]: n };
  return outcome;
}

export function sell(state, id, n = 1) {
  const ok = canSell(state, id, n);
  if (ok !== true) return { ok: false, reason: ok };
  const g = good(id);
  const gain = sellPrice(state, id) * n;
  const outcome = {
    ok: true,
    minutes: 15 * n,
    currency: gain,
    notes: [`你卖出 ${g.scalar ? '晶核' : item(id).name} ×${n}，换回 ${gain} 货币。`],
    toasts: [{ text: `货币 +${gain}`, kind: 'info' }],
    flags: { traded: true },
  };
  if (g.scalar) outcome.cores = -n; else outcome.items = { [id]: -n };
  return outcome;
}

/** 物价指数：界面上一句话说明“今天贵不贵”。 */
export function index(state) {
  const avg = GOODS.reduce((a, g) => a + buyPrice(state, g.id) / g.base, 0) / GOODS.length;
  const label = avg >= 1.25 ? '全面涨价' : avg >= 1.1 ? '偏贵' : avg <= 0.95 ? '相对便宜' : '平稳';
  return { value: Math.round(avg * 100), label };
}
