/**
 * 排班分工（V3.0 策划案 §十三、§四：把"经营"这一层真正交给玩家）。
 * 幸存者每天可以被指派一项工作，工作产出取决于他的职业等级与健康。
 * @module data/jobs
 */

export const JOBS = [
  {
    id: 'scavenge', name: '外出搜刮', icon: '🎒',
    desc: '带回食物、饮水与零件。健康差的人容易在外面出事。',
    out: { food: 1, water: 1 },
    risk: 1.0,
  },
  {
    id: 'guard', name: '守夜', icon: '🔭',
    desc: '降低夜袭与凌晨灾害的发生频率。',
    risk: 0.6,
  },
  {
    id: 'medic', name: '照看伤病', icon: '⛑️',
    desc: '让受伤的人恢复得更快，玩家也能得到一点治疗。',
    risk: 0.2,
  },
  {
    id: 'engineer', name: '工程维护', icon: '🔧',
    desc: '产出零件与金属，基地更耐用。',
    out: { parts: 1 },
    risk: 0.4,
  },
  {
    id: 'logistics', name: '后勤', icon: '🍲',
    desc: '提高士气，并把仓储整理得更顺（食物产出 +1）。',
    out: { food: 1 },
    risk: 0.2,
  },
  {
    id: 'rest', name: '休息', icon: '🛏️',
    desc: '恢复健康与压力。给累坏的人排一班休息，比硬撑划算。',
    risk: 0,
  },
];

export const job = (id) => JOBS.find((j) => j.id === id) ?? JOBS[0];
export const DEFAULT_JOB = 'scavenge';
export const JOB_IDS = JOBS.map((j) => j.id);
