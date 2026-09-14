/**
 * 等距雪地基地场景生成器 v3（纯 SVG 路径，零素材零依赖）。
 *
 * 等距映射：屏幕 = (OX + K*(u-v), OY + 0.5*(u+v) - z)，K = cos30° ≈ 0.866。
 * v3 相对 v2 的改进（按用户《基地细节》标注图）：
 *   1. 屋顶改成**整片雪顶**（v2 像翻开的书），只在檐口露一圈深色板；
 *   2. 城墙加**垛口 + 角楼**，不再是飘着的白板；
 *   3. 农田改成**有边界的田垄**（带雪边、垄沟），不再是格栅；
 *   4. 新增**中央广场**（等距铺装 + 篝火），把基地的中心立起来；
 *   5. 建筑数量与高度铺满雪地，道路两侧加**暖色灯柱**。
 * 用法：node tools/gen-scene.mjs > docs/design/scene-iso.svg
 */

const W = 1304, H = 656;
const K = 0.866;
const OX = W / 2, OY = 128;
const P = (u, v, z = 0) => [OX + K * (u - v), OY + 0.5 * (u + v) - z];
const pts = (a) => a.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
const poly = (a, fill, extra = '') => `<polygon points="${pts(a)}" fill="${fill}" ${extra}/>`;
const objs = [];
const put = (depth, svg) => objs.push({ depth, svg });

/** 建筑：两面墙 + 整片雪顶 + 檐口 + 暖光窗 + 门 + 投影 */
function addBuilding(u, v, w, d, h, o = {}) {
  const {
    wall = '#33507a', wall2 = '#20304a', plate = '#182740', snowTop = '#f4faff',
    glow = '#ffc274', wins = 3, sill = true,
  } = o;
  const g = [];
  const c = P(u + w / 2, v + d / 2, 0);
  g.push(`<ellipse cx="${c[0].toFixed(1)}" cy="${(c[1] + 3).toFixed(1)}" rx="${(K * (w + d) * 0.4).toFixed(1)}" ry="${(0.22 * (w + d)).toFixed(1)}" fill="rgba(84,112,150,.20)"/>`);
  g.push(poly([P(u, v, h), P(u + w, v, h), P(u + w, v, 0), P(u, v, 0)], wall));
  g.push(poly([P(u, v, h), P(u, v + d, h), P(u, v + d, 0), P(u, v, 0)], wall2));
  // 墙面竖缝（木石纹理）
  for (let i = 1; i < 4; i++) {
    const t = i / 4;
    g.push(poly([P(u + w * t - 1, v, h), P(u + w * t + 1, v, h), P(u + w * t + 1, v, 2), P(u + w * t - 1, v, 2)], 'rgba(0,0,0,.10)'));
  }
  // 檐口
  g.push(poly([P(u, v, h), P(u + w, v, h), P(u + w, v, h - 6), P(u, v, h - 6)], 'rgba(255,255,255,.20)'));
  g.push(poly([P(u, v, h), P(u, v + d, h), P(u, v + d, h - 6), P(u, v, h - 6)], 'rgba(255,255,255,.10)'));
  // 整片雪顶（略外挑）+ 顶面厚度
  const e = 4;
  g.push(poly([P(u - e, v - e, h + 8), P(u + w + e, v - e, h + 8), P(u + w + e, v + d + e, h + 8), P(u - e, v + d + e, h + 8)], plate));
  g.push(poly([P(u - e, v - e, h + 12), P(u + w + e, v - e, h + 12), P(u + w + e, v + d + e, h + 12), P(u - e, v + d + e, h + 12)], snowTop));
  g.push(poly([P(u - e, v + d + e, h + 12), P(u + w + e, v + d + e, h + 12), P(u + w + e, v + d + e, h + 6), P(u - e, v + d + e, h + 6)], '#cfdeee'));
  g.push(poly([P(u + w + e, v - e, h + 12), P(u + w + e, v + d + e, h + 12), P(u + w + e, v + d + e, h + 6), P(u + w + e, v - e, h + 6)], '#dbe7f4'));
  // 暖光窗
  for (let i = 0; i < wins; i++) {
    const t = (i + 0.7) / (wins + 0.5);
    const a = P(u + w * t - 3.5, v, h * 0.32), b = P(u + w * t + 3.5, v, h * 0.32);
    const c2 = P(u + w * t + 3.5, v, h * 0.66), d2 = P(u + w * t - 3.5, v, h * 0.66);
    g.push(poly([a, b, c2, d2], glow));
    if (sill) g.push(poly([P(u + w * t - 5, v, h * 0.28), P(u + w * t + 5, v, h * 0.28), P(u + w * t + 5, v, h * 0.24), P(u + w * t - 5, v, h * 0.24)], '#e8eef7'));
    g.push(`<circle cx="${((a[0] + b[0]) / 2).toFixed(1)}" cy="${((a[1] + c2[1]) / 2).toFixed(1)}" r="${(h * 0.55).toFixed(1)}" fill="url(#winGlow)"/>`);
  }
  // 门
  g.push(poly([P(u + w * 0.5 - 8, v, 0), P(u + w * 0.5 + 8, v, 0), P(u + w * 0.5 + 8, v, h * 0.24), P(u + w * 0.5 - 8, v, h * 0.24)], '#ffd79a'));
  put(u + v + (w + d) * 0.5, g.join('\n'));
}

/** 雪松 */
function addTree(u, v, sc = 1) {
  const [x, y] = P(u, v, 0);
  put(u + v, `<g transform="translate(${x.toFixed(1)},${y.toFixed(1)})">
    <ellipse cx="0" cy="2" rx="${16 * sc}" ry="${5 * sc}" fill="rgba(84,112,150,.20)"/>
    <rect x="${-2.4 * sc}" y="${-9 * sc}" width="${4.8 * sc}" height="${13 * sc}" fill="#5b4630"/>
    <polygon points="0,${-60 * sc} ${16 * sc},${-26 * sc} ${-16 * sc},${-26 * sc}" fill="#2c554e"/>
    <polygon points="0,${-72 * sc} ${13 * sc},${-42 * sc} ${-13 * sc},${-42 * sc}" fill="#33615a"/>
    <polygon points="0,${-84 * sc} ${10 * sc},${-58 * sc} ${-10 * sc},${-58 * sc}" fill="#3a6c63"/>
    <polygon points="0,${-86 * sc} ${7.5 * sc},${-70 * sc} ${-7.5 * sc},${-70 * sc}" fill="#f2f8ff" opacity=".95"/>
  </g>`);
}

/** 城墙：厚墙 + 垛口 + 压顶雪 */
function addWall(u, v, len, along = 'u', h = 26) {
  const w = along === 'u' ? len : 9, d = along === 'u' ? 9 : len;
  const g = [
    poly([P(u, v, h), P(u + w, v, h), P(u + w, v + d, h), P(u, v + d, h)], '#e9f1fa'),
    poly([P(u, v, h), P(u + w, v, h), P(u + w, v, 0), P(u, v, 0)], along === 'u' ? '#b9cde0' : '#a9c0d6'),
    poly([P(u, v, h), P(u, v + d, h), P(u, v + d, 0), P(u, v, 0)], '#9db5cd'),
  ];
  const n = Math.max(2, Math.floor(len / 30));
  for (let i = 0; i < n; i++) {
    const t = ((i + 0.5) / n) * len;
    const cu = along === 'u' ? u + t - 7 : u;
    const cv = along === 'u' ? v : v + t - 7;
    const cw = along === 'u' ? 14 : 9, cd = along === 'u' ? 9 : 14;
    g.push(poly([P(cu, cv, h + 14), P(cu + cw, cv, h + 14), P(cu + cw, cv + cd, h + 14), P(cu, cv + cd, h + 14)], '#f6faff'));
    g.push(poly([P(cu, cv, h + 14), P(cu + cw, cv, h + 14), P(cu + cw, cv, h), P(cu, cv, h)], '#c3d6e8'));
  }
  put(u + v + (w + d) * 0.5, g.join('\n'));
}

/** 角楼：方形塔 */
function addTower(u, v, s = 26, h = 66) {
  addBuilding(u, v, s, s, h, { wall: '#33517b', wall2: '#1f3049', wins: 1, sill: false });
}

/** 灯柱：暖光点 + 光晕 */
function addLamp(u, v) {
  const [x, y] = P(u, v, 0);
  put(u + v, `<g>
    <rect x="${(x - 1.5).toFixed(1)}" y="${(y - 34).toFixed(1)}" width="3" height="34" fill="#4a5b73"/>
    <circle cx="${x.toFixed(1)}" cy="${(y - 38).toFixed(1)}" r="4.5" fill="#ffd79a"/>
    <circle cx="${x.toFixed(1)}" cy="${(y - 38).toFixed(1)}" r="26" fill="url(#lampGlow)"/>
  </g>`);
}

/* ───────────────── 场景构成 ───────────────── */
const plazaC = P(250, 232, 0);
const plaza = `<ellipse cx="${plazaC[0].toFixed(1)}" cy="${plazaC[1].toFixed(1)}" rx="118" ry="60" fill="#cfdcec"/>
<ellipse cx="${plazaC[0].toFixed(1)}" cy="${plazaC[1].toFixed(1)}" rx="96" ry="48" fill="#dde8f4"/>
<ellipse cx="${plazaC[0].toFixed(1)}" cy="${plazaC[1].toFixed(1)}" rx="70" ry="35" fill="#e7f0fa"/>`;

// 主建筑（指挥中心）+ 周边建筑（配色/高度/窗数各不同，铺满雪地）
addBuilding(150, 16, 156, 116, 108, { wall: '#3a5a86', wall2: '#24374f', wins: 4 });
addBuilding(-46, 132, 106, 84, 80, { wall: '#2f4a72', wall2: '#1e2e46', wins: 2 });
addBuilding(326, 36, 124, 96, 96, { wall: '#3d5f8a', wall2: '#25384f', wins: 3 });
addBuilding(96, 250, 150, 112, 92, { wall: '#43648e', wall2: '#283a51', wins: 4 });
addBuilding(-62, 318, 112, 88, 78, { wall: '#2d476e', wall2: '#1d2c43', wins: 3 });
addBuilding(338, 252, 132, 100, 88, { wall: '#36557d', wall2: '#21324a', wins: 3 });
addBuilding(462, 132, 96, 78, 70, { wall: '#2a436a', wall2: '#1c2b41', wins: 2 });
addBuilding(-14, 88, 84, 66, 62, { wall: '#31507a', wall2: '#1f2f47', wins: 2 });
addBuilding(300, 376, 118, 92, 74, { wall: '#33517b', wall2: '#1f3049', wins: 3 });
addBuilding(-100, 232, 92, 74, 66, { wall: '#2b4569', wall2: '#1c2b40', wins: 2 });

// 城墙（四面留门）+ 四座角楼
addWall(-124, -112, 434, 'u');
addWall(-124, -112, 430, 'v');
addWall(190, 322, 130, 'u');
addWall(-124, 322, 250, 'u');
addWall(310, -112, 344, 'v');
addTower(-130, -118, 28, 70);
addTower(302, -118, 28, 70);
addTower(-130, 314, 28, 70);
addTower(302, 314, 28, 70);

// 农田（边界 + 垄沟 + 雪边）
const fU = 392, fV = 296;
put(fU + fV + 90, [
  poly([P(fU - 8, fV - 8, 1), P(fU + 132, fV - 8, 1), P(fU + 132, fV + 118, 1), P(fU - 8, fV + 118, 1)], '#b9cde0'),
  poly([P(fU, fV, 2), P(fU + 124, fV, 2), P(fU + 124, fV + 110, 2), P(fU, fV + 110, 2)], '#cfe0ee'),
  ...Array.from({ length: 6 }, (_, i) => poly([
    P(fU + 6, fV + 10 + i * 17, 3), P(fU + 118, fV + 10 + i * 17, 3),
    P(fU + 118, fV + 17 + i * 17, 3), P(fU + 6, fV + 17 + i * 17, 3),
  ], i % 2 ? '#7d97b5' : '#93aac4')),
].join('\n'));

// 树木与灯柱
addTree(-108, -46, 1.1);
addTree(-64, 430, 1.15);
addTree(18, 452, 0.85);
addTree(548, 84, 1.05);
addTree(584, 184, 0.8);
addTree(-96, 164, 0.9);
addLamp(196, 172); addLamp(312, 172); addLamp(196, 292); addLamp(312, 292);
addLamp(56, 356); addLamp(452, 232);

const sorted = objs.sort((a, b) => a.depth - b.depth).map((o) => o.svg).join('\n');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>
  <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#e9f2fb"/><stop offset=".5" stop-color="#cddff0"/><stop offset="1" stop-color="#aec8e0"/>
  </linearGradient>
  <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#cfe0f0"/><stop offset="1" stop-color="#9cbad7"/>
  </linearGradient>
  <radialGradient id="winGlow"><stop offset="0" stop-color="#ffbf6e" stop-opacity=".45"/><stop offset="1" stop-color="#ffbf6e" stop-opacity="0"/></radialGradient>
  <radialGradient id="lampGlow"><stop offset="0" stop-color="#ffd79a" stop-opacity=".55"/><stop offset="1" stop-color="#ffd79a" stop-opacity="0"/></radialGradient>
  <radialGradient id="fireGlow"><stop offset="0" stop-color="#ffdca8" stop-opacity=".85"/><stop offset="1" stop-color="#ff9d4d" stop-opacity="0"/></radialGradient>
  <radialGradient id="drift"><stop offset="0" stop-color="#ffffff" stop-opacity=".8"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient>
</defs>

<rect width="${W}" height="${H}" fill="url(#sky)"/>
<path d="M0 146 L160 86 L300 144 L470 72 L640 146 L820 90 L980 146 L1140 98 L1304 146 L1304 212 L0 212 Z" fill="#b7cce2" opacity=".7"/>
<path d="M0 164 L200 120 L380 166 L560 116 L760 168 L960 126 L1140 170 L1304 134 L1304 216 L0 216 Z" fill="#c8dbee" opacity=".85"/>

${poly([P(-160, -140, 0), P(620, -140, 0), P(620, 600, 0), P(-160, 600, 0)], 'url(#ground)', 'opacity=".95"')}
<ellipse cx="420" cy="452" rx="350" ry="88" fill="url(#drift)"/>
<ellipse cx="880" cy="296" rx="250" ry="62" fill="url(#drift)" opacity=".72"/>

${plaza}

${poly([P(-70, 214, 0), P(540, 214, 0), P(540, 250, 0), P(-70, 250, 0)], 'rgba(152,178,206,.45)')}
${poly([P(236, -70, 0), P(272, -70, 0), P(272, 460, 0), P(236, 460, 0)], 'rgba(152,178,206,.35)')}
<path d="M${P(-50, 232, 0)[0].toFixed(1)} ${P(-50, 232, 0)[1].toFixed(1)} L${P(520, 232, 0)[0].toFixed(1)} ${P(520, 232, 0)[1].toFixed(1)}" stroke="rgba(120,148,180,.45)" stroke-width="2" stroke-dasharray="12 16" fill="none"/>

<ellipse cx="${plazaC[0].toFixed(1)}" cy="${plazaC[1].toFixed(1)}" rx="150" ry="70" fill="url(#fireGlow)"/>
<ellipse cx="${plazaC[0].toFixed(1)}" cy="${(plazaC[1] - 2).toFixed(1)}" rx="30" ry="14" fill="#b6c7d8"/>
<ellipse cx="${plazaC[0].toFixed(1)}" cy="${(plazaC[1] - 2).toFixed(1)}" rx="20" ry="9" fill="#6b5843"/>
<path d="M${plazaC[0].toFixed(1)} ${(plazaC[1] - 46).toFixed(1)} q12 19 0 36 q-12 -17 0 -36 Z" fill="#ffcf8a"/>
<path d="M${plazaC[0].toFixed(1)} ${(plazaC[1] - 32).toFixed(1)} q7 14 0 26 q-7 -12 0 -26 Z" fill="#fff4d8"/>

${sorted}

${Array.from({ length: 90 }, (_, i) => {
  const x = (i * 101) % W, y = (i * 163) % H, r = (i % 3) * 0.5 + 0.9;
  return `<circle cx="${x}" cy="${y}" r="${r}" fill="#ffffff" opacity="${(0.2 + (i % 4) * 0.12).toFixed(2)}"/>`;
}).join('\n')}
</svg>
`;

process.stdout.write(svg);
