/**
 * 战斗页（项目书 §15、附录C）：文字状态面板 + 指令按钮 + 战斗日志。
 * @module pages/Battle
 */
import { h } from '../core/dom.js';
import { btn, card, tag } from '../ui/components.js';
import * as Battle from '../systems/Battle.js';
import * as Inventory from '../systems/Inventory.js';

export function BattlePage(ctx) {
  const state = ctx.state;
  const b = Battle.snapshot(state);
  if (!b) {
    return card([
      h('div', { class: 'narrative' }, '当前没有战斗。'),
      btn('返回主页', { kind: 'primary', block: true, onClick: () => ctx.go('game') }),
    ]);
  }

  const enemyRatio = b.maxHp > 0 ? b.hp / b.maxHp : 0;
  const over = b.over;

  return h('div', { class: 'col' },
    h('div', { class: 'row between' },
      tag(`第 ${b.round} 回合`),
      tag(`战力 ${b.power}`, 'mind')),

    card([
      h('div', { class: 'row between' },
        h('div', { class: 'row', style: { gap: '8px' } }, h('span', { class: 'ic' }, b.icon), h('span', { class: 'strong' }, b.name)),
        h('span', { class: 'xs muted' }, `Lv.${b.level}｜攻 ${b.atk} 防 ${b.def}`)),
      h('div', { class: 'battle-hp', style: { marginTop: '10px' } },
        h('div', { class: 'stat-head' }, h('span', null, '敌方生命'), h('span', { class: 'strong' }, `${Math.round(b.hp)} / ${b.maxHp}`)),
        h('div', { class: 'bar hp' }, h('i', { style: { width: `${enemyRatio * 100}%` } }))),
    ], { cls: 'mind' }),

    card([
      h('div', { class: 'stat-head' }, h('span', null, '你的生命'), h('span', { class: 'strong' }, `${Math.round(state.stats.hp)} / 100`)),
      h('div', { class: 'bar hp' }, h('i', { style: { width: `${state.stats.hp}%` } })),
      h('div', { class: 'row wrap', style: { gap: '8px', marginTop: '10px' } },
        tag(`⚔️ 攻击 ${b.playerAtk}`),
        tag(`🛡️ 防御 ${b.playerDef}`),
        tag(`⚡ 精力 ${Math.round(state.stats.energy)}`),
        tag(`🧠 精神 ${Math.round(state.stats.mind)}`),
        tag(`🔫 弹药 ${Inventory.count(state, 'ammo')}`)),
    ], { cls: 'flat' }),

    card([
      h('div', { class: 'xs muted', style: { marginBottom: '8px' } }, '战斗日志'),
      h('div', { class: 'log' }, b.log.slice(-8).map((l) => h('div', { class: 'log-item' }, l))),
    ], { cls: 'flat' }),

    over
      ? h('div', { class: 'col' },
        card([
          h('div', { class: 'card-title' }, b.result === 'win' ? '战斗结束：胜利' : b.result === 'escape' ? '战斗结束：脱离' : '战斗结束'),
          h('div', { class: 'small muted', style: { marginTop: '8px' } },
            b.result === 'win' ? '对方失去了行动能力。你开始收拾能带走的东西。' : '你保住了命，但没拿到任何东西。'),
        ], { cls: 'mind' }),
        btn('继续', { kind: 'primary', block: true, onClick: () => ctx.afterBattle() }))
      : h('div', { class: 'col' }, Battle.moves(state).map((m) => h('div', { class: 'col stack-1' },
        btn(`${m.label}｜${m.desc}`, {
          block: true,
          kind: m.id === 'retreat' ? '' : m.id === 'attack' ? 'primary' : '',
          disabled: !m.enabled,
          reason: m.reason,
          onClick: () => ctx.battleMove(m.id),
        }),
        m.reason ? h('div', { class: 'xs', style: { color: 'var(--c-warn)' } }, m.reason) : h('div', { class: 'xs muted' }, `耗时约 ${m.minutes} 分钟`)))),

    h('div', { class: 'xs muted center' }, '战斗结果由战力、装备、精力、精神与随机因素共同决定。'),
  );
}

export default BattlePage;
