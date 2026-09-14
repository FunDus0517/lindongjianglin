/**
 * 应用外壳（项目书 §19.2）：顶部信息条 + 底部移动导航 / PC 左侧垂直导航 + 内容区。
 * 只负责渲染，不持有游戏状态。@module ui/shell
 */
import { h, mount } from '../core/dom.js';
import { btn } from './components.js';
import * as audio from '../core/audio.js';
import { haptic, hapticForKind } from '../core/haptics.js';
import { fmtClock, PHASE_LABEL, dayPhase } from '../core/util.js';
import { ambient, weather } from '../systems/Weather.js';
import { META } from '../systems/Survival.js';
import { band } from '../systems/Fame.js';
import { countCategory } from '../systems/Inventory.js';
import { VERSION } from '../data/build.js';
import * as Growth from '../systems/Growth.js';
import * as Mind from '../systems/Mind.js';

/** 底部主导航（UI 重做规范 §一：基地 / 探索 / 队伍 / 背包 / 光脑）。 */
export const NAV = [
  { id: 'game', label: '基地', icon: '🏗️', route: 'game' },
  { id: 'action', label: '探索', icon: '🧭', route: 'action' },
  { id: 'characters', label: '队伍', icon: '👥', route: 'characters' },
  { id: 'warehouse', label: '背包', icon: '🎒', route: 'warehouse' },
  { id: 'mind', label: '光脑', icon: '💠', route: 'mind' },
];
/** 左侧图标栏（横屏/宽屏）：低频入口。 */
export const MORE_NAV = [
  { id: 'quest', label: '任务', icon: '📋', route: 'quest' },
  { id: 'duel', label: '对战', icon: '⚔️', route: 'duel' },
  { id: 'achievement', label: '成就', icon: '🏆', route: 'achievement' },
  { id: 'base', label: '设施', icon: '🛠️', route: 'base' },
  { id: 'settings', label: '设置', icon: '⚙️', route: 'settings' },
];

/** 顶部资源栏里的资源（点一下进背包）。数值口径与仓库页一致：按分类计数。 */
const HUD_RES = [
  { icon: '🍖', label: '食物', of: (s) => countCategory(s, 'food') },
  { icon: '💧', label: '饮水', of: (s) => countCategory(s, 'water') },
  { icon: '🔥', label: '能源', of: (s) => countCategory(s, 'energy') },
  { icon: '🧱', label: '建材', of: (s) => countCategory(s, 'build') },
  { icon: '⛑️', label: '医疗', of: (s) => countCategory(s, 'medical') },
  { icon: '💰', label: '货币', of: (s) => Math.round(s.currency ?? 0) },
];

/**
 * 顶部资源栏（UI 重做规范 §一）：头像+等级+经验条 │ 资源图标×数值 │ 时间+天气+设置，
 * 副行保留原来的天数/章节/阶段/光脑/锋芒，一样都不丢。
 * 返回值是**内容数组**：外层 <header class="topbar"> 由 createShell 直接建在 .app 下，
 * 这样 .app 的栅格项就是 .topbar/.side/.main/.bottomnav 本身（多包一层 div 会让栅格全部失效）。
 */
export function topbar(state, { onSettings, onNav, onNotes, onUpdate, update } = {}) {
  const w = weather(state.weather);
  const b = band(state.fame);
  const g = Growth.view(state);
  return [
    h('div', { class: 'hud-top' },
      h('div', {
        class: 'hud-hero',
        title: `生存等级 Lv.${g.level}｜${g.title}｜${g.max ? '已满级' : `经验 ${g.xp}/${g.need}`}`,
        onClick: () => onNav?.('achievement'),
      },
      h('span', { class: 'hud-avatar' }, '🧣'),
      h('div', { class: 'grow', style: { minWidth: 0 } },
        h('div', { class: 'row nowrap', style: { gap: '6px' } },
          h('span', { class: 'strong small' }, `Lv.${g.level}`),
          h('span', { class: 'xs muted ellipsis' }, g.title)),
        h('div', { class: 'bar xp' }, h('i', { style: { width: `${Math.round(g.ratio * 100)}%` } })))),
      h('div', { class: 'hud-res', role: 'group', 'aria-label': '资源' },
        HUD_RES.map((r) => h('button', {
          type: 'button', class: 'res', title: `${r.label}：打开背包`,
          onClick: () => onNav?.('warehouse'),
        }, h('span', { class: 'ic' }, r.icon), h('span', { class: 'v' }, String(r.of(state)))))),
      h('div', { class: 'hud-clock' },
        h('div', { class: 'row nowrap', style: { gap: '6px', justifyContent: 'flex-end' } },
          h('span', { class: 'small strong' }, `第 ${state.day} 天`),
          h('span', { class: 'xs muted' }, fmtClock(state.time))),
        h('div', { class: 'row nowrap', style: { gap: '6px', justifyContent: 'flex-end' } },
          h('span', { class: 'small strong' }, `${w.icon} ${Math.round(ambient(state))}℃`),
          h('span', { class: 'xs muted ellipsis' }, w.name))),
      btn('', { kind: 'ghost', sm: true, icon: '⚙️', onClick: onSettings, title: '系统设置' })),
    h('div', { class: 'hud-sub' },
      h('span', { class: 'xs muted ellipsis grow' }, state.chapterTitle ?? ''),
      h('span', { class: 'tag phase' }, PHASE_LABEL[dayPhase(state.time)]),
      h('span', { class: 'tag mind brain', title: `光脑 Lv.${state.mindLevel}｜${Mind.brain(state).name}` }, `💠 ${state.mindLevel}`),
      h('span', { class: ['tag', 'fame', b.color], title: b.desc }, `锋芒 ${state.fame}`),
      // 版本号常驻：点它看「更新公告」；服务器发了新版时这里变成一个可点的更新按钮
      update?.hasUpdate
        ? btn(`🔔 新版本 ${update.version}`, {
          kind: 'primary', sm: true, onClick: onUpdate,
          title: `服务器已更新到 ${update.version}（构建 ${update.build}），点一下刷新到最新内容`,
        })
        : h('button', {
          type: 'button', class: 'tag ver', title: '点这里看更新公告',
          onClick: () => onNotes?.(),
        }, VERSION)),
  ];
}

/** 导航项数组（bottomnav 只放主入口；side 图标栏补上低频入口）。 */
export function navBar(state, routeName, { mobile = true, onNav } = {}) {
  const items = mobile
    ? NAV
    : [...NAV.map((it) => ({ ...it, group: 'main' })), ...MORE_NAV.map((it) => ({ ...it, group: 'more' }))];
  return items.map((it) => h('button', {
    type: 'button',
    dataset: mobile ? { nav: it.id } : { nav: it.id, group: it.group },
    'aria-current': routeName === it.route ? 'page' : null,
    onClick: () => onNav(it.route),
  }, h('span', { class: 'ic' }, it.icon), h('span', { class: mobile ? 'lb' : '' }, it.label)));
}

/** 六项状态条（主界面第一信息区）。 */
export function statGrid(state, keys = Object.keys(META)) {
  return h('div', { class: 'grid two' }, keys.map((k) => {
    const m = META[k];
    const v = Math.round(state.stats[k]);
    return h('div', { class: 'stat', title: m.hint },
      h('div', { class: 'stat-head' }, h('span', null, `${m.icon} ${m.label}`), h('span', { class: 'strong' }, v)),
      h('div', { class: 'bar ' + m.cls }, h('i', { style: { width: `${Math.max(0, Math.min(100, v))}%` } })));
  }));
}

/* ---------------- 外壳挂载与反馈渲染 ---------------- */

export function createShell(root) {
  const shell = {
    top: h('header', { class: 'topbar' }),
    side: h('nav', { class: 'side', role: 'navigation' }),
    main: h('main', { class: 'main', id: 'main' }),
    bottom: h('nav', { class: 'bottomnav', role: 'navigation' }),
  };
  mount(root, shell.top, shell.side, shell.main, shell.bottom);
  return shell;
}

/** 重绘顶栏与导航（内容区由页面自己负责）。 */
export function renderChrome(shell, state, routeName, handlers) {
  mount(shell.top, topbar(state, handlers));
  mount(shell.bottom, navBar(state, routeName, { mobile: true, onNav: handlers.onNav }));
  mount(shell.side, navBar(state, routeName, { mobile: false, onNav: handlers.onNav }));
}

/** 渲染页面内容并保持滚动位置；恢复输入焦点（搜索框不因重绘失焦）。 */
export function renderPage(shell, node) {
  const active = document.activeElement;
  const focusKey = active?.dataset?.focusKey;
  const caret = active?.selectionStart ?? null;
  const scroll = shell.main.scrollTop;
  const page = h('div', { class: 'page' }, node);
  // 一屏 HUD 的页面（class 带 hud-page）要撑满可视区、自己不许滚动（CSS 用 [data-hud="1"] 认它）
  if (String(node?.className ?? '').includes('hud-page')) page.setAttribute('data-hud', '1');
  mount(shell.main, page);
  shell.main.scrollTop = scroll;
  if (focusKey) {
    const next = shell.main.querySelector(`[data-focus-key="${focusKey}"]`);
    if (next) { next.focus(); if (caret !== null && next.setSelectionRange) { try { next.setSelectionRange(caret, caret); } catch { /* 非文本输入 */ } } }
  }
}

/** Toast 与数值浮动反馈循环（外加音效提示）。 */
export function startFeedbackLoop(store) {
  const toastBox = document.getElementById('toasts');
  const pulseBox = h('div', { class: 'pulses' });
  document.body.appendChild(pulseBox);
  startInteractionSounds();

  setInterval(() => {
    for (const t of store.drainToasts()) {
      audio.cueForKind(t.kind);
      haptic(hapticForKind(t.kind));
      const el = h('div', { class: ['toast', t.kind] }, t.text);
      toastBox.appendChild(el);
      setTimeout(() => {
        el.style.transition = 'opacity 240ms, transform 240ms';
        el.style.opacity = '0';
        el.style.transform = 'translateY(6px)';
        setTimeout(() => el.remove(), 260);
      }, 2600);
      while (toastBox.children.length > 4) toastBox.firstChild.remove();
    }
    for (const p of store.drainPulses()) {
      const el = h('div', { class: ['pulse', p.kind], style: { top: `${28 + Math.random() * 8}%`, left: `${44 + Math.random() * 12}%` } }, p.text);
      pulseBox.appendChild(el);
      setTimeout(() => el.remove(), 1000);
    }
  }, 300);
}

/** 全局交互音：一次委托监听，覆盖所有按钮与可点击卡片。 */
function startInteractionSounds() {
  document.addEventListener?.('pointerdown', (e) => {
    const target = e.target?.closest?.('button:not([disabled]), .chip, .item, .card.tap');
    if (target) audio.cue('click');
  }, { passive: true });
}
