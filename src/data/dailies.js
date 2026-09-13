/**
 * 每日任务池（商业化升级 §七：每日任务）。
 * 每天从池中按天号确定性地抽 3 条，进度由 systems/Daily.js 统计，玩家不需要手动领取。
 * metric 对应 Daily 里的计数器名；target 是达成所需数量。
 * @module data/dailies
 */
export const DAILY_POOL = [
  { id: 'out2',   metric: 'out',     target: 2, name: '外出行动 2 次',      hint: '行动页里选择需要出门的选项', reward: { currency: 10, growth: 8 } },
  { id: 'gather8', metric: 'gather', target: 8, name: '带回 8 份物资',        hint: '搜刮、采集、互助产出都算',   reward: { currency: 12, growth: 8 } },
  { id: 'social', metric: 'social',  target: 1, name: '和一个人说上话',      hint: '人物页：交谈或赠予',         reward: { currency: 8, growth: 6 } },
  { id: 'craft',  metric: 'craft',   target: 1, name: '完成 1 次加工',       hint: '基地：加工设施',             reward: { currency: 12, growth: 10 } },
  { id: 'upgrade', metric: 'upgrade', target: 1, name: '升级 1 次设施',      hint: '基地：每日限 2 次',          reward: { currency: 15, growth: 12 } },
  { id: 'kill3',  metric: 'kill',    target: 3, name: '清理 3 个感染者',     hint: '外出探索或守夜时开战',       reward: { currency: 14, growth: 10 } },
  { id: 'story2', metric: 'story',   target: 2, name: '推进 2 段剧情',       hint: '做出剧情选择即可',           reward: { currency: 10, growth: 8 } },
  { id: 'eat3',   metric: 'eat',     target: 3, name: '进食 3 次',           hint: '仓库里使用食物或饮水',       reward: { currency: 8, growth: 6 } },
  { id: 'rest1',  metric: 'rest',    target: 1, name: '完整休息一次',        hint: '主页或行动页：睡觉',         reward: { currency: 10, growth: 10 } },
  { id: 'trade1', metric: 'trade',   target: 1, name: '在交易区成交 1 次',   hint: '行动页：交易区',             reward: { currency: 12, growth: 8 } },
  { id: 'warm60', metric: 'warm',    target: 1, name: '带着 60 以上体温过完一天', hint: '供暖与御寒装备是关键',  reward: { currency: 15, growth: 10 } },
];

export const DAILY_COUNT = 3;
export const daily = (id) => DAILY_POOL.find((d) => d.id === id) ?? null;

/** 完成全部每日任务的额外奖励。 */
export const DAILY_ALL_BONUS = { currency: 40, cores: 1, growth: 20 };
