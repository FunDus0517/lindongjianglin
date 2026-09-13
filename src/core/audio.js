/**
 * 音效（项目书 §24 M5）。不引入任何音频素材：用 WebAudio 现场合成极短的提示音，
 * 体积为零、可离线、可关。
 *
 * 三条约束：
 * 1. 没有 AudioContext 的环境（Node 测试、老浏览器）必须安全返回 false，绝不抛异常；
 * 2. 浏览器要求用户手势之后才能出声，所以 AudioContext 在第一次真正播放时才创建；
 * 3. 默认音量很低（0.02—0.06），提示音服务于反馈，不抢戏。
 * @module core/audio
 */

let enabled = true;
let ctx = null;

export function setEnabled(value) { enabled = Boolean(value); }
export const isEnabled = () => enabled;

/** 每种提示音的合成参数：起始频率、终止频率、时长、波形、音量。 */
export const CUES = {
  click:  { from: 660, to: 660, dur: 0.045, type: 'triangle', gain: 0.02 },
  choose: { from: 520, to: 780, dur: 0.10, type: 'triangle', gain: 0.03 },
  reward: { from: 620, to: 1080, dur: 0.22, type: 'sine', gain: 0.045 },
  danger: { from: 220, to: 130, dur: 0.26, type: 'sawtooth', gain: 0.035 },
  mind:   { from: 880, to: 1320, dur: 0.14, type: 'sine', gain: 0.03 },
  ending: { from: 300, to: 900, dur: 0.9, type: 'sine', gain: 0.05 },
};

/** 按名字播放一次提示音；返回是否真的出声。 */
export function cue(name) {
  if (!enabled) return false;
  const spec = CUES[name];
  if (!spec) return false;
  const AC = globalThis.AudioContext ?? globalThis.webkitAudioContext;
  if (typeof AC !== 'function') return false;
  try {
    ctx = ctx ?? new AC();
    if (ctx.state === 'suspended' && typeof ctx.resume === 'function') ctx.resume();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = spec.type;
    osc.frequency.setValueAtTime(spec.from, now);
    if (spec.to !== spec.from) osc.frequency.exponentialRampToValueAtTime(spec.to, now + spec.dur);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(spec.gain, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + spec.dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + spec.dur + 0.02);
    return true;
  } catch {
    return false;
  }
}

/** 把反馈类型映射成提示音（供反馈循环调用）。 */
export function cueForKind(kind) {
  if (kind === 'good') return cue('reward');
  if (kind === 'bad') return cue('danger');
  if (kind === 'mind') return cue('mind');
  if (kind === 'warn') return cue('choose');
  return cue('click');
}

/** 测试与调试用：重置内部状态。 */
export function reset() { ctx = null; enabled = true; }
