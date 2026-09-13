/**
 * 结局（项目书 §18 结局系统）。
 * 第 30 天由整个流程的累计数据计算，不是选项。死亡类结局随时触发。
 * priority 高者先判定。
 * @module data/endings
 */
export const ENDINGS = {
  ice: {
    id: 'ice', title: '冰封', priority: 100, kind: 'death',
    tone: 'bad',
    desc: '你的生命体征归零。光脑在最后一次记录里写下：环境温度过低，宿主未能在有效时间内找到热源。\n\n雪会覆盖你留下的一切痕迹，就像这座城市里其他几百万人一样。',
  },
  starve: {
    id: 'starve', title: '空仓', priority: 95, kind: 'death',
    tone: 'bad',
    desc: '最后一罐罐头在三天前就吃完了。你不是被冻死的，是被耗尽的。',
  },
  king_of_hiding: {
    id: 'king_of_hiding', title: '苟王之王', priority: 50, kind: 'final',
    condition: (s) => s.fame <= 30 && s.stats.hp >= 40 && s.stock >= 120,
    desc: '没有人记得你的名字，但你活到了最后。\n仓库是满的，锋芒值是低的，门锁是完好的——在这个冬天，这已经是最高级别的胜利。',
  },
  winter_lord: {
    id: 'winter_lord', title: '凛冬堡主', priority: 45, kind: 'final',
    condition: (s) => s.defense >= 4 && s.shelter >= 3 && s.aidMembers >= 4,
    desc: '你的地下空间变成了这座城市的灯塔。有人投奔，有人窥视，也有人愿意替你守夜。\n凛冬没有结束，但你已经不需要独自面对它。',
  },
  power_first: {
    id: 'power_first', title: '战力第一', priority: 40, kind: 'final',
    condition: (s) => s.rank === 1 && s.power >= 110,
    desc: '战力榜第一的位置上，刻着你的编号。\n挑战者会一直来，但今天的榜单是你的。',
  },
  green_dawn: {
    id: 'green_dawn', title: '绿色黎明', priority: 35, kind: 'final',
    condition: (s) => s.greenhouse >= 3 && s.flags.agri_route === true,
    desc: '温室的玻璃上结着霜，霜下面是一片绿。\n你终于不用再数罐头过日子。',
  },
  two_cities: {
    id: 'two_cities', title: '双城记', priority: 30, kind: 'final',
    condition: (s) => s.flags.corridor_route === true && s.lindong >= 25,
    desc: '凛冬城的势力格局因为你换了棋盘。\n两座城之间，从此有一条只有你知道的路。',
  },
  survivor: {
    id: 'survivor', title: '幸存者', priority: 0, kind: 'final', fallback: true,
    desc: '第三十天，天亮了。\n你数了数剩下的东西，数了数还认识的人，然后推开了门。\n没有奇迹，也没有结束——只是又一个需要活下去的白天。',
  },
};

export const ENDING_LIST = Object.values(ENDINGS).sort((a, b) => b.priority - a.priority);
export const ending = (id) => ENDINGS[id];
