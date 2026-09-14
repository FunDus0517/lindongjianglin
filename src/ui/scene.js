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
import * as Base from '../systems/Base.js';

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
      h('span', { class: 'muted' }, `设施 ${built} / ${Base.FACILITIES.length}`)));
}

export default sceneView;
