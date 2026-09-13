/**
 * 关键人物（项目书 §14 人物关系系统）。
 * 第 1—3 天可接触：王大伟（重生者邻居）、老周（灰色立场路人）。
 * 龙九星 / 林晚 在第 12、16 天章节接入时再登场，避免出现无法交互的空卡片。
 * @module data/characters
 */
export const CHARACTERS = {
  wangdawei: {
    id: 'wangdawei',
    name: '王大伟',
    title: '邻居 · 402',
    portrait: '🧔',
    tags: ['反常', '精明'],
    desc: '中年男人，啤酒肚，笑容分寸感极强。六月开始一趟趟往家里搬物资，像早就知道夏天会结束。',
    personality: '谨慎、算计、护家；并非纯粹的坏人，只是比别人早一步。',
    goal: '把物资握在自己手里，用信息差换取安全与服从。',
    initial: { favor: 5, trust: 0, loyalty: 0, stress: 10 },
    /** 关系档位文案，界面直接展示。 */
    bands: [
      { min: -100, label: '敌意' }, { min: 0, label: '陌生' }, { min: 25, label: '试探' },
      { min: 50, label: '合作' }, { min: 80, label: '同盟' },
    ],
  },
  laozhou: {
    id: 'laozhou',
    name: '老周',
    title: '邻居 · 301',
    portrait: '👴',
    tags: ['虚弱', '灰色立场'],
    desc: '退休教师，家里有卧床的老伴。冰雹那天他在楼下站了很久，直到浑身湿透。',
    personality: '体面、要强，但已经被逼到角落里。',
    goal: '让老伴活过这个冬天，代价可以谈。',
    initial: { favor: 0, trust: 0, loyalty: 0, stress: 45 },
    bands: [
      { min: -100, label: '敌意' }, { min: 0, label: '陌生' }, { min: 25, label: '感激' },
      { min: 50, label: '信赖' }, { min: 80, label: '生死之交' },
    ],
  },
  xiao_wu: {
    id: 'xiao_wu',
    name: '小吴',
    title: '一楼 · 打工青年',
    portrait: '🧑',
    unlockDay: 4,
    tags: ['勤快', '新手'],
    desc: '二十二岁，在楼下便利店打了两年工。冰雹那天他姐姐出门送货，再没回来。',
    personality: '话不多，学东西快，怕黑但不说。',
    goal: '找到姐姐，或者至少确认她的下落。',
    initial: { favor: 5, trust: 5, loyalty: 0, stress: 30 },
    bands: [
      { min: -100, label: '隔阂' }, { min: 0, label: '陌生' }, { min: 25, label: '搭伙' },
      { min: 50, label: '信任' }, { min: 80, label: '自己人' },
    ],
  },
  li_ayi: {
    id: 'li_ayi',
    name: '李阿姨',
    title: '五楼 · 居委会',
    portrait: '👩',
    unlockDay: 4,
    tags: ['组织者', '现实'],
    desc: '退休前在居委会干了十几年，楼里谁家几口人她记得比户口本还清楚。',
    personality: '热心但不糊涂，讲规矩，也讲分寸。',
    goal: '让整栋楼的人一起撑过这个冬天——包括那些她并不喜欢的人。',
    initial: { favor: 0, trust: 5, loyalty: 0, stress: 25 },
    bands: [
      { min: -100, label: '不认可' }, { min: 0, label: '观望' }, { min: 25, label: '认可' },
      { min: 50, label: '倚重' }, { min: 80, label: '主心骨' },
    ],
  },
  laomao: {
    id: 'laomao',
    name: '老猫',
    title: '城北 · 线人',
    portrait: '🕶️',
    unlockDay: 22,
    tags: ['线人', '灰色立场', '情报'],
    desc: '没有人知道他住哪儿。他在三个据点之间来回，靠卖别人不知道的事过日子。',
    personality: '什么都谈，什么都不承诺；唯一的原则是钱要给够。',
    goal: '把这场冬天当成一门生意做到底，然后带着东西离开这座城。',
    initial: { favor: 0, trust: 0, loyalty: 0, stress: 20 },
    bands: [
      { min: -100, label: '不再交易' }, { min: 0, label: '买卖关系' }, { min: 25, label: '老主顾' },
      { min: 50, label: '优先供货' }, { min: 80, label: '内部消息' },
    ],
  },
  longjiuxing: {
    id: 'longjiuxing',
    name: '龙九星',
    title: '体育馆 · 战力主力',
    portrait: '🗡️',
    unlockDay: 12,
    tags: ['战力', '主线', '重情义'],
    desc: '在体育馆擂台上活下来的女人。左肩有一道没处理好的旧伤，说话前习惯先看对方的站位。',
    personality: '直、硬、认死理；对欠过人情的人会还到底。',
    goal: '把当年丢下她的人一个一个找回来，然后重新组一支队伍。',
    initial: { favor: 10, trust: 5, loyalty: 15, stress: 35 },
    bands: [
      { min: -100, label: '敌意' }, { min: 0, label: '陌生' }, { min: 25, label: '同行' },
      { min: 50, label: '信任' }, { min: 80, label: '过命' },
    ],
  },
  linwan: {
    id: 'linwan',
    name: '林晚',
    title: '市立医院 · 主治医生',
    portrait: '🩺',
    unlockDay: 16,
    tags: ['医疗', '主线', '有底线'],
    desc: '医院里唯一还在排班的医生。她把门诊大厅改成了分诊区，墙上贴着三张手写的规则表。',
    personality: '冷静、克制、不讨价还价；说出口的承诺一定做到。',
    goal: '让这家医院运转到最后一个病人离开为止。',
    initial: { favor: 0, trust: 10, loyalty: 0, stress: 40 },
    bands: [
      { min: -100, label: '拒绝往来' }, { min: 0, label: '公事公办' }, { min: 25, label: '认可' },
      { min: 50, label: '同道' }, { min: 80, label: '并肩' },
    ],
  },
};

export const CHARACTER_LIST = Object.values(CHARACTERS);
export const character = (id) => CHARACTERS[id];
export function bandOf(def, value) {
  let out = def.bands[0].label;
  for (const b of def.bands) if (value >= b.min) out = b.label;
  return out;
}
