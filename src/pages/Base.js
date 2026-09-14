/**
 * 基地页（V3.0 策划案 §五、§十 · V11 基地视觉化）。
 *
 * 视觉化做法：不引入图片资源，用 DOM + CSS 把八到十处设施画成**可点的建筑格**，
 * 每格显示等级刻度、供电/停摆状态、当前效果与升级耗时；点开仍是设施详情 Sheet。
 * 契约保持不变：每处设施一行 `.item`、可点、文案完整（UI 与审计测试都依赖它）。
 * @module pages/Base
 */
import { h } from '../core/dom.js';
import { btn, card, empty, progress, sectionTitle, sheet, tag } from '../ui/components.js';
import { item } from '../data/items.js';
import * as Base from '../systems/Base.js';
import * as Inventory from '../systems/Inventory.js';
import * as Tech from '../systems/Tech.js';

const costText = (cost) => Object.entries(cost.items).map(([id, n]) => `${item(id).name}×${n}`).join('、');

const techCostText = (cost) => {
  const parts = [];
  if (cost?.cores) parts.push(`晶核×${cost.cores}`);
  if (cost?.blueprint) parts.push(`蓝图×${cost.blueprint}`);
  return parts.join('、') || '免费';
};

/** 等级刻度：用方块表示 10 级，手机上比进度条更直观。 */
const pips = (lv, max) => h('div', { class: 'pips' },
  Array.from({ length: Math.min(max, 10) }, (_, i) =>
    h('i', { class: i < lv ? 'on' : '' })));

/** 建筑状态：停摆 / 满级 / 在产 / 可用。 */
function facilityStatus(state, f, lv) {
  if (lv >= f.max) return { text: '满级', kind: 'good' };
  if (f.id === 'power' && lv > 0 && state.flags.energy_ok === false) return { text: '燃油耗尽', kind: 'bad' };
  if (f.id === 'heating' && lv > 0) return { text: `每日耗燃料 ${lv}`, kind: '' };
  if (f.id === 'greenhouse' && lv > 0) return { text: `每日 +${lv} 食物`, kind: 'good' };
  if (lv === 0) return { text: '未建成', kind: '' };
  return { text: `Lv.${lv}`, kind: 'mind' };
}

export function BasePage(ctx) {
  const state = ctx.state;
  const total = Base.totalLevels(state);
  const recipes = Base.recipes(state);
  const left = Base.upgradesLeft(state);
  const form = Base.form(state);
  const nextForm = Base.nextForm(state);
  const tech = Tech.view(state);
  const built = Base.FACILITIES.filter((f) => Base.level(state, f.id) > 0).length;

  return h('div', { class: 'col base-v4' },
    // ── 基地 HUD（V11：一屏看清基地现在什么样）
    card([
      h('div', { class: 'row between' },
        h('div', { class: 'row', style: { gap: '8px' } },
          h('span', { class: 'strong' }, `${form.icon} ${form.name}`),
          tag(`科技 Lv.${Tech.totalLevels(state)}`, 'mind')),
        tag(`今日升级次数 ${left} / ${Base.DAILY_UPGRADE_LIMIT} 次`, left > 0 ? 'good' : 'warn')),
      h('div', { class: 'hud-grid', style: { marginTop: '10px' } },
        h('div', { class: 'hud-cell' }, h('span', { class: 'xs muted' }, '设施'), h('span', { class: 'strong' }, `${built} / ${Base.FACILITIES.length}`)),
        h('div', { class: 'hud-cell' }, h('span', { class: 'xs muted' }, '等级合计'), h('span', { class: 'strong' }, `${total} / ${Base.FACILITIES.length * Base.MAX_LEVEL}`)),
        h('div', { class: 'hud-cell' }, h('span', { class: 'xs muted' }, '室内保温'), h('span', { class: 'strong' }, `+${Math.round(Base.indoorWarmth(state))}℃`)),
        h('div', { class: 'hud-cell' }, h('span', { class: 'xs muted' }, '遇敌削减'), h('span', { class: 'strong' }, `${Math.round((1 - Base.defenseMod(state)) * 100)}%`)),
        h('div', { class: 'hud-cell' }, h('span', { class: 'xs muted' }, '仓库'), h('span', { class: 'strong' }, `${Inventory.used(state)} / ${Inventory.capacity(state)}`)),
        h('div', { class: 'hud-cell' }, h('span', { class: 'xs muted' }, '电力'), h('span', { class: 'strong', style: { color: state.base.power > 0 && state.flags.energy_ok === false ? 'var(--c-bad)' : '' } }, state.base.power === 0 ? '未建成' : state.flags.energy_ok === false ? '停摆' : '正常'))),
      h('div', { class: 'xs muted', style: { marginTop: '8px' } }, form.desc),
      nextForm
        ? h('div', { class: 'xs muted', style: { marginTop: '4px' } }, `下一个形态「${nextForm.icon} ${nextForm.name}」：${nextForm.hint ?? ''}${nextForm.gap?.levels ? `（还差 ${nextForm.gap.levels} 级）` : ''}`)
        : h('div', { class: 'xs', style: { marginTop: '4px', color: 'var(--c-good)' } }, '已经是最高形态。文明还在。'),
    ], { cls: 'mind' }),

    // ── 基地地图（V11：建筑可视化，点建筑开详情）
    sectionTitle('基地地图', h('span', { class: 'xs muted' }, `点建筑升级 · 上限 ${Base.MAX_LEVEL} 级`)),
    h('div', { class: 'base-grid' }, Base.FACILITIES.map((f, i) => {
      const lv = Base.level(state, f.id);
      const cost = Base.upgradeCost(state, f.id);
      const maxed = lv >= f.max;
      const st = facilityStatus(state, f, lv);
      return h('div', {
        class: ['item', 'building', lv === 0 ? 'off' : '', maxed ? 'maxed' : ''],
        role: 'button',
        tabindex: '0',
        style: { animationDelay: `${Math.min(i * 40, 320)}ms` },
        onClick: () => openFacility(ctx, f.id),
      },
      h('div', { class: 'row between' },
        h('span', { class: 'building-icon' }, f.icon),
        tag(st.text, st.kind)),
      h('div', { class: 'building-name' }, f.name),
      pips(lv, f.max),
      h('div', { class: 'xs muted building-effect' }, lv > 0 ? f.effect(lv) : '还没建'),
      h('div', { class: 'row between', style: { marginTop: '6px' } },
        h('span', { class: 'xs muted' }, `Lv.${lv} / ${f.max}`),
        h('span', { class: 'xs muted' }, maxed ? '已满级' : `${cost.minutes} 分 ›`)));
    })),

    // ── 科技（V3.0 §四）
    sectionTitle('科技', h('span', { class: 'xs muted' }, `晶核 ${state.cores} · 蓝图 ${Inventory.count(state, 'blueprint')}`)),
    h('div', { class: 'col' }, tech.map((line) => h('div', { class: 'line' },
      h('span', { class: 'ic', style: { fontSize: '18px' } }, line.icon),
      h('div', { class: 'grow' },
        h('div', { class: 'row between' },
          h('span', { class: 'strong small' }, line.name),
          h('span', { class: 'xs muted' }, `Lv.${line.level} / ${Tech.MAX_TECH_LEVEL}`)),
        h('div', { style: { marginTop: '4px' } }, progress(line.level, Tech.MAX_TECH_LEVEL, { cls: 'mind' })),
        h('div', { class: 'xs muted', style: { marginTop: '4px' } }, line.max ? '已研究到顶' : `${line.current} → ${line.next?.desc ?? ''}`),
        !line.max && line.cost ? h('div', { class: 'xs muted' }, `需要：${techCostText(line.cost)}｜耗时 180 分钟`) : null),
      line.max
        ? tag('满级', 'good')
        : btn('研究', {
          kind: 'primary', sm: true, disabled: !line.available,
          reason: line.reason,
          onClick: (e) => { e.stopPropagation(); ctx.apply(Tech.research(state, line.id)); },
        })))),

    // ── 加工设施
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

    card([
      h('div', { class: 'small muted' },
        `每天 06:00 刷新升级额度（${Base.DAILY_UPGRADE_LIMIT} 次），每次升级都要花时间和材料 —— "今天先升哪个"是真实取舍。\n供暖 ${Base.level(state, 'heating')} 级每日消耗燃料 ${Base.level(state, 'heating')} 份；能源 ${Base.level(state, 'power')} 级每日消耗燃油 ${Base.level(state, 'power')} 份（能源科技可打折）。`),
      h('div', { class: 'btn-group', style: { marginTop: '10px' } },
        btn('人物与排班', { kind: 'ghost', sm: true, onClick: () => ctx.go('characters') }),
        btn('科技细节', { kind: 'ghost', sm: true, onClick: () => ctx.go('mind') })),
    ], { cls: 'flat' }),
  );
}

/** 设施详情放在底部 Sheet 里，地图格只负责"看见"和"点开"。 */
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
