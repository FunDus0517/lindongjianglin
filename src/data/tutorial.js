/**
 * 新手引导（商业化升级 §七：新手引导）。
 * 一步一步的卡片式引导，讲清"这个界面怎么用、活下去靠什么"，不做遮罩高亮——
 * 手机上遮罩定位易碎，卡片序列更稳。引导只在第 1 天且未完成时出现，可以跳过。
 * @module data/tutorial
 */
export const TUTORIAL = [
  {
    title: '先说结论：没有结局',
    text: '你要做的是活到第 30 天。但第 30 天不会结束游戏——它会给你一份总结，然后你继续活下去。死亡也不会结束这一局，只是会让你丢掉最近搜集的东西。',
    hint: '随时可以在主页看到当前进度',
  },
  {
    title: '顶栏在读什么',
    text: '左边是天数和时刻，中间是天气与气温，右边是光脑等级和锋芒值。气温决定你在室外能待多久。',
    hint: '天气每天 06:00 变化，主页会给出次日预报',
  },
  {
    title: '六项状态',
    text: '生命、体温、饥饿、饮水、精力、精神。体温低于 35 会开始掉血，饿了渴了也会。精力决定你今天还能做多少事。',
    hint: '主页第一块卡片就是状态条',
  },
  {
    title: '行动：白天出门，入夜休息',
    text: '行动页可以外出搜刮、加工材料、在交易区买卖。22:00 之后回不了家就要在外面挨冻，所以别把时间用光。',
    hint: '底部导航第二个就是行动',
  },
  {
    title: '选择会改变人和势力',
    text: '剧情里的每个选择都会影响人物关系（好感/信任/忠诚/压力/冲突）与势力立场。冲突值涨到一定程度，对方就不理你了。',
    hint: '人物页可以看每个人现在的态度',
  },
  {
    title: '仓库与装备',
    text: '装备分五个槽：武器、外套、鞋、工具、面具。武器决定战斗，御寒层数决定你能在室外待多久，背囊还能提高仓库载重。',
    hint: '仓库页可以逐件装备/卸下',
  },
  {
    title: '每日任务与成就',
    text: '每天 3 条每日任务，完成即时发奖，全部完成还有额外奖励并累计连击。成就会在你达到条件时自动解锁。',
    hint: '主页和成就页都能看到',
  },
  {
    title: '对战：跟 NPC 打架',
    text: '可以主动挑战掠夺者、凛冬城守卫、感染者与尸潮。战力越高越轻松，但打赢掠夺者会让掠夺者记住你，打守卫等于和城里翻脸。',
    hint: '每个对手每天只能打一次',
  },
];

export const TUTORIAL_STEPS = TUTORIAL.length;

export const stepOf = (state) => TUTORIAL[Math.min(Math.max(state.tutorial?.step ?? 0, 0), TUTORIAL_STEPS - 1)];
export const isDone = (state) => state.tutorial?.done === true;
export const stepIndex = (state) => Math.min(Math.max(state.tutorial?.step ?? 0, 0), TUTORIAL_STEPS - 1);

/** 是否显示引导：第 1 天的前几个小时内、且还没看完/跳过。 */
export const shouldShow = (state) => !isDone(state) && state.day <= 2;

/** 下一步；最后一步自动标记完成。返回是否还有下一步。 */
export function advance(state) {
  state.tutorial = state.tutorial ?? { step: 0, done: false };
  if (state.tutorial.step >= TUTORIAL_STEPS - 1) { state.tutorial.done = true; return false; }
  state.tutorial.step += 1;
  return true;
}

export function skip(state) {
  state.tutorial = { step: TUTORIAL_STEPS - 1, done: true };
}

/** 重新看一遍（设置页可用）。 */
export function restart(state) {
  state.tutorial = { step: 0, done: false };
}
