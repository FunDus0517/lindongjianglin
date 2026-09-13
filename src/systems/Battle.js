/**
 * 文字战斗（项目书 §15）。战斗结果由战力、敌方强度、装备、精力、精神、
 * 人物协助、天气与随机因素共同计算。
 * @module systems/Battle
 */
import { BATTLE_MOVES, ENEMIES } from '../data/battle.js';
import { chance, clamp, randInt } from '../core/util.js';
import * as Inventory from './Inventory.js';
import * as Mind from './Mind.js';
import * as Power from './Power.js';
import { item } from '../data/items.js';

export const move = (id) => BATTLE_MOVES[id];
export const enemyOf = (id) => ENEMIES[id];

/** 玩家防御：装备保暖层、防御设施与装备强化同时提供战斗减伤。 */
export const playerDef = (state) =>
  1 + Inventory.equipStats(state).warmthResist * 0.5 + (state.base.defense ?? 0) * 0.5 + Mind.enhanceLevel(state, 'gear');
/** 玩家攻击：基础 + 武器 + 武器强化 + 晶核 - 精神影响。 */
export const playerAtk = (state) =>
  6 + Inventory.equipStats(state).weapon * 4 + Mind.enhanceLevel(state, 'weapon') * 3 + Math.floor((state.cores ?? 0) * 1.5) + (state.stats.mind < 30 ? -2 : 0);

/**
 * 开战。opts.stake 是这一战的"赌注"（NPC 对战用）：胜利后合并进结算，
 * 例如打了掠夺者会让掠夺者立场下降。放在赌注里而不是敌人定义里，
 * 是因为同一个敌人可能从不同剧情节点打起来，后果不一样。
 */
export function start(state, enemyId, opts = {}) {
  const e = ENEMIES[enemyId] ?? ENEMIES.raider;
  state.battle = {
    enemyId: e.id, name: e.name, icon: e.icon, level: e.level,
    hp: e.hp, maxHp: e.hp, atk: e.atk, def: e.def,
    round: 1, log: [e.intro], over: false, result: null,
    stake: opts.stake ?? null,
    source: opts.source ?? null,
  };
  state.active = { kind: 'battle', id: e.id };
  return state.battle;
}

export const current = (state) => state.battle;
export const active = (state) => Boolean(state.battle && !state.battle.over);

/** 可用指令及不可用原因（弹药、精力、队友）。 */
export function moves(state) {
  return Object.values(BATTLE_MOVES).map((m) => {
    if (m.needs) {
      for (const [id, n] of Object.entries(m.needs)) {
        if (!Inventory.has(state, id, n)) return { ...m, enabled: false, reason: `需要 ${item(id).name}×${n}` };
      }
    }
    if (m.cost?.energy && state.stats.energy < m.cost.energy) return { ...m, enabled: false, reason: `精力不足（需要 ${m.cost.energy}）` };
    if (m.id === 'ally' && (state.allies ?? 0) <= 0) return { ...m, enabled: false, reason: '没有可协助的队友' };
    return { ...m, enabled: true, reason: null };
  });
}

/** 伤害 =（攻击 − 防御×0.8）× 0.85—1.15 的确定性浮动。 */
function dmg(state, atk, def) {
  const variance = 0.85 + randInt(state, 0, 30) / 100;
  return Math.max(1, Math.round((atk - def * 0.8) * variance));
}

/** 结算一次指令，返回 Outcome（时间消耗在 effects 中统一推进）。 */
export function act(state, moveId) {
  const b = state.battle;
  if (!b || b.over) return { ok: false, reason: '战斗已经结束' };
  const m = BATTLE_MOVES[moveId];
  if (!m) return { ok: false, reason: '指令不存在' };
  const verdict = moves(state).find((x) => x.id === moveId);
  if (verdict && !verdict.enabled) return { ok: false, reason: verdict.reason };

  const notes = [];
  const stats = { energy: -2 };
  const items = {};
  const atk = playerAtk(state);
  const pdef = playerDef(state);
  let enemyHits = false;

  if (moveId === 'retreat') {
    if (chance(state, 0.6 + (state.stats.energy / 400))) {
      b.log.push('你后退、转身、跑过两个路口。身后没有追上来。');
      return finish(state, { escaped: true, notes: ['你成功脱离战斗。'], stats: { energy: -6, mind: -2 }, minutes: m.minutes });
    }
    notes.push('撤退失败——对方堵住了退路。');
    enemyHits = true;
  } else if (moveId === 'sneak') {
    if (chance(state, 0.45 + state.stats.energy / 500)) {
      const d = Math.max(1, Math.round(dmg(state, atk, b.def) * 0.6));
      b.hp -= d;
      b.log.push(`你从侧面贴近，短促地打了一下（−${d}）。他没有立刻反应过来。`);
    } else {
      notes.push('潜行失败，你被发现了。');
      enemyHits = true;
    }
  } else if (moveId === 'ranged') {
    items.ammo = -1;
    if (chance(state, 0.75)) {
      const d = dmg(state, atk * 1.3, b.def);
      b.hp -= d;
      b.log.push(`枪声在空楼之间回荡（−${d}）。你保持着距离。`);
    } else {
      notes.push('子弹打偏了，声音却传得很远。');
      enemyHits = true;
    }
  } else if (moveId === 'skill') {
    stats.energy -= m.cost.energy;
    const d = dmg(state, atk * 1.8, b.def);
    b.hp -= d;
    b.log.push(`你把所有力气压进这一下（−${d}）。`);
  } else if (moveId === 'ally') {
    const d = dmg(state, atk * 0.9, b.def);
    b.hp -= d;
    b.log.push(`队友从另一侧包了上来（−${d}）。`);
  } else {
    const d = dmg(state, atk, b.def);
    b.hp -= d;
    b.log.push(`你正面攻击（−${d}）。`);
    enemyHits = true;
  }

  if (b.hp <= 0) {
    b.hp = 0;
    return finish(state, { won: true, notes: [...notes, `${b.name}倒下了。`], stats, items, minutes: m.minutes });
  }

  if (enemyHits) {
    const hit = Math.max(1, Math.round(dmg(state, b.atk, pdef) * (moveId === 'sneak' ? 1.5 : 1)));
    state.stats.hp = clamp(state.stats.hp - hit, 0, 100);
    b.log.push(`${b.name}反击（−${hit}）。`);
    notes.push(`受到伤害 ${hit}`);
  }

  b.round += 1;
  return { ok: true, minutes: m.minutes, stats, items, notes, log: `战斗 · 第 ${b.round} 回合`, battleState: true };
}

function finish(state, { won, escaped, notes, stats = {}, items = {}, minutes }) {
  const b = state.battle;
  b.over = true;
  b.result = won ? 'win' : escaped ? 'escape' : 'lose';
  const outcome = { ok: true, minutes, stats, items, notes, log: won ? `击败 ${b.name}` : '脱离战斗' };
  if (won) {
    const e = ENEMIES[b.enemyId];
    const drops = {};
    const dropNotes = [];
    for (const [id, min, max, p] of e.drops ?? []) {
      if (!chance(state, p)) continue;
      const n = max > min ? randInt(state, min, max) : min;
      if (n <= 0) continue;
      if (id === 'currency') { outcome.currency = (outcome.currency ?? 0) + n; dropNotes.push(`货币×${n}`); continue; }
      if (id === 'cores') { outcome.cores = (outcome.cores ?? 0) + n; dropNotes.push(`晶核×${n}`); continue; }
      drops[id] = n; dropNotes.push(`${item(id).name}×${n}`);
    }
    outcome.items = { ...items, ...drops };
    outcome.kills = { [b.enemyId]: 1 };
    outcome.fame = e.level * 3;
    outcome.flags = { raider_defeated: b.enemyId.startsWith('raider') || state.flags.raider_defeated === true };
    outcome.notes = [...notes, dropNotes.length ? `战利品：${dropNotes.join('、')}` : '没有可以带走的东西。'];

    // NPC 对战的赌注：胜利后的额外后果（阵营立场、人物冲突、Flag）
    const win = b.stake?.win;
    if (win) {
      if (win.flags) outcome.flags = { ...outcome.flags, ...win.flags };
      if (win.faction) outcome.faction = { ...(outcome.faction ?? {}), ...win.faction };
      if (win.npc) outcome.npc = { ...(outcome.npc ?? {}), ...win.npc };
      if (win.fame) outcome.fame += win.fame;
      if (win.currency) outcome.currency = (outcome.currency ?? 0) + win.currency;
      if (win.notes) outcome.notes = [...outcome.notes, ...win.notes];
    }
  }
  return outcome;
}

export const snapshot = (state) => {
  const b = state.battle;
  if (!b) return null;
  return {
    ...b,
    playerHp: state.stats.hp,
    playerAtk: playerAtk(state),
    playerDef: playerDef(state),
    power: Power.calc(state),
  };
};
