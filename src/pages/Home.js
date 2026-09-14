/**
 * 首页与启动页（项目书 §19.1、附录C 启动页 / 首页 / 新游戏确认页 / 历史记录页）。
 * @module pages/Home
 */
import { h } from '../core/dom.js';
import { btn, card, confirmDanger, modal, sectionTitle, tag } from '../ui/components.js';
import { PHASES, chapterOf, phaseOf } from '../data/chapters.js';
import { CHAPTERS } from '../data/chapters.js';
import { CONTENT_DAYS, completedMilestone, milestoneById } from '../systems/Story.js';
import * as Save from '../systems/Save.js';
import * as Weather from '../systems/Weather.js';
import { fmtClock } from '../core/util.js';
import { LABEL as BUILD_LABEL } from '../data/build.js';

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

/** 章节回顾弹窗：第一阶段逐日，之后按阶段显示。 */
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

  return h('div', { class: 'col', style: { paddingTop: '5vh' } },
    h('div', { class: 'col', style: { gap: '6px', marginBottom: '24px' } },
      h('div', { class: 'hero-logo' }, '凛冬降临'),
      h('div', { class: 'hero-sub' }, 'FROSTFALL · 无限生存'),

      // 天气信息（方案 §七：启动界面要有天气）
      w
        ? h('div', { class: 'row center', style: { gap: '10px', justifyContent: 'center', marginTop: '10px' } },
          tag(`${w.icon} ${w.name}`, 'mind'),
          tag(`${Math.round(temp)}℃`, ''),
          tag(`第 ${day} 天`, ''),
          tag(`${phase.name}`, phase.id === 'P1' ? 'good' : phase.id === 'P2' ? 'warn' : 'bad'))
        : tag('还没有开始。第一阶段的雪，比你记得的更大。', ''),
    ),

    card([
      h('div', { class: 'narrative small muted' },
        '六月十九日，下午四点零七分。\n冰雹砸穿城市，气温在两小时内跌了三十度。\n\n没有人来救你。你要做的是活下去，然后把这点活下去的东西，变成一座还能住人的地方。'),
      h('div', { class: 'btn-group', style: { marginTop: '16px' } },
        summary
          ? btn('继续生存', { kind: 'primary', block: true, onClick: () => ctx.continueGame(), title: `第 ${summary.day} 天 · ${summary.chapter}` })
          : null,
        btn(summary ? '新旅程（覆盖存档）' : '开始生存', {
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
        ? h('div', { class: 'xs muted center', style: { marginTop: '10px' } },
          `存档：第 ${summary.day} 天 ${info ? fmtClock(info.time) : ''} · ${summary.reason ?? '自动保存'}`)
        : h('div', { class: 'xs muted center', style: { marginTop: '10px' } }, '尚无存档，将从第 1 天开始'),
    ], { cls: 'mind' }),

    sectionTitle('世界阶段', btn('阶段说明', { kind: 'ghost', sm: true, onClick: () => phaseReview(state, info) })),
    card(h('div', { class: 'col' }, PHASES.map((p) => h('div', { class: 'row between' },
      h('span', { class: 'small' }, `${p.id === phaseOf(day).id ? '▶️' : p.from <= day ? '✅' : '🔒'} ${p.name}`),
      h('span', { class: 'xs muted' }, p.to ? `第 ${p.from}—${p.to} 天` : `第 ${p.from} 天起 · 无限`)))), { cls: 'flat' }),

    sectionTitle('第一阶段回顾', btn('全部 30 天', { kind: 'ghost', sm: true, onClick: () => chapterReview(state) })),
    card(h('div', { class: 'col' }, CHAPTERS.slice(0, 3).map((c) => h('div', { class: 'row between' },
      h('span', { class: 'small' }, `第 ${c.day} 天 · ${c.title}`),
      c.day <= day ? tag('已走过', 'good') : tag('还没到')))), { cls: 'flat' }),

    card([
      h('div', { class: 'small muted' }, '《凛冬降临》 无限生存构建'),
      h('div', { class: 'xs muted', style: { marginTop: '2px' } }, BUILD_LABEL),
      h('div', { class: 'xs muted', style: { marginTop: '6px' } }, '无限生存经营 · 剧情事件 · 基地成长'),
      h('div', { class: 'btn-group', style: { marginTop: '12px' } },
        btn('系统设置', { kind: 'ghost', sm: true, onClick: () => ctx.go('settings') }),
        btn('历史记录', { kind: 'ghost', sm: true, onClick: () => ctx.go('game') })),
    ], { cls: 'flat' }));
}

export default Home;
