/**
 * 结局判定与展示（项目书 §18）。结局由整个流程的累计数据决定，不是选项。
 * 判定读的是「派生视图」：在存档状态之上补出排名、库存价值、势力立场等派生量，
 * 这样 data/endings.js 里的条件可以写得像规则，而不必反向依赖系统模块。
 * @module systems/Ending
 */
import { ENDING_LIST, ending } from '../data/endings.js';
import { item } from '../data/items.js';
import * as Faction from './Faction.js';
import * as Power from './Power.js';
import { band } from './Fame.js';

/** 库存价值：把「高储备」变成可判定的数字。 */
export function stockValue(state) {
  return Object.entries(state.inventory ?? {}).reduce((sum, [id, n]) => sum + item(id).value * n, 0);
}

/** 结局判定的派生视图。 */
export function viewOf(state) {
  return {
    ...state,
    rank: Power.myRank(state),
    stock: stockValue(state),
    aidMembers: state.aid?.members ?? 0,
    lindong: Faction.standing(state, 'lindong'),
    raiders: Faction.standing(state, 'raiders'),
    aidnet: Faction.standing(state, 'aidnet'),
    defense: state.base?.defense ?? 0,
    shelter: state.base?.shelter ?? 0,
    greenhouse: state.base?.greenhouse ?? 0,
  };
}

/** 第 30 天结算：按优先级取第一个成立的结局，否则落回兜底结局。 */
export function evaluate(state) {
  const view = viewOf(state);
  for (const e of ENDING_LIST) {
    if (e.kind === 'death' || e.fallback) continue;
    if (e.condition?.(view)) return e.id;
  }
  return 'survivor';
}

/** 本局统计快照（结局页与阶段报告共用同一份口径）。 */
export function snapshot(state) {
  const view = viewOf(state);
  return {
    存活天数: state.day,
    剩余生命: Math.round(state.stats.hp),
    体温: Math.round(state.stats.warmth),
    精神: Math.round(state.stats.mind),
    战力: state.power,
    战力榜排名: `#${view.rank}`,
    锋芒值: `${state.fame}（${band(state.fame).label}）`,
    光脑等级: state.mindLevel,
    库存价值: view.stock,
    货币: state.currency,
    晶核: state.cores,
    互助体系: `${view.aidMembers} 人｜士气 ${Math.round(state.aid?.morale ?? 0)}`,
    队友: state.allies > 0 ? '龙九星' : '无',
    凛冬城立场: view.lindong,
    掠夺者立场: view.raiders,
    基地等级: Object.values(state.base).reduce((a, b) => a + b, 0),
  };
}

/**
 * 阶段报告（商业化升级 §六：不设置固定结局）。
 * 只计算"如果此刻收尾会是哪个结局"，**不结束游戏** —— 玩家可以继续活下去。
 */
export function report(state, day = state.day) {
  const id = evaluate(state);
  const def = ending(id);
  return {
    day,
    endingId: id,
    title: def?.title ?? '—',
    desc: def?.desc ?? '',
    stats: snapshot(state),
    at: { day: state.day, time: state.time },
  };
}

/** 应用结局并冻结一局数据快照（结局页展示本局统计）。仅在死亡时调用。 */
export function apply(state, id) {
  const def = ending(id) ?? ending('survivor');
  const view = viewOf(state);
  state.ending = {
    id: def.id,
    day: state.day,
    title: def.title,
    kind: def.kind,
    stats: snapshot(state),
    at: { day: state.day, time: state.time },
  };
  return state.ending;
}

export const current = (state) => (state.ending ? ending(state.ending.id) : null);
export const finished = (state) => state.ending !== null;
export { ENDING_LIST, ending };
