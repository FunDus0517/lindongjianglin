/**
 * 人物对话（项目书 §22 /data：dialogue）。
 * 依据关系档位与剧情 Flag 选择台词，让 NPC 反应随玩家行为变化，而不是固定文本。
 * @module data/dialogue
 */
export const DIALOGUE = {
  wangdawei: {
    /** 按好感度档位排序，命中第一个满足条件的台词。 */
    tiers: [
      { min: 50, lines: ['“你比我预想的更清醒。”', '“东西我给你留一份，但别声张。”', '“这楼里能商量事的人不多，你算一个。”'] },
      { min: 25, lines: ['“先看着吧，天冷下来才知道谁准备够了。”', '“你那地下室，挖得动吗？”'] },
      { min: 0, lines: ['“哟，出来透气？”', '“最近别在楼道里堆东西，碍事。”'] },
      { min: -100, lines: ['“你盯我三天了。”', '“各过各的，别越界。”'] },
    ],
    /** Flag 命中时优先于档位台词。 */
    flags: {
      saw_his_hoard: '“……你看见什么了？”他把门又掩上了一点。',
      refused_help: '“行，记住了。”他没再看你。',
    },
  },
  laozhou: {
    tiers: [
      { min: 50, lines: ['“我这条命，是你给的。”', '“老伴今天能坐起来了。”'] },
      { min: 25, lines: ['“我不白拿你的东西，我拿东西换。”', '“三楼的水管还能接，要不要一起弄？”'] },
      { min: 0, lines: ['“屋里冷，我出来走走。”', '“……你也缺吃的吧？”'] },
      { min: -100, lines: ['“你别过来。”'] },
    ],
    flags: {
      helped_laozhou: '“那天你给的东西，我记着。”',
      robbed_laozhou: '他看见你就低下头，快步走开。',
    },
  },
  xiao_wu: {
    tiers: [
      { min: 50, lines: ['“你说去哪我就去哪。”', '“今天我找到三罐压缩的，都放仓库了。”'] },
      { min: 25, lines: ['“姐要是还在，应该也在找吃的。”', '“停车场我熟，以前在那儿停过车。”'] },
      { min: 0, lines: ['“……我能干活，真的。”', '“我不白吃你们的东西。”'] },
      { min: -100, lines: ['他躲着你的视线。'] },
    ],
    flags: {
      aid_xiao_wu: '“我把水打回来了，够两天。”',
      xiao_wu_joined: '“我跟着你们干。”',
    },
  },
  li_ayi: {
    tiers: [
      { min: 50, lines: ['“这事你拿主意，我信你。”', '“按我说的分，谁也别闹。”'] },
      { min: 25, lines: ['“人多是负担，也是活路。”', '“301 那家你别不管。”'] },
      { min: 0, lines: ['“小伙子，你囤的东西够几户人吃？”', '“楼里三十七口人，我数过的。”'] },
      { min: -100, lines: ['“你这种人我见多了。”'] },
    ],
    flags: {
      aid_li_ayi: '“名单我记着呢，谁出了力我心里有数。”',
      theft_pardoned: '“心软不是坏事，但要有账。”',
      theft_punished: '“规矩立住了，人情就淡了。”',
    },
  },
  laomao: {
    tiers: [
      { min: 50, lines: ['“这条白送你——城北那帮人下周要换地方。”', '“别问我从哪儿知道的。”'] },
      { min: 25, lines: ['“老主顾，给你留了一条。”', '“钱先放桌上，话再出口。”'] },
      { min: 0, lines: ['“想知道什么都行，先看价目。”', '“我不站队，我只出货。”'] },
      { min: -100, lines: ['他把帽子压低，从你旁边走过去。'] },
    ],
    flags: {
      corridor_route: '“那条道只有三个人知道。现在你是第四个。”',
      intel_corridor: '“凛冬城里有人不想干了，你懂我意思。”',
    },
  },
  longjiuxing: {
    tiers: [
      { min: 50, lines: ['“你指哪儿我打哪儿。”', '“背靠背的时候，我不看你，我看外面。”'] },
      { min: 25, lines: ['“想活着，就得有人挡在前面。”', '“你那栋楼，缺一个能打的。”'] },
      { min: 0, lines: ['“救我一次，不代表我欠你一辈子。”', '“擂台上的规矩很简单：站着的说话。”'] },
      { min: -100, lines: ['她把手放在刀柄上，没有再看你。'] },
    ],
    flags: {
      longjiuxing_joined: '“我跟你走。但有一个人，我要自己解决。”',
      longjiuxing_duel: '“这场你别插手——你插手我就得还你一次。”',
      saved_longjiuxing: '“……我记住你了。”',
    },
  },
  linwan: {
    tiers: [
      { min: 50, lines: ['“药我给你留着，别浪费。”', '“医院可以缺东西，不能缺规矩。”'] },
      { min: 25, lines: ['“你送来的东西，我都登记了。”', '“缺口太大，我只能保住一半的人。”'] },
      { min: 0, lines: ['“物资放门口，人不要进分诊区。”', '“治病要钱，救命要东西，你选哪个。”'] },
      { min: -100, lines: ['“这里不欢迎你。”'] },
    ],
    flags: {
      linwan_pact: '“每月一次，药换补给。我会记在台账上。”',
      hospital_raided: '她看见你，先把手里的笔放下再说话。',
    },
  },
};

/** 取一条当前关系下应当说的话。 */
export function lineFor(npcId, rel, flags = {}) {
  const d = DIALOGUE[npcId];
  if (!d) return null;
  for (const [flag, line] of Object.entries(d.flags ?? {})) if (flags[flag]) return line;
  const score = (rel?.favor ?? 0) + (rel?.trust ?? 0) * 0.5;
  const tier = [...d.tiers].sort((a, b) => b.min - a.min).find((t) => score >= t.min);
  if (!tier) return null;
  return tier.lines[Math.abs(Math.floor(score * 7)) % tier.lines.length];
}
