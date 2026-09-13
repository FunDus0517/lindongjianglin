/**
 * 里程碑结算页：每一阶段内容边界。
 * 这一页只做一件事：如实告诉玩家当前构建已开放到哪里（不伪造后续内容）。
 * @module pages/Milestone
 */
import { h } from '../core/dom.js';
import { btn, card, tag } from '../ui/components.js';
import { CHAPTERS } from '../data/chapters.js';
import { CONTENT_DAYS, milestoneById, nextMilestone } from '../systems/Story.js';
import { band } from '../systems/Fame.js';

export function MilestonePage(ctx) {
  const state = ctx.state;
  const done = milestoneById(state.milestone ?? 'M1');
  const next = nextMilestone(done.id);
  const upcoming = CHAPTERS.filter((c) => c.day > CONTENT_DAYS).filter((c) => c.day <= next.through);
  const b = band(state.fame);

  return h('div', { class: 'col', style: { paddingTop: '4vh' } },
    h('div', { class: 'center' },
      h('div', { class: 'hero-sub' }, `${done.id} 里程碑完成`),
      h('h1', { style: { fontSize: 'var(--fs-2xl)', margin: '10px 0' } }, `你活过了${done.label}`),
      h('div', { class: 'small muted' }, `第 ${CONTENT_DAYS} 天结束 · 当前构建开放范围到此为止`),
    ),

    card([
      h('div', { class: 'strong', style: { marginBottom: '10px' } }, '本局进度'),
      h('div', { class: 'col', style: { gap: '6px' } },
        h('div', { class: 'row between' }, h('span', { class: 'small muted' }, '生存天数'), h('span', { class: 'strong small' }, `${state.day - 1} 天`)),
        h('div', { class: 'row between' }, h('span', { class: 'small muted' }, '剩余生命'), h('span', { class: 'strong small' }, `${Math.round(state.stats.hp)}`)),
        h('div', { class: 'row between' }, h('span', { class: 'small muted' }, '光脑等级'), h('span', { class: 'strong small' }, `Lv.${state.mindLevel}`)),
        h('div', { class: 'row between' }, h('span', { class: 'small muted' }, '战力'), h('span', { class: 'strong small' }, `${state.power}`)),
        h('div', { class: 'row between' }, h('span', { class: 'small muted' }, '锋芒值'), h('span', { class: 'strong small' }, `${state.fame}（${b.label}）`)),
        h('div', { class: 'row between' }, h('span', { class: 'small muted' }, '互助体系'), h('span', { class: 'strong small' }, `${state.aid?.members ?? 0} 人｜士气 ${Math.round(state.aid?.morale ?? 0)}`)),
        h('div', { class: 'row between' }, h('span', { class: 'small muted' }, '基地等级合计'), h('span', { class: 'strong small' }, `${Object.values(state.base).reduce((a, x) => a + x, 0)}`)),
        h('div', { class: 'row between' }, h('span', { class: 'small muted' }, '战斗记录'), h('span', { class: 'strong small' }, `${Object.values(state.kills ?? {}).reduce((a, x) => a + x, 0)} 次击杀`))),
    ], { cls: 'mind' }),

    card([
      h('div', { class: 'row between' }, h('span', { class: 'strong' }, `下一步：${next.id} ${next.label}`), tag(next.title, 'warn')),
      h('div', { class: 'xs muted', style: { marginTop: '6px' } }, `开发重点：${next.focus}`),
      h('div', { class: 'col', style: { marginTop: '10px' } },
        upcoming.slice(0, 5).map((c) => h('div', { class: 'row between' },
          h('span', { class: 'small muted' }, `第 ${c.day} 天 · ${c.title}`),
          h('span', { class: 'xs muted' }, '待开发')))),
      h('div', { class: 'xs muted', style: { marginTop: '10px' } },
        '天气曲线、温度压力、随机事件池、行动/仓库/基地/光脑/人物全部系统在第 11 天以后仍然生效；脚本剧情将在下一阶段逐日补齐。'),
    ], { cls: 'flat' }),

    h('div', { class: 'btn-group' },
      btn('重新开始一局', { kind: 'primary', block: true, onClick: () => ctx.newGame() }),
      btn('继续查看（自由生存）', { block: true, onClick: () => { ctx.clearMilestone(); ctx.go('game'); } })),
    h('div', { class: 'xs muted center' }, '选择“继续查看”后仍可自由行动、探索与经营，只是不再有脚本主线。'),
  );
}

export default MilestonePage;
