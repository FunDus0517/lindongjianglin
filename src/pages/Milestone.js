/**
 * 阶段总结页（无限生存版）：不再有"内容到此为止"的里程碑边界。
 * 世界进入新阶段时给玩家一份总结 —— 只是回顾，不是终点。
 * @module pages/Milestone
 */
import { h } from '../core/dom.js';
import { btn, card, progress, tag } from '../ui/components.js';
import { PHASES, chapterOf, phaseOf } from '../data/chapters.js';
import { band } from '../systems/Fame.js';
import * as Assistant from '../systems/Assistant.js';
import * as Base from '../systems/Base.js';
import * as Tech from '../systems/Tech.js';

export function MilestonePage(ctx) {
  const state = ctx.state;
  const phase = phaseOf(state.day);
  const b = band(state.fame);
  const rep = (state.reports ?? [])[(state.reports ?? []).length - 1] ?? null;
  const ass = Assistant.assistant(state);
  const form = Base.form(state);

  return h('div', { class: 'col', style: { paddingTop: '4vh' } },
    h('div', { class: 'center' },
      h('div', { class: 'hero-sub' }, `世界阶段 · ${phase.name}`),
      h('h1', { style: { fontSize: 'var(--fs-2xl)', margin: '10px 0' } }, `第 ${state.day} 天`),
      h('div', { class: 'small muted' }, phase.desc),
      h('div', { class: 'xs muted', style: { marginTop: '6px' } }, `阶段不会结束，只改变世界状态 —— 气温继续下降、资源继续变少、危险继续增加。`),
    ),

    card([
      h('div', { class: 'strong', style: { marginBottom: '10px' } }, '当前世界状态'),
      h('div', { class: 'col', style: { gap: '6px' } },
        h('div', { class: 'row between' }, h('span', { class: 'small muted' }, '章节'), h('span', { class: 'strong small' }, chapterOf(state.day).title)),
        h('div', { class: 'row between' }, h('span', { class: 'small muted' }, '室外气温'), h('span', { class: 'strong small' }, `${ass.weather[0] ? '' : ''}${Math.round(state.stats.warmth)} 体温`)),
        h('div', { class: 'row between' }, h('span', { class: 'small muted' }, '基地形态'), h('span', { class: 'strong small' }, `${form.icon} ${form.name}（设施合计 ${Base.totalLevels(state)}）`)),
        h('div', { class: 'row between' }, h('span', { class: 'small muted' }, '科技'), h('span', { class: 'strong small' }, `合计 Lv.${Tech.totalLevels(state)}`)),
        h('div', { class: 'row between' }, h('span', { class: 'small muted' }, '幸存者'), h('span', { class: 'strong small' }, `互助 ${state.aid?.members ?? 0} 人｜士气 ${Math.round(state.aid?.morale ?? 0)}`)),
        h('div', { class: 'row between' }, h('span', { class: 'small muted' }, '战力 / 锋芒'), h('span', { class: 'strong small' }, `${state.power}｜${state.fame}（${b.label}）`)),
        h('div', { class: 'row between' }, h('span', { class: 'small muted' }, '本局倒地次数'), h('span', { class: 'strong small' }, `${state.death?.deaths ?? 0} 次`))),
      h('div', { style: { marginTop: '10px' } },
        progress(state.day - phase.from + 1, Math.max(1, (phase.to ?? phase.from + 99) - phase.from + 1), { cls: 'mind', showText: true, label: '本阶段已走' })),
    ], { cls: 'mind' }),

    rep
      ? card([
        h('div', { class: 'row between' },
          h('span', { class: 'strong' }, `评价：${rep.title}`),
          tag(rep.phaseFrom ? `${rep.phaseFrom} → ${rep.phaseTo}` : '阶段总结', 'good')),
        h('div', { class: 'small muted', style: { marginTop: '6px' } }, rep.desc?.split('\n')[0] ?? ''),
      ], { cls: 'flat' })
      : null,

    card([
      h('div', { class: 'row between' }, h('span', { class: 'strong' }, '世界阶段'), tag(`${PHASES.length} 个阶段 · 无限延续`, 'mind')),
      h('div', { class: 'col', style: { marginTop: '10px' } }, PHASES.map((p) => h('div', { class: 'row between' },
        h('span', { class: 'small muted' }, `${p.id === phase.id ? '▶️' : p.from <= state.day ? '✅' : '🔒'} ${p.name}`),
        h('span', { class: 'xs muted' }, p.to ? `第 ${p.from}—${p.to} 天` : `第 ${p.from} 天起`)))),
      h('div', { class: 'xs muted', style: { marginTop: '10px' } },
        '第一阶段的逐日剧情走完之后，剧本事件会按"解锁顺序"进入随机池继续出现；随机事件、地点、人物与经营循环永远继续。'),
    ], { cls: 'flat' }),

    card([
      h('div', { class: 'strong', style: { marginBottom: '8px' } }, '光脑建议'),
      ass.advice.map((l, i) => h('div', { class: 'small' }, `${i + 1}. ${l}`)),
    ], { cls: 'flat' }),

    h('div', { class: 'btn-group' },
      btn('继续生存', { kind: 'primary', block: true, onClick: () => { ctx.clearMilestone(); ctx.go('game'); } })),
    h('div', { class: 'xs muted center' }, '这份总结只是回顾。世界还在变冷，你的基地还得继续往上盖。'),
  );
}

export default MilestonePage;
