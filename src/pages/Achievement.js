/**
 * 成就页（商业化升级 §七：成就系统 + 角色成长）。
 * 成就判定在 systems/Achievement.js，成长曲线在 systems/Growth.js，这里只负责展示。
 * @module pages/Achievement
 */
import { h } from '../core/dom.js';
import { card, empty, progress, sectionTitle, tag } from '../ui/components.js';
import * as Achievement from '../systems/Achievement.js';
import * as Daily from '../systems/Daily.js';
import * as Death from '../systems/Death.js';
import * as Growth from '../systems/Growth.js';

const ui = { cat: '全部' };

function rewardText(r = {}) {
  const parts = [];
  if (r.currency) parts.push(`货币 +${r.currency}`);
  if (r.cores) parts.push(`晶核 +${r.cores}`);
  if (r.fame) parts.push(`锋芒 +${r.fame}`);
  return parts.length ? parts.join('、') : '经验';
}

export function AchievementPage(ctx) {
  const state = ctx.state;
  const view = Achievement.view(state);
  const growth = Growth.view(state);
  const daily = Daily.view(state);
  const risk = Death.atRisk(state);
  const cats = ['全部', ...view.cats];
  const rows = ui.cat === '全部' ? view.list : view.list.filter((a) => a.cat === ui.cat);

  return h('div', { class: 'col' },
    /* 角色成长 */
    card([
      h('div', { class: 'row between' },
        h('span', { class: 'strong' }, `生存等级 Lv.${growth.level}｜${growth.title}`),
        growth.max ? tag('已满级', 'good') : tag(`${growth.xp} / ${growth.need}`, 'mind')),
      h('div', { style: { marginTop: '10px' } },
        progress(growth.xp, growth.need || 1, { cls: 'mind', showText: false })),
      h('div', { class: 'xs muted', style: { marginTop: '8px' } },
        `加成：战力 +${growth.bonus.power}｜仓库载重 +${growth.bonus.capacity}｜御寒 +${growth.bonus.warmth}`),
      h('div', { class: 'xs muted', style: { marginTop: '4px' } },
        '经验来自行动时长、剧情选择、每日任务与成就解锁。'),
    ], { cls: 'mind' }),

    /* 每日任务 */
    daily
      ? card([
        h('div', { class: 'row between' },
          h('span', { class: 'strong' }, `今日任务 ${daily.done} / ${daily.total}`),
          daily.streak > 0 ? tag(`连续 ${daily.streak} 天`, 'good') : tag(daily.bonus ? '已领完奖励' : '进行中', '')),
        h('div', { class: 'col', style: { marginTop: '10px' } }, daily.tasks.map((t) => h('div', { class: 'stat' },
          h('div', { class: 'stat-head' },
            h('span', null, `${t.done ? '✅' : '▫️'} ${t.name}`),
            h('span', { class: 'strong' }, `${t.progress} / ${t.target}`)),
          h('div', { class: 'bar ' + (t.done ? 'energy' : 'mind') },
            h('i', { style: { width: `${Math.min(100, (t.progress / t.target) * 100)}%` } }))))),
      ], { cls: daily.bonus ? 'flat' : '' })
      : null,

    /* 倒地记录（死亡不是结局，但代价要看得见） */
    card([
      h('div', { class: 'row between' },
        h('span', { class: 'strong' }, '倒地记录'),
        tag(`已倒地 ${Death.deaths(state)} 次`, Death.deaths(state) > 0 ? 'warn' : 'good')),
      h('div', { class: 'xs muted', style: { marginTop: '6px' } },
        risk.total > 0
          ? `现在倒下会丢掉：${risk.rows.map((r) => `${r.name}×${r.n}`).join('、')}`
          : '现在倒下不会丢东西（最近没有新的搜刮入账）。'),
    ], { cls: 'flat' }),

    /* 成就 */
    card([
      h('div', { class: 'row between' },
        h('span', { class: 'strong' }, `成就 ${view.unlocked} / ${view.total}`),
        tag(`${Math.round((view.unlocked / view.total) * 100)}%`, view.unlocked === view.total ? 'good' : 'mind')),
      h('div', { style: { marginTop: '10px' } },
        progress(view.unlocked, view.total, { cls: 'good' })),
    ]),

    h('div', { class: 'chips' }, cats.map((c) => h('button', {
      class: 'chip',
      'aria-pressed': ui.cat === c ? 'true' : 'false',
      onClick: () => { ui.cat = c; ctx.refresh(); },
    }, c))),

    rows.length === 0 ? empty('这个分类还没有成就。') : null,

    h('div', { class: 'col' }, rows.map((a) => card([
      h('div', { class: 'row between' },
        h('div', { class: 'row', style: { gap: '8px' } },
          h('span', { class: 'strong' }, `${a.icon} ${a.name}`),
          tag(a.cat, '')),
        a.unlocked ? tag('已解锁', 'good') : tag('未解锁', '')),
      h('div', { class: 'small muted', style: { marginTop: '4px' } }, a.desc),
      !a.unlocked && a.progress
        ? h('div', { style: { marginTop: '8px' } },
          progress(a.progress.now, a.progress.goal, { cls: 'mind', showText: true, label: `${a.progress.now} / ${a.progress.goal} ${a.progress.unit ?? ''}` }))
        : null,
      h('div', { class: 'row between', style: { marginTop: '8px' } },
        h('span', { class: 'xs muted' }, `奖励：${rewardText(a.reward)}`),
        a.at ? h('span', { class: 'xs muted' }, `第 ${a.at.day} 天解锁`) : null),
    ], { cls: a.unlocked ? '' : 'flat' }))),
  );
}

export default AchievementPage;
