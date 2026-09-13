/**
 * 交易区商品（项目书 §4 第 21 天：经济系统与稀缺资源流通）。
 * 价格不是固定值：基准价 × 日期系数 × 锋芒系数 × 势力折扣 × 当日波动。
 * scalar 商品（晶核）不走仓库，直接计入货币式资源。
 * @module data/market
 */
export const MARKET_UNLOCK_DAY = 21;

export const GOODS = [
  { id: 'canned', base: 9, stock: 6, desc: '硬通货，价格随天数走高。' },
  { id: 'bottled_water', base: 7, stock: 6, desc: '断水比断粮更快致命。' },
  { id: 'charcoal', base: 8, stock: 5, desc: '取暖燃料，极夜前后翻倍。' },
  { id: 'fuel', base: 28, stock: 2, desc: '发电机与供暖的命门，长期缺货。' },
  { id: 'medicine', base: 18, stock: 3, desc: '医院配额之外，只能在这里补。' },
  { id: 'bandage', base: 8, stock: 6, desc: '最常用的消耗品。' },
  { id: 'insulation', base: 15, stock: 4, desc: '保温材料，寒潮前的抢手货。' },
  { id: 'parts', base: 13, stock: 4, desc: '设施升级件。' },
  { id: 'ammo', base: 11, stock: 5, desc: '远程选项的消耗品。' },
  { id: 'seeds', base: 12, stock: 3, desc: '农业路线的起点。' },
  { id: 'cores', scalar: true, base: 65, stock: 2, desc: '晶核。强化系统的唯一通货。' },
];

export const good = (id) => GOODS.find((g) => g.id === id);
