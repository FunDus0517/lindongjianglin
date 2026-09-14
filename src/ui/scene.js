/**
 * 中央场景（UI 重做规范 §三.1）：把用户提供的美术图当作基地全景底图，
 * 上面叠可点的**建筑节点**（图标 + 名称 + 等级 + 状态）。
 *
 * 两条硬约束：
 * 1. 用户的图**只读**：整图贴底，不裁剪、不压缩、不改色（`object-fit: cover` 只做等比铺满）；
 *    文件在 `assets/base-scene.png`，来源见 docs/进度与续作.md。
 * 2. 图挂了不能出现"碎图"：加载失败时静默退回 CSS 渐变底（`onerror` → `.missing`），
 *    iOS 离线包暂时带不了二进制（内容清单只收文本）时就是靠这条兜底。
 *
 * @module ui/scene
 */
import { h } from '../core/dom.js';
import { btn, sheet } from './components.js';
import * as Base from '../systems/Base.js';
import * as Growth from '../systems/Growth.js';
import * as Map from '../systems/Map.js';
import * as Quest from '../systems/Quest.js';
import { band } from '../systems/Fame.js';

/** 图的原始尺寸（1672×941），用于保持比例。 */
export const SCENE_SRC = './assets/base-scene.png';

/**
 * 节点在图上的位置（百分比，左上角原点）。
 * 这是**对着美术图逐栋摆的**，依据两件事：
 * 1. 视觉描述给出的地标（正中主楼 / 左上带烟囱工业楼 / 左中低矮仓库群 / 右上成片民房 /
 *    右下围墙内玻璃温室 / 正右围墙角瞭望塔 / 后方冰湖 + 雪山 / 黄昏蓝调 + 暖黄窗光）；
 * 2. 逐点像素指纹核对（窗光暖色像素 = 有人的建筑；纯雪地/冰湖是 0% 暖色，用来避开空地）。
 * 改坐标前先量一下：采样该点 ±24px 的平均亮度与暖色占比，暖光点是楼、0% 暖色多半是雪地/树林。
 */
const NODE_POS = {
  shelter: [50, 51],     // 正中主楼（体量最大、顶层暖光）
  research: [62, 36],    // 主楼右上，天线/雷达所在
  power: [22, 29],       // 左上带烟囱的工业楼
  heating: [38, 33],     // 工业楼右下（供暖一处）
  medical: [18, 45],     // 主楼左侧的结构
  storage: [22, 58],     // 左中低矮仓库群
  workshop: [36, 68],    // 仓库群右下（有暖光）
  housing: [85, 40],     // 右上到正右的成片民房（暖色最密）
  defense: [88, 56],     // 正右围墙角的瞭望塔
  greenhouse: [72, 70],  // 右下围墙内的玻璃温室
};

/** 建筑状态文案（基地页那份更详细，这里只要一眼能读）。 */
function statusOf(state, f, lv) {
  if (f.id === 'power' && lv > 0 && state.flags?.energy_ok === false) return { text: '停摆', cls: 'bad' };
  if (lv <= 0) return { text: '未建成', cls: 'off' };
  if (lv >= f.max) return { text: '满级', cls: '' };
  return { text: `Lv.${lv}`, cls: '' };
}

/**
 * @param {object} state 游戏状态
 * @param {{onPick?: (id: string) => void}} handlers 点节点时回调（默认进基地页）
 */
export function sceneView(state, { onPick } = {}) {
  const form = Base.form(state);
  const built = Base.FACILITIES.filter((f) => Base.level(state, f.id) > 0).length;

  return h('div', { class: 'scene' },
    /* .scene-canvas 是"等于美术图比例"的画布：横屏铺满时它按 cover 撑满外框，
       节点/角标都挂在这层里，所以百分比坐标永远对着图，不会被裁偏。 */
    h('div', { class: 'scene-canvas' },
      h('img', {
        class: 'scene-img',
        src: SCENE_SRC,
        alt: '基地全景（美术图）',
        draggable: 'false',
        loading: 'lazy',
        onError: (e) => e.target?.classList?.add('missing'),
      }),
      h('div', { class: 'scene-nodes' }, Base.FACILITIES.map((f) => {
        const lv = Base.level(state, f.id);
        const st = statusOf(state, f, lv);
        const [x, y] = NODE_POS[f.id] ?? [50, 50];
        return h('button', {
          type: 'button',
          class: ['scene-node', st.cls],
          style: { left: `${x}%`, top: `${y}%` },
          title: `${f.name}：${lv > 0 ? `Lv.${lv}` : '未建成'}｜${f.desc}`,
          onClick: (e) => { e.stopPropagation(); onPick?.(f.id); },
        },
        h('span', { class: 'ic' }, f.icon),
        h('span', { class: 'nm' }, f.name),
        h('span', { class: 'lv' }, lv > 0 ? `Lv.${lv}` : st.text));
      })),
      h('div', { class: 'scene-cap' },
        h('span', null, `${form.icon} ${form.name}`),
        h('span', { class: 'muted' }, `设施 ${built} / ${Base.FACILITIES.length}`))));
}

export default sceneView;

/**
 * 左侧信息栏（设计稿「整体布局图」的左栏：角色信息 / 任务追踪 / 小地图）。
 * 横屏时固定在场景左边；竖屏时排到正文之后（order 控制），不抢场景的位置。
 */
export function hudSide(state, ctx) {
  const g = Growth.view(state);
  const b = band(state.fame);
  const quests = Quest.today(state).slice(0, 3);
  const regions = Map.view(state).slice(0, 4);

  return h('aside', { class: 'hud-side' },
    h('div', { class: 'hud-card' },
      h('div', { class: 'row', style: { gap: '8px' } },
        h('span', { class: 'hud-avatar' }, '🧣'),
        h('div', { class: 'grow', style: { minWidth: 0 } },
          h('div', { class: 'row nowrap', style: { gap: '6px' } },
            h('span', { class: 'strong small' }, `Lv.${g.level}`),
            h('span', { class: 'xs muted ellipsis' }, g.title)),
          h('div', { class: 'bar xp' }, h('i', { style: { width: `${Math.round(g.ratio * 100)}%` } })))),
      h('div', { class: 'row between', style: { marginTop: '6px' } },
        h('span', { class: 'xs muted' }, `⚔️ 战力 ${state.power}`),
        h('span', { class: 'xs muted ellipsis' }, `锋芒 ${state.fame}（${b.label}）`)),
      // 互助规模与能源状态常驻在这张卡上（原来的主界面卡片被收进面板后，这两条重要状态不能丢）
      h('div', { class: 'row between', style: { marginTop: '4px' } },
        h('span', { class: 'xs muted ellipsis' },
          `👥 互助 ${state.aid?.members ?? 0} 人｜士气 ${Math.round(state.aid?.morale ?? 0)}`),
        h('span', {
          class: 'xs ellipsis',
          style: {
            color: state.base.power > 0 && state.flags?.energy_ok === false ? 'var(--c-bad)' : 'var(--c-dim)',
          },
        }, state.base.power === 0 ? '🔌 无能源设施'
          : state.flags?.energy_ok === false ? '🔌 能源停摆' : '🔌 能源正常'))),

    h('div', { class: 'hud-card' },
      h('div', { class: 'row between' },
        h('span', { class: 'hud-cap' }, '任务追踪'),
        btn('全部', { kind: 'ghost', sm: true, onClick: () => ctx.go('quest') })),
      quests.length === 0
        ? h('div', { class: 'xs muted', style: { marginTop: '6px' } }, '今天的任务都完成了。')
        : h('div', { class: 'col', style: { gap: '7px', marginTop: '6px' } }, quests.map((q) => {
          const [cur, target] = Quest.progressOf(state, q.id);
          return h('div', null,
            h('div', { class: 'row between' },
              h('span', { class: 'xs ellipsis' }, `${q.kind === '主线' ? '📌' : '📋'} ${q.title}`),
              h('span', { class: 'xs muted' }, `${cur}/${target}`)),
            h('div', { class: 'bar mind' }, h('i', { style: { width: `${Math.min(100, (cur / target) * 100)}%` } })));
        }))),

    h('div', { class: 'hud-card' },
      h('div', { class: 'row between' },
        h('span', { class: 'hud-cap' }, '小地图'),
        btn('探索', { kind: 'ghost', sm: true, onClick: () => ctx.go('action') })),
      h('div', { class: 'xs muted ellipsis', style: { marginTop: '6px' } }, Map.brief(state)),
      h('div', { class: 'minimap' }, regions.map((r) => h('div', { class: 'mm-region' },
        h('div', { class: 'row between' },
          h('span', { class: 'xs' }, `${r.icon} ${r.name}`),
          h('span', { class: 'xs muted' }, `${r.places.length} 处`)),
        h('div', { class: 'row wrap', style: { gap: '4px', marginTop: '3px' } },
          r.places.slice(0, 8).map((p) => h('span', {
            class: ['mm-dot', p.here ? 'here' : ''],
            title: `${p.name}｜${p.indoor ? '室内' : '室外'}｜${p.minutes} 分钟`,
          }, p.icon))))))),
  );
}

/** 右下角快捷按钮组（设计稿：建造 / 队伍 / 背包 / 更多）。 */
export function hudActions(ctx) {
  const more = () => sheet({
    title: '更多',
    body: [
      h('div', { class: 'btn-group' },
        btn('任务', { kind: 'ghost', onClick: () => ctx.go('quest') }),
        btn('对战', { kind: 'ghost', onClick: () => ctx.go('duel') }),
        btn('成就', { kind: 'ghost', onClick: () => ctx.go('achievement') }),
        btn('设施明细', { kind: 'ghost', onClick: () => ctx.go('base') }),
        btn('光脑', { kind: 'ghost', onClick: () => ctx.go('mind') }),
        btn('设置', { kind: 'ghost', onClick: () => ctx.go('settings') })),
    ],
  });
  return h('div', { class: 'hud-actions' },
    [['🏗️', '建造', 'base'], ['👥', '队伍', 'characters'], ['🎒', '背包', 'warehouse']].map(([ic, lb, route]) =>
      h('button', {
        type: 'button', class: 'hud-fab', title: lb, onClick: () => ctx.go(route),
      }, h('span', { class: 'ic' }, ic), h('span', { class: 'lb' }, lb))),
    h('button', { type: 'button', class: 'hud-fab', title: '更多', onClick: more },
      h('span', { class: 'ic' }, '⋯'), h('span', { class: 'lb' }, '更多')));
}
