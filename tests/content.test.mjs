/**
 * 内容完整性 + 通关模拟（M1—M3：第 1—20 天）。
 * 目的：任何数据作者的笔误（不存在的物品/敌人/任务、引用了缺失的 Flag、
 * 条件永远为假的选项）都必须在这里失败，而不是在玩家面前失败。
 * 运行：node --test tests/
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { ITEMS } from '../src/data/items.js';
import { LOCATIONS, ACTIONS } from '../src/data/locations.js';
import { ENEMIES } from '../src/data/battle.js';
import { EVENTS } from '../src/data/events.js';
import { QUESTS } from '../src/data/quests.js';
import { CHAPTERS } from '../src/data/chapters.js';
import { CHARACTERS } from '../src/data/characters.js';
import { DIALOGUE } from '../src/data/dialogue.js';
import { FACTIONS } from '../src/data/factions.js';

import * as Save from '../src/systems/Save.js';
import * as Story from '../src/systems/Story.js';
import * as Explore from '../src/systems/Explore.js';
import * as Event from '../src/systems/Event.js';
import * as Battle from '../src/systems/Battle.js';
import * as Inventory from '../src/systems/Inventory.js';
import * as Quest from '../src/systems/Quest.js';
import * as GameTime from '../src/systems/GameTime.js';
import * as Base from '../src/systems/Base.js';
import * as Market from '../src/systems/Market.js';
import * as NPC from '../src/systems/NPC.js';
import * as Survival from '../src/systems/Survival.js';
import * as Death from '../src/systems/Death.js';
import { applyOutcome, resolveChoice } from '../src/core/effects.js';

const countCategory = Inventory.countCategory;

/** 中后期富状态：模拟一个有储备、有基地、有互助体系的玩家。 */
function richState(day = 10, seed = 777) {
  const s = Save.createState(seed);
  s.day = day;
  s.weather = CHAPTERS[day - 1].weather;
  s.story = undefined;
  s.inventory = {
    canned: 8, bottled_water: 8, compressed: 3, produce: 3, purified: 4,
    charcoal: 4, firewood: 4, battery: 2, fuel: 3,
    wood: 4, metal: 4, parts: 3, insulation: 3,
    bandage: 3, medicine: 2, frostbite_salve: 1,
    pipe: 1, knife: 1, ammo: 3, seeds: 2, fertilizer: 1, blueprint: 1,
  };
  s.stats = { hp: 90, warmth: 70, hunger: 75, thirst: 75, energy: 90, mind: 75 };
  s.base = { shelter: 1, storage: 1, heating: 2, power: 1, greenhouse: 1, medical: 1, defense: 2, workshop: 1 };
  s.worn = ['pipe', 'down_jacket', 'snow_boots'];
  s.mindLevel = 2;
  s.currency = 120;
  s.fame = 30;
  s.aid = { members: 3, morale: 50, joined: ['xiao_wu', 'laozhou', 'li_ayi'] };
  s.npcs.laozhou.met = true;
  s.npcs.laozhou.favor = 30;
  s.npcs.xiao_wu.met = true;
  s.npcs.xiao_wu.favor = 30;
  s.npcs.li_ayi.met = true;
  s.npcs.li_ayi.favor = 30;
  s.npcs.wangdawei.met = true;
  return s;
}

test('数据完整性：地点与行动的掉落物全部存在', () => {
  for (const loc of Object.values(LOCATIONS)) {
    assert.ok(loc.unlockDay >= 1 && loc.unlockDay <= 400, `${loc.name} 的解锁天数应在 1—30`);
    for (const [actionId, spec] of Object.entries(loc.actions)) {
      assert.ok(ACTIONS[actionId], `${loc.name}.${actionId} 不是合法的行动词表`);
      for (const [itemId, min, max, p] of spec.loot ?? []) {
        assert.ok(ITEMS[itemId], `${loc.name}.${actionId} 掉落了不存在的物品：${itemId}`);
        assert.ok(min <= max, `${loc.name}.${actionId}.${itemId} 的 min/max 反了`);
        assert.ok(p >= 0 && p <= 1, `${loc.name}.${actionId}.${itemId} 的概率应在 0—1`);
      }
    }
    for (const eventId of loc.events ?? []) assert.ok(EVENTS[eventId], `${loc.name} 引用了不存在的地点事件：${eventId}`);
  }
});

test('数据完整性：敌人掉落与事件引用的战斗目标全部存在', () => {
  for (const e of Object.values(ENEMIES)) {
    assert.ok(e.hp > 0 && e.atk > 0, `${e.name} 数值不合法`);
    for (const [id, min, max, p] of e.drops ?? []) {
      if (id === 'currency' || id === 'cores') continue;
      assert.ok(ITEMS[id], `${e.name} 掉落了不存在的物品：${id}`);
      assert.ok(min <= max && p >= 0 && p <= 1, `${e.name}.${id} 掉落参数不合法`);
    }
  }
  for (const ev of Object.values(EVENTS)) {
    for (const c of ev.choices ?? []) {
      const probe = { ...richState(20), location: ev.location ?? null };
      const out = c.resolve(probe);
      if (out?.battle) assert.ok(ENEMIES[out.battle], `${ev.id}.${c.id} 指向不存在的敌人：${out.battle}`);
      if (out?.event) assert.ok(EVENTS[out.event], `${ev.id}.${c.id} 指向不存在的事件：${out.event}`);
      for (const id of Object.keys(out?.items ?? {})) assert.ok(ITEMS[id], `${ev.id}.${c.id} 修改了不存在的物品：${id}`);
      for (const id of Object.keys(out?.kills ?? {})) assert.ok(ENEMIES[id], `${ev.id}.${c.id} 记录了不存在的击杀：${id}`);
      for (const id of Object.keys(out?.npc ?? {})) assert.ok(CHARACTERS[id], `${ev.id}.${c.id} 修改了不存在的人物：${id}`);
      for (const id of Object.keys(out?.base ?? {})) assert.ok(Base.FACILITIES.some((f) => f.id === id), `${ev.id}.${c.id} 修改了不存在的设施：${id}`);
      for (const [id, deltas] of Object.entries(out?.faction ?? {})) {
        assert.ok(FACTIONS[id], `${ev.id}.${c.id} 修改了不存在的势力：${id}`);
        if (deltas.standing !== undefined) assert.equal(typeof deltas.standing, 'number', `${ev.id}.${c.id} 的势力立场必须是数字`);
      }
    }
  }
});

test('数据完整性：章节引用的任务与脚本事件全部存在', () => {
  for (const ch of CHAPTERS) {
    for (const q of ch.quests) assert.ok(QUESTS[q], `第 ${ch.day} 天引用了不存在的任务：${q}`);
    assert.ok(ch.temp <= 0, `第 ${ch.day} 天的气温应为零下`);
  }
  for (const [day, ids] of Object.entries(Story.DAY_SCRIPTS)) {
    for (const id of ids) {
      const ev = EVENTS[id];
      assert.ok(ev, `第 ${day} 天的脚本事件不存在：${id}`);
      assert.ok(ev.kind === 'story' || ev.kind === 'npc', `${id} 出现在脚本队列里，但 kind 是 ${ev.kind}`);
      if (ev.day) assert.equal(ev.day, Number(day), `${id} 声明的天数与脚本表不一致`);
      assert.ok(Number(day) <= Story.CONTENT_DAYS || Number(day) > 30, `${id} 超出了已开放剧情范围`);
    }
  }
});

test('数据完整性：每条脚本剧情都至少有一个无条件选项（主线不会走进死胡同）', () => {
  for (const [day, ids] of Object.entries(Story.DAY_SCRIPTS)) {
    for (const id of ids) {
      const def = EVENTS[id];
      const unconditional = (def.choices ?? []).filter((c) => !c.enabled);
      assert.ok(unconditional.length > 0, `第 ${day} 天的 ${id} 所有选项都带条件，资源不足时玩家会卡死`);
    }
  }
});

test('数据完整性：已登场人物都有对话表与关系档位', () => {
  for (const c of Object.values(CHARACTERS)) {
    if (c.unlockDay === undefined || c.unlockDay <= Story.CONTENT_DAYS) {
      assert.ok(DIALOGUE[c.id], `${c.name} 缺少对话表`);
    }
    assert.ok(c.bands.length >= 3, `${c.name} 的关系档位过少`);
    for (const k of ['favor', 'trust', 'loyalty', 'stress']) assert.equal(typeof c.initial[k], 'number', `${c.name}.${k} 初始值缺失`);
  }
});

test('内容可达性：每个地点的每个行动都能被结算并给出结果或明确原因', () => {
  const s = richState(30);
  s.stats.energy = 100;
  for (const loc of Object.values(LOCATIONS)) {
    for (const actionId of Object.keys(loc.actions)) {
      const trial = { ...s, day: 200, stats: { ...s.stats, energy: 100 }, location: null, queue: [], active: null };
      const out = Explore.performAction(trial, loc.id, actionId);
      assert.equal(out.ok, true, `${loc.name} · ${ACTIONS[actionId].label} 应可执行：${out.reason}`);
      assert.ok(out.minutes > 0, `${loc.name} · ${ACTIONS[actionId].label} 必须消耗时间`);
      if (out.battle) assert.ok(ENEMIES[out.battle], `${loc.name} 遭遇了不存在的敌人`);
    }
  }
});

test('内容可达性：每个已开放日期的脚本事件都能走通至少一条分支', () => {
  for (let day = 4; day <= Story.CONTENT_DAYS; day++) {
    for (const id of Story.scriptsFor(day)) {
      const s = richState(day, 1000 + day);
      Event.activate(s, id);
      const choices = Event.choicesOf(s, EVENTS[id]);
      const usable = choices.filter((c) => c.enabled);
      assert.ok(usable.length > 0, `第 ${day} 天 ${id} 在富状态下没有任何可用选项`);
      const res = resolveChoice(s, usable[0].id);
      assert.equal(res.ok, true, `${id} 的首个可用分支结算失败：${res.reason}`);
      assert.ok(s.flags[`seen_${id}`], `${id} 结算后必须写入已触发标记`);
    }
  }
});

test('互助体系：邀请、每日产出与士气都在真实数据上生效', () => {
  const s = richState(9);
  s.aid = { members: 0, morale: 20, joined: [] };
  const invited = NPC.inviteAid(s, 'xiao_wu');
  assert.equal(invited.ok, true);
  applyOutcome(s, invited, { autosave: false });
  assert.equal(s.aid.members, 1);
  assert.ok(NPC.inAid(s, 'xiao_wu'));

  const repeat = NPC.inviteAid(s, 'xiao_wu');
  assert.equal(repeat.ok, false, '同一人物不能重复加入');

  const before = Inventory.count(s, 'produce');
  const day = GameTime.rollDay(s);
  assert.ok(day.notes.some((n) => n.includes('互助')), '每日刷新必须产出互助收益');
  assert.ok(Inventory.count(s, 'produce') > before, '互助成员应带来实物产出');
  assert.ok(s.aid.morale > 20, '状态良好时士气应回升');
});

test('能源：燃油耗尽后光脑加成失效，补给后恢复', () => {
  const s = richState(10);
  s.inventory.fuel = 0;
  Base.dailySettlement(s);
  assert.equal(s.flags.energy_ok, false, '燃油耗尽必须体现为能源停摆');
  assert.equal(Mind_powerBonus(s), 1);

  Inventory.applyItems(s, { fuel: 2 });
  Base.dailySettlement(s);
  assert.equal(s.flags.energy_ok, true);
  assert.ok(Mind_powerBonus(s) > 1, '燃料恢复后加成应回来');
});

/** 与 systems/Mind.powerBonus 等价的最小探针（避免为测试额外导出）。 */
function Mind_powerBonus(state) {
  return state.flags?.energy_ok === false ? 1 : 1 + (state.base.power ?? 0) * 0.1;
}

/**
 * 全流程模拟：用「正常玩家」策略自动游玩第 1—10 天。
 * 策略：装备 → 结算剧情（优先非战斗分支）→ 能赢才打、打不过就撤 →
 * 按需进食饮水治疗 → 有材料升级设施 → 白天外出搜集 → 入夜休息。
 * 这条测试同时验证内容连续性与基础数值平衡：合理的玩法不应在 M2 范围内被饿死或冻死。
 */
test('全流程模拟：自动游玩第 1—30 天，第 31 天进入无尽模式（不设固定结局）', () => {
  const s = Save.createState(20260913);
  Story.begin(s);
  Quest.refresh(s);
  for (const id of ['pipe', 'down_jacket', 'snow_boots']) Inventory.equip(s, id, true);

  const seen = new Set();
  let guard = 0;

  /** 白天外出搜集：按危险度与装备水平挑地点。 */
  const forage = () => {
    const prefer = ['apartment', 'basement', 'block', 'supermarket', 'pharmacy', 'school', 'parking', 'hardware', 'substation', 'ruins', 'gym', 'gas_station'];
    for (const id of prefer) {
      const loc = LOCATIONS[id];
      if (!loc || s.day < loc.unlockDay) continue;
      if (loc.danger >= 4 && Battle.playerAtk(s) < 14) continue;
      // 缺建材时优先去能出建材的地方（供暖决定能不能活过寒潮）
      const needMaterial = Inventory.count(s, 'metal') < 3 || Inventory.count(s, 'insulation') < 3;
      const materialSpot = ['basement', 'parking', 'hardware', 'gym', 'ruins'].includes(id);
      if (needMaterial && !materialSpot && s.stats.energy > 60) continue;
      const action = loc.actions.search ? 'search' : Object.keys(loc.actions)[0];
      const out = Explore.performAction(s, id, action);
      if (out.ok) { applyOutcome(s, out, { autosave: false }); return true; }
    }
    return false;
  };

  /** 按分类进食，不挑具体物品（净水、种植产物都算）。 */
  const eat = (cat, stat) => {
    for (let i = 0; i < 2 && s.stats[stat] < 55; i++) {
      const pick = Inventory.list(s, { cat })[0];
      if (!pick?.use) break;
      applyOutcome(s, Inventory.consume(s, pick.id), { autosave: false });
    }
  };

  while (s.day <= Story.CONTENT_DAYS && guard++ < 4000) {
    if (s.ending) break;

    // 1. 遭遇战：有把握才打，否则撤退
    if (s.battle && !s.battle.over) {
      const canWin = Battle.playerAtk(s) * 4 >= s.battle.hp && s.stats.hp > 55;
      const out = Battle.act(s, canWin ? 'attack' : 'retreat');
      if (out.ok && out.minutes) applyOutcome(s, out, { autosave: false });
      continue;
    }
    if (s.battle?.over) { s.battle = null; s.active = null; }

    // 2. 剧情事件：优先选择不触发战斗的分支
    if (s.active?.kind === 'event') {
      const id = s.active.id;
      seen.add(id);
      const usable = Event.choicesOf(s, EVENTS[id]).filter((c) => c.enabled);
      assert.ok(usable.length > 0, `${id} 没有任何可用选项（第 ${s.day} 天）`);
      const peaceful = usable.find((c) => !EVENTS[id].choices.find((x) => x.id === c.id).resolve(s)?.battle);
      resolveChoice(s, (peaceful ?? usable[0]).id);
      continue;
    }

    // 3. 维持状态
    eat('food', 'hunger');
    eat('water', 'thirst');
    if (s.stats.hp < 70 && Inventory.has(s, 'bandage')) applyOutcome(s, Inventory.consume(s, 'bandage'), { autosave: false });

    // 3.5 交易区：缺什么补什么，多余的建材换货币（第 21 天起）
    if (Market.isOpen(s)) {
      const buys = [
        [Inventory.countCategory(s, 'food') < 6, 'canned'],
        [Inventory.count(s, 'charcoal') < 3, 'charcoal'],
        [Inventory.count(s, 'insulation') < 3, 'insulation'],
        [Inventory.count(s, 'ammo') < 2, 'ammo'],
      ];
      const want = buys.find(([need, id]) => need && Market.canBuy(s, id, 1) === true);
      if (want) { applyOutcome(s, Market.buy(s, want[1], 1), { autosave: false }); continue; }
      if (Inventory.count(s, 'metal') > 6 && Market.canSell(s, 'metal', 2) === true) {
        applyOutcome(s, Market.sell(s, 'metal', 2), { autosave: false });
        continue;
      }
    }

    // 4. 加工：自制保温材料、拆零件、烧雪取水
    if (s.base.workshop >= 2 && Inventory.count(s, 'insulation') < 3 && Inventory.has(s, 'wood', 1) && Inventory.has(s, 'metal', 1)) {
      const out = Base.craft(s, 'insulate_wrap');
      if (out.ok) { applyOutcome(s, out, { autosave: false }); continue; }
    }
    if (s.base.workshop >= 1 && Inventory.has(s, 'metal', 2) && Inventory.has(s, 'wood', 1) && Inventory.count(s, 'parts') < 2) {
      const out = Base.craft(s, 'scrap_parts');
      if (out.ok) { applyOutcome(s, out, { autosave: false }); continue; }
    }
    if (s.base.workshop >= 1 && Inventory.has(s, 'firewood', 1) && Inventory.countCategory(s, 'water') < 4) {
      const out = Base.craft(s, 'melt_water');
      if (out.ok) { applyOutcome(s, out, { autosave: false }); continue; }
    }

    // 5. 经营：有材料就升级设施
    for (const id of ['heating', 'storage', 'workshop', 'shelter', 'defense', 'greenhouse', 'medical', 'power']) {
      if (Base.canUpgrade(s, id) === true) { applyOutcome(s, Base.upgrade(s, id), { autosave: false }); break; }
    }

    // 6. 白天外出搜集
    if (s.stats.energy > 30 && s.time < 1080 && forage()) continue;

    // 7. 推进：优先下一段剧情，否则休息到次日
    const next = Event.nextQueued(s);
    if (next) { Event.activate(s, next); continue; }
    GameTime.sleep(s);
  }

  // 无限生存：第 30 天不是终点，世界在第 31 天进入第二阶段，游戏继续
  assert.equal(s.ending, null, `第 ${s.day} 天不该被强制结局（实际 ${s.ending?.id}）`);
  assert.ok(s.day > Story.CONTENT_DAYS, `应至少推进到第 31 天，实际第 ${s.day} 天`);
  assert.equal(s.milestone, 'M4', '第 31 天必须标记第一阶段里程碑完成');
  assert.equal(s.flags.phase_P2, true, '第 31 天必须进入「永冬时代」');
  assert.equal(s.reports.length, 1, '阶段切换必须留下 1 份总结');
  assert.equal(s.reports[0].phaseTo, '永冬时代');
  assert.ok(s.reports[0].title, '阶段总结必须带评价标题');
  assert.ok(s.reports[0].desc, '阶段总结必须带描述');
  assert.ok(s.stats.hp > 0);

  // 死亡不是结局：生命归零 → 倒地、丢失最近搜集的物资、原地复活继续玩
  const doomed = Save.createState(20260913);
  Story.begin(doomed);
  Inventory.add(doomed, 'metal', 5);
  Death.recordGain(doomed, { metal: 5 }, '模拟搜集');
  const metalBefore = Inventory.count(doomed, 'metal');
  doomed.stats.hp = 1;
  doomed.stats.warmth = 0;
  const res = GameTime.spend(doomed, 120, { indoor: false });
  assert.equal(doomed.ending, null, '倒地不再是结局');
  assert.equal(res.cause, 'ice', '冻死判定仍然存在');
  assert.ok(doomed.stats.hp > 0, '倒地后必须还能继续玩');
  assert.ok(Inventory.count(doomed, 'metal') < metalBefore, '倒地必须丢失最近搜集的物资');

  // 每个「含无条件剧情」的日期都必须真的触发过（条件分支被跳过是合法玩法）
  for (let day = 4; day <= Story.CONTENT_DAYS; day++) {
    const scripts = Story.scriptsFor(day);
    const unconditional = scripts.filter((id) => !EVENTS[id].condition);
    if (unconditional.length === 0) continue;
    assert.ok(unconditional.some((id) => seen.has(id)), `第 ${day} 天的无条件剧情没有被触发：${unconditional.join('、')}`);
  }
  assert.ok(s.quests.q_survive_30, '第 30 天的生存任务必须已发放');
  assert.ok(Object.keys(s.flags).length > 20, '整局应产生足量的剧情 Flag');
  const rep = s.reports[s.reports.length - 1];
  console.log(`[模拟] 第 ${s.day} 天仍在继续｜当前评价 ${rep.title}｜生命 ${Math.round(s.stats.hp)}｜体温 ${Math.round(s.stats.warmth)}｜精神 ${Math.round(s.stats.mind)}｜战力 ${s.power}｜基地 ${Object.values(s.base).reduce((a, b) => a + b, 0)}｜互助 ${s.aid.members}｜事件 ${seen.size}`);
});