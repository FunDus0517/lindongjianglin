/**
 * 角色成长（商业化升级 §七：角色成长）。
 * 生存等级由「行动、剧情、任务、成就」累积的经验推动，等级给出的是**温和但可感知**的
 * 三条加成：战力、仓库载重、御寒——分别接在 Power / Inventory.capacity / GameTime 上，
 * 避免在各系统里散落魔法数字。
 * @module systems/Growth
 */
import { toast } from '../core/store.js';

export const MAX_LEVEL = 10;
export const DEFAULT = { level: 1, xp: 0 };

/** 升级所需经验：80 + 40×(等级−1)，累计到满级约 2160，正常节奏第 20 天前后满级。 */
export const xpForLevel = (level) => 80 + (level - 1) * 40;

export const LEVEL_TITLES = ['新来的', '能撑住的', '老手', '硬茬', '凛冬的老住户', '传说'];

/** 等级对应称号。 */
export function title(level = 1) {
  const idx = Math.min(LEVEL_TITLES.length - 1, Math.floor((Math.max(1, level) - 1) / 2));
  return LEVEL_TITLES[idx];
}

export const level = (state) => state.growth?.level ?? DEFAULT.level;
export const xp = (state) => state.growth?.xp ?? DEFAULT.xp;

/** 等级加成。等级 1 时全为 0，保证新局与旧存档行为不变。 */
export function bonus(state) {
  const l = level(state) - 1;
  return {
    power: Math.floor(l / 2),
    capacity: l * 4,
    warmth: Math.floor(l / 3),
  };
}

/** 加经验；返回本次升了几级。满级后不再累积。 */
export function addXp(state, n) {
  if (!state.growth) state.growth = { ...DEFAULT };
  if (!(n > 0)) return 0;
  if (state.growth.level >= MAX_LEVEL) { state.growth.xp = 0; return 0; }
  state.growth.xp += Math.round(n);
  let ups = 0;
  while (state.growth.level < MAX_LEVEL && state.growth.xp >= xpForLevel(state.growth.level)) {
    state.growth.xp -= xpForLevel(state.growth.level);
    state.growth.level += 1;
    ups += 1;
  }
  if (ups > 0) {
    const l = state.growth.level;
    toast(`生存等级 Lv.${l}｜${title(l)}`, 'mind');
  }
  return ups;
}

/** 界面用视图。 */
export function view(state) {
  const l = level(state);
  const max = l >= MAX_LEVEL;
  const need = max ? 0 : xpForLevel(l);
  return {
    level: l,
    title: title(l),
    xp: max ? 0 : xp(state),
    need,
    max,
    ratio: max ? 1 : Math.min(1, xp(state) / need),
    bonus: bonus(state),
  };
}
