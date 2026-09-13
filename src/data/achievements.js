/**
 * 成就（商业化升级 §七：成就系统）。
 * 每条成就自带 check(state) 判定与可选的 progress(state) 进度，界面不写死任何逻辑。
 * 解锁时统一由 systems/Achievement.js 发放奖励并写入日志。
 * @module data/achievements
 */
import { CHARACTER_LIST } from './characters.js';
import { item, SLOTS } from './items.js';

export const ACHIEVEMENTS = [
  /* ---------- 生存 ---------- */
  {
    id: 'survive_d2', name: '活过第一夜', icon: '🌙', cat: '生存',
    desc: '熬到第 2 天。',
    check: (s) => s.day >= 2,
    progress: (s) => ({ now: Math.min(s.day, 2), goal: 2, unit: '天' }),
    reward: { fame: 2 },
  },
  {
    id: 'survive_week', name: '第一周', icon: '📅', cat: '生存',
    desc: '活到第 8 天。',
    check: (s) => s.day >= 8,
    progress: (s) => ({ now: Math.min(s.day, 8), goal: 8, unit: '天' }),
    reward: { currency: 30, fame: 4 },
  },
  {
    id: 'survive_half', name: '半程', icon: '🧭', cat: '生存',
    desc: '活到第 16 天。',
    check: (s) => s.day >= 16,
    progress: (s) => ({ now: Math.min(s.day, 16), goal: 16, unit: '天' }),
    reward: { currency: 60, cores: 2 },
  },
  {
    id: 'survive_all', name: '活到第三十天', icon: '🏁', cat: '生存',
    desc: '完成 30 天流程。',
    check: (s) => s.day > 30 || Boolean(s.ending),
    progress: (s) => ({ now: Math.min(s.day, 30), goal: 30, unit: '天' }),
    reward: { cores: 8, fame: 10 },
  },
  {
    id: 'no_death_dip', name: '命悬一线', icon: '💗', cat: '生存',
    desc: '生命值掉到 15 以下之后又活过了一天。',
    check: (s) => Boolean(s.flags.near_death_survived),
    reward: { fame: 6 },
  },

  /* ---------- 资源 ---------- */
  {
    id: 'stock_food', name: '屯粮', icon: '🥫', cat: '资源',
    desc: '仓库里同时有 25 份食物类物资。',
    check: (s) => foodTotal(s) >= 25,
    progress: (s) => ({ now: Math.min(foodTotal(s), 25), goal: 25, unit: '份' }),
    reward: { currency: 20 },
  },
  {
    id: 'stock_water', name: '水比命贵', icon: '💧', cat: '资源',
    desc: '仓库里同时有 15 份饮水类物资。',
    check: (s) => waterTotal(s) >= 15,
    progress: (s) => ({ now: Math.min(waterTotal(s), 15), goal: 15, unit: '份' }),
    reward: { currency: 20 },
  },
  {
    id: 'warehouse_full', name: '满仓', icon: '📦', cat: '资源',
    desc: '仓库占用达到容量的 80%。',
    check: (s) => s.flags.storage_nearly_full === true,
    reward: { currency: 25 },
  },
  {
    id: 'rich', name: '有余粮的人', icon: '💰', cat: '资源',
    desc: '持有 200 货币。',
    check: (s) => s.currency >= 200,
    progress: (s) => ({ now: Math.min(s.currency, 200), goal: 200, unit: '货币' }),
    reward: { cores: 3 },
  },

  /* ---------- 装备 ---------- */
  {
    id: 'first_equip', name: '有备而来', icon: '🎒', cat: '装备',
    desc: '装备任意一件装备。',
    check: (s) => (s.worn ?? []).length >= 1,
    reward: { fame: 3 },
  },
  {
    id: 'fully_equipped', name: '全副武装', icon: '🛡️', cat: '装备',
    desc: '五个装备槽全部穿满。',
    check: (s) => equippedSlots(s) >= SLOTS.length,
    progress: (s) => ({ now: equippedSlots(s), goal: SLOTS.length, unit: '槽' }),
    reward: { cores: 4, fame: 6 },
  },
  {
    id: 'armory', name: '武备库', icon: '🗡️', cat: '装备',
    desc: '仓库里同时拥有 3 件武器类物资。',
    check: (s) => countCat(s, 'weapon') >= 3,
    progress: (s) => ({ now: Math.min(countCat(s, 'weapon'), 3), goal: 3, unit: '件' }),
    reward: { currency: 30 },
  },

  /* ---------- 基地 ---------- */
  {
    id: 'base_5', name: '像个家了', icon: '🏠', cat: '基地',
    desc: '任意设施升到 5 级。',
    check: (s) => Object.values(s.base ?? {}).some((v) => v >= 5),
    reward: { currency: 40, fame: 5 },
  },
  {
    id: 'base_all_3', name: '全面开工', icon: '🏗️', cat: '基地',
    desc: '所有设施都达到 3 级。',
    check: (s) => Object.values(s.base ?? {}).every((v) => v >= 3),
    reward: { cores: 5 },
  },
  {
    id: 'base_master', name: '凛冬堡垒', icon: '🏰', cat: '基地',
    desc: '任意设施升到满级 10 级。',
    check: (s) => Object.values(s.base ?? {}).some((v) => v >= 10),
    reward: { cores: 10, fame: 12 },
  },

  /* ---------- 人物 ---------- */
  {
    id: 'met_all', name: '不是一个人', icon: '👥', cat: '人物',
    desc: '与全部人物都见过面。',
    check: (s) => CHARACTER_LIST.every((c) => s.npcs?.[c.id]?.met),
    progress: (s) => ({ now: CHARACTER_LIST.filter((c) => s.npcs?.[c.id]?.met).length, goal: CHARACTER_LIST.length, unit: '人' }),
    reward: { fame: 8 },
  },
  {
    id: 'trusted', name: '信得过', icon: '🤝', cat: '人物',
    desc: '有一个人物的信任度达到 70。',
    check: (s) => Object.values(s.npcs ?? {}).some((r) => (r.trust ?? 0) >= 70),
    reward: { currency: 40 },
  },
  {
    id: 'conflict', name: '反目', icon: '⚔️', cat: '人物',
    desc: '有一个人物的冲突值达到 60。',
    check: (s) => Object.values(s.npcs ?? {}).some((r) => (r.conflict ?? 0) >= 60),
    reward: { cores: 2 },
    hidden: true,
  },
  {
    id: 'aid_3', name: '抱团取暖', icon: '🔥', cat: '人物',
    desc: '互助体系达到 3 人。',
    check: (s) => (s.aid?.members ?? 0) >= 3,
    progress: (s) => ({ now: Math.min(s.aid?.members ?? 0, 3), goal: 3, unit: '人' }),
    reward: { currency: 50, fame: 6 },
  },

  /* ---------- 探索与战斗 ---------- */
  {
    id: 'explorer', name: '走遍全城', icon: '🗺️', cat: '探索',
    desc: '去过 8 个不同的地点。',
    check: (s) => Object.keys(s.visited ?? {}).length >= 8,
    progress: (s) => ({ now: Math.min(Object.keys(s.visited ?? {}).length, 8), goal: 8, unit: '处' }),
    reward: { currency: 35 },
  },
  {
    id: 'hunter', name: '猎人', icon: '🏹', cat: '战斗',
    desc: '累计击杀 10 个感染者。',
    check: (s) => killTotal(s) >= 10,
    progress: (s) => ({ now: Math.min(killTotal(s), 10), goal: 10, unit: '个' }),
    reward: { cores: 3 },
  },
  {
    id: 'slayer', name: '清道夫', icon: '💀', cat: '战斗',
    desc: '累计击杀 40 个感染者。',
    check: (s) => killTotal(s) >= 40,
    progress: (s) => ({ now: Math.min(killTotal(s), 40), goal: 40, unit: '个' }),
    reward: { cores: 8, fame: 8 },
  },

  /* ---------- 光脑 ---------- */
  {
    id: 'mind_max', name: '光脑完全体', icon: '💠', cat: '光脑',
    desc: '光脑升到 5 级。',
    check: (s) => (s.mindLevel ?? 1) >= 5,
    progress: (s) => ({ now: Math.min(s.mindLevel ?? 1, 5), goal: 5, unit: '级' }),
    reward: { cores: 6 },
  },
  {
    id: 'fame_50', name: '城里都听过你', icon: '⭐', cat: '光脑',
    desc: '锋芒值达到 50。',
    check: (s) => (s.fame ?? 0) >= 50,
    progress: (s) => ({ now: Math.min(s.fame ?? 0, 50), goal: 50, unit: '锋芒' }),
    reward: { currency: 60 },
  },

  /* ---------- 剧情 ---------- */
  {
    id: 'events_40', name: '见多识广', icon: '📖', cat: '剧情',
    desc: '经历 40 段剧情。',
    check: (s) => (s.eventsSeen ?? 0) >= 40,
    progress: (s) => ({ now: Math.min(s.eventsSeen ?? 0, 40), goal: 40, unit: '段' }),
    reward: { currency: 30 },
  },
  {
    id: 'ending_any', name: '三十天之后', icon: '🎬', cat: '剧情',
    desc: '抵达任意一个结局。',
    check: (s) => Boolean(s.ending),
    reward: { cores: 10, fame: 15 },
  },
  {
    id: 'ending_legend', name: '传奇结局', icon: '👑', cat: '剧情',
    desc: '拿到「凛冬堡主 / 战力第一 / 双城记」其中一个结局。',
    check: (s) => ['winter_lord', 'power_first', 'two_cities'].includes(s.ending?.id),
    reward: { cores: 20 },
    hidden: true,
  },
  {
    id: 'daily_streak', name: '日日不落', icon: '📌', cat: '任务',
    desc: '连续 5 天完成全部每日任务。',
    check: (s) => (s.daily?.streak ?? 0) >= 5,
    progress: (s) => ({ now: Math.min(s.daily?.streak ?? 0, 5), goal: 5, unit: '天' }),
    reward: { currency: 80, cores: 3 },
  },
];

/* ---------------- 内部统计（同一份口径给 check 与 progress 用） ---------------- */
function foodTotal(s) {
  let n = 0;
  for (const [id, c] of Object.entries(s.inventory ?? {})) if (item(id).cat === 'food') n += c;
  return n;
}
function waterTotal(s) {
  let n = 0;
  for (const [id, c] of Object.entries(s.inventory ?? {})) if (item(id).cat === 'water') n += c;
  return n;
}
function countCat(s, cat) {
  let n = 0;
  for (const [id, c] of Object.entries(s.inventory ?? {})) if (item(id).cat === cat) n += c;
  return n;
}
function killTotal(s) {
  return Object.values(s.kills ?? {}).reduce((a, b) => a + b, 0);
}
function equippedSlots(s) {
  const worn = s.worn ?? [];
  return SLOTS.filter((sl) => worn.some((id) => item(id).slot === sl.id)).length;
}

export const ACHIEVEMENT_CATS = [...new Set(ACHIEVEMENTS.map((a) => a.cat))];
export const achievement = (id) => ACHIEVEMENTS.find((a) => a.id === id) ?? null;
export const TOTAL_ACHIEVEMENTS = ACHIEVEMENTS.length;
