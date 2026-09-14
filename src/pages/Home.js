/**
 * 启动页（V3.0 §七 · UI 重做规范 §三.7）。
 * 按设计稿：雪原背景 + 大标题「末日之下 守护希望」+ 副标题 + 主按钮，
 * 下方是存档信息、世界阶段与第一阶段回顾入口。
 * 文案契约保持不变（开始生存 / 继续生存 / 载入记录），测试与引导流程都依赖它。
 * @module pages/Home
 */
import { h } from '../core/dom.js';
import { btn, card, confirmDanger, modal, sectionTitle, tag } from '../ui/components.js';
import { PHASES, chapterOf, phaseOf, CHAPTERS } from '../data/chapters.js';
import { CONTENT_DAYS, completedMilestone, milestoneById } from '../systems/Story.js';
import { LABEL as BUILD_LABEL } from '../data/build.js';
import * as Save from '../systems/Save.js';
import * as Weather from '../systems/Weather.js';
import { fmtClock } from '../core/util.js';

/** 世界阶段回顾弹窗（无限生存：阶段不会结束，只会改变世界状态）。 */
function phaseReview(state, info) {
  const day = state?.day ?? info?.day ?? 1;
  const cur = phaseOf(day);
  modal({
    title: '世界阶段',
    body: [
      h('div', { class: 'small muted' }, '阶段不会结束，只会改变世界 —— 温度、资源、危险与新区域。'),
      h('div', { class: 'col', style: { marginTop: '12px' } }, PHASES.map((p) => h('div', { class: 'line' },
        h('span', { class: 'ic' }, p.id === cur.id ? '▶️' : p.from <= day ? '✅' : '🔒'),
        h('div', { class: 'grow' },
          h('div', { class: 'row', style: { gap: '8px' } },
            h('span', { class: 'strong' }, `${p.name}`),
            h('span', { class: 'xs muted' }, p.to ? `第 ${p.from}—${p.to} 天` : `第 ${p.from} 天起 · 无限`)),
          h('div', { class: 'xs muted' }, p.desc))))),
      h('div', { class: 'xs muted', style: { marginTop: '10px' } },
        `第 1—${CONTENT_DAYS} 天逐日编排，之后由阶段曲线驱动：越往后越冷、能捡的越少、人越危险。`),
    ],
  });
}

/** 第一阶段回顾弹窗：逐日章节 + 里程碑。 */
function chapterReview(state) {
  const reached = state?.day ?? 1;
  const done = completedMilestone(reached) ?? milestoneById('M1');
  modal({
    title: '第一阶段回顾',
    body: [
      h('div', { class: 'col' }, CHAPTERS.map((c) => h('div', { class: 'line' },
        h('span', { class: 'ic' }, c.day <= reached ? '📖' : '🔒'),
        h('div', { class: 'grow' },
          h('div', { class: 'row', style: { gap: '8px' } },
            h('span', { class: 'strong' }, `第 ${c.day} 天 · ${c.title}`),
            c.day <= reached ? tag('已走过', 'good') : tag('还没到')),
          h('div', { class: 'xs muted' }, c.synopsis))))),
      h('div', { class: 'xs muted' }, `第一阶段共 ${CONTENT_DAYS} 天（${done.id}：${done.title}）。之后进入永冬时代，没有终点。`),
    ],
  });
}

export function Home(ctx) {
  const state = ctx.state;
  const summary = Save.summary();
  const latest = Save.load();
  const info = latest.ok ? latest.state : null;
  const day = info?.day ?? 1;
  const phase = phaseOf(day);
  const w = info ? Weather.weather(info.weather) : null;
  const temp = info ? Weather.ambient(info) : null;

  return h('div', { class: 'col hero-page' },
    // ── 标题区（设计稿：大标题 + 副标题 + 主按钮 + 当前世界状态）
    h('div', { class: 'hero-block' },
      h('div', { class: 'hero-kicker' }, '凛冬降临'),
      h('div', { class: 'hero-title' }, '末日之下'),
      h('div', { class: 'hero-title hero-title-2' }, '守护希望'),
      h('div', { class: 'hero-line' }, '— 冰寒末日生存之旅 —'),

      w
        ? h('div', { class: 'row wrap', style: { gap: '8px', justifyContent: 'center', marginTop: '14px' } },
          tag(`${w.icon} ${w.name}`, 'mind'),
          tag(`${Math.round(temp)}℃`, ''),
          tag(`第 ${day} 天`, ''),
          tag(phase.name, phase.id === 'P1' ? 'good' : phase.id === 'P2' ? 'warn' : 'bad'))
        : null,

      h('div', { class: 'hero-actions' },
        summary
          ? btn('继续生存', { kind: 'primary', block: true, onClick: () => ctx.continueGame() })
          : null,
        btn(summary ? '新旅程' : '开始生存', {
          kind: summary ? '' : 'primary',
          block: true,
          onClick: () => {
            if (!summary) { ctx.newGame(); return; }
            confirmDanger({
              title: '覆盖当前进度？',
              text: `当前存档在第 ${summary.day} 天（${summary.chapter}）。开始新旅程会清空这一局。`,
              confirmLabel: '开始新旅程',
              onConfirm: () => ctx.newGame(),
            });
          },
        }),
        btn('载入记录', { kind: 'ghost', block: true, onClick: () => (summary ? ctx.continueGame() : ctx.go('settings')) })),
      summary
        ? h('div', { class: 'xs hero-save' }, `存档：第 ${summary.day} 天 ${info ? fmtClock(info.time) : ''} · ${summary.reason ?? '自动保存'}`)
        : h('div', { class: 'xs hero-save' }, '还没有存档。第一阶段的雪，比你记得的更大。'),
    ),

    card([
      h('div', { class: 'narrative small muted' },
        '六月十九日，下午四点零七分。\n冰雹砸穿城市，气温在两小时内跌了三十度。\n\n没有人来救你。你要做的是活下去，然后把这点活下去的东西，变成一座还能住人的地方。'),
    ], { cls: 'flat' }),

    sectionTitle('世界阶段', btn('阶段说明', { kind: 'ghost', sm: true, onClick: () => phaseReview(state, info) })),
    card(h('div', { class: 'col' }, PHASES.map((p) => h('div', { class: 'row between' },
      h('span', { class: 'small' }, `${p.id === phaseOf(day).id ? '▶️' : p.from <= day ? '✅' : '🔒'} ${p.name}`),
      h('span', { class: 'xs muted' }, p.to ? `第 ${p.from}—${p.to} 天` : `第 ${p.from} 天起 · 无限`)))), { cls: 'flat' }),

    sectionTitle('第一阶段回顾', btn('全部 30 天', { kind: 'ghost', sm: true, onClick: () => chapterReview(state) })),
    card(h('div', { class: 'col' }, CHAPTERS.slice(0, 3).map((c) => h('div', { class: 'row between' },
      h('span', { class: 'small' }, `第 ${c.day} 天 · ${c.title}`),
      c.day <= day ? tag('已走过', 'good') : tag('还没到')))), { cls: 'flat' }),

    card([
      h('div', { class: 'small muted' }, '无限生存经营 · 剧情事件 · 基地成长'),
      h('div', { class: 'xs muted', style: { marginTop: '2px' } }, BUILD_LABEL),
      h('div', { class: 'btn-group', style: { marginTop: '12px' } },
        btn('系统设置', { kind: 'ghost', sm: true, onClick: () => ctx.go('settings') }),
        btn('历史记录', { kind: 'ghost', sm: true, onClick: () => ctx.go('game') })),
    ], { cls: 'flat' }));
}

export default Home;
