/**
 * 光脑 OS（项目书 §11）：小管家 / 情报 / 强化 / 战力榜 / 交易区 / 系统。
 * 视觉与信息层级以冷白、深蓝、青蓝玻璃质感为主。
 * @module pages/Mind
 */
import { h } from '../core/dom.js';
import { btn, card, empty, progress, sectionTitle, tabs, tag } from '../ui/components.js';
import { CHAPTERS } from '../data/chapters.js';
import { fmtClock, fmtDuration } from '../core/util.js';
import { ITEM_LIST, item } from '../data/items.js';
import * as Base from '../systems/Base.js';
import * as Explore from '../systems/Explore.js';
import * as Faction from '../systems/Faction.js';
import * as Fame from '../systems/Fame.js';
import * as GameTime from '../systems/GameTime.js';
import * as Inventory from '../systems/Inventory.js';
import * as Market from '../systems/Market.js';
import * as Mind from '../systems/Mind.js';
import * as Power from '../systems/Power.js';
import * as Quest from '../systems/Quest.js';
import * as Weather from '../systems/Weather.js';

const ui = { tab: 'butler' };

const TABS = [
  { id: 'butler', label: '小管家', icon: '🫧' },
  { id: 'intel', label: '情报', icon: '📡' },
  { id: 'enhance', label: '强化', icon: '🧬' },
  { id: 'board', label: '战力榜', icon: '🏆' },
  { id: 'market', label: '交易区', icon: '🏪' },
  { id: 'system', label: '系统', icon: '⚙️' },
];

/* ---------------- 小管家 ---------------- */
function butlerTab(ctx) {
  const state = ctx.state;
  const hint = Mind.hint(state);
  const p = Mind.progress(state);
  const brains = Object.values(Mind.BRAINS);
  return h('div', { class: 'col' },
    card([
      h('div', { class: 'row between' },
        h('span', { class: 'strong' }, `💠 光脑 Lv.${p.level}`),
        tag(hint.brain.name, 'mind')),
      h('div', { style: { marginTop: '10px' } }, progress(p.xp, p.need, { cls: 'mind', showText: true, label: '经验' })),
      h('div', { class: 'xs muted', style: { marginTop: '8px' } }, `人格加成：${hint.brain.desc}`),
      h('div', { class: 'col', style: { marginTop: '12px' } }, hint.lines.map((l) => h('div', { class: 'line' }, h('span', { class: 'ic' }, '💬'), h('div', { class: 'grow small' }, l)))),
    ], { cls: 'mind' }),

    card([
      sectionTitle('状态诊断'),
      h('div', { class: 'col', style: { gap: '6px' } },
        ['hp', 'warmth', 'hunger', 'thirst', 'energy', 'mind'].map((k) => {
          const label = { hp: '生命', warmth: '体温', hunger: '饥饿', thirst: '饮水', energy: '精力', mind: '精神' }[k];
          const v = Math.round(state.stats[k]);
          const level = v >= 60 ? '正常' : v >= 35 ? '注意' : '危险';
          return h('div', { class: 'row between' },
            h('span', { class: 'small' }, label),
            h('span', { class: ['xs', v >= 60 ? 'muted' : ''], style: { color: v >= 60 ? '' : v >= 35 ? 'var(--c-warn)' : 'var(--c-bad)' } }, `${v} · ${level}`));
        })),
      h('div', { class: 'xs muted', style: { marginTop: '10px' } },
        `室内体感 ${Math.round(Weather.ambient(state) + 8 + Base.indoorWarmth(state))}℃（供暖 ${Base.level(state, 'heating')} 级 + 住所 ${Base.level(state, 'shelter')} 级）｜室外 ${Math.round(Weather.ambient(state))}℃`),
    ], { cls: 'flat' }),

    card([
      sectionTitle('管家人格'),
      h('div', { class: 'col', style: { gap: '8px' } }, brains.map((b) => h('div', { class: 'row between' },
        h('div', { class: 'row', style: { gap: '8px' } }, h('span', null, b.icon), h('div', null,
          h('div', { class: 'small strong' }, b.name), h('div', { class: 'xs muted' }, b.desc))),
        state.brain === b.id ? tag('当前', 'mind') : null))),
    ], { cls: 'flat' }),

    card([
      sectionTitle('今日建议'),
      h('div', { class: 'col', style: { gap: '6px' } }, Quest.today(state).map((q) => h('div', { class: 'row between' },
        h('span', { class: 'small' }, q.title),
        h('span', { class: 'xs muted' }, `${Quest.progressOf(state, q.id).join('/')}`)))),
      Quest.today(state).length === 0 ? h('div', { class: 'small muted' }, '今日任务已全部完成。') : null,
    ], { cls: 'flat' }),
  );
}

/* ---------------- 情报 ---------------- */
function intelTab(ctx) {
  const state = ctx.state;
  const w = Weather.effects(state);
  const upcoming = CHAPTERS.filter((c) => c.day > state.day && c.day <= state.day + 5);
  const locations = Explore.available(state);
  return h('div', { class: 'col' },
    card([
      sectionTitle('当前天气'),
      h('div', { class: 'row', style: { gap: '8px' } },
        h('span', { class: 'strong' }, `${w.weather.icon} ${w.weather.name}`),
        tag(`${Math.round(w.ambient)}℃`),
        tag(`室外修正 ${w.outdoor}℃`)),
      h('div', { class: 'small muted', style: { marginTop: '8px' } }, w.weather.desc),
      h('div', { class: 'col', style: { marginTop: '10px', gap: '4px' } },
        h('div', { class: 'row between' }, h('span', { class: 'xs muted' }, '探索收益修正'), h('span', { class: 'xs' }, `×${w.lootMod.toFixed(2)}`)),
        h('div', { class: 'row between' }, h('span', { class: 'xs muted' }, '遇敌风险修正'), h('span', { class: 'xs' }, `×${w.riskMod.toFixed(2)}`)),
        h('div', { class: 'row between' }, h('span', { class: 'xs muted' }, '行动耗时修正'), h('span', { class: 'xs' }, `×${w.minutesMod.toFixed(2)}`)),
        h('div', { class: 'row between' }, h('span', { class: 'xs muted' }, '今日剩余行动时间'), h('span', { class: 'xs' }, fmtDuration(GameTime.remaining(state))))),
    ], { cls: 'mind' }),

    card([
      sectionTitle('天气趋势'),
      upcoming.length === 0 ? empty('没有更远的预报了。') :
        h('div', { class: 'col', style: { gap: '6px' } }, upcoming.map((c) => h('div', { class: 'row between' },
          h('span', { class: 'small' }, `第 ${c.day} 天 · ${c.title}`),
          h('span', { class: 'xs muted' }, `${Weather.weather(c.weather).name} ${c.temp}℃`)))),
    ], { cls: 'flat' }),

    card([
      sectionTitle('地点情报'),
      h('div', { class: 'col', style: { gap: '6px' } }, locations.map((l) => h('div', { class: 'row between' },
        h('div', { class: 'row', style: { gap: '8px' } }, h('span', null, l.icon), h('span', { class: 'small' }, l.name)),
        h('span', { class: 'xs muted' }, `危险 ${l.danger}｜已知事件 ${Explore.knownEvents(state, l.id).length}`)))),
    ], { cls: 'flat' }),

    card([
      sectionTitle('势力', tag(`${Faction.visible(state).length} 个已知`, 'mind')),
      Faction.visible(state).length === 0
        ? empty('还没有接触到任何势力。第 14 天的广播之后这里会热闹起来。')
        : h('div', { class: 'col', style: { gap: '10px' } }, Faction.visible(state).map((f) => h('div', { class: 'col stack-1' },
          h('div', { class: 'row between' },
            h('div', { class: 'row', style: { gap: '8px' } }, h('span', null, f.icon), h('span', { class: 'strong small' }, f.name)),
            tag(`${f.value} · ${f.label}`, f.value >= 25 ? 'good' : f.value <= -25 ? 'bad' : '')),
          h('div', { class: 'xs muted' }, f.desc),
          h('div', { class: 'bar ' + (f.value >= 0 ? 'energy' : 'hp') },
            h('i', { style: { width: `${Math.min(100, Math.abs(f.value) / 2)}%` } }))))),
      h('div', { class: 'xs muted', style: { marginTop: '8px' } },
        `掠夺者立场会改变遇敌概率（当前系数 ×${Faction.riskMod(state).toFixed(2)}）；互助网立场由成员规模与士气派生。`),
    ], { cls: 'flat' }),

    card([
      sectionTitle('世界信息'),
      h('div', { class: 'col', style: { gap: '6px' } }, CHAPTERS.slice(0, 6).map((c) => h('div', { class: 'row between' },
        h('span', { class: 'xs muted' }, `第 ${c.day} 天`),
        h('span', { class: 'xs', style: { maxWidth: '70%', textAlign: 'right' } }, c.synopsis)))),
    ], { cls: 'flat' }),
  );
}

/* ---------------- 强化 ---------------- */
function enhanceTab(ctx) {
  const state = ctx.state;
  const open = state.day >= Mind.ENHANCE_UNLOCK_DAY;
  if (!open) {
    return card([
      h('div', { class: 'row between' }, h('span', { class: 'strong' }, '晶核强化'), tag('未开放', 'warn')),
      h('div', { class: 'small muted', style: { marginTop: '8px' } },
        `强化需要晶核，晶核在第 ${Mind.ENHANCE_UNLOCK_DAY} 天后的高强度战斗中开始出现。\n当前库存：${state.cores} 枚。`),
      h('div', { class: 'xs muted', style: { marginTop: '8px' } }, '强化后必须出现明确的数值变化与结果提示。'),
    ], { cls: 'flat' });
  }
  return h('div', { class: 'col' },
    card([
      h('div', { class: 'row between' }, h('span', { class: 'strong' }, `晶核 ${state.cores} 枚`), tag('强化已开放', 'mind')),
      h('div', { class: 'xs muted', style: { marginTop: '6px' } }, '强化消耗晶核，立即产生永久数值提升。'),
    ], { cls: 'mind' }),
    h('div', { class: 'col' }, Object.values(Mind.ENHANCE).map((k) => {
      const lv = Mind.enhanceLevel(state, k.id);
      const cost = k.cost(lv);
      const can = state.cores >= cost && lv < 5;
      return card([
        h('div', { class: 'row between' },
          h('div', { class: 'row', style: { gap: '8px' } }, h('span', null, k.icon), h('span', { class: 'strong' }, `${k.name} Lv.${lv}`)),
          tag(`消耗 ${cost} 晶核`, can ? 'mind' : 'warn')),
        h('div', { class: 'xs muted', style: { marginTop: '4px' } }, k.desc),
        btn(lv >= 5 ? '已满级' : `强化至 Lv.${lv + 1}`, {
          kind: 'primary', sm: true, disabled: !can,
          reason: lv >= 5 ? '已达最高等级' : state.cores < cost ? `晶核不足（需要 ${cost}）` : null,
          onClick: () => ctx.apply(Mind.enhance(state, k.id)),
        }),
      ], { cls: 'flat' });
    })),
  );
}

/* ---------------- 战力榜 ---------------- */
function boardTab(ctx) {
  const state = ctx.state;
  if (Power.locked(state)) {
    return card([
      h('div', { class: 'row between' }, h('span', { class: 'strong' }, '战力榜'), tag('未开放', 'warn')),
      h('div', { class: 'small muted', style: { marginTop: '8px' } },
        `战力榜将在第 ${Power.BOARD_UNLOCK_DAY} 天开放。当前你的战力为 ${state.power}。`),
      h('div', { class: 'xs muted', style: { marginTop: '8px' } }, '排名提升会解锁挑战、交易、人物关注和特殊任务；排名下降可能招致嘲讽与挑战。'),
    ], { cls: 'flat' });
  }
  const rows = Power.board(state);
  return h('div', { class: 'col' },
    card([
      h('div', { class: 'row between' }, h('span', { class: 'strong' }, '凛冬城战力榜'), tag(Power.attention(state), 'mind')),
      h('div', { class: 'xs muted', style: { marginTop: '6px' } }, '榜单内容随日期推进动态变化。'),
    ], { cls: 'mind' }),
    h('div', { class: 'col' }, rows.map((r) => card([
      h('div', { class: 'row between' },
        h('div', { class: 'row', style: { gap: '10px' } },
          h('span', { class: 'strong', style: { width: '28px' } }, `#${r.rank}`),
          h('div', null, h('div', { class: 'small strong' }, r.name), h('div', { class: 'xs muted' }, r.tag))),
        h('span', { class: 'qty' }, String(r.power))),
    ], { cls: r.self ? 'mind' : 'flat' }))),
  );
}

/* ---------------- 交易区 ---------------- */
function marketTab(ctx) {
  const state = ctx.state;
  if (!Market.isOpen(state)) {
    return card([
      h('div', { class: 'row between' }, h('span', { class: 'strong' }, '交易区'), tag('未开放', 'warn')),
      h('div', { class: 'small muted', style: { marginTop: '8px' } },
        `交易区将在第 ${Market.MARKET_UNLOCK_DAY} 天进入核心玩法。当前货币 ${state.currency}。`),
      h('div', { class: 'xs muted', style: { marginTop: '8px' } }, '开放后可用货币买卖稀缺资源，价格随日期、库存与名声波动。'),
    ], { cls: 'flat' });
  }
  const idx = Market.index(state);
  return h('div', { class: 'col' },
    card([
      h('div', { class: 'row between' },
        h('span', { class: 'strong' }, `货币 ${state.currency}`),
        tag(`物价指数 ${idx.value}｜${idx.label}`, idx.value >= 120 ? 'warn' : 'mind')),
      h('div', { class: 'xs muted', style: { marginTop: '6px' } },
        `晶核 ${state.cores} 枚｜今日库存每日 06:00 刷新｜卖出价约为买入价的 55%`),
      h('div', { class: 'xs muted', style: { marginTop: '4px' } },
        '价格受日期（越晚越贵）、锋芒值（被认出来要加价）与凛冬城立场（有往来可拿平价）影响。'),
      btn('整理背包（打开仓库）', { kind: 'ghost', sm: true, onClick: () => ctx.go('warehouse') }),
    ], { cls: 'mind' }),

    h('div', { class: 'col' }, Market.offers(state).map((g) => card([
      h('div', { class: 'row between' },
        h('div', null,
          h('div', { class: 'small strong' }, g.scalar ? '晶核' : item(g.id).name),
          h('div', { class: 'xs muted' }, g.desc ?? '')),
        h('div', { class: 'col', style: { justifyItems: 'end', gap: '2px' } },
          h('span', { class: 'qty' }, `买 ${g.buy}`),
          h('span', { class: 'xs muted' }, `卖 ${g.sell}`))),
      h('div', { class: 'row between', style: { marginTop: '6px' } },
        h('span', { class: 'xs muted' }, `今日剩余 ${g.left}｜持有 ${g.owned}`),
        h('span', { class: 'xs muted' }, g.scalar ? '强化通货' : '仓库物资')),
      h('div', { class: 'btn-group', style: { marginTop: '8px' } },
        btn('买 1', {
          sm: true, kind: 'primary',
          disabled: Market.canBuy(state, g.id, 1) !== true,
          reason: Market.canBuy(state, g.id, 1) === true ? null : Market.canBuy(state, g.id, 1),
          onClick: () => ctx.apply(Market.buy(state, g.id, 1)),
        }),
        btn('卖 1', {
          sm: true,
          disabled: Market.canSell(state, g.id, 1) !== true,
          reason: Market.canSell(state, g.id, 1) === true ? null : Market.canSell(state, g.id, 1),
          onClick: () => ctx.apply(Market.sell(state, g.id, 1)),
        })),
    ], { cls: 'flat' }))),
  );
}

/* ---------------- 系统 ---------------- */
function systemTab(ctx) {
  const state = ctx.state;
  return h('div', { class: 'col' },
    card([
      sectionTitle('存档'),
      h('div', { class: 'col', style: { gap: '4px' } },
        h('div', { class: 'row between' }, h('span', { class: 'xs muted' }, '最近保存'), h('span', { class: 'xs' }, state.lastSave ? `第 ${state.lastSave.at.day} 天 ${fmtClock(state.lastSave.at.time)} · ${state.lastSave.reason}` : '尚未保存')),
        h('div', { class: 'row between' }, h('span', { class: 'xs muted' }, '本局游戏时长'), h('span', { class: 'xs' }, fmtDuration(state.playtime))),
        h('div', { class: 'row between' }, h('span', { class: 'xs muted' }, '行动次数'), h('span', { class: 'xs' }, `${state.actions}`))),
      h('div', { class: 'btn-group', style: { marginTop: '12px' } },
        btn('立即保存', { kind: 'primary', onClick: () => ctx.saveNow() }),
        btn('存档管理', { kind: 'ghost', onClick: () => ctx.go('settings') })),
    ], { cls: 'mind' }),

    card([
      sectionTitle('游戏信息'),
      h('div', { class: 'col', style: { gap: '4px' } },
        h('div', { class: 'row between' }, h('span', { class: 'xs muted' }, '版本'), h('span', { class: 'xs' }, 'V3.0 · M1 里程碑构建')),
        h('div', { class: 'row between' }, h('span', { class: 'xs muted' }, '开放章节'), h('span', { class: 'xs' }, '第 1—3 天')),
        h('div', { class: 'row between' }, h('span', { class: 'xs muted' }, '锋芒档位'), h('span', { class: 'xs' }, Fame.band(state.fame).label))),
      h('div', { class: 'btn-group', style: { marginTop: '12px' } },
        btn('玩法帮助', { kind: 'ghost', onClick: () => ctx.showHelp() }),
        btn('返回首页', { kind: 'ghost', onClick: () => ctx.go('home') })),
    ], { cls: 'flat' }),
  );
}

export function MindPage(ctx) {
  const state = ctx.state;
  const body = { butler: butlerTab, intel: intelTab, enhance: enhanceTab, board: boardTab, market: marketTab, system: systemTab }[ui.tab] ?? butlerTab;
  return h('div', { class: 'col' },
    tabs(TABS, ui.tab, (id) => { ui.tab = id; ctx.refresh(); }),
    body(ctx),
  );
}

export default MindPage;
