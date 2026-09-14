/**
 * 行动页与地点详情（项目书 §7、附录C 行动页 / 地点详情页）。
 * 地点卡展示：名称、危险等级、预计时间、可能收益、已知事件、进入条件。
 * @module pages/Action
 */
import { h } from '../core/dom.js';
import { btn, card, empty, sectionTitle, sheet, tag } from '../ui/components.js';
import * as WorldMap from '../systems/Map.js';
import { statGrid } from '../ui/shell.js';
import { fmtDuration } from '../core/util.js';
import { ACTIONS } from '../data/locations.js';
import { item } from '../data/items.js';
import * as Base from '../systems/Base.js';
import * as Explore from '../systems/Explore.js';
import * as GameTime from '../systems/GameTime.js';
import * as Inventory from '../systems/Inventory.js';
import * as Weather from '../systems/Weather.js';

const DANGER = ['安全', '低', '中', '偏高', '高', '极高'];
const DANGER_TAG = ['good', 'good', 'warn', 'warn', 'bad', 'bad'];

function lootPreview(spec) {
  const seen = new Map();
  for (const [id, , , p] of spec.loot ?? []) {
    const prev = seen.get(id) ?? 0;
    seen.set(id, Math.max(prev, p));
  }
  return [...seen.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4)
    .map(([id, p]) => `${item(id).name} ${Math.round(p * 100)}%`);
}

/** 地点里声明了哪些行动 id（loc.actions 存的是收益表，行动词表在 ACTIONS 里）。 */
const actionIds = (loc) => Object.keys(loc.actions);

/** 地点在列表里只占一行：手机上一屏能看完好几个，点开才展开详情。 */
function locationRow(ctx, state, loc) {
  const w = Weather.effects(state);
  const known = Explore.knownEvents(state, loc.id);
  const minutes = Math.round(ACTIONS.search.minutes * w.minutesMod);
  return h('div', { class: 'item', role: 'button', tabindex: '0', onClick: () => openLocation(ctx, loc.id) },
    h('span', { class: 'ic', style: { fontSize: '18px' } }, loc.icon),
    h('div', { class: 'grow' },
      h('div', { class: 'row between' },
        h('span', { class: 'strong small' }, loc.name),
        h('span', { class: 'xs muted' }, `约 ${fmtDuration(minutes)}`)),
      h('div', { class: 'row wrap', style: { gap: '4px', marginTop: '2px' } },
        tag(`危险 ${DANGER[loc.danger]}`, DANGER_TAG[loc.danger]),
        tag(loc.indoor ? '室内' : '室外'),
        known.length > 0 ? tag(`事件 ${known.length}`, 'warn') : null)),
    h('span', { class: 'xs muted' }, '›'));
}

function openLocation(ctx, locationId) {
  const state = ctx.state;
  const loc = Explore.LOCATIONS[locationId];
  const w = Weather.effects(state);
  const s = sheet({
    title: `${loc.icon} ${loc.name}`,
    body: [
      h('div', { class: 'col' },
        h('div', { class: 'narrative small' }, loc.desc),
        h('div', { class: 'row wrap', style: { gap: '6px' } },
          tag(`危险等级 ${DANGER[loc.danger]}`, DANGER_TAG[loc.danger]),
          tag(loc.indoor ? '室内' : `室外 ${w.outdoor}℃ 修正`),
          tag(`天气：${w.weather.name}`),
          tag(`仓库剩余容量 ${Inventory.free(state)}`)),
        sectionTitle('可得收益'),
        h('div', { class: 'col', style: { gap: '6px' } },
          actionIds(loc).map((id) => h('div', { class: 'row between' },
            h('span', { class: 'small' }, ACTIONS[id].label),
            h('span', { class: 'xs muted' }, lootPreview(loc.actions[id]).join('、') || '无固定收益')))),
        sectionTitle('选择行动'),
        h('div', { class: 'col', style: { gap: '6px' } },
          actionIds(loc).map((id) => {
            const a = ACTIONS[id];
            const mins = Math.round(a.minutes * w.minutesMod);
            const enough = state.stats.energy >= 5;
            return btn(`${a.label}｜约 ${fmtDuration(mins)}`, {
              block: true,
              disabled: !enough,
              reason: enough ? null : '精力不足（需要 5）',
              onClick: () => {
                const res = Explore.performAction(state, locationId, id);
                s.close();
                ctx.apply(res);
              },
            });
          })),
        btn('撤退（回到室内）', {
          kind: 'ghost', block: true,
          onClick: () => { s.close(); ctx.apply(Explore.retreat(state, locationId)); },
        }),
      ),
    ],
  });
}

export function ActionPage(ctx) {
  const state = ctx.state;
  const w = Weather.effects(state);
  const list = Explore.available(state);

  return h('div', { class: 'col' },
    card([
      h('div', { class: 'row between' },
        h('div', { class: 'row', style: { gap: '8px' } },
          h('span', { class: 'strong' }, `${w.weather.icon} ${w.weather.name}`),
          tag(`${Math.round(w.ambient)}℃`),
          tag(state.location ? `当前位置：${Explore.LOCATIONS[state.location]?.name ?? '外部'}` : '当前在外部', state.location && Explore.HOME.includes(state.location) ? 'good' : 'warn')),
        h('span', { class: 'xs muted' }, `剩余时间 ${fmtDuration(GameTime.remaining(state))}`)),
      h('div', { class: 'xs muted', style: { marginTop: '6px' } }, w.weather.desc),
      h('div', { style: { marginTop: '10px' } }, statGrid(state, ['hp', 'warmth', 'energy', 'hunger'])),
    ], { cls: 'mind' }),

    sectionTitle('地图', h('span', { class: 'xs muted' }, `${WorldMap.brief(state)}`)),
    h('div', { class: 'col' }, WorldMap.view(state).map((r) => card([
      h('div', { class: 'row between' },
        h('span', { class: 'strong' }, `${r.icon} ${r.name}`),
        tag(`危险 ${r.danger}`, r.danger >= 4 ? 'bad' : r.danger >= 3 ? 'warn' : 'good')),
      h('div', { class: 'xs muted', style: { marginTop: '4px' } }, r.desc),
      h('div', { class: 'col', style: { gap: '6px', marginTop: '10px' } }, r.places.map((p) => h('div', { class: 'row between' },
        h('div', { class: 'row', style: { gap: '8px' } },
          h('span', { class: 'ic' }, p.icon),
          h('span', { class: 'small' }, p.name),
          p.here ? tag('你在这里', 'mind') : p.locked ? tag('未开放', '') : tag(`${p.minutes} 分钟`, '')),
        p.here || p.locked
          ? h('span', { class: 'xs muted' }, p.locked ? (p.reason ?? '') : '')
          : btn('前往', { kind: 'ghost', sm: true, onClick: () => ctx.apply(WorldMap.travel(state, p.id)) })))),
      r.places.length === 0 ? empty('这一片还没有可去的地方。') : null,
    ], { cls: 'flat' }))),

    h('div', { class: 'row wrap', style: { gap: '6px', marginBottom: '8px' } }, WorldMap.routes(state).map((r) => tag(r.blocked ? r.name + r.why + '（' + r.left + ' 天）' : r.name, r.blocked ? 'bad' : ''))),

    sectionTitle('地点卡', h('span', { class: 'xs muted' }, `${list.length} 个可进入 · 点开看详情`)),
    h('div', { class: 'col' }, list.map((loc) => locationRow(ctx, state, loc))),

    card([
      sectionTitle('提示'),
      h('div', { class: 'small muted' },
        `· 室外行动会按天气消耗体温，穿戴羽绒服与雪地靴可抵消部分寒风。\n· 防御设施等级 ${Base.level(state, 'defense')}，可降低 ${Base.level(state, 'defense') * 8}% 遇敌风险。\n· 精力低于 5 无法行动，休息到次日 06:00 可恢复。`),
    ], { cls: 'flat' }),
  );
}

export default ActionPage;
