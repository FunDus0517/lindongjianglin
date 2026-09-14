/**
 * 幸存者（无限生存方案 §五）：NPC 不设固定结局 —— 他们会成长、转职、受伤、死亡、离开，
 * 也可能加入别的势力。这里放的是每个人的**职业阶梯**，成长逻辑在 systems/NPC.js。
 * @module data/crew
 */

/** 职业阶梯：从左到右逐级晋升，越靠后越能撑起基地。 */
export const ROLE_LADDER = {
  wangdawei: ['邻居', '楼栋负责人', '基地管理员', '基地负责人'],
  laozhou: ['邻居', '守卫', '哨兵队长', '防御负责人'],
  xiao_wu: ['孩子', '跑腿', '物资员', '探索负责人'],
  li_ayi: ['阿姨', '厨工', '后勤负责人', '粮食负责人'],
  laomao: ['线人', '商人', '贸易负责人', '外交负责人'],
  longjiuxing: ['流浪者', '打手', '战斗教官', '护卫队长'],
  linwan: ['医生', '主治医生', '医疗负责人', '医疗总监'],
};

export const FALLBACK_LADDER = ['居民', '老手', '骨干', '负责人'];

/** 每级职业需要的成长值。 */
export const XP_PER_ROLE = 36;

/** 受伤后需要休息几天；休息期间受伤者不产出。 */
export const INJURY_DAYS = 3;

/**
 * 累计受伤天数达到这个值就会死 —— 也就是"伤上加伤"：单次受伤（3 天）能扛过去，
 * 恢复期内再次受伤就危险了；仓库里有药时每天扣一天，等于在治疗。
 */
export const DEATH_AFTER_INJURED_DAYS = 4;

export const ladderFor = (id) => ROLE_LADDER[id] ?? FALLBACK_LADDER;
export const roleAt = (id, crewXp = 0) => {
  const ladder = ladderFor(id);
  const idx = Math.min(ladder.length - 1, Math.floor(Math.max(0, crewXp) / XP_PER_ROLE));
  return ladder[idx];
};
export const roleIndex = (id, crewXp = 0) => ladderFor(id).indexOf(roleAt(id, crewXp));

/** 幸存者状态的中文标签与语气（界面直接用）。 */
export const STATUS = {
  active: { label: '在岗', kind: 'good' },
  injured: { label: '受伤', kind: 'warn' },
  dead: { label: '已故', kind: 'bad' },
  left: { label: '已离开', kind: '' },
  joined: { label: '另有归属', kind: 'warn' },
};
