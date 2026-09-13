/**
 * 界面偏好（项目书 §24 M5：动效与整体打磨）。
 * 只保存「显示 / 声音」这类界面偏好，与游戏存档分开：换一局不该重置你的静音设置。
 * 偏好写在 <html> 的 data 属性上，CSS 直接用属性选择器响应。
 * @module core/prefs
 */

export const PREFS_KEY = 'winterfall.prefs.v1';

const DEFAULTS = { sound: true, motion: true };
let current = { ...DEFAULTS };

const storage = () => (typeof localStorage === 'undefined' ? null : localStorage);

/** 读取偏好并立即应用到文档；无 DOM / 无 localStorage 的环境（如测试）也安全。 */
export function load() {
  try {
    const raw = storage()?.getItem(PREFS_KEY);
    if (raw) current = { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    current = { ...DEFAULTS };
  }
  apply();
  return { ...current };
}

export const get = () => ({ ...current });

export function set(key, value) {
  if (!(key in DEFAULTS)) return { ...current };
  current = { ...current, [key]: Boolean(value) };
  persist();
  apply();
  return { ...current };
}

export const toggle = (key) => set(key, !current[key]);

function persist() {
  try { storage()?.setItem(PREFS_KEY, JSON.stringify(current)); } catch { /* 隐私模式下忽略 */ }
}

/** 把偏好写进 <html data-sound data-motion>，由 CSS 决定是否播放动效。 */
export function apply() {
  const root = globalThis.document?.documentElement;
  if (!root?.dataset) return;
  root.dataset.sound = current.sound ? 'on' : 'off';
  root.dataset.motion = current.motion ? 'full' : 'reduced';
}

export const DEFAULTS_KEYS = Object.keys(DEFAULTS);
