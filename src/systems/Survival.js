/**
 * 六项核心状态（项目书 §5.1）：生命 / 体温 / 饥饿 / 饮水 / 精力 / 精神。
 * 结算按 30 分钟切片推进，保证任何时间消耗都会即时反映到状态。
 * @module systems/Survival
 */
import { clamp, round1 } from '../core/util.js';
import { ambient } from './Weather.js';

export const KEYS = ['hp', 'warmth', 'hunger', 'thirst', 'energy', 'mind'];

export const META = {
  hp:     { key: 'hp', label: '生命', icon: '❤️', cls: 'hp', hint: '归零则死亡' },
  warmth: { key: 'warmth', label: '体温', icon: '🌡️', cls: 'warm', hint: '低于 35 会持续掉血' },
  hunger: { key: 'hunger', label: '饥饿', icon: '🍖', cls: 'hunger', hint: '影响生命恢复与行动效率' },
  thirst: { key: 'thirst', label: '饮水', icon: '💧', cls: 'thirst', hint: '缺水会快速降低行动能力' },
  energy: { key: 'energy', label: '精力', icon: '⚡', cls: 'energy', hint: '决定每日可执行行动数量' },
  mind:   { key: 'mind', label: '精神', icon: '🧠', cls: 'mind', hint: '影响部分选择与事件触发' },
};

export const WARMTH_SAFE = 35;
export const SLICE = 30;

/** 室内体感：固定 +8℃ 建筑缓冲 + 保温加成（供暖与住所累计的℃）；室外由穿戴装备抵消寒风。 */
export function effectiveTemp(state, indoor = true, indoorBonus = 0, gear = 0) {
  const out = ambient(state);
  if (!indoor) return out + gear * 2;
  return out + 8 + indoorBonus;
}

/** 体温趋向的舒适值：体感越冷，能维持的体温越低。 */
export const comfortWarmth = (effTemp) => clamp(55 + (effTemp + 15) * 2.0, 5, 100);

/**
 * 推进 minutes 分钟的生存结算。
 * @param opts.indoor 是否在室内；opts.indoorBonus 室内保温（℃）；opts.gear 室外御寒层数
 * @param opts.sleeping 睡眠中（代谢下降）；opts.activity 强度系数
 */
export function tick(state, minutes, opts = {}) {
  const { indoor = true, indoorBonus = 0, gear = 0, sleeping = false, activity = 1, brainMindMod = 1 } = opts;
  const slices = minutes / SLICE;
  const meta = sleeping ? 0.55 : 1;
  const eff = effectiveTemp(state, indoor, indoorBonus, gear);
  const comfort = comfortWarmth(eff);
  const s = state.stats;

  for (let i = 0; i < slices; i++) {
    // 体温向舒适值漂移
    const drift = (comfort - s.warmth) * 0.16;
    s.warmth += drift + (indoor ? 0 : -0.4);

    s.hunger -= 1.6 * meta * activity;
    s.thirst -= 2.0 * meta * activity;
    s.energy -= (sleeping ? -4.5 : 1.4 * activity);
    s.mind -= (sleeping ? 0.12 : 0.25) * brainMindMod;
    // 吃饱、喝足、暖和的时候，精神状态会缓慢回稳
    if (!sleeping && s.warmth > 55 && s.hunger > 40 && s.thirst > 40 && s.mind < 100) s.mind += 0.12;

    // 体温过低 / 饥饿 / 缺水的伤害
    const cold = clamp((WARMTH_SAFE - s.warmth) / WARMTH_SAFE, 0, 1);
    if (cold > 0) s.hp -= 3.0 * cold;
    if (s.hunger <= 0) s.hp -= 1.2;
    if (s.thirst <= 0) s.hp -= 1.6;

    // 状态良好时缓慢恢复
    if (s.hunger > 40 && s.thirst > 40 && s.warmth > 45 && s.hp < 100) s.hp += 0.5;

    for (const k of KEYS) s[k] = clamp(s[k], 0, 100);
  }

  for (const k of KEYS) s[k] = round1(s[k]);
  return { effectiveTemp: Math.round(eff), comfort: Math.round(comfort) };
}

/** 死亡判定：返回结局 id 或 null。 */
export function checkDeath(state) {
  if (state.stats.hp <= 0) return 'ice';
  if (state.stats.hunger <= 0 && state.stats.hp <= 5) return 'starve';
  return null;
}

/** 夜间休息：按睡眠代谢推进到目标时间。 */
export function rest(state, minutes, opts = {}) {
  return tick(state, minutes, { ...opts, sleeping: true, activity: 0.4 });
}

/** 生命/体温/精神的定性描述，用于主界面提示。 */
export function condition(state) {
  const s = state.stats;
  if (s.hp < 25) return { text: '重伤', kind: 'bad' };
  if (s.warmth < WARMTH_SAFE) return { text: '失温', kind: 'bad' };
  if (s.hunger < 20) return { text: '饥饿', kind: 'warn' };
  if (s.thirst < 20) return { text: '脱水', kind: 'warn' };
  if (s.mind < 25) return { text: '精神不稳', kind: 'warn' };
  if (s.energy < 20) return { text: '疲惫', kind: 'warn' };
  return { text: '稳定', kind: 'good' };
}
