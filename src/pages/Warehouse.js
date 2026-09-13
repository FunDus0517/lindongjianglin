/**
 * 仓库页与物品详情（项目书 §6、附录C 仓库页 / 物品详情页）。
 * 支持分类、搜索、数量显示、物品详情、使用、装备与容量管理。
 * @module pages/Warehouse
 */
import { h } from '../core/dom.js';
import { btn, card, empty, itemRow, progress, sectionTitle, sheet, tag } from '../ui/components.js';
import { CAT_LABEL } from '../core/util.js';
import { EQUIP_LABEL, ITEM_LIST, SLOTS, item, slotName } from '../data/items.js';
import * as Base from '../systems/Base.js';
import * as Inventory from '../systems/Inventory.js';

/** 页面局部 UI 状态：不进入存档。 */
const ui = { cat: null, query: '' };

function openItem(ctx, id) {
  const state = ctx.state;
  const def = item(id);
  const qty = Inventory.count(state, id);
  const worn = Inventory.isWorn(state, id);
  const s = sheet({
    title: def.name,
    body: [
      h('div', { class: 'col' },
        h('div', { class: 'row wrap', style: { gap: '6px' } },
          tag(CAT_LABEL[def.cat] ?? def.cat),
          tag(`数量 ${qty}`),
          tag(`占用 ${def.bulk}/件`),
          def.value ? tag(`基准价 ${def.value}`) : null,
          worn ? tag('已装备', 'good') : null),
        h('div', { class: 'narrative small' }, def.desc ?? ''),
        def.use ? h('div', { class: 'small muted' }, `使用效果：${Object.entries(def.use).map(([k, v]) => `${k} +${v}`).join('、')}`) : null,
        def.equip ? h('div', { class: 'small muted' },
          `装备槽：${slotName(def.slot)}｜加成：${Object.entries(def.equip).map(([k, v]) => `${EQUIP_LABEL[k] ?? k} ${v > 0 ? '+' : ''}${v}`).join('、')}`) : null,
        h('div', { class: 'btn-group' },
          def.use ? btn('使用', { kind: 'primary', disabled: qty <= 0, reason: qty <= 0 ? '没有库存' : null, onClick: () => { const res = Inventory.consume(state, id); s.close(); ctx.apply(res); } }) : null,
          def.equip ? btn(worn ? '卸下' : '装备', { kind: worn ? '' : 'mind', onClick: () => { const res = Inventory.equip(state, id, !worn); s.close(); ctx.apply(res); } }) : null,
          btn('丢弃 1 件', {
            kind: 'ghost',
            onClick: () => { Inventory.remove(state, id, 1); s.close(); ctx.refresh(); },
          })),
      ),
    ],
  });
}

export function WarehousePage(ctx) {
  const state = ctx.state;
  const cap = Inventory.capacity(state);
  const used = Inventory.used(state);
  const rows = Inventory.list(state, { cat: ui.cat, query: ui.query });
  const cats = [...new Set(ITEM_LIST.map((i) => i.cat))];
  const st = Inventory.equipStats(state);

  return h('div', { class: 'col' },
    card([
      sectionTitle('容量', h('span', { class: 'xs muted' }, `${used} / ${cap}`)),
      progress(used, cap, { cls: used >= cap ? 'hp' : 'energy' }),
      h('div', { class: 'row between', style: { marginTop: '8px' } },
        h('span', { class: 'xs muted' }, `剩余容量 ${Inventory.free(state)}`),
        Base.level(state, 'storage') < 5
          ? btn('升级仓库', { kind: 'ghost', sm: true, onClick: () => ctx.go('base') })
          : tag('仓库已满级')),
      h('div', { class: 'row wrap', style: { gap: '8px', marginTop: '10px' } },
        tag(`💰 货币 ${state.currency}`),
        tag(`💠 晶核 ${state.cores}`),
        tag(`🎽 已装备 ${(state.worn ?? []).length} 件`)),
    ], { cls: 'mind' }),

    h('input', {
      class: 'search',
      type: 'search',
      placeholder: '搜索物品…',
      value: ui.query,
      dataset: { focusKey: 'wh-search' },
      onInput: (e) => { ui.query = e.target.value; ctx.refresh(); },
    }),

    h('div', { class: 'chips' },
      h('button', { class: 'chip', 'aria-pressed': ui.cat === null ? 'true' : 'false', onClick: () => { ui.cat = null; ctx.refresh(); } }, '全部'),
      cats.map((c) => h('button', {
        class: 'chip', 'aria-pressed': ui.cat === c ? 'true' : 'false',
        onClick: () => { ui.cat = ui.cat === c ? null : c; ctx.refresh(); },
      }, CAT_LABEL[c] ?? c))),

    rows.length === 0
      ? empty('这个分类下没有物品。')
      : h('div', { class: 'col' }, rows.map((def) => itemRow(def, def.qty, () => openItem(ctx, def.id)))),

    // 装备槽（商业化升级 §七「装备系统」）：五个槽每槽一件，点槽位直接卸下
    card([
      sectionTitle('装备槽', h('span', { class: 'xs muted' },
        `武器 ${st.weapon}｜御寒 ${st.warmthResist}｜防护 ${st.defense}｜载重 +${st.carry}`)),
      h('div', { class: 'col' }, SLOTS.map((sl) => {
        const wornId = Inventory.wornIn(state, sl.id);
        const def = wornId ? item(wornId) : null;
        return h('div', { class: 'row between' },
          h('div', { class: 'row', style: { gap: '8px' } },
            h('span', { class: 'ic' }, sl.icon),
            h('span', { class: 'small strong' }, sl.name),
            def ? h('span', { class: 'small' }, def.name) : h('span', { class: 'small muted' }, '空')),
          def
            ? btn('卸下', { kind: 'ghost', sm: true, onClick: () => ctx.apply(Inventory.equip(state, wornId, false)) })
            : tag('未装备'));
      })),
      h('div', { class: 'xs muted', style: { marginTop: '8px' } },
        `载重加成 ${st.carry > 0 ? `+${st.carry}` : '无'}（容量已计入）｜换装自动脱下同槽旧装备`),
    ]),

    (state.worn ?? []).length > 0
      ? card([
        sectionTitle('已装备'),
        h('div', { class: 'row wrap', style: { gap: '8px' } }, state.worn.map((id) => tag(`${item(id).name}`, 'good'))),
        h('div', { class: 'xs muted', style: { marginTop: '6px' } },
          `搜刮加成 +${st.loot}｜精神 +${st.mind}｜威慑 ${st.risk}`),
      ], { cls: 'flat' })
      : null,
  );
}

export default WarehousePage;
