/**
 * 剧情推进（项目书 §4、§8）。负责章节叙事、主线事件排队、里程碑边界。
 * 脚本事件按天排队，排队顺序即叙事顺序。
 * @module systems/Story
 */
import { TOTAL_DAYS, chapterOf } from '../data/chapters.js';

/** 里程碑划分（项目书 §24 开发阶段）。 */
export const MILESTONES = [
  { id: 'M1', label: '第 1—3 天', through: 3, title: '基础生存', focus: 'UI 骨架、时间与状态、行动与事件、存档' },
  { id: 'M2', label: '第 4—10 天', through: 10, title: '秩序崩溃', focus: '取舍与人情、掠夺者、感染者、邻里互助、能源与保温' },
  { id: 'M3', label: '第 11—20 天', through: 20, title: '势力与战力', focus: '战力榜、晶核强化、挑战线、势力冲突、医院主线' },
  { id: 'M4', label: '第 21—30 天', through: 30, title: '终局', focus: '交易区、晶矿、潜伏、丧尸潮与结局判定' },
];

/** 已开放脚本剧情的最后一天。全部 30 天内容完成。 */
export const CONTENT_DAYS = 30;

/** 每天开场的脚本事件（按顺序触发）。 */
export const DAY_SCRIPTS = {
  1: ['d1_hail', 'd1_blackout', 'd1_mind_bind'],
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

export const scriptsFor = (day) => DAY_SCRIPTS[day] ?? [];

/** 新游戏：初始化第 1 天的叙事队列。 */
export function begin(state) {
  state.queue = [...scriptsFor(1)];
  state.chapterTitle = chapterOf(1).title;
}

/** 每日刷新时把当天脚本事件排入队列。 */
export function onNewDay(state) {
  const ch = chapterOf(state.day);
  state.chapterTitle = ch.title;
  state.queue.push(...scriptsFor(state.day));
  const done = completedMilestone(state.day);
  if (done && state.day > CONTENT_DAYS) state.milestone = done.id;
  else if (state.day <= CONTENT_DAYS) state.milestone = null;
  if (state.day > TOTAL_DAYS) state.milestone = 'M4';
}

/** 第 day 天时已经走完的最后一个里程碑（第 4 天 → M1，第 11 天 → M2）。 */
export const completedMilestone = (day) =>
  [...MILESTONES].reverse().find((m) => day > m.through) ?? null;

/** 下一个尚未开放的里程碑（里程碑结算页展示开发范围）。 */
export const nextMilestone = (id) => {
  const i = MILESTONES.findIndex((m) => m.id === id);
  return i < 0 ? MILESTONES[0] : MILESTONES[Math.min(i + 1, MILESTONES.length - 1)];
};

export const milestoneById = (id) => MILESTONES.find((m) => m.id === id) ?? MILESTONES[0];
export const milestoneOpen = (state) => state.milestone === 'M1' || state.milestone === 'M2';

/** 章节回顾（首页“章节回顾”入口）：已到达过的章节摘要。 */
export function recap(state) {
  const out = [];
  for (let d = 1; d <= Math.max(state.day, 1); d++) out.push(chapterOf(d));
  return out.map((c) => ({ ...c, reached: c.day <= state.day }));
}

export const chapter = (state) => chapterOf(state.day);
