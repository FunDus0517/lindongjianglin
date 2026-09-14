# 《凛冬降临》项目交接说明（给接手的 AI / 开发者）

> 这一份是给「豆包 / ChatGPT / 其他 AI 或开发者」看的。项目已经完全可运行，测试全绿（92 项），
> 线上在跑。你要做的是**继续优化**，不是重写。
>
> **重要**：项目已按《无限生存游戏优化方案》重构过一轮 —— 定位是**无限生存经营**，
> 没有通关、没有多结局、没有最终 Boss。如果你手上的资料还写着"30 天通关 / 多结局"，
> 那是旧版本，以本文件与代码为准。

## 〇、当前定位（无限生存）

玩家在持续恶化的寒冬里经营基地、管理资源、养活一群幸存者，让文明延续下去。
**没有终点**：世界分三个阶段，阶段不结束，只改变世界状态。

| 阶段 | 天数 | 世界状态 |
|---|---|---|
| 第一阶段 极寒降临 | 1—30 | 暴雪频繁、资源还算多、人不多（这 30 天保留逐日编排的剧情） |
| 第二阶段 永冬时代 | 31—100 | 温度继续下降、资源变少、危险增加，新区域开放 |
| 第三阶段 冰封世界 | 101— | 极端天气常态化，只有把基地与科技堆起来的人还在 |

三条明确的"不做"：**不做多结局、不做最终 Boss、不做世界恢复/通关剧情**。
第 30 天不是终点，是阶段切换（给一份**阶段总结**，然后继续）。
死亡也不是结局 —— 生命归零只是**倒地**：丢掉"最近一次搜集"的物资、被抬回屋里、损失两小时，然后继续活下去。

## 一、这是什么

纯文字点击式末日生存游戏，中文。技术栈刻意做到最简：
**原生 ES 模块 + hash 路由 + localStorage 存档，零依赖、零构建、无框架。**

- 线上地址（手机可直接玩）：http://59.153.167.60:8080/
- 源码 zip：http://59.153.167.60:8080/download/winterfall-project.zip
- 纯运行文件：http://59.153.167.60:8080/download/winterfall-site.zip
- iPhone 未签名 IPA（丢进全能签签名即可安装）：http://59.153.167.60:8080/download/Winterfall.ipa
- 单文件源码合集（聊天 AI 不用解压就能读）：`/download/winterfall-源码合集.md`

## 二、怎么跑

```bash
cd winterfall
npm start        # 本地静态服务（tools/serve.mjs：gzip/br + ETag 304）
npm test         # 92 项测试，必须全绿
```

没有 `npm install` 这一步 —— 项目没有任何运行时依赖，测试用 Node 内置的 `node:test`。

## 三、目录结构

```
src/
├── core/       流程骨架：effects(唯一结算入口) / router / dom(h 函数) / store / util(带种子随机)
│               audio(合成音) / haptics(震动桥) / prefs
├── systems/    规则层：Survival GameTime Weather Base Tech Inventory Market Quest NPC Battle Duel
│               Achievement Daily Growth Death Ending(评价) Mind Power Fame Faction Story Event
│               Explore Save Assistant(光脑助手)
├── pages/      页面：Home(启动页) Game(主页) Action Warehouse Mind Characters Quest Base Duel
│               Achievement Settings Event Battle Milestone(阶段总结) Ending
├── data/       纯数据：events(132) quests(70) locations(20) battle(16 敌人) characters(7) crew(职业阶梯)
│               items achievements(28) dailies tech(4 条线) factions endings chapters(3 阶段) tutorial
├── ui/         shell(外壳/导航) components
└── styles/     tokens.css app.css（含动态雪花的纯 CSS 图层）
tests/          engine / content / ui / audit / commercial / infinite + _dom.mjs(DOM 垫片)
ios/            iOS 外壳（WKWebView + 内嵌站点 + 本机 HTTP 服务 + 震动桥），GitHub Actions 编译
tools/          serve.mjs pack-bundle.mjs(生成 App 用的内容清单)
```

## 四、五条硬约束（改动前必须知道，违反会出真 bug）

1. **所有状态变化只能经过 `core/effects.js` 的 `applyOutcome(state, outcome)`**。
   顺序固定：资源 → 状态 → 数值 → 关系/势力/Flag → 时间结算 → 后续（战斗/事件）→ 任务
   → 成长/每日/成就 → 存档。绕过它直接改 `state` 会导致界面不同步、自动存档丢失。
2. **`state.active`（待处理事件）的生命周期只属于它的拥有者**。`applyOutcome` 永远不碰它。
3. **随机数（rngCursor）的推进量是平衡的一部分**。天气每天必须且只能消耗一次随机数；
   新增的"凌晨灾害""幸存者受伤"等触发全部写成**确定性**条件（每 N 天、按等级、按库存），
   不要图省事加 `chance()` —— 曾经把天气改成纯函数，结果整局随机序列错位，
   自动游玩第 5 天断水、第 6 天渴死（`tests/content.test.mjs` 的全流程模拟抓到的）。
4. **剧情不再按天排队**：只有第 1 天的开场是固定顺序，其余剧本事件只是登记"最早可出现的日子"
   （`Story.STORY_SCHEDULE`），到日子后进入随机池按解锁顺序优先抽取。
5. **`Save.restore()` 逐层补齐新字段**：新增状态字段必须同时加到 `createState` 与 `restore` 的合并里。

另外：发奖系统（成就 / 每日任务）会在同一笔结算里发货币与晶核。
测试里那些"这次精确扣了多少"的断言要用 `muteRewards(state)` 隔离被测对象，**不要放松断言**。

## 五、已实现的系统（对照无限生存方案）

| 方案条目 | 实现位置 | 说明 |
|---|---|---|
| 世界阶段（§三） | `data/chapters.js` | 三阶段无限延续；第一阶段逐日编排，之后按阶段曲线生成，**温度持续下降**；`worldMods()` 提供全局限额（越往后越少、越危险） |
| 删除多结局/通关/最终 Boss（§二） | 全局 | `state.ending` 不再被任何流程写入；死亡改为倒地；第 30 天只出**阶段总结**；8 个旧结局降级为**评价/称号**（`systems/Ending.js` 的 `report()`） |
| 基地成长（§四） | `systems/Base.js` | 四种形态：木屋 → 地下避难所 → 钢铁堡垒 → 大型地下城市（按设施等级合计与关键设施判定） |
| 科技成长（§四） | `systems/Tech.js` + `data/tech.js` | 供暖/能源/探索/防御四条线各 5 级，成本是晶核 + 蓝图；加成分别接进室内保温、燃油消耗、搜刮收益、战斗防护与夜袭频率 |
| NPC 成长/转职/受伤/死亡/离开（§五） | `systems/NPC.js` + `data/crew.js` | 每人一条职业阶梯（如 邻居→楼栋负责人→基地管理员→基地负责人）；每天涨成长值；会受伤（防御越低越频繁）、伤上加伤会死、冲突到上限会离开、士气崩了会投靠别的势力 |
| 动态剧情事件（§六） | `systems/Event.js` | 取消固定章节排期，剧本事件按"最早出现日 + 解锁顺序"进随机池；132 段事件 |
| 苹果风 UI + 沉浸式启动页（§七） | `pages/Home.js` + `styles/app.css` | 纯 CSS 动态雪花（transform 动画，GPU 合成）、天气信息、继续生存/新旅程/载入记录；圆角 24px、毛玻璃带 `-webkit-` 前缀、三层阴影 |
| 生存循环（§八） | `systems/GameTime.js` | 早晨：天气预测 + 基地检查（晨报）；白天：探索/交易/救援；夜里：休息；**凌晨按确定性间隔触发灾害**（供暖故障/深夜尸潮/失火/屋顶塌） |
| 爽感反馈（§九） | `core/haptics.js` + iOS 桥 | 数字飘出、Toast、合成音效、**iOS 震动**（网页没有 iOS 震动 API，靠 `window.webkit.messageHandlers.haptic` 桥，没桥时静默降级） |
| 光脑 AI 助手（§十） | `systems/Assistant.js` | 四块：天气预测 / 资源分析 / 危险预警 / 生存建议；全部由状态推导，不含隐藏数值 |
| 新区域（§三） | `data/locations.js` | 20 个地点：冰封码头(31)、地下商场(45)、军用检查站(61)、冰封穹顶(101)、深层矿脉(121) |

## 六、还能往哪优化（按性价比排序）

1. **无尽内容的密度**：第二阶段之后主要靠随机事件与经营循环撑，建议补"每周目递增的挑战"
   （更强的尸潮、势力任务线、季节性事件）和长期目标（把基地升到最高形态之后的追求）。
2. **幸存者管理玩法**：目前幸存者会自动成长，玩家不能指派。做"排班/分工"（谁去搜刮、谁守夜、
   谁看病）会让"经营"这一层真正立起来，也让受伤/死亡有更多玩家决策成分。
3. **科技树深度**：现在每条线 5 级、效果线性。可以做前置依赖（供暖 3 级才能开地热）与分支。
4. **离线可玩已经做了**（iOS 外壳内置站点 + 本机 HTTP 服务 + 云端清单更新），但**没有真机验证过**，
   建议在真机上过一遍断网启动。
5. **存档安全**：`localStorage` 明文，改个数字就能作弊；要做排行榜必须服务端校验。

## 七、测试与验收口径

```bash
npm test     # 92 项：引擎 + 内容完整性 + 全界面审查 + UI 冒烟 + 商业化 + 无限生存 + 审计
```

- `content.test.mjs` 会**自动游玩 30 天**（正常玩家策略）并要求"不被饿死/冻死"，
  它同时是数值平衡的护栏 —— 调整天气/消耗/掉落时它最容易红。
- `ui.test.mjs` 会渲染每一个页面，任何页面级运行期错误都会被抓到。
- `infinite.test.mjs` 覆盖阶段曲线、基地形态、科技、幸存者生死、凌晨灾害、光脑助手、震动降级。

## 八、部署

- 线上是 IIS 静态托管（Windows Server 2022，湖北十堰），站点根目录 `C:\site`，
  端口 **8080**（80 会被未备案拦截），已开静态压缩（462 KB → 153 KB 上线传输）。
- iPhone 外壳工程在 `ios/`：**内置一份站点**（构建时从仓库复制进 `ios/www`），
  首次运行复制到沙盒，之后用 `site-bundle.json` 做增量更新 —— 改内容只改服务器，
  不用重新编译/签名/安装。推送到 GitHub 的 `ios/**` 会自动触发 macOS 编译并发布未签名 IPA。
- 推送注意：这台机器直连 github.com 不稳，用代理：
  `git -c http.proxy=http://127.0.0.1:10808 push origin main`。


## 一、这是什么

《凛冬降临》是一个**纯文字点击式末日生存游戏**，30 天剧本 + 无尽模式，中文。
技术栈刻意做到最简：**原生 ES 模块 + hash 路由 + localStorage 存档，零依赖、零构建、无框架**。

- 线上地址（手机可直接玩）：http://59.153.167.60:8080/
- 源码 zip（公网）：http://59.153.167.60:8080/download/winterfall-project.zip
- 纯运行文件 zip：http://59.153.167.60:8080/download/winterfall-site.zip
- iPhone 未签名 IPA（丢进全能签签名即可安装）：http://59.153.167.60:8080/download/Winterfall.ipa

## 二、怎么跑

```bash
cd winterfall
npm start        # 本地起静态服务（tools/serve.mjs，支持 gzip/br 与 ETag 304）
npm test         # 83 项测试，必须全绿
```

没有 `npm install` 这一步 —— 项目没有任何运行时依赖，测试用 Node 内置的 `node:test`。

## 三、目录结构

```
src/
├── core/       流程骨架：effects(唯一结算入口) / router / dom(h 函数) / store / util(带种子的随机) / audio / prefs
├── systems/    规则层：Survival GameTime Weather Base Inventory Market Quest NPC Battle Duel
│               Achievement Daily Growth Death Ending Mind Power Fame Faction Story Event Save Explore
├── pages/      页面：Home(启动页) Game(主页) Action Warehouse Mind Characters Quest Base Duel
│               Achievement Settings Event Battle Milestone Ending
├── data/       纯数据：events(106) quests(70) locations(15) battle(16 敌人) characters(7)
│               items achievements(28) dailies factions endings chapters tutorial market dialogue
├── ui/         shell(外壳/导航) components(Button Card Sheet Modal Tabs Toast Progress)
└── styles/     tokens.css(设计令牌) app.css
tests/          engine / content / ui / audit / commercial + _dom.mjs(DOM 垫片)
ios/            iOS 外壳工程（WKWebView + XcodeGen），由 GitHub Actions 在 macOS 上编译
tools/          serve.mjs
```

## 四、三条硬约束（改动前必须知道，违反会出真 bug）

1. **所有状态变化只能经过 `core/effects.js` 的 `applyOutcome(state, outcome)`**。
   任何系统产出的 `Outcome` 都在这里落到状态并产生反馈，顺序固定：
   资源 → 状态 → 数值 → 关系/势力/Flag → 时间结算 → 后续（战斗/事件）→ 任务 → 成长/每日/成就 → 存档。
   绕过它直接改 `state` 会导致界面不同步、自动存档丢失。
2. **`state.active`（待处理事件）的生命周期只属于它的拥有者**。`applyOutcome` 永远不碰它；
   由 `resolveChoice` 解决、`afterBattle` 结束。否则玩家还没看到的剧情会被行动结算顶掉。
3. **天气每天必须且只能消耗一次随机数**。存档里的 `rngCursor` 驱动搜刮与随机事件，
   推进量一变，整局随机序列全部错位 —— 实测会造成第 5 天断水、第 6 天渴死。
   `tests/commercial.test.mjs` 里有一条测试专门锁这个约束。

另外：`Save.restore()` 逐层补齐新字段，**新增状态字段必须同时加到 `createState` 与 `restore` 的合并里**，
否则旧存档会缺字段报错。

## 五、现在已经做完的（对照商业化升级文档）

| 文档要求 | 实现位置 | 状态 |
|---|---|---|
| 苹果 iOS 风格 UI（圆角/毛玻璃/阴影层级/页面切换动画） | `styles/*` | ✅ 卡片 24px、弹层 28px、按钮 16px；三层阴影；7 处毛玻璃都带 `-webkit-` 前缀（iOS 必需） |
| 动态天气 | `systems/Weather.js` | ✅ 晴/暴雪/极寒 + 冰雹/极夜/寒潮/尸潮；每日 78% 基准 + 22% 偏离；**次日预报**（可信度=基准概率） |
| 事件系统 | `data/events.js` | ✅ 106 段，含条件分支、战斗分支、后续事件队列 |
| NPC 关系（trust / favor / conflict） | `systems/NPC.js` | ✅ 五维：好感/信任/忠诚/压力/**冲突**；冲突到 60 拒绝对话、到 80 退出互助；每日漂移 |
| 基地升级（level / power / defense） | `systems/Base.js` | ✅ 8 个设施 10 级 + 每日 2 次额度；防御/保温/能源/温室产出都接进结算 |
| 新手引导 | `data/tutorial.js` | ✅ 8 步卡片引导，可跳过可重看 |
| 每日任务 | `systems/Daily.js` | ✅ 每天 3 条确定性抽取，进度从 Outcome 推断，完成即时发奖，连击奖励 |
| 成就系统 | `systems/Achievement.js` | ✅ 28 条，含进度条与隐藏成就，解锁即发奖 |
| 角色成长 | `systems/Growth.js` | ✅ 生存等级 Lv.1—10，加成落在战力/载重/御寒 |
| 装备系统 | `systems/Inventory.js` + `data/items.js` | ✅ 五槽位（武器/外套/鞋/工具/面具），换装自动脱下同槽旧件 |
| 章节剧情 | `data/chapters.js` | ✅ 30 天章节表（天气/气温/任务/主旨） |
| 音效反馈 | `core/audio.js` | ✅ WebAudio 合成音，无音频资源；可关闭 |
| 动画与交互反馈 | `styles/app.css` | ✅ 页面推进动画、卡片错峰入场、按钮按下缩放、数值浮动、Toast |

### 三条追加需求（来自客户，优先级高于文档）
1. **不设置固定结局**：第 30 天不再收尾，给一份**阶段总结**（原 8 个结局变成"评价/称号"）后进入
   **无尽模式** —— 天气难度沿用第 30 天、气温随天数缓慢回暖（封顶 −16℃）、主线不新增，
   随机事件与经营循环继续；每 10 天再给一份总结，历史存在 `state.reports`。
2. **死亡不算结局**：生命归零改为**倒地** —— 丢掉"倒下前最近一次搜集"的物资
   （默认回看 60 分钟；窗口内没有入账则回退到最近一批、12 小时内有效；口径是常量
   `Death.LOST_WINDOW_MIN`），状态抬回安全线、损失 2 小时、精神 −6，然后继续。
3. **战力系统可打 NPC**：新增对战页，对手全是 NPC（掠夺者小队/头目、凛冬城守卫、战力榜挑战者/
   榜上强者、感染者单个/群/变异、尸潮前锋/头目，共 10 个）。页面用**真实战斗公式**给出
   "稳赢/有把握/五五开/送死"与预计掉血；每对手每天限一次；胜负后果通过 `Battle.start` 的
   赌注（`stake`）合并进结算。

## 六、还能往哪优化（建议，按性价比排序）

1. **离线可玩**：现在 iOS 外壳是"壳 + 远程内容"，断网只能看提示页。要离线可玩，
   得给外壳内嵌一个本机 HTTP 服务（自定义 scheme 的 `localStorage` 在 iOS 上不可靠），
   再把站点内容缓存到沙盒 —— 这是目前体验上最明显的短板。
2. **存档安全**：`localStorage` 明文，改一个数字就能作弊。若要做排行榜需要在服务端校验。
3. **内容量**：106 段事件覆盖 30 天偏紧，第 12—26 天重复感明显；建议按 `data/events.js`
   的既有格式补 40—60 段支线（格式在 README 的"扩展方式"一节）。
4. **战斗深度**：目前是回合制 + 6 条指令。可以做武器特性、状态（流血/感染/冻伤）、
   地形加成，让 `data/battle.js` 的敌人有更多机制差异。
5. **无尽模式内容**：现在无尽模式只重复随机事件，建议加"每周目递增的挑战"（更强的尸潮、
   更多势力任务）和长期目标。
6. **可视化**：`icon.svg` 只有一个图标，iOS 启动图是纯色。要做商业级可以补启动图与
   一系列插画（引擎已支持 `narrative` 段落渲染）。

## 七、测试与验收口径

```bash
npm test     # 83 项：引擎 30 + 内容完整性 10 + 全界面审查 5 + UI 冒烟 17 + 商业化 14 + 审计 5
```

改动前先跑一遍拿到基线，改完再跑。特别注意：
- `content.test.mjs` 会**自动游玩 30 天**（正常玩家策略）并要求"不被饿死/冻死"，
  它同时是数值平衡的护栏 —— 调整天气/消耗/掉落时它最容易红。
- `ui.test.mjs` 会渲染每一个页面，任何页面级运行期错误都会被抓到。
- 新增了会发奖的系统时，`engine/ui` 里那些"精确扣了多少"的断言可能被打翻，
  正确做法是用测试里的 `muteRewards(state)` 隔离被测对象，**不要放松断言**。

## 八、部署

- 线上是 IIS 静态托管（Windows Server 2022，湖北十堰），站点根目录 `C:\site`，
  端口 **8080**（80 端口会被未备案拦截），已开静态压缩（462 KB → 153 KB 上线传输）。
- iPhone 外壳工程在 `ios/`，推送到 GitHub 的 `ios/**` 会自动触发 macOS 编译，
  产物是**未签名 IPA**（`gh release` 发布）。外壳加载的服务器地址写在 `ios/Sources/App.swift`
  的 `siteURL` 一行 —— 换域名只改这一行。
