/**
 * 全界面内容审查：把每一个页面、每一个弹层、每一条事件都渲染一遍，
 * 断言渲染结果里不出现 undefined / NaN / [object Object] / 空按钮。
 *
 * 这层测试专门对付「结构对、文案坏」的 bug —— 例如地点详情里的
 * `undefined | 约 NaN小时NaN分`：按钮确实存在、确实绑定了处理函数，
 * 但标签是坏的，只有内容审查能发现。
 * 运行：node --test tests/
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installDom, El, findBroken } from './_dom.mjs';

installDom();

const Save = await import('../src/systems/Save.js');
const Story = await import('../src/systems/Story.js');
const Quest = await import('../src/systems/Quest.js');
const Event = await import('../src/systems/Event.js');
const Battle = await import('../src/systems/Battle.js');
const Market = await import('../src/systems/Market.js');
const { applyOutcome } = await import('../src/core/effects.js');

const { EVENTS } = await import('../src/data/events.js');
const { LOCATIONS, ACTIONS } = await import('../src/data/locations.js');
const { ITEMS } = await import('../src/data/items.js');
const { ENEMIES } = await import('../src/data/battle.js');
const { CHARACTERS } = await import('../src/data/characters.js');
const { ENDINGS } = await import('../src/data/endings.js');
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
  Event: (await import('../src/pages/Event.js')).EventPage,
  Battle: (await import('../src/pages/Battle.js')).BattlePage,
};

const layerEl = () => document.getElementById('layer');

function ctxFor(state) {
  return {
    get state() { return state; },
    go() {}, refresh() {}, saveNow() {}, newGame() {}, continueGame() {}, importSave() {},
    clearMilestone() {}, showHelp() {}, sleep() {}, battleMove() {}, afterBattle() {}, choose() {},
    apply: (outcome) => applyOutcome(state, outcome, { autosave: false }),
  };
}

/** 造一个可用的存档状态；level 越大越“通关”。 */
function stateAt(day, level = 'normal', seed = 4242) {
  const s = Save.createState(seed);
  Story.begin(s);
  for (let d = 1; d <= day; d++) { s.day = d; Quest.refresh(s); }
  s.day = day;
  s.baseUpgrades = { day, count: level === 'empty' ? Base.DAILY_UPGRADE_LIMIT : 0 };
  if (level === 'empty') {
    s.inventory = {};
    s.currency = 0;
    s.cores = 0;
    s.stats = { hp: 6, warmth: 12, hunger: 3, thirst: 2, energy: 8, mind: 9 };
    s.aid = { members: 0, morale: 0, joined: [] };
    s.allies = 0;
    return s;
  }
  if (level === 'rich' || day >= 30) {
    s.base = { shelter: 6, storage: 6, heating: 6, power: 4, greenhouse: 4, medical: 4, defense: 6, workshop: 4 };
    s.enhance = { person: 2, weapon: 2, gear: 1, facility: 1, greenhouse: 1 };
    s.inventory = {
      canned: 8, bottled_water: 8, compressed: 4, produce: 4, purified: 6,
      charcoal: 5, firewood: 5, battery: 3, fuel: 4,
      wood: 10, metal: 10, parts: 6, insulation: 6,
      bandage: 4, medicine: 3, frostbite_salve: 2,
      pipe: 1, knife: 1, ammo: 5, seeds: 3, fertilizer: 2, blueprint: 1, down_jacket: 1, snow_boots: 1,
    };
    s.worn = ['knife', 'down_jacket', 'snow_boots'];
    s.currency = 500;
    s.cores = 12;
    s.fame = 55;
    s.mindLevel = 4;
    s.allies = 1;
    s.aid = { members: 6, morale: 60, joined: ['xiao_wu', 'laozhou', 'li_ayi'] };
    for (const id of Object.keys(s.npcs)) { s.npcs[id].met = true; s.npcs[id].favor = 40; s.npcs[id].trust = 30; }
    for (const id of Object.keys(s.factions)) { s.factions[id].known = true; s.factions[id].standing = 30; }
  }
  return s;
}

test('全界面审查：四个阶段的所有页面都不含 undefined / NaN / 空按钮', () => {
  const problems = [];
  for (const [day, level] of [[1, 'fresh'], [10, 'normal'], [20, 'normal'], [30, 'rich'], [15, 'empty']]) {
    const state = stateAt(day, level);
    const ctx = ctxFor(state);
    for (const [name, view] of Object.entries(pages)) {
      let node;
      try {
        node = view(ctx);
      } catch (error) {
        problems.push(`第 ${day} 天（${level}）${name} 渲染抛异常：${error.message}`);
        continue;
      }
      problems.push(...findBroken(node, `第 ${day} 天（${level}）${name}`));
    }
    // 光脑六个页签
    for (const tab of ['小管家', '情报', '强化', '战力榜', '交易区', '系统']) {
      const page = pages.Mind(ctx);
      const button = [...page.walk()].find((n) => n.tagName === 'BUTTON' && n.allText.includes(tab));
      if (!button) { problems.push(`第 ${day} 天光脑页缺少页签「${tab}」`); continue; }
      button.click();
      problems.push(...findBroken(pages.Mind(ctx), `第 ${day} 天（${level}）光脑·${tab}`));
    }
  }
  assert.deepEqual(problems, [], `\n${problems.join('\n')}`);
});

test('全界面审查：每个地点详情、物品详情、人物详情、设施详情的文案都完整', () => {
  const state = stateAt(30, 'rich');
  const ctx = ctxFor(state);
  const problems = [];

  // 每个地点的详情 Sheet：行动名、耗时、收益都必须真实
  ctx.state.day = 200;   // 第二阶段以后开放的新区域也要一起审（调到较晚的一天）
  for (const loc of Object.values(LOCATIONS)) {
    const page = pages.Action(ctx);
    const row = [...page.walk()].find((n) => (n.className ?? '').includes('item') && n.allText.includes(loc.name));
    if (!row) { problems.push(`行动页找不到地点行：${loc.name}`); continue; }
    row.click();
    const sheet = layerEl();
    problems.push(...findBroken(sheet, `地点详情·${loc.name}`));
    for (const actionId of Object.keys(loc.actions)) {
      const label = ACTIONS[actionId].label;
      if (!sheet.allText.includes(label)) problems.push(`地点详情·${loc.name} 缺少行动「${label}」`);
    }
    if (/约 0分|约 NaN/.test(sheet.allText)) problems.push(`地点详情·${loc.name} 的耗时显示异常`);
  }

  // 每个物品详情
  for (const id of Object.keys(ITEMS)) {
    const page = pages.Warehouse(ctx);
    const row = [...page.walk()].find((n) => (n.className ?? '').includes('item') && n.allText.includes(ITEMS[id].name));
    if (!row) continue;   // 没有库存的物品不出现，属正常
    row.click();
    problems.push(...findBroken(layerEl(), `物品详情·${ITEMS[id].name}`));
  }

  // 每个人物详情
  for (const c of Object.values(CHARACTERS)) {
    const page = pages.Characters(ctx);
    const row = [...page.walk()].find((n) => (n.className ?? '').includes('item') && n.allText.includes(c.name));
    if (!row) continue;
    row.click();
    problems.push(...findBroken(layerEl(), `人物详情·${c.name}`));
  }

  // 每处设施详情
  for (const f of Base.FACILITIES) {
    const page = pages.Base(ctx);
    const row = [...page.walk()].find((n) => (n.className ?? '').includes('item') && n.allText.includes(f.name));
    if (!row) { problems.push(`基地页找不到设施行：${f.name}`); continue; }
    row.click();
    const sheet = layerEl();
    problems.push(...findBroken(sheet, `设施详情·${f.name}`));
    if (!/分钟/.test(sheet.allText)) problems.push(`设施详情·${f.name} 没有显示耗时`);
  }

  assert.deepEqual(problems, [], `\n${problems.join('\n')}`);
});

test('全界面审查：每一条事件的正文、选项与不可选原因都能正常渲染', () => {
  const problems = [];
  for (const id of Object.keys(EVENTS)) {
    const state = stateAt(30, 'rich');
    state.day = EVENTS[id].day ?? 20;
    if (EVENTS[id].location) state.location = EVENTS[id].location;
    const ctx = ctxFor(state);
    Event.activate(state, id);
    const node = pages.Event(ctx);
    problems.push(...findBroken(node, `事件·${id}`));

    const view = Event.current(state);
    if (!view) { problems.push(`事件·${id} 无法渲染（activate 失败）`); continue; }
    for (const c of view.choices) {
      if (!c.label || /undefined|NaN/.test(c.label)) problems.push(`事件·${id} 选项标签异常：${c.label}`);
      if (!c.enabled && (!c.reason || /undefined|NaN/.test(c.reason))) problems.push(`事件·${id} 禁用选项缺少原因：${c.label}`);
    }
  }
  assert.deepEqual(problems, [], `\n${problems.join('\n')}`);
});

test('全界面审查：每个敌人、每个结局、每个里程碑、每个商品都能正常渲染', () => {
  const problems = [];

  for (const enemyId of Object.keys(ENEMIES)) {
    const state = stateAt(20, 'rich');
    Battle.start(state, enemyId);
    problems.push(...findBroken(pages.Battle(ctxFor(state)), `战斗·${enemyId}`));
  }

  for (const endingId of Object.keys(ENDINGS)) {
    const state = stateAt(30, 'rich');
    state.ending = {
      id: endingId, day: 31, title: ENDINGS[endingId].title, kind: ENDINGS[endingId].kind,
      stats: { 存活天数: 31, 战力榜排名: '#2', 互助体系: '6 人｜士气 60', 凛冬城立场: 30 },
      at: { day: 31, time: 360 },
    };
    problems.push(...findBroken(pages.Ending(ctxFor(state)), `结局·${endingId}`));
  }

  for (const milestone of ['M1', 'M2', 'M3', 'M4']) {
    const state = stateAt(30, 'rich');
    state.milestone = milestone;
    problems.push(...findBroken(pages.Milestone(ctxFor(state)), `里程碑·${milestone}`));
  }

  const marketState = stateAt(25, 'rich');
  Market.refresh(marketState);
  const ctx = ctxFor(marketState);
  const page = pages.Mind(ctx);
  [...page.walk()].find((n) => n.tagName === 'BUTTON' && n.allText.includes('交易区')).click();
  problems.push(...findBroken(pages.Mind(ctx), '光脑·交易区'));

  assert.deepEqual(problems, [], `\n${problems.join('\n')}`);
});

test('全界面审查：新游戏引导链路上的每一屏都没有坏文案', () => {
  const state = stateAt(1, 'fresh');
  const ctx = ctxFor(state);
  const problems = [];
  const seenScreens = new Set();

  // 首页 → 逐段推进第 1 天剧情
  problems.push(...findBroken(pages.Home(ctx), '首页（新游戏）'));
  Story.begin(state);
  let guard = 0;
  while (guard++ < 20) {
    if (!state.active) {
      const next = Event.advanceStory(state);   // 没有待处理事件时才从队列取下一段
      if (!next) break;
    }
    const id = state.active.id;
    seenScreens.add(id);
    problems.push(...findBroken(pages.Event(ctx), `开场剧情·${id}`));
    const usable = Event.choicesOf(state, EVENTS[id]).filter((c) => c.enabled);
    if (usable.length === 0) { problems.push(`开场剧情·${id} 没有可用选项`); break; }
    const chosen = Event.choose(state, id, usable[0].id);
    state.active = null;
    applyOutcome(state, chosen.outcome, { autosave: false });
    if (state.battle && !state.battle.over) {
      problems.push(...findBroken(pages.Battle(ctx), `开场战斗·${state.battle.enemyId}`));
      let rounds = 0;
      while (state.battle && !state.battle.over && rounds++ < 40) {
        const out = Battle.act(state, 'attack');
        applyOutcome(state, out, { autosave: false });
      }
      state.battle = null;
      state.active = null;
    }
  }
  assert.ok(seenScreens.size >= 3, `引导链路至少应经过 3 屏剧情，实际 ${seenScreens.size}`);
  problems.push(...findBroken(pages.Game(ctx), '主界面（引导后）'));
  assert.deepEqual(problems, [], `\n${problems.join('\n')}`);
});
