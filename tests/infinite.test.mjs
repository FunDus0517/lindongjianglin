/**
 * 无限生存验收（对应《凛冬降临_无限生存游戏优化方案》）。
 * 覆盖：世界阶段、长期成长（基地形态 + 科技）、幸存者成长/受伤/死亡/离开、
 * 凌晨灾害、光脑助手、震动反馈的降级路径。
 * 运行：node --test tests/
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installDom } from './_dom.mjs';

installDom();

import { PHASES, chapterOf, phaseOf, phaseProgress, worldMods, TOTAL_DAYS } from '../src/data/chapters.js';
import { TECH_LINES, MAX_TECH_LEVEL } from '../src/data/tech.js';
import { INJURY_DAYS, DEATH_AFTER_INJURED_DAYS, roleAt, ladderFor } from '../src/data/crew.js';

import * as Save from '../src/systems/Save.js';
import * as Base from '../src/systems/Base.js';
import * as Crew from '../src/systems/Crew.js';
import * as WorldMap from '../src/systems/Map.js';
import * as Tech from '../src/systems/Tech.js';
import * as NPC from '../src/systems/NPC.js';
import * as Event from '../src/systems/Event.js';
import * as GameTime from '../src/systems/GameTime.js';
import * as Inventory from '../src/systems/Inventory.js';
import * as Assistant from '../src/systems/Assistant.js';
import * as Battle from '../src/systems/Battle.js';
import * as Story from '../src/systems/Story.js';
import { applyOutcome } from '../src/core/effects.js';
import { ACHIEVEMENTS } from '../src/data/achievements.js';
import { DAILY_POOL } from '../src/data/dailies.js';
import * as haptics from '../src/core/haptics.js';

const fresh = (seed = 20260913) => Save.createState(seed);

/**
 * 静音"发奖系统"：成就与每日任务会在同一笔结算里发货币/晶核，
 * 会盖过"这次研究扣了多少"的精确断言。只标记注入状态，不改生产逻辑。
 */
function muteRewards(state) {
  state.achievements = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, { day: state.day }]));
  state.daily = {
    day: state.day,
    tasks: [{ id: DAILY_POOL[0].id, progress: DAILY_POOL[0].target, done: true }],
    done: 1, streak: 0, metrics: {}, bonus: true,
  };
}

/* ---------------- 1. 世界阶段 ---------------- */

test('世界阶段：三个阶段无限延续，温度持续下降、资源减少、危险上升', () => {
  assert.equal(PHASES.length, 3, '方案里是三个阶段');
  assert.equal(PHASES[2].to, null, '第三阶段必须是无限的');

  assert.equal(phaseOf(1).id, 'P1');
  assert.equal(phaseOf(30).id, 'P1');
  assert.equal(phaseOf(31).id, 'P2');
  assert.equal(phaseOf(100).id, 'P2');
  assert.equal(phaseOf(101).id, 'P3');
  assert.equal(phaseOf(5000).id, 'P3', '再往后也还是第三阶段，没有终点');

  // 阶段内温度继续下降（不是回暖）
  const temps = [chapterOf(31).temp, chapterOf(60).temp, chapterOf(100).temp, chapterOf(101).temp, chapterOf(400).temp];
  for (let i = 1; i < temps.length; i++) {
    assert.ok(temps[i] <= temps[i - 1], `温度必须持续下降：${temps.join(' → ')}`);
  }

  // 世界系数
  const m1 = worldMods(10);
  const m2 = worldMods(50);
  const m3 = worldMods(200);
  assert.ok(m1.lootMod > m2.lootMod && m2.lootMod > m3.lootMod, '越往后能捡到的东西越少');
  assert.ok(m1.dangerMod < m2.dangerMod && m2.dangerMod < m3.dangerMod, '越往后越危险');

  // 阶段进度永远不到 1（没有"走完"这回事）
  assert.ok(phaseProgress(10000) < 1, '阶段进度不能变成 1');
  assert.equal(chapterOf(35).quests.length, 0, '第二阶段不再派发第一阶段的任务');
});

/* ---------------- 2. 长期成长：基地形态 + 科技 ---------------- */

test('基地形态：临时营地 → 木屋基地 → 地下避难所 → 钢铁堡垒 → 地下城市（V3.0 五段）', () => {
  const s = fresh();
  assert.equal(Base.form(s).id, 'camp', '开局是临时营地');
  assert.equal(Base.FORMS.length, 5, 'V3.0 策划案写的是五段成长路线');

  s.base.shelter = 2;
  s.base.storage = 2;
  s.base.heating = 2;      // 合计 6 级 → 木屋基地
  assert.equal(Base.form(s).id, 'cabin');

  s.base.medical = 2;
  s.base.defense = 2;
  s.base.workshop = 3;
  s.base.power = 2;
  s.base.greenhouse = 2;
  s.base.housing = 1;      // 合计 16 级、住所 2 级 → 地下避难所
  assert.ok(Base.totalLevels(s) >= 16, `实际 ${Base.totalLevels(s)} 级`);
  assert.equal(Base.form(s).id, 'shelter');

  s.base.defense = 3;
  for (const f of ['shelter', 'storage', 'heating', 'power', 'greenhouse', 'medical', 'workshop', 'housing']) s.base[f] = 5;
  assert.ok(Base.totalLevels(s) >= 34, `实际 ${Base.totalLevels(s)} 级`);
  assert.equal(Base.form(s).id, 'fortress');

  for (const f of ['shelter', 'storage', 'heating', 'power', 'greenhouse', 'medical', 'defense', 'workshop', 'research', 'housing']) s.base[f] = 8;
  assert.ok(Base.totalLevels(s) >= 60, `实际 ${Base.totalLevels(s)} 级`);
  assert.equal(Base.form(s).id, 'city', '满足全部条件后是最高形态');
  assert.equal(Base.nextForm(s), null, '最高形态没有下一个');
  assert.match(Base.brief(s), /设施合计/, '晨报必须能报出基地状态');
  assert.ok(Base.housingCap(s) > 2, '居民区必须能扩大幸存者容量');
});

test('设施：V3.0 策划案点名的研究室与居民区真的接进了系统', () => {
  const s = fresh();
  const ids = Base.FACILITIES.map((f) => f.id);
  for (const need of ['heating', 'storage', 'medical', 'research', 'defense', 'housing']) {
    assert.ok(ids.includes(need), `建设内容里必须包含 ${need}`);
  }

  // 居民区：幸存者容量
  s.base.housing = 0;
  const cap0 = Base.housingCap(s);
  s.base.housing = 3;
  assert.ok(Base.housingCap(s) > cap0, '居民区必须提高可容纳人数');

  // 研究室：缩短研究时间（两边都给足晶核，否则研究根本发起不了）
  const slowState = fresh();
  slowState.cores = 40;
  const long = Tech.research(slowState, 'heat');
  const fastState = fresh();
  fastState.cores = 40;
  fastState.base.research = 5;
  const short = Tech.research(fastState, 'heat');
  assert.ok(long.ok && short.ok, '两边都应能发起研究');
  assert.ok(short.minutes < long.minutes, '研究室必须缩短研究时间');
  assert.ok(short.minutes >= 60, '缩短要有下限，不能变成零耗时');
});

test('科技：五条线可研究、成本真实扣除、加成真的接进系统', () => {
  const s = fresh();
  assert.equal(TECH_LINES.length, 5, '供暖/能源/探索/防御 + 循环科技');
  assert.equal(Tech.totalLevels(s), 0);

  // 没资源时不能研究，且给出原因
  assert.match(String(Tech.canResearch(s, 'heat')), /晶核不足/);

  s.cores = 40;
  Inventory.add(s, 'blueprint', 3);
  muteRewards(s);   // 否则成就/每日任务的发奖会盖过"研究扣了多少晶核"
  const warmth0 = Base.indoorWarmth(s);
  const def0 = Battle.playerDef(s);
  const cores0 = s.cores;

  applyOutcome(s, Tech.research(s, 'heat'), { autosave: false });
  assert.equal(Tech.level(s, 'heat'), 1, '研究必须真的升级');
  assert.equal(s.cores, cores0 - 2, '必须扣晶核');
  assert.equal(Base.indoorWarmth(s), warmth0 + 2, '供暖科技必须接进室内保温');

  applyOutcome(s, Tech.research(s, 'defense'), { autosave: false });
  assert.equal(Battle.playerDef(s), def0 + 1, '防御科技必须接进战斗防护');

  // 满级封顶（给足资源，验证的是上限而不是"能不能凑齐材料"）
  s.cores = 200;
  Inventory.add(s, 'blueprint', 20);
  for (let i = 0; i < 10; i++) applyOutcome(s, Tech.research(s, 'explore'), { autosave: false });
  assert.equal(Tech.level(s, 'explore'), MAX_TECH_LEVEL, '资源充足时必须能研究到满级');
  assert.equal(Tech.canResearch(s, 'explore'), '已经研究到顶了');

  // 存档往返
  const round = Save.restore(Save.serialize(s));
  assert.equal(round.state.tech.heat, 1, '科技等级必须进存档');
});

/* ---------------- 3. 幸存者：成长 / 受伤 / 死亡 / 离开 ---------------- */

test('幸存者：基地越大成长越快，会转职；受伤会休息，伤上加伤会死', () => {
  const s = fresh();
  const id = 'wangdawei';
  s.npcs[id].met = true;
  s.aid = { members: 1, morale: 60, joined: [id] };

  // 基地体量大 → 每天涨得多
  for (const f of ['shelter', 'storage', 'heating', 'power', 'greenhouse', 'medical', 'defense', 'workshop']) s.base[f] = 5;
  const ladder = ladderFor(id);
  for (let i = 0; i < 12; i++) NPC.growCrew(s);
  assert.ok(s.npcs[id].crewXp > 0, '必须累积成长值');
  assert.equal(s.npcs[id].role, roleAt(id, s.npcs[id].crewXp), '职务必须跟着成长值走');
  assert.notEqual(s.npcs[id].role, ladder[0], '基地体量足够时必须已经转职');

  // 受伤：防御拉满也会出事（条件里带 stress），先造一个高压状态
  s.base.defense = 0;
  s.npcs[id].stress = 90;
  s.day = 5;                       // every = 5（防御 < 2）
  NPC.growCrew(s);
  assert.ok(s.npcs[id].injured > 0, '高压 + 防御不足必须会受伤');
  const injuredDays = s.npcs[id].injured;

  // 恢复
  for (let i = 0; i < INJURY_DAYS; i++) NPC.growCrew(s);
  assert.equal(s.npcs[id].injured, 0, '受伤必须能恢复');

  // 伤上加伤：恢复期内再次受伤 → 累计到阈值就死
  s.npcs[id].injured = 1;
  s.npcs[id].hurtDays = DEATH_AFTER_INJURED_DAYS - 1;
  s.inventory.medicine = 0;
  NPC.growCrew(s);
  assert.equal(s.npcs[id].alive, false, '伤上加伤且没有药必须死亡');
  assert.equal(NPC.statusOf(s, id).label, '已故');
  assert.equal(s.aid.members, 0, '死亡后必须从互助体系里移除');
  assert.ok(injuredDays > 0);
});

test('幸存者：冲突到上限会离开，士气崩了会投靠别的势力', () => {
  const s = fresh();
  s.npcs.laozhou.met = true;
  s.aid = { members: 1, morale: 30, joined: ['laozhou'] };
  s.npcs.laozhou.conflict = NPC.CONFLICT_LEAVE;
  NPC.growCrew(s);
  assert.equal(s.npcs.laozhou.left, true, '冲突到上限必须离开');
  assert.equal(s.aid.members, 0);

  const s2 = fresh();
  s2.npcs.xiao_wu.met = true;
  s2.aid = { members: 1, morale: 5, joined: ['xiao_wu'] };
  s2.npcs.xiao_wu.loyalty = 0;
  s2.day = 6;                      // 投靠判定在天数取模为 0 时发生
  s2.factions.lindong.standing = 30;
  s2.factions.raiders.standing = -10;
  NPC.growCrew(s2);
  assert.equal(s2.npcs.xiao_wu.joinFaction, 'lindong', '士气崩了会投靠立场更好的势力');
  assert.equal(NPC.statusOf(s2, 'xiao_wu').label, '另有归属');
});

/* ---------------- 4. 凌晨灾害 ---------------- */

test('凌晨灾害：按天数确定性地触发，且事件本身必须可决策（不是死胡同）', () => {
  const s = fresh();
  s.day = 3;                       // 防御 0 → every = 3
  Inventory.add(s, 'parts', 1);
  Inventory.add(s, 'metal', 1);
  const hit = GameTime.rollNight(s);
  assert.ok(hit, '第 3 天（防御 0）必须触发凌晨灾害');
  assert.equal(s.active?.id, hit, '灾害必须变成待处理事件');
  const def = Event.event(hit);
  assert.equal(def.kind, 'night');
  assert.ok(def.choices.some((c) => !c.enabled), '凌晨灾害必须至少有一个无条件选项');

  // 防御拉满后间隔变长：第 4 天不该再触发
  const s2 = fresh();
  s2.base.defense = 5;
  s2.day = 4;
  assert.equal(GameTime.rollNight(s2), null, '防御足够时不该天天出事');
});

/* ---------------- 5. 光脑助手 ---------------- */

test('光脑助手：四块信息齐全，危险状态会被指出来，建议永远非空', () => {
  const s = fresh();
  const a = Assistant.assistant(s);
  assert.equal(a.weather.length >= 2, true, '必须有天气预测（含明日预报）');
  assert.equal(a.resources.length >= 2, true, '必须有资源分析');
  assert.ok(a.danger.length >= 1, '危险预警至少要有一条结论');
  assert.ok(a.advice.length >= 1 && a.advice.length <= 3, '生存建议要有但不要刷屏');

  const bad = fresh();
  bad.stats.hp = 20;
  bad.stats.warmth = 30;
  bad.stats.hunger = 10;
  bad.inventory = {};
  const a2 = Assistant.assistant(bad);
  assert.ok(a2.danger.some((l) => /生命|体温|饥饿/.test(l)), '低状态必须被预警');
  assert.ok(a2.advice.some((l) => /体温|吃|水|休息/.test(l)), '低状态必须给出可执行建议');
  assert.equal(a2.dangerLevel, 'warn');
});

/* ---------------- 6. 震动反馈的降级 ---------------- */

test('震动反馈：没有原生桥时静默降级，有桥时按语义发消息', () => {
  assert.equal(haptics.supported(), false, '纯网页环境不该认为自己有震动');
  haptics.haptic('heavy');   // 不该抛异常

  const sent = [];
  globalThis.webkit = { messageHandlers: { haptic: { postMessage: (k) => sent.push(k) } } };
  try {
    assert.equal(haptics.supported(), true);
    haptics.haptic('heavy');
    haptics.haptic('不认识的值');      // 非法值必须回落到 light
    assert.deepEqual(sent, ['heavy', 'light']);
    assert.equal(haptics.hapticForKind('bad'), 'heavy');
  } finally {
    delete globalThis.webkit;
  }
});

/* ---------------- 9. 大型地图：区域与移动 ---------------- */

test('地图：地点按区域分组、跨区移动花时间、未开放的地点不出现、移动真的改位置', () => {
  const s = fresh();
  s.day = 20;
  assert.ok(WorldMap.regions().length >= 5, '至少要有 5 个区域');

  // 跨区越远，耗时越长
  const near = WorldMap.travelMinutes(s, 'supermarket');
  const far = WorldMap.travelMinutes(s, 'hospital');
  assert.ok(far > near, `远的地方必须更花时间（${near} → ${far}）`);
  assert.ok(far <= 400, '单程不能超过大半天，否则一天做不了别的事');

  // 未解锁的地点不出现在地图里
  const early = fresh();
  early.day = 3;
  const ids = WorldMap.view(early).flatMap((r) => r.places.map((p) => p.id));
  assert.equal(ids.includes('deep_mine'), false, '未开放的地点不该出现在地图上');
  assert.equal(ids.includes('hospital'), false, '第 3 天医院还没到');
  assert.ok(ids.includes('apartment'), '自家的地点必须一直在');

  // 移动：真的改位置、花时间、掉体温
  const out = WorldMap.travel(s, 'hospital');
  assert.equal(out.ok, true);
  const before = s.time;
  applyOutcome(s, out, { autosave: false });
  assert.equal(s.location, 'hospital', '移动必须改当前位置');
  assert.ok(s.time > before, '移动必须花时间');
  assert.equal(WorldMap.currentPlace(s), 'hospital');
  assert.equal(WorldMap.travel(s, 'hospital').ok, false, '已经在的地方不用再走');
  assert.equal(typeof WorldMap.travel(s, 'deep_mine').reason, 'string', '未开放必须给出原因');
});

test('排班分工：指派工种有真实产出，守夜能拉长灾害间隔，休息能恢复健康', () => {
  const s = fresh();
  s.npcs.wangdawei.met = true;
  s.npcs.wangdawei.role = '基地管理员';   // 阶梯第二级 → 效率 > 1
  s.aid = { members: 1, morale: 50, joined: ['wangdawei'] };

  // 默认工种 + 非法工种
  assert.equal(Crew.assignmentOf(s, 'wangdawei'), Crew.DEFAULT_JOB, '没指派时用默认工种');
  assert.equal(Crew.assign(s, 'wangdawei', '不存在的工种').ok, false);

  // 搜刮：真的产出物品（走统一结算入口）
  assert.equal(Crew.assign(s, 'wangdawei', 'scavenge').ok, true);
  const out = Crew.dailySettlement(s);
  assert.ok(Object.keys(out.items).length > 0, '搜刮必须产出物品');
  assert.ok(out.notes.some((n) => /排班产出/.test(n)), '必须写进日志');
  assert.ok(s.npcs.wangdawei.health < 100, '体力活要掉健康');

  // 休息：恢复健康与压力
  Crew.assign(s, 'wangdawei', 'rest');
  const before = s.npcs.wangdawei.health;
  Crew.dailySettlement(s);
  assert.ok(s.npcs.wangdawei.health > before, '休息必须恢复健康');

  // 守夜：影响凌晨灾害的间隔（人数越多，间隔越长）
  const plain = fresh();
  plain.base.defense = 0;
  const watched = fresh();
  watched.base.defense = 0;
  watched.npcs.wangdawei.met = true;
  watched.npcs.wangdawei.role = '基地管理员';
  Crew.assign(watched, 'wangdawei', 'guard');
  assert.equal(Crew.guards(watched), 1);
  const hits = [];
  for (const day of [3, 4, 5, 6, 7, 8, 9, 10, 11, 12]) {
    plain.day = day; watched.day = day;
    plain.active = null; watched.active = null;
    hits.push([GameTime.rollNight(plain) ? 1 : 0, GameTime.rollNight(watched) ? 1 : 0]);
  }
  const plainHits = hits.reduce((a, h) => a + h[0], 0);
  const watchedHits = hits.reduce((a, h) => a + h[1], 0);
  assert.ok(watchedHits <= plainHits, `守夜不该让灾害变多（${plainHits} → ${watchedHits}）`);

  // 存档往返
  const round = Save.restore(Save.serialize(watched));
  assert.equal(round.state.crew.wangdawei, 'guard', '排班必须进存档');
});

test('剧情：第 1 天之后不再按天排队，但剧情仍会按解锁顺序在后续出现', () => {
  const s = fresh();
  Story.begin(s);
  assert.deepEqual(s.queue, ['d1_hail', 'd1_blackout', 'd1_mind_bind'], '只有开场按顺序排队');

  // 一个刚到日子的剧情事件，必须能被随机池抽到（给足次数）
  s.day = 4;
  s.queue = [];
  let found = null;
  for (let i = 0; i < 400 && !found; i++) {
    const id = Event.rollRandom(s);
    if (id) found = id;
  }
  assert.ok(found, '第 4 天必须能抽到事件');
  assert.ok(Story.minDayOf(found) <= s.day, `抽到的事件（${found}）不应该还没到日子`);
  assert.ok(TOTAL_DAYS === 30);
});
