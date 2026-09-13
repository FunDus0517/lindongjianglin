/**
 * 测试用最小 DOM 垫片（共享）。
 * 仅在 Node 下提供 createElement / appendChild / 事件登记等页面渲染所需能力，
 * 不实现布局与样式——它验证的是「渲染出来的文本与结构」，不是像素。
 * @module tests/_dom
 */

class ClassList {
  constructor(el) { this.el = el; }
  get set() { return new Set(String(this.el.className || '').split(/\s+/).filter(Boolean)); }
  add(...c) { this.el.className = [...this.set, ...c.flat()].join(' '); }
  remove(...c) { const s = this.set; for (const x of c.flat()) s.delete(x); this.el.className = [...s].join(' '); }
  contains(c) { return this.set.has(c); }
  toggle(c, on) { if (on) this.add(c); else this.remove(c); }
}

class TextNode {
  constructor(t) { this.text = String(t); }
  get textContent() { return this.text; }
}

export class El {
  constructor(tag) {
    this.tagName = String(tag).toUpperCase();
    this.children = [];
    this.dataset = {};
    this.style = {};
    this.attrs = {};
    this.handlers = {};
    this.className = '';
    this.value = '';
    this.parentNode = null;
    this.classList = new ClassList(this);
  }
  appendChild(n) { n.parentNode = this; this.children.push(n); return n; }
  removeChild(n) { this.children = this.children.filter((c) => c !== n); n.parentNode = null; return n; }
  remove() { this.parentNode?.removeChild(this); }
  get firstChild() { return this.children[0] ?? null; }
  setAttribute(k, v) { this.attrs[k] = String(v); if (k === 'class') this.className = String(v); }
  getAttribute(k) { return this.attrs[k] ?? null; }
  addEventListener(t, f) { (this.handlers[t] ??= []).push(f); }
  removeEventListener(t, f) { this.handlers[t] = (this.handlers[t] ?? []).filter((x) => x !== f); }
  click() { for (const f of this.handlers.click ?? []) f({ stopPropagation() {}, target: this }); }
  focus() { globalThis.document.activeElement = this; }
  contains(n) { return n === this || this.children.some((c) => c.contains?.(n)); }
  closest(sel) { const cls = sel.replace(/^\./, ''); let n = this; while (n) { if (n.classList?.contains(cls)) return n; n = n.parentNode; } return null; }
  querySelector(sel) {
    const m = /^\[data-focus-key="(.+)"\]$/.exec(sel);
    for (const c of this.walk()) if (m && c.dataset?.focusKey === m[1]) return c;
    return null;
  }
  * walk() { for (const c of this.children) { yield c; if (typeof c.walk === 'function') yield* c.walk(); } }
  get textContent() { return this.children.map((c) => c.textContent ?? '').join(''); }
  get allText() { return [this.textContent, ...this.children.map((c) => c.allText ?? '')].join(' '); }
}

/** 安装全局 DOM 垫片；返回句柄，方便测试直接拿 document / El。 */
export function installDom() {
  const roots = new Map();
  const winListeners = {};
  const doc = {
    createElement: (tag) => new El(tag),
    createTextNode: (t) => new TextNode(t),
    getElementById: (id) => roots.get(id) ?? (roots.set(id, new El('div')), roots.get(id)),
    body: new El('body'),
    documentElement: new El('html'),
    activeElement: null,
    addEventListener() {},
    removeEventListener() {},
  };
  globalThis.Node = El;
  globalThis.document = doc;
  globalThis.window = { addEventListener: (t, f) => { (winListeners[t] ??= []).push(f); }, location: null };
  globalThis.location = {
    _hash: '',
    get hash() { return this._hash; },
    set hash(v) { this._hash = v; for (const fn of winListeners.hashchange ?? []) fn(); },
    replace(v) { this.hash = v; },
  };
  globalThis.window.location = globalThis.location;
  globalThis.localStorage = undefined;
  globalThis.setInterval = () => 0;   // 反馈循环不在测试里跑
  // setTimeout 保留真实实现：页面按需加载（动态 import）需要真正的事件循环推进
  return { document: doc, El, roots };
}

/** 渲染结果的文本里不允许出现的坏味道。 */
export const BROKEN_PATTERNS = [
  { re: /undefined/, label: 'undefined' },
  { re: /NaN/, label: 'NaN' },
  { re: /\[object Object\]/, label: '[object Object]' },
  { re: /\bnull\b/, label: 'null' },
];

/** 检查一棵渲染树：文本与按钮标签都必须干净且非空。 */
export function findBroken(node, where) {
  const problems = [];
  const text = node.allText ?? '';
  for (const { re, label } of BROKEN_PATTERNS) {
    if (re.test(text)) {
      const m = re.exec(text);
      const at = Math.max(0, (m?.index ?? 0) - 30);
      problems.push(`${where}：文本出现 ${label} → …${text.slice(at, at + 70)}…`);
      break;
    }
  }
  for (const el of node.walk()) {
    if (el.tagName !== 'BUTTON') continue;
    const label = String(el.allText ?? '').trim();
    if (label.length === 0) problems.push(`${where}：存在空标签按钮`);
  }
  return problems;
}
