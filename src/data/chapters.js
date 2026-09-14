/**
 * 世界阶段（《无限生存优化方案》§三）：游戏不再按"30 天章节"编排，而是分成三个**无限**阶段。
 * 阶段不会结束，只是改变世界状态 —— 温度继续下降、资源变少、危险变高、新区域开放。
 *
 *   第一阶段 极寒降临（第 1—30 天）  ：暴雪频繁，资源还算丰富，人不多
 *   第二阶段 永冬时代（第 31—100 天）：温度继续往下掉，资源减少，危险增加，新区域开放
 *   第三阶段 冰封世界（第 101 天起） ：极端天气成为常态，高级科技才有出路
 *
 * 实现说明：第一阶段仍然保留逐日编排（天气/气温/任务都调过平衡，测试也依赖它），
 * 第 31 天起改由阶段曲线生成 —— 这样"无限"与"手感"两者都不丢。
 * @module data/chapters
 */

/** 第一阶段（逐日编排，原 30 天表原样保留）。 */
export const LEGACY_DAYS = [
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
  { day: 24, title: '势力任务', weather: 'normal_cold', temp: -35, quests: ['q_corridor', 'q_faction_task'], synopsis: '势力任务开始决定格局。' },
  { day: 25, title: '预兆', weather: 'blizzard', temp: -34, quests: ['q_horde_prep', 'q_final_build'], synopsis: '尸潮预兆出现，防御体系需要提前成型。' },
  { day: 26, title: '囤积', weather: 'extreme_cold', temp: -38, quests: ['q_agri_route'], synopsis: '最后一段可以安稳准备的时间。' },
  { day: 27, title: '极夜', weather: 'polar_night', temp: -42, quests: ['q_polar', 'q_last_supply'], synopsis: '极夜开始，寒潮进入最深的阶段。' },
  { day: 28, title: '尸潮', weather: 'extreme_cold', temp: -46, quests: ['q_wave1', 'q_after_wave'], synopsis: '大型尸潮爆发，所有生存体系接受考验。' },
  { day: 29, title: '最冷的一夜', weather: 'zombie_tide', temp: -50, quests: ['q_wave2', 'q_alpha', 'q_last_night'], synopsis: '防线与储备同时见底。' },
  { day: 30, title: '冬天没有结束', weather: 'polar_night', temp: -52, quests: ['q_dawn', 'q_survive_30'], synopsis: '第一阶段的尾声。天没有亮——只是雪小了一点，而后面还有更长的冬天。' },
];

/** 三个世界阶段。to: null 表示无限延续。 */
export const PHASES = [
  {
    id: 'P1', name: '极寒降临', from: 1, to: 30, weather: 'hail',
    tempFrom: -18, tempTo: -52, lootMod: 1, dangerMod: 1,
    desc: '暴雪频繁，能捡到的东西还算多，人也还没有成群。',
    tagline: '先活过第一个月。',
  },
  {
    id: 'P2', name: '永冬时代', from: 31, to: 100, weather: 'extreme_cold',
    tempFrom: -52, tempTo: -66, lootMod: 0.85, dangerMod: 1.25,
    desc: '温度继续往下掉，城里能翻的东西越来越少，人也开始成队出现。',
    tagline: '靠的不是运气，是基地。',
  },
  {
    id: 'P3', name: '冰封世界', from: 101, to: null, weather: 'polar_night',
    tempFrom: -66, tempTo: -78, lootMod: 0.7, dangerMod: 1.5,
    desc: '极端天气成为常态。只有把基地和科技堆起来的人还留在这座城里。',
    tagline: '让文明继续。',
  },
];

/** 阶段切换的日子（第 2、3 阶段的第 1 天）。 */
export const PHASE_DAYS = PHASES.map((p) => p.from);

export function phaseOf(day) {
  const d = Math.max(1, Math.floor(day));
  return [...PHASES].reverse().find((p) => d >= p.from) ?? PHASES[0];
}

/** 阶段内的推进进度 0—1（第三阶段按 100 天一个周期滚动，永远不会到 1）。 */
export function phaseProgress(day) {
  const p = phaseOf(day);
  const span = p.to === null ? 100 : p.to - p.from + 1;
  return Math.min(0.999, Math.max(0, (day - p.from) / span));
}

function lerp(a, b, t) { return a + (b - a) * t; }

/**
 * 当天的章节视图。第一阶段照旧逐日编排；此后由阶段曲线生成：
 * 气温在阶段内继续下降（不是回暖），天气按阶段的主导天气走。
 */
export function chapterOf(day) {
  const d = Math.max(1, Math.floor(day));
  if (d <= LEGACY_DAYS.length) return { ...LEGACY_DAYS[d - 1], phase: 'P1' };
  const p = phaseOf(d);
  const t = phaseProgress(d);
  return {
    day: d,
    phase: p.id,
    title: `${p.name} · 第 ${d - p.from + 1} 天`,
    weather: p.weather,
    temp: Math.round(lerp(p.tempFrom, p.tempTo, t)),
    quests: [],
    synopsis: p.desc,
    phaseTagline: p.tagline,
  };
}

/** 第一阶段的剧本天数（旧代码里的 TOTAL_DAYS 语义保持不变）。 */
export const TOTAL_DAYS = LEGACY_DAYS.length;

/**
 * 兼容别名：第一阶段仍按天编排，界面与旧代码用 CHAPTERS 读它。
 * 第 31 天之后请用 chapterOf(day)（它会返回阶段生成的当天的章节视图）。
 */
export const CHAPTERS = LEGACY_DAYS;

/** 天气与危险的世界级修正（阶段越靠后，资源越少、危险越高）。 */
export function worldMods(day) {
  const p = phaseOf(day);
  return { lootMod: p.lootMod, dangerMod: p.dangerMod, phase: p };
}
