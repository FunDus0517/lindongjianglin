/**
 * 剧情推进（无限生存版）：不再有"某天必须演哪一段"的固定编排。
 *
 * 规则：
 *   - 第 1 天的三段开场仍然按顺序演出（它就是新手引导，必须保证体验一致）
 *   - 其余剧本事件只是登记一个**最早可出现的日子**，到日子之后进入随机池，
 *     按原编排顺序优先抽取 —— 剧情顺序还在，但不再是固定章节排期
 *   - 世界状态由三个无限阶段驱动（见 data/chapters.js），阶段切换只改变世界，不结束游戏
 * @module systems/Story
 */
import { TOTAL_DAYS, chapterOf, phaseOf, PHASES } from '../data/chapters.js';

/** 里程碑（开发阶段划分，保留用于"开发者视角"的说明）。 */
export const MILESTONES = [
  { id: 'M1', label: '第 1—3 天', through: 3, title: '基础生存', focus: 'UI 骨架、时间与状态、行动与事件、存档' },
  { id: 'M2', label: '第 4—10 天', through: 10, title: '秩序崩溃', focus: '取舍与人情、掠夺者、感染者、邻里互助、能源与保温' },
  { id: 'M3', label: '第 11—20 天', through: 20, title: '势力与战力', focus: '战力榜、晶核强化、挑战线、势力冲突、医院主线' },
  { id: 'M4', label: '第 21—30 天', through: 30, title: '第一阶段尾声', focus: '交易区、晶矿、潜伏、尸潮与基地成型' },
];

/** 第 1 天的开场（顺序固定）。 */
export const OPENING_SCRIPTS = ['d1_hail', 'd1_blackout', 'd1_mind_bind'];

/**
 * 剧本事件 → 最早可出现的日子。
 * 这张表就是原来"第几天演哪几段"，现在只当作**叙事顺序与解锁门槛**使用。
 */
export const STORY_SCHEDULE = {
  2: ['d2_order_breakdown'],
  3: ['d3_cold_snap', 'd3_raider_ambush'],
  4: ['d4_line_of_people', 'd4_xiao_wu'],
  5: ['d5_raider_scout', 'd5_wang_offer'],
  6: ['d6_map', 'd6_new_frontier'],
  7: ['d7_first_infected', 'd7_lockdown'],
  8: ['d8_aid_meeting', 'd8_li_ayi'],
  9: ['d9_theft', 'd9_sick_child'],
  10: ['d10_cold_snap', 'd10_power_crisis'],
  11: ['d11_board_open', 'd11_attention'],
  12: ['d12_rescue', 'd12_challenge_line', 'd12_radio', 'd12_water_line'],
  13: ['d13_champion', 'd13_longjiuxing_join', 'd13_frostbite', 'd13_board_rumor'],
  14: ['d14_broadcast', 'd14_recruit'],
  15: ['d15_pressure', 'd15_resource_war', 'd15_kid_request', 'd15_hoarders'],
  16: ['d16_hospital', 'd16_pact'],
  17: ['d17_migration', 'd17_mutant', 'd17_migration_watch', 'd17_generator'],
  18: ['d18_standoff', 'd18_challenge_2'],
  19: ['d19_consequences', 'd19_longjiuxing_duel', 'd19_sides', 'd19_traitor'],
  20: ['d20_prep', 'd20_challenge_final', 'd20_checkup', 'd20_train_wreck'],
  21: ['d21_market_open', 'd21_price_shock', 'd21_haggle'],
  22: ['d22_laomao', 'd22_mine_open', 'd22_collapse'],
  23: ['d23_tunnel_map', 'd23_infiltration', 'd23_checkpoint'],
  24: ['d24_inside_job', 'd24_faction_task', 'd24_contact'],
  25: ['d25_horde_warning', 'd25_shelter_upgrade', 'd25_defense_drill', 'd25_pipe_burst'],
  26: ['d26_winter_crop', 'd26_seed_vault'],
  27: ['d27_polar_night', 'd27_last_supply'],
  28: ['d28_first_wave', 'd28_after_wave'],
  29: ['d29_second_wave', 'd29_last_night'],
  30: ['d30_dawn'],
};

/** event id → 最早出现日（供随机池排序与门槛判断）。 */
export const MIN_DAY = Object.fromEntries(
  Object.entries(STORY_SCHEDULE).flatMap(([day, ids]) => ids.map((id) => [id, Number(day)])),
);

export const minDayOf = (id) => MIN_DAY[id] ?? 0;

/** 旧接口：曾经用于"按天排队"，现在只返回开场序列（兼容调用方）。 */
export const scriptsFor = (day) => (day === 1 ? OPENING_SCRIPTS : []);

/** 新游戏：只把第 1 天的开场排进队列。 */
export function begin(state) {
  state.queue = [...OPENING_SCRIPTS];
  state.chapterTitle = chapterOf(1).title;
  state.phase = 'P1';
}

/**
 * 每日刷新：不再往队列里塞剧本。
 * 只更新章节标题与阶段；阶段切换由 GameTime 负责出总结。
 */
export function onNewDay(state) {
  const ch = chapterOf(state.day);
  state.chapterTitle = ch.title;
  state.phase = phaseOf(state.day).id;
  const done = completedMilestone(state.day);
  if (done && state.day > TOTAL_DAYS) state.milestone = done.id;
  else if (state.day <= TOTAL_DAYS) state.milestone = null;
  if (state.day > TOTAL_DAYS) state.milestone = 'M4';
}

/** 第 day 天时已经走完的最后一个里程碑（第 4 天 → M1，第 11 天 → M2）。 */
export const completedMilestone = (day) =>
  [...MILESTONES].reverse().find((m) => day > m.through) ?? null;

export const nextMilestone = (id) => {
  const i = MILESTONES.findIndex((m) => m.id === id);
  return i < 0 ? MILESTONES[0] : MILESTONES[Math.min(i + 1, MILESTONES.length - 1)];
};

export const milestoneById = (id) => MILESTONES.find((m) => m.id === id) ?? MILESTONES[0];
export const milestoneOpen = (state) => state.milestone === 'M1' || state.milestone === 'M2';

/** 章节回顾（首页入口）：已到达过的日子（第一阶段逐日，之后按阶段显示）。 */
export function recap(state) {
  const out = [];
  const until = Math.max(state.day, 1);
  for (let d = 1; d <= Math.min(until, TOTAL_DAYS); d++) out.push(chapterOf(d));
  if (until > TOTAL_DAYS) out.push({ ...chapterOf(until) });
  return out.map((c) => ({ ...c, reached: c.day <= state.day }));
}

export const chapter = (state) => chapterOf(state.day);
export { PHASES, TOTAL_DAYS };

/** 兼容别名：第一阶段（第 1—30 天）的剧本天数，界面章节列表用它。 */
export const CONTENT_DAYS = TOTAL_DAYS;
/** 兼容别名：原来的"第几天演哪几段"，现在只当叙事顺序与解锁门槛。 */
export const DAY_SCRIPTS = STORY_SCHEDULE;
