/**
 * 结果结算：所有系统产出的 Outcome 都只在这里落到状态上，并产生界面反馈。
 * 顺序固定为：资源 → 状态 → 数值 → 关系 → Flag → 时间结算 → 后续事件 → 任务 → 存档。
 * @module core/effects
 */
import { toast, pulse } from './store.js';
import { clamp, signed } from './util.js';
import { item } from '../data/items.js';
import * as Achievement from '../systems/Achievement.js';
import * as Battle from '../systems/Battle.js';
import * as Daily from '../systems/Daily.js';
import * as Death from '../systems/Death.js';
import * as Ending from '../systems/Ending.js';
import * as Event from '../systems/Event.js';
import * as Faction from '../systems/Faction.js';
import * as Fame from '../systems/Fame.js';
import * as GameTime from '../systems/GameTime.js';
import * as Growth from '../systems/Growth.js';
import * as Inventory from '../systems/Inventory.js';
import * as Mind from '../systems/Mind.js';
import * as NPC from '../systems/NPC.js';
import * as Power from '../systems/Power.js';
import * as Quest from '../systems/Quest.js';
import * as Save from '../systems/Save.js';
import { META } from '../systems/Survival.js';

export function applyOutcome(state, outcome, opts = {}) {
  if (!outcome) return { ok: false, reason: '没有任何结果' };
  if (outcome.ok === false) {
    if (outcome.reason) toast(outcome.reason, 'bad');
    return { ok: false, reason: outcome.reason ?? '操作失败' };
  }

  const notes = [...(outcome.notes ?? [])];
  // 注意：这里不触碰 state.active。待处理事件的生命周期只由它的拥有者管理
  // （resolveChoice 解决它、afterBattle 结束战斗），否则玩家还没看到的剧情会被行动结算顶掉。

  /* 1. 资源 */
  if (outcome.items && Object.keys(outcome.items).length > 0) {
    const applied = Inventory.applyItems(state, outcome.items);
    if (!applied.ok) {
      const losses = Object.fromEntries(Object.entries(outcome.items).filter(([, v]) => v < 0));
      Inventory.applyItems(state, losses);
      toast('仓库容量不足，新增物资没能带回', 'warn');
    } else {
      // 记下这批入账：倒地时会丢失"最近一次搜集"的东西（Death.recordGain）
      Death.recordGain(state, outcome.items, outcome.logKind ?? '');
      for (const [id, v] of Object.entries(outcome.items)) if (v !== 0) pulse(`${item(id).name} ${signed(v)}`, v > 0 ? 'good' : 'bad');
    }
  }

  /* 2. 六项状态 */
  if (outcome.stats) {
    for (const [k, v] of Object.entries(outcome.stats)) {
      if (!META[k] || !v) continue;
      state.stats[k] = clamp(state.stats[k] + v, 0, 100);
      pulse(`${META[k].label} ${signed(v)}`, v > 0 ? 'good' : 'bad');
    }
  }

  /* 3. 数值与光脑 */
  if (outcome.fame) { Fame.change(state, outcome.fame); pulse(`锋芒值 ${signed(outcome.fame)}`, 'warn'); }
  if (outcome.currency) { state.currency = Math.max(0, state.currency + outcome.currency); pulse(`货币 ${signed(outcome.currency)}`, 'info'); }
  if (outcome.cores) { state.cores = Math.max(0, state.cores + outcome.cores); pulse(`晶核 ${signed(outcome.cores)}`, 'mind'); }
  if (outcome.allies) state.allies = Math.max(0, state.allies + outcome.allies);
  if (outcome.kills) {
    for (const [id, n] of Object.entries(outcome.kills)) state.kills[id] = (state.kills[id] ?? 0) + n;
  }
  if (outcome.aid) {
    state.aid.members = clamp(state.aid.members + (outcome.aid.members ?? 0), 0, 20);
    state.aid.morale = clamp(state.aid.morale + (outcome.aid.morale ?? 0), 0, 100);
    for (const id of outcome.aid.join ?? []) if (!state.aid.joined.includes(id)) state.aid.joined.push(id);
  }
  if (outcome.mind) {
    if (outcome.mind.level) state.mindLevel = clamp(outcome.mind.level, 1, 5);
    if (outcome.mind.xp) {
      const leveled = Mind.addXp(state, outcome.mind.xp * Mind.powerBonus(state));
      if (leveled > 0) toast(`光脑升级：Lv.${state.mindLevel}`, 'mind');
    }
  }
  if (outcome.base) {
    for (const [id, delta] of Object.entries(outcome.base)) {
      const max = 5;
      state.base[id] = clamp((state.base[id] ?? 0) + delta, 0, max);
    }
  }
  // 科技：四条线各自累加（研究成本在 systems/Tech.js 里扣）
  if (outcome.tech) {
    state.tech = state.tech ?? {};
    for (const [id, delta] of Object.entries(outcome.tech)) {
      state.tech[id] = clamp((state.tech[id] ?? 0) + delta, 0, 5);
    }
  }

  /* 4. 人物关系、势力立场与 Flag */
  if (outcome.npc) for (const [id, deltas] of Object.entries(outcome.npc)) NPC.change(state, id, deltas);
  if (outcome.faction) {
    for (const [id, deltas] of Object.entries(outcome.faction)) {
      const wasKnown = Faction.known(state, id);
      const before = Faction.standing(state, id);
      Faction.change(state, id, deltas.standing ?? 0, { discover: deltas.known === true });
      const after = Faction.standing(state, id);
      if (after !== before) pulse(`${Faction.faction(id).name} ${signed(after - before)}`, after > before ? 'good' : 'bad');
      if (!wasKnown && Faction.known(state, id)) toast(`新势力登场：${Faction.faction(id).name}`, 'mind');
    }
  }
  if (outcome.flags) Object.assign(state.flags, outcome.flags);
  if (outcome.location !== undefined) {
    state.location = outcome.location;
    if (outcome.location) state.visited[outcome.location] = (state.visited[outcome.location] ?? 0) + 1;
  }

  /* 5. 时间结算（内部含跨日刷新与死亡判定） */
  let timeResult = { minutes: 0, death: null };
  if (outcome.minutes > 0) timeResult = GameTime.spend(state, outcome.minutes, { indoor: outcome.indoor ?? true, activity: outcome.activity });
  if (outcome.minutes !== 0) state.actions += 1;

  /* 6. 后续：战斗 → 事件 → 排队的脚本事件 → 随机事件 */
  if (outcome.ending && !state.ending) Ending.apply(state, outcome.ending);
  if (!state.ending) {
    if (outcome.battle) {
      // outcome.battle 可以是敌人 id，也可以是 { enemy, stake }（NPC 对战带赌注）
      const b = typeof outcome.battle === 'string' ? { enemy: outcome.battle } : outcome.battle;
      Battle.start(state, b.enemy, { stake: b.stake ?? null, source: b.source ?? null });
    } else if (outcome.event) Event.activate(state, outcome.event, 'outcome');
    else if (state.battle && !state.battle.over) { /* 战斗中不推进剧情 */ }
    else if (state.active) { /* 已有待处理事件，保留它，等玩家决策 */ }
    else {
      const queued = Event.advanceStory(state);
      if (!queued && (outcome.minutes ?? 0) >= 45 && chanceForRandom(state, outcome)) {
        const id = Event.rollRandom(state);
        if (id) Event.activate(state, id, 'random');
      }
    }
  }

  /* 7. 任务与战力 */
  const finished = Quest.sync(state);
  Power.refresh(state);

  /* 7.5 商业化系统：角色成长 → 每日任务 → 成就（顺序固定，后一个能看到前一个的结果） */
  Growth.addXp(state, Math.max(1, Math.round((outcome.minutes ?? 0) / 10)) + (opts.resolvedEventId ? 12 : 0));
  Daily.ensure(state);
  Daily.observe(state, outcome, opts);
  Achievement.sync(state);

  /* 8. 日志与提示 */
  const text = notes.length > 0 ? notes.join(' ') : outcome.log;
  if (text) {
    state.log.push({ day: state.day, time: state.time, text, kind: outcome.logKind ?? 'info' });
    if (state.log.length > Save.MAX_LOG) state.log = state.log.slice(-Save.MAX_LOG);
  }
  for (const t of outcome.toasts ?? []) toast(t.text, t.kind);
  if (outcome.toast) toast(outcome.toast.text, outcome.toast.kind);

  /* 9. 关键节点自动存档 */
  if (opts.autosave ?? outcome.autosave ?? Boolean(opts.resolvedEventId)) {
    Save.save(state, opts.reason ?? (opts.resolvedEventId ? '关键剧情' : '行动'));
  }

  return {
    ok: true,
    notes,
    finished,
    death: timeResult.death ?? null,
    ending: state.ending,
    battle: state.battle && !state.battle.over ? state.battle : null,
    event: state.active?.kind === 'event' ? state.active : null,
  };
}

/** 随机事件只在外出或长时间行动后出现，避免节奏过密。 */
function chanceForRandom(state, outcome) {
  if (state.milestone) return false;
  return outcome.random !== false;
}

/** 战斗结束后清场，并把排队的剧情事件接上。 */
export function afterBattle(state) {
  state.battle = null;
  state.active = null;
  advanceQueue(state);
  Quest.sync(state);
  Power.refresh(state);
  Save.save(state, '战斗结束');
  return { event: state.active };
}

/** 把队列里的下一段剧情接上（新游戏、跨日、战斗结束后都必须调用）。 */
export function advanceQueue(state) {
  if (!state || state.ending || state.active) return null;
  return Event.advanceStory(state);
}

/** 事件结算的便捷入口：从当前活动事件里选一个选项并结算。 */
export function resolveChoice(state, choiceId) {
  const active = state.active;
  if (!active || active.kind !== 'event') return { ok: false, reason: '当前没有事件' };
  const chosen = Event.choose(state, active.id, choiceId);
  if (!chosen.ok) { toast(chosen.reason ?? '无法选择', 'bad'); return chosen; }
  state.active = null;   // 玩家已决策，交还控制权；后续剧情由 applyOutcome 接管
  return applyOutcome(state, chosen.outcome, {
    autosave: true,
    reason: '关键剧情选择',
    resolvedEventId: active.id,
  });
}

/** 行动结算入口。 */
export function perform(state, outcome) { return applyOutcome(state, outcome); }
