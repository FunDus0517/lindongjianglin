/** 极简 DOM 构造器（替代 JSX，零构建步骤）。@module core/dom */

const ATTR_ALIAS = { className: 'class', htmlFor: 'for' };

/**
 * h('div', { className: 'card', onClick: fn }, child, [child]) → HTMLElement
 * 子节点：字符串/数字变文本节点，null/false/undefined 跳过，数组展开。
 */
export function h(tag, props, ...children) {
  const el = document.createElement(tag);
  if (props) {
    for (const [k, v] of Object.entries(props)) {
      if (v === null || v === undefined || v === false) continue;
      if (k === 'dataset') { Object.assign(el.dataset, v); continue; }
      if (k === 'style' && typeof v === 'object') { Object.assign(el.style, v); continue; }
      if (k === 'class' || k === 'className') { el.className = Array.isArray(v) ? v.filter(Boolean).join(' ') : v; continue; }
      if (k === 'value') { el.value = v; continue; }
      if (k.startsWith('on') && typeof v === 'function') { el.addEventListener(k.slice(2).toLowerCase(), v); continue; }
      el.setAttribute(ATTR_ALIAS[k] ?? k, v === true ? '' : String(v));
    }
  }
  append(el, children);
  return el;
}

export function append(el, children) {
  for (const c of children.flat(4)) {
    if (c === null || c === undefined || c === false || c === true) continue;
    el.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

export function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); return el; }
export function mount(el, ...children) { clear(el); append(el, children); return el; }

/** 事件委托：容器内点击 data-act 元素时回调 (action, dataset, event)。 */
export function delegate(root, handler) {
  root.addEventListener('click', (e) => {
    const target = e.target.closest('[data-act]');
    if (target && root.contains(target)) handler(target.dataset.act, target.dataset, e);
  });
}
