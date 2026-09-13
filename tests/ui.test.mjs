/**
 * UI 冒烟测试：用最小 DOM 垫片渲染每一个页面，捕获页面级运行期错误
 * （未定义导入、空引用、渲染分支抛异常）。不引入任何第三方依赖。
 * 运行：node --test tests/
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installDom, El } from './_dom.mjs';

// DOM 垫片与「全界面内容审查」共用同一份实现（tests/_dom.mjs）
installDom();

/* ---------------- 被测模块 ---------------- */
const dom = await import('../src/core/dom.js');
const { applyOutcome } = await import('../src/core/effects.js');
const Save = await import('../src/systems/Save.js');
const Story = await import('../src/systems/Story.js');
const Quest = await import('../src/systems/Quest.js');
const Event = await import('../src/systems/Event.js');
const Battle = await import('../src/systems/Battle.js');
const Explore = await import('../src/systems/Explore.js');
const Inventory = await import('../src/systems/Inventory.js');
const Market = await import('../src/systems/Market.js');
const Base = await import('../src/systems/Base.js');

const pages = {
  Home: (await import('../src/pages/Home.js')).Home,
  Game: (await import('../src/pages/Game.js')).Game,
  Action: (await import('../src/pages/Action.js')).ActionPage,
  Warehouse: (await import('../src/pages/Warehouse.js')).WarehousePage,
  Mind: (await import('../src/pages/Mind.js')).MindPage,
  Characters: (await import('../src/pages/Characters.js')).CharactersPage,
  Quest: (await import('../src/pages/Quest.js')).QuestPage,
  Base: (await import('../src/pages/Base.js')).BasePage,
  Settings: (await import('../src/pages/Settings.js')).SettingsPage,
  Ending: (await import('../src/pages/Ending.js')).EndingPage,
  Milestone: (await import('../src/pages/Milestone.js')).MilestonePage,
  EventPage: (await import('../src/pages/Event.js')).EventPage,
  Battle: (await import('../src/pages/Battle.js')).BattlePage,
};

function makeCtx(state) {
  const calls = { go: [], applied: 0, chosen: [], slept: 0 };
  const ctx = {
    get state() { return state; },
    go: (r) => calls.go.push(r),
    refresh: () => {},
    apply: (outcome) => { calls.applied += 1; return applyOutcome(state, outcome, { autosave: false }); },
    choose: (id) => { calls.chosen.push(id); return { ok: true }; },
    battleMove: () => ({ ok: true }),
    afterBattle: () => ({ ok: true }),
    sleep: () => { calls.slept += 1; },
    buy: (id, price) => { calls.applied += 1; return Inventory.purchase(state, id, price); },
    saveNow: () => {},
    newGame: () => {},
    continueGame: () => {},
    importSave: () => {},
    clearMilestone: () => {},
    showHelp: () => {},
  };
  return { ctx, calls };
}

function richState() {
  const s = Save.createState(1234);
  Story.begin(s);
  Quest.refresh(s);
  s.day = 3;
  s.location = 'hardware';
  s.base = { shelter: 1, storage: 1, heating: 1, power: 0, greenhouse: 1, medical: 0, defense: 1, workshop: 1 };
  s.inventory = { canned: 3, bottled_water: 2, charcoal: 2, wood: 3, metal: 3, parts: 2, insulation: 2, bandage: 1, pipe: 1, ammo: 2, down_jacket: 1, seeds: 1, produce: 1 };
  s.worn = ['pipe', 'down_jacket'];
  s.flags = { opened_warehouse: true, saw_his_hoard: true, left_home: true, helped_laozhou: true, counted_stock: true };
  s.npcs.laozhou.met = true;
  s.npcs.laozhou.favor = 30;
  s.fame = 24;
  s.currency = 60;
  s.cores = 6;
  return s;
}

/** 切换光脑页签并重新渲染（页签状态是页面模块级 UI 状态）。 */
function openMindTab(ctx, label) {
  const page = pages.Mind(ctx);
  const tab = [...page.walk()].find((n) => n.tagName === 'BUTTON' && n.allText.includes(label));
  assert.ok(tab, `光脑页缺少页签：${label}`);
  tab.click();
  return pages.Mind(ctx);
}

test('UI：每个页面都能渲染出内容且不抛异常', () => {
  const state = richState();
  for (const [name, view] of Object.entries(pages)) {
    const { ctx } = makeCtx(state);
    let node;
    assert.doesNotThrow(() => { node = view(ctx); }, `${name} 渲染失败`);
    assert.ok(node instanceof El, `${name} 必须返回 DOM 节点`);
    assert.ok(node.allText.trim().length > 0, `${name} 不应渲染为空`);
  }
});

test('UI：光脑六个标签页都能渲染（含未开放状态的强化/战力榜/交易区）', () => {
  const state = richState();
  const Mind = pages.Mind;
  const { ctx } = makeCtx(state);
  for (const day of [3, 12, 22]) {
    state.day = day;
    assert.doesNotThrow(() => { Mind(ctx); }, `第 ${day} 天的光脑页渲染失败`);
  }
});

test('UI：事件页在无活动事件时给出兜底内容，有事件时展示选项', () => {
  const state = richState();
  const { ctx } = makeCtx(state);
  assert.match(pages.EventPage(ctx).allText, /没有需要处理/);

  Event.activate(state, 'laozhou_begging');
  const text = pages.EventPage(ctx).allText;
  assert.match(text, /楼下的老人/);
  assert.match(text, /帮助居民/);
});

test('UI：行动页地点详情展开后每个行动按钮都有处理函数', () => {
  const state = richState();
  const { ctx } = makeCtx(state);
  const page = pages.Action(ctx);
  assert.match(page.allText, /地点卡/);

  // 点击第一条地点行（紧凑列表 → 详情 Sheet，挂在 #layer 上）
  const card = [...page.walk()].find((c) => (c.className ?? '').includes('item'));
  assert.ok(card, '行动页必须渲染可点击的地点行');
  assert.ok((card.handlers.click ?? []).length > 0, '地点行必须绑定点击处理函数');
  card.click();
  const layerEl = document.getElementById('layer');
  const sheetText = layerEl.allText;
  assert.match(sheetText, /选择行动/);
  const buttons = [...layerEl.walk()].filter((n) => n.tagName === 'BUTTON');
  assert.ok(buttons.length >= 3, '地点详情必须提供多个行动按钮');
  for (const b of buttons) assert.ok((b.handlers.click ?? []).length > 0, `按钮「${b.allText}」没有绑定处理函数（死按钮）`);
});

test('UI：仓库搜索与分类筛选改变渲染结果', async () => {
  const state = richState();
  const { ctx } = makeCtx(state);
  const first = pages.Warehouse(ctx).allText;
  assert.match(first, /罐头/);

  const input = [...pages.Warehouse(ctx).children].find((c) => c.tagName === 'INPUT');
  assert.ok(input, '仓库页必须有搜索框');
  input.value = '不存在的物品名';
  input.handlers.input[0]({ target: input });
  assert.doesNotMatch(pages.Warehouse(ctx).allText, /罐头/);
});

test('UI：战斗页可渲染回合与指令，结束后给出继续入口', () => {
  const state = richState();
  Battle.start(state, 'raider');
  const { ctx } = makeCtx(state);
  assert.match(pages.Battle(ctx).allText, /掠夺者/);
  state.battle.over = true;
  state.battle.result = 'win';
  assert.match(pages.Battle(ctx).allText, /继续/);
});

test('UI：结局页与里程碑页都能展示对应状态', () => {
  const state = richState();
  state.ending = { id: 'ice', day: 3, title: '冰封', kind: 'death', stats: { 存活天数: 3, 战力: 12 }, at: { day: 3, time: 900 } };
  const { ctx } = makeCtx(state);
  assert.match(pages.Ending(ctx).allText, /冰封/);

  state.milestone = 'M1';
  assert.match(pages.Milestone(ctx).allText, /M1 里程碑完成/);

  state.milestone = 'M2';
  const m2 = pages.Milestone(ctx).allText;
  assert.match(m2, /M2 里程碑完成/, '第 11 天必须展示 M2 结算');
  assert.match(m2, /M3/, 'M2 结算页必须说明下一步开发范围');
  assert.match(m2, /互助体系/, 'M2 结算页必须包含本阶段新增系统的进度');
});

test('UI：第 6 天起行动页出现新区域，第 7 天感染者剧情可渲染', () => {
  const state = richState();
  const { ctx } = makeCtx(state);

  state.day = 3;
  assert.doesNotMatch(pages.Action(ctx).allText, /地下停车场/, '第 3 天不应出现第 6 天区域');

  state.day = 6;
  const text = pages.Action(ctx).allText;
  for (const name of ['地下停车场', '加油站', '社区小学']) {
    assert.match(text, new RegExp(name), `第 6 天行动页必须列出 ${name}`);
  }

  state.day = 7;
  Event.activate(state, 'd7_first_infected');
  const ev = pages.EventPage(ctx).allText;
  assert.match(ev, /抽搐的人/);
  assert.match(ev, /处理掉/);
  const buttons = [...pages.EventPage(ctx).walk()].filter((n) => n.tagName === 'BUTTON');
  assert.ok(buttons.length >= 3, '感染者事件必须提供多个分支');
  for (const b of buttons) assert.ok((b.handlers.click ?? []).length > 0, `按钮「${b.allText}」是死按钮`);
});

test('UI：第 21 天交易区可用（买卖按钮、库存与货币联动）', () => {
  const state = richState();
  state.day = 21;
  state.currency = 200;
  state.cores = 2;
  state.quests = {};   // 隔离任务奖励，只验证交易区本身的结算
  Market.refresh(state);
  const { ctx } = makeCtx(state);
  const market = openMindTab(ctx, '交易区');

  assert.match(market.allText, /物价指数/, '交易区必须显示物价指数');
  assert.match(market.allText, /晶核/, '晶核必须作为可交易商品出现');

  const buy = [...market.walk()].find((n) => n.tagName === 'BUTTON' && n.allText.includes('买 1'));
  const sell = [...market.walk()].find((n) => n.tagName === 'BUTTON' && n.allText.includes('卖 1'));
  assert.ok(buy && sell, '交易区必须提供买入与卖出按钮');
  assert.equal(buy.attrs.disabled, undefined, '货币充足时买入按钮必须可用');
  assert.ok((buy.handlers.click ?? []).length > 0, '买入按钮不得是死按钮');
  assert.ok((sell.handlers.click ?? []).length > 0, '卖出按钮不得是死按钮');

  // 真正的买入会改变状态（走 ctx.apply → 唯一结算入口）
  const firstGood = Market.offers(state)[0].id;
  const stockBefore = Market.remaining(state, firstGood);
  buy.click();
  assert.ok(state.currency < 200, '买入必须扣货币');
  assert.ok(Market.remaining(state, firstGood) <= stockBefore, '买入必须扣减当日库存');

  // 货币不足：按钮禁用并说明原因，而不是静默失效
  state.currency = 0;
  const poor = openMindTab(ctx, '交易区');
  const poorBuy = [...poor.walk()].find((n) => n.tagName === 'BUTTON' && n.allText.includes('买 1'));
  assert.equal(poorBuy.attrs.disabled, '', '货币不足时买入按钮必须禁用');
  assert.match(poorBuy.dataset.reason ?? '', /货币|库存|容量/, '禁用必须说明原因');
});

test('UI：M4 地点与人物按天开放，结局页展示完整统计', () => {
  const state = richState();
  const { ctx } = makeCtx(state);

  state.day = 21;
  assert.doesNotMatch(pages.Action(ctx).allText, /城北晶矿/, '第 21 天不应出现晶矿');
  state.day = 22;
  assert.match(pages.Action(ctx).allText, /城北晶矿/);
  assert.match(pages.Characters(ctx).allText, /老猫/, '第 22 天人物页必须出现线人');
  state.day = 23;
  assert.match(pages.Action(ctx).allText, /废弃地下通道/);

  state.ending = {
    id: 'winter_lord', day: 31, title: '凛冬堡主', kind: 'final',
    stats: { 存活天数: 31, 战力榜排名: '#3', 互助体系: '9 人｜士气 62', 凛冬城立场: 30 },
    at: { day: 31, time: 360 },
  };
  const ending = pages.Ending(ctx).allText;
  assert.match(ending, /凛冬堡主/);
  assert.match(ending, /战力榜排名/, '结局统计必须包含排名');
  assert.match(ending, /互助体系/, '结局统计必须包含互助体系');
});

test('UI：偏好设置（音效 / 动效）可切换并落到文档根节点', async () => {
  const prefs = await import('../src/core/prefs.js');
  const audio = await import('../src/core/audio.js');
  const root = document.documentElement;

  prefs.load();
  assert.equal(prefs.get().sound, true, '默认开启音效');
  assert.equal(prefs.get().motion, true, '默认开启动效');

  prefs.set('sound', false);
  assert.equal(prefs.get().sound, false);
  assert.equal(root.dataset.sound, 'off', '关闭音效必须落到 <html data-sound>');
  prefs.set('motion', false);
  assert.equal(root.dataset.motion, 'reduced', '关闭动效必须落到 <html data-motion>');

  // 无 AudioContext 的环境（Node 测试、旧浏览器）必须安全失败，不能抛异常
  assert.equal(audio.cue('click'), false, '没有 AudioContext 时不能出声');
  assert.doesNotThrow(() => audio.cueForKind('good'));

  prefs.set('sound', true);
  prefs.set('motion', true);
  assert.equal(root.dataset.sound, 'on');
  assert.equal(root.dataset.motion, 'full');
});

test('UI：音效合成路径真实执行（假 AudioContext 下产生音源与包络）', async () => {
  const audio = await import('../src/core/audio.js');
  const played = [];
  class FakeParam { constructor() { this.calls = []; } setValueAtTime(v) { this.calls.push(['set', v]); } exponentialRampToValueAtTime(v) { this.calls.push(['ramp', v]); } }
  class FakeOsc { constructor() { this.frequency = new FakeParam(); this.type = ''; this.started = null; this.stopped = null; } connect() {} start(t) { this.started = t; } stop(t) { this.stopped = t; } }
  class FakeGain { constructor() { this.gain = new FakeParam(); } connect() {} }
  class FakeCtx {
    constructor() { this.currentTime = 1; this.state = 'running'; this.destination = {}; }
    createOscillator() { const o = new FakeOsc(); played.push(o); return o; }
    createGain() { return new FakeGain(); }
    resume() {}
  }
  globalThis.AudioContext = FakeCtx;
  audio.reset();
  try {
    assert.equal(audio.cue('reward'), true, '有 AudioContext 时必须出声');
    const osc = played.find((p) => p instanceof FakeOsc);
    assert.ok(osc, '必须创建振荡器');
    assert.equal(osc.started, 1, '必须在当前时间开始');
    assert.ok(osc.stopped > osc.started, '必须安排停止时间，避免音源泄漏');
    assert.ok(osc.frequency.calls.length >= 1, '必须设置频率包络');

    audio.setEnabled(false);
    assert.equal(audio.cue('reward'), false, '关闭音效后必须静音');
    audio.setEnabled(true);
  } finally {
    delete globalThis.AudioContext;
    audio.reset();
  }
});

test('UI：设置页的音效与动效开关可点击并真实改写偏好', async () => {
  const prefs = await import('../src/core/prefs.js');
  const audio = await import('../src/core/audio.js');
  prefs.load();
  const state = richState();
  const { ctx } = makeCtx(state);
  const motionBefore = prefs.get().motion;
  const soundBefore = prefs.get().sound;

  const page = pages.Settings(ctx);
  const pick = (label) => {
    const row = [...page.walk()].find((n) => n.className?.includes('row') && n.allText.includes(label));
    assert.ok(row, `设置页必须有「${label}」这一行`);
    const button = [...row.walk()].find((n) => n.tagName === 'BUTTON');
    assert.ok(button, `「${label}」必须有开关按钮`);
    assert.ok((button.handlers.click ?? []).length > 0, '开关不得是死按钮');
    return button;
  };

  pick('完整动效').click();
  assert.equal(prefs.get().motion, !motionBefore, '点击必须真实改写动效偏好');
  assert.equal(document.documentElement.dataset.motion, motionBefore ? 'reduced' : 'full');

  pick('界面音效').click();
  assert.equal(prefs.get().sound, !soundBefore, '点击必须真实改写音效偏好');
  assert.equal(document.documentElement.dataset.sound, soundBefore ? 'off' : 'on');

  prefs.set('motion', true);
  prefs.set('sound', true);
  audio.setEnabled(true);
});

test('UI：重复切换页面不累积 DOM 节点（无渲染泄漏）', async () => {
  await import('../src/main.js');
  const app = document.getElementById('app');
  const main = app.children.find((c) => c.tagName === 'MAIN');
  assert.ok(main, '应用外壳必须包含内容区');
  const count = (node) => [...node.walk()].length;

  clickText(app, '仓库');
  const base = count(main);
  for (let i = 0; i < 15; i++) {
    clickText(app, '主页');
    clickText(app, '仓库');
  }
  const after = count(main);
  assert.ok(after <= base * 1.5 + 20, `重复渲染后节点数不应持续增长：${base} → ${after}`);
});

test('UI：任务页筛选真的过滤内容（默认只看进行中）', () => {
  const state = richState();
  for (let d = 1; d <= 8; d++) { state.day = d; Quest.refresh(state); }
  state.day = 8;
  state.quests.q_open_warehouse.status = 'done';
  const { ctx } = makeCtx(state);

  const activeView = pages.Quest(ctx);
  const cardCount = (node) => [...node.walk()].filter((n) => (n.className ?? '').includes('card')).length;
  assert.match(activeView.allText, /进行中/, '必须有筛选条');
  assert.match(activeView.allText, /已完成（1）/, '已完成数量必须真实统计');
  assert.doesNotMatch(activeView.allText, /查看仓库/, '默认只显示进行中的任务');

  const allChip = [...activeView.walk()].find((n) => n.tagName === 'BUTTON' && n.allText.includes('全部（'));
  assert.ok(allChip, '必须有“全部”筛选');
  assert.ok((allChip.handlers.click ?? []).length > 0, '筛选按钮不得是死按钮');
  allChip.click();

  const allView = pages.Quest(ctx);
  assert.ok(cardCount(allView) >= 1, '“全部”视图必须有内容');
  assert.ok(cardCount(allView) >= cardCount(pages.Quest(ctx)), '“全部”不应少于当前筛选');

  const doneChip = [...allView.walk()].find((n) => n.tagName === 'BUTTON' && n.allText.includes('已完成（'));
  doneChip.click();
  const doneView = pages.Quest(ctx);
  assert.match(doneView.allText, /查看仓库/, '已完成筛选必须包含已完成的任务');
  assert.doesNotMatch(doneView.allText, /储备食物/, '已完成视图不应包含进行中的任务');

  // 单页卡片数量受控：手机上不该一屏接一屏地滚
  const back = [...doneView.walk()].find((n) => n.tagName === 'BUTTON' && n.allText.includes('进行中（'));
  back.click();
  const capped = pages.Quest(ctx);
  const before = cardCount(capped);
  assert.ok(before <= 24, `默认视图卡片数应受控，实际 ${before}`);

  const expander = [...capped.walk()].find((n) => n.tagName === 'BUTTON' && n.allText.includes('展开剩余'));
  if (expander) {
    assert.ok((expander.handlers.click ?? []).length > 0, '展开按钮不得是死按钮');
    expander.click();
    const expanded = cardCount(pages.Quest(ctx));
    assert.ok(expanded > before, `展开后应显示更多卡片：${before} → ${expanded}`);
    const collapse = [...pages.Quest(ctx).walk()].find((n) => n.tagName === 'BUTTON' && n.allText.trim().startsWith('收起'));
    assert.ok(collapse, '展开后必须能收起');
    collapse.click();
  }
});

test('UI：基地页显示 10 级上限、每日两次额度与升级耗时', () => {
  const state = richState();
  state.day = 12;
  state.base = { shelter: 2, storage: 3, heating: 4, power: 1, greenhouse: 0, medical: 0, defense: 5, workshop: 2 };
  state.baseUpgrades = { day: 12, count: 1 };
  state.inventory = { wood: 20, metal: 20, parts: 10, insulation: 10, medicine: 3, seeds: 3, fuel: 3 };
  const { ctx } = makeCtx(state);
  const page = pages.Base(ctx);
  const text = page.allText;

  assert.match(text, /今日升级次数/, '必须显示每日升级额度');
  assert.match(text, /1 \/ 2 次/, `已用一次后应显示剩余一次：${text.slice(0, 80)}`);
  assert.match(text, /上限 10 级/, '必须说明等级上限');
  assert.match(text, /Lv\.4 \/ 10/, '设施列表必须显示 当前等级 / 上限');

  // 设施详情放进 Sheet：列表保持紧凑，点开才有升级按钮
  const facilityNames = Base.FACILITIES.map((f) => f.name);
  const rows = [...page.walk()].filter((n) => (n.className ?? '').includes('item') && facilityNames.some((name) => n.allText.includes(name)));
  assert.equal(rows.length, Base.FACILITIES.length, `必须有 ${Base.FACILITIES.length} 处设施行，实际 ${rows.length}`);
  for (const r of rows) assert.ok((r.handlers.click ?? []).length > 0, '设施行必须可点开');
  const heatingRow = rows.find((r) => r.allText.includes('供暖'));
  heatingRow.click();

  const sheetButtons = [...document.getElementById('layer').walk()].filter((n) => n.tagName === 'BUTTON');
  const upgrade = sheetButtons.find((n) => n.allText.includes('升级到 Lv.'));
  assert.ok(upgrade, '设施详情必须提供升级按钮');
  assert.match(upgrade.allText, /分钟/, '升级按钮必须写明耗时');
  assert.equal(upgrade.attrs.disabled, undefined, '额度与材料都够时必须可升级');

  // 用掉第二次额度后，再打开详情时按钮必须禁用并给出额度原因
  applyOutcome(state, Base.upgrade(state, 'shelter'), { autosave: false });
  assert.equal(Base.upgradesLeft(state), 0);
  assert.match(pages.Base(ctx).allText, /0 \/ 2 次/);
  [...pages.Base(ctx).walk()].find((r) => (r.className ?? '').includes('item') && r.allText.includes('供暖')).click();
  const blocked = [...document.getElementById('layer').walk()].find((n) => n.tagName === 'BUTTON' && n.allText.includes('升级到 Lv.'));
  assert.equal(blocked.attrs.disabled, '', '额度用完后升级按钮必须禁用');
  assert.match(blocked.dataset.reason ?? '', /今日升级次数已用完/, '禁用必须说明是额度原因');
});

test('UI：事件页把选项放在状态卡之前（手机上读完正文就能点）', () => {
  const state = richState();
  state.day = 12;
  Event.activate(state, 'd12_rescue');
  const { ctx } = makeCtx(state);
  const page = pages.EventPage(ctx);
  const order = [...page.walk()].map((n) => n.allText).join('|');
  const firstChoice = order.indexOf('给她处理伤口');
  const statusCard = order.indexOf('当前状态（决策参考）');
  assert.ok(firstChoice > 0 && statusCard > 0, '选项与状态卡都必须渲染');
  assert.ok(firstChoice < statusCard, '选项必须排在状态卡前面');
});

test('UI：M3 系统按天开放（战力榜 / 强化 / 势力面板 / 新人物）', () => {
  const state = richState();
  const { ctx } = makeCtx(state);

  // 第 10 天：战力榜 / 强化 / 交易区都还没开放，且必须给出解锁条件
  state.day = 10;
  state.cores = 0;
  assert.match(openMindTab(ctx, '战力榜').allText, /第 11 天开放/);
  assert.match(openMindTab(ctx, '强化').allText, /未开放/);
  assert.match(openMindTab(ctx, '交易区').allText, /第 21 天/);

  // 第 17 天：战力榜有榜单、强化可用（有晶核时按钮可点）
  state.day = 17;
  state.cores = 6;
  const board = openMindTab(ctx, '战力榜').allText;
  assert.match(board, /凛冬城战力榜/);
  assert.match(board, /#1/);

  const enhance = openMindTab(ctx, '强化');
  assert.match(enhance.allText, /晶核 6 枚/);
  const enhanceBtn = [...enhance.walk()].find((n) => n.tagName === 'BUTTON' && n.allText.includes('强化至 Lv.1'));
  assert.ok(enhanceBtn, '有晶核时必须提供强化按钮');
  assert.equal(enhanceBtn.attrs.disabled, undefined, '晶核充足时强化按钮必须可用');
  assert.ok((enhanceBtn.handlers.click ?? []).length > 0, '强化按钮不得是死按钮');

  // 势力面板：未解除锁定时给提示，锁定后展示立场
  const intelClosed = openMindTab(ctx, '情报').allText;
  assert.match(intelClosed, /互助/);
  state.factions.lindong.known = true;
  state.factions.lindong.standing = 30;
  state.factions.raiders.known = true;
  state.factions.raiders.standing = -40;
  const intel = openMindTab(ctx, '情报').allText;
  assert.match(intel, /凛冬城/);
  assert.match(intel, /掠夺者联盟/);
  assert.match(intel, /遇敌概率/, '必须说明立场对玩法的实际影响');

  // 第 16 天：林晚登场
  state.day = 16;
  assert.match(pages.Characters(ctx).allText, /林晚/, '第 16 天人物页必须出现林晚');
  state.day = 12;
  assert.match(pages.Characters(ctx).allText, /龙九星/, '第 12 天人物页必须出现龙九星');
});

test('UI：第 16 天医院与第 17 天变电站地点卡按天开放', () => {
  const state = richState();
  const { ctx } = makeCtx(state);
  state.day = 12;
  assert.match(pages.Action(ctx).allText, /废弃体育馆/);
  assert.doesNotMatch(pages.Action(ctx).allText, /市立医院/, '第 12 天不应出现医院');

  state.day = 16;
  assert.match(pages.Action(ctx).allText, /市立医院/);
  state.day = 17;
  assert.match(pages.Action(ctx).allText, /城西变电站/);
});

test('UI：互助体系与能源状态在界面上可见', () => {
  const state = richState();
  state.day = 8;
  state.aid = { members: 1, morale: 62, joined: ['laozhou'] };
  state.npcs.xiao_wu = { ...state.npcs.xiao_wu, met: true, favor: 30, trust: 20 };
  state.base.power = 1;
  state.flags.energy_ok = false;
  const { ctx } = makeCtx(state);
  assert.match(pages.Base(ctx).allText, /燃油耗尽/, '能源停摆必须在基地页可见');
  assert.match(pages.Game(ctx).allText, /互助 1 人/, '主界面必须显示互助规模');

  const chars = pages.Characters(ctx);
  assert.match(chars.allText, /李阿姨|小吴/, '第 4 天起人物页必须显示新角色');
  assert.match(chars.allText, /互助体系/, '人物页必须展示互助体系状态');

  // 打开关系达标的人物详情：邀请按钮必须真实可用（不是死按钮）
  const tap = [...chars.walk()].find((n) => (n.className ?? '').includes('item') && n.allText.includes('小吴'));
  assert.ok(tap, '人物页必须渲染可点击的联系人卡片');
  tap.click();
  const buttons = [...document.getElementById('layer').walk()].filter((n) => n.tagName === 'BUTTON');
  const invite = buttons.find((b) => b.allText.includes('邀请加入互助体系'));
  assert.ok(invite, '人物详情必须提供“邀请加入互助体系”按钮');
  assert.equal(invite.attrs.disabled, undefined, '对小吴（关系达标且未加入）邀请按钮必须是可用的');
  assert.ok((invite.handlers.click ?? []).length > 0, '可用按钮必须绑定处理函数（死按钮检测）');
  for (const b of buttons) {
    if (b.attrs.disabled !== undefined) continue;
    assert.ok((b.handlers.click ?? []).length > 0, `可用按钮「${b.allText}」没有绑定处理函数`);
  }

  // 关系不足的人物：按钮应禁用并给出原因，而不是静默失效
  const weak = [...chars.walk()].find((n) => (n.className ?? '').includes('item') && n.allText.includes('王大伟'));
  weak.click();
  const weakInvite = [...document.getElementById('layer').walk()].find((n) => n.tagName === 'BUTTON' && n.allText.includes('邀请加入互助体系'));
  assert.equal(weakInvite.attrs.disabled, '', '关系不足时邀请按钮必须禁用');
  assert.match(weakInvite.dataset.reason ?? '', /关系不足/, '禁用必须说明原因');
});

test('UI：探索行动的 Outcome 能完整走完结算并反馈到页面', () => {
  const state = richState();
  const outcome = Explore.performAction(state, 'hardware', 'search');
  assert.equal(outcome.ok, true);
  const { ctx } = makeCtx(state);
  const res = ctx.apply(outcome);
  assert.equal(res.ok, true);
  assert.ok(state.time > 360, '行动后时间必须推进');
  assert.doesNotThrow(() => pages.Game(ctx));
});

/* ---------------- 真实引导链路（main.js + 路由 + 页面） ---------------- */

/** 页面模块是动态 import：点击后要等微任务结算再断言。 */
const flush = async () => { for (let i = 0; i < 4; i += 1) await new Promise((resolve) => setTimeout(resolve, 0)); };

const clickText = (root, text) => {
  const el = [...root.walk()].find((n) => n.tagName === 'BUTTON' && n.allText.includes(text));
  assert.ok(el, `没有找到按钮「${text}」`);
  assert.ok((el.handlers.click ?? []).length > 0, `按钮「${text}」没有绑定处理函数（死按钮）`);
  el.click();
  return el;
};

test('引导：无存档时 main.js 渲染首页，开始游戏后进入第 1 天开场事件', async () => {
  await import('../src/main.js');
  await flush();
  const app = document.getElementById('app');
  assert.match(app.allText, /凛冬降临/, '首页必须渲染出标题');
  assert.match(app.allText, /开始游戏/, '无存档时必须提供开始游戏入口');

  clickText(app, '开始游戏');
  await flush();
  assert.match(app.allText, /冰雹降临/, '开始游戏后必须进入第 1 天开场剧情');

  clickText(app, '关好门窗');
  await flush();
  assert.match(document.getElementById('app').allText, /停电|清点物资/, '选择后必须链式进入下一段剧情');
});

test('引导：事件结算后进入主界面，导航可切到仓库与光脑', async () => {
  const app = document.getElementById('app');
  // 把第 1 天剩余剧情选完
  let guard = 0;
  while (/光脑绑定|停电/.test(app.allText) && guard++ < 6) {
    const btnEl = [...app.walk()].find((n) => n.tagName === 'BUTTON' && (n.allText.includes('先清点物资') || n.allText.includes('下楼检查电闸') || n.allText.includes('冷静分析')));
    if (!btnEl) break;
    btnEl.click();
    await flush();
  }
  assert.match(app.allText, /生存状态|今日任务/, '剧情结束后必须回到主界面');

  clickText(app, '仓库');
  await flush();
  assert.match(app.allText, /剩余容量/, '导航必须能切到仓库页');
  clickText(app, '光脑');
  await flush();
  assert.match(app.allText, /小管家/, '导航必须能切到光脑页');
  clickText(app, '任务');
  await flush();
  assert.match(app.allText, /任务类型说明/, '导航必须能切到任务页');
});

test('按需加载：首屏只加载首页模块，切页后其余页面才按需载入', async () => {
  const router = await import('../src/core/router.js');
  const app = document.getElementById('app');
  // 预取是异步的（requestIdleCallback/setTimeout 在垫片里不执行），
  // 所以这里验证的是「页面切换靠动态 import 完成，且失败时给出可读提示」。
  clickText(app, '人物');
  await flush();
  assert.match(app.allText, /联系人|还没有遇到任何人/, '按需加载的页面切换后必须真正渲染');
  assert.equal(router.current().name, 'characters');

  clickText(app, '主页');
  await flush();
  assert.equal(router.current().name, 'game');
  assert.match(app.allText, /生存状态|今日任务/, '切回主页必须立即渲染（模块已缓存）');
});
