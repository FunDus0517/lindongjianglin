/**
 * 排班分工（V3.0 策划案：玩家指派幸存者的工作）。
 *
 * 设计：每天每人一份工作；产出与"职业等级 + 健康"挂钩，所以养人是有回报的，
 * 累坏了就该排一班休息。守夜会拉长凌晨灾害的间隔，照看伤病会加快伤者恢复。
 * 全部是确定性结算，不消耗随机数（见 Weather.roll 的注释）。
 * @module systems/Crew
 */
import { DEFAULT_JOB, JOB_IDS, JOBS, job } from '../data/jobs.js';
import { ladderFor } from '../data/crew.js';
import { clamp } from '../core/util.js';

export const DEFAULT = {};

/** 某人的排班（未指派就是默认工作）。 */
export const assignmentOf = (state, id) => state.crew?.[id] ?? DEFAULT_JOB;
export const isAssigned = (state, id) => Boolean(state.crew?.[id]);

/** 指派工作。 */
export function assign(state, id, jobId) {
  if (!JOB_IDS.includes(jobId)) return { ok: false, reason: '没有这个工种' };
  const r = state.npcs?.[id];
  if (!r) return { ok: false, reason: '人物不存在' };
  if (r.alive === false) return { ok: false, reason: '他已经不在了' };
  if (r.left || r.joinFaction) return { ok: false, reason: '他不在你的基地里' };
  state.crew = state.crew ?? {};
  state.crew[id] = jobId;
  return { ok: true };
}

/** 职业等级与健康共同决定效率。 */
function efficiency(state, id) {
  const r = state.npcs[id];
  const ladder = ladderFor(id);
  const idx = Math.max(0, ladder.indexOf(r.role ?? ladder[0]));
  const health = clamp((r.health ?? 100) / 100, 0.3, 1);
  return (1 + idx * 0.35) * health;
}

/**
 * 在岗的人：活着、没走、没投靠别人、已经接触过。
 * 注意必须返回**真实的关系对象**（不能是浅拷贝），否则下面的健康/压力改动会丢；
 * 顺手把 id 写回对象上，方便下游使用。
 */
export const roster = (state) =>
  Object.entries(state.npcs ?? {})
    .filter(([, r]) => r.met && r.alive !== false && !r.left && !r.joinFaction)
    .map(([id, r]) => Object.assign(r, { id }));

/** 工种产出对应的真实物品 id。 */
const OUT_ITEM = { food: 'canned', water: 'purified', parts: 'parts' };

export const countJob = (state, jobId) => roster(state).filter((r) => assignmentOf(state, r.id) === jobId).length;
export const guards = (state) => countJob(state, 'guard');

/**
 * 每日排班结算：产出资源、影响士气与伤者恢复。
 * @returns {{notes:string[], items:object, guardCount:number, medicCount:number}}
 */
export function dailySettlement(state) {
  const notes = [];
  const items = {};
  const crew = roster(state);
  if (crew.length === 0) return { notes, items, guardCount: 0, medicCount: 0 };

  const tally = {};
  for (const r of crew) {
    const jobId = assignmentOf(state, r.id);
    const j = job(jobId);
    tally[jobId] = (tally[jobId] ?? 0) + efficiency(state, r.id);

    if (jobId === 'rest') {
      r.health = clamp((r.health ?? 100) + 6, 0, 100);
      r.stress = clamp((r.stress ?? 0) - 12, 0, 100);
    } else {
      const wear = j.risk >= 1 ? 3 : j.risk >= 0.4 ? 1 : 0;
      r.health = clamp((r.health ?? 100) - wear, 0, 100);
      if (j.risk >= 1) r.stress = clamp((r.stress ?? 0) + 2, 0, 100);
    }
  }

  // 产出：效率取整，避免"半个人"也能产出
  for (const [jobId, eff] of Object.entries(tally)) {
    const j = job(jobId);
    if (!j.out) continue;
    const scale = Math.floor(eff);
    if (scale <= 0) continue;
    for (const [kind, n] of Object.entries(j.out)) {
      const itemId = OUT_ITEM[kind];
      if (itemId) items[itemId] = (items[itemId] ?? 0) + n * scale;
    }
  }
  const parts = [];
  for (const [id, n] of Object.entries(items)) parts.push(`${id === 'canned' ? '食物' : id === 'purified' ? '净水' : '零件'} +${n}`);
  if (parts.length > 0) notes.push(`排班产出：${parts.join('、')}`);

  // 照看伤病：加快伤者恢复
  const medicCount = Math.floor(tally.medic ?? 0);
  if (medicCount >= 1) {
    let healed = 0;
    for (const r of crew) {
      if ((r.injured ?? 0) > 0) {
        r.injured = Math.max(0, r.injured - 1);
        r.health = clamp((r.health ?? 100) + 5, 0, 100);
        healed += 1;
      }
    }
    if (healed > 0) notes.push(`有人照看伤病，${healed} 个伤员恢复得更快。`);
  }
  if (Math.floor(tally.logistics ?? 0) >= 1) {
    state.aid.morale = clamp((state.aid?.morale ?? 0) + 3, 0, 100);
    notes.push('后勤把伙食和仓储理顺了，士气上升。');
  }

  return { notes, items, guardCount: Math.floor(tally.guard ?? 0), medicCount };
}

/** 界面视图：每个人的排班、效率与健康。 */
export function view(state) {
  return roster(state).map((r) => ({
    id: r.id,
    jobId: assignmentOf(state, r.id),
    assigned: isAssigned(state, r.id),
    eff: Number(efficiency(state, r.id).toFixed(2)),
    health: Math.round(r.health ?? 100),
    injured: r.injured ?? 0,
    role: r.role,
  }));
}

export { JOB_IDS, JOBS, DEFAULT_JOB, job };
