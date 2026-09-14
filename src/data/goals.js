/**
 * 长期目标（V3.0 策划案 §十三）。
 * 无限生存没有通关，但需要一个"往哪走"的方向感 —— 这四条就是玩家的长期追求：
 * 建立大型避难城市 / 培养幸存者团队 / 研发高级科技 / 探索冰封世界。
 * 每条都有可度量的进度，达成就永久留在存档里（不重置、不结束游戏）。
 * @module data/goals
 */
import { MAX_TECH_LEVEL } from './tech.js';

export const GOALS = [
  {
    id: 'city',
    name: '建立大型避难城市',
    icon: '🌆',
    desc: '把基地从临时营地做成一座能住人的地下城市。',
    /** 进度 0—1；steps 是给玩家看的阶段刻度。 */
    progress: (s) => {
      const total = Object.values(s.base ?? {}).reduce((a, b) => a + (b ?? 0), 0);
      return Math.min(1, total / 60);
    },
    detail: (s) => `设施等级合计 ${Object.values(s.base ?? {}).reduce((a, b) => a + (b ?? 0), 0)} / 60`,
  },
  {
    id: 'team',
    name: '培养幸存者团队',
    icon: '🧑🤝🧑',
    desc: '让活下来的人成长起来：转职、健康、人数都要看。',
    progress: (s) => {
      const alive = Object.values(s.npcs ?? {}).filter((r) => r.met && r.alive !== false && !r.left && !r.joinFaction);
      if (alive.length === 0) return 0;
      const grown = alive.filter((r) => (r.crewXp ?? 0) >= 36).length;
      return Math.min(1, (alive.length / 6) * 0.5 + (grown / 4) * 0.5);
    },
    detail: (s) => {
      const alive = Object.values(s.npcs ?? {}).filter((r) => r.met && r.alive !== false && !r.left && !r.joinFaction);
      const grown = alive.filter((r) => (r.crewXp ?? 0) >= 36).length;
      return `在岗 ${alive.length} 人｜已成长 ${grown} 人`;
    },
  },
  {
    id: 'tech',
    name: '研发高级科技',
    icon: '🔬',
    desc: '五条科技线推进到高级，靠科技对冲越来越冷的冬天。',
    progress: (s) => {
      const total = Object.values(s.tech ?? {}).reduce((a, b) => a + (b ?? 0), 0);
      return Math.min(1, total / (MAX_TECH_LEVEL * 5));
    },
    detail: (s) => `科技等级合计 ${Object.values(s.tech ?? {}).reduce((a, b) => a + (b ?? 0), 0)} / ${MAX_TECH_LEVEL * 5}`,
  },
  {
    id: 'world',
    name: '探索冰封世界',
    icon: '🧭',
    desc: '把五个城区都走一遍，并推进到第三阶段。',
    progress: (s) => {
      const regions = ['home', 'market', 'industry', 'north', 'mountain'].filter((r) => s.flags?.[`visited_region_${r}`]).length;
      const phase = s.day >= 101 ? 1 : s.day >= 31 ? 0.5 : 0;
      return Math.min(1, (regions / 5) * 0.6 + phase * 0.4);
    },
    detail: (s) => {
      const regions = ['home', 'market', 'industry', 'north', 'mountain'].filter((r) => s.flags?.[`visited_region_${r}`]).length;
      return `已到访 ${regions} / 5 个城区｜生存第 ${s.day} 天`;
    },
  },
];

export const goal = (id) => GOALS.find((g) => g.id === id) ?? GOALS[0];
export const GOAL_IDS = GOALS.map((g) => g.id);
