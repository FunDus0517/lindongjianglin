/**
 * 地点与行动（项目书 §7 行动与探索系统）。
 * 每张地点卡：名称 / 危险等级 / 预计时间 / 可能收益 / 已知事件 / 进入条件。
 * 行动词表固定为：搜索 search、深入探索 explore、搜救 rescue、战斗 fight、
 * 潜行 sneak、撤退 retreat、交易 trade、调查 investigate。
 * loot 表：[物品 id, 最少, 最多, 概率]，概率会被天气与光脑加成修正。
 * danger 1—5 影响遇敌概率与受伤幅度。
 * @module data/locations
 */
import { ITEMS } from './items.js';

export const ACTIONS = {
  search:      { id: 'search', label: '搜索', minutes: 45, risk: 0.8, hint: '获得基础资源' },
  explore:     { id: 'explore', label: '深入探索', minutes: 90, risk: 1.6, hint: '消耗更多时间并提高风险' },
  rescue:      { id: 'rescue', label: '搜救', minutes: 60, risk: 1.2, hint: '获得人物或关系线索' },
  fight:       { id: 'fight', label: '战斗', minutes: 30, risk: 2.4, hint: '直接处理危险目标' },
  sneak:       { id: 'sneak', label: '潜行', minutes: 60, risk: 0.4, hint: '降低战斗风险但可能减少收益' },
  retreat:     { id: 'retreat', label: '撤退', minutes: 20, risk: 0, hint: '保存生命与资源' },
  trade:       { id: 'trade', label: '交易', minutes: 30, risk: 0.5, hint: '用货币换取指定物资' },
  investigate: { id: 'investigate', label: '调查', minutes: 75, risk: 1.0, hint: '寻找隐藏剧情和特殊道具' },
};

export const LOCATIONS = {
  /* ---------------- 第二阶段（永冬时代，第 31 天起）开放的新区域 ----------------
   * 方案 §三：阶段推进不只是改数值，还要开放新区域、给长期探索留空间。
   * 这些地点门槛高、收益结构不同（更多晶核/零件、更少食物），是"越往后越难捡"的补偿。 */
  frozen_port: {
    id: 'frozen_port', name: '冰封码头', icon: '🚢', danger: 4, indoor: false, unlockDay: 31,
    desc: '江面冻成了灰白色的石头，几十条船被封在冰里。船舱是密封的——里面可能还留着货，也可能留着人。',
    events: [],
    actions: {
      search: { loot: [['metal', 1, 3, 0.7], ['frozen_meat', 0, 2, 0.5], ['fuel', 0, 1, 0.3]], note: '沿着船舷挨个撬舱门。' },
      explore: { loot: [['parts', 1, 2, 0.6], ['insulation', 0, 2, 0.45], ['headlamp', 0, 1, 0.2]], note: '下到货舱，手电照着冰面往前走。' },
      fight: { loot: [['ice_axe', 0, 1, 0.2], ['metal', 1, 2, 0.6]], note: '把舱里的东西引出来处理掉。' },
      retreat: { loot: [], note: '退回岸上的铁轨旁。' },
    },
  },
  underground_mall: {
    id: 'underground_mall', name: '地下商场', icon: '🛗', danger: 4, indoor: true, unlockDay: 45,
    desc: '地铁连着的商业层，停电之后一直没人清过。空气不流通，但温度比地面高十几度。',
    events: [],
    actions: {
      search: { loot: [['canned', 1, 3, 0.6], ['bottled_water', 1, 2, 0.55], ['bandage', 0, 2, 0.4]], note: '翻超市货架和便利店冷柜。' },
      explore: { loot: [['medicine', 0, 2, 0.4], ['parts', 0, 2, 0.45], ['water_tank', 0, 1, 0.25]], note: '往商场深处走，找药房和维修间。' },
      investigate: { loot: [['blueprint', 0, 1, 0.3], ['seeds', 0, 1, 0.25]], note: '查配电图和商铺清单。' },
      retreat: { loot: [], note: '顺着指示牌回到入口。' },
    },
  },
  military_checkpoint: {
    id: 'military_checkpoint', name: '军用检查站', icon: '🚧', danger: 5, indoor: false, unlockDay: 61,
    desc: '撤离时被放弃的卡点：两辆装甲车横在路上，铁丝网还立着。当年守在这里的人，没等到换防。',
    events: [],
    actions: {
      search: { loot: [['ammo', 1, 3, 0.6], ['metal', 1, 3, 0.6], ['compressed', 0, 2, 0.4]], note: '翻装甲车的储物箱。' },
      explore: { loot: [['parts', 1, 3, 0.6], ['fuel', 0, 2, 0.4], ['hunting_rifle', 0, 1, 0.25]], note: '撬开指挥车的舱门。' },
      fight: { loot: [['gas_mask', 0, 1, 0.25], ['ammo', 1, 2, 0.5]], note: '先清场再搬东西。' },
      sneak: { loot: [['ammo', 0, 2, 0.5], ['parts', 0, 1, 0.4]], note: '贴着铁丝网摸进去。' },
      retreat: { loot: [], note: '退回公路上。' },
    },
  },
  /* ---------------- 第三阶段（冰封世界，第 101 天起） ---------------- */
  ice_cathedral: {
    id: 'ice_cathedral', name: '冰封穹顶', icon: '⛪', danger: 5, indoor: true, unlockDay: 101,
    desc: '体育馆的穹顶被冰压成了一个巨大的白色穹隆，里面像一个没有人的教堂。回声很长。',
    events: [],
    actions: {
      explore: { loot: [['metal', 1, 3, 0.5], ['parts', 1, 3, 0.5], ['medicine', 0, 2, 0.35]], note: '沿着看台一层层往上走。' },
      investigate: { loot: [['blueprint', 0, 2, 0.4], ['insulation', 1, 2, 0.4]], note: '研究冰层结构，找可以长期利用的空间。' },
      fight: { loot: [['insulated_boots', 0, 1, 0.25]], note: '把在这里筑巢的东西清掉。' },
      retreat: { loot: [], note: '从破碎的入口退出去。' },
    },
  },
  deep_mine: {
    id: 'deep_mine', name: '深层矿脉', icon: '⛏️', danger: 5, indoor: true, unlockDay: 121,
    desc: '矿道最下面那层，墙上全是发亮的结晶。空气冷得能听见自己呼出的水汽结成冰。',
    events: [],
    actions: {
      explore: { loot: [['metal', 2, 4, 0.7], ['parts', 1, 2, 0.6], ['insulation', 1, 2, 0.5]], note: '沿着矿脉往里凿。' },
      fight: { loot: [['fur_coat', 0, 1, 0.3], ['medicine', 0, 1, 0.4]], note: '把守矿的东西处理掉再采。' },
      investigate: { loot: [['blueprint', 1, 2, 0.45]], note: '抄下矿脉走向与结晶分布。' },
      retreat: { loot: [], note: '爬回上层矿道。' },
    },
  },

  apartment: {
    id: 'apartment', name: '自家公寓', icon: '🏢', danger: 0, indoor: true, unlockDay: 1,
    desc: '十二层的两居室。窗外的城市正在结冰，屋里还有最后一格电。',
    events: [],
    actions: {
      search: { loot: [['canned', 0, 1, 0.5], ['bottled_water', 0, 1, 0.5], ['battery', 0, 1, 0.3]], note: '翻遍橱柜和储物间。' },
      investigate: { loot: [['blueprint', 0, 1, 0.12]], note: '整理父亲留下的旧图纸。' },
      retreat: { loot: [], note: '回到屋里，关好门窗。' },
    },
  },
  basement: {
    id: 'basement', name: '父亲的地下室', icon: '🕳️', danger: 0, indoor: true, unlockDay: 1,
    desc: '老楼的地下一层，父亲当年随手挖出来的避风处。潮湿、低矮，但墙是实心的。',
    events: ['basement_collapse_risk'],
    actions: {
      search: { loot: [['wood', 0, 1, 0.6], ['metal', 0, 1, 0.35], ['parts', 0, 1, 0.25]], note: '清理塌落的碎石与废铁。' },
      explore: { loot: [['wood', 1, 2, 0.7], ['metal', 0, 1, 0.4], ['insulation', 0, 1, 0.3]], note: '继续向下挖掘，扩大空间。' },
      investigate: { loot: [['blueprint', 0, 1, 0.2], ['parts', 0, 1, 0.4]], note: '检查墙体结构与通风。' },
      retreat: { loot: [], note: '回到地面透气。' },
    },
  },
  supermarket: {
    id: 'supermarket', name: '小区超市', icon: '🛒', danger: 2, indoor: true, unlockDay: 1,
    desc: '卷帘门被撬开一半。货架倒了一地，地上有拖拽的痕迹。',
    events: ['supermarket_hoard'],
    actions: {
      search: { loot: [['canned', 1, 2, 0.75], ['bottled_water', 0, 2, 0.65], ['compressed', 0, 1, 0.5]], note: '在倒下的货架间翻找。' },
      explore: { loot: [['canned', 1, 3, 0.8], ['rice', 0, 1, 0.5], ['medicine', 0, 1, 0.35], ['charcoal', 0, 1, 0.3]], note: '摸进后仓与冷库。' },
      sneak: { loot: [['canned', 1, 2, 0.6], ['battery', 0, 1, 0.4]], note: '贴着墙根移动，避开声音。' },
      rescue: { loot: [['bandage', 0, 1, 0.5]], note: '搜寻还活着的人。' },
      trade: { loot: [], note: '和守在门口的幸存者讲价。' },
      retreat: { loot: [], note: '退回楼道。' },
    },
  },
  pharmacy: {
    id: 'pharmacy', name: '街角药店', icon: '💊', danger: 2, indoor: true, unlockDay: 2,
    desc: '玻璃碎了一地，退烧药和绷带被抢空了大半，处方柜还锁着。',
    events: ['pharmacy_locked_cabinet'],
    actions: {
      search: { loot: [['bandage', 1, 2, 0.7], ['medicine', 0, 1, 0.45]], note: '在碎玻璃里挑还能用的。' },
      explore: { loot: [['medicine', 1, 2, 0.6], ['frostbite_salve', 0, 1, 0.5], ['bandage', 0, 2, 0.5]], note: '撬开处方柜。' },
      investigate: { loot: [['frostbite_salve', 0, 1, 0.55], ['blueprint', 0, 1, 0.08]], note: '翻看值班记录与药品清单。' },
      rescue: { loot: [['bandage', 0, 1, 0.4]], note: '喊了几声，只有回声。' },
      retreat: { loot: [], note: '退出药店。' },
    },
  },
  hardware: {
    id: 'hardware', name: '五金建材店', icon: '🔧', danger: 3, indoor: true, unlockDay: 2,
    desc: '卷帘门半开，里面堆着钢管、板材和成捆的保温棉。有人先来过。',
    events: ['hardware_raiders'],
    actions: {
      search: { loot: [['wood', 1, 2, 0.7], ['metal', 0, 2, 0.6], ['parts', 0, 1, 0.4]], note: '搬走能搬的建材。' },
      explore: { loot: [['insulation', 1, 2, 0.7], ['metal', 1, 2, 0.6], ['pipe', 0, 1, 0.5], ['fuel', 0, 1, 0.2]], note: '钻进后库翻找保温材料。' },
      sneak: { loot: [['insulation', 1, 1, 0.6], ['parts', 0, 1, 0.45]], note: '躲开楼上搬东西的人。' },
      fight: { loot: [['knife', 0, 1, 0.5], ['ammo', 0, 1, 0.4]], note: '正面处理占着店面的人。' },
      retreat: { loot: [], note: '沿原路退出。' },
    },
  },
  block: {
    id: 'block', name: '邻里楼道', icon: '🚪', danger: 1, indoor: true, unlockDay: 1,
    desc: '声控灯早就灭了。楼道里堆着别人家的纸箱和一台坏掉的洗衣机。',
    events: ['observe_wangdawei', 'laozhou_begging'],
    actions: {
      search: { loot: [['firewood', 0, 1, 0.5], ['canned', 0, 1, 0.3]], note: '翻找楼道里被丢掉的东西。' },
      investigate: { loot: [], note: '观察谁家在搬东西、谁家还亮着灯。' },
      rescue: { loot: [['bandage', 0, 1, 0.35]], note: '挨家敲门，问有没有需要帮忙的。' },
      retreat: { loot: [], note: '回自己家。' },
    },
  },
  ruins: {
    id: 'ruins', name: '街区废墟', icon: '🏚️', danger: 4, indoor: false, unlockDay: 3,
    desc: '被冰雹砸塌的两栋居民楼。钢筋从混凝土里翘出来，风从缺口灌进来。',
    events: ['ruins_survivor', 'ruins_scavengers'],
    actions: {
      search: { loot: [['metal', 1, 2, 0.7], ['wood', 0, 2, 0.6], ['canned', 0, 1, 0.4]], note: '在废墟里翻找可用的材料。' },
      explore: { loot: [['insulation', 1, 2, 0.5], ['fuel', 0, 1, 0.3], ['blueprint', 0, 1, 0.15], ['medicine', 0, 1, 0.4]], note: '深入塌陷的楼体，风险与收获同时上升。' },
      rescue: { loot: [['bandage', 0, 1, 0.4]], note: '听有没有人还在喊。' },
      fight: { loot: [['knife', 0, 1, 0.45], ['ammo', 0, 2, 0.5]], note: '清理守在废墟里的掠夺者。' },
      sneak: { loot: [['metal', 1, 2, 0.6], ['parts', 0, 1, 0.4]], note: '压低身体绕过哨位。' },
      retreat: { loot: [], note: '撤出废墟。' },
    },
  },

  /* ---------------- 第 6 天：探索区域扩大 ---------------- */
  parking: {
    id: 'parking', name: '地下停车场', icon: '🅿️', danger: 3, indoor: true, unlockDay: 6,
    desc: '负一层。积水结了冰，车还停在原位，有几辆后备箱大开着。',
    events: ['parking_trap'],
    actions: {
      search: { loot: [['metal', 1, 2, 0.7], ['parts', 0, 1, 0.45], ['battery', 0, 1, 0.4]], note: '撬开还锁着的车门。' },
      explore: { loot: [['fuel', 0, 1, 0.35], ['parts', 1, 2, 0.5], ['metal', 1, 3, 0.7], ['blueprint', 0, 1, 0.1]], note: '沿排水沟摸到更深的位置。' },
      sneak: { loot: [['battery', 0, 2, 0.5], ['parts', 0, 1, 0.4]], note: '贴着承重柱移动，避开回音。' },
      fight: { loot: [['knife', 0, 1, 0.4], ['ammo', 0, 1, 0.35]], note: '正面处理占着车位的人。' },
      retreat: { loot: [], note: '退回楼梯间。' },
    },
  },
  gas_station: {
    id: 'gas_station', name: '加油站', icon: '⛽', danger: 4, indoor: false, unlockDay: 6,
    desc: '油枪被人拧断了，便利店的门半开着，风从加油岛之间穿过去。',
    events: ['gas_station_siege'],
    actions: {
      search: { loot: [['compressed', 0, 1, 0.5], ['bottled_water', 0, 1, 0.5], ['fuel', 0, 1, 0.25]], note: '翻便利店的货架和收银台。' },
      explore: { loot: [['fuel', 1, 2, 0.5], ['parts', 0, 1, 0.4], ['ammo', 0, 2, 0.35], ['metal', 0, 1, 0.4]], note: '想办法从储油罐里放油。' },
      sneak: { loot: [['fuel', 0, 1, 0.35], ['compressed', 0, 1, 0.45]], note: '避开加油岛上的人影。' },
      rescue: { loot: [['bandage', 0, 1, 0.4]], note: '喊了两声，只有风。' },
      retreat: { loot: [], note: '退到马路对面。' },
    },
  },
  school: {
    id: 'school', name: '社区小学', icon: '🏫', danger: 3, indoor: true, unlockDay: 6,
    desc: '操场上的雪没人扫。教学楼里还留着粉笔灰的味道。',
    events: ['school_archive', 'school_greenhouse_class'],
    actions: {
      search: { loot: [['wood', 1, 2, 0.7], ['canned', 0, 1, 0.4], ['bandage', 0, 1, 0.4]], note: '拆课桌，翻食堂的储物柜。' },
      explore: { loot: [['seeds', 0, 2, 0.5], ['fertilizer', 0, 1, 0.45], ['insulation', 0, 1, 0.4], ['blueprint', 0, 1, 0.12]], note: '翻生物教室与劳动课仓库。' },
      investigate: { loot: [['blueprint', 0, 1, 0.25], ['seeds', 0, 1, 0.4]], note: '查看教务室的档案与登记表。' },
      rescue: { loot: [['bandage', 0, 1, 0.5]], note: '挨个教室敲门。' },
      retreat: { loot: [], note: '从操场侧门退出去。' },
    },
  },

  /* ---------------- 第 11—20 天：挑战线、医院与能源 ---------------- */
  gym: {
    id: 'gym', name: '废弃体育馆', icon: '🏟️', danger: 4, indoor: true, unlockDay: 12,
    desc: '看台的塑料椅被人拆了一半当柴烧。场中央的擂台还在，绳子上结着霜。',
    events: ['gym_ring', 'gym_strongman'],
    actions: {
      search: { loot: [['wood', 2, 3, 0.75], ['metal', 0, 2, 0.5], ['bandage', 0, 1, 0.4]], note: '拆看台与器材室的木料。' },
      explore: { loot: [['parts', 1, 2, 0.5], ['ammo', 0, 2, 0.4], ['insulation', 0, 2, 0.45], ['blueprint', 0, 1, 0.15]], note: '进入地下器材库。' },
      fight: { loot: [['knife', 0, 1, 0.5], ['ammo', 1, 2, 0.5], ['parts', 0, 1, 0.4]], note: '接下擂台上的挑战。' },
      investigate: { loot: [['ammo', 0, 1, 0.5]], note: '看擂台的记分牌，弄清谁在这里活动。' },
      retreat: { loot: [], note: '从侧门退出体育馆。' },
    },
  },
  hospital: {
    id: 'hospital', name: '市立医院', icon: '🏥', danger: 5, indoor: true, unlockDay: 16,
    desc: '三楼的灯还亮着——有人在维持它。走廊尽头贴着新写的告示：进门前先消毒。',
    events: ['hospital_triage', 'hospital_pharmacy'],
    actions: {
      search: { loot: [['bandage', 1, 3, 0.75], ['medicine', 0, 2, 0.6]], note: '翻门诊与护士站。' },
      explore: { loot: [['medicine', 1, 3, 0.7], ['frostbite_salve', 0, 2, 0.5], ['parts', 0, 1, 0.4], ['blueprint', 0, 1, 0.15]], note: '下到住院部与设备层。' },
      rescue: { loot: [['bandage', 0, 2, 0.5]], note: '帮忙抬人、递东西——这里真的还有人。' },
      trade: { loot: [], note: '用药材和医院换你需要的东西。' },
      investigate: { loot: [['blueprint', 0, 1, 0.3]], note: '查看值班表与药品台账。' },
      retreat: { loot: [], note: '沿消防通道退出医院。' },
    },
  },
  substation: {
    id: 'substation', name: '城西变电站', icon: '🔌', danger: 4, indoor: true, unlockDay: 17,
    desc: '变压器上挂着冰凌。控制室的指示灯还亮着两盏——说明某条线路是活的。',
    events: ['substation_grid', 'substation_trespass'],
    actions: {
      search: { loot: [['battery', 1, 2, 0.7], ['parts', 1, 2, 0.6], ['metal', 0, 2, 0.5]], note: '拆配电柜与备用电源。' },
      explore: { loot: [['fuel', 0, 2, 0.4], ['parts', 1, 3, 0.6], ['blueprint', 0, 1, 0.2]], note: '进入高压间与柴油机房。' },
      sneak: { loot: [['battery', 0, 2, 0.5], ['parts', 0, 1, 0.45]], note: '避开控制室里的人影。' },
      fight: { loot: [['parts', 1, 2, 0.5], ['ammo', 0, 2, 0.4]], note: '赶走占着控制室的人。' },
      retreat: { loot: [], note: '退出变电站。' },
    },
  },

  /* ---------------- 第 21—30 天：终局区域 ---------------- */
  mine: {
    id: 'mine', name: '城北晶矿', icon: '⛏️', danger: 5, indoor: true, unlockDay: 22,
    desc: '废弃矿区的竖井口结着冰柱，井壁上的结晶在头灯下泛暗红的光。越往下越暖，也越不像地面。',
    events: ['mine_collapse', 'mine_vein'],
    actions: {
      search: { loot: [['metal', 1, 3, 0.7], ['parts', 1, 2, 0.6], ['battery', 0, 1, 0.4]], note: '翻矿车与设备残骸。' },
      explore: { loot: [['metal', 2, 3, 0.7], ['parts', 1, 3, 0.6], ['blueprint', 0, 1, 0.25], ['fuel', 0, 1, 0.35]], note: '沿主矿道下到第二层。' },
      fight: { loot: [['parts', 1, 2, 0.5], ['knife', 0, 1, 0.3]], note: '清理盘踞在矿道里的变异体。' },
      investigate: { loot: [['blueprint', 0, 1, 0.35]], note: '研究矿脉走向与结晶分布。' },
      sneak: { loot: [['metal', 1, 2, 0.6], ['parts', 0, 2, 0.5]], note: '屏住呼吸绕过结晶堆。' },
      retreat: { loot: [], note: '拉着绳索爬回地面。' },
    },
  },
  tunnel: {
    id: 'tunnel', name: '废弃地下通道', icon: '🚇', danger: 4, indoor: true, unlockDay: 23,
    desc: '六十年代挖的防空通道，一头通向城北，一头通向老城区。地图上早就没有它了。',
    events: ['tunnel_echo', 'tunnel_crossing'],
    actions: {
      search: { loot: [['battery', 0, 2, 0.55], ['parts', 0, 2, 0.5], ['bandage', 0, 1, 0.4]], note: '翻通道两侧的防空洞隔间。' },
      explore: { loot: [['fuel', 0, 1, 0.3], ['insulation', 0, 2, 0.5], ['blueprint', 0, 1, 0.2]], note: '走到通道更深处。' },
      investigate: { loot: [['blueprint', 0, 1, 0.3]], note: '在墙上找旧地图与出口编号。' },
      sneak: { loot: [['parts', 0, 1, 0.45], ['battery', 0, 1, 0.45]], note: '贴着墙走，避开通道里的动静。' },
      retreat: { loot: [], note: '退回入口。' },
    },
  },
};

export const LOCATION_LIST = Object.values(LOCATIONS);
export const location = (id) => LOCATIONS[id];
export const lootItem = (id) => ITEMS[id] ?? { id, name: id };
