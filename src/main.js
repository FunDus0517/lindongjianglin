/**
 * 应用装配：路由、页面按需加载、状态刷新与 SPA 引导（项目书 §22、§23）。
 * 这里不包含游戏规则，只把 systems / pages / router / store 接起来。
 *
 * 手机优先：页面模块用动态 import 按需加载，首屏只下载首页那一个页面；
 * 其余页面在首屏渲染完成后空闲时预取，之后切页不会再等网络。
 * @module main
 */
import * as store from './core/store.js';
import * as audio from './core/audio.js';
import * as prefs from './core/prefs.js';
import { go, current, onRoute, start as startRouter } from './core/router.js';
import { createShell, renderChrome, renderPage, startFeedbackLoop } from './ui/shell.js';
import { sheet } from './ui/components.js';
import { h } from './core/dom.js';
import * as Save from './systems/Save.js';   // 很小，首屏要用来判断“继续游戏”

/**
 * 游戏引擎（结算、系统、剧情数据）按需加载。
 * 首页只需要外壳 + 首页模块 + 存档摘要，所以首屏不下载 46 KB 的剧情数据与 17 个系统：
 * 首屏渲染完成后空闲时再把引擎取回来，玩家点「开始游戏」时通常已经就绪。
 */
let enginePromise = null;
function loadEngine() {
  enginePromise ??= Promise.all([
    import('./core/effects.js'),
    import('./systems/Base.js'),
    import('./systems/Battle.js'),
    import('./systems/GameTime.js'),
    import('./systems/Inventory.js'),
    import('./systems/NPC.js'),
    import('./systems/Power.js'),
    import('./systems/Quest.js'),
    import('./systems/Story.js'),
  ]).then(([effects, Base, Battle, GameTime, Inventory, NPC, Power, Quest, Story]) =>
    ({ effects, Base, Battle, GameTime, Inventory, NPC, Power, Quest, Story }));
  return enginePromise;
}

/** 路由 → 页面模块的加载器（动态 import，浏览器会各自缓存）。 */
const PAGES = {
  home: () => import('./pages/Home.js').then((m) => m.Home),
  game: () => import('./pages/Game.js').then((m) => m.Game),
  action: () => import('./pages/Action.js').then((m) => m.ActionPage),
  warehouse: () => import('./pages/Warehouse.js').then((m) => m.WarehousePage),
  mind: () => import('./pages/Mind.js').then((m) => m.MindPage),
  characters: () => import('./pages/Characters.js').then((m) => m.CharactersPage),
  quest: () => import('./pages/Quest.js').then((m) => m.QuestPage),
  base: () => import('./pages/Base.js').then((m) => m.BasePage),
  settings: () => import('./pages/Settings.js').then((m) => m.SettingsPage),
  ending: () => import('./pages/Ending.js').then((m) => m.EndingPage),
  milestone: () => import('./pages/Milestone.js').then((m) => m.MilestonePage),
  event: () => import('./pages/Event.js').then((m) => m.EventPage),
  battle: () => import('./pages/Battle.js').then((m) => m.BattlePage),
};

/** 加载过的页面模块缓存：切页不再打网络。 */
const loading = new Map();
const ready = new Map();

function viewFor(name) {
  const key = PAGES[name] ? name : 'home';
  if (!loading.has(key)) {
    loading.set(key, PAGES[key]().then((view) => { ready.set(key, view); return view; }));
  }
  return loading.get(key);
}

/** 首屏之后空闲时预热：游戏引擎 + 其余页面模块，切页与开局都零等待。 */
function prefetchAll() {
  const idle = globalThis.requestIdleCallback ?? ((fn) => globalThis.setTimeout?.(fn, 300));
  idle(() => {
    loadEngine();
    for (const name of Object.keys(PAGES)) if (!loading.has(name)) viewFor(name);
  });
}

/** 需要一局游戏才能进入的页面。 */
const NEEDS_RUN = ['game', 'action', 'warehouse', 'mind', 'characters', 'quest', 'base', 'event', 'battle', 'ending', 'milestone'];

let state = null;
const shell = createShell(document.getElementById('app'));

/* ---------------- 路由与渲染 ---------------- */

function activeRoute(state) {
  if (state.ending) return 'ending';
  if (state.active?.kind === 'battle') return 'battle';
  if (state.active?.kind === 'event') return 'event';
  if (state.milestone) return 'milestone';
  return null;
}

/**
 * 渲染当前路由。
 * 已加载过的页面同步渲染（切页零延迟）；首次进入的页面先给一个「载入中」占位，
 * 模块下载完成后再替换，避免手机上白屏等网络。
 */
function render() {
  const r = current();
  let name = r.name;
  if (!PAGES[name]) name = 'home';
  if (!state && NEEDS_RUN.includes(name)) name = 'home';
  if (state) {
    const forced = activeRoute(state);
    if (forced && name !== forced) { go(forced, { replace: true }); return Promise.resolve(); }
    if (!forced && ['event', 'battle', 'ending', 'milestone'].includes(name)) { go('game', { replace: true }); return Promise.resolve(); }
  }
  renderChrome(shell, state ?? emptyState(), name, {
    onNav: (target) => {
      if (!state && NEEDS_RUN.includes(target)) { go('home'); return; }
      go(target);
    },
    onSettings: () => go(state ? 'settings' : 'home'),
  });

  const cached = ready.get(name);
  if (cached) {
    try {
      renderPage(shell, cached(ctx));
    } catch (error) {
      renderError(error);
    }
    return Promise.resolve();
  }

  renderPage(shell, loadingCard());
  return viewFor(name)
    .then((view) => {
      // 下载期间用户可能已经切走：渲染前确认路由仍是这一页
      if (current().name !== name) return;
      renderPage(shell, view(ctx));
    })
    .catch(renderError);
}

function loadingCard() {
  return h('div', { class: 'card flat center muted small' }, '载入中…');
}

function renderError(error) {
  console.error('[凛冬降临] 页面渲染失败', error);
  renderPage(shell, h('div', { class: 'card' },
    h('div', { class: 'card-title' }, '页面渲染失败'),
    h('div', { class: 'small muted', style: { marginTop: '8px' } }, String(error?.message ?? error)),
    h('div', { class: 'btn-group', style: { marginTop: '12px' } },
      h('button', { class: 'btn primary', onClick: () => go('home') }, '返回首页'))));
}

/** 首页可用但还没有存档时的占位状态。 */
function emptyState() {
  return {
    day: 1, time: 360, weather: 'normal_cold', chapterTitle: '尚未开始',
    stats: { hp: 100, warmth: 60, hunger: 80, thirst: 80, energy: 100, mind: 80 },
    fame: 0, mindLevel: 1, currency: 0, base: { storage: 0 }, inventory: {}, log: [],
  };
}

/** 结算后决定去哪一页：结局 > 战斗 > 事件 > 里程碑 > 主页。 */
function follow() {
  const forced = activeRoute(state);
  const here = current().name;
  if (forced) { if (here !== forced) go(forced); return; }
  if (['event', 'battle', 'ending', 'milestone'].includes(here)) go('game');
}

/** 人物压力到阈值时主动产生事件（项目书 §14）。 */
async function pollNpcEvents() {
  if (!state || state.ending || state.active) return;
  const { effects, NPC } = await loadEngine();
  for (const c of NPC.active(state)) {
    const id = NPC.pressureEvent(state, c.id);
    if (id && !state.queue.includes(id)) state.queue.unshift(id);
  }
  effects.advanceQueue(state);
}

/* ---------------- 页面上下文 ---------------- */

const ctx = {
  get state() { return state; },
  go,
  refresh: () => render(),

  /** 结算一个 Outcome（行动、事件选项、设施升级、加工等全部走这里）。 */
  async apply(outcome) {
    const { effects } = await loadEngine();
    const res = effects.applyOutcome(state, outcome);
    await pollNpcEvents();
    follow();
    render();
    return res;
  },

  async choose(choiceId) {
    const { effects } = await loadEngine();
    const res = effects.resolveChoice(state, choiceId);
    await pollNpcEvents();
    follow();
    render();
    return res;
  },

  async battleMove(moveId) {
    const { effects, Battle } = await loadEngine();
    const res = effects.applyOutcome(state, Battle.act(state, moveId));
    render();
    return res;
  },

  async afterBattle() {
    const { effects } = await loadEngine();
    const res = effects.afterBattle(state);
    follow();
    render();
    return res;
  },

  async sleep() {
    const { GameTime, Quest, Power } = await loadEngine();
    const res = GameTime.sleep(state);
    for (const note of res.notes ?? []) state.log.push({ day: state.day, time: state.time, text: note, kind: 'info' });
    Quest.sync(state);
    Power.refresh(state);
    Save.save(state, '休息');
    store.toast(`休息了 ${Math.round(res.minutes / 60)} 小时`, 'info');
    await pollNpcEvents();
    follow();
    render();
    return res;
  },

  async buy(itemId, price) {
    const { Inventory } = await loadEngine();
    const res = Inventory.purchase(state, itemId, price);
    return ctx.apply(res);
  },

  saveNow() {
    Save.save(state, '手动保存');
    store.toast('已保存当前进度', 'good');
    render();
  },

  async newGame() {
    const { effects, Story, Quest } = await loadEngine();
    state = Save.createState();
    Story.begin(state);
    Quest.refresh(state);
    Save.save(state, '新游戏');
    effects.advanceQueue(state);
    go('game');
    follow();
    render();
  },

  async continueGame() {
    const res = Save.load();
    if (!res.ok) {
      store.toast(res.reason, 'bad');
      offerRecovery(res.reason);
      return;
    }
    const { effects } = await loadEngine();
    state = res.state;
    store.toast(`已恢复：第 ${state.day} 天 ${state.chapterTitle}`, 'mind');
    effects.advanceQueue(state);
    go('game');
    follow();
    render();
  },

  async importSave(text) {
    const res = Save.restore(text);
    if (!res.ok) { store.toast(res.reason, 'bad'); return; }
    const { effects } = await loadEngine();
    state = res.state;
    Save.save(state, '导入存档');
    store.toast('存档导入成功', 'good');
    effects.advanceQueue(state);
    go('game');
    follow();
    render();
  },

  clearMilestone() { if (state) state.milestone = null; },
  showHelp: () => SettingsHelp(),
};

/** 存档损坏时的恢复机制：导出坏数据 / 新开一局。 */
function offerRecovery(reason) {
  const raw = globalThis.localStorage?.getItem(Save.SAVE_KEY) ?? '';
  const s = sheet({
    title: '存档无法读取',
    body: [
      h('div', { class: 'narrative small' }, `${reason}。\n\n你可以导出原始数据留作排查，或者直接开始新的一局。`),
      h('div', { class: 'btn-group' },
        h('button', {
          class: 'btn', onClick: () => {
            navigator.clipboard?.writeText(raw);
            store.toast('已复制原始存档数据', 'info');
          },
        }, '复制原始数据'),
        h('button', { class: 'btn danger', onClick: () => { Save.clear(); s.close(); ctx.newGame(); } }, '清除并重新开始')),
    ],
  });
}

function SettingsHelp() {
  sheet({
    title: '玩法帮助',
    body: [
      h('div', { class: 'narrative small' },
        '· 底部导航在主页 / 行动 / 仓库 / 光脑 / 人物之间切换，PC 端为左侧导航。\n· 任何行动都会推进时间并结算六项状态，体温低于 35 会持续掉血。\n· 22:00 之后可以休息到次日 06:00，每日 06:00 刷新天气与任务。\n· 关键选择、每日刷新与战斗结束都会自动存档，刷新页面自动恢复。'),
    ],
  });
}

/* ---------------- 引导 ---------------- */

function bootstrap() {
  // 界面偏好先于渲染生效（音效开关 / 动效开关）
  audio.setEnabled(prefs.load().sound);
  // 路由是渲染的唯一驱动：改哈希 → hashchange → render()，页面切换不刷新、不白屏。
  onRoute(() => render());

  const loaded = Save.load();
  if (loaded.ok) {
    state = loaded.state;
  } else if (Save.hasSave()) {
    store.toast(`存档损坏：${loaded.reason}`, 'bad');
  }

  startFeedbackLoop(store);
  startRouter();          // 首屏只加载外壳 + 首页模块
  prefetchAll();          // 空闲时预热引擎与其余页面

  if (state) {
    loadEngine().then(({ effects }) => {
      effects.advanceQueue(state);
      render();
      follow();
    });
  }
  // 兜底：未捕获的运行时错误不静默——变成一条可见反馈，同时留在控制台里。
  globalThis.window?.addEventListener?.('error', (e) => {
    console.error('[凛冬降临] 未捕获错误', e?.error ?? e?.message ?? e);
    store.toast(`运行时错误：${e?.message ?? '未知'}`, 'bad');
  });
  globalThis.window?.addEventListener?.('unhandledrejection', (e) => {
    console.error('[凛冬降临] 未处理的 Promise 拒绝', e?.reason);
    store.toast(`异步错误：${e?.reason?.message ?? e?.reason ?? '未知'}`, 'bad');
  });
  // 页面重绘统一由 ctx 中的显式 render() 触发；这里补一次初始渲染，避免首屏空白。
  window.addEventListener('beforeunload', () => { if (state && !state.ending) Save.save(state, '离开页面'); });
  render();
}

bootstrap();
