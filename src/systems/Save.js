/**
 * 存档系统（项目书 §21）：自动保存 + 手动保存。
 * 自动保存时机：每日刷新、关键剧情选择后、重大事件与结局。
 * 刷新页面后恢复最近进度；存档损坏时给出明确恢复机制而不是白屏。
 * @module systems/Save
 */
import { CHARACTERS } from '../data/characters.js';
import { FACTION_LIST } from '../data/factions.js';

export const SAVE_KEY = 'winterfall.save.v1';
export const VERSION = 1;
export const MAX_LOG = 60;

const storage = () => (typeof localStorage === 'undefined' ? null : localStorage);

/** 新局初始状态。所有字段都必须能序列化 —— 存档就是这一整个对象。 */
export function createState(seed = Math.floor(Math.random() * 1e9)) {
  const npcs = {};
  for (const c of Object.values(CHARACTERS)) {
    // 关系五个维度先给全默认值：data/characters.js 里只写了各自关心的轴，
    // 缺项会让界面算出 NaN（商业化升级新增的 conflict 就是这种情况）。
    npcs[c.id] = { favor: 0, trust: 0, loyalty: 0, stress: 0, conflict: 0, ...c.initial, met: false };
  }
  const factions = {};
  for (const f of FACTION_LIST) factions[f.id] = { ...f.initial };
  return {
    version: VERSION,
    seed,
    rngCursor: 0,
    day: 1,
    time: 360,
    weather: 'hail',
    chapterTitle: '冰雹降临',
    milestone: null,
    stats: { hp: 100, warmth: 62, hunger: 78, thirst: 78, energy: 100, mind: 82 },
    inventory: {
      canned: 2, bottled_water: 2, compressed: 1, bandage: 2,
      charcoal: 1, firewood: 2, wood: 2, metal: 1, pipe: 1, battery: 1,
      down_jacket: 1, snow_boots: 1,
    },
    worn: [],
    enhance: { person: 0, weapon: 0, gear: 0, facility: 0, greenhouse: 0 },
    base: { shelter: 0, storage: 0, heating: 0, power: 0, greenhouse: 0, medical: 0, defense: 0, workshop: 0 },
    baseUpgrades: { day: 1, count: 0 },
    // 商业化升级新增：每日任务 / 成就 / 角色成长 / 新手引导
    daily: { day: 1, tasks: [], done: 0, streak: 0, metrics: {}, bonus: false },
    achievements: {},
    growth: { level: 1, xp: 0 },
    tutorial: { step: 0, done: false },
    reports: [],   // 无尽模式的阶段总结（第 30 天起每 10 天一份）
    death: { deaths: 0, recent: [] },   // 倒地记录 + 最近入账（倒地会丢这一批）
    tech: {},                            // 科技树：heat / power / explore / defense
    npcs,
    factions,
    fame: 0,
    power: 10,
    currency: 40,
    cores: 0,
    mindLevel: 1,
    mindXp: 0,
    brain: 'analyst',
    allies: 0,
    quests: {},
    flags: {},
    kills: {},
    visited: {},
    market: { day: 0, stock: {} },
    aid: { members: 0, morale: 0, joined: [] },
    log: [],
    queue: [],
    active: null,
    battle: null,
    ending: null,
    playtime: 0,
    actions: 0,
    eventsSeen: 0,
    lastSave: null,
  };
}

export function serialize(state) {
  const copy = { ...state, log: state.log.slice(-MAX_LOG) };
  return JSON.stringify(copy);
}

/** 反序列化 + 结构校验。损坏或版本不符时返回可解释的失败，而不是抛异常。 */
export function restore(raw) {
  if (!raw) return { ok: false, reason: '没有存档' };
  let data;
  try { data = JSON.parse(raw); } catch { return { ok: false, reason: '存档已损坏，无法解析' }; }
  if (!data || typeof data !== 'object') return { ok: false, reason: '存档格式不正确' };
  if (data.version !== VERSION) return { ok: false, reason: `存档版本不兼容（${data.version} ≠ ${VERSION}）` };
  const base = createState(data.seed ?? 1);
  const merged = { ...base, ...data };
  // 逐层补齐，保证旧存档缺少的新字段不会导致运行期错误
  merged.stats = { ...base.stats, ...(data.stats ?? {}) };
  merged.base = { ...base.base, ...(data.base ?? {}) };
  merged.baseUpgrades = { ...base.baseUpgrades, ...(data.baseUpgrades ?? {}) };
  merged.daily = { ...base.daily, ...(data.daily ?? {}) };
  if (!Array.isArray(merged.daily.tasks)) merged.daily.tasks = [];
  merged.daily.metrics = { ...(data.daily?.metrics ?? {}) };
  merged.achievements = { ...(data.achievements ?? {}) };
  merged.growth = { ...base.growth, ...(data.growth ?? {}) };
  merged.tutorial = { ...base.tutorial, ...(data.tutorial ?? {}) };
  merged.reports = Array.isArray(data.reports) ? data.reports.slice(-12) : [];
  merged.death = { ...base.death, ...(data.death ?? {}) };
  if (!Array.isArray(merged.death.recent)) merged.death.recent = [];
  merged.death.deaths = Number(merged.death.deaths) || 0;
  merged.tech = { ...(data.tech ?? {}) };
  merged.enhance = { ...base.enhance, ...(data.enhance ?? {}) };
  merged.inventory = { ...(data.inventory ?? {}) };
  merged.flags = { ...(data.flags ?? {}) };
  merged.kills = { ...(data.kills ?? {}) };
  merged.visited = { ...(data.visited ?? {}) };
  merged.market = { ...base.market, ...(data.market ?? {}) };
  merged.market.stock = { ...(data.market?.stock ?? {}) };
  merged.aid = { ...base.aid, ...(data.aid ?? {}) };
  merged.quests = { ...(data.quests ?? {}) };
  merged.npcs = { ...base.npcs, ...(data.npcs ?? {}) };
  for (const id of Object.keys(base.npcs)) merged.npcs[id] = { ...base.npcs[id], ...(data.npcs?.[id] ?? {}) };
  merged.factions = { ...base.factions, ...(data.factions ?? {}) };
  for (const id of Object.keys(base.factions)) merged.factions[id] = { ...base.factions[id], ...(data.factions?.[id] ?? {}) };
  merged.log = Array.isArray(data.log) ? data.log.slice(-MAX_LOG) : [];
  if (!Array.isArray(merged.queue)) merged.queue = [];
  merged.active = null;      // 运行中的事件/战斗不跨会话恢复，避免半截状态
  merged.battle = null;
  return { ok: true, state: merged };
}

export function save(state, reason = '手动保存') {
  const ls = storage();
  state.lastSave = { at: { day: state.day, time: state.time }, reason, real: Date.now() };
  if (!ls) return false;
  try { ls.setItem(SAVE_KEY, serialize(state)); return true; } catch { return false; }
}

export function load() {
  const ls = storage();
  if (!ls) return { ok: false, reason: '当前环境不支持本地存档' };
  return restore(ls.getItem(SAVE_KEY));
}

export const hasSave = () => Boolean(storage()?.getItem(SAVE_KEY));

export function clear() { storage()?.removeItem(SAVE_KEY); }

/** 调试/测试用：损坏当前存档，验证恢复机制。 */
export function corrupt() { storage()?.setItem(SAVE_KEY, '{"version":1,broken'); }

/** 存档列表信息（首页“继续游戏”展示）。 */
export function summary(raw = storage()?.getItem(SAVE_KEY)) {
  const r = restore(raw);
  if (!r.ok) return null;
  const s = r.state;
  return { day: s.day, time: s.time, chapter: s.chapterTitle, saved: s.lastSave?.at ?? null, reason: s.lastSave?.reason ?? null };
}
