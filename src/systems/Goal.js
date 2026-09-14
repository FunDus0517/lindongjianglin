/**
 * 长期目标（V3.0 策划案 §十三）。达成就永久记录，不给"通关"，只给称号与一点资源。
 * 每条目标的进度都由**已有状态**推导（基地等级 / 幸存者 / 科技 / 到访城区），
 * 所以不需要额外维护计数器，也不会出现"进度和实际不符"。
 * @module systems/Goal
 */
import { GOALS, goal } from '../data/goals.js';
import { toast } from '../core/store.js';

export const list = () => GOALS;

/** 进度视图：每条目标的百分比、说明、是否达成。 */
export function view(state) {
  const done = state.goals ?? {};
  return GOALS.map((g) => {
    const p = Math.max(0, Math.min(1, g.progress(state)));
    return {
      id: g.id,
      name: g.name,
      icon: g.icon,
      desc: g.desc,
      percent: Math.round(p * 100),
      detail: g.detail(state),
      done: Boolean(done[g.id]) || p >= 1,
      wasDone: Boolean(done[g.id]),
    };
  });
}

/** 已完成数量与总体进度。 */
export function summary(state) {
  const v = view(state);
  const doneCount = v.filter((g) => g.done).length;
  const overall = Math.round(v.reduce((a, g) => a + g.percent, 0) / v.length);
  return { done: doneCount, total: v.length, overall, items: v };
}

/**
 * 每日检查：刚达成的目标写进存档、发一点奖励并提示。
 * 返回标准 Outcome 片段（由调用方并入统一结算），没有新达成就返回 null。
 */
export function check(state) {
  state.goals = state.goals ?? {};
  const fresh = [];
  for (const g of GOALS) {
    if (state.goals[g.id]) continue;
    if (g.progress(state) >= 1) {
      state.goals[g.id] = { day: state.day };
      fresh.push(g);
    }
  }
  if (fresh.length === 0) return null;
  for (const g of fresh) toast(`长期目标达成：${g.icon} ${g.name}`, 'good');
  return {
    ok: true,
    minutes: 0,
    cores: fresh.length * 3,
    currency: fresh.length * 60,
    notes: fresh.map((g) => `长期目标达成：${g.icon} ${g.name} —— ${g.desc}`),
    flags: Object.fromEntries(fresh.map((g) => [`goal_${g.id}`, true])),
  };
}

/** 下一个最接近完成的目标（首页/总结页用来给方向）。 */
export function nearest(state) {
  const v = view(state).filter((g) => !g.done).sort((a, b) => b.percent - a.percent);
  return v[0] ?? null;
}

export { goal };
