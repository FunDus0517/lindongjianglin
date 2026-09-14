/**
 * 科技树（无限生存方案 §四：长期成长目标）。
 * 四条线：供暖 / 能源 / 探索 / 防御，各自独立升级，用晶核与蓝图研究。
 * 它们的作用是**对冲世界恶化**：阶段越往后越冷、越少、越危险，只有科技能跟上。
 * @module data/tech
 */

export const MAX_TECH_LEVEL = 5;

/**
 * 每条线的每一级：cost 是研究成本，effect 是叠加到系统上的加成。
 * effect 字段会被 systems/Tech.js 汇总，接入点见那个文件的 bonus()。
 */
export const TECH_LINES = [
  {
    id: 'heat', name: '供暖科技', icon: '🔥',
    desc: '从"烧得更旺"到"把热留在屋里"。',
    effect: { warmth: 2 },   // 每级 +2℃ 室内保温
    levels: [
      { cost: { cores: 2 }, desc: '炉膛加衬：室内保温 +2℃' },
      { cost: { cores: 3, blueprint: 1 }, desc: '管路保温：室内保温 +2℃' },
      { cost: { cores: 5, blueprint: 1 }, desc: '热风循环：室内保温 +2℃' },
      { cost: { cores: 8, blueprint: 2 }, desc: '地暖层：室内保温 +2℃' },
      { cost: { cores: 12, blueprint: 2 }, desc: '余热回收：室内保温 +2℃' },
    ],
  },
  {
    id: 'power', name: '能源科技', icon: '🔌',
    desc: '同样的燃料，撑更久。',
    effect: { fuelSave: 0.12 },   // 每级降低 12% 燃油消耗
    levels: [
      { cost: { cores: 2 }, desc: '线路整理：燃油消耗 −12%' },
      { cost: { cores: 3, blueprint: 1 }, desc: '稳压改造：燃油消耗 −12%' },
      { cost: { cores: 5, blueprint: 1 }, desc: '余热发电：燃油消耗 −12%' },
      { cost: { cores: 8, blueprint: 2 }, desc: '低温电池：燃油消耗 −12%' },
      { cost: { cores: 12, blueprint: 2 }, desc: '地热接入：燃油消耗 −12%' },
    ],
  },
  {
    id: 'explore', name: '探索科技', icon: '🧭',
    desc: '同样的路线，带回更多东西。',
    effect: { loot: 0.1 },   // 每级 +10% 搜刮收益
    levels: [
      { cost: { cores: 2 }, desc: '路线标记：搜刮收益 +10%' },
      { cost: { cores: 3, blueprint: 1 }, desc: '轻便雪橇：搜刮收益 +10%' },
      { cost: { cores: 5, blueprint: 1 }, desc: '结构扫描：搜刮收益 +10%' },
      { cost: { cores: 8, blueprint: 2 }, desc: '无人机侦察：搜刮收益 +10%' },
      { cost: { cores: 12, blueprint: 2 }, desc: '深层勘探：搜刮收益 +10%' },
    ],
  },
  {
    id: 'defense', name: '防御科技', icon: '🛡️',
    desc: '让人少受伤，让墙更难爬。',
    effect: { defense: 1, raidRisk: -0.08 },   // 每级 +1 防护、夜间出事概率下降
    levels: [
      { cost: { cores: 2 }, desc: '门闩加固：防护 +1，夜袭风险 −8%' },
      { cost: { cores: 3, blueprint: 1 }, desc: '瞭望孔：防护 +1，夜袭风险 −8%' },
      { cost: { cores: 5, blueprint: 1 }, desc: '铁丝网：防护 +1，夜袭风险 −8%' },
      { cost: { cores: 8, blueprint: 2 }, desc: '缓冲门厅：防护 +1，夜袭风险 −8%' },
      { cost: { cores: 12, blueprint: 2 }, desc: '警报系统：防护 +1，夜袭风险 −8%' },
    ],
  },
];

export const techLine = (id) => TECH_LINES.find((t) => t.id === id) ?? null;

/** 某一级的研究成本（越往后越贵）。 */
export function costOf(lineId, level) {
  const line = techLine(lineId);
  if (!line) return null;
  const idx = Math.min(Math.max(level, 0), line.levels.length - 1);
  return line.levels[idx]?.cost ?? null;
}

export const TECH_IDS = TECH_LINES.map((t) => t.id);
