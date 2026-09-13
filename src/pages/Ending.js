/**
 * 结局页（项目书 §18）：黑屏文字叙事 → 结局标题 → 结局说明 → 本局数据统计 → 重新开始。
 * @module pages/Ending
 */
import { h } from '../core/dom.js';
import { btn, card } from '../ui/components.js';
import { ending } from '../data/endings.js';

export function EndingPage(ctx) {
  const state = ctx.state;
  const e = state.ending ? ending(state.ending.id) : null;
  if (!e) {
    return card([
      h('div', { class: 'narrative' }, '这一局还没有结束。'),
      btn('返回主页', { kind: 'primary', block: true, onClick: () => ctx.go('game') }),
    ]);
  }

  return h('div', { class: 'col ending' },
    h('div', { class: 'xs muted' }, `第 ${state.ending.day} 天 · ${e.kind === 'death' ? '生存终止' : '最终结算'}`),
    h('h1', { style: { color: e.tone === 'bad' ? 'var(--c-bad)' : 'var(--c-mind)' } }, e.title),
    h('div', { class: 'narrative', style: { maxWidth: '520px', margin: '0 auto' } }, e.desc),

    card([
      h('div', { class: 'strong', style: { marginBottom: '10px' } }, '本局数据统计'),
      h('div', { class: 'col', style: { gap: '6px' } },
        Object.entries(state.ending.stats).map(([k, v]) => h('div', { class: 'row between' },
          h('span', { class: 'small muted' }, k),
          h('span', { class: 'strong small' }, String(v))))),
    ]),

    h('div', { class: 'btn-group', style: { justifyContent: 'center' } },
      btn('重新开始', { kind: 'primary', onClick: () => ctx.newGame() }),
      btn('返回首页', { onClick: () => ctx.go('home') }),
      btn('查看记录', { kind: 'ghost', onClick: () => ctx.go('settings') })),
  );
}

export default EndingPage;
