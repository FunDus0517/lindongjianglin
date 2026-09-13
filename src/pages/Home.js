/**
 * 首页与启动页（项目书 §19.1、附录C 启动页 / 首页 / 新游戏确认页 / 历史记录页）。
 * @module pages/Home
 */
import { h } from '../core/dom.js';
import { btn, card, confirmDanger, modal, sectionTitle, tag } from '../ui/components.js';
import { CHAPTERS } from '../data/chapters.js';
import { CONTENT_DAYS, completedMilestone, milestoneById } from '../systems/Story.js';
import * as Save from '../systems/Save.js';
import { fmtClock } from '../core/util.js';

/** 章节回顾弹窗：已开放的打勾，未开放的标注后续版本。 */
function chapterReview(state) {
  const reached = state?.day ?? 1;
  const done = completedMilestone(reached) ?? milestoneById('M1');
  modal({
    title: '章节回顾',
    body: [
      h('div', { class: 'col' }, CHAPTERS.map((c) => h('div', { class: 'line' },
        h('span', { class: 'ic' }, c.day <= reached ? '📖' : c.day <= CONTENT_DAYS ? '🔓' : '🔒'),
        h('div', { class: 'grow' },
          h('div', { class: 'row', style: { gap: '8px' } },
            h('span', { class: 'strong' }, `第 ${c.day} 天 · ${c.title}`),
            c.day <= CONTENT_DAYS ? tag('已开放', 'good') : tag('后续版本', '')),
          h('div', { class: 'xs muted' }, c.synopsis))))),
      h('div', { class: 'xs muted' }, `当前构建已开放第 1—${CONTENT_DAYS} 天（${done.id}：${done.title}）。`),
    ],
  });
}

export function Home(ctx) {
  const state = ctx.state;
  const summary = Save.summary();
  const latest = Save.load();
  const info = latest.ok ? latest.state : null;

  return h('div', { class: 'col', style: { paddingTop: '6vh' } },
    h('div', { class: 'col', style: { gap: '6px', marginBottom: '28px' } },
      h('div', { class: 'hero-logo' }, '凛冬降临'),
      h('div', { class: 'hero-sub' }, 'FROSTFALL · 纯文字点击式末世生存')),

    card([
      h('div', { class: 'narrative small muted' },
        '六月十九日，下午四点零七分。\n冰雹砸穿城市，气温在两小时内跌了三十度。\n\n你要做的，是活到第三十天。'),
      h('div', { class: 'btn-group', style: { marginTop: '16px' } },
        summary
          ? btn('继续游戏', { kind: 'primary', block: true, onClick: () => ctx.continueGame(), title: `第 ${summary.day} 天 · ${summary.chapter}` })
          : null,
        btn(summary ? '重新开始' : '开始游戏', {
          kind: summary ? '' : 'primary',
          block: true,
          onClick: () => {
            if (!summary) { ctx.newGame(); return; }
            confirmDanger({
              title: '覆盖当前进度？',
              text: `当前存档在第 ${summary.day} 天（${summary.chapter}）。开始新游戏会清空这一局。`,
              confirmLabel: '开始新游戏',
              onConfirm: () => ctx.newGame(),
            });
          },
        })),
      summary
        ? h('div', { class: 'xs muted center', style: { marginTop: '10px' } },
          `存档：第 ${summary.day} 天 ${info ? fmtClock(info.time) : ''} · ${summary.reason ?? '自动保存'}`)
        : h('div', { class: 'xs muted center', style: { marginTop: '10px' } }, '尚无存档，将从第 1 天开始'),
    ], { cls: 'mind' }),

    sectionTitle('章节回顾', btn('全部 30 天', { kind: 'ghost', sm: true, onClick: () => chapterReview(state) })),
    card(h('div', { class: 'col' }, CHAPTERS.slice(0, 3).map((c) => h('div', { class: 'row between' },
      h('span', { class: 'small' }, `第 ${c.day} 天 · ${c.title}`),
      c.day <= CONTENT_DAYS ? tag('已开放', 'good') : tag('后续版本', '')))), { cls: 'flat' }),

    card([
      h('div', { class: 'small muted' }, '《凛冬降临》 V3.0 项目 · M1 里程碑构建'),
      h('div', { class: 'xs muted', style: { marginTop: '6px' } }, '剧情 / 生存 / 经营 / 决策 · 数据驱动 SPA'),
      h('div', { class: 'btn-group', style: { marginTop: '12px' } },
        btn('系统设置', { kind: 'ghost', sm: true, onClick: () => ctx.go('settings') }),
        btn('历史记录', { kind: 'ghost', sm: true, onClick: () => ctx.go('game') })),
    ], { cls: 'flat' }));
}

export default Home;
