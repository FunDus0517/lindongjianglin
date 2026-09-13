/**
 * 每日任务（商业化升级 §七：每日任务）。
 * 每天从池中确定性抽 3 条；进度从「统一的 Outcome 管道」里推断，少量系统自己声明
 * （outcome.daily = { craft: 1 }），因此不需要在每个行动里手写埋点。
 * 完成即时发放奖励，不引入"手动领取"这一步（手机上少一次点击）。
 * @module systems/Daily
 */
import { DAILY_ALL_BONUS, DAILY_COUNT, DAILY_POOL, daily } from '../data/dailies.js';
import { toast } from '../core/store.js';
import * as Growth from './Growth.js';

export const DEFAULT = () => ({ day: 1, tasks: [], done: 0, streak: 0, metrics: {}, bonus: false });

export const current = (state) => state.daily ?? null;

/** 确定性抽签：同一天无论重开多少次都是同样三条。 */
function pick(day) {
  const start = ((day * 7) % DAILY_POOL.length + DAILY_POOL.length) % DAILY_POOL.length;
  const seen = new Map();
  for (let i = 0; seen.size < DAILY_COUNT && i < DAILY_POOL.length; i++) {
    const def = DAILY_POOL[(start + i * 5) % DAILY_POOL.length];
    seen.set(def.id, def);
  }
  return [...seen.values()];
}

/** 跨日刷新：先结算昨天的连击，再抽今天的任务。 */
export function refresh(state, prevDay = null) {
  const prev = state.daily;
  const notes = [];
  let streak = prev?.streak ?? 0;
  const yesterday = prevDay ?? prev?.day ?? null;
  if (prev && yesterday !== null && prev.day === yesterday && prev.tasks?.length) {
    const allDone = prev.tasks.every((t) => t.done);
    if (allDone) {
      streak += 1;
      notes.push(`昨日每日任务全部完成，连续 ${streak} 天`);
    } else if (streak > 0) {
      streak = 0;
      notes.push('昨日每日任务没有做完，连击中断');
    }
  }
  state.daily = {
    day: state.day,
    tasks: pick(state.day).map((d) => ({ id: d.id, progress: 0, done: false })),
    done: 0,
    streak,
    metrics: {},
    bonus: false,
  };
  return notes;
}

/** 手动记一次进度（少数推断不出来的行为，例如加工、进食、交易、休息）。 */
export function track(state, metric, n = 1) {
  const d = state.daily;
  if (!d || !(n > 0)) return [];
  d.metrics[metric] = (d.metrics[metric] ?? 0) + n;
  return settle(state);
}

/**
 * 保证今天的任务存在。旧存档（没有 daily 字段）或跨日加载时由这里补上，
 * 界面就不需要自己判断"有没有任务"。
 */
export function ensure(state) {
  const d = state.daily;
  if (!d) { refresh(state); return true; }
  if (!Array.isArray(d.tasks) || d.tasks.length === 0 || d.day !== state.day) { refresh(state); return true; }
  return false;
}

/**
 * 从一次 Outcome 推断进度。所有行动都走 applyOutcome，所以这里是唯一埋点。
 * opts.resolvedEventId 表示这是一次剧情结算。
 */
export function observe(state, outcome, opts = {}) {
  const d = state.daily;
  if (!d || !outcome) return [];
  const inc = (k, n = 1) => { if (n > 0) d.metrics[k] = (d.metrics[k] ?? 0) + n; };

  if (outcome.daily) for (const [k, n] of Object.entries(outcome.daily)) inc(k, n);
  if ((outcome.minutes ?? 0) > 0 && outcome.indoor === false) inc('out', 1);
  if (outcome.npc && Object.values(outcome.npc).some((v) => (v.favor ?? 0) > 0 || (v.trust ?? 0) > 0)) inc('social', 1);
  if (outcome.items) {
    let gained = 0;
    for (const n of Object.values(outcome.items)) if (n > 0) gained += n;
    if (gained > 0) inc('gather', gained);
  }
  if (outcome.kills) inc('kill', Object.values(outcome.kills).reduce((a, b) => a + b, 0));
  if (opts.resolvedEventId || outcome.event) inc('story', 1);
  if ((state.stats?.warmth ?? 0) >= 60) d.metrics.warm = Math.max(d.metrics.warm ?? 0, 1);

  return settle(state);
}

/** 依据 metrics 重算任务进度，完成即发奖励。 */
function settle(state) {
  const d = state.daily;
  if (!d) return [];
  const finished = [];
  for (const t of d.tasks) {
    const def = daily(t.id);
    if (!def) continue;
    t.progress = Math.min(def.target, d.metrics[def.metric] ?? 0);
    if (!t.done && t.progress >= def.target) {
      t.done = true;
      finished.push(def);
      state.currency = Math.max(0, (state.currency ?? 0) + (def.reward.currency ?? 0));
      state.cores = Math.max(0, (state.cores ?? 0) + (def.reward.cores ?? 0));
      if (def.reward.growth) Growth.addXp(state, def.reward.growth);
      toast(`每日任务完成：${def.name}`, 'good');
    }
  }
  d.done = d.tasks.filter((t) => t.done).length;

  if (!d.bonus && d.tasks.length > 0 && d.done === d.tasks.length) {
    d.bonus = true;
    state.currency = Math.max(0, (state.currency ?? 0) + DAILY_ALL_BONUS.currency);
    state.cores = Math.max(0, (state.cores ?? 0) + DAILY_ALL_BONUS.cores);
    Growth.addXp(state, DAILY_ALL_BONUS.growth);
    toast('今日任务全部完成！', 'mind');
  }
  return finished;
}

/** 界面视图。 */
export function view(state) {
  const d = state.daily;
  if (!d) return null;
  return {
    day: d.day,
    done: d.done,
    total: d.tasks.length,
    streak: d.streak ?? 0,
    bonus: Boolean(d.bonus),
    tasks: d.tasks.map((t) => {
      const def = daily(t.id) ?? { id: t.id, name: t.id, hint: '', target: 1 };
      return { ...def, progress: t.progress ?? 0, done: Boolean(t.done) };
    }),
  };
}

export { DAILY_POOL, DAILY_COUNT, DAILY_ALL_BONUS };
