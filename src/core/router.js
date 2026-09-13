/**
 * 哈希路由：'#/action/supermarket' → { name: 'action', param: 'supermarket' }。
 * SPA 内页面切换不刷新、不白屏（项目书 23）。
 *
 * 这里只负责「地址变了」，页面解析与渲染由 main.js 负责：
 * 它需要按需加载页面模块，所以路由层不再持有路由表。
 * @module core/router
 */

let onChange = () => {};

export function parse(hash = globalThis.location?.hash ?? '') {
  const path = hash.replace(/^#\/?/, '');
  const [name = '', ...rest] = path.split('/');
  return { name: name === '' ? 'home' : name, param: rest.join('/') || undefined };
}

export function go(path, { replace = false } = {}) {
  const next = `#/${String(path).replace(/^#?\/?/, '')}`;
  const loc = globalThis.location;
  if (!loc) return;
  if (loc.hash === next) { notify(); return; }
  if (replace) loc.replace(next); else loc.hash = next;
}

export const current = () => parse();

export function onRoute(fn) { onChange = fn; }

/** 通知一次路由变化（hashchange，以及外部显式调用）。 */
export function notify() { onChange(current()); }

export function start() {
  globalThis.window?.addEventListener?.('hashchange', notify);
  notify();   // 首屏也要走一次，避免白屏
}
