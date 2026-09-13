/**
 * 物品字典（项目书 §6 资源与仓库）。所有资源都以 id 引用，界面文案从 name 生成。
 * bulk = 占用的仓库容量；use = 使用效果（消耗品）；value = 交易区基准价。
 * @module data/items
 */
export const ITEMS = {
  // 食物
  canned:      { id: 'canned', name: '罐头', cat: 'food', bulk: 1, value: 3, use: { hunger: 28, mind: 2 }, desc: '保质期极长的工业食品，末世硬通货。' },
  frozen_meat: { id: 'frozen_meat', name: '冻肉', cat: 'food', bulk: 1, value: 4, use: { hunger: 38, hp: 3 }, desc: '低温下天然冷冻，需要热源处理。' },
  compressed:  { id: 'compressed', name: '压缩食品', cat: 'food', bulk: 1, value: 5, use: { hunger: 22, energy: 8 }, desc: '高热量、难吃、适合外出携带。' },
  rice:        { id: 'rice', name: '米面', cat: 'food', bulk: 2, value: 3, use: { hunger: 30 }, desc: '需要饮水和热源才能加工。' },

  // 饮水
  bottled_water: { id: 'bottled_water', name: '瓶装水', cat: 'water', bulk: 1, value: 3, use: { thirst: 32 }, desc: '干净、珍贵、无法长期依赖。' },
  purified:      { id: 'purified', name: '净水', cat: 'water', bulk: 1, value: 2, use: { thirst: 26, hp: 2 }, desc: '净化后的雪水，味道一般但安全。' },
  water_tank:    { id: 'water_tank', name: '储水罐', cat: 'water', bulk: 4, value: 8, use: { thirst: 15 }, desc: '大容量容器，可反复收集雪水。' },

  // 能源
  charcoal:  { id: 'charcoal', name: '无烟木炭', cat: 'energy', bulk: 1, value: 4, desc: '取暖燃料，密闭空间燃烧有一氧化碳风险。' },
  firewood:  { id: 'firewood', name: '木柴', cat: 'energy', bulk: 2, value: 2, desc: '取暖与加固两用。' },
  battery:   { id: 'battery', name: '电池', cat: 'energy', bulk: 1, value: 5, desc: '维持光脑与照明。' },
  fuel:      { id: 'fuel', name: '燃油', cat: 'energy', bulk: 3, value: 12, desc: '发电机燃料，极度稀缺。' },

  // 建筑
  wood:        { id: 'wood', name: '木材', cat: 'build', bulk: 3, value: 2, desc: '基础建材，改造避难所必需。' },
  metal:       { id: 'metal', name: '金属', cat: 'build', bulk: 3, value: 4, desc: '拆解与加固的核心材料。' },
  parts:       { id: 'parts', name: '零件', cat: 'build', bulk: 1, value: 6, desc: '机电与设施升级件。' },
  insulation:  { id: 'insulation', name: '保温材料', cat: 'build', bulk: 2, value: 7, desc: '决定你在极寒里能撑多久。' },

  // 医疗
  bandage:      { id: 'bandage', name: '绷带', cat: 'medical', bulk: 1, value: 3, use: { hp: 12 }, desc: '止血与包扎。' },
  medicine:     { id: 'medicine', name: '消炎药', cat: 'medical', bulk: 1, value: 6, use: { hp: 20, mind: 3 }, desc: '感染与发烧的第一道防线。' },
  frostbite_salve: { id: 'frostbite_salve', name: '冻伤药', cat: 'medical', bulk: 1, value: 8, use: { hp: 10, warmth: 8 }, desc: '冻伤专用，寒潮季的身价翻倍。' },

  // 武器
  pipe:  { id: 'pipe', name: '钢管', cat: 'weapon', bulk: 2, value: 3, equip: { weapon: 1 }, desc: '最朴素的近战武器。' },
  knife: { id: 'knife', name: '匕首', cat: 'weapon', bulk: 1, value: 6, equip: { weapon: 2 }, desc: '近身、快速、需要勇气。' },
  ammo:  { id: 'ammo', name: '弹药', cat: 'weapon', bulk: 1, value: 5, desc: '远程选项的消耗品。' },

  // 农业
  seeds:      { id: 'seeds', name: '种子', cat: 'agri', bulk: 1, value: 5, desc: '温室路线的起点。' },
  fertilizer: { id: 'fertilizer', name: '肥料', cat: 'agri', bulk: 2, value: 4, desc: '提高温室产量。' },
  produce:    { id: 'produce', name: '种植产物', cat: 'food', bulk: 1, value: 4, use: { hunger: 26, mind: 4 }, desc: '温室里长出来的绿色，比罐头贵得多。' },

  // 御寒装备（可穿戴，不计入普通消耗）
  down_jacket: { id: 'down_jacket', name: '羽绒服', cat: 'build', bulk: 2, value: 14, equip: { warmthResist: 1 }, desc: '室外行动必备，体温压力的第一层缓冲。' },
  snow_boots:  { id: 'snow_boots', name: '雪地靴', cat: 'build', bulk: 2, value: 10, equip: { warmthResist: 1 }, desc: '冻伤多数从脚开始。' },

  // 特殊
  blueprint: { id: 'blueprint', name: '蓝图', cat: 'special', bulk: 1, value: 20, desc: '解锁高级设施与强化路线。' },
  gas_mask:  { id: 'gas_mask', name: '防毒面具', cat: 'special', bulk: 1, value: 18, desc: '第二季毒雾的入场券。' },
};

export const item = (id) => ITEMS[id] ?? { id, name: id, cat: 'special', bulk: 1, value: 0, desc: '未知物品' };
export const ITEM_LIST = Object.values(ITEMS);
export const byCategory = (cat) => ITEM_LIST.filter((i) => i.cat === cat);

/** 加工配方（项目书 §10 加工设施）：in → out，workshop 为所需设施等级。 */
export const RECIPES = [
  { id: 'scrap_parts', name: '零件', workshop: 1, minutes: 60, in: { metal: 1, wood: 1 }, out: { parts: 1 }, desc: '拆解金属与木料，做出可用零件。' },
  { id: 'melt_water', name: '净水', workshop: 1, minutes: 45, in: { firewood: 1 }, out: { purified: 2 }, desc: '烧雪取水，体力活但不难。' },
  { id: 'cook_meat', name: '熟食', workshop: 2, minutes: 60, in: { frozen_meat: 1, firewood: 1 }, out: { canned: 2 }, desc: '把冻肉处理成便于储存的食物。' },
  { id: 'insulate_wrap', name: '保温材料', workshop: 2, minutes: 90, in: { wood: 1, metal: 1 }, out: { insulation: 1 }, desc: '自制保温层，替代工业保温棉。' },
  { id: 'craft_ammo', name: '弹药', workshop: 3, minutes: 90, in: { metal: 2, parts: 1 }, out: { ammo: 2 }, desc: '复装弹药，需要精密零件。' },
  { id: 'greenhouse_kit', name: '温室材料', workshop: 3, minutes: 120, in: { insulation: 1, parts: 1 }, out: { seeds: 1, fertilizer: 1 }, desc: '把保温层改造成可种植的苗床。' },
];
