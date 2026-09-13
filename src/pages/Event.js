/**
 * 事件选择页（项目书 §8、附录C）：叙事文本 + 状态信息 + 选项按钮。
 * 每个选项都会真实改变时间、资源、状态、关系、Flag 或结局条件。
 * @module pages/Event
 */
import { h } from '../core/dom.js';
import { btn, card, tag } from '../ui/components.js';
import { statGrid } from '../ui/shell.js';
import { fmtClock } from '../core/util.js';
import { countCategory } from '../systems/Inventory.js';
import * as Event from '../systems/Event.js';
import * as GameTime from '../systems/GameTime.js';
import * as Weather from '../systems/Weather.js';

export function EventPage(ctx) {
  const state = ctx.state;
  const view = Event.current(state);
  if (!view) {
    return card([
      h('div', { class: 'narrative' }, '这里暂时没有需要处理的事情。'),
      btn('返回主页', { kind: 'primary', block: true, onClick: () => ctx.go('game') }),
    ]);
  }

  return h('div', { class: 'col' },
    h('div', { class: 'row between' },
      h('div', { class: 'row', style: { gap: '8px' } },
        tag(`第 ${state.day} 天 ${fmtClock(state.time)}`, 'mind'),
        view.location ? tag(view.location) : null,
        tag(Weather.weather(state.weather).name)),
      h('span', { class: 'xs muted' }, state.queue.length > 0 ? `后续还有 ${state.queue.length} 段剧情` : '')),

    card([
      h('div', { class: 'card-title' }, view.title),
      h('div', { class: 'narrative', style: { marginTop: '12px' } }, view.text),
    ], { cls: 'mind' }),

    // 手机上最重要的顺序：读完正文就能直接点选项，状态信息放在后面当参考
    h('div', { class: 'col' }, view.choices.map((c) => h('div', { class: 'col stack-1' },
      btn(c.label, {
        block: true,
        kind: c.enabled ? 'primary' : '',
        disabled: !c.enabled,
        reason: c.reason,
        onClick: () => ctx.choose(c.id),
      }),
      c.reason ? h('div', { class: 'xs', style: { color: 'var(--c-warn)' } }, `不可选：${c.reason}`) : c.hint ? h('div', { class: 'xs muted' }, c.hint) : null))),

    card([
      h('div', { class: 'xs muted', style: { marginBottom: '8px' } }, '当前状态（决策参考）'),
      statGrid(state, ['hp', 'warmth', 'energy', 'mind']),
      h('div', { class: 'row wrap', style: { gap: '8px', marginTop: '10px' } },
        tag(`🍖 食物 ${countCategory(state, 'food')}`),
        tag(`💧 饮水 ${countCategory(state, 'water')}`),
        tag(`🔥 能源 ${countCategory(state, 'energy')}`),
        tag(`⛑️ 医疗 ${countCategory(state, 'medical')}`),
        tag(`💰 ${state.currency}`),
        tag(`锋芒 ${state.fame}`)),
    ], { cls: 'flat' }),
  );
}

export default EventPage;
