/**
 * UI 组件库（项目书 §19、§22 /components）：Button、Card、Modal、BottomSheet、
 * Progress、Tabs、Toast、Tooltip。只做展示与交互，不含任何游戏规则。
 * @module ui/components
 */
import { h, mount } from '../core/dom.js';

/* ---------------- Button ---------------- */
export function btn(label, { kind = '', icon, onClick, disabled = false, reason = null, block = false, sm = false, title = null } = {}) {
  const el = h('button', {
    type: 'button',
    class: ['btn', kind, block ? 'block' : '', sm ? 'sm' : ''],
    disabled: disabled || undefined,
    'aria-disabled': disabled ? 'true' : undefined,
    title: reason ?? title ?? undefined,
    onClick: disabled ? null : (e) => { e.stopPropagation(); onClick?.(e); },
  }, icon ? h('span', { class: 'ic' }, icon) : null, h('span', null, label));
  if (disabled && reason) el.dataset.reason = reason;
  return el;
}

/* ---------------- Card ---------------- */
export function card(children, { cls = '', onTap = null, data = null } = {}) {
  const props = { class: ['card', cls, onTap ? 'tap' : ''] };
  if (data) props.dataset = data;
  if (onTap) props.onClick = onTap;
  return h('div', props, children);
}

export function sectionTitle(text, right = null) {
  return h('div', { class: 'row between', style: { margin: '4px 0 8px' } },
    h('div', { class: 'strong' }, text),
    right);
}

/* ---------------- Progress / StatBar ---------------- */
export function progress(value, max = 100, { cls = '', showText = false, label = '' } = {}) {
  const ratio = max <= 0 ? 0 : Math.max(0, Math.min(1, value / max));
  return h('div', { class: 'stat' },
    showText || label
      ? h('div', { class: 'stat-head' }, h('span', null, label), h('span', { class: 'strong' }, `${Math.round(value)} / ${max}`))
      : null,
    h('div', { class: 'bar ' + cls, role: 'progressbar', 'aria-valuenow': Math.round(value), 'aria-valuemin': 0, 'aria-valuemax': max },
      h('i', { style: { width: `${ratio * 100}%` } })));
}

export function statBar(meta, value) {
  return h('div', { class: 'stat', title: meta.hint },
    h('div', { class: 'stat-head' },
      h('span', null, `${meta.icon} ${meta.label}`),
      h('span', { class: 'strong' }, Math.round(value))),
    h('div', { class: 'bar ' + meta.cls }, h('i', { style: { width: `${Math.max(0, Math.min(100, value))}%` } })));
}

/* ---------------- Tabs ---------------- */
export function tabs(items, activeId, onSelect) {
  return h('div', { class: 'tabs', role: 'tablist' },
    items.map((it) => h('button', {
      type: 'button', role: 'tab',
      'aria-selected': it.id === activeId ? 'true' : 'false',
      onClick: () => onSelect(it.id),
    }, `${it.icon ? `${it.icon} ` : ''}${it.label}`)));
}

/* ---------------- 弹层：BottomSheet / Modal ---------------- */
const layer = () => document.getElementById('layer');

/** 打开弹层时把焦点交给第一个可操作元素；Esc 关闭并把焦点还给原来的元素。 */
function focusFirst(node) {
  const target = node.querySelector?.('button:not([disabled]), input, textarea');
  target?.focus?.();
}

function layerLifecycle(onClose) {
  const previous = globalThis.document?.activeElement ?? null;
  const el = layer();
  el.className = 'layer on';
  const close = () => {
    mount(el);
    el.className = 'layer';
    globalThis.document?.removeEventListener?.('keydown', onKey);
    previous?.focus?.();
    onClose?.();
  };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  globalThis.document?.addEventListener?.('keydown', onKey);
  return { close, el };
}

export function sheet({ title, body, actions = [], onClose = null }) {
  const { close, el } = layerLifecycle(onClose);
  const node = h('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true', onClick: (e) => e.stopPropagation() },
    title ? h('div', { class: 'sheet-title' }, title) : null,
    h('div', { class: 'col' }, body),
    actions.length ? h('div', { class: 'btn-group', style: { marginTop: '16px' } }, actions) : null);
  mount(el, h('div', { class: 'scrim', onClick: close }), node);
  focusFirst(node);
  return { close, node };
}

export function modal({ title, body, actions = [] }) {
  const { close, el } = layerLifecycle(null);
  const node = h('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true', onClick: (e) => e.stopPropagation() },
    h('div', { class: 'row between' },
      title ? h('div', { class: 'modal-title' }, title) : h('span'),
      btn('关闭', { kind: 'ghost', sm: true, onClick: close })),
    h('div', { class: 'col' }, body),
    actions.length ? h('div', { class: 'btn-group', style: { marginTop: '16px' } }, actions) : null);
  mount(el, h('div', { class: 'scrim', onClick: close }), node);
  focusFirst(node);
  return { close, node };
}

/** 危险操作必须二次确认（项目书 §19.3）。 */
export function confirmDanger({ title, text, confirmLabel = '确认', onConfirm }) {
  const s = sheet({
    title,
    body: [h('div', { class: 'narrative' }, text)],
    actions: [],
  });
  mount(s.node,
    h('div', { class: 'sheet-title' }, title),
    h('div', { class: 'narrative' }, text),
    h('div', { class: 'btn-group', style: { marginTop: '16px' } },
      btn('取消', { kind: 'ghost', onClick: () => s.close() }),
      btn(confirmLabel, { kind: 'danger', onClick: () => { s.close(); onConfirm(); } })));
  return s;
}

/* ---------------- 其它 ---------------- */
export function tag(text, kind = '') { return h('span', { class: ['tag', kind] }, text); }
export function tip(text) { return h('span', { class: 'xs muted', title: text }, text); }
export function empty(text) { return h('div', { class: 'card flat center muted small' }, text); }
export function divider() { return h('div', { class: 'divider' }); }

export function row(children, { between = false, wrap = false, cls = '' } = {}) {
  return h('div', { class: ['row', between ? 'between' : '', wrap ? 'wrap' : '', cls] }, children);
}

/** 事件/日志条目。 */
export function logItem(entry) {
  return h('div', { class: 'log-item' },
    h('span', { class: 't' }, `D${entry.day} ${String(Math.floor(entry.time / 60)).padStart(2, '0')}:${String(entry.time % 60).padStart(2, '0')}`),
    entry.text);
}

/** 带数量与详情的仓库条目。 */
export function itemRow(def, qty, onClick) {
  return h('div', { class: 'item', onClick, role: 'button', tabindex: '0' },
    h('span', { class: 'grow' },
      h('div', { class: 'strong' }, def.name),
      h('div', { class: 'xs muted ellipsis' }, def.desc ?? '')),
    h('span', { class: 'qty' }, `×${qty}`));
}

export { h, mount };
