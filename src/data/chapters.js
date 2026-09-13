/**
 * 章节表（项目书 §4 30天剧情结构 + §11 情报页世界信息）。
 * 每天给出：主导天气、基准气温、当日刷新任务、章节主旨。
 * weather 引用 systems/Weather.js 的天气 id；quests 引用 data/quests.js 的 id。
 * 第 4—30 天的脚本事件将在 M2—M4 里程碑补齐，天气与气温曲线从第 1 天起即生效。
 * @module data/chapters
 */
export const CHAPTERS = [
  { day: 1, title: '冰雹降临', weather: 'hail', temp: -18, quests: ['q_open_warehouse', 'q_heat', 'q_check_mind', 'q_prepare_out', 'q_first_night'], synopsis: '冰雹砸穿城市，电力与通讯异常。获得初始物资并绑定光脑，完成基础生存任务。' },
  { day: 2, title: '秩序下降', weather: 'normal_cold', temp: -20, quests: ['q_food_stock', 'q_water_stock', 'q_observe_wang'], synopsis: '城市秩序开始下降，食物、饮水和能源的重要性明显提升。' },
  { day: 3, title: '第一轮寒潮', weather: 'cold_snap', temp: -28, quests: ['q_insulate', 'q_survive_cold', 'q_raider'], synopsis: '寒潮加强，体温成为主要生存压力。掠夺者开始活动。' },
  { day: 4, title: '求助', weather: 'normal_cold', temp: -24, quests: ['q_aid_decision', 'q_recruit_wu'], synopsis: '周边居民开始求助，第一次面对资源与人情之间的取舍。' },
  { day: 5, title: '掠夺者', weather: 'blizzard', temp: -22, quests: ['q_defense_one', 'q_wang_deal'], synopsis: '掠夺者活动增加，安全问题开始影响行动。' },
  { day: 6, title: '辐射区', weather: 'normal_cold', temp: -25, quests: ['q_new_frontier', 'q_blueprint'], synopsis: '探索区域扩大，出现更多可搜集地点和隐藏事件。' },
  { day: 7, title: '感染', weather: 'blizzard', temp: -27, quests: ['q_infected_kill', 'q_lockdown'], synopsis: '感染者/丧尸事件出现，危险等级提升。' },
  { day: 8, title: '邻里', weather: 'normal_cold', temp: -26, quests: ['q_aid_formed', 'q_aid_li'], synopsis: '邻里合作与人性事件展开，可选择建立小型互助体系。' },
  { day: 9, title: '互助', weather: 'normal_cold', temp: -24, quests: ['q_theft_handled', 'q_child_aid', 'q_morale'], synopsis: '互助体系开始产生回报，也开始产生负担。' },
  { day: 10, title: '强寒潮', weather: 'cold_snap', temp: -34, quests: ['q_heat_two', 'q_power', 'q_survive_d10'], synopsis: '寒潮进一步加强，能源与保温系统成为核心。' },
  { day: 11, title: '战力榜', weather: 'normal_cold', temp: -30, quests: ['q_board_seen', 'q_board_rank', 'q_enhance'], synopsis: '战力榜开放，玩家实力开始受到公开关注。' },
  { day: 12, title: '挑战线', weather: 'blizzard', temp: -28, quests: ['q_longjiuxing', 'q_challenge_start'], synopsis: '龙九星相关挑战线开启，强敌、交易和人物关系逐步展开。' },
  { day: 13, title: '强敌', weather: 'extreme_cold', temp: -31, quests: ['q_champion', 'q_ally'], synopsis: '挑战线持续推进，需要真正的战力支撑。' },
  { day: 14, title: '广播', weather: 'normal_cold', temp: -29, quests: ['q_lindong', 'q_recruit_terms'], synopsis: '王大伟广播出现，凛冬城相关势力开始招募幸存者。' },
  { day: 15, title: '势力', weather: 'blizzard', temp: -33, quests: ['q_side', 'q_resource_war'], synopsis: '势力关系与资源竞争升级。' },
  { day: 16, title: '医院', weather: 'extreme_cold', temp: -30, quests: ['q_hospital', 'q_linwan'], synopsis: '医院事件开启，林晚相关剧情进入主线。' },
  { day: 17, title: '迁徙', weather: 'cold_snap', temp: -36, quests: ['q_migration', 'q_mutant', 'q_cores'], synopsis: '寒潮与感染者迁徙同时发生，城市危险等级进一步提升。' },
  { day: 18, title: '冲突', weather: 'blizzard', temp: -34, quests: ['q_conflict', 'q_challenge_2'], synopsis: '势力冲突与高风险选择开始出现。' },
  { day: 19, title: '站队', weather: 'normal_cold', temp: -32, quests: ['q_refugees', 'q_duel'], synopsis: '必须在势力之间做出取舍。' },
  { day: 20, title: '代价', weather: 'extreme_cold', temp: -35, quests: ['q_endgame_prep', 'q_challenge_final', 'q_survive_d20'], synopsis: '前期选择的代价开始集中兑现。' },
  { day: 21, title: '交易区', weather: 'normal_cold', temp: -33, quests: ['q_market', 'q_market_intel'], synopsis: '交易区正式进入核心玩法，经济系统和稀缺资源流通开启。' },
  { day: 22, title: '晶矿', weather: 'blizzard', temp: -31, quests: ['q_laomao', 'q_mine'], synopsis: '晶矿与线人出现，新的资源层展开。' },
  { day: 23, title: '潜伏', weather: 'extreme_cold', temp: -37, quests: ['q_corridor_lead', 'q_pass'], synopsis: '潜伏与情报战升级。' },
  { day: 24, title: '势力任务', weather: 'normal_cold', temp: -35, quests: ['q_corridor', 'q_faction_task'], synopsis: '势力任务开始决定最终格局。' },
  { day: 25, title: '预兆', weather: 'blizzard', temp: -34, quests: ['q_horde_prep', 'q_final_build'], synopsis: '丧尸潮预兆出现，防御体系需要提前成型。' },
  { day: 26, title: '囤积', weather: 'extreme_cold', temp: -38, quests: ['q_agri_route'], synopsis: '最后一段可以安稳准备的时间。' },
  { day: 27, title: '极夜', weather: 'polar_night', temp: -42, quests: ['q_polar', 'q_last_supply'], synopsis: '极夜开始，最终寒潮进入倒计时。' },
  { day: 28, title: '丧尸潮', weather: 'extreme_cold', temp: -46, quests: ['q_wave1', 'q_after_wave'], synopsis: '大型丧尸潮爆发，所有生存体系接受最终考验。' },
  { day: 29, title: '最后一夜', weather: 'zombie_tide', temp: -50, quests: ['q_wave2', 'q_alpha', 'q_last_night'], synopsis: '防线与储备同时见底。' },
  { day: 30, title: '黎明', weather: 'polar_night', temp: -40, quests: ['q_dawn', 'q_survive_30'], synopsis: '黎明到来，根据资源、战力、关系、势力和关键选择计算结局。' },
];

export const chapterOf = (day) => CHAPTERS[Math.min(Math.max(day, 1), CHAPTERS.length) - 1];
export const TOTAL_DAYS = CHAPTERS.length;
