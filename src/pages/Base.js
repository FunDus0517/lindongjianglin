/**
 * 基地与设施管理页（项目书 §10、附录C 基地/设施管理页）。
 * 设施等级制、升级消耗与效果预览、加工设施配方。
 * @module pages/Base
 */
import { h } from '../core/dom.js';
import { btn, card, empty, progress, sectionTitle, sheet, tag } from '../ui/components.js';
import { item } from '../data/items.js';
import * as Base from '../systems/Base.js';
import * as Inventory from '../systems/Inventory.js';

const costText = (cost) => Object.entries(cost.items).map(([id, n]) => `${item(id).name}×${n}`).join('、');

export function BasePage(ctx) {
  const state = ctx.state;
  const total = Object.values(state.base).reduce((a, b) => a + b, 0);
  const recipes = Base.recipes(state);
  const left = Base.upgradesLeft(state);

  return h('div', { class: 'col' },
    card([
      h('div', { class: 'row between' },
        h('span', { class: 'strong' }, '地下基地'),
        tag(`设施等级合计 ${total}`, 'mind')),
      h('div', { class: 'row between', style: { marginTop: '8px' } },
        h('span', { class: 'small strong' }, '今日升级次数'),
        tag(`${left} / ${Base.DAILY_UPGRADE_LIMIT} 次`, left > 0 ? 'good' : 'warn')),
      h('div', { class: 'xs muted', style: { marginTop: '4px' } },
        `每天 06:00 刷新，最多升级 ${Base.DAILY_UPGRADE_LIMIT} 处设施；每次升级都要花时间和材料，所以“今天先升哪个”是个真实选择。`),

      // 八处设施等级速览：手机上不用滚八张卡片也能看清现状
      h('div', { class: 'grid three', style: { marginTop: '10px' } },
        Base.FACILITIES.map((f) => h('div', { class: 'line', onClick: () => ctx.refresh() },
          h('span', { class: 'ic' }, f.icon),
          h('div', { class: 'grow' },
            h('div', { class: 'xs muted' }, f.name),
            h('div', { class: 'strong' }, `Lv.${Base.level(state, f.id)}`))))),

      h('div', { class: 'col', style: { gap: '4px', marginTop: '10px' } },
        h('div', { class: 'row between' }, h('span', { class: 'xs muted' }, '仓库容量'), h('span', { class: 'xs' }, `${Inventory.used(state)} / ${Inventory.capacity(state)}`)),
        h('div', { class: 'row between' }, h('span', { class: 'xs muted' }, '室内保温加成'), h('span', { class: 'xs' }, `+${Math.round(Base.indoorWarmth(state))}℃（供暖 ${Base.level(state, 'heating')} + 住所 ${Base.level(state, 'shelter')}）`)),
        h('div', { class: 'row between' }, h('span', { class: 'xs muted' }, '遇敌风险削减'), h('span', { class: 'xs' }, `${Math.round((1 - Base.defenseMod(state)) * 100)}%`)),
        h('div', { class: 'row between' }, h('span', { class: 'xs muted' }, '每日温室产出'), h('span', { class: 'xs' }, `${Base.level(state, 'greenhouse')} 份`)),
        h('div', { class: 'row between' }, h('span', { class: 'xs muted' }, '每日供暖消耗'), h('span', { class: 'xs' }, Base.level(state, 'heating') > 0 ? `燃料 ${Base.level(state, 'heating')} 份` : '无')),
        h('div', { class: 'row between' }, h('span', { class: 'xs muted' }, '能源状态'), h('span', { class: 'xs', style: { color: state.base.power > 0 && state.flags.energy_ok === false ? 'var(--c-bad)' : '' } }, state.base.power === 0 ? '未建成' : state.flags.energy_ok === false ? '燃油耗尽：加成失效' : `正常（每日消耗燃油 ${state.base.power} 份）`)),
        h('div', { class: 'row between' }, h('span', { class: 'xs muted' }, '互助体系产出'), h('span', { class: 'xs' }, `食物 +${state.aid?.members ?? 0}${(state.aid?.members ?? 0) >= 2 ? `、净水 +${Math.floor((state.aid?.members ?? 0) / 2)}` : ''}`))),
      h('div', { class: 'btn-group', style: { marginTop: '10px' } },
        btn('人物与互助', { kind: 'ghost', sm: true, onClick: () => ctx.go('characters') })),
    ], { cls: 'mind' }),

    sectionTitle('设施', h('span', { class: 'xs muted' }, `上限 ${Base.MAX_LEVEL} 级 · 点开升级`)),
    h('div', { class: 'col' }, Base.FACILITIES.map((f) => {
      const lv = Base.level(state, f.id);
      const cost = Base.upgradeCost(state, f.id);
      const maxed = lv >= f.max;
      return h('div', { class: 'item', role: 'button', tabindex: '0', onClick: () => openFacility(ctx, f.id) },
        h('span', { class: 'ic', style: { fontSize: '18px' } }, f.icon),
        h('div', { class: 'grow' },
          h('div', { class: 'row between' },
            h('span', { class: 'strong small' }, f.name),
            h('span', { class: 'xs muted' }, `Lv.${lv} / ${f.max}`)),
          h('div', { style: { marginTop: '4px' } }, progress(lv, f.max, { cls: 'mind' }))),
        maxed ? tag('满级', 'good') : h('span', { class: 'xs muted' }, `${cost.minutes}分 ›`));
    })),

    sectionTitle('加工设施', h('span', { class: 'xs muted' }, `已解锁 ${recipes.length}/${Base.RECIPES_COUNT}`)),
    recipes.length === 0
      ? empty('升级加工设施后可解锁配方。')
      : h('div', { class: 'col' }, recipes.map((r) => {
        const verdict = Base.canCraft(state, r.id);
        return h('div', { class: 'item' },
          h('span', { class: 'ic', style: { fontSize: '18px' } }, '🔨'),
          h('div', { class: 'grow' },
            h('div', { class: 'row between' },
              h('span', { class: 'strong small' }, r.name),
              h('span', { class: 'xs muted' }, `${r.minutes} 分钟`)),
            h('div', { class: 'xs muted' }, `投入 ${costText({ items: r.in })} → 产出 ${costText({ items: r.out })}`)),
          btn('加工', {
            sm: true, disabled: verdict !== true, reason: verdict === true ? null : verdict,
            onClick: (e) => { e.stopPropagation(); ctx.apply(Base.craft(state, r.id)); },
          }));
      })),
  );
}

/** 设施详情放在底部 Sheet 里，列表才能保持一屏能看完。 */
function openFacility(ctx, id) {
  const state = ctx.state;
  const f = Base.facility(id);
  const lv = Base.level(state, id);
  const cost = Base.upgradeCost(state, id);
  const verdict = Base.canUpgrade(state, id);
  const maxed = lv >= f.max;
  const s = sheet({
    title: `${f.icon} ${f.name} Lv.${lv} / ${f.max}`,
    body: [
      h('div', { class: 'col' },
        h('div', { class: 'narrative small' }, f.desc),
        progress(lv, f.max, { cls: 'mind', showText: true, label: '等级' }),
        h('div', { class: 'col', style: { gap: '4px' } },
          h('div', { class: 'row between' }, h('span', { class: 'xs muted' }, '当前效果'), h('span', { class: 'xs', style: { maxWidth: '68%', textAlign: 'right' } }, lv > 0 ? f.effect(lv) : '未建成')),
          cost ? h('div', { class: 'row between' }, h('span', { class: 'xs muted' }, `升级到 Lv.${lv + 1}`), h('span', { class: 'xs', style: { maxWidth: '68%', textAlign: 'right' } }, f.effect(lv + 1))) : null,
          cost ? h('div', { class: 'row between' }, h('span', { class: 'xs muted' }, '材料'), h('span', { class: 'xs' }, costText(cost))) : null,
          cost ? h('div', { class: 'row between' }, h('span', { class: 'xs muted' }, '耗时'), h('span', { class: 'xs' }, `${cost.minutes} 分钟`)) : null,
          h('div', { class: 'row between' }, h('span', { class: 'xs muted' }, '今日剩余升级次数'), h('span', { class: 'xs' }, `${Base.upgradesLeft(state)} / ${Base.DAILY_UPGRADE_LIMIT}`))),
        maxed
          ? h('div', { class: 'small muted' }, `已经建到 ${f.max} 级上限。`)
          : btn(`升级到 Lv.${lv + 1}（约 ${cost.minutes} 分钟）`, {
            kind: 'primary', block: true, disabled: verdict !== true,
            reason: verdict === true ? null : verdict,
            onClick: () => { s.close(); ctx.apply(Base.upgrade(state, id)); },
          }),
        !maxed && verdict !== true ? h('div', { class: 'xs', style: { color: 'var(--c-warn)' } }, verdict) : null,
      ),
    ],
  });
}

export default BasePage;
