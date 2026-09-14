/**
 * 等距雪地基地场景生成器 v2（纯 SVG 路径，零素材零依赖）。
 *
 * 等距映射：屏幕 = (OX + K*(u-v), OY + 0.5*(u+v) - z)，K = cos30° ≈ 0.866。
 * 关键修复（v1 画得像空心盒子）：
 *   1. **深度排序**：所有物体按 (u+v) 升序绘制（画家算法），近的后画；
 *   2. **材质对比**：雪地压暗成浅蓝灰，屋面用深色板 + 半侧雪脊，建筑才立得起来；
 *   3. 每栋建筑有独立配色，不再是同一块砖复制七遍。
 * 用法：node tools/gen-scene.mjs > docs/design/scene-iso.svg
 */

const W = 1304, H = 656;
const K = 0.866;
const OX = W / 2, OY = 132;
const P = (u, v, z = 0) => [OX + K * (u - v), OY + 0.5 * (u + v) - z];
const pts = (a) => a.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
const poly = (a, fill, extra = '') => `<polygon points="${pts(a)}" fill="${fill}" ${extra}/>`;

const objs = [];
/** 注册一个物体：depth 越大越靠近观察者，越晚绘制。 */
const put = (depth, svg) => objs.push({ depth, svg });

/** 建筑：三个可见面 + 屋面板 + 半侧雪脊 + 暖光窗 + 门 + 地面投影 */
function addBuilding(u, v, w, d, h, opt = {}) {
  const {
    wall = '#33507a', wall2 = '#20304a', plate = '#1b2a44', ridge = '#f2f8ff',
    snow = '#eaf3fb', glow = '#ffc274', wins = 3, door = '#ffd79a',
  } = opt;
  const o = [];
  const c = P(u + w / 2, v + d / 2, 0);
  o.push(`<ellipse cx="${c[0].toFixed(1)}" cy="${(c[1] + 3).toFixed(1)}" rx="${(K * (w + d) * 0.42).toFixed(1)}" ry="${(0.24 * (w + d)).toFixed(1)}" fill="rgba(84,112,150,.22)"/>`);
  // 右面（受光）
  o.push(poly([P(u, v, h), P(u + w, v, h), P(u + w, v, 0), P(u, v, 0)], wall));
  // 左面（背光）
  o.push(poly([P(u, v, h), P(u, v + d, h), P(u, v + d, 0), P(u, v, 0)], wall2));
  // 檐口（沿两面各压一条亮边，增加体积感）
  o.push(poly([P(u, v, h), P(u + w, v, h), P(u + w, v, h - 5), P(u, v, h - 5)], 'rgba(255,255,255,.22)'));
  o.push(poly([P(u, v, h), P(u, v + d, h), P(u, v + d, h - 5), P(u, v, h - 5)], 'rgba(255,255,255,.12)'));
  // 屋面板
  o.push(poly([P(u, v, h + 6), P(u + w, v, h + 6), P(u + w, v + d, h + 6), P(u, v + d, h + 6)], plate));
  // 半侧雪脊（靠上的一半）
  const s = 0.08;
  o.push(poly([
    P(u + w * s, v + d * s, h + 9), P(u + w * (1 - s), v + d * s, h + 9),
    P(u + w * (1 - s), v + d * 0.52, h + 9), P(u + w * s, v + d * 0.52, h + 9),
  ], ridge));
  o.push(poly([
    P(u + w * s, v + d * 0.52, h + 9), P(u + w * (1 - s), v + d * 0.52, h + 9),
    P(u + w * (1 - s), v + d * 0.62, h + 7), P(u + w * s, v + d * 0.62, h + 7),
  ], snow, 'opacity=".55"'));
  // 暖光窗（在右面上）
  for (let i = 0; i < wins; i++) {
    const t = (i + 0.7) / (wins + 0.5);
    const a = P(u + w * t - 3.5, v, h * 0.34), b = P(u + w * t + 3.5, v, h * 0.34);
    const c2 = P(u + w * t + 3.5, v, h * 0.68), d2 = P(u + w * t - 3.5, v, h * 0.68);
    o.push(poly([a, b, c2, d2], glow));
    o.push(`<circle cx="${((a[0] + b[0]) / 2).toFixed(1)}" cy="${((a[1] + c2[1]) / 2).toFixed(1)}" r="${(h * 0.5).toFixed(1)}" fill="url(#winGlow)"/>`);
  }
  // 门
  o.push(poly([P(u + w * 0.5 - 8, v, 0), P(u + w * 0.5 + 8, v, 0), P(u + w * 0.5 + 8, v, h * 0.26), P(u + w * 0.5 - 8, v, h * 0.26)], door));
  put(u + v + (w + d) * 0.5, o.join('\n'));
}

/** 雪松 */
function addTree(u, v, sc = 1) {
  const [x, y] = P(u, v, 0);
  put(u + v, `<g transform="translate(${x.toFixed(1)},${y.toFixed(1)})">
    <ellipse cx="0" cy="2" rx="${16 * sc}" ry="${5 * sc}" fill="rgba(84,112,150,.22)"/>
    <rect x="${-2.4 * sc}" y="${-9 * sc}" width="${4.8 * sc}" height="${13 * sc}" fill="#5b4630"/>
    <polygon points="0,${-60 * sc} ${16 * sc},${-26 * sc} ${-16 * sc},${-26 * sc}" fill="#2c554e"/>
    <polygon points="0,${-72 * sc} ${13 * sc},${-42 * sc} ${-13 * sc},${-42 * sc}" fill="#33615a"/>
    <polygon points="0,${-84 * sc} ${10 * sc},${-58 * sc} ${-10 * sc},${-58 * sc}" fill="#3a6c63"/>
    <polygon points="0,${-84 * sc} ${6.5 * sc},${-70 * sc} ${-6.5 * sc},${-70 * sc}" fill="#eef6ff" opacity=".92"/>
  </g>`);
}

/** 围墙段（薄墙 + 压顶雪） */
function addWall(u, v, len, along = 'u', h = 24) {
  const w = along === 'u' ? len : 7, d = along === 'u' ? 7 : len;
  put(u + v + (w + d) * 0.5, [
    poly([P(u, v, h), P(u + w, v, h), P(u + w, v + d, h), P(u, v + d, h)], '#f4f9ff'),
    poly([P(u, v, h), P(u + w, v, h), P(u + w, v, 0), P(u, v, 0)], '#c6d6e6'),
    poly([P(u, v, h), P(u, v + d, h), P(u, v + d, 0), P(u, v, 0)], '#a8bfd6'),
  ].join('\n'));
}

/* ───────────────── 场景构成 ───────────────── */
// 主建筑（指挥中心，最大最高，居中偏后）
addBuilding(150, 30, 150, 112, 104, { wall: '#36557f', wall2: '#22334d', plate: '#1a2942', wins: 4 });
// 仓库 / 发电站 / 居民楼 / 伐木场 / 温室 / 小作坊（各自配色不同）
addBuilding(-40, 140, 104, 82, 78, { wall: '#2f4a72', wall2: '#1e2e46', wins: 2 });
addBuilding(322, 48, 120, 94, 92, { wall: '#3a5c86', wall2: '#24374f', wins: 3 });
addBuilding(110, 244, 144, 110, 94, { wall: '#40618c', wall2: '#27394f', wins: 4 });
addBuilding(-58, 322, 110, 86, 76, { wall: '#2d476e', wall2: '#1d2c43', wins: 3 });
addBuilding(330, 250, 128, 98, 86, { wall: '#35547d', wall2: '#21324a', wins: 3 });
addBuilding(452, 150, 92, 74, 68, { wall: '#2a436a', wall2: '#1c2b41', wins: 2 });

// 围墙（围住基地三面）
addWall(-116, -104, 420, 'v');
addWall(-116, 300, 300, 'u');
addWall(316, -104, 320, 'v');
addWall(258, 300, 150, 'u');

// 雪松
addTree(-96, -40, 1.1);
addTree(-52, 430, 1.15);
addTree(26, 470, 0.85);
addTree(556, 96, 1.05);
addTree(600, 190, 0.8);

/* 生成 SVG */
const sorted = objs.sort((a, b) => a.depth - b.depth).map((o) => o.svg).join('\n');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>
  <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#e7f1fb"/><stop offset=".5" stop-color="#cddff0"/><stop offset="1" stop-color="#b0c9e0"/>
  </linearGradient>
  <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#cfdff0"/><stop offset="1" stop-color="#9dbad6"/>
  </linearGradient>
  <radialGradient id="winGlow"><stop offset="0" stop-color="#ffbf6e" stop-opacity=".5"/><stop offset="1" stop-color="#ffbf6e" stop-opacity="0"/></radialGradient>
  <radialGradient id="fireGlow"><stop offset="0" stop-color="#ffd79a" stop-opacity=".8"/><stop offset="1" stop-color="#ff9d4d" stop-opacity="0"/></radialGradient>
  <radialGradient id="drift"><stop offset="0" stop-color="#ffffff" stop-opacity=".8"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient>
</defs>

<rect width="${W}" height="${H}" fill="url(#sky)"/>
<path d="M0 148 L160 88 L300 146 L470 74 L640 148 L820 92 L980 148 L1140 100 L1304 148 L1304 210 L0 210 Z" fill="#b9cee2" opacity=".7"/>
<path d="M0 166 L200 122 L380 168 L560 118 L760 170 L960 128 L1140 172 L1304 136 L1304 214 L0 214 Z" fill="#c9dcee" opacity=".85"/>

${poly([P(-150, -130, 0), P(600, -130, 0), P(600, 580, 0), P(-150, 580, 0)], 'url(#ground)', 'opacity=".95"')}
<ellipse cx="430" cy="452" rx="340" ry="86" fill="url(#drift)"/>
<ellipse cx="880" cy="300" rx="250" ry="64" fill="url(#drift)" opacity=".75"/>

${poly([P(-60, 214, 0), P(520, 214, 0), P(520, 252, 0), P(-60, 252, 0)], 'rgba(150,176,204,.5)')}
${poly([P(238, -60, 0), P(276, -60, 0), P(276, 440, 0), P(238, 440, 0)], 'rgba(150,176,204,.38)')}
<path d="M${P(-40, 228, 0)[0].toFixed(1)} ${P(-40, 228, 0)[1].toFixed(1)} L${P(490, 228, 0)[0].toFixed(1)} ${P(490, 228, 0)[1].toFixed(1)}" stroke="rgba(118,146,178,.5)" stroke-width="2" stroke-dasharray="12 16" fill="none"/>
<path d="M${P(-40, 240, 0)[0].toFixed(1)} ${P(-40, 240, 0)[1].toFixed(1)} L${P(490, 240, 0)[0].toFixed(1)} ${P(490, 240, 0)[1].toFixed(1)}" stroke="rgba(118,146,178,.36)" stroke-width="2" stroke-dasharray="12 16" fill="none"/>

<!-- 农田：深色田垄 + 雪边 -->
${poly([P(430, 336, 1), P(556, 336, 1), P(556, 430, 1), P(430, 430, 1)], '#c3d5e6')}
${[0, 1, 2, 3, 4].map((i) => poly([P(436, 344 + i * 17, 2), P(550, 344 + i * 17, 2), P(550, 350 + i * 17, 2), P(436, 350 + i * 17, 2)], i % 2 ? '#6f8bab' : '#8aa4c0')).join('\n')}

<!-- 篝火 -->
<ellipse cx="${P(256, 196, 0)[0].toFixed(1)}" cy="${P(256, 196, 0)[1].toFixed(1)}" rx="140" ry="64" fill="url(#fireGlow)"/>
<ellipse cx="${P(256, 196, 0)[0].toFixed(1)}" cy="${P(256, 196, 0)[1] - 3}" rx="30" ry="14" fill="#b6c7d8"/>
<ellipse cx="${P(256, 196, 0)[0].toFixed(1)}" cy="${P(256, 196, 0)[1] - 3}" rx="20" ry="9" fill="#6b5843"/>
<path d="M${P(256, 196, 0)[0].toFixed(1)} ${(P(256, 196, 0)[1] - 44).toFixed(1)} q11 18 0 34 q-11 -16 0 -34 Z" fill="#ffcf8a"/>
<path d="M${P(256, 196, 0)[0].toFixed(1)} ${(P(256, 196, 0)[1] - 30).toFixed(1)} q7 13 0 24 q-7 -11 0 -24 Z" fill="#fff4d8"/>

<!-- 物体（已按深度排序） -->
${sorted}

<!-- 飘雪 -->
${Array.from({ length: 80 }, (_, i) => {
  const x = (i * 101) % W, y = (i * 167) % H, r = (i % 3) * 0.5 + 0.9;
  return `<circle cx="${x}" cy="${y}" r="${r}" fill="#ffffff" opacity="${(0.22 + (i % 4) * 0.13).toFixed(2)}"/>`;
}).join('\n')}
</svg>
`;

process.stdout.write(svg);
