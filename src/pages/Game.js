/**
 * 基地主界面（UI 重做规范 §三.1 + 设计稿「整体布局图」）。
 *
 * **一屏 HUD，不做上下滚动的卡片流**：
 *   左信息栏（角色信息 / 任务追踪 / 小地图）│ 中央基地大图（可点建筑节点）│ 右下圆形快捷按钮
 *   顶部资源栏与底部导航在外壳里（ui/shell.js）。
 * 原来的卡片（生存状态 / 每日任务 / 仓库概览 / 最近事件 / 基地速览）不再铺在页面上，
 * 改成**面板**：点 HUD 底部的胶囊或右下按钮弹出来（sheet），内容一字不丢，
 * 但主界面永远是一屏、不滚动。
 * @module pages/Game
 */
import { h } from '../core/dom.js';
import { btn, card, empty, logItem, modal, progress, sheet, tag } from '../ui/components.js';
import { sceneView, hudSide, hudActions } from '../ui/scene.js';
import { statGrid } from '../ui/shell.js';
import { fmtDuration } from '../core/util.js';
import { capacity, countCategory, used } from '../systems/Inventory.js';
import { condition } from '../systems/Survival.js';
import { band } from '../systems/Fame.js';
import * as Achievement from '../systems/Achievement.js';
import * as Assistant from '../systems/Assistant.js';
import * as Base from '../systems/Base.js';
import * as Daily from '../systems/Daily.js';
import * as Death from '../systems/Death.js';
import * as Duel from '../systems/Duel.js';
import * as Faction from '../systems/Faction.js';
import * as GameTime from '../systems/GameTime.js';
import * as Growth from '../systems/Growth.js';
import * as Mind from '../systems/Mind.js';
import * as Quest from '../systems/Quest.js';
import * as Weather from '../systems/Weather.js';
import { recap } from '../systems/Story.js';
import * as Tutorial from '../data/tutorial.js';

/* ---------------- 面板（弹层）：原来铺在页面上的卡片搬到这里 ---------------- */

/** 生存状态：六项数值 + 休息。 */
function panelStatus(ctx) {
  const state = ctx.state;
  const cond = condition(state);
  const risk = Death.atRisk(state);
  const fc = Weather.forecast(state);
  const growth = Growth.view(state);
  sheet({
    title: '生存状态',
    body: [
      h('div', { class: 'row wrap', style: { gap: '6px' } },
        tag(cond.text, cond.kind),
        tag(`${fc.w.icon} 明日预报 ${fc.w.name}`, 'mind'),
        tag(`生存等级 Lv.${growth.level}｜${growth.title}`, 'good'),
        state.flags.endless ? tag(`♾️ 无尽模式 · 第 ${state.day - 30} 天`, 'mind') : null,
        risk.total > 0 ? tag(`⚠️ 倒下会丢 ${risk.total} 件`, 'warn') : null),
      h('div', { style: { marginTop: '12px' } }, statGrid(state)),
      h('div', { class: 'xs muted', style: { marginTop: '10px' } },
        `${GameTime.phaseLabel(state)} · 剩余 ${fmtDuration(GameTime.remaining(state))}`),
      h('div', { class: 'btn-group', style: { marginTop: '14px' } },
        btn('休息到次日 06:00', {
          kind: 'primary', block: true, disabled: state.time < 1080,
          reason: '22:00 之后才能休息', onClick: () => ctx.sleep(),
        })),
    ],
  });
}

/** 今日任务：每日任务 + 主线/支线进度。 */
function panelDaily(ctx) {
  const state = ctx.state;
  const daily = Daily.view(state);
  const active = Quest.today(state);
  sheet({
    title: '今日任务',
    body: [
      daily
        ? h('div', null,
          h('div', { class: 'row between' },
            h('span', { class: 'strong' }, `每日任务 ${daily.done} / ${daily.total}`),
            daily.streak > 0 ? tag(`连续 ${daily.streak} 天`, 'good') : tag('每天 06:00 刷新', '')),
          h('div', { class: 'col', style: { marginTop: '10px' } }, daily.tasks.map((t) => h('div', { class: 'stat' },
            h('div', { class: 'stat-head' },
              h('span', null, `${t.done ? '✅' : '▫️'} ${t.name}`),
              h('span', { class: 'strong' }, `${t.progress} / ${t.target}`)),
            h('div', { class: 'bar ' + (t.done ? 'energy' : 'mind') },
              h('i', { style: { width: `${Math.min(100, (t.progress / t.target) * 100)}%` } })))),
          h('div', { class: 'xs muted', style: { marginTop: '10px' } }, '全部完成额外奖励：货币 +40、晶核 +1、经验 +20')))
        : empty('今天没有每日任务。'),      h('div', { class: 'divider' }),
      h('div', { class: 'row between' },
        h('span', { class: 'strong' }, '主线 / 支线'),
        btn('任务页', { kind: 'ghost', sm: true, onClick: () => ctx.go('quest') })),
      active.length === 0
        ? h('div', { class: 'small muted', style: { marginTop: '8px' } }, '今天的任务都完成了。')
        : h('div', { class: 'col', style: { marginTop: '8px' } }, active.map((q) => {
          const [cur, target] = Quest.progressOf(state, q.id);
          return h('div', { class: 'line' },
            h('span', { class: 'ic' }, q.kind === '主线' ? '📌' : q.kind === '紧急' ? '⚠️' : '📋'),
            h('div', { class: 'grow' },
              h('div', { class: 'row between' },
                h('span', { class: 'strong small' }, q.title),
                h('span', { class: 'xs muted' }, `${cur}/${target}`)),
              h('div', { class: 'xs muted' }, q.desc)),
            btn('去', { kind: 'ghost', sm: true, onClick: () => ctx.go(q.kind === '人物' ? 'characters' : 'action') }));
        })),
    ],
  });
}

/** 最近事件（日志）。 */
function panelLog(ctx) {
  const state = ctx.state;
  sheet({
    title: '最近事件',
    body: [
      state.log.length === 0
        ? empty('还没有发生任何事。')
        : h('div', { class: 'log' }, state.log.slice(-20).reverse().map(logItem)),
      h('div', { class: 'xs muted', style: { marginTop: '10px' } }, `累计行动 ${state.actions} 次`),
    ],
  });
}

/** 基地速览 + 章节回顾入口。 */
function panelBase(ctx) {
  const state = ctx.state;
  const form = Base.form(state);
  const nextForm = Base.nextForm(state);
  const total = Base.totalLevels(state);
  const cap = capacity(state);
  const b = band(state.fame);
  sheet({
    title: '基地速览',
    body: [
      h('div', { class: 'row between' },
        h('span', { class: 'strong' }, `${form.icon} ${form.name}`),
        tag(`设施合计 ${total} 级`, 'mind')),
      h('div', { class: 'xs muted', style: { marginTop: '6px' } }, form.desc),
      nextForm
        ? h('div', { class: 'xs muted', style: { marginTop: '4px' } },
          `下一个形态「${nextForm.icon} ${nextForm.name}」：${nextForm.hint ?? ''}`)
        : h('div', { class: 'xs', style: { marginTop: '4px', color: 'var(--c-good)' } }, '已经是最高形态。文明还在。'),
      h('div', { class: 'row wrap', style: { gap: '8px', marginTop: '12px' } },
        Base.FACILITIES.filter((f) => Base.level(state, f.id) > 0)
          .map((f) => tag(`${f.icon} ${f.name} Lv.${Base.level(state, f.id)}`, 'mind'))),
      h('div', { class: 'row wrap', style: { gap: '6px', marginTop: '10px' } },
        tag(`⚔️ 战力 ${state.power}`, ''),
        tag(`锋芒 ${state.fame}（${b.label}）`, ''),
        tag(`🎒 容量 ${used(state)}/${cap}`, ''),
        tag(`👥 互助 ${state.aid?.members ?? 0} 人｜士气 ${Math.round(state.aid?.morale ?? 0)}`,
          (state.aid?.morale ?? 0) >= 40 ? 'good' : (state.aid?.morale ?? 0) >= 20 ? 'warn' : 'bad')),
      h('div', { class: 'row wrap', style: { gap: '6px', marginTop: '8px' } },
        ...Faction.visible(state).filter((f) => f.id !== 'aidnet')
          .map((f) => tag(`${f.icon} ${f.name} ${f.value}`, f.value >= 25 ? 'good' : f.value <= -25 ? 'bad' : ''))),
      h('div', { class: 'row wrap', style: { gap: '6px', marginTop: '10px' } },
        recap(state).slice(-3).map((c) => tag(`第 ${c.day} 天 · ${c.title}`, c.day === state.day ? 'mind' : ''))),
      h('div', { class: 'btn-group', style: { marginTop: '14px' } },
        btn('前往基地页', { kind: 'primary', onClick: () => ctx.go('base') }),
        btn('章节回顾', { kind: 'ghost', onClick: () => ctx.go('home') })),
    ],
  });
}

/** 光脑助手：把四块建议放进面板（不占主界面空间）。 */
function panelAssistant(ctx) {
  const state = ctx.state;
  const ass = Assistant.assistant(state);
  sheet({
    title: `光脑 Lv.${state.mindLevel}`,
    body: [
      h('div', { class: 'col', style: { gap: '10px' } },
        h('div', null, h('div', { class: 'xs muted' }, '天气预测'), ass.weather.map((l) => h('div', { class: 'small' }, l))),
        h('div', null, h('div', { class: 'xs muted' }, '资源分析'), ass.resources.map((l) => h('div', { class: 'small' }, l))),
        h('div', null, h('div', { class: 'xs muted' }, '危险预警'),
          ass.danger.map((l) => h('div', { class: ass.dangerLevel === 'warn' ? 'small' : 'small muted' }, `· ${l}`))),
        h('div', null, h('div', { class: 'xs muted' }, '生存建议'),
          ass.advice.map((l, i) => h('div', { class: 'small strong' }, `${i + 1}. ${l}`))),
        h('div', null, h('div', { class: 'xs muted' }, '基地管理'), ass.manage.map((l) => h('div', { class: 'small muted' }, `· ${l}`)))),
      h('div', { class: 'btn-group', style: { marginTop: '14px' } },
        btn('打开光脑页', { kind: 'primary', onClick: () => ctx.go('mind') })),
    ],
  });
}

/** 阶段总结弹窗（第 30 天起每 10 天一份；不结束游戏）。 */
function reportSheet(state) {
  const list = [...(state.reports ?? [])].reverse();
  modal({
    title: '阶段总结',
    body: [
      h('div', { class: 'small muted' }, '这些不是结局——你还在继续。它只是按目前的活法给出的评价。'),
      h('div', { class: 'col', style: { marginTop: '12px' } }, list.map((r) => h('div', { class: 'line' },
        h('span', { class: 'ic' }, '📄'),
        h('div', { class: 'grow' },
          h('div', { class: 'row between' },
            h('span', { class: 'strong' }, `第 ${r.day} 天 · ${r.title}`),
            h('span', { class: 'xs muted' }, `战力 ${r.stats?.战力 ?? '—'}`)),
          h('div', { class: 'xs muted' }, r.desc?.split('\n')[0] ?? ''))))),
    ],
  });
}

/** 底部胶囊按钮（打开对应面板）。 */
const pill = (label, icon, onClick, kind = '') => h('button', {
  type: 'button', class: ['hud-pill', kind], onClick, title: label,
}, h('span', { class: 'ic' }, icon), h('span', null, label));

/* ---------------- 主界面：一屏 HUD ---------------- */

export function Game(ctx) {
  const state = ctx.state;
  const cond = condition(state);
  const hint = Mind.hint(state);
  const daily = Daily.view(state);
  const growth = Growth.view(state);
  const duelReady = Duel.view(state).filter((d) => !d.locked).length;
  const ach = Achievement.view(state);
  const showTutorial = Tutorial.shouldShow(state);
  const step = Tutorial.stepOf(state);
  const ass = Assistant.assistant(state);
  const lastReport = (state.reports ?? [])[(state.reports ?? []).length - 1] ?? null;
  const cap = capacity(state);

  return h('div', { class: 'hud-page' },
    hudSide(state, ctx),

    h('div', { class: 'hud-main' },
      // 中央：基地大图（铺满）+ 建筑节点
      sceneView(state, { onPick: () => ctx.go('base') }),

      // 悬浮 HUD：左上角状态标签 / 左下角助手一句话 + 面板入口 / 右下角圆形按钮
      h('div', { class: 'hud-overlay' },
        h('div', { class: 'hud-tags' },
          h('span', { class: 'tag phase' }, `${state.chapterTitle ?? ''}`),
          tag(cond.text, cond.kind),
          tag(`💠 光脑 Lv.${state.mindLevel}`, 'mind'),
          lastReport ? h('button', {
            type: 'button', class: 'tag good', title: '查看阶段总结',
            onClick: () => reportSheet(state),
          }, `📄 第 ${lastReport.day} 天总结`) : null),

        h('div', { class: 'hud-bottom' },
          h('button', {
            type: 'button', class: 'hud-hint', onClick: () => panelAssistant(ctx),
            title: '光脑说了什么',
          }, h('span', { class: 'ic' }, '💠'),
          h('span', { class: 'ellipsis' }, ass.advice[0] ?? hint.text ?? '有光脑在，别慌。')),
          h('div', { class: 'hud-pills' },
            pill('生存状态', '❤️', () => panelStatus(ctx), cond.kind === 'bad' ? 'warn' : ''),
            pill(`今日任务${daily ? ` ${daily.done}/${daily.total}` : ''}`, '📋', () => panelDaily(ctx)),
            pill('最近事件', '🕯️', () => panelLog(ctx)),
            pill('基地速览', '🏗️', () => panelBase(ctx)),
            pill(`对战 ${duelReady}`, '⚔️', () => ctx.go('duel'), duelReady > 0 ? 'good' : ''),
            pill(`成就 ${ach.unlocked}/${ach.total}`, '🏆', () => ctx.go('achievement')),
            pill(`仓库 ${used(state)}/${cap}`, '🎒', () => ctx.go('warehouse')),
            pill(`生存等级 Lv.${growth.level}`, '🎖️', () => ctx.go('achievement')))),
        hudActions(ctx)),

      // 新手引导（第 1—2 天）：做成浮层卡片，不再占列表位置
      showTutorial
        ? card([
          h('div', { class: 'row between' },
            h('span', { class: 'strong' }, `新手引导 ${Tutorial.stepIndex(state) + 1} / ${Tutorial.TUTORIAL_STEPS}`),
            tag('可以跳过', '')),
          h('div', { class: 'strong', style: { marginTop: '8px' } }, step.title),
          h('div', { class: 'small muted', style: { marginTop: '6px' } }, step.text),
          h('div', { class: 'xs muted', style: { marginTop: '6px' } }, `💡 ${step.hint}`),
          h('div', { class: 'btn-group', style: { marginTop: '10px' } },
            btn(Tutorial.stepIndex(state) >= Tutorial.TUTORIAL_STEPS - 1 ? '开始游戏' : '下一步', {
              kind: 'primary', block: true,
              onClick: () => { Tutorial.advance(state); ctx.refresh(); },
            }),
            btn('跳过引导', { kind: 'ghost', sm: true, onClick: () => { Tutorial.skip(state); ctx.refresh(); } })),
        ], { cls: 'mind hud-tutorial' })
        : null),
  );
}

export default Game;
