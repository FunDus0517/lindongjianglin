/**
 * 游戏主界面（项目书 §19.2）：四信息区 + 快捷行动。
 * 第一区六项状态、第二区核心资源、第三区今日任务、第四区最近事件。
 * @module pages/Game
 */
import { h } from '../core/dom.js';
import { btn, card, empty, logItem, modal, progress, sectionTitle, tag } from '../ui/components.js';
import { statGrid } from '../ui/shell.js';
import { fmtDuration } from '../core/util.js';
import { capacity, countCategory, used } from '../systems/Inventory.js';
import { condition } from '../systems/Survival.js';
import { band } from '../systems/Fame.js';
import * as Achievement from '../systems/Achievement.js';
import * as Assistant from '../systems/Assistant.js';
import * as Base from '../systems/Base.js';
import * as Daily from '../systems/Daily.js';
import * as Death from '../systems/Death.js';
import * as Duel from '../systems/Duel.js';
import * as Faction from '../systems/Faction.js';
import * as GameTime from '../systems/GameTime.js';
import * as Growth from '../systems/Growth.js';
import * as Mind from '../systems/Mind.js';
import * as Quest from '../systems/Quest.js';
import * as Weather from '../systems/Weather.js';
import { recap } from '../systems/Story.js';
import * as Tutorial from '../data/tutorial.js';

/** 阶段总结弹窗（第 30 天起每 10 天一份；不结束游戏，只是给你一个评价）。 */
function reportSheet(state) {
  const list = [...(state.reports ?? [])].reverse();
  modal({
    title: '阶段总结',
    body: [
      h('div', { class: 'small muted' }, '这些不是结局——你还在继续。它只是按目前的活法给出的评价。'),
      h('div', { class: 'col', style: { marginTop: '12px' } }, list.map((r) => h('div', { class: 'line' },
        h('span', { class: 'ic' }, '📄'),
        h('div', { class: 'grow' },
          h('div', { class: 'row between' },
            h('span', { class: 'strong' }, `第 ${r.day} 天 · ${r.title}`),
            h('span', { class: 'xs muted' }, `战力 ${r.stats?.战力 ?? '—'}`)),
          h('div', { class: 'xs muted' }, r.desc?.split('\n')[0] ?? ''))))),
    ],
  });
}

export function Game(ctx) {
  const state = ctx.state;
  const cond = condition(state);
  const b = band(state.fame);
  const hint = Mind.hint(state);
  const active = Quest.today(state);
  const cap = capacity(state);
  const growth = Growth.view(state);
  const daily = Daily.view(state);
  const fc = Weather.forecast(state);
  const risk = Death.atRisk(state);
  const showTutorial = Tutorial.shouldShow(state);
  const step = Tutorial.stepOf(state);
  const duelReady = Duel.view(state).filter((d) => !d.locked).length;
  const ach = Achievement.view(state);
  const lastReport = (state.reports ?? [])[(state.reports ?? []).length - 1] ?? null;
  const ass = Assistant.assistant(state);

  const resources = [
    { icon: '🍖', label: '食物', value: countCategory(state, 'food') },
    { icon: '💧', label: '饮水', value: countCategory(state, 'water') },
    { icon: '🔥', label: '能源', value: countCategory(state, 'energy') },
    { icon: '🧱', label: '建材', value: countCategory(state, 'build') },
    { icon: '⛑️', label: '医疗', value: countCategory(state, 'medical') },
    { icon: '💰', label: '货币', value: state.currency },
  ];

  return h('div', { class: 'col' },
    // 新手引导（第 1—2 天、未看完时出现，可跳过）
    showTutorial
      ? card([
        h('div', { class: 'row between' },
          h('span', { class: 'strong' }, `新手引导 ${Tutorial.stepIndex(state) + 1} / ${Tutorial.TUTORIAL_STEPS}`),
          tag('可以跳过', '')),
        h('div', { class: 'strong', style: { marginTop: '10px' } }, step.title),
        h('div', { class: 'small muted', style: { marginTop: '6px' } }, step.text),
        h('div', { class: 'xs muted', style: { marginTop: '8px' } }, `💡 ${step.hint}`),
        h('div', { class: 'btn-group', style: { marginTop: '12px' } },
          btn(Tutorial.stepIndex(state) >= Tutorial.TUTORIAL_STEPS - 1 ? '开始游戏' : '下一步', {
            kind: 'primary', block: true,
            onClick: () => { Tutorial.advance(state); ctx.refresh(); },
          }),
          btn('跳过引导', { kind: 'ghost', sm: true, onClick: () => { Tutorial.skip(state); ctx.refresh(); } })),
      ], { cls: 'mind' })
      : null,

    // 光脑 AI 助手（方案 §十）：天气预测 / 资源分析 / 危险预警 / 生存建议
    card([
      h('div', { class: 'row between' },
        h('div', { class: 'row', style: { gap: '8px' } },
          h('span', { class: 'strong' }, `💠 光脑 Lv.${state.mindLevel}`),
          tag(hint.brain.name, 'mind'),
          tag(cond.text, cond.kind)),
        btn('光脑', { kind: 'ghost', sm: true, onClick: () => ctx.go('mind') })),
      h('div', { class: 'col', style: { gap: '8px', marginTop: '10px' } },
        h('div', null,
          h('div', { class: 'xs muted' }, '天气预测'),
          ass.weather.map((l) => h('div', { class: 'small' }, l))),
        h('div', null,
          h('div', { class: 'xs muted' }, '资源分析'),
          ass.resources.map((l) => h('div', { class: 'small' }, l))),
        h('div', null,
          h('div', { class: 'xs muted' }, '危险预警'),
          ass.danger.map((l) => h('div', { class: ass.dangerLevel === 'warn' ? 'small' : 'small muted' }, `· ${l}`))),
        h('div', null,
          h('div', { class: 'xs muted' }, '生存建议'),
          ass.advice.map((l, i) => h('div', { class: 'small strong' }, `${i + 1}. ${l}`))),
        h('div', null,
          h('div', { class: 'xs muted' }, '基地管理'),
          ass.manage.map((l) => h('div', { class: 'small muted' }, `· ${l}`)))),
    ], { cls: 'mind' }),

    // 第一信息区
    card([
      sectionTitle('生存状态', h('span', { class: 'xs muted' }, `${GameTime.phaseLabel(state)} · 剩余 ${fmtDuration(GameTime.remaining(state))}`)),
      statGrid(state),
      h('div', { class: 'row wrap', style: { gap: '6px', marginTop: '10px' } },
        tag(`${fc.w.icon} 明日预报 ${fc.w.name}`, 'mind'),
        tag(`生存等级 Lv.${growth.level}｜${growth.title}`, 'good'),
        state.flags.endless ? tag(`♾️ 无尽模式 · 第 ${state.day - 30} 天`, 'mind') : null,
        risk.total > 0 ? tag(`⚠️ 倒下会丢 ${risk.total} 件`, 'warn') : null),
      h('div', { class: 'btn-group', style: { marginTop: '12px' } },
        btn('休息到次日 06:00', { onClick: () => ctx.sleep(), disabled: state.time < 1080, reason: '22:00 之后才能休息', block: true, kind: 'primary' }),
        btn('行动', { onClick: () => ctx.go('action') })),
    ]),

    // 每日任务（商业化升级新增）：完成即时发奖，不设领取步骤
    daily
      ? card([
        h('div', { class: 'row between' },
          h('span', { class: 'strong' }, `每日任务 ${daily.done} / ${daily.total}`),
          daily.streak > 0 ? tag(`连续 ${daily.streak} 天`, 'good') : tag(daily.bonus ? '今日已领完' : '每天 06:00 刷新', '')),
        h('div', { class: 'col', style: { marginTop: '10px' } }, daily.tasks.map((t) => h('div', { class: 'stat' },
          h('div', { class: 'stat-head' },
            h('span', null, `${t.done ? '✅' : '▫️'} ${t.name}`),
            h('span', { class: 'strong' }, `${t.progress} / ${t.target}`)),
          h('div', { class: 'bar ' + (t.done ? 'energy' : 'mind') },
            h('i', { style: { width: `${Math.min(100, (t.progress / t.target) * 100)}%` } }))))),
        h('div', { class: 'row between', style: { marginTop: '10px' } },
          h('span', { class: 'xs muted' }, '全部完成额外奖励：货币 +40、晶核 +1、经验 +20'),
          btn('成就与成长', { kind: 'ghost', sm: true, onClick: () => ctx.go('achievement') })),
      ], { cls: daily.bonus ? 'flat' : '' })
      : null,

    // 第二信息区
    card([
      sectionTitle('仓库概览', h('span', { class: 'xs muted' }, `容量 ${used(state)}/${cap}`)),
      h('div', { class: 'grid three' }, resources.map((r) => h('div', { class: 'line', onClick: () => ctx.go('warehouse') },
        h('span', { class: 'ic' }, r.icon),
        h('div', { class: 'grow' }, h('div', { class: 'xs muted' }, r.label), h('div', { class: 'strong' }, String(r.value)))))),
      h('div', { class: 'xs muted', style: { marginTop: '8px' } },
        `战力 ${state.power}｜锋芒 ${state.fame}（${b.label}）｜基地等级合计 ${Object.values(state.base).reduce((a, x) => a + x, 0)}`),
      h('div', { class: 'row wrap', style: { gap: '6px', marginTop: '8px' } },
        tag(`👥 互助 ${state.aid?.members ?? 0} 人｜士气 ${Math.round(state.aid?.morale ?? 0)}`, (state.aid?.morale ?? 0) >= 40 ? 'good' : (state.aid?.morale ?? 0) >= 20 ? 'warn' : 'bad'),
        state.base.power > 0
          ? tag(state.flags.energy_ok === false ? '🔌 能源停摆：光脑加成失效' : '🔌 能源正常', state.flags.energy_ok === false ? 'bad' : 'good')
          : tag('🔌 无能源设施', ''),
        ...Faction.visible(state).filter((f) => f.id !== 'aidnet').map((f) => tag(`${f.icon} ${f.name} ${f.value}`, f.value >= 25 ? 'good' : f.value <= -25 ? 'bad' : ''))),
      h('div', { class: 'btn-group', style: { marginTop: '10px' } },
        btn('人物与互助', { kind: 'ghost', sm: true, onClick: () => ctx.go('characters') }),
        btn('设施升级', { kind: 'ghost', sm: true, onClick: () => ctx.go('base') }),
        btn(`对战（可打 ${duelReady}）`, { kind: duelReady > 0 ? 'mind' : 'ghost', sm: true, onClick: () => ctx.go('duel') }),
        btn(`成就 ${ach.unlocked}/${ach.total}`, { kind: 'ghost', sm: true, onClick: () => ctx.go('achievement') })),
    ]),

    // 阶段总结（无尽模式）：不结束游戏，只是一个评价
    lastReport
      ? card([
        h('div', { class: 'row between' },
          h('span', { class: 'strong' }, `📄 第 ${lastReport.day} 天阶段总结：${lastReport.title}`),
          btn('全部总结', { kind: 'ghost', sm: true, onClick: () => reportSheet(state) })),
        h('div', { class: 'small muted', style: { marginTop: '6px' } }, '这不是结局。冬天没有结束，你也没有。'),
      ], { cls: 'flat' })
      : null,

    // 第三信息区
    card([
      sectionTitle('今日任务', btn('任务页', { kind: 'ghost', sm: true, onClick: () => ctx.go('quest') })),
      active.length === 0
        ? empty('今天的任务都完成了。')
        : h('div', { class: 'col' }, active.map((q) => {
          const [cur, target] = Quest.progressOf(state, q.id);
          return h('div', { class: 'line' },
            h('span', { class: 'ic' }, q.kind === '主线' ? '📌' : q.kind === '紧急' ? '⚠️' : '📋'),
            h('div', { class: 'grow' },
              h('div', { class: 'row between' }, h('span', { class: 'strong small' }, q.title), h('span', { class: 'xs muted' }, `${cur}/${target}`)),
              h('div', { class: 'xs muted' }, q.desc)),
            btn('去', { kind: 'ghost', sm: true, onClick: () => ctx.go(q.kind === '人物' ? 'characters' : 'action') }));
        })),
    ]),

    // 第四信息区
    card([
      sectionTitle('最近事件', h('span', { class: 'xs muted' }, `行动 ${state.actions} 次`)),
      state.log.length === 0 ? empty('还没有发生任何事。') :
        h('div', { class: 'log' }, state.log.slice(-8).reverse().map(logItem)),
    ]),

    card([
      sectionTitle('基地速览'),
      h('div', { class: 'row wrap', style: { gap: '8px' } },
        Base.FACILITIES.filter((f) => Base.level(state, f.id) > 0).map((f) => tag(`${f.icon} ${f.name} Lv.${Base.level(state, f.id)}`, 'mind'))),
      Base.FACILITIES.every((f) => Base.level(state, f.id) === 0) ? h('div', { class: 'small muted' }, '所有设施均为 0 级，去基地页升级供暖与仓库。') : null,
      h('div', { class: 'btn-group', style: { marginTop: '10px' } },
        btn('基地管理', { kind: 'ghost', sm: true, onClick: () => ctx.go('base') }),
        btn('章节回顾', { kind: 'ghost', sm: true, onClick: () => ctx.go('home') })),
    ], { cls: 'flat' }),

    // 导航（PC 端侧栏之外的内容区快捷入口）
    h('div', { class: 'row wrap', style: { gap: '6px' } },
      recap(state).slice(-3).map((c) => tag(`第 ${c.day} 天 · ${c.title}`, c.day === state.day ? 'mind' : ''))),
  );
}

export default Game;
