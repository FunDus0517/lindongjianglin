/**
 * 光脑助手（无限生存方案 §十：光脑不是菜单，而是 AI 助手）。
 * 提供四块：天气预测、资源分析、危险预警、生存建议。
 * 全部由规则从当前状态推导，不含任何隐藏数值 —— 玩家看到的和系统的判断是同一份数据。
 * @module systems/Assistant
 */
import { count, countCategory, capacity, used } from './Inventory.js';
import { META } from './Survival.js';
import * as Base from './Base.js';
import * as Duel from './Duel.js';
import * as Tech from './Tech.js';
import * as Weather from './Weather.js';
import * as Growth from './Growth.js';

/** 食物/饮水按当前消耗还能撑几天（粗略但有用）。 */
function runwayDays(state, cat) {
  const total = countCategory(state, cat);
  const perDay = cat === 'food' ? 4 : 4;
  return { total, days: Math.floor(total / perDay) };
}

export function assistant(state) {
  const w = Weather.weather(state.weather);
  const fc = Weather.forecast(state);
  const ambient = Weather.ambient(state);
  const s = state.stats;
  const food = runwayDays(state, 'food');
  const water = runwayDays(state, 'water');
  const fuel = count(state, 'fuel') + count(state, 'charcoal') + count(state, 'firewood');
  const form = Base.form(state);
  const tech = Tech.view(state).filter((t) => !t.max);

  /* 1. 天气预测 */
  const weather = [
    `今日「${w.icon} ${w.name}」，室外约 ${ambient}℃（体感修正：搜刮 ×${w.lootMod}、风险 ×${w.riskMod}）。`,
    `明日预报「${fc.w.icon} ${fc.w.name}」，可信度 ${Math.round(fc.accuracy * 100)}% —— 剩下的是偏差风险。`,
  ];

  /* 2. 资源分析 */
  const resources = [
    `食物 ${food.total} 份（约 ${food.days} 天）｜饮水 ${water.total} 份（约 ${water.days} 天）｜燃料 ${fuel} 份`,
    `仓库 ${used(state)} / ${capacity(state)}｜货币 ${state.currency}｜晶核 ${state.cores}｜蓝图 ${count(state, 'blueprint')}`,
    `${form.icon} ${form.name}：室内保温 +${Math.round(Base.indoorWarmth(state))}℃｜生存等级 Lv.${Growth.level(state)}`,
  ];

  /* 3. 危险预警 */
  const danger = [];
  if (s.hp < 35) danger.push(`生命 ${Math.round(s.hp)}：再挨一次就要倒地了。`);
  if (s.warmth < 40) danger.push(`体温 ${Math.round(s.warmth)}：低于 35 会开始冻伤。`);
  if (s.hunger < 25) danger.push(`饥饿 ${Math.round(s.hunger)}：饿着会持续掉血。`);
  if (s.thirst < 25) danger.push(`饮水 ${Math.round(s.thirst)}：脱水比饥饿更快。`);
  if (s.mind < 30) danger.push(`精神 ${Math.round(s.mind)}：会影响判断与部分选项。`);
  const raidEvery = Math.max(2, Math.round(((state.base?.defense ?? 0) + Tech.bonus(state).defense >= 4 ? 6 : 3) * (1 + Tech.bonus(state).raidRisk)));
  if (state.day % raidEvery === 0) danger.push('今晚是夜袭的高风险日（防御越高间隔越长）。');
  if (state.flags.energy_ok === false) danger.push('能源停摆：光脑加成失效，夜里没有照明。');
  if ((state.aid?.morale ?? 100) < 25 && (state.aid?.members ?? 0) > 0) danger.push('互助体系士气很低，有人可能会走。');
  for (const f of Object.values(state.factions ?? {})) {
    if ((f.standing ?? 0) <= -50) danger.push(`有势力已经把你当目标（立场 ${f.standing}）。`);
    break;
  }
  if (danger.length === 0) danger.push('当前没有需要立刻处理的危险。');

  /* 4. 生存建议（按紧急度排序，最多三条） */
  const advice = [];
  if (s.warmth < 45) advice.push(`先解决体温：回屋加炭，或把供暖/住所升一级（当前保温 ${Math.round(Base.indoorWarmth(state))}℃）。`);
  if (s.hunger < 30) advice.push('吃点东西：仓库里能用就直接用，别等到掉血。');
  if (s.thirst < 30) advice.push('烧雪取水（加工设施），或者去交易区换净水。');
  if (s.energy < 25) advice.push('精力见底了，休息到次日比硬撑更划算。');
  if (food.days <= 2) advice.push('食物储备不足两天：优先去超市/地下室搜刮，或者找老猫买。');
  if (fuel < 3) advice.push('燃料快没了：供暖一停，夜里会出事。');
  if (tech.length > 0 && tech[0].available) advice.push(`可以研究「${tech[0].name}」（${tech[0].next?.desc ?? ''}）。`);
  const duelable = Duel.view(state).filter((d) => !d.locked && d.odds?.verdict !== '送死');
  if (duelable.length > 0 && s.hp > 70) advice.push(`有 ${duelable.length} 个对手今天还能打（例如${duelable[0].name}），赢了有物资与立场收益。`);
  if ((state.stats.mind ?? 100) < 50) advice.push('和人说说话、或者睡一觉，精神掉太多会让选项变少。');
  if (advice.length === 0) advice.push('状态不错。趁天气好出去搜刮，或者推进科技。');

  return {
    weather,
    resources,
    danger: danger.slice(0, 4),
    advice: advice.slice(0, 3),
    dangerLevel: danger.length > 1 ? 'warn' : 'good',
  };
}

export { META };
