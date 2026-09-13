/**
 * 游戏主界面（项目书 §19.2）：四信息区 + 快捷行动。
 * 第一区六项状态、第二区核心资源、第三区今日任务、第四区最近事件。
 * @module pages/Game
 */
import { h } from '../core/dom.js';
import { btn, card, empty, logItem, sectionTitle, tag } from '../ui/components.js';
import { statGrid } from '../ui/shell.js';
import { fmtDuration } from '../core/util.js';
import { capacity, countCategory, used } from '../systems/Inventory.js';
import { condition } from '../systems/Survival.js';
import { band } from '../systems/Fame.js';
import * as Base from '../systems/Base.js';
import * as Faction from '../systems/Faction.js';
import * as GameTime from '../systems/GameTime.js';
import * as Mind from '../systems/Mind.js';
import * as Quest from '../systems/Quest.js';
import { recap } from '../systems/Story.js';

export function Game(ctx) {
  const state = ctx.state;
  const cond = condition(state);
  const b = band(state.fame);
  const hint = Mind.hint(state);
  const active = Quest.today(state);
  const cap = capacity(state);

  const resources = [
    { icon: '🍖', label: '食物', value: countCategory(state, 'food') },
    { icon: '💧', label: '饮水', value: countCategory(state, 'water') },
    { icon: '🔥', label: '能源', value: countCategory(state, 'energy') },
    { icon: '🧱', label: '建材', value: countCategory(state, 'build') },
    { icon: '⛑️', label: '医疗', value: countCategory(state, 'medical') },
    { icon: '💰', label: '货币', value: state.currency },
  ];

  return h('div', { class: 'col' },
    // 光脑提示条
    card([
      h('div', { class: 'row between' },
        h('div', { class: 'row', style: { gap: '8px' } },
          h('span', { class: 'strong' }, `💠 光脑 Lv.${state.mindLevel}`),
          tag(hint.brain.name, 'mind'),
          tag(cond.text, cond.kind)),
        btn('光脑', { kind: 'ghost', sm: true, onClick: () => ctx.go('mind') })),
      h('div', { class: 'col', style: { marginTop: '10px' } },
        hint.lines.map((l) => h('div', { class: 'small muted' }, l))),
    ], { cls: 'mind' }),

    // 第一信息区
    card([
      sectionTitle('生存状态', h('span', { class: 'xs muted' }, `${GameTime.phaseLabel(state)} · 剩余 ${fmtDuration(GameTime.remaining(state))}`)),
      statGrid(state),
      h('div', { class: 'btn-group', style: { marginTop: '12px' } },
        btn('休息到次日 06:00', { onClick: () => ctx.sleep(), disabled: state.time < 1080, reason: '22:00 之后才能休息', block: true, kind: 'primary' }),
        btn('行动', { onClick: () => ctx.go('action') })),
    ]),

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
        btn('设施升级', { kind: 'ghost', sm: true, onClick: () => ctx.go('base') })),
    ]),

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
