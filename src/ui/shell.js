/**
 * 应用外壳（项目书 §19.2）：顶部信息条 + 底部移动导航 / PC 左侧垂直导航 + 内容区。
 * 只负责渲染，不持有游戏状态。@module ui/shell
 */
import { h, mount } from '../core/dom.js';
import { btn } from './components.js';
import * as audio from '../core/audio.js';
import { fmtClock, PHASE_LABEL, dayPhase } from '../core/util.js';
import { ambient, weather } from '../systems/Weather.js';
import { META } from '../systems/Survival.js';
import { band } from '../systems/Fame.js';
import * as Mind from '../systems/Mind.js';

/** 主导航（移动端 5 项，PC 端额外展开全部页面）。 */
export const NAV = [
  { id: 'game', label: '主页', icon: '🏠', route: 'game' },
  { id: 'action', label: '行动', icon: '🧭', route: 'action' },
  { id: 'warehouse', label: '仓库', icon: '📦', route: 'warehouse' },
  { id: 'mind', label: '光脑', icon: '💠', route: 'mind' },
  { id: 'characters', label: '人物', icon: '👥', route: 'characters' },
];
export const MORE_NAV = [
  { id: 'quest', label: '任务', icon: '📋', route: 'quest' },
  { id: 'duel', label: '对战', icon: '⚔️', route: 'duel' },
  { id: 'achievement', label: '成就', icon: '🏆', route: 'achievement' },
  { id: 'base', label: '基地', icon: '🏗️', route: 'base' },
  { id: 'settings', label: '设置', icon: '⚙️', route: 'settings' },
];

export function topbar(state, { onSettings }) {
  const w = weather(state.weather);
  const b = band(state.fame);
  return h('header', { class: 'topbar' },
    h('div', { class: 'grow', style: { minWidth: 0 } },
      h('div', { class: 'row nowrap', style: { gap: '8px' } },
        h('span', { class: 'strong' }, `第 ${state.day} 天`),
        h('span', { class: 'muted small' }, fmtClock(state.time)),
        h('span', { class: 'tag phase' }, PHASE_LABEL[dayPhase(state.time)])),
      h('div', { class: 'xs muted ellipsis' }, state.chapterTitle ?? '')),
    h('div', { class: 'center weather' },
      h('div', { class: 'strong' }, `${w.icon} ${Math.round(ambient(state))}℃`),
      h('div', { class: 'xs muted' }, w.name)),
    h('div', { class: 'row', style: { gap: '6px' } },
      h('span', { class: 'tag mind brain', title: `光脑 Lv.${state.mindLevel}｜${Mind.brain(state).name}` }, `💠 ${state.mindLevel}`),
      h('span', { class: ['tag', 'fame', b.color], title: b.desc }, `锋芒 ${state.fame}`),
      btn('', { kind: 'ghost', sm: true, icon: '⚙️', onClick: onSettings, title: '系统设置' })));
}

export function navBar(state, routeName, { mobile = true, onNav }) {
  const items = mobile ? NAV : [...NAV, ...MORE_NAV];
  if (mobile) {
    return h('nav', { class: 'bottomnav', role: 'navigation' },
      items.map((it) => h('button', {
        type: 'button',
        'aria-current': routeName === it.route ? 'page' : null,
        onClick: () => onNav(it.route),
      }, h('span', { class: 'ic' }, it.icon), h('span', { class: 'lb' }, it.label))));
  }
  return h('nav', { class: 'side', role: 'navigation' },
    items.map((it) => h('button', {
      type: 'button',
      'aria-current': routeName === it.route ? 'page' : null,
      onClick: () => onNav(it.route),
    }, h('span', { class: 'ic' }, it.icon), h('span', null, it.label))));
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
    top: h('div'),
    main: h('main', { class: 'main', id: 'main' }),
    bottom: h('div'),
    side: h('div'),
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
  mount(shell.main, h('div', { class: 'page' }, node));
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
