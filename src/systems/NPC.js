/**
 * 人物关系（项目书 §14 + 商业化升级 §四.3）。
 * 五个维度：好感度 favor、信任度 trust、忠诚度 loyalty、压力值 stress、冲突值 conflict。
 * 冲突值是商业化文档点名的第三个轴：它会自己长（长期高压 + 低好感），
 * 到一定程度人物会拒绝对话，再严重就会退出互助体系。
 * @module systems/NPC
 */
import { CHARACTERS, CHARACTER_LIST, bandOf, character } from '../data/characters.js';
import { DEATH_AFTER_INJURED_DAYS, INJURY_DAYS, STATUS, XP_PER_ROLE, ladderFor, roleAt } from '../data/crew.js';
import { lineFor } from '../data/dialogue.js';
import { clamp } from '../core/util.js';

export const KEYS = ['favor', 'trust', 'loyalty', 'stress', 'conflict'];
/** 这两项只有下限 0（负面情绪不能是负的），其余可以为负。 */
const NON_NEGATIVE = new Set(['stress', 'conflict']);

/** 冲突阈值：达到后拒绝对话；再高会退出互助体系。 */
export const CONFLICT_REFUSE = 60;
export const CONFLICT_LEAVE = 80;

/** 当前已登场人物（未到登场日的不显示，避免出现无法交互的空卡片）。 */
export const active = (state) => CHARACTER_LIST.filter((c) => !c.unlockDay || state.day >= c.unlockDay);

export const rel = (state, id) => state.npcs[id] ?? null;
export const met = (state, id) => state.npcs[id]?.met === true;

/** 关系变化；未登场人物不产生变化。 */
export function change(state, id, deltas = {}) {
  const r = state.npcs[id];
  if (!r) return null;
  for (const k of KEYS) {
    if (deltas[k]) {
      const lo = NON_NEGATIVE.has(k) ? 0 : -100;
      r[k] = clamp((r[k] ?? 0) + deltas[k], lo, 100);
    }
  }
  // 受伤是"设定"不是"累加"：事件里写 injured: 2 表示受伤两天（方案 §五）
  if (deltas.injured !== undefined) {
    r.injured = Math.max(0, Math.round(deltas.injured));
    r.hurtDays = 0;
  }
  r.met = true;
  return r;
}

/** 综合关系档位：冲突优先判定，避免"好感很高但已经翻脸"被显示成朋友。 */
export function relationBand(state, id) {
  const r = rel(state, id);
  if (!r) return '未知';
  if ((r.conflict ?? 0) >= CONFLICT_LEAVE) return '敌对';
  if ((r.conflict ?? 0) >= CONFLICT_REFUSE) return '紧张';
  if ((r.favor ?? 0) >= 80 && (r.trust ?? 0) >= 60) return '生死之交';
  if ((r.favor ?? 0) >= 50) return '信任';
  if ((r.favor ?? 0) >= 25) return '搭伙';
  if ((r.favor ?? 0) <= -25) return '敌意';
  return '陌生';
}

/** 冲突值是否会挡住交互。 */
export function hostile(state, id) {
  return (rel(state, id)?.conflict ?? 0) >= CONFLICT_REFUSE;
}

export function markMet(state, id) {
  if (state.npcs[id]) state.npcs[id].met = true;
}

/** 关系档位文案（界面展示用）。 */
export const bandLabel = (id, value) => bandOf(character(id), value);

/** 当前应对玩家说的话。 */
export const line = (state, id) => lineFor(id, rel(state, id), state.flags);

/** 高压力人物会主动产生事件：返回事件 id 或 null。 */
export function pressureEvent(state, id) {
  const r = rel(state, id);
  if (!r || !r.met) return null;
  if (id === 'laozhou' && r.stress >= 70 && !state.flags.laozhou_breakdown) return 'laozhou_breakdown';
  if (id === 'wangdawei' && r.stress >= 70 && !state.flags.wang_pressure) return 'wang_pressure';
  return null;
}

/* ---------------- 人物交互（项目书 §14：人物会根据玩家行为产生变化） ---------------- */

/** 交谈：每天首次有效，之后只消耗时间。 */
export function talk(state, id) {
  const c = character(id);
  if (!c || !rel(state, id)) return { ok: false, reason: '这个人还没有登场' };
  if (hostile(state, id)) {
    return { ok: false, reason: `${c.name}现在不想和你说话（冲突 ${Math.round(rel(state, id).conflict ?? 0)}）` };
  }
  const key = `talk_${id}_d${state.day}`;
  const first = !state.flags[key];
  const l = line(state, id);
  return {
    ok: true,
    minutes: 20,
    notes: l ? [`${c.name}：${l}`] : [`你和${c.name}说了几句话。`],
    npc: first ? { [id]: { favor: 3, trust: 2, stress: -4, conflict: -2 } } : {},
    stats: { mind: first ? 3 : 0 },
    mind: { xp: first ? 6 : 2 },
    flags: { [key]: true, [`met_${id}`]: true },
    toast: first ? { text: `${c.name} 好感 +3`, kind: 'good' } : null,
  };
}

/** 赠予物资：消耗一份食物，关系明显上升。 */
export function give(state, id, itemId = 'canned') {
  const c = character(id);
  if (!c) return { ok: false, reason: '人物不存在' };
  return {
    ok: true,
    minutes: 15,
    items: { [itemId]: -1 },
    notes: [`你把一份物资递给${c.name}。他没有推辞太久。`],
    npc: { [id]: { favor: 8, trust: 5, loyalty: 4, stress: -12, conflict: -6 } },
    stats: { mind: 4 },
    fame: 2,
    flags: { [`met_${id}`]: true, [`gave_${id}`]: true },
    toast: { text: `${c.name} 好感 +8`, kind: 'good' },
  };
}

/** 观察：消耗时间换取情报，光脑经验提升。 */
export function observe(state, id) {
  const c = character(id);
  if (!c) return { ok: false, reason: '人物不存在' };
  const r = rel(state, id);
  const guess = r.stress > 50 ? '他快撑不住了，做事开始不计后果。' : r.favor > 40 ? '他对你已经放松了警惕。' : '他还在评估你值不值得合作。';
  return {
    ok: true,
    minutes: 40,
    notes: [`你观察了${c.name}一段时间。${guess}`, `目标：${c.goal}`],
    mind: { xp: 12 },
    flags: { [`spotted_${id}`]: true, [`met_${id}`]: true },
    toast: { text: '获得人物情报', kind: 'mind' },
  };
}

/* ---------------- 线人情报（项目书 §4 第 22 天：线人） ---------------- */

/** 情报目录：按顺序出售，每条只能买一次，购买记录写在 Flag 里。 */
export const INTEL = [
  {
    id: 'mine', cost: 45, title: '晶矿坐标',
    notes: ['“城北那片废弃矿区，地面下三层。”', '“结晶长在变异体身上——但矿里有矿脉，能直接挖。”'],
    flags: { intel_mine: true, knows_mine: true }, faction: { raiders: { known: true } },
  },
  {
    id: 'factions', cost: 40, title: '两边的人头',
    notes: ['“凛冬城登记在册的有一百四十七个，能打的不到三十。”', '“掠夺者那边是十几股，谁都不服谁——包括他们自己。”'],
    flags: { intel_factions: true }, faction: { lindong: { known: true, standing: 0 }, raiders: { known: true, standing: 0 } },
  },
  {
    id: 'horde', cost: 55, title: '尸潮动向',
    notes: ['“感染者全在往城北走，像被什么叫过去。”', '“极夜前后，它们会回来一次。规模比上次大得多。”'],
    flags: { intel_horde: true, horde_warning: true },
  },
  {
    id: 'corridor', cost: 70, title: '城里的裂缝',
    notes: ['“凛冬城内部有人不想干了。他们缺一条不问来路的路。”', '“你要是有胆子，我可以给你牵这个线。”'],
    flags: { intel_corridor: true, corridor_lead: true },
  },
  {
    id: 'hospital', cost: 35, title: '医院底细',
    notes: ['“林晚手里还有一间手术室能开，但电只够撑到月底。”', '“她缺的是燃料，不是药。”'],
    flags: { intel_hospital: true, knows_hospital_need: true },
  },
];

export const nextIntel = (state) => INTEL.find((i) => !state.flags[`intel_${i.id}`]) ?? null;

/** 买下一条还没买过的情报。 */
export function buyIntel(state) {
  if (!rel(state, 'laomao')) return { ok: false, reason: '这个人还没有登场' };
  const pick = nextIntel(state);
  if (!pick) return { ok: false, reason: '老猫手里没有新东西了' };
  if (state.currency < pick.cost) return { ok: false, reason: `货币不足（需要 ${pick.cost}）` };
  return {
    ok: true,
    minutes: 45,
    currency: -pick.cost,
    notes: [`老猫收了钱，压着嗓子说了三句话：`, ...pick.notes],
    flags: { ...pick.flags, [`intel_${pick.id}`]: true, met_laomao: true },
    faction: pick.faction ?? {},
    npc: { laomao: { favor: 6, trust: 4 } },
    mind: { xp: 35 },
    toast: { text: `获得情报：${pick.title}`, kind: 'mind' },
  };
}

/* ---------------- 互助体系（项目书 §4 第 8—9 天：邻里合作与人性事件） ---------------- */

/** 可加入互助体系的角色：已接触且关系达标。 */
export const aidCandidates = (state) =>
  active(state).filter((c) => met(state, c.id) && (rel(state, c.id).favor + rel(state, c.id).trust * 0.5) >= 15);

export const inAid = (state, id) => (state.aid.joined ?? []).includes(id);

/** 邀请加入互助体系：消耗一次谈话时间，成员提供每日产出与战斗协助。 */
export function inviteAid(state, id) {
  const c = character(id);
  if (!c) return { ok: false, reason: '人物不存在' };
  if (inAid(state, id)) return { ok: false, reason: `${c.name} 已经在互助体系里` };
  const score = (rel(state, id)?.favor ?? 0) + (rel(state, id)?.trust ?? 0) * 0.5;
  if (score < 15) return { ok: false, reason: `关系不足（需要好感+信任 ≥ 15，当前 ${Math.round(score)}）` };
  return {
    ok: true,
    minutes: 40,
    notes: [`${c.name}答应加入互助体系。`, '你们约定了分工：谁找水、谁守夜、谁做饭。'],
    aid: { members: 1, morale: 8, join: [id] },
    npc: { [id]: { loyalty: 12, stress: -8 } },
    flags: { mutual_aid: true, [`aid_${id}`]: true },
    toast: { text: `${c.name} 加入互助体系（成员 +1）`, kind: 'good' },
  };
}

/** 互助体系的定性状态，供界面展示。 */
export function aidStatus(state) {
  const m = state.aid.members;
  const morale = Math.round(state.aid.morale);
  const label = m === 0 ? '未建立' : m <= 2 ? '小型互助' : m <= 4 ? '稳定互助' : '楼栋体系';
  const desc = m === 0
    ? '还没有人稳定地与你共享资源。'
    : `每天由成员分担搜集与守夜，仓库获得额外产出（当前 +${m} 食物 / +${Math.floor(m / 2)} 饮水）。`;
  return { members: m, morale, label, desc, joined: state.aid.joined ?? [] };
}

/** 每日互助结算：成员产出与士气变化，在每日刷新时调用。 */
export function dailySettlement(state) {
  const notes = [];
  const changes = {};
  const m = state.aid.members;
  if (m > 0) {
    changes.produce = m;
    if (m >= 2) changes.purified = Math.floor(m / 2);
    // 士气随成员压力与基础状态变化
    const avgStress = (state.aid.joined ?? []).reduce((a, id) => a + (rel(state, id)?.stress ?? 0), 0) / Math.max(1, m);
    const delta = (state.stats.mind > 50 ? 4 : -3) - Math.round(avgStress / 25);
    state.aid.morale = clamp(state.aid.morale + delta, 0, 100);
    notes.push(`互助体系产出：食物 +${m}${m >= 2 ? `、净水 +${Math.floor(m / 2)}` : ''}（士气 ${Math.round(state.aid.morale)}）`);
    if (state.aid.morale <= 15) notes.push('互助体系士气低落，有人开始藏私。');
  }
  return { notes, changes };
}

/**
 * 每日关系漂移（商业化升级 §四.3「NPC 关系」）。
 * 长期高压 + 低好感 → 冲突自己会长；关系好 + 压力低 → 冲突慢慢消。
 * 冲突到 CONFLICT_LEAVE 的人会退出互助体系，让"把人得罪光"真的有代价。
 */
export function relationshipDrift(state) {
  const notes = [];
  const changes = {};
  for (const c of active(state)) {
    const r = rel(state, c.id);
    if (!r || !r.met) continue;
    r.conflict = clamp(r.conflict ?? 0, 0, 100);

    if (r.stress >= 60 && r.favor < 30) r.conflict = clamp(r.conflict + 5, 0, 100);
    else if (r.favor >= 50 && r.stress < 40) r.conflict = clamp(r.conflict - 3, 0, 100);

    if (r.conflict >= CONFLICT_LEAVE && inAid(state, c.id)) {
      state.aid.joined = (state.aid.joined ?? []).filter((x) => x !== c.id);
      state.aid.members = Math.max(0, state.aid.members - 1);
      state.aid.morale = clamp(state.aid.morale - 12, 0, 100);
      changes.members = (changes.members ?? 0) - 1;
      notes.push(`${c.name}退出了互助体系，理由是"不想再欠你的"。`);
    } else if (r.conflict >= CONFLICT_LEAVE && !state.flags[`conflict_${c.id}`]) {
      state.flags[`conflict_${c.id}`] = true;
      notes.push(`${c.name}现在见到你会绕路走。`);
    }
  }
  return { notes, changes };
}

/**
 * 每日幸存者成长（无限生存方案 §五）。
 * NPC 会成长、转职、受伤、死亡、离开或投靠别的势力 —— 都不设固定结局。
 *
 * 刻意**不消耗随机数**：触发条件全部是确定性的（每 N 天、防御等级、库存药品、冲突值）。
 * 理由见 Weather.roll 的注释：rngCursor 的推进量一变，整局随机序列会全部错位。
 */
export function growCrew(state) {
  const notes = [];
  const total = Object.values(state.base ?? {}).reduce((a, b) => a + (b ?? 0), 0);
  const defense = state.base?.defense ?? 0;
  const hasMedicine = (state.inventory?.medicine ?? 0) > 0;

  for (const c of active(state)) {
    const r = rel(state, c.id);
    if (!r || !r.met) continue;
    r.alive = r.alive !== false;
    r.left = r.left === true;
    r.role = r.role ?? ladderFor(c.id)[0];
    r.crewXp = r.crewXp ?? 0;
    r.injured = r.injured ?? 0;
    // 健康（V3.0 策划案 §七：NPC 拥有独立属性：健康 / 技能 / 信任 / 心理状态）
    r.health = clamp(r.health ?? 100, 0, 100);
    if (!r.alive || r.left || r.joinFaction) continue;

    // 1) 受伤：每天推进；有药等于在治疗（扣掉一天累计，并恢复健康）
    if (r.injured > 0) {
      r.injured -= 1;
      r.hurtDays = (r.hurtDays ?? 0) + 1;
      r.health = clamp(r.health - 12, 0, 100);
      r.stress = clamp((r.stress ?? 0) + 2, 0, 100);
      if (hasMedicine) { r.hurtDays = Math.max(0, r.hurtDays - 1); r.health = clamp(r.health + 10, 0, 100); }
      if (r.health <= 0 || r.hurtDays >= DEATH_AFTER_INJURED_DAYS) {
        r.alive = false;
        state.aid.morale = clamp((state.aid?.morale ?? 0) - 15, 0, 100);
        state.aid.joined = (state.aid.joined ?? []).filter((x) => x !== c.id);
        state.aid.members = Math.max(0, (state.aid.members ?? 0) - 1);
        state.flags[`death_${c.id}`] = true;
        notes.push(`${c.name}伤上加伤，没能撑过去。你们把他埋在楼下那棵树下。`);
        continue;
      }
      if (r.injured === 0) { notes.push(`${c.name}的伤好了，重新开始干活。`); r.hurtDays = 0; }
      continue;   // 受伤期间不参与成长与产出
    }
    // 没受伤时健康缓慢恢复
    if (r.health < 100) r.health = clamp(r.health + 3, 0, 100);

    // 2) 成长与转职：基地越大，能学的东西越多
    r.crewXp += 1 + Math.floor(total / 12);
    const role = roleAt(c.id, r.crewXp);
    if (role !== r.role) {
      r.role = role;
      r.stress = clamp((r.stress ?? 0) - 5, 0, 100);
      notes.push(`${c.name}现在是${role}。`);
      if (r.crewXp >= XP_PER_ROLE * 3) state.flags[`veteran_${c.id}`] = true;
    }

    // 3) 受伤：基地防御与居民区条件越差越容易出事（确定性，不消耗随机数）
    const injuryEvery = (defense >= 4 ? 12 : defense >= 2 ? 8 : 5) + (state.base?.housing ?? 0);
    if (state.day % injuryEvery === 0 && (r.stress ?? 0) > 45) {
      r.injured = INJURY_DAYS;
      r.hurtDays = 0;
      r.stress = clamp((r.stress ?? 0) + 8, 0, 100);
      notes.push(`${c.name}在外面受了伤，得养几天。`);
      continue;
    }

    // 4) 离开 / 投靠别的势力：冲突高、士气低的时候会走
    const conflict = r.conflict ?? 0;
    if (conflict >= CONFLICT_LEAVE) {
      r.left = true;
      state.aid.joined = (state.aid.joined ?? []).filter((x) => x !== c.id);
      state.aid.members = Math.max(0, (state.aid.members ?? 0) - 1);
      state.aid.morale = clamp((state.aid?.morale ?? 0) - 8, 0, 100);
      notes.push(`${c.name}收拾东西走了。他说这里已经不像个能过日子的地方。`);
      continue;
    }
    if ((state.aid?.morale ?? 100) < 15 && (r.loyalty ?? 0) < 10 && state.day % 6 === 0) {
      r.joinFaction = state.factions?.lindong?.standing >= state.factions?.raiders?.standing ? 'lindong' : 'raiders';
      state.aid.joined = (state.aid.joined ?? []).filter((x) => x !== c.id);
      state.aid.members = Math.max(0, (state.aid.members ?? 0) - 1);
      notes.push(`${c.name}投奔了${r.joinFaction === 'lindong' ? '凛冬城' : '掠夺者'}。`);
    }
  }
  return notes;
}

/** 幸存者状态标签（界面用）。 */
export function statusOf(state, id) {
  const r = rel(state, id);
  if (!r) return STATUS.left;
  if (r.alive === false) return STATUS.dead;
  if (r.left) return STATUS.left;
  if (r.joinFaction) return STATUS.joined;
  if ((r.injured ?? 0) > 0) return STATUS.injured;
  return STATUS.active;
}

export { CHARACTERS, character };
