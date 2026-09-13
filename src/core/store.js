/**
 * 状态容器：唯一事实来源 + 订阅通知 + 反馈队列（Toast / 数值浮动）。
 * 不含任何游戏规则，规则在 /systems。
 *
 * 设计：toast/pulse 只入队，不触发页面重绘 —— 页面重绘由交互方显式调用 refresh()，
 * 因此数值反馈不会打断输入焦点或滚动位置。@module core/store
 */

let state = null;
const listeners = new Set();
const toasts = [];
const pulses = [];
let uid = 0;

export function get() { return state; }
export function set(next) { state = next; notify(); }
export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
export function notify() { for (const fn of [...listeners]) fn(state); }

/** 就地修改状态并通知订阅者。 */
export function mutate(fn) { fn(state); notify(); return state; }

/** 推送一条 Toast 反馈（'good' | 'bad' | 'warn' | 'mind' | 'info'）。 */
export function toast(text, kind = 'info') { toasts.push({ text, kind, id: ++uid }); }
/** 推送一次数值浮动反馈。 */
export function pulse(text, kind = 'info') { pulses.push({ text, kind, id: ++uid }); }

export function drainToasts() { return toasts.splice(0, toasts.length); }
export function drainPulses() { return pulses.splice(0, pulses.length); }
