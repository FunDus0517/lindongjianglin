/**
 * 任务页（项目书 §16）：目标、进度、奖励、剩余时间、前置条件与完成状态。
 * @module pages/Quest
 */
import { h } from '../core/dom.js';
import { btn, card, empty, progress, sectionTitle, tag } from '../ui/components.js';
import { CHAPTERS } from '../data/chapters.js';
import { item } from '../data/items.js';
import { KIND_ORDER } from '../data/quests.js';
import * as Quest from '../systems/Quest.js';

const KIND_TAG = { 主线: 'mind', 紧急: 'bad', 生存: 'good', 人物: 'warn', 支线: '', 隐藏: '' };

/** 页面局部 UI 状态：默认只看进行中的任务，并限制单页卡片数量（手机上别滚十几屏）。 */
const ui = { filter: 'active', expanded: false };
const PAGE_SIZE = 6;
const FILTERS = [
  { id: 'active', label: '进行中' },
  { id: 'done', label: '已完成' },
  { id: 'all', label: '全部' },
];

function rewardText(r = {}) {
  const parts = [];
  for (const [id, n] of Object.entries(r.items ?? {})) parts.push(`${item(id).name}×${n}`);
  if (r.currency) parts.push(`货币+${r.currency}`);
  if (r.fame) parts.push(`锋芒+${r.fame}`);
  if (r.mindXp) parts.push(`光脑经验+${r.mindXp}`);
  return parts.length ? parts.join('、') : '无';
}

export function QuestPage(ctx) {
  const state = ctx.state;
  const all = Quest.list(state);
  const active = all.filter((q) => Quest.isActive(state, q.id));
  const done = all.filter((q) => Quest.isDone(state, q.id));
  const rows = ui.filter === 'active' ? active : ui.filter === 'done' ? done : all;
  // 全局分页：手机上默认最多渲染 6 张卡片，其余靠“展开剩余”
  const pageRows = ui.expanded ? rows : rows.slice(0, PAGE_SIZE);
  const hidden = rows.length - pageRows.length;
  const grouped = KIND_ORDER.map((k) => [k, pageRows.filter((q) => q.kind === k)]).filter(([, l]) => l.length > 0);
  const today = CHAPTERS.find((c) => c.day === state.day);
  const pendingToday = (today?.quests ?? []).filter((id) => !state.quests[id]);

  const countOf = (id) => (id === 'active' ? active.length : id === 'done' ? done.length : all.length);

  return h('div', { class: 'col' },
    card([
      h('div', { class: 'row between' },
        h('span', { class: 'strong' }, `第 ${state.day} 天 · ${today?.title ?? ''}`),
        tag(`进行中 ${active.length}｜已完成 ${done.length}`, 'mind')),
      h('div', { class: 'xs muted', style: { marginTop: '6px' } }, today?.synopsis ?? ''),
      pendingToday.length > 0
        ? h('div', { class: 'btn-group', style: { marginTop: '10px' } },
          btn(`接取今日任务（${pendingToday.length}）`, { kind: 'primary', onClick: () => { pendingToday.forEach((id) => Quest.accept(state, id)); ctx.refresh(); } }))
        : null,
    ], { cls: 'mind' }),

    h('div', { class: 'chips' }, FILTERS.map((f) => h('button', {
      class: 'chip',
      'aria-pressed': ui.filter === f.id ? 'true' : 'false',
      onClick: () => { ui.filter = f.id; ui.expanded = false; ctx.refresh(); },
    }, `${f.label}（${countOf(f.id)}）`))),

    rows.length === 0
      ? empty(ui.filter === 'done' ? '还没有完成任何任务。' : ui.filter === 'active' ? '当前没有进行中的任务。' : '还没有接到任何任务。')
      : null,

    grouped.map(([kind, list]) => h('div', { class: 'col' },
      sectionTitle(kind, h('span', { class: 'xs muted' }, `${list.length} 项`)),
      h('div', { class: 'col' }, list.map((q) => {
        const [cur, target] = Quest.progressOf(state, q.id);
        const done = Quest.isDone(state, q.id);
        const activeNow = Quest.isActive(state, q.id);
        return card([
          h('div', { class: 'row between' },
            h('div', { class: 'row', style: { gap: '8px' } },
              h('span', { class: 'strong' }, q.title),
              tag(q.kind, KIND_TAG[q.kind] ?? '')),
            done ? tag('已完成', 'good') : activeNow ? tag('进行中', 'mind') : tag('未接取')),
          h('div', { class: 'small muted', style: { marginTop: '4px' } }, q.desc),
          h('div', { style: { marginTop: '10px' } }, progress(cur, target, { cls: done ? 'energy' : 'mind', showText: true, label: '进度' })),
          h('div', { class: 'row between', style: { marginTop: '8px' } },
            h('span', { class: 'xs muted' }, `奖励：${rewardText(q.reward)}`),
            h('span', { class: 'xs muted' }, q.day ? `第 ${q.day} 天开放` : '')),
          !done && !activeNow
            ? btn('接取任务', { kind: 'ghost', sm: true, onClick: () => { Quest.accept(state, q.id); ctx.refresh(); } })
            : null,
        ], { cls: done ? 'flat' : '' });
      })))),

    hidden > 0
      ? btn(`展开剩余 ${hidden} 项`, { kind: 'ghost', block: true, onClick: () => { ui.expanded = true; ctx.refresh(); } })
      : ui.expanded && rows.length > PAGE_SIZE
        ? btn('收起', { kind: 'ghost', block: true, onClick: () => { ui.expanded = false; ctx.refresh(); } })
        : null,

    card([
      sectionTitle('任务类型说明'),
      h('div', { class: 'small muted' }, '主线推进剧情，紧急任务有明确时限，生存任务保证基础储备，人物任务改变关系，隐藏任务需要通过调查触发。'),
    ], { cls: 'flat' }),
  );
}

export default QuestPage;
