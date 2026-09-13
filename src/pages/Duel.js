/**
 * 对战页（商业化升级追加需求：战力系统要能跟 NPC 打架）。
 * 对手全是 NPC —— 人类阵营（掠夺者 / 凛冬城守卫 / 战力榜挑战者）与感染者、尸潮。
 * 页面只做展示与发起：胜负由 systems/Battle.js 的回合制结算，后果由赌注合并进 Outcome。
 * @module pages/Duel
 */
import { h } from '../core/dom.js';
import { btn, card, empty, progress, sectionTitle, tag } from '../ui/components.js';
import * as Battle from '../systems/Battle.js';
import * as Duel from '../systems/Duel.js';
import * as Power from '../systems/Power.js';

const VERDICT_KIND = { 稳赢: 'good', 有把握: 'good', 五五开: 'warn', 送死: 'bad' };

/** 页面局部状态：按阵营筛选。 */
const ui = { side: 'all' };

export function DuelPage(ctx) {
  const state = ctx.state;
  const all = Duel.view(state);
  const ready = all.filter((d) => !d.locked);
  const sides = ['all', ...Object.keys(Duel.SIDES)];
  const rows = ui.side === 'all' ? all : all.filter((d) => d.side === ui.side);

  return h('div', { class: 'col' },
    card([
      h('div', { class: 'row between' },
        h('span', { class: 'strong' }, '对战'),
        tag(`可打 ${ready.length} / ${all.length}`, ready.length > 0 ? 'good' : '')),
      h('div', { class: 'xs muted', style: { marginTop: '6px' } },
        '真人 PVP 需要服务端，现在还没有；对手都是 NPC。战力越高，同一场仗掉的血越少。'),
      h('div', { class: 'row', style: { gap: '10px', marginTop: '10px' } },
        h('span', { class: 'tag mind' }, `攻击 ${Battle.playerAtk(state)}`),
        h('span', { class: 'tag' }, `防护 ${Battle.playerDef(state)}`),
        h('span', { class: 'tag' }, `战力 ${Power.calc(state)}`),
        Power.locked(state) ? null : h('span', { class: 'tag warn' }, `榜上 #${Power.myRank(state)}`)),
    ], { cls: 'mind' }),

    h('div', { class: 'chips' }, sides.map((s) => h('button', {
      class: 'chip',
      'aria-pressed': ui.side === s ? 'true' : 'false',
      onClick: () => { ui.side = s; ctx.refresh(); },
    }, s === 'all' ? '全部' : Duel.SIDES[s]))),

    rows.length === 0 ? empty('这个阵营暂时没有可以打的对手。') : null,

    h('div', { class: 'col' }, rows.map((d) => {
      const o = d.odds;
      return card([
        h('div', { class: 'row between' },
          h('div', { class: 'row', style: { gap: '8px' } },
            h('span', { class: 'strong' }, d.name),
            tag(Duel.SIDES[d.side] ?? '', d.side === 'lindong' ? 'mind' : d.side === 'raider' ? 'warn' : '')),
          o ? tag(o.verdict, VERDICT_KIND[o.verdict] ?? '') : null),
        h('div', { class: 'small muted', style: { marginTop: '4px' } }, d.desc),
        o
          ? h('div', { class: 'xs muted', style: { marginTop: '8px' } },
            `对手 ${o.enemyHp} 血 / ${o.enemyAtk} 攻｜你每回合打 ${o.dmgOut}，约 ${o.rounds} 回合｜预计掉血 ${o.expectedLoss}`)
          : null,
        d.locked && d.lockReason
          ? h('div', { class: 'xs', style: { marginTop: '6px', color: 'var(--c-warn)' } }, d.lockReason)
          : null,
        h('div', { class: 'btn-group', style: { marginTop: '10px' } },
          btn(d.done ? '今天打过了' : '动手', {
            kind: 'primary', sm: true,
            disabled: d.locked,
            reason: d.lockReason,
            onClick: () => ctx.apply(Duel.challenge(state, d.id)),
          }),
          d.done ? tag('每日一次', '') : null),
      ], { cls: d.locked ? 'flat' : '' });
    })),

    card([
      sectionTitle('规矩'),
      h('div', { class: 'small muted' },
        '每个对手每天只能打一次；打完的后果写在对战结算里 —— 打掠夺者会被掠夺者记住、'
        + '也让凛冬城高看你一眼；打凛冬城守卫等于和城里翻脸。战力不够时建议先升级武器、'
        + '强化装备、攒晶核，再回来打。'),
    ], { cls: 'flat' }),
  );
}

export default DuelPage;
