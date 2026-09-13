/**
 * 势力（项目书 §4 第 14—20 天：广播招募、势力竞争、站队与冲突）。
 * 势力只有一条关系轴：立场 standing（−100 敌视 → 100 核心成员）。
 * @module data/factions
 */
export const FACTIONS = {
  lindong: {
    id: 'lindong',
    name: '凛冬城',
    icon: '🏙️',
    desc: '以城北体育馆为核心建立的幸存者聚落，靠广播招募、按贡献分配物资，规矩严、门槛高。',
    goal: '把散落的幸存者收拢成一个能撑过冬天的秩序体。',
    initial: { standing: 0, known: false },
    bands: [
      { min: -100, label: '敌对' }, { min: -25, label: '戒备' }, { min: 0, label: '陌生' },
      { min: 25, label: '有往来' }, { min: 50, label: '盟友' }, { min: 80, label: '核心成员' },
    ],
  },
  raiders: {
    id: 'raiders',
    name: '掠夺者联盟',
    icon: '🪓',
    desc: '没有名字、没有制度的十几个小队。他们不生产，只负责把别人的冬天变成自己的。',
    goal: '在所有人耗尽之前，把资源集中到活下来最强的人手里。',
    initial: { standing: -20, known: false },
    bands: [
      { min: -100, label: '猎杀名单' }, { min: -25, label: '目标' }, { min: 0, label: '互不干涉' },
      { min: 25, label: '交了保护费' }, { min: 50, label: '同伙' }, { min: 80, label: '自己人' },
    ],
  },
  aidnet: {
    id: 'aidnet',
    name: '楼道互助网',
    icon: '🏘️',
    desc: '你自己拉起来的互助体系。立场由成员规模与士气决定，是结局判定的重要依据。',
    goal: '让这栋楼的人一起撑过这个冬天。',
    initial: { standing: 0, known: true },
    bands: [
      { min: -100, label: '散了' }, { min: 0, label: '松散' }, { min: 25, label: '成体系' },
      { min: 50, label: '稳固' }, { min: 80, label: '主心骨' },
    ],
  },
};

export const FACTION_LIST = Object.values(FACTIONS);
export const faction = (id) => FACTIONS[id];
