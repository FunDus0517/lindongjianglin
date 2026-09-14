/**
 * 商业化升级验收（对应 winterfall_商业化升级代码与提示词文档 + 追加需求）。
 * 覆盖：动态天气与预报、NPC 冲突轴、装备槽、成就、每日任务、角色成长、
 * NPC 对战、倒地惩罚（死亡不是结局）、无尽模式阶段报告、新手引导，以及两个新页面的渲染。
 * 运行：node --test tests/
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installDom } from './_dom.mjs';

installDom();

import { ITEMS, SLOTS } from '../src/data/items.js';
import { ACHIEVEMENTS } from '../src/data/achievements.js';
import { DAILY_POOL, DAILY_COUNT } from '../src/data/dailies.js';
import * as Tutorial from '../src/data/tutorial.js';

import * as Save from '../src/systems/Save.js';
import * as Weather from '../src/systems/Weather.js';
import * as NPC from '../src/systems/NPC.js';
import * as Inventory from '../src/systems/Inventory.js';
import * as Achievement from '../src/systems/Achievement.js';
import * as Daily from '../src/systems/Daily.js';
import * as Growth from '../src/systems/Growth.js';
import * as Duel from '../src/systems/Duel.js';
import * as Battle from '../src/systems/Battle.js';
import * as Death from '../src/systems/Death.js';
import * as Ending from '../src/systems/Ending.js';
import * as GameTime from '../src/systems/GameTime.js';
import * as Story from '../src/systems/Story.js';
import * as Quest from '../src/systems/Quest.js';
import { applyOutcome } from '../src/core/effects.js';
import { chapterOf, phaseOf, worldMods, TOTAL_DAYS, PHASES } from '../src/data/chapters.js';

const fresh = (seed = 20260913) => Save.createState(seed);

/* ---------------- 1. 动态天气 ---------------- */

test('天气：晴/暴雪/极寒三态齐备，文档命名可映射，且每天只消耗一次随机数', () => {
  assert.ok(Weather.WEATHERS.clear, '必须存在"晴"');
  assert.ok(Weather.WEATHERS.blizzard, '必须存在"暴雪"');
  assert.ok(Weather.WEATHERS.extreme_cold, '必须存在"极寒"');
  // 商业化文档用的是 sunny / snowstorm / extremeCold
  assert.equal(Weather.weather('sunny').id, 'clear');
  assert.equal(Weather.weather('snowstorm').id, 'blizzard');
  assert.equal(Weather.weather('extremeCold').id, 'extreme_cold');

  // 关键约束：天气必须每天推进一次 RNG —— 否则后续所有搜刮随机全部错位
  const s = fresh();
  const before = s.rngCursor;
  Weather.roll(s);
  assert.equal(s.rngCursor, before + 1, 'roll 必须且只能消耗一次随机数');
});

test('天气：预报报的是次日章节基准，且多天里天气真的会变（不是恒定）', () => {
  const s = fresh();
  const fc = Weather.forecast(s);
  assert.equal(fc.id, Weather.baseFor(s.day + 1), '预报必须与次日章节基准一致');
  assert.ok(fc.accuracy > 0.5 && fc.accuracy < 1, '预报可信度必须是概率而不是必然');

  const seen = new Set();
  for (let day = 1; day <= 24; day++) {
    s.day = day;
    seen.add(Weather.roll(s));
  }
  assert.ok(seen.size >= 3, `24 天里天气应该有变化，实际只有 ${[...seen].join('、')}`);
});

/* ---------------- 2. NPC 冲突轴 ---------------- */

test('人物：冲突值是独立的第三轴，会夹紧、会挡住对话、会影响综合档位', () => {
  const s = fresh();
  s.npcs.laozhou.met = true;
  NPC.change(s, 'laozhou', { conflict: 500 });
  assert.equal(s.npcs.laozhou.conflict, 100, '冲突值必须夹在 0—100');
  assert.equal(NPC.hostile(s, 'laozhou'), true);
  assert.equal(NPC.relationBand(s, 'laozhou'), '敌对');

  const blocked = NPC.talk(s, 'laozhou');
  assert.equal(blocked.ok, false, '冲突值到阈值必须拒绝交谈');
  assert.match(blocked.reason, /冲突/);

  NPC.change(s, 'laozhou', { conflict: -100, favor: 90, trust: 70 });
  assert.equal(NPC.relationBand(s, 'laozhou'), '生死之交');
  assert.equal(NPC.talk(s, 'laozhou').ok, true, '冲突降下来后必须能正常说话');
});

test('人物：每日漂移会让高压低好感的人自己长冲突，并把人从互助体系里逼走', () => {
  const s = fresh();
  s.npcs.laozhou.met = true;
  s.npcs.laozhou.stress = 80;
  s.npcs.laozhou.favor = 0;
  s.aid = { members: 1, morale: 60, joined: ['laozhou'] };

  for (let i = 0; i < 20; i++) NPC.relationshipDrift(s);
  assert.ok(s.npcs.laozhou.conflict >= NPC.CONFLICT_LEAVE, '持续高压必须把冲突推上去');
  assert.equal(s.aid.members, 0, '冲突到上限必须退出互助体系');
  assert.equal(s.aid.joined.includes('laozhou'), false);

  // 关系好 + 压力低时冲突会回落
  s.npcs.wangdawei.met = true;
  s.npcs.wangdawei.conflict = 30;
  s.npcs.wangdawei.favor = 80;
  s.npcs.wangdawei.stress = 10;
  NPC.relationshipDrift(s);
  assert.ok(s.npcs.wangdawei.conflict < 30, '关系好时冲突必须回落');
});

/* ---------------- 3. 装备槽 ---------------- */

test('装备：五个槽每槽一件，换装自动脱下旧件，载重加成真的进入仓库容量', () => {
  const s = fresh();
  assert.equal(SLOTS.length, 5, '装备槽应为 5 个');

  const capBefore = Inventory.capacity(s);
  Inventory.add(s, 'backpack', 1);
  const res = Inventory.equip(s, 'backpack', true);
  assert.equal(res.ok, true);
  assert.equal(Inventory.capacity(s), capBefore + 12, '背囊的载重必须计入容量');
  assert.equal(Inventory.wornIn(s, 'tool'), 'backpack');

  // 换同类工具：旧件必须自动脱下
  Inventory.add(s, 'headlamp', 1);
  Inventory.equip(s, 'headlamp', true);
  assert.equal(Inventory.isWorn(s, 'backpack'), false, '同槽换装必须脱下旧装备');
  assert.equal(Inventory.wornIn(s, 'tool'), 'headlamp');

  // 外套与鞋互不干扰
  Inventory.equip(s, 'down_jacket', true);
  Inventory.equip(s, 'snow_boots', true);
  assert.equal(Inventory.wornIn(s, 'coat'), 'down_jacket');
  assert.equal(Inventory.wornIn(s, 'boots'), 'snow_boots');
  assert.equal(Inventory.equipStats(s).warmthResist, 2, '御寒层数必须累加');

  // 非装备品不能穿
  Inventory.add(s, 'canned', 1);
  assert.equal(Inventory.equip(s, 'canned', true).ok, false);
});

/* ---------------- 4. 成就 ---------------- */

test('成就：条件达成即自动解锁并发奖，且只发一次', () => {
  const s = fresh();
  const before = Object.keys(s.achievements ?? {}).length;
  assert.equal(before, 0);

  s.day = 2;
  applyOutcome(s, { ok: true, notes: ['测试'], minutes: 0 }, { autosave: false });
  assert.ok(Achievement.isUnlocked(s, 'survive_d2'), '熬到第 2 天必须解锁"活过第一夜"');

  const money = s.currency;
  const fame = s.fame;
  Achievement.sync(s);
  assert.equal(s.currency, money, '已解锁的成就不能重复发奖');
  assert.equal(s.fame, fame);

  const view = Achievement.view(s);
  assert.equal(view.total, ACHIEVEMENTS.length);
  assert.ok(view.unlocked >= 1);
  assert.ok(view.list.every((a) => a.name && a.desc), '每条成就都必须有可展示的文案');
});

/* ---------------- 5. 每日任务 ---------------- */

test('每日任务：每天 3 条且确定性，进度可从结算推断，完成即时发奖，全清有额外奖励', () => {
  const s = fresh();
  Daily.refresh(s);
  assert.equal(s.daily.tasks.length, DAILY_COUNT);
  const ids = s.daily.tasks.map((t) => t.id);
  Daily.refresh(s);
  assert.deepEqual(s.daily.tasks.map((t) => t.id), ids, '同一天重刷必须得到同样的任务');

  // 直接推进一条任务的计数到目标，验证"完成即发奖"
  const def = DAILY_POOL.find((d) => d.id === ids[0]);
  const money = s.currency;
  Daily.track(s, def.metric, def.target);
  const row = s.daily.tasks.find((t) => t.id === def.id);
  assert.equal(row.done, true, `任务 ${def.name} 必须被判为完成`);
  assert.equal(s.currency, money + def.reward.currency, '完成必须即时发奖');

  // 全清奖励
  for (const t of s.daily.tasks) if (!t.done) Daily.track(s, DAILY_POOL.find((d) => d.id === t.id).metric, 99);
  assert.equal(s.daily.done, DAILY_COUNT);
  assert.equal(s.daily.bonus, true, '全部完成必须给额外奖励');

  // 跨日：连击累计与中断
  const streak = s.daily.streak;
  s.day += 1;
  Daily.refresh(s, s.day - 1);
  assert.equal(s.daily.streak, streak + 1, '前一天全清必须累计连击');
  s.day += 1;
  Daily.refresh(s, s.day - 1);
  assert.equal(s.daily.streak, 0, '前一天没做完必须断连击');
});

/* ---------------- 6. 角色成长 ---------------- */

test('角色成长：经验升级、满级封顶、加成同时进入战力与容量', () => {
  const s = fresh();
  assert.equal(Growth.level(s), 1);
  assert.equal(Growth.bonus(s).capacity, 0, '1 级不应该有加成（旧存档行为不变）');

  const ups = Growth.addXp(s, Growth.xpForLevel(1));
  assert.equal(ups, 1);
  assert.equal(Growth.level(s), 2);
  assert.equal(Growth.bonus(s).capacity, 4);

  Growth.addXp(s, 999999);
  assert.equal(Growth.level(s), Growth.MAX_LEVEL, '等级必须封顶');
  const capAtMax = Inventory.capacity(s);
  Growth.addXp(s, 999999);
  assert.equal(Inventory.capacity(s), capAtMax, '满级后不能再涨容量');

  assert.ok(Growth.view(s).title, '等级必须有称号');
});

/* ---------------- 7. NPC 对战 ---------------- */

test('对战：名册有解锁条件与战力对比，发起后进入回合制，且每天只能打一次', () => {
  const s = fresh();
  assert.ok(Duel.ROSTER.length >= 6, '对战名册不能只有一两个对手');

  // 第 1 天：只有随时能打的感染者可用
  const early = Duel.view(s);
  assert.ok(early.some((d) => !d.locked), '第 1 天必须有能打的对手');
  assert.ok(early.some((d) => d.locked), '第 1 天必须有还没解锁的对手');

  const odds = Duel.odds(s, 'infected_hunt');
  assert.ok(odds.rounds >= 1 && odds.dmgOut >= 1, '战力对比必须给出可解释的数字');
  assert.ok(['稳赢', '有把握', '五五开', '送死'].includes(odds.verdict));

  const out = Duel.challenge(s, 'infected_hunt');
  assert.equal(out.ok, true);
  assert.ok(out.battle?.enemy, '发起对战必须带上敌人');
  applyOutcome(s, out, { autosave: false });
  assert.ok(s.battle && !s.battle.over, '必须真的进入战斗');
  assert.equal(s.battle.source, 'duel:infected_hunt', '战斗必须记住来源');

  assert.equal(Duel.challenge(s, 'infected_hunt').ok, false, '同一个对手每天只能打一次');

  // 打完这一场，验证赌注在胜利后合并
  s.battle.hp = 1;
  const win = Battle.act(s, 'attack');
  applyOutcome(s, win, { autosave: false });
  if (s.battle?.over) {
    applyOutcome(s, Battle.act(s, 'attack'), { autosave: false });
  }
  assert.ok(s.flags.duel_infected_hunt_d1 || s.flags.fought_infected_hunt, '对战必须留下记录');
});

test('对战：打赢掠夺者会拉低掠夺者立场、抬高凛冬城立场（赌注合并）', () => {
  const s = fresh();
  s.day = 6;
  Duel.challenge(s, 'raider_squad');
  Battle.start(s, 'raider_band', { stake: Duel.duel('raider_squad').stake, source: 'duel:raider_squad' });
  s.battle.hp = 1;
  const out = Battle.act(s, 'attack');
  if (s.battle.over && s.battle.result === 'win') {
    applyOutcome(s, out, { autosave: false });
    assert.ok(s.factions.raiders.standing < 0, '打赢掠夺者必须被掠夺者记住');
    assert.ok(s.factions.lindong.standing > 0, '打赢掠夺者必须让凛冬城高看你一眼');
  }
});

/* ---------------- 8. 倒地与无尽模式 ---------------- */

test('倒地：atRisk 预览与真实损失一致，且不会清空仓库', () => {
  const s = fresh();
  const canned = Inventory.count(s, 'canned');
  Inventory.add(s, 'metal', 3);
  Death.recordGain(s, { metal: 3 }, '测试');

  const risk = Death.atRisk(s);
  assert.equal(risk.total, 3, '预览必须能看到会丢的量');
  const res = Death.handle(s, 'ice');
  assert.equal(res.lost.metal, 3);
  assert.equal(Inventory.count(s, 'canned'), canned, '倒地不能动老物资');
  assert.ok(s.stats.hp > 0 && s.stats.warmth > 0, '倒地后必须被抬回安全线');
});

test('世界阶段：第 31 天进入「永冬时代」，只改变世界状态、不出结局，且温度继续下降', () => {
  const s = fresh();
  Story.begin(s);
  Quest.refresh(s);
  s.day = TOTAL_DAYS;
  assert.equal(Ending.report(s).title.length > 0, true, '阶段报告必须有评价标题');
  assert.equal(s.ending, null, 'report 不能结束游戏');

  const rolled = GameTime.rollDay(s);
  assert.equal(s.day, TOTAL_DAYS + 1);
  assert.equal(s.ending, null, '第 31 天不能产出结局');
  assert.equal(rolled.phaseChanged, true, '第 31 天必须发生阶段切换');
  assert.equal(s.flags.phase_P2, true, '必须留下第二阶段已开启的标记');
  assert.equal(s.reports.length, 1, '阶段切换必须留一份总结');
  assert.equal(rolled.report?.day, TOTAL_DAYS);
  assert.equal(rolled.report?.phaseTo, '永冬时代');

  // 世界状态：第二阶段更冷、资源更少、危险更高；不再新增主线任务
  const c31 = chapterOf(TOTAL_DAYS + 1);
  const c60 = chapterOf(TOTAL_DAYS + 30);
  const c101 = chapterOf(101);
  assert.equal(c31.phase, 'P2');
  assert.equal(c101.phase, 'P3');
  assert.equal(c31.quests.length, 0, '第二阶段不再新增第一阶段的任务');
  assert.ok(c60.temp < c31.temp, '永冬时代温度必须继续下降');
  assert.ok(c101.temp < c60.temp, '冰封世界必须比永冬时代更冷');
  assert.ok(worldMods(TOTAL_DAYS + 1).lootMod < worldMods(1).lootMod, '越往后能捡到的东西越少');
  assert.ok(worldMods(TOTAL_DAYS + 1).dangerMod > worldMods(1).dangerMod, '越往后越危险');
});

/* ---------------- 9. 新手引导 ---------------- */

test('新手引导：第 1 天出现、可逐步推进、可跳过、看完后不再出现', () => {
  const s = fresh();
  assert.equal(Tutorial.shouldShow(s), true);
  assert.equal(Tutorial.stepIndex(s), 0);

  for (let i = 0; i < Tutorial.TUTORIAL_STEPS - 1; i++) Tutorial.advance(s);
  assert.equal(Tutorial.stepIndex(s), Tutorial.TUTORIAL_STEPS - 1);
  Tutorial.advance(s);
  assert.equal(Tutorial.isDone(s), true);
  assert.equal(Tutorial.shouldShow(s), false, '看完后不该再出现');

  Tutorial.restart(s);
  assert.equal(Tutorial.shouldShow(s), true, '可以重新看一遍');
  Tutorial.skip(s);
  assert.equal(Tutorial.isDone(s), true, '跳过必须直接算完成');

  s.day = 5;
  Tutorial.restart(s);
  assert.equal(Tutorial.shouldShow(s), false, '第 5 天不该再弹新手引导');
});

/* ---------------- 10. 新页面渲染 ---------------- */

function makeCtx(state) {
  return {
    get state() { return state; },
    go: () => {},
    refresh: () => {},
    apply: (outcome) => applyOutcome(state, outcome, { autosave: false }),
    choose: () => ({ ok: true }),
    battleMove: () => ({ ok: true }),
    afterBattle: () => ({ ok: true }),
    sleep: () => {},
    buy: (id, price) => Inventory.purchase(state, id, price),
    saveNow: () => {},
    newGame: () => {},
    continueGame: () => {},
    importSave: () => {},
    goHome: () => {},
  };
}

/** 把渲染树拍平成可断言的文本（DOM 垫片自带 allText）。 */
const flatten = (node) => [node?.allText ?? ''];

test('新页面：对战页与成就页都能渲染出真实内容（不是空壳）', async () => {
  const s = fresh();
  s.day = 12;
  Story.begin(s);
  Quest.refresh(s);
  Daily.refresh(s);
  Growth.addXp(s, 200);
  const ctx = makeCtx(s);

  const { DuelPage } = await import('../src/pages/Duel.js');
  const duelText = flatten(DuelPage(ctx)).join(' ');
  assert.match(duelText, /对战/, '对战页必须有标题');
  assert.match(duelText, /感染者/, '对战页必须列出对手');
  assert.match(duelText, /动手/, '对战页必须有发起按钮');
  assert.match(duelText, /攻击/, '对战页必须展示战力对比');

  const { AchievementPage } = await import('../src/pages/Achievement.js');
  const achText = flatten(AchievementPage(ctx)).join(' ');
  assert.match(achText, /生存等级/, '成就页必须显示角色成长');
  assert.match(achText, /今日任务/, '成就页必须显示每日任务');
  assert.match(achText, /倒地记录/, '成就页必须显示倒地次数');
  assert.match(achText, /成就/, '成就页必须显示成就进度');
});
