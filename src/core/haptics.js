/**
 * 震动反馈（无限方案 §九：爽感反馈）。
 *
 * iOS 上网页没有震动 API（`navigator.vibrate` 只有 Android 有），所以由 iOS 外壳
 * 注入一个 `window.webkit.messageHandlers.haptic` 桥，网页这边只负责调用。
 * 没有桥（浏览器、Android、桌面）时**静默降级**，不报错、不影响任何逻辑。
 * @module core/haptics
 */

/** 强度语义：light 用于普通点击，medium 用于决策，heavy 用于受伤/倒地。 */
const HANDLED = new Set(['light', 'medium', 'heavy', 'success', 'warning']);

export function supported() {
  return Boolean(globalThis.webkit?.messageHandlers?.haptic);
}

export function haptic(kind = 'light') {
  if (!HANDLED.has(kind)) kind = 'light';
  try {
    globalThis.webkit?.messageHandlers?.haptic?.postMessage(kind);
  } catch {
    /* 桥不存在或被系统限制：什么都不做 */
  }
}

/** 把提示/反馈的 kind 映射到震动强度（供 toast / pulse 复用）。 */
export function hapticForKind(kind) {
  switch (kind) {
    case 'bad': return 'heavy';
    case 'warn': return 'medium';
    case 'good': return 'success';
    case 'mind': return 'light';
    default: return 'light';
  }
}
