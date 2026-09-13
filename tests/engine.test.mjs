/**
 * 引擎测试（项目书 §25 最终验收标准的最小可运行检查）。
 * 全部为纯逻辑测试：不依赖浏览器，用固定种子保证可复现。
 * 运行：node --test tests/
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import * as Save from '../src/systems/Save.js';
import * as Survival from '../src/systems/Survival.js';
import * as GameTime from '../src/systems/GameTime.js';
import * as Inventory from '../src/systems/Inventory.js';
import * as Explore from '../src/systems/Explore.js';
import * as Event from '../src/systems/Event.js';
import * as Battle from '../src/systems/Battle.js';
import * as Quest from '../src/systems/Quest.js';
import * as Base from '../src/systems/Base.js';
import * as Mind from '../src/systems/Mind.js';
import * as Power from '../src/systems/Power.js';
import * as NPC from '../src/systems/NPC.js';
import * as Story from '../src/systems/Story.js';
import * as Weather from '../src/systems/Weather.js';
import * as Ending from '../src/systems/Ending.js';
import * as Faction from '../src/systems/Faction.js';
import * as Market from '../src/systems/Market.js';
import { applyOutcome, resolveChoice } from '../src/core/effects.js';

const fresh = (seed = 20260913) => Save.createState(seed);

test('存档：序列化 → 反序列化保持关键字段', () => {
  const s = fresh();
  s.day = 3; s.time = 900; Inventory.add(s, 'canned', 4); s.flags.left_home = true;
  const expectedCanned = Inventory.count(s, 'canned');
  const round = Save.restore(Save.serialize(s));
  assert.equal(round.ok, true);
  assert.equal(round.state.day, 3);
  assert.equal(round.state.time, 900);
  assert.equal(Inventory.count(round.state, 'canned'), expectedCanned);
  assert.equal(round.state.flags.left_home, true);
  assert.equal(round.state.seed, s.seed);
});

test('存档：损坏与版本不符都能被拒绝且说明原因', () => {
  assert.equal(Save.restore('{"version":1,broken').ok, false);
  assert.match(Save.restore('{"version":1,broken').reason, /损坏/);
  assert.equal(Save.restore('{"version":99}').ok, false);
  assert.match(Save.restore('{"version":99}').reason, /版本/);
  assert.equal(Save.restore(null).ok, false);
});

test('生存：室内第 1 天可以撑过 12 小时，极寒室外无装备会失温', () => {
  const indoor = fresh();
  Survival.tick(indoor, 12 * 60, { indoor: true, heating: 0 });
  assert.ok(indoor.stats.hp > 50, `室内 12 小时不应重伤，实际 hp=${indoor.stats.hp}`);

  const outdoor = fresh();
  outdoor.day = 3;
  outdoor.weather = 'cold_snap';
  Survival.tick(outdoor, 12 * 60, { indoor: false, heating: 0, gear: 0 });
  assert.ok(outdoor.stats.warmth < 35, `室外极寒应进入失温区，实际体温=${outdoor.stats.warmth}`);
  assert.ok(outdoor.stats.hp < indoor.stats.hp, '失温必须真实扣血');
});

test('生存：生命归零产出冰封结局', () => {
  const s = fresh();
  s.stats.hp = 0.5;
  s.stats.warmth = 0;
  s.day = 3;
  s.weather = 'cold_snap';
  Survival.tick(s, 120, { indoor: false });
  assert.equal(Survival.checkDeath(s), 'ice');
  GameTime.spend(s, 30, { indoor: false });
  assert.equal(s.ending?.id, 'ice');
});

test('仓库：容量上限生效，超额新增被拒绝但不会丢东西', () => {
  const s = fresh();
  s.inventory = {};
  const cap = Inventory.capacity(s);
  const fill = Math.floor(cap / 3);              // 木材 bulk = 3
  assert.equal(Inventory.applyItems(s, { wood: fill }).ok, true);
  assert.ok(Inventory.used(s) <= cap);

  const res = Inventory.applyItems(s, { wood: 20 });
  assert.equal(res.ok, false);
  assert.match(res.reason, /容量/);
  assert.ok(Inventory.used(s) <= cap, '被拒绝的批次不得改变容量占用');
  assert.equal(Inventory.count(s, 'metal'), 0);
});

test('仓库：装备与消耗品真实改变状态', () => {
  const s = fresh();
  const eq = Inventory.equip(s, 'down_jacket', true);
  assert.equal(eq.ok, true);
  assert.equal(eq.flags.prepared_out, true);
  assert.equal(Inventory.isWorn(s, 'down_jacket'), true);
  assert.equal(Inventory.equipStats(s).warmthResist, 1);

  s.stats.hunger = 10;
  const use = Inventory.consume(s, 'canned');
  assert.equal(use.ok, true);
  assert.equal(use.stats.hunger, 28);
});

test('行动：未解锁地点被拒绝，解锁后能产出资源或战斗', () => {
  const s = fresh();
  const locked = Explore.performAction(s, 'ruins', 'search');
  assert.equal(locked.ok, false);
  assert.match(locked.reason, /第 3 天/);

  s.day = 2;
  const res = Explore.performAction(s, 'supermarket', 'search');
  assert.equal(res.ok, true);
  assert.ok(res.minutes > 0, '行动必须消耗时间');
  assert.ok(typeof res.stats.energy === 'number');
});

test('事件：条件、选项可用性与不可选原因', () => {
  const s = fresh();
  s.day = 2;
  s.location = 'block';
  const def = Event.event('laozhou_begging');
  assert.equal(Event.eligible(s, def), true);
  const choices = Event.choicesOf(s, def);
  const help = choices.find((c) => c.id === 'help');
  assert.equal(help.enabled, true, '有绷带时应可选“帮助居民”');

  s.inventory.bandage = 0;
  const blocked = Event.choicesOf(s, def).find((c) => c.id === 'help');
  assert.equal(blocked.enabled, false);
  assert.match(blocked.reason, /绷带/);
});

test('事件：随机池受冷却与锋芒值影响，且不会重复触发', () => {
  const s = fresh();
  s.day = 2;
  s.flags.seen_random_frostbite = true;
  assert.equal(Event.eligible(s, Event.event('random_frostbite')), false);

  const low = fresh(7);
  low.day = 10;
  const high = fresh(7);
  high.day = 10;
  high.fame = 90;
  assert.ok(Power.calc(high) >= Power.calc(low));
});

test('结算是唯一入口：一次选择同时改变时间、资源与 Flag', () => {
  const s = fresh();
  s.day = 2;
  s.location = 'block';
  Event.activate(s, 'laozhou_begging');
  const before = s.time;
  const res = resolveChoice(s, 'help');
  assert.equal(res.ok, true);
  assert.ok(s.time > before, '选择必须推进时间');
  assert.equal(Inventory.count(s, 'canned'), 1);
  assert.equal(s.flags.helped_laozhou, true);
  assert.equal(s.npcs.laozhou.favor, 25);
  assert.equal(s.active, null, '结算后活动事件应被清空');
  assert.ok(s.log.length > 0, '必须留下日志反馈');
});

test('战斗：胜负与掉落都由种子决定，胜利写入 Flag', () => {
  const s = fresh(4242);
  s.worn = ['pipe', 'down_jacket'];
  Battle.start(s, 'raider');
  let guard = 0;
  while (Battle.active(s) && guard++ < 50) {
    const out = Battle.act(s, 'attack');
    if (out.ok && out.minutes) applyOutcome(s, out, { autosave: false });
  }
  assert.equal(s.battle.over, true, '战斗必须在有限回合内结束');
  assert.ok(['win', 'escape', 'lose'].includes(s.battle.result));
  if (s.battle.result === 'win') assert.equal(s.flags.raider_defeated, true);
  assert.ok(s.time > 360, '战斗消耗时间');
});

test('战斗：没有队友时“队友协助”不可选（避免死按钮）', () => {
  const s = fresh();
  Battle.start(s, 'raider');
  const ally = Battle.moves(s).find((m) => m.id === 'ally');
  assert.equal(ally.enabled, false);
  assert.match(ally.reason, /队友/);
  const ranged = Battle.moves(s).find((m) => m.id === 'ranged');
  assert.equal(ranged.enabled, false, '没有弹药时远程不可选');
});

test('时间：跨过 06:00 触发每日刷新，天气与任务同步', () => {
  const s = fresh();
  s.time = 1430;
  const res = GameTime.spend(s, 60);
  assert.equal(s.day, 2);
  assert.equal(s.time, GameTime.DAY_START);
  assert.equal(res.days.length, 1);
  assert.ok(Weather.WEATHERS[s.weather], '天气必须是已知类型');
  assert.ok(Object.keys(s.quests).length > 0, '每日刷新必须刷新任务');
  assert.equal(s.chapterTitle, '秩序下降');
});

test('任务：完成判定只发一次奖励且即时反馈', () => {
  const s = fresh();
  Quest.refresh(s);
  assert.equal(Quest.isActive(s, 'q_open_warehouse'), true);
  s.flags.opened_warehouse = true;
  const finished = Quest.sync(s);
  assert.ok(finished.some((q) => q.id === 'q_open_warehouse'));
  assert.equal(Quest.isDone(s, 'q_open_warehouse'), true);
  const again = Quest.sync(s);
  assert.equal(again.length, 0, '已完成任务不应重复发奖');
  assert.equal(Inventory.count(s, 'canned'), 3);
});

test('基地：升级消耗材料并提升等级，材料不足时拒绝', () => {
  const s = fresh();
  s.inventory = { wood: 1, metal: 1 };
  const ok = Base.upgrade(s, 'shelter');
  assert.equal(ok.ok, true);
  assert.equal(Base.level(s, 'shelter'), 1);
  assert.equal(Inventory.count(s, 'wood'), 0);
  const denied = Base.upgrade(s, 'shelter');
  assert.equal(denied.ok, false);
  assert.match(denied.reason, /不足|容量/);
});

test('基地：加工配方按设施等级解锁，产出正确', () => {
  const s = fresh();
  s.inventory = { metal: 2, wood: 2 };
  assert.equal(Base.canCraft(s, 'scrap_parts'), '需要加工设施 1 级');
  s.base.workshop = 1;
  const out = Base.craft(s, 'scrap_parts');
  assert.equal(out.ok, true);
  assert.equal(Inventory.count(s, 'parts'), 1);
  assert.equal(Inventory.count(s, 'metal'), 1);
});

test('光脑：经验升级、强化受天数与晶核约束', () => {
  const s = fresh();
  Mind.addXp(s, 250);
  assert.equal(s.mindLevel, 3);

  const locked = Mind.enhance(s, 'weapon');
  assert.equal(locked.ok, false);
  assert.match(locked.reason, /第 11 天/);

  s.day = 12;
  s.cores = 10;
  const up = Mind.enhance(s, 'weapon');
  assert.equal(up.ok, true);
  assert.equal(Mind.enhanceLevel(s, 'weapon'), 1);
  assert.equal(s.cores, 8);
});

test('战力榜：按战力排序且玩家在榜内', () => {
  const s = fresh();
  s.day = 12;
  Power.refresh(s);
  const rows = Power.board(s);
  assert.ok(rows.length >= 6);
  for (let i = 1; i < rows.length; i++) assert.ok(rows[i - 1].power >= rows[i].power, '榜单必须降序');
  assert.equal(rows.find((r) => r.self).name, '你');
});

test('人物：交谈每天首次才涨好感，压力事件可被触发', () => {
  const s = fresh();
  const first = NPC.talk(s, 'wangdawei');
  assert.equal(first.ok, true);
  const favor = s.npcs.wangdawei.favor;
  applyOutcome(s, first, { autosave: false });
  const second = NPC.talk(s, 'wangdawei');
  assert.equal(second.npc.wangdawei?.favor, undefined, '同一天重复交谈不再涨好感');
  assert.ok(s.npcs.wangdawei.favor >= favor);

  s.npcs.laozhou.met = true;
  s.npcs.laozhou.stress = 80;
  assert.equal(NPC.pressureEvent(s, 'laozhou'), 'laozhou_breakdown');
  assert.ok(Event.event('laozhou_breakdown'), '压力事件必须真实存在');
});

test('剧情：开场事件按顺序排队，里程碑边界跟随开发范围推进', () => {
  const s = fresh();
  Story.begin(s);
  assert.deepEqual(s.queue, ['d1_hail', 'd1_blackout', 'd1_mind_bind']);
  const first = Event.nextQueued(s);
  assert.equal(first, 'd1_hail');

  s.day = 3;
  Story.onNewDay(s);
  assert.ok(s.queue.includes('d3_raider_ambush'));

  s.day = 4;
  Story.onNewDay(s);
  assert.equal(s.milestone, null, '第 4 天属于 M2 开发范围内，不应弹出里程碑结算');

  s.day = 10;
  Story.onNewDay(s);
  assert.equal(s.milestone, null);
  assert.ok(s.queue.includes('d10_cold_snap'), '第 10 天必须排入强寒潮剧情');

  s.day = 11;
  Story.onNewDay(s);
  assert.equal(s.milestone, null, '第 11 天属于 M3 开发范围内');
  assert.ok(s.queue.includes('d11_board_open'), '第 11 天必须排入战力榜剧情');

  s.day = 20;
  Story.onNewDay(s);
  assert.equal(s.milestone, null);
  assert.ok(s.queue.includes('d20_prep'), '第 20 天必须排入终局前夜剧情');

  s.day = 21;
  Story.onNewDay(s);
  assert.equal(s.milestone, null, '第 21 天属于 M4 开发范围内');
  assert.ok(s.queue.includes('d21_market_open'), '第 21 天必须排入交易区剧情');

  s.day = 30;
  Story.onNewDay(s);
  assert.equal(s.milestone, null);
  assert.ok(s.queue.includes('d30_dawn'), '第 30 天必须排入黎明结算剧情');

  s.day = 31;
  Story.onNewDay(s);
  assert.equal(s.milestone, 'M4', '第 31 天应结算 M4 里程碑');
});

test('仓库：容量上限只约束新增，消耗材料永远不被容量拒绝', () => {
  const s = fresh(31);
  s.inventory = {};
  const cap = Inventory.capacity(s);
  // 塞到只剩极少空间
  Inventory.applyItems(s, { wood: Math.floor(cap / 3) });
  assert.ok(Inventory.free(s) < 6, `应接近满仓，实际剩余 ${Inventory.free(s)}`);

  // 纯消耗：即使“消耗量”大于剩余容量也必须放行
  const spend = Inventory.applyItems(s, { wood: -4 });
  assert.equal(spend.ok, true, `消耗材料不该因容量被拒绝：${spend.reason}`);
  assert.equal(Inventory.count(s, 'wood'), Math.floor(cap / 3) - 4);

  // 新增仍然受容量约束
  const gain = Inventory.applyItems(s, { wood: 10 });
  assert.equal(gain.ok, false, '新增必须仍然受容量约束');
  assert.match(gain.reason, /容量/);

  // 升级设施时同理：仓库接近满仓也必须能升级
  s.day = 3;
  s.base.storage = 0;
  s.inventory = { wood: 30, metal: 30, parts: 5, insulation: 5 };
  assert.ok(Inventory.free(s) < 10, `升级前应接近满仓，实际剩余 ${Inventory.free(s)}`);
  assert.equal(Base.canUpgrade(s, 'shelter'), true, '接近满仓时升级也必须可行');
});

test('M3 循环：晶核结算与强化闭环（晶核来源不能是死系统）', () => {
  const s = fresh();
  s.day = 17;
  for (const id of ['mutant_infected', 'horde']) {
    const def = Battle.enemyOf(id);
    assert.ok(def.drops.some(([dropId]) => dropId === 'cores'), `${def.name} 必须掉落晶核，否则强化系统无法闭环`);
  }

  applyOutcome(s, { ok: true, cores: 3, notes: ['战利品：晶核×3'] }, { autosave: false });
  assert.equal(s.cores, 3, '晶核必须真的进入存档状态');

  const before = Mind.enhanceLevel(s, 'weapon');
  const cost = Mind.ENHANCE.weapon.cost(before);
  const res = Mind.enhance(s, 'weapon');
  assert.equal(res.ok, true, res.reason);
  assert.equal(Mind.enhanceLevel(s, 'weapon'), before + 1);
  assert.equal(s.cores, 3 - cost, '强化必须按等级消耗晶核');
  assert.ok(Power.calc(s) > 0);
});

test('势力：立场影响遇敌风险，互助网立场由成员与士气派生', () => {
  const s = fresh();
  const base = Faction.riskMod(s);
  Faction.change(s, 'raiders', -60, { discover: true });
  assert.ok(Faction.riskMod(s) > base, '掠夺者立场恶化必须提高遇敌风险');
  Faction.change(s, 'raiders', 200);
  assert.equal(Faction.standing(s, 'raiders'), 100, '立场必须夹在 −100—100');
  assert.ok(Faction.riskMod(s) < base, '掠夺者立场改善必须降低遇敌风险');
  assert.equal(Faction.known(s, 'raiders'), true);

  s.aid = { members: 4, morale: 60, joined: [] };
  Faction.syncAid(s);
  assert.ok(Faction.standing(s, 'aidnet') > 0, '互助规模必须派生出互助网立场');
  assert.equal(Faction.band('aidnet', Faction.standing(s, 'aidnet')) !== '', true);
  assert.ok(Faction.visible(s).some((f) => f.id === 'aidnet' && f.value > 0));
});

test('结局：五个最终结局与死亡结局全部可达，且判定按优先级取第一个成立的', () => {
  const mk = (mutate) => {
    const s = fresh(1234);
    s.day = 31;
    mutate(s);
    return Ending.evaluate(s);
  };

  // 苟王之王：低锋芒 + 高储备 + 活着
  assert.equal(mk((s) => { s.fame = 10; s.stats.hp = 80; s.inventory = { canned: 40 }; }), 'king_of_hiding');

  // 凛冬堡主：高防御 + 稳定住所 + 互助人口
  assert.equal(mk((s) => { s.inventory = {}; s.base.defense = 4; s.base.shelter = 3; s.aid = { members: 4, morale: 50, joined: [] }; }), 'winter_lord');

  // 战力第一：榜单第一 + 战力达标（对手曲线在第 31 天最高约 136）
  assert.equal(mk((s) => { s.inventory = {}; s.fame = 80; s.power = 150; }), 'power_first');
  assert.notEqual(mk((s) => { s.inventory = {}; s.fame = 80; s.power = 90; }), 'power_first', '没到第一不该给战力第一');

  // 绿色黎明：高级温室 + 极寒农业路线
  assert.equal(mk((s) => { s.inventory = {}; s.base.greenhouse = 3; s.flags.agri_route = true; }), 'green_dawn');

  // 双城记：潜伏路线 + 凛冬城关系
  assert.equal(mk((s) => { s.inventory = {}; s.flags.corridor_route = true; s.factions.lindong.standing = 30; }), 'two_cities');
  assert.notEqual(mk((s) => { s.inventory = {}; s.flags.corridor_route = true; s.factions.lindong.standing = 0; }), 'two_cities', '立场不足不该给双城记');

  // 兜底：什么都没做到也要有结局
  assert.equal(mk((s) => { s.inventory = {}; s.fame = 60; s.power = 40; }), 'survivor');

  // 死亡结局仍然优先于所有最终结局
  const dead = fresh(1234);
  dead.day = 31;
  dead.stats.hp = 0;
  Ending.apply(dead, 'ice');
  assert.equal(dead.ending.kind, 'death');
  assert.equal(dead.ending.id, 'ice');
});

test('交易区：价格随日期与势力变化，买卖受库存与货币约束', () => {
  const s = fresh(888);
  s.day = 20;
  assert.equal(Market.isOpen(s), false);
  assert.match(Market.canBuy(s, 'canned', 1), /第 21 天/);

  s.day = 21;
  Market.refresh(s);
  s.currency = 300;
  const early = Market.buyPrice(s, 'canned');
  s.day = 28;
  Market.refresh(s);
  const late = Market.buyPrice(s, 'canned');
  assert.ok(late > early, `越晚越贵：${early} → ${late}`);

  Faction.change(s, 'lindong', -200, { discover: true });
  const hostile = Market.buyPrice(s, 'canned');
  Faction.change(s, 'lindong', 400);
  const friendly = Market.buyPrice(s, 'canned');
  assert.ok(friendly <= hostile, '与凛冬城关系好时不应更贵');

  Market.refresh(s);
  const stock0 = Market.remaining(s, 'fuel');
  const cash0 = s.currency;
  applyOutcome(s, Market.buy(s, 'fuel', 1), { autosave: false });
  assert.equal(Market.remaining(s, 'fuel'), stock0 - 1, '购买必须扣减当日库存');
  assert.ok(s.currency < cash0, '购买必须扣货币');
  assert.equal(Inventory.count(s, 'fuel'), 1);

  s.currency = 0;
  assert.equal(Market.buy(s, 'fuel', 1).ok, false, '货币不足必须被拒绝');

  Inventory.applyItems(s, { canned: 2 });
  const cannedBefore = Inventory.count(s, 'canned');
  const cash1 = s.currency;
  applyOutcome(s, Market.sell(s, 'canned', 2), { autosave: false });
  assert.equal(Inventory.count(s, 'canned'), cannedBefore - 2);
  assert.ok(s.currency > cash1, '卖出必须换回货币');

  s.cores = 2;
  const cash2 = s.currency;
  applyOutcome(s, Market.sell(s, 'cores', 1), { autosave: false });
  assert.equal(s.cores, 1, '晶核作为标量商品必须被正确扣除');
  assert.ok(s.currency > cash2);
  assert.equal(Market.sell(s, 'cores', 9).ok, false, '晶核不足必须被拒绝');
});

test('基地：每天只能升两处设施，且每次升级都真实消耗时间', () => {
  const s = fresh(4242);
  s.day = 5;
  s.base.storage = 4;                 // 先给足容量，避免容量上限干扰这条测试
  s.inventory = { wood: 10, metal: 10, parts: 6, insulation: 6, medicine: 3, seeds: 3, fuel: 3 };

  const t0 = s.time;
  const first = Base.upgrade(s, 'storage');
  assert.equal(first.ok, true, first.reason);
  assert.equal(typeof first.minutes, 'number');
  applyOutcome(s, first, { autosave: false });   // 时间由唯一结算入口推进
  assert.ok(s.time > t0, `升级必须推进时间：${t0} → ${s.time}`);
  assert.equal(s.baseUpgrades.day, 5);
  assert.equal(s.baseUpgrades.count, 1);
  assert.equal(Base.upgradesLeft(s), Base.DAILY_UPGRADE_LIMIT - 1);

  applyOutcome(s, Base.upgrade(s, 'shelter'), { autosave: false });
  assert.equal(Base.level(s, 'shelter'), 1, '同一天第二处设施应可升级');
  assert.equal(Base.upgradesLeft(s), 0);

  const third = Base.upgrade(s, 'heating');
  assert.equal(third.ok, false, '同一天第三处设施必须被拒绝');
  assert.match(third.reason, /今日升级次数已用完/);
  assert.equal(Base.level(s, 'heating'), 0, '被拒绝的升级不得改变设施等级');

  // 跨日刷新后额度恢复
  s.time = 1430;
  GameTime.spend(s, 30);
  assert.equal(s.day, 6);
  assert.equal(Base.upgradesLeft(s), Base.DAILY_UPGRADE_LIMIT);
  assert.equal(Base.upgrade(s, 'heating').ok, true, '新的一天应重新获得升级额度');
});

test('基地：设施上限 10 级，后期收益饱和不失控', () => {
  for (const f of Base.FACILITIES) assert.equal(f.max, Base.MAX_LEVEL, `${f.name} 上限应为 ${Base.MAX_LEVEL}`);
  assert.equal(Base.MAX_LEVEL, 10);

  const s = fresh(7);
  s.day = 20;
  s.base.defense = Base.MAX_LEVEL;
  assert.ok(Base.defenseMod(s) >= 0.36, `防御满级后仍应保留至少 36% 遇敌风险，实际 ${Base.defenseMod(s)}`);
  assert.equal(Base.canUpgrade(s, 'defense'), `已达到最高等级（${Base.MAX_LEVEL} 级）`);

  s.base.heating = Base.MAX_LEVEL;
  s.base.shelter = Base.MAX_LEVEL;
  assert.equal(Math.round(Base.indoorWarmth(s)), Base.MAX_LEVEL * 6 + Base.MAX_LEVEL * 0.8);

  // 高级加工设施不再解锁新配方，而是提升单次产量（效果文案必须体现）
  s.base.workshop = Base.MAX_LEVEL;
  assert.match(Base.facility('workshop').effect(Base.MAX_LEVEL), /额外产出 \+2/);
  assert.equal(Base.recipes(s).length, Base.RECIPES_COUNT, '满级加工设施应解锁全部配方');
});

test('端到端：从第 1 天推进到第 2 天，关键状态自洽', () => {
  const s = fresh(99);
  Story.begin(s);
  Quest.refresh(s);

  // 第 1 天的开场剧情按队列依次弹出，结算一段后由引擎自动接上下一段
  const answer = { d1_hail: 'go', d1_blackout: 'count', d1_mind_bind: 'analyst' };
  assert.equal(Event.advanceStory(s), 'd1_hail', '开场必须从冰雹降临开始');
  let guard = 0;
  while (s.active?.kind === 'event' && guard++ < 10) {
    const id = s.active.id;
    const res = resolveChoice(s, answer[id] ?? 'go');
    assert.equal(res.ok, true, `${id} 必须可以结算`);
  }
  assert.equal(guard >= 3, true, '三段开场剧情都必须被处理');
  assert.equal(s.brain, 'analyst');
  assert.equal(s.mindLevel, 1);
  assert.equal(s.flags.counted_stock, true);
  assert.equal(s.queue.length, 0, '第 1 天剧情结算完不应残留队列');

  const out = Explore.performAction(s, 'supermarket', 'search');
  applyOutcome(s, out, { autosave: false });
  assert.ok(s.actions >= 1);
  assert.ok(s.stats.energy < 100, '行动必须消耗精力');
  assert.ok(s.log.length > 0);
});

test('事件生命周期：待处理事件不会被后续行动顶掉或静默丢弃', () => {
  const s = fresh(31);
  Story.begin(s);
  Quest.refresh(s);
  Event.advanceStory(s);
  const pending = s.active.id;
  assert.equal(pending, 'd1_hail');

  // 玩家还没做决定时又执行了一次行动：剧情必须原样保留
  applyOutcome(s, Explore.performAction(s, 'apartment', 'search'), { autosave: false });
  assert.equal(s.active?.id, pending, '行动不得覆盖待处理事件');
  assert.equal(Event.activate(s, 'd1_blackout'), null, '第二个事件不得挤掉第一个');

  // 队列里的后续剧情也不得因为激活被拒绝而消失
  assert.ok(s.queue.includes('d1_blackout'), '被拒绝的事件应留在队列里');
  resolveChoice(s, 'go');
  assert.ok(s.queue.length + (s.active ? 1 : 0) >= 1, '第一段剧情结算后仍有后续剧情待处理');
});

test('剧情条件：分支剧情条件不成立时被跳过，且队列不会卡住', () => {
  const s = fresh(77);
  s.day = 16;
  s.location = 'home';
  // d16_pact 需要先接触医院；这里没有接触过，应当被跳过
  s.queue = ['d16_pact', 'd16_hospital'];
  const first = Event.advanceStory(s);
  assert.equal(first, 'd16_hospital', '条件不成立的 d16_pact 应被跳过，而不是卡住队列');
  assert.equal(s.queue.length, 0);

  // 已接触医院后再排队，同一段剧情就能正常触发
  const s2 = fresh(78);
  s2.day = 16;
  s2.flags.hospital_contact = true;
  s2.queue = ['d16_pact'];
  assert.equal(Event.advanceStory(s2), 'd16_pact');

  // 已触发过的剧情不会重复排队
  const s3 = fresh(79);
  s3.day = 16;
  s3.flags.seen_d16_hospital = true;
  s3.queue = ['d16_hospital'];
  assert.equal(Event.advanceStory(s3), null);
});
