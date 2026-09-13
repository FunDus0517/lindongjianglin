/**
 * 事件与选择（项目书 §8）。事件 = 叙事文本 + 状态信息 + 选项按钮。
 * 每个选项的 resolve 必须真实改变数据：时间、资源、状态、关系、Flag 或结局条件。
 *
 * 字段约定：
 *   day / dayRange   触发日（不填=随机池）
 *   location         仅在该地点触发
 *   once             只触发一次（默认 true）
 *   condition(state) 额外前置条件
 *   weight           随机池权重
 *   text(state)      叙事文本，可读取当前状态插值
 *   choices[]        { id, label, hint, show(state), enabled(state) → true | '不可选原因', resolve(state) → Outcome }
 * @module data/events
 */
import { count, countCategory, has } from '../systems/Inventory.js';
import { item } from './items.js';
import { EXTRA_EVENTS } from './events-extra.js';

/** enabled 辅助：材料不足时给出明确原因（项目书 23：资源不足必须清晰提示）。 */
const afford = (state, need) => {
  for (const [id, n] of Object.entries(need)) {
    if (!has(state, id, n)) return `缺少 ${item(id).name}×${n}`;
  }
  return true;
};

export const EVENTS = {
  /* ---------------- 第 1 天：冰雹降临 ---------------- */
  d1_hail: {
    id: 'd1_hail', title: '冰雹降临', kind: 'story', day: 1, once: true, priority: 100,
    text: () => '六月十九日，下午四点零七分。\n\n拳头大的冰雹砸穿了你家阳台的玻璃，声音像有人在楼上往下倒石头。你把水产店的卷帘门拉下来时，手指已经冻得没有知觉——气温在两个小时里跌了三十度。\n\n手机信号在第三次尝试后彻底消失。楼道里有人在喊，声音被风撕碎。',
    choices: [
      { id: 'go', label: '关好门窗，清点屋里的东西', resolve: () => ({ notes: ['你把能用的东西堆在客厅中央，第一次清楚地知道：手里的东西不多。'], flags: { d1_started: true }, minutes: 20 }) },
    ],
  },
  d1_blackout: {
    id: 'd1_blackout', title: '停电', kind: 'story', day: 1, once: true, priority: 90,
    text: () => '楼里的灯闪了三下，灭了。整片小区一起暗下去，只有对面楼有一格窗还亮着暖黄的光。\n\n暖气片在一小时后变得冰凉。',
    choices: [
      {
        id: 'breaker', label: '下楼检查电闸', hint: '消耗时间，可能找到备用电源',
        resolve: () => ({ notes: ['电闸没跳，是整片区停电。你在配电间捡到一节还能用的电池。'], items: { battery: 1 }, minutes: 30, stats: { warmth: -2 } }),
      },
      {
        id: 'count', label: '先清点物资，不去管电', hint: '立即掌握库存',
        resolve: () => ({ notes: ['你把所有食物和水摊在地板上数了一遍。窗外又暗了一层。'], flags: { counted_stock: true }, minutes: 15, stats: { mind: 3 } }),
      },
    ],
  },
  d1_mind_bind: {
    id: 'd1_mind_bind', title: '光脑绑定', kind: 'story', day: 1, once: true, priority: 80,
    text: () => '你翻出父亲留下的旧终端——一台贴着“光脑·初代”标签的黑色平板。它在断电的城市里自己亮了。\n\n「环境异常。检测到宿主生命体征。」\n「绑定完成。请选择管家人格。」',
    choices: [
      {
        id: 'analyst', label: '【冷静分析型】', hint: '情报与调查收益更高',
        resolve: () => ({ notes: ['「已切换至分析模式。建议：先解决热源，再考虑食物。」'], flags: { brain: 'analyst' }, mind: { level: 1, xp: 0 }, stats: { mind: 5 }, toast: { text: '光脑已绑定：分析型', kind: 'mind' } }),
      },
      {
        id: 'warm', label: '【温和陪伴型】', hint: '精神衰减更慢',
        resolve: () => ({ notes: ['「别慌。我们一步一步来。」'], flags: { brain: 'warm' }, mind: { level: 1, xp: 0 }, stats: { mind: 10 }, toast: { text: '光脑已绑定：陪伴型', kind: 'mind' } }),
      },
      {
        id: 'sharp', label: '【毒舌督导型】', hint: '行动耗时更短',
        resolve: () => ({ notes: ['「你这库存，撑不过四天。动起来。」'], flags: { brain: 'sharp' }, mind: { level: 1, xp: 0 }, stats: { mind: -3 }, toast: { text: '光脑已绑定：督导型', kind: 'mind' } }),
      },
    ],
  },

  /* ---------------- 第 2 天：秩序开始下降 ---------------- */
  d2_order_breakdown: {
    id: 'd2_order_breakdown', title: '秩序开始下降', kind: 'story', day: 2, once: true, priority: 70,
    text: () => '第二天早上，楼下超市的卷帘门被撬开了。\n\n有人在楼上喊“排队”，没人听。你站在窗前，看着十几个人挤进那个不到八十平的空间。',
    choices: [
      { id: 'watch', label: '先在窗边看完整个过程', hint: '掌握局面再行动', resolve: () => ({ notes: ['你记住了谁抢得最凶、谁只是站在门口发抖。信息本身也是一种物资。'], flags: { watched_riot: true }, minutes: 30, stats: { mind: -2 }, mind: { xp: 8 } }) },
      { id: 'hurry', label: '立刻下楼，抢在别人前面', hint: '抢先进入超市', resolve: () => ({ notes: ['你套上外套冲下楼梯，冷风灌进领口，像被刀划了一下。'], minutes: 20, stats: { warmth: -4, energy: -5 }, flags: { raced_to_market: true } }) },
    ],
  },

  /* ---------------- 第 3 天：寒潮加强 ---------------- */
  d3_cold_snap: {
    id: 'd3_cold_snap', title: '第一轮寒潮加强', kind: 'story', day: 3, once: true, priority: 70,
    text: () => '凌晨气温再跌了一档。你呼出的白气在窗玻璃上结成霜，霜又结成冰。\n\n光脑提示：「体温持续下降。建议升级供暖，或减少室外活动。」',
    choices: [
      {
        id: 'ack', label: '用保温材料封住窗户', hint: '消耗保温材料，体温压力下降',
        enabled: (s) => afford(s, { insulation: 1 }),
        resolve: () => ({ notes: ['你把保温棉钉在窗框上，屋里总算不那么透风。'], flags: { sealed_window: true }, stats: { warmth: 8 }, minutes: 40, items: { insulation: -1 } }),
      },
      { id: 'ignore', label: '不管，先出去找东西', resolve: () => ({ notes: ['你选择把风险推后。风从门缝里追了你一路。'], stats: { warmth: -6 }, minutes: 10 }) },
    ],
  },
  d3_night_heater: {
    id: 'd3_night_heater', title: '取暖', kind: 'story', day: 3, once: true, priority: 60,
    condition: (s) => s.time >= 1000,
    text: () => '天黑了。你把烧烤炉搬进客厅，倒进半袋木炭。\n\n火苗起来的一瞬间，屋里第一次有了温度。光脑弹出警告：「密闭空间燃烧检测异常。通风不足，存在一氧化碳风险。」',
    choices: [
      {
        id: 'vent', label: '开一条窗缝，多烧一点', hint: '更暖，但损失一部分热量',
        resolve: () => ({ notes: ['窗户开了三厘米。冷风沿着地板爬进来，但空气是流动的。'], stats: { warmth: 12, hp: 2 }, minutes: 60, items: { charcoal: -1 }, flags: { heated_safely: true } }),
      },
      {
        id: 'seal', label: '关严窗户，把火开到最大', hint: '极度温暖，但有中毒风险',
        resolve: () => ({ notes: ['屋里很快变得燥热。你睡得很沉——梦里有人在耳边敲玻璃。'], stats: { warmth: 22, hp: -14, mind: -8 }, minutes: 60, items: { charcoal: -2 }, flags: { co_poisoning: true }, toast: { text: '一氧化碳中毒：生命 −14', kind: 'bad' } }),
      },
      {
        id: 'skip', label: '不烧了，裹被子硬扛', hint: '保留燃料',
        resolve: () => ({ notes: ['你把木炭放回角落。寒冷像水一样漫过全身。'], stats: { warmth: -10, mind: -4 }, minutes: 30 }),
      },
    ],
  },
  d3_raider_ambush: {
    id: 'd3_raider_ambush', title: '掠夺者', kind: 'story', day: 3, once: true, priority: 85,
    condition: (s) => s.flags.left_home === true,
    text: () => '回来的路上，两个人从楼栋阴影里走出来，手里拎着撬棍。\n\n“包放下，人可以走。”',
    choices: [
      { id: 'fight', label: '不退，正面处理', hint: '进入战斗', resolve: () => ({ notes: ['你没有放下背包。'], battle: 'raider_pair', minutes: 5 }) },
      { id: 'drop', label: '丢下背包就跑', hint: '损失物资，保住状态', resolve: () => ({ notes: ['背包落在雪地上。你听见身后有人在笑。'], stats: { mind: -10, energy: -8 }, minutes: 20, flags: { dropped_bag: true } }) },
      { id: 'talk', label: '谈判：给他们指另一栋楼', hint: '需要情报', enabled: (s) => (s.flags.watched_riot || s.flags.saw_his_hoard ? true : '你手里没有可交换的情报'), resolve: () => ({ notes: ['你说402囤了大量东西，还画了路线。他们对视一眼，转身走了。'], npc: { wangdawei: { favor: -20, trust: -10 } }, flags: { sold_out_wang: true }, fame: 6, minutes: 25, toast: { text: '锋芒值 +6（出卖邻居换命）', kind: 'warn' } }) },
    ],
  },

  /* ---------------- 地点事件 ---------------- */
  observe_wangdawei: {
    id: 'observe_wangdawei', title: '402 的搬运工', kind: 'location', location: 'block', once: true,
    text: () => '楼道里，王大伟正把第三个纸箱往四楼搬。箱子角磨破了，露出里面的压缩饼干和成捆的手电筒。\n\n他看见你，笑了一下：“单位发的，福利。”\n\n今天是六月，夏天还没有结束。',
    choices: [
      { id: 'press', label: '追问一句：“单位发了多少？”', hint: '可能引起戒心', resolve: () => ({ notes: ['他停顿了半秒，说“就这些”。这半秒比任何回答都清楚。'], npc: { wangdawei: { trust: -5, stress: 5 } }, flags: { saw_his_hoard: true }, minutes: 15, mind: { xp: 12 }, toast: { text: '获得关键情报：他在囤货', kind: 'mind' } }) },
      { id: 'help', label: '搭把手，帮他把箱子搬上去', hint: '换取好感', resolve: () => ({ notes: ['他连声道谢，进门前回头看了你一眼，眼神在算账。'], npc: { wangdawei: { favor: 10, trust: 5, stress: -5 } }, stats: { energy: -6 }, minutes: 30, flags: { saw_his_hoard: true } }) },
      { id: 'ignore', label: '装作没看见，回屋', resolve: () => ({ notes: ['你关上门。窗外又有一户人家的灯灭了。'], minutes: 5 }) },
    ],
  },
  laozhou_begging: {
    id: 'laozhou_begging', title: '楼下的老人', kind: 'location', location: 'block', once: true, dayRange: [2, 3],
    text: () => '一楼门厅里，301 的老周缩在墙角，双手合在一起。\n\n“我老伴三天没吃药了……你有多的吗？我拿东西换，我什么都能干。”\n\n他脚边放着一个塑料袋，里面是两件旧毛衣。',
    choices: [
      {
        id: 'help', label: '【帮助居民】给他药品和食物', hint: '消耗食物与时间，获得信任和后续剧情',
        enabled: (s) => (countCategory(s, 'food') >= 1 && has(s, 'bandage', 1) ? true : '需要 食物×1 与 绷带×1'),
        resolve: () => ({ notes: ['他接过东西，手抖得厉害，一句话没说就上楼了。'], items: { canned: -1, bandage: -1 }, npc: { laozhou: { favor: 25, trust: 20, stress: -20 } }, flags: { helped_laozhou: true }, fame: 4, minutes: 30, toast: { text: '老周 好感 +25', kind: 'good' } }),
      },
      {
        id: 'refuse', label: '【拒绝帮助】告诉他我也快没了', hint: '保留资源，可能降低关系',
        resolve: () => ({ notes: ['“我也是。”你说完这句话，他点点头，把毛衣往怀里收了收。'], npc: { laozhou: { favor: -10, trust: -5, stress: 10 } }, stats: { mind: -5 }, flags: { refused_help: true }, minutes: 10, toast: { text: '精神 −5', kind: 'bad' } }),
      },
      {
        id: 'rob', label: '【趁乱搜刮】把他脚边的袋子拿走', hint: '获得物资，但锋芒值和风险上升',
        resolve: () => ({ notes: ['你弯腰拎起袋子就走了。身后没有声音，这比骂声更难受。'], items: { insulation: 1, canned: 1 }, fame: 12, npc: { laozhou: { favor: -40, trust: -30, stress: 25 } }, flags: { robbed_laozhou: true, refused_help: true }, stats: { mind: -12 }, minutes: 15, toast: { text: '锋芒值 +12：你开始被人记住了', kind: 'warn' } }),
      },
      {
        id: 'observe', label: '【观察后行动】先看他是不是真需要', hint: '消耗额外时间，提高判断准确度',
        resolve: () => ({ notes: ['你在楼道里站了十分钟。他一直在发抖，不是在演。'], minutes: 45, mind: { xp: 15 }, flags: { judged_laozhou: true }, toast: { text: '判断完成：他说的是真的', kind: 'mind' } }),
      },
    ],
  },
  supermarket_hoard: {
    id: 'supermarket_hoard', title: '超市里的人', kind: 'location', location: 'supermarket', once: true,
    text: () => '货架区还有七八个人，没人说话。一个男人把整箱瓶装水拖到门口，另一个女人在冷柜前发呆。\n\n冷柜已经不冷了。',
    choices: [
      { id: 'grab', label: '趁乱多拿一些', hint: '物资与锋芒值同时上升', resolve: () => ({ notes: ['你把羽绒服口袋塞满，动作很快。有人看了你一眼，记住了你的脸。'], items: { canned: 2, compressed: 1 }, fame: 8, minutes: 40, stats: { energy: -6 }, toast: { text: '锋芒值 +8', kind: 'warn' } }) },
      { id: 'trade', label: '拿货币跟人换耐储存的东西', hint: '消耗货币', enabled: (s) => (s.currency >= 10 ? true : '货币不足（需要 10）'), resolve: () => ({ notes: ['你用手里的现金换了两袋米。对方数钱数得很快，他已经知道纸要变成废纸了。'], currency: -10, items: { rice: 2 }, minutes: 30 }) },
      { id: 'leave', label: '只拿自己需要的，转身走', resolve: () => ({ notes: ['你拿了两瓶水就走。门口有人喊“还有没有”，没人回答。'], items: { bottled_water: 2 }, minutes: 25, stats: { mind: 3 } }) },
    ],
  },
  pharmacy_locked_cabinet: {
    id: 'pharmacy_locked_cabinet', title: '锁着的处方柜', kind: 'location', location: 'pharmacy', once: true,
    text: () => '柜台后面的铁柜锁着，里面还整齐地码着药盒。锁是老式的，可以被撬开。\n\n墙上贴着“24小时值班”，字迹下面是干涸的血指印。',
    choices: [
      { id: 'pry', label: '用钢管撬开', hint: '需要钢管，耗时较长', enabled: (s) => (has(s, 'pipe', 1) ? true : '需要钢管'), resolve: () => ({ notes: ['铁皮发出刺耳的声音。柜门开了，里面的药比外面货架多得多。'], items: { medicine: 2, frostbite_salve: 1, bandage: 1 }, minutes: 60, stats: { energy: -8 } }) },
      { id: 'smash', label: '直接砸开，不管声音', hint: '更快，但会引来注意', resolve: () => ({ notes: ['玻璃和金属的碎响在空楼里传得很远。你拿到药，也拿到了别人的注意。'], items: { medicine: 1, bandage: 1 }, fame: 6, minutes: 25, stats: { energy: -4 }, toast: { text: '锋芒值 +6', kind: 'warn' } }) },
      { id: 'leave', label: '放弃，先拿货架上的', resolve: () => ({ notes: ['你只收走了外面剩的东西。'], items: { bandage: 1 }, minutes: 20 }) },
    ],
  },
  hardware_raiders: {
    id: 'hardware_raiders', title: '先到的人', kind: 'location', location: 'hardware', once: true,
    text: () => '二楼传来拖动钢架的声音。至少有两个人，而且他们比你先到。\n\n你的目标是成捆的保温棉和建材。',
    choices: [
      { id: 'sneak', label: '潜行，只搬能搬走的', hint: '低风险低收益', resolve: () => ({ notes: ['你贴着墙根搬了两卷保温棉，全程没人出声。'], items: { insulation: 2 }, minutes: 70, stats: { energy: -7, warmth: -3 }, flags: { sneaked_hardware: true } }) },
      { id: 'confront', label: '正面上去把人赶走', hint: '进入战斗', resolve: () => ({ notes: ['你踩着铁架往上走，故意弄出声音。'], battle: 'raider_pair', minutes: 15 }) },
      { id: 'back', label: '退出去，换个地方', resolve: () => ({ notes: ['你退到门外。风比刚才更硬了。'], minutes: 15, stats: { energy: -2 } }) },
    ],
  },
  basement_collapse_risk: {
    id: 'basement_collapse_risk', title: '墙体渗水', kind: 'location', location: 'basement', once: true, dayRange: [2, 3],
    text: () => '地下室的西北角在渗水，水在墙面结成了薄冰，几块砖已经被顶得鼓出来。\n\n如果不处理，这个冬天它可能会塌。',
    choices: [
      { id: 'reinforce', label: '用木料和金属加固', hint: '消耗建材，住所等级 +1', enabled: (s) => afford(s, { wood: 1, metal: 1 }), resolve: () => ({ notes: ['你把木撑打进墙体，又补了一层钢板。渗水慢下来了。'], items: { wood: -1, metal: -1 }, base: { shelter: 1 }, minutes: 90, stats: { energy: -12 }, flags: { basement_reinforced: true }, toast: { text: '住所等级 +1', kind: 'good' } }) },
      { id: 'ignore', label: '先不管，等有材料再说', resolve: () => ({ notes: ['你用一块塑料布盖住渗水处，聊胜于无。'], minutes: 15, flags: { basement_risk: true }, stats: { mind: -3 } }) },
    ],
  },
  ruins_survivor: {
    id: 'ruins_survivor', title: '废墟里的动静', kind: 'location', location: 'ruins', once: true, dayRange: [3, 10],
    text: () => '一块预制板下面传出敲击声，很规律，三下一停。\n\n旁边就是随时可能塌下来的楼体。',
    choices: [
      { id: 'dig', label: '救人', hint: '消耗时间和体力，可能得到关系线索', resolve: () => ({ notes: ['你搬开碎石，从缝里拖出一个冻得说不出话的男人。他指了指远处的居民楼，又指了指自己，摇头。'], minutes: 120, stats: { energy: -18, warmth: -6, hp: -4 }, items: { bandage: -1 }, fame: 10, flags: { saved_stranger: true }, toast: { text: '锋芒值 +10：你救了人', kind: 'warn' } }) },
      { id: 'leave', label: '不冒险，绕开', resolve: () => ({ notes: ['敲击声在你走远后停了。'], minutes: 20, stats: { mind: -6 } }) },
    ],
  },
  ruins_scavengers: {
    id: 'ruins_scavengers', title: '拾荒小队', kind: 'location', location: 'ruins', once: true, dayRange: [3, 10],
    text: () => '三个人在一辆报废的货车旁分东西，看见你就停下了手里的动作。\n\n他们不算凶狠，但比你多两双手。',
    choices: [
      { id: 'trade', label: '用货币换他们的金属和零件', hint: '消耗 20 货币', enabled: (s) => (s.currency >= 20 ? true : '货币不足（需要 20）'), resolve: () => ({ notes: ['他们收了钱，把一半的金属推给你。至少有一个人觉得这买卖不亏。'], currency: -20, items: { metal: 2, parts: 1 }, minutes: 30, stats: { mind: 2 } }) },
      { id: 'fight', label: '动手抢', hint: '进入战斗，锋芒值上升', resolve: () => ({ notes: ['你先动的手。'], battle: 'scavenger_trio', minutes: 20 }) },
      { id: 'back', label: '退开，不招惹', resolve: () => ({ notes: ['你举起空着的双手后退，直到拐角挡住他们的视线。'], minutes: 15, stats: { energy: -3 } }) },
    ],
  },

  /* ---------------- 人物压力事件（由 systems/NPC 主动触发） ---------------- */
  laozhou_breakdown: {
    id: 'laozhou_breakdown', title: '老周敲门', kind: 'npc', once: true, priority: 65,
    condition: (s) => s.npcs.laozhou.met === true,
    text: () => '凌晨，门被敲得很急。老周站在外面，脸冻得发紫。\n\n“她烧到四十度……我知道我没什么能给你的了。我给你干活，你让我拿一点药。”',
    choices: [
      { id: 'give', label: '把药给他，不收回报', hint: '消耗医疗品，信任大幅上升', enabled: (s) => (count(s, 'medicine') >= 1 ? true : '没有消炎药'), resolve: () => ({ notes: ['他捧着药盒下楼，走到一半又回头，很认真地说了声谢谢。'], items: { medicine: -1 }, npc: { laozhou: { favor: 30, trust: 30, loyalty: 20, stress: -35 } }, stats: { mind: 6 }, fame: 3, minutes: 20, flags: { laozhou_saved: true }, toast: { text: '老周：信赖', kind: 'good' } }) },
      { id: 'bargain', label: '让他用劳力换', hint: '获得帮助，但关系停在交易层面', resolve: () => ({ notes: ['“行。”他答应得很快，“明天早上我来给你加固门。”'], npc: { laozhou: { favor: 8, trust: 5, loyalty: 10, stress: -10 } }, base: { defense: 1 }, minutes: 25, flags: { laozhou_working: true } }) },
      { id: 'refuse2', label: '关门。你没有多余的药', resolve: () => ({ notes: ['门关上以后，楼道里静了很久。'], npc: { laozhou: { favor: -25, trust: -20, stress: 40 } }, stats: { mind: -8 }, minutes: 5, flags: { laozhou_breakdown: true } }) },
    ],
  },
  wang_pressure: {
    id: 'wang_pressure', title: '402 的试探', kind: 'npc', once: true, priority: 60,
    text: () => '王大伟在楼道里等你，手里拎着一个塑料袋。\n\n“我知道你也发现了。”他把袋子递过来，“别声张。我讨厌麻烦，但我不讨厌明白人。”',
    choices: [
      { id: 'take', label: '收下，并且不追问', hint: '物资 + 关系上升', resolve: () => ({ notes: ['袋子里是两罐罐头和一盒火柴。你们都没提夏天的事。'], items: { canned: 2, charcoal: 1 }, npc: { wangdawei: { favor: 15, trust: 20, stress: -15 } }, flags: { wang_deal: true }, minutes: 20 }) },
      { id: 'refuse3', label: '不收，问他到底知道多少', hint: '可能撕破脸', resolve: () => ({ notes: ['“我知道的不比你多。”他收回袋子，笑容没变，眼神变了。'], npc: { wangdawei: { trust: -15, stress: 20 } }, stats: { mind: -3 }, minutes: 25, flags: { wang_pressure: true } }) },
      { id: 'share', label: '把老周的事告诉他，换一个态度', hint: '需要已认识老周', enabled: (s) => (s.npcs.laozhou.met ? true : '你还不认识老周'), resolve: () => ({ notes: ['他想了很久：“……301 那位？给他点药吧，别让人死在这栋楼里。”'], npc: { wangdawei: { favor: 10, trust: 10 }, laozhou: { favor: 10 } }, items: { medicine: 1 }, flags: { wang_deal: true, laozhou_saved: true }, minutes: 30, toast: { text: '获得 消炎药 ×1', kind: 'good' } }) },
    ],
  },

  /* ---------------- 随机事件池 ---------------- */
  random_frostbite: {
    id: 'random_frostbite', title: '冻伤', kind: 'random', weight: 3, dayRange: [1, 30],
    condition: (s) => s.stats.warmth < 45,
    text: () => '你的手指开始发白，指尖按下去要很久才回血。\n\n这是冻伤的第一阶段，也可能是你最后一次忽略它。',
    choices: [
      { id: 'treat', label: '用冻伤药处理，然后回屋', enabled: (s) => (has(s, 'frostbite_salve', 1) ? true : '没有冻伤药'), resolve: () => ({ notes: ['药膏抹上去像火烧。半小时后指尖恢复了血色。'], items: { frostbite_salve: -1 }, stats: { warmth: 6, hp: 4 }, minutes: 60 }) },
      { id: 'endure', label: '忍着，继续行动', resolve: () => ({ notes: ['你把手插进衣领，继续往前走。痛感是唯一还热的东西。'], stats: { hp: -8, warmth: -3, mind: -3 }, minutes: 10, flags: { frostbite: true } }) },
    ],
  },
  random_neighbor_knock: {
    id: 'random_neighbor_knock', title: '敲门声', kind: 'random', weight: 2, dayRange: [2, 30],
    condition: (s) => s.time >= 1080,
    text: () => '有人在敲门，很轻，敲三下停几秒。猫眼里是一个抱着孩子的女人。\n\n你不知道她是真的走投无路，还是先敲门的人负责踩点。',
    choices: [
      { id: 'open', label: '开门，给她们一点东西', resolve: () => ({ notes: ['你把两罐罐头塞进她手里。她说了一个名字，你记住了。'], items: { canned: -2 }, npc: { laozhou: { favor: 5 } }, fame: 5, stats: { mind: 4 }, minutes: 20, flags: { helped_mother: true } }) },
      { id: 'silent', label: '不出声，装作没人', resolve: () => ({ notes: ['敲门声停了。你贴着门站了很久。'], stats: { mind: -4 }, minutes: 20, fame: -2 }) },
      { id: 'warn', label: '隔着门喊：再来就动手', resolve: () => ({ notes: ['门外安静了，脚步声走远。'], stats: { mind: -6 }, fame: 3, minutes: 10 }) },
    ],
  },
  random_loot_cache: {
    id: 'random_loot_cache', title: '被遗忘的储物间', kind: 'random', weight: 2, dayRange: [1, 30],
    condition: (s) => s.flags.left_home === true,
    text: () => '你在一层发现一间没上锁的储物间，门缝里塞着防潮纸。',
    choices: [
      { id: 'open', label: '打开', resolve: () => ({ notes: ['里面是一户人家没来得及带走的过冬物资。'], items: { charcoal: 2, canned: 1, insulation: 1 }, minutes: 30, stats: { energy: -4 }, flags: { found_cache: true }, toast: { text: '发现过冬物资', kind: 'good' } }) },
      { id: 'skip', label: '不动别人的东西', resolve: () => ({ notes: ['你把门重新掩上，压好防潮纸。'], minutes: 10, stats: { mind: 3 } }) },
    ],
  },
  random_mind_break: {
    id: 'random_mind_break', title: '幻觉', kind: 'random', weight: 4, dayRange: [2, 30],
    condition: (s) => s.stats.mind < 25,
    text: () => '你听见楼上有炒菜的声音，油爆锅的噼啪声，还有人在喊你回去吃饭。\n\n楼上那户，上个月就搬走了。',
    choices: [
      { id: 'rest', label: '逼自己坐下来，喝口热水', resolve: () => ({ notes: ['声音慢慢退了。你出了一身冷汗。'], stats: { mind: 10, energy: -5 }, minutes: 60 }) },
      { id: 'chase', label: '上楼去看', resolve: () => ({ notes: ['你跑到五楼，什么都没有。回来时门是虚掩着的。'], stats: { mind: -10, hp: -3 }, minutes: 45, flags: { lost_focus: true } }) },
    ],
  },

  /* ================= 第 4 天：资源与人情的取舍 ================= */
  d4_line_of_people: {
    id: 'd4_line_of_people', title: '楼下的队伍', kind: 'story', day: 4, once: true, priority: 70,
    text: () => '早上七点，一楼门厅里站着六个人。三户人家，都是这栋楼的。\n\n“我们知道你有准备。”站在最前面的人说，“我们不抢，我们就想问问，能不能分一口。”\n\n身后有人在咳嗽，有人低着头看自己的鞋。',
    choices: [
      {
        id: 'share', label: '按人头分，先撑过这几天', hint: '消耗食物，建立互助基础',
        enabled: (s) => (countCategory(s, 'food') >= 3 ? true : '食物不足（需要 3 份）'),
        resolve: () => ({ notes: ['你把食物分成六份，每份不多。有人当场就哭了。', '李阿姨在一旁看着，把每个人的名字记在本子上。'], items: { canned: -3 }, aid: { members: 1, morale: 12 }, npc: { li_ayi: { favor: 15, trust: 12 }, laozhou: { favor: 8 } }, flags: { mutual_aid: true, aid_distributed: true }, fame: 8, stats: { mind: 8 }, minutes: 60, toast: { text: '互助体系雏形建立', kind: 'good' } }),
      },
      {
        id: 'selective', label: '只帮认识的，其余请回', hint: '保留大部分资源，但留下裂痕',
        resolve: () => ({ notes: ['你把两罐罐头塞给老周，对其他人说“我也快没了”。', '没人反驳，但走的时候，脚步声很重。'], items: { canned: -2 }, npc: { laozhou: { favor: 12, trust: 10 }, li_ayi: { favor: -12, trust: -8 } }, flags: { aid_selective: true }, stats: { mind: -4 }, minutes: 40 }),
      },
      {
        id: 'refuse_all', label: '全部拒绝，关门', hint: '完整保留资源，锋芒值下降，人心疏远',
        resolve: () => ({ notes: ['你把门关上，站在猫眼后面看他们站了很久。', '后来楼道里安静了。你不确定这是好事还是坏事。'], npc: { li_ayi: { favor: -20, trust: -15, stress: 15 } }, flags: { aid_refused: true }, fame: -6, stats: { mind: -10 }, minutes: 20, toast: { text: '精神 −10：你选择了资源', kind: 'bad' } }),
      },
      {
        id: 'labor_rule', label: '【立规矩】用劳动换食物', hint: '不白给，建立可持续秩序',
        enabled: (s) => (countCategory(s, 'food') >= 2 ? true : '食物不足（需要 2 份）'),
        resolve: () => ({ notes: ['“搬水、扫雪、守夜，干一小时换一顿。”你说。', '有两个人当场答应，一个人转身走了。', '李阿姨在你身后点了点头。'], items: { canned: -2 }, aid: { members: 2, morale: 18 }, npc: { li_ayi: { favor: 22, trust: 18 }, xiao_wu: { favor: 10, trust: 8 } }, flags: { mutual_aid: true, aid_ruled: true }, fame: 6, minutes: 70, toast: { text: '互助体系（制度化）建立', kind: 'good' } }),
      },
    ],
  },
  d4_xiao_wu: {
    id: 'd4_xiao_wu', title: '便利店的小吴', kind: 'story', day: 4, once: true, priority: 60,
    text: () => '下午有人敲门。是个瘦高的年轻人，背着一个空书包。\n\n“我叫小吴，一楼住。便利店是我姐开的。”他说话时一直看着地面，“她那天出门送货，到现在没回来。我……我能干活，我什么都能干，给我口饭吃就行。”',
    choices: [
      {
        id: 'take_in', label: '收下他，让他住进来', hint: '获得稳定帮手（互助成员）',
        resolve: () => ({ notes: ['你把储藏间清出一个角落给他。', '他当晚就把楼道里的雪扫了两遍，没人让他扫。'], aid: { members: 1, morale: 10, join: ['xiao_wu'] }, npc: { xiao_wu: { favor: 25, trust: 20, loyalty: 20, stress: -20 } }, flags: { xiao_wu_joined: true, mutual_aid: true }, stats: { mind: 5 }, minutes: 40, toast: { text: '小吴加入（互助成员 +1）', kind: 'good' } }),
      },
      {
        id: 'trial', label: '先试用三天：干活换饭', hint: '观察后再决定',
        resolve: () => ({ notes: ['“三天。”你伸出三根手指，“干得好就留下。”', '他点头点得很快。'], npc: { xiao_wu: { favor: 12, trust: 10, stress: -8 } }, flags: { xiao_wu_trial: true, mutual_aid: true }, aid: { morale: 4 }, minutes: 30 }),
      },
      {
        id: 'turn_away', label: '给他一顿饭，让他走', hint: '不承担长期风险',
        resolve: () => ({ notes: ['你给了他一罐罐头，让他从后楼梯走。', '他接过去的时候说了声谢谢，声音很小。'], items: { canned: -1 }, npc: { xiao_wu: { favor: 5, trust: 2, stress: 10 } }, flags: { xiao_wu_refused: true }, minutes: 20, stats: { mind: -3 } }),
      },
      {
        id: 'ask_news', label: '先问清楚外面什么情况', hint: '消耗时间换取情报',
        resolve: () => ({ notes: ['他讲了四十分钟：五公里外的超市已经被搬空，桥洞下睡了十几个人，有人开始用蜡烛和打火机做交易。', '光脑把这些都记了下来。'], mind: { xp: 25 }, flags: { city_intel: true }, minutes: 45, toast: { text: '光脑经验 +25：城市情报', kind: 'mind' } }),
      },
    ],
  },

  /* ================= 第 5 天：掠夺者与势力雏形 ================= */
  d5_raider_scout: {
    id: 'd5_raider_scout', title: '踩点的人', kind: 'story', day: 5, once: true, priority: 70,
    text: () => '对楼的天台上有人站了半个小时，方向一直对着这栋楼。\n\n下午，楼下的雪地上多了两行脚印，从单元门口一直通到小区门口。\n\n有人在数这栋楼里还剩多少东西。',
    choices: [
      {
        id: 'fortify', label: '立刻加固单元门', hint: '消耗建材，防御设施 +1',
        enabled: (s) => afford(s, { wood: 1, metal: 1 }),
        resolve: () => ({ notes: ['你和老周把钢板顶在门内侧，又用木方撑住。', '从外面看，这栋楼变得没那么好进了。'], items: { wood: -1, metal: -1 }, base: { defense: 1 }, flags: { door_fortified: true }, minutes: 120, stats: { energy: -14 }, toast: { text: '防御设施 +1', kind: 'good' } }),
      },
      {
        id: 'ambush', label: '在门厅埋伏，等他们进来', hint: '进入战斗，风险高回报也高',
        resolve: () => ({ notes: ['你把铁管横在身前，关了手电。', '一个小时后，门被从外面推开了一条缝。'], battle: 'raider_pair', minutes: 15, flags: { ambushed_raiders: true } }),
      },
      {
        id: 'blackout', label: '把所有房间的灯关掉，装作没人', hint: '低风险，但他们会记住这栋楼',
        resolve: () => ({ notes: ['整栋楼在十分钟内暗了下来。天台上的人站了一会儿，走了。', '但你知道他记住了这里。'], stats: { mind: -6, warmth: -3 }, fame: -4, flags: { played_dead: true }, minutes: 40 }),
      },
      {
        id: 'bribe', label: '留一袋物资在门口', hint: '消耗物资换取短期安全',
        enabled: (s) => (has(s, 'canned', 2) ? true : '食物不足（需要 罐头×2）'),
        resolve: () => ({ notes: ['你把两罐罐头放在单元门口，压了块砖。', '第二天早上，罐头不见了，脚印也没有了。'], items: { canned: -2 }, flags: { paid_toll: true }, stats: { mind: -4 }, minutes: 25, toast: { text: '用物资换来了几天安静', kind: 'warn' } }),
      },
    ],
  },
  d5_wang_offer: {
    id: 'd5_wang_offer', title: '402 的提议', kind: 'story', day: 5, once: true, priority: 60,
    text: () => '王大伟站在你门口，这次没拎东西。\n\n“看楼里这架势，单干撑不到最后。”他说，“我们合起来。物资统一管，人手统一派，出了事一起扛。”\n\n他停顿了一下：“当然，谁出得多，谁说话算数。”',
    choices: [
      {
        id: 'ally', label: '合作，但账目公开', hint: '获得稳定补给，也把命运绑在一起',
        resolve: () => ({ notes: ['你们定下规矩：谁拿什么都在本子上记一笔。', '他第一次没有笑着说话。'], npc: { wangdawei: { favor: 20, trust: 25, stress: -10 } }, items: { canned: 2, charcoal: 2 }, aid: { morale: 10 }, flags: { wang_alliance: true, mutual_aid: true }, minutes: 60, toast: { text: '与 402 结盟', kind: 'good' } }),
      },
      {
        id: 'decline', label: '婉拒，保持独立', hint: '保留自主权，也可能被当成对手',
        resolve: () => ({ notes: ['“我自己能行。”你说。', '他点点头，转身下楼，脚步声一阶一阶变远。'], npc: { wangdawei: { trust: -10, stress: 10 } }, flags: { wang_declined: true }, stats: { mind: -3 }, minutes: 30 }),
      },
      {
        id: 'intel_deal', label: '只换情报，不合并物资', hint: '消耗物资换取关键信息',
        enabled: (s) => (has(s, 'battery', 1) ? true : '没有可交换的物资（需要 电池×1）'),
        resolve: () => ({ notes: ['你用一节电池换了他一句话：', '“往北三个路口，那个加油站底下有储油罐。别一个人去。”'], items: { battery: -1 }, flags: { spot_gas_station: true, gas_intel: true }, mind: { xp: 30 }, npc: { wangdawei: { favor: 5, trust: 5 } }, minutes: 40, toast: { text: '获得加油站储油罐情报', kind: 'mind' } }),
      },
    ],
  },

  /* ================= 第 6 天：探索区域扩大 ================= */
  d6_map: {
    id: 'd6_map', title: '桌上的地图', kind: 'story', day: 6, once: true, priority: 70,
    text: () => '老周把一张小区平面图铺在桌上，边角被茶渍泡过。\n\n“停车场负一层，我停过车，那儿有整个小区的备用物资。”\n小吴指着北边：“加油站，我姐以前去那儿进过货。”\n李阿姨用笔敲了敲西北角：“小学。食堂仓库、生物教室，还有医务室。”\n\n“就我们这几个人，一天只能去一个地方。”',
    choices: [
      { id: 'parking', label: '先去地下停车场', hint: '建材与零件，风险中等', resolve: () => ({ notes: ['你们决定先解决建材——加固和扩容都等着用。'], items: { metal: 2, parts: 1 }, flags: { spot_parking: true, planned_parking: true }, minutes: 45, mind: { xp: 10 } }) },
      { id: 'gas', label: '先去加油站', hint: '燃油，但那里不会空着', resolve: () => ({ notes: ['油箱见底之前必须解决燃料。这是所有人心里都清楚的事。'], items: { fuel: 1 }, flags: { spot_gas_station: true, planned_gas: true }, fame: 4, minutes: 45, mind: { xp: 10 } }) },
      { id: 'school', label: '先去社区小学', hint: '医疗与农业物资，风险较低', resolve: () => ({ notes: ['“先看看有没有药。”你说。老周松了口气。'], items: { bandage: 2, seeds: 1 }, flags: { spot_school: true, planned_school: true }, npc: { laozhou: { favor: 6 } }, minutes: 45, mind: { xp: 10 } }) },
    ],
  },
  d6_new_frontier: {
    id: 'd6_new_frontier', title: '三个方向', kind: 'story', day: 6, once: true, priority: 60,
    text: () => '光脑把三处地点的信息整理成三张卡片。\n\n「检测到活动范围扩大。新增可探索区域：地下停车场 / 加油站 / 社区小学。」\n「提示：危险等级越高，收益与风险同时上升。」',
    choices: [
      {
        id: 'equip', label: '先把装备和补给整理好', hint: '消耗材料，换取接下来几天的行动安全',
        enabled: (s) => afford(s, { bandage: 1 }),
        resolve: () => ({ notes: ['你把背包重新分配：外层保温，内层药品，工具挂在腰上。', '接下来的行动会顺很多。'], items: { bandage: -1 }, stats: { warmth: 6, energy: 8 }, flags: { geared_up: true }, minutes: 60, toast: { text: '行动准备完成：室外体温消耗下降', kind: 'good' } }),
      },
      {
        id: 'scout_first', label: '先花时间侦察，再决定进哪个', hint: '消耗时间，降低后续遇敌概率',
        resolve: () => ({ notes: ['你绕着小区的边界走了一圈，记住了每一处能藏人的地方。'], flags: { scouted_area: true }, base: { defense: 1 }, mind: { xp: 20 }, minutes: 150, stats: { energy: -12, warmth: -5 }, toast: { text: '完成侦察：遇敌风险下降', kind: 'good' } }),
      },
      {
        id: 'rush', label: '不侦察了，直接去最远的地方', hint: '冒险换取时间',
        resolve: () => ({ notes: ['你不想把时间浪费在路上。', '但没走过的路，总会有意外。'], stats: { energy: -6 }, flags: { rushed_out: true }, minutes: 30 }),
      },
    ],
  },

  /* ================= 第 7 天：感染者 ================= */
  d7_first_infected: {
    id: 'd7_first_infected', title: '抽搐的人', kind: 'story', day: 7, once: true, priority: 80,
    text: () => '二楼拐角躺着一个人。是四楼的老赵，前天还在楼下和人吵架。\n\n他的手指在抽，嘴里有白沫，眼睛睁着但不看任何东西。他的皮肤是灰的。\n\n李阿姨站在楼梯口，声音发抖：“他昨天被咬了一口，他说没事。”',
    choices: [
      {
        id: 'help', label: '先救人，抬回屋里', hint: '风险极高，可能被感染',
        resolve: () => ({ notes: ['你们把他抬进二楼空房。他的体温在半小时内掉了六度。', '两个小时后，他不动了。', '你没有受伤，但手上有一道划痕。'], stats: { hp: -12, mind: -14, energy: -14 }, aid: { morale: -8 }, flags: { infected_known: true, infected_risk: true }, fame: 8, minutes: 120, toast: { text: '感染者概念解锁：被咬会转变', kind: 'bad' } }),
      },
      {
        id: 'kill', label: '不动手不行了，处理掉', hint: '进入战斗，绝对安全但代价是心理',
        resolve: () => ({ notes: ['你拎起钢管走下去。', '李阿姨转过身，没看。'], battle: 'infected', minutes: 10, flags: { infected_known: true } }),
      },
      {
        id: 'seal', label: '把二楼整层封死', hint: '消耗建材，封锁风险区域',
        enabled: (s) => afford(s, { wood: 1, metal: 1 }),
        resolve: () => ({ notes: ['你们用木板和角钢把二楼楼梯口钉死。', '砸钉子的声音在楼道里回响了很久。'], items: { wood: -1, metal: -1 }, base: { defense: 1 }, flags: { infected_known: true, floor2_sealed: true }, aid: { morale: 6 }, minutes: 150, stats: { energy: -16 } }),
      },
      {
        id: 'flee', label: '什么都不做，退回屋里锁门', hint: '保住自己，但楼里会记住',
        resolve: () => ({ notes: ['你回到自己家，反锁了门，把椅子抵在门后。', '半夜你听见楼道里有拖行的声音。'], stats: { mind: -12, warmth: -4 }, aid: { morale: -12 }, npc: { li_ayi: { favor: -15, trust: -10 } }, flags: { infected_known: true, abandoned_neighbor: true }, minutes: 30 }),
      },
    ],
  },
  d7_lockdown: {
    id: 'd7_lockdown', title: '封锁', kind: 'story', day: 7, once: true, priority: 65,
    text: () => '入夜前必须做一个决定：单元门要不要彻底封死。\n\n封死意味着更安全，也意味着……外面的人再也进不来。',
    choices: [
      {
        id: 'seal_door', label: '彻底封死，只留一个侧门', hint: '消耗金属，防御大幅提升',
        enabled: (s) => afford(s, { metal: 2 }),
        resolve: () => ({ notes: ['你们用钢板把正门焊死，只留西侧的窄门，白天开、晚上锁。', '有人看着被焊死的门站了很久。'], items: { metal: -2 }, base: { defense: 2 }, aid: { morale: 4 }, flags: { lockdown: true }, minutes: 180, stats: { energy: -18 }, toast: { text: '楼道封锁完成：防御 +2', kind: 'good' } }),
      },
      {
        id: 'barricade', label: '用家具临时堵住', hint: '不消耗材料，效果一般',
        resolve: () => ({ notes: ['冰箱、沙发、书柜，能推的都推到了门口。', '挡得住人，挡不住时间。'], base: { defense: 1 }, flags: { lockdown: true, makeshift_barricade: true }, minutes: 90, stats: { energy: -12 } }),
      },
      {
        id: 'keep_open', label: '不封，留一条路给还没回来的人', hint: '保留希望，风险自担',
        resolve: () => ({ notes: ['“万一还有人回来呢。”李阿姨说。', '你把钢板放回了储藏间。'], aid: { morale: 10 }, npc: { li_ayi: { favor: 12, trust: 8 } }, flags: { door_open: true }, minutes: 40, stats: { mind: 4 } }),
      },
    ],
  },

  /* ================= 第 8 天：互助体系 ================= */
  d8_aid_meeting: {
    id: 'd8_aid_meeting', title: '第一次会议', kind: 'story', day: 8, once: true, priority: 70,
    text: () => '大厅里摆了几把椅子，七个人围着坐。有人带了本子，有人带了半包烟。\n\n“得有个说法。”李阿姨说，“谁干什么，谁拿多少，出了事谁负责。”\n\n所有人都看着你。',
    choices: [
      {
        id: 'division', label: '按能力分工：谁擅长什么就干什么', hint: '提高每日产出',
        resolve: () => ({ notes: ['小吴跑腿，老周管水，李阿姨记名单，你负责外出的部分。', '第一天就多出了一桶雪水。'], aid: { members: 1, morale: 15 }, npc: { xiao_wu: { loyalty: 10 }, li_ayi: { favor: 10, trust: 10 } }, flags: { aid_division: true }, minutes: 90, mind: { xp: 15 }, toast: { text: '互助分工完成：每日产出提升', kind: 'good' } }),
      },
      {
        id: 'communal', label: '吃大锅饭：所有物资集中，按需分配', hint: '士气大幅提升，消耗也变快',
        enabled: (s) => (countCategory(s, 'food') >= 4 ? true : '食物不足（需要 4 份）'),
        resolve: () => ({ notes: ['第一顿热饭端上来的时候，有人吃得很急，有人吃着吃着就停了。', '那天晚上楼里第一次有人笑。'], items: { canned: -3 }, aid: { members: 2, morale: 28 }, flags: { aid_communal: true }, stats: { mind: 12 }, minutes: 120, toast: { text: '全员士气提升', kind: 'good' } }),
      },
      {
        id: 'strict', label: '制度化管理：定量、登记、违约清退', hint: '秩序优先，人心偏紧',
        resolve: () => ({ notes: ['你拿出一本新本子，第一页写下“食物：每人每日 1 份”。', '没人反对。但有人把椅子往后挪了挪。'], aid: { morale: -6 }, npc: { li_ayi: { favor: 12, trust: 15 } }, flags: { aid_strict: true }, minutes: 90, mind: { xp: 12 } }),
      },
      {
        id: 'no_meeting', label: '不需要制度，谁有谁拿', hint: '保持松散，凝聚力低',
        resolve: () => ({ notes: ['会议开了二十分钟就散了。', '之后每个人开始把东西往自己屋里搬。'], aid: { morale: -15 }, flags: { aid_loose: true }, stats: { mind: -5 }, minutes: 40 }),
      },
    ],
  },
  d8_li_ayi: {
    id: 'd8_li_ayi', title: '李阿姨的名单', kind: 'story', day: 8, once: true, priority: 60,
    text: () => '李阿姨敲门进来，手里是那张记满名字的纸。\n\n“楼里三十七个人，真正能干活的有十一个。”她说，“剩下的老人、孩子、病人，收还是不收，你得给个话。”',
    choices: [
      {
        id: 'accept_all', label: '全收，包括不能干活的', hint: '人口与士气最高，消耗最大',
        resolve: () => ({ notes: ['“都收。”你说，“冬天不看谁能干活。”', '李阿姨看了你两秒，把名单折好放进兜里。'], aid: { members: 2, morale: 25 }, npc: { li_ayi: { favor: 25, trust: 20, loyalty: 15 } }, flags: { aid_all_welcome: true }, fame: 10, minutes: 60, toast: { text: '互助体系扩张：成员 +2', kind: 'good' } }),
      },
      {
        id: 'screen', label: '筛选：能干活的和有资源的优先', hint: '效率优先',
        resolve: () => ({ notes: ['“先保能站起来的。”你说。', '她在纸上划掉了四个名字，笔尖停了很久。'], aid: { members: 1, morale: -4 }, npc: { li_ayi: { favor: 8, trust: 12 } }, flags: { aid_screened: true }, minutes: 50 }),
      },
      {
        id: 'refuse_list', label: '不扩大，维持现在的规模', hint: '消耗可控，压力可控',
        resolve: () => ({ notes: ['“我们顾不了这么多。”', '她把名单收起来，说了句“我知道了”。'], aid: { morale: -10 }, npc: { li_ayi: { favor: -12, trust: -8 } }, flags: { aid_capped: true }, stats: { mind: -4 }, minutes: 30 }),
      },
    ],
  },

  /* ================= 第 9 天：人性事件 ================= */
  d9_theft: {
    id: 'd9_theft', title: '少了两袋', kind: 'story', day: 9, once: true, priority: 75,
    text: () => '早上清点仓库时，你发现少了两袋米面和一卷保温棉。\n\n门锁是完好的。能进来的只有自己人。',
    choices: [
      {
        id: 'investigate', label: '查清楚是谁', hint: '消耗时间，真相未必好受',
        resolve: () => ({ notes: ['你对了脚印、问了时间、翻了垃圾。', '是四楼那家的孩子。他妈妈病着，他把米面换成了药。'], mind: { xp: 25 }, flags: { theft_known: true, theft_child: true }, minutes: 150, stats: { energy: -10 }, toast: { text: '查明真相：为了换药的孩子', kind: 'warn' } }),
      },
      {
        id: 'pardon', label: '不追了，把账记下', hint: '士气与信任上升，物资损失不追回',
        resolve: () => ({ notes: ['你在本子上写：损失米面两份，原因未查。', '然后把这页折了进去。'], npc: { li_ayi: { favor: 10, trust: 12 } }, aid: { morale: 14 }, flags: { theft_pardoned: true }, stats: { mind: 3 }, minutes: 60 }),
      },
      {
        id: 'public', label: '当众处理，立规矩', hint: '秩序建立，人心变冷',
        resolve: () => ({ notes: ['你把所有人叫到大厅，把空袋子放在桌子中间。', '“再有一次，谁也不留。”', '没有人抬头。'], aid: { morale: -14 }, npc: { li_ayi: { trust: 15, favor: 5 } }, flags: { theft_punished: true, order_enforced: true }, fame: 6, minutes: 80, toast: { text: '秩序 +：士气 −14', kind: 'warn' } }),
      },
      {
        id: 'quiet', label: '私下警告，不公开', hint: '用信息换忠诚',
        enabled: (s) => (s.flags.theft_known === true ? true : '你还不知道是谁拿的'),
        resolve: () => ({ notes: ['你敲开四楼的门，只说了三句话。', '第二天，门口放回了半卷保温棉。'], items: { insulation: 1 }, aid: { morale: 6 }, flags: { theft_quiet: true }, minutes: 50, mind: { xp: 15 } }),
      },
    ],
  },
  d9_sick_child: {
    id: 'd9_sick_child', title: '发烧的孩子', kind: 'story', day: 9, once: true, priority: 60,
    text: () => '四楼的孩子烧到三十九度五，咳嗽声整夜没停。\n\n“可能是肺炎。”李阿姨说，“药不够，只能救一个。”\n\n仓库里还剩三盒消炎药。你自己也可能用得上。',
    choices: [
      {
        id: 'treat_child', label: '把药给孩子', hint: '消耗医疗品，士气与信任大幅提升',
        enabled: (s) => (has(s, 'medicine', 1) ? true : '没有消炎药'),
        resolve: () => ({ notes: ['你看着孩子把药咽下去，他妈妈一直在说谢谢。', '第二天早上，烧退了。'], items: { medicine: -1 }, aid: { morale: 20 }, npc: { li_ayi: { favor: 20, trust: 18, loyalty: 12 } }, flags: { child_saved: true }, fame: 8, stats: { mind: 6 }, minutes: 60, toast: { text: '互助体系士气 +20', kind: 'good' } }),
      },
      {
        id: 'isolate', label: '先隔离，用物理降温', hint: '保留药品，效果不确定',
        resolve: () => ({ notes: ['你们把孩子挪到单独的房间，用雪水擦身。', '烧退得很慢。'], items: { bandage: -1 }, aid: { morale: -6 }, flags: { child_isolated: true }, stats: { mind: -5 }, minutes: 120 }),
      },
      {
        id: 'refuse_med', label: '留着药，先保证能干活的人', hint: '理性但冷酷',
        resolve: () => ({ notes: ['“药只够救能站起来的人。”你说完这句，屋里没人接话。', '那晚孩子的咳嗽声一直响到天亮。'], aid: { morale: -18 }, npc: { li_ayi: { favor: -18, trust: -12 } }, flags: { child_refused: true }, stats: { mind: -12 }, minutes: 40 }),
      },
    ],
  },

  /* ================= 第 10 天：强寒潮与能源核心 ================= */
  d10_cold_snap: {
    id: 'd10_cold_snap', title: '强寒潮', kind: 'story', day: 10, once: true, priority: 85,
    text: () => '凌晨三点，温度计上的数字停在了它刻度的尽头。\n\n供暖炉的火压得很低，燃料只剩两天。窗户内侧结了厚厚一层冰。\n\n光脑：「室外 −34℃。依据当前储备，全楼可维持供暖 46 小时。」',
    choices: [
      {
        id: 'burn_furniture', label: '把家具拆了烧', hint: '消耗木材，换取立即的温暖',
        enabled: (s) => (has(s, 'wood', 2) ? true : '木材不足（需要 2）'),
        resolve: () => ({ notes: ['课桌、椅子、书柜，一件件进了炉子。', '屋里终于回到了零上。'], items: { wood: -2, charcoal: 1 }, stats: { warmth: 20 }, aid: { morale: 10 }, flags: { burned_furniture: true }, minutes: 90, toast: { text: '体温 +20：撑过今晚', kind: 'good' } }),
      },
      {
        id: 'one_room', label: '所有人集中到一个房间，共用热源', hint: '需要保温材料，效率最高',
        enabled: (s) => afford(s, { insulation: 1 }),
        resolve: () => ({ notes: ['你们把三楼朝南那间屋的窗缝全部封死，地上铺了所有能铺的东西。', '七个人挤在一起，体温本身就是热源。'], items: { insulation: -1 }, stats: { warmth: 26, mind: 6 }, aid: { morale: 18 }, flags: { shared_room: true }, minutes: 120, toast: { text: '集中供暖：全员体温大幅回升', kind: 'good' } }),
      },
      {
        id: 'generator', label: '启动发电机，用电暖器', hint: '消耗燃油，效果最直接',
        enabled: (s) => (has(s, 'fuel', 1) ? true : '没有燃油'),
        resolve: () => ({ notes: ['发电机在楼下响了两个小时。', '电暖器把客厅烤得像另一个季节，油表掉得也像另一个季节。'], items: { fuel: -1 }, stats: { warmth: 32, energy: 6 }, base: { power: 1 }, flags: { generator_used: true }, minutes: 60, toast: { text: '能源设施 +1：燃油 −1', kind: 'warn' } }),
      },
      {
        id: 'endure', label: '什么都不做，硬扛', hint: '保留所有物资，代价是健康',
        resolve: () => ({ notes: ['你把所有衣服穿在身上，钻进被子里。', '寒冷从地板、从墙壁、从骨头里渗进来。'], stats: { warmth: -18, hp: -10, mind: -8 }, aid: { morale: -10 }, minutes: 30, toast: { text: '体温 −18：你选择了省物资', kind: 'bad' } }),
      },
    ],
  },
  d10_power_crisis: {
    id: 'd10_power_crisis', title: '能源分配', kind: 'story', day: 10, once: true, priority: 70,
    text: () => '光脑把所有电力需求列成了清单：\n\n「供暖泵 40%｜照明 15%｜医疗设备 10%｜光脑运算 20%｜其他 15%」\n\n「当前燃油仅可支持 72 小时满负荷运行。请指定优先级。」',
    choices: [
      {
        id: 'heat_first', label: '供暖优先', hint: '保暖优先，智慧能力下降',
        resolve: () => ({ notes: ['你划掉了照明和光脑的配额。', '屋里暖和了，但晚上只能点蜡烛。'], stats: { warmth: 14 }, flags: { power_heat_first: true }, base: { heating: 1 }, minutes: 40, toast: { text: '供暖 +1：夜间照明取消', kind: 'good' } }),
      },
      {
        id: 'med_first', label: '医疗与照明优先', hint: '保证病人与夜间安全',
        resolve: () => ({ notes: ['医疗设备保留满负荷，照明只保留楼道。', '有人夜里在楼道里坐着，说这样不怕。'], aid: { morale: 12 }, npc: { li_ayi: { favor: 12, trust: 10 } }, stats: { mind: 5 }, flags: { power_med_first: true }, minutes: 40 }),
      },
      {
        id: 'brain_first', label: '光脑与情报优先', hint: '情报能力提升，保暖不足',
        resolve: () => ({ notes: ['你把资源压在光脑上：它开始整夜扫描频段和温度曲线。', '屋里的一部分暖气被关掉了。'], mind: { xp: 60 }, stats: { warmth: -6 }, flags: { power_brain_first: true }, minutes: 40, toast: { text: '光脑经验 +60', kind: 'mind' } }),
      },
      {
        id: 'shut_all', label: '全部关停，只留生存必需', hint: '最大化节省燃油',
        resolve: () => ({ notes: ['你拔掉了所有非必需线路。', '整栋楼安静得像结了冰的湖面。'], items: { fuel: 1 }, stats: { mind: -8, warmth: -4 }, aid: { morale: -8 }, flags: { power_shutdown: true }, minutes: 40, toast: { text: '节省燃油 ×1', kind: 'warn' } }),
      },
    ],
  },

  /* ================= 第 6—10 天新增地点的地点事件 ================= */
  parking_trap: {
    id: 'parking_trap', title: '负一层的脚步声', kind: 'location', location: 'parking', once: true, dayRange: [6, 30],
    text: () => '手电扫过去，光柱里有水汽在动。\n\n承重柱后面有人在数你的脚步——一、二、三，和你一致。',
    choices: [
      { id: 'confront', label: '直接照过去，正面处理', resolve: () => ({ notes: ['你把光柱钉在柱子上，往前走了两步。'], battle: 'raider', minutes: 10 }) },
      { id: 'retreat_quiet', label: '关灯，原路退回去', resolve: () => ({ notes: ['你按灭手电，扶着墙走了三十米，直到听见自己以外的声音消失。'], stats: { energy: -6, mind: -3 }, minutes: 40, flags: { parking_escape: true } }) },
      { id: 'call_out', label: '开口：“这栋楼的，别动手”', hint: '可能省下一场战斗', resolve: () => ({ notes: ['回答你的是一个沙哑的男声：“各走各的。”', '然后他真的走了。'], items: { metal: 1 }, flags: { parking_truce: true }, npc: { li_ayi: { favor: 4 } }, minutes: 45, stats: { mind: 4 } }) },
    ],
  },
  gas_station_siege: {
    id: 'gas_station_siege', title: '被占的加油站', kind: 'location', location: 'gas_station', once: true, dayRange: [6, 30],
    text: () => '加油站的雨棚下停着一辆改装过的面包车，车头对着入口。\n\n有人在车里抽烟，烟头的光在风里一亮一暗。储油罐就在他身后。',
    choices: [
      { id: 'trade_fuel', label: '用物资跟他们换油', hint: '消耗货币或食物',
        enabled: (s) => (s.currency >= 40 || has(s, 'canned', 3) ? true : '没有足够的交换物资（需要 40 货币 或 罐头×3）'),
        resolve: (s) => (s.currency >= 40
          ? { notes: ['你把钱递过去。他数得很快，然后把油管递给你。', '“下次带东西来，别带纸。”'], currency: -40, items: { fuel: 2 }, minutes: 60, npc: { wangdawei: { favor: 2 } } }
          : { notes: ['三罐罐头换两桶油。他掂了掂重量，没说话。'], items: { canned: -3, fuel: 2 }, minutes: 60 }) },
      { id: 'fight_band', label: '动手抢储油罐', hint: '进入战斗，高风险高回报', resolve: () => ({ notes: ['你把撬棍从背包侧面抽出来。'], battle: 'raider_band', minutes: 15, fame: 6 }) },
      { id: 'sneak_tank', label: '绕到储油罐后面偷放油', hint: '潜行取油，失败会打起来',
        resolve: (s) => (s.stats.energy > 40
          ? { notes: ['你贴着雨棚的阴影绕了半圈，油管接上，阀门拧开。', '十五分钟后，你带着两桶油退了出去。'], items: { fuel: 2 }, minutes: 120, stats: { energy: -20, warmth: -6 } }
          : { notes: ['你的手在抖，阀门拧了三次才对上。', '车里的人推开了门。'], battle: 'raider_pair', minutes: 60, stats: { energy: -12 } }) },
      { id: 'leave_gas', label: '不冒险，换个地方', resolve: () => ({ notes: ['你退到马路对面，记下了车的位置和人数。'], flags: { gas_scouted: true }, mind: { xp: 15 }, minutes: 30 }) },
    ],
  },
  school_archive: {
    id: 'school_archive', title: '教务室的档案', kind: 'location', location: 'school', once: true, dayRange: [6, 30],
    text: () => '教务室的铁柜没锁。里面是学生名册、家长联系方式、还有一叠手写的《应急预案》。\n\n应急案的最后一页贴着学校的平面图，标着“防空洞入口（1976）”。',
    choices: [
      { id: 'take_plan', label: '带走平面图与档案', hint: '发现隐藏线索', resolve: () => ({ notes: ['你把平面图折好塞进内袋。', '光脑扫描后用一条线把它和这栋楼的地下室连了起来。'], items: { blueprint: 1 }, flags: { found_archive: true, hidden_quest: true }, mind: { xp: 40 }, minutes: 90, toast: { text: '发现隐藏线索：旧防空洞', kind: 'mind' } }) },
      { id: 'contacts', label: '抄下家长联系方式', hint: '获得人物线索', resolve: () => ({ notes: ['你把名单拍了下来。上面有些人，可能还活着。'], flags: { found_contacts: true }, mind: { xp: 25 }, minutes: 60 }) },
      { id: 'leave_archive', label: '不拿别人的东西', resolve: () => ({ notes: ['你把档案按原样码好，关上柜门。'], stats: { mind: 4 }, minutes: 30 }) },
    ],
  },
  school_greenhouse_class: {
    id: 'school_greenhouse_class', title: '生物教室', kind: 'location', location: 'school', once: true, dayRange: [6, 30],
    text: () => '生物教室的后墙有一整排育苗盘，玻璃罩里居然还绿着几株东西。\n\n窗台上摆着一本《冬季蔬菜栽培》，书页被翻得很旧。',
    choices: [
      { id: 'take_seeds', label: '把育苗盘和书一起带走', hint: '开启农业路线', resolve: () => ({ notes: ['你们把育苗盘抬回地下室，摆在最靠里的架子上。', '只要有一度以上的温度，它们就能活。'], items: { seeds: 2, fertilizer: 1 }, flags: { agri_unlocked: true }, base: { greenhouse: 1 }, aid: { morale: 10 }, minutes: 150, stats: { energy: -14 }, toast: { text: '温室 +1：农业路线开启', kind: 'good' } }) },
      { id: 'harvest_only', label: '只摘走能吃的部分', resolve: () => ({ notes: ['你们把成熟的几株摘了，剩下的留在了窗台上。'], items: { produce: 2 }, minutes: 40 }) },
      { id: 'leave_green', label: '留给后来的人', resolve: () => ({ notes: ['你给育苗盘浇了最后一次水。'], stats: { mind: 6 }, aid: { morale: 6 }, minutes: 30 }) },
    ],
  },

  /* ================= 第 4 天起的随机事件池 ================= */
  random_aid_request: {
    id: 'random_aid_request', title: '门外的人', kind: 'random', weight: 3, dayRange: [4, 30],
    text: () => '有人在门外小声说话，两个人，一男一女。\n\n“我们是六号楼的，孩子两天没吃东西了。”',
    choices: [
      { id: 'give_food', label: '给一份食物', resolve: () => ({ notes: ['你把一罐罐头从门缝递出去。', '他们道谢的声音压得很低，怕别人听见。'], items: { canned: -1 }, aid: { morale: 5 }, fame: 3, stats: { mind: 3 }, minutes: 20, flags: { helped_neighbors: true } }) },
      { id: 'trade_info', label: '问清楚六号楼的情况再决定', resolve: () => ({ notes: ['他们说了二十分钟：六号楼已经断水，有人在楼道里烧塑料取暖。'], mind: { xp: 20 }, flags: { intel_block6: true }, minutes: 40 }) },
      { id: 'refuse_door', label: '不开门', resolve: () => ({ notes: ['脚步声在门外停了一会儿，然后远了。'], stats: { mind: -3 }, minutes: 10 }) },
    ],
  },
  random_raider_toll: {
    id: 'random_raider_toll', title: '过路费', kind: 'random', weight: 3, dayRange: [5, 30],
    condition: (s) => s.flags.left_home === true,
    text: () => '三个人堵在巷口，地上画了一条线。\n\n“从这儿过，交东西。”',
    choices: [
      { id: 'pay', label: '交东西过路',
        enabled: (s) => (has(s, 'canned', 1) || s.currency >= 20 ? true : '没有可以交的东西'),
        resolve: (s) => (has(s, 'canned', 1)
          ? { notes: ['你放下一罐罐头，从线上跨了过去。'], items: { canned: -1 }, stats: { mind: -6 }, minutes: 20 }
          : { notes: ['你掏了钱。他们数了两遍。'], currency: -20, stats: { mind: -6 }, minutes: 20 }) },
      { id: 'detour', label: '绕路，多走四十分钟', resolve: () => ({ notes: ['你退回巷口，从结了冰的花坛后面绕过去。'], stats: { energy: -8, warmth: -4 }, minutes: 60 }) },
      { id: 'fight_toll', label: '硬闯', resolve: () => ({ notes: ['你把背带勒紧，往前走了三步。'], battle: 'raider_pair', minutes: 10, fame: 5 }) },
    ],
  },
  random_black_market: {
    id: 'random_black_market', title: '黑市', kind: 'random', weight: 2, dayRange: [5, 30],
    condition: (s) => s.flags.left_home === true,
    text: () => '小区西门的车棚里挂着两块床单，里面有人在换东西。\n\n没有招牌，没有人问名字。价目写在一块纸板上。',
    choices: [
      { id: 'buy_fuel', label: '用货币买燃油', enabled: (s) => (s.currency >= 45 ? true : '货币不足（需要 45）'), resolve: () => ({ notes: ['你把钱递过去，对方随手把油桶踢过来。', '“别在这儿数。”'], currency: -45, items: { fuel: 1 }, minutes: 50 }) },
      { id: 'buy_meds', label: '用货币买药', enabled: (s) => (s.currency >= 30 ? true : '货币不足（需要 30）'), resolve: () => ({ notes: ['两盒消炎药，包装上还贴着医院标签。'], currency: -30, items: { medicine: 2 }, minutes: 50 }) },
      { id: 'sell_loot', label: '卖掉多余的建材', enabled: (s) => (has(s, 'metal', 2) ? true : '没有可卖的建材（需要 金属×2）'), resolve: () => ({ notes: ['两捆钢筋换了一叠纸币。', '纸币在这个冬天到底值多少，谁也说不清。'], items: { metal: -2 }, currency: 35, minutes: 50 }) },
      { id: 'walk_by', label: '不进去，直接走', resolve: () => ({ notes: ['你从车棚外走过，听见里面有人在为一盒火柴争吵。'], minutes: 15, flags: { saw_market: true } }) },
    ],
  },
  random_pipe_burst: {
    id: 'random_pipe_burst', title: '冻裂的水管', kind: 'random', weight: 3, dayRange: [4, 30],
    text: () => '三楼的水管在夜里冻裂了，水顺着楼梯往下流，又在半路结成冰。\n\n如果不修，整栋楼的水压会在两天内掉到零。',
    choices: [
      { id: 'repair', label: '用金属和零件修好', enabled: (s) => afford(s, { metal: 1, parts: 1 }), resolve: () => ({ notes: ['你和老周在冰水里干了三个小时，接好了管。', '楼里的水压回来了。'], items: { metal: -1, parts: -1 }, aid: { morale: 12 }, npc: { laozhou: { favor: 8, trust: 8 } }, flags: { pipe_fixed: true }, minutes: 180, stats: { energy: -18, warmth: -8 }, toast: { text: '供水恢复：互助士气 +12', kind: 'good' } }) },
      { id: 'collect_ice', label: '先收集冰块当水源', resolve: () => ({ notes: ['你们把楼梯上的冰凿下来，装了三桶。', '水压还在掉。'], items: { purified: 2 }, flags: { pipe_broken: true }, minutes: 120, stats: { energy: -12 } }) },
      { id: 'ignore_pipe', label: '不管，先顾自己', resolve: () => ({ notes: ['你把自家水阀关了，别人的事明天再说。'], stats: { mind: -5 }, aid: { morale: -8 }, flags: { pipe_broken: true }, minutes: 20 }) },
    ],
  },
  random_dog_pack: {
    id: 'random_dog_pack', title: '野化的狗', kind: 'random', weight: 2, dayRange: [6, 30],
    condition: (s) => s.flags.left_home === true,
    text: () => '三只狗从废弃的车底下钻出来。它们不叫，只是站成一个半圆，看着你手里的袋子。\n\n它们的肋骨都很清楚。',
    choices: [
      { id: 'throw_food', label: '扔一份食物，退开', enabled: (s) => (has(s, 'canned', 1) || has(s, 'frozen_meat', 1) ? true : '没有可以扔的食物'), resolve: (s) => (has(s, 'canned', 1)
        ? { notes: ['罐头砸在冰上，滚出去几米。它们扑上去的时候你已经退到了楼道口。'], items: { canned: -1 }, stats: { warmth: -3 }, minutes: 30 }
        : { notes: ['冻肉划出一道弧线。它们为了那块肉互相咬了起来。'], items: { frozen_meat: -1 }, stats: { warmth: -3 }, minutes: 30 }) },
      { id: 'stand_ground', label: '不动，握紧武器', resolve: () => ({ notes: ['你和它们对峙了整整两分钟，最后是它们先转开。'], stats: { mind: -4, energy: -4 }, minutes: 20, flags: { dogs_avoided: true } }) },
      { id: 'fight_dogs', label: '先把最前面那只打倒', resolve: () => ({ notes: ['你往前迈了一步。'], battle: 'wild_dogs', minutes: 10 }) },
    ],
  },
  random_infected_wander: {
    id: 'random_infected_wander', title: '游荡的感染者', kind: 'random', weight: 4, dayRange: [7, 30],
    condition: (s) => s.flags.left_home === true,
    text: () => '街对面有一个人走得很慢，肩膀一高一低。\n\n他撞到了路灯杆，退了两步，又继续往前走。他没有绕开的意思。',
    choices: [
      { id: 'avoid', label: '躲进楼道，等他走远', resolve: () => ({ notes: ['你贴在门洞里，数着他的脚步。', '他经过门口时，你听见了喉咙里的声音。'], stats: { warmth: -4, mind: -5 }, minutes: 40, flags: { infected_seen: true } }) },
      { id: 'clear_it', label: '趁他背对着，处理掉', resolve: () => ({ notes: ['你从背后接近，只用了一下。'], battle: 'infected', minutes: 10, fame: 5, flags: { infected_seen: true } }) },
      { id: 'lure_away', label: '用声音把他引向别处', resolve: () => ({ notes: ['你把一块铁皮扔向反方向。他慢慢转了过去。'], stats: { energy: -4 }, mind: { xp: 15 }, minutes: 40, flags: { infected_seen: true, infected_lured: true } }) },
    ],
  },
  random_signal: {
    id: 'random_signal', title: '一段信号', kind: 'random', weight: 2, dayRange: [8, 30],
    condition: (s) => s.mindLevel >= 2,
    text: () => '光脑的频段扫描停在了一个不该有信号的位置。\n\n杂音里有人在重复同一句话：“凛冬城……收容……坐标……”然后是一串数字。',
    choices: [
      { id: 'decode', label: '让光脑解析这段信号', hint: '消耗时间与精神，换取情报', resolve: () => ({ notes: ['解析用了两个小时。', '结论是：坐标在城北十七公里，信号源在持续移动。'], mind: { xp: 45 }, stats: { mind: -6, energy: -6 }, flags: { signal_decoded: true }, minutes: 120, toast: { text: '光脑经验 +45：凛冬城坐标', kind: 'mind' } }) },
      { id: 'record_only', label: '只记录，不解析', resolve: () => ({ notes: ['你把原始信号存进光脑的缓存区。', '以后也许用得上。'], flags: { signal_recorded: true }, minutes: 20 }) },
    ],
  },

  /* ================= 第 11 天：战力榜开放 ================= */
  d11_board_open: {
    id: 'd11_board_open', title: '战力榜', kind: 'story', day: 11, once: true, priority: 80,
    text: () => '光脑在凌晨自动推送了一条更新。\n\n「凛冬城公共面板已上线：幸存者战力榜。」\n「当前你的排名：见榜单。提示：排名公开之后，你不再只是一个住在四楼的人。」\n\n列表里有两百多个名字，后面跟着战力数字。前十个名字旁边，还标着他们的活动区域。',
    choices: [
      {
        id: 'loud', label: '把实力摆在明面上', hint: '锋芒值上升，挑战与机会同时增加',
        resolve: () => ({ notes: ['你让光脑把你的位置也标了出来。', '半天之内，楼下路过的人多了三拨。'], fame: 12, flags: { board_public: true }, mind: { xp: 25 }, minutes: 40, toast: { text: '锋芒 +12：你被记住了', kind: 'warn' } }),
      },
      {
        id: 'quiet', label: '低调，只记别人的名字', hint: '锋芒值下降，但更安全',
        resolve: () => ({ notes: ['你把名单抄了下来，自己的位置留空。', '知道别人是谁，比让别人知道你是谁更值钱。'], fame: -8, flags: { board_hidden: true, board_intel: true }, mind: { xp: 40 }, minutes: 60, toast: { text: '获得对手情报', kind: 'mind' } }),
      },
      {
        id: 'study', label: '研究前几名的打法与活动区域', hint: '消耗时间，换取挑战线线索',
        resolve: () => ({ notes: ['你发现前三名都去过同一个地方：城北的废弃体育馆。', '那里每周都有人在擂台上解决问题。'], flags: { board_intel: true, knows_gym: true }, mind: { xp: 50 }, stats: { energy: -6 }, minutes: 90, toast: { text: '获得挑战线线索：废弃体育馆', kind: 'mind' } }),
      },
    ],
  },
  d11_attention: {
    id: 'd11_attention', title: '有人来打听', kind: 'story', day: 11, once: true, priority: 65,
    text: () => '下午有人敲门。两个陌生面孔，穿得不厚，语气很客气。\n\n“听说这栋楼有人囤得挺全。”其中一个说，“我们不抢，我们想换。也可以顺便告诉你一件事：有人在打听你。”',
    choices: [
      {
        id: 'trade_intel', label: '换：用物资买消息', hint: '消耗食物换取关键情报',
        enabled: (s) => (has(s, 'canned', 2) ? true : '食物不足（需要 罐头×2）'),
        resolve: () => ({ notes: ['“南边那几个小队合成一股了，管自己叫联盟。”', '“他们记人很准。你已经被记上了。”'], items: { canned: -2 }, faction: { raiders: { standing: 0, known: true } }, flags: { raiders_known: true }, mind: { xp: 30 }, minutes: 50, toast: { text: '新势力登场：掠夺者联盟', kind: 'warn' } }),
      },
      {
        id: 'refuse_trade', label: '不换，送客', hint: '保留物资',
        resolve: () => ({ notes: ['他们走的时候回头看了一眼门牌。'], faction: { raiders: { standing: -5, known: true } }, flags: { raiders_known: true }, minutes: 25 }),
      },
      {
        id: 'threaten', label: '告诉他们别再来', hint: '锋芒值上升，敌对加深',
        resolve: () => ({ notes: ['“再敲这扇门，我就当你们是来抢的。”', '他们笑着退了半步，手一直没离开兜。'], fame: 8, faction: { raiders: { standing: -15, known: true } }, flags: { raiders_known: true, threatened_raiders: true }, minutes: 25, toast: { text: '掠夺者联盟：立场 −15', kind: 'bad' } }),
      },
    ],
  },

  /* ================= 第 12 天：龙九星 ================= */
  d12_rescue: {
    id: 'd12_rescue', title: '擂台边的人', kind: 'story', day: 12, once: true, priority: 85,
    text: () => '体育馆的擂台绳上挂着霜。擂台下面靠着一个女人，左肩的旧伤裂开了，血在冰上冻成暗红色。\n\n她手里还握着刀，握得很稳。\n\n“看什么。”她说，“要东西的话，包里没有。”',
    choices: [
      {
        id: 'treat', label: '给她处理伤口，带回楼里', hint: '消耗药品，可能得到一个真正的战力',
        enabled: (s) => (has(s, 'medicine', 1) || has(s, 'bandage', 1) ? true : '没有可以用的医疗品'),
        resolve: (s) => (has(s, 'medicine', 1)
          ? { notes: ['你拆了消炎药，用雪水冲开，把伤口重新压合。', '她全程没出声，只在最后说了一句：“龙九星。”'], items: { medicine: -1 }, npc: { longjiuxing: { favor: 30, trust: 25, loyalty: 25, stress: -25 } }, flags: { saved_longjiuxing: true }, stats: { energy: -8 }, minutes: 120, toast: { text: '龙九星：同行', kind: 'good' } }
          : { notes: ['你用绷带把伤口缠紧，血止住了，但她的脸色没缓过来。'], items: { bandage: -1 }, npc: { longjiuxing: { favor: 18, trust: 12, loyalty: 12, stress: -12 } }, flags: { saved_longjiuxing: true }, minutes: 90 }),
      },
      {
        id: 'water', label: '只给她水和位置，不多管', hint: '低成本，关系有限',
        resolve: () => ({ notes: ['你把水壶放在她手边，说了楼号就走了。', '第二天早上，水壶被洗干净放回了门口。'], npc: { longjiuxing: { favor: 10, trust: 8, stress: -5 } }, flags: { met_longjiuxing: true }, minutes: 40 }),
      },
      {
        id: 'leave_her', label: '不沾这件事，直接进器材室', hint: '保住资源',
        resolve: () => ({ notes: ['你从她另一侧走过去，没有回头。', '器材室的门锁着，你花了一个小时才撬开。'], items: { parts: 1 }, npc: { longjiuxing: { favor: -10, trust: -5 } }, flags: { met_longjiuxing: true, abandoned_longjiuxing: true }, stats: { mind: -6 }, minutes: 90 }),
      },
    ],
  },
  d12_challenge_line: {
    id: 'd12_challenge_line', title: '擂台上的规矩', kind: 'story', day: 12, once: true, priority: 70,
    text: () => '体育馆里走出一个拎着铁链的男人，臂章上是一个手写的“擂”字。\n\n“想在这片儿说话有分量，就得在这儿站着。”他用下巴点了点擂台，“三场。赢了，城北的资源点对你开门。”\n\n“第一场，现在就可以开始。”',
    choices: [
      { id: 'accept', label: '接下第一场', hint: '进入战斗，胜利提升战力榜排名', resolve: () => ({ notes: ['你把外套脱下来搭在绳上。'], battle: 'challenger', minutes: 20, flags: { challenge_line: true, challenge_1: true }, fame: 5 }) },
      { id: 'observe', label: '先看别人怎么打', hint: '消耗时间，降低后续难度', resolve: () => ({ notes: ['你坐在看台上看了两场。记下了他们出刀前都会先沉半步。'], flags: { challenge_line: true, challenge_observed: true }, mind: { xp: 35 }, minutes: 120, stats: { energy: -6, warmth: -4 }, toast: { text: '掌握擂台打法：挑战更稳', kind: 'mind' } }) },
      { id: 'decline_line', label: '不接，转身走', hint: '保留体力，放弃挑战线奖励', resolve: () => ({ notes: ['“随你。”他说，把铁链绕回手上。'], flags: { challenge_declined: true }, fame: -5, minutes: 30 }) },
    ],
  },

  /* ================= 第 13 天：强敌 ================= */
  d13_champion: {
    id: 'd13_champion', title: '榜上的人找上门', kind: 'story', day: 13, once: true, priority: 80,
    condition: (s) => s.flags.challenge_line === true || s.flags.board_intel === true,
    text: () => '楼下停着一辆改装过的越野车，车顶绑着油桶。\n\n“第六名。”来人报了个数字，“你最近动得挺勤。有人让我来确认一下你值不值得留着。”\n\n他没有带武器，身后两个人也只看不动手。',
    choices: [
      { id: 'fight_him', label: '应战', hint: '高风险，胜利获得大量战力与资源', resolve: () => ({ notes: ['你走下楼，站在雪地中间。'], battle: 'champion', minutes: 25, fame: 8 }) },
      {
        id: 'buy_off', label: '用物资换个面子', hint: '消耗燃油/货币，避免战斗',
        enabled: (s) => (s.currency >= 60 || has(s, 'fuel', 1) ? true : '没有拿得出手的东西（需要 60 货币 或 燃油×1）'),
        resolve: (s) => (s.currency >= 60
          ? { notes: ['你把钱递过去。他没接，只是让身后的人收下了。', '“记住这个人情。”'], currency: -60, flags: { champion_debt: true }, faction: { lindong: { standing: 5 } }, minutes: 40, stats: { mind: -6 } }
          : { notes: ['你把一桶油推过去。他掂了掂，点头。', '“油比人实在。”'], items: { fuel: -1 }, flags: { champion_debt: true }, minutes: 40, stats: { mind: -4 } }),
      },
      { id: 'hide', label: '不开门，让光脑应答', hint: '低风险，但锋芒与排名受损', resolve: () => ({ notes: ['你让光脑用机械音回了一句“信号错误”。', '他们在楼下站了二十分钟才走。'], fame: -10, stats: { mind: -4 }, flags: { hid_from_champion: true }, minutes: 40 }) },
    ],
  },
  d13_longjiuxing_join: {
    id: 'd13_longjiuxing_join', title: '龙九星的条件', kind: 'story', day: 13, once: true, priority: 70,
    condition: (s) => s.flags.saved_longjiuxing === true || s.flags.met_longjiuxing === true,
    text: () => '龙九星把包往墙角一放，像已经住下了。\n\n“我跟你。”她说，“但我先说清楚：我有个仇人，在体育馆那帮人里。早晚要解决，到时候你别拦我。”\n\n“还有——我不吃白饭。守夜、动手、搬东西，我都能干。”',
    choices: [
      { id: 'accept_her', label: '欢迎入队', hint: '获得正式队友：战力与战斗选项提升', resolve: () => ({ notes: ['“行。”她把刀挂在门后钉子上，那个位置刚好顺手。'], allies: 1, npc: { longjiuxing: { favor: 20, trust: 20, loyalty: 25, stress: -15 } }, flags: { longjiuxing_joined: true }, aid: { morale: 12 }, minutes: 40, toast: { text: '队友加入：龙九星（战力 +12）', kind: 'good' } }) },
      { id: 'conditions', label: '可以，但物资统一分配', hint: '保持秩序，关系推进慢一点', resolve: () => ({ notes: ['她想了两秒，说“行，但你得先给我一把能用的刀”。'], allies: 1, items: { knife: -1 }, npc: { longjiuxing: { favor: 10, trust: 15, loyalty: 15, stress: -8 } }, flags: { longjiuxing_joined: true }, minutes: 50, toast: { text: '队友加入：龙九星（战力 +12）', kind: 'good' } }) },
      { id: 'not_yet', label: '暂时不合住，先合作', hint: '保留独立，战力加成减半', resolve: () => ({ notes: ['“随你。”她拎起包，“需要人的时候喊我。”'], npc: { longjiuxing: { favor: 8, trust: 10 } }, flags: { longjiuxing_allied: true }, minutes: 30 }) },
    ],
  },

  /* ================= 第 14 天：广播 ================= */
  d14_broadcast: {
    id: 'd14_broadcast', title: '王大伟的广播', kind: 'story', day: 14, once: true, priority: 80,
    text: () => '中午，光脑的公共频段被一段广播占满了。声音你认得。\n\n“……凛冬城，城北体育馆。我们不问过去，只看你现在能做什么。”\n“有食物、有燃料、有药品的，可以换位置。没有的，可以换活干。”\n\n“我是王大伟。我在这里等你们。”\n\n楼下有人探出头来听，听完之后，楼道里第一次有人在收拾行李。',
    choices: [
      {
        id: 'respond', label: '公开回应：这栋楼自己能撑住', hint: '提升互助网立场，得罪潜在招募方',
        resolve: () => ({ notes: ['你用光脑的公共频段回了一句：四号楼不搬，也不关门。', '当天有六个邻居来找你确认这句话算不算数。'], aid: { morale: 18, members: 1 }, faction: { lindong: { standing: -5, known: true }, aidnet: { standing: 10 } }, flags: { lindong_known: true, declared_stand: true }, fame: 10, minutes: 60, toast: { text: '新势力登场：凛冬城', kind: 'mind' } }),
      },
      {
        id: 'listen', label: '先记下频段与招募条件', hint: '只收集情报',
        resolve: () => ({ notes: ['你把广播的时间、频段、口号逐条记了下来。', '他每三天播一次，内容会变。'], faction: { lindong: { standing: 0, known: true } }, flags: { lindong_known: true, lindong_intel: true }, mind: { xp: 45 }, minutes: 60, toast: { text: '新势力登场：凛冬城', kind: 'mind' } }),
      },
      {
        id: 'join_talk', label: '找王大伟当面谈', hint: '直接接触凛冬城',
        resolve: () => ({ notes: ['“你终于来了。”他在体育馆的看台上等你，“我留了一个位置。”', '你注意到，他眼底的青黑比上个月更重了。'], faction: { lindong: { standing: 15, known: true } }, npc: { wangdawei: { favor: 15, trust: 15 } }, flags: { lindong_known: true, lindong_contact: true }, minutes: 180, stats: { energy: -10, warmth: -6 } }),
      },
    ],
  },
  d14_recruit: {
    id: 'd14_recruit', title: '招募条件', kind: 'story', day: 14, once: true, priority: 65,
    condition: (s) => s.flags.lindong_contact === true || s.flags.lindong_intel === true,
    text: () => '凛冬城派人送来了书面条件，一张打印纸，下面盖着教务处借来的章。\n\n「入城者需上交三成存量物资，换取：固定铺位、每日两餐、伤病救治、夜间警戒。」\n「不接受者仍可交易，但不得在城内过夜。」',
    choices: [
      {
        id: 'accept_terms', label: '接受条件，换取正式位置', hint: '消耗物资，换来稳定的医疗与防御',
        enabled: (s) => (countCategory(s, 'food') >= 4 ? true : '食物不足（需要 4 份）'),
        resolve: () => ({ notes: ['你交了东西，领到一块写着编号的木牌。', '医院的手续也一并办下来了——这条最值钱。'], items: { canned: -4 }, faction: { lindong: { standing: 30 } }, base: { medical: 1, defense: 1 }, aid: { morale: 10 }, flags: { lindong_member: true }, minutes: 120, toast: { text: '凛冬城：有往来（医疗 +1 / 防御 +1）', kind: 'good' } }),
      },
      {
        id: 'trade_only', label: '只做交易，不交物资', hint: '保持独立',
        resolve: () => ({ notes: ['“我们只换东西。”你把清单递回去。', '对方收了清单，没说什么。'], faction: { lindong: { standing: 8 } }, flags: { lindong_trade_only: true }, minutes: 60 }),
      },
      {
        id: 'reject_terms', label: '当场拒绝', hint: '立场恶化，但物资与自主权完整',
        resolve: () => ({ notes: ['“我不需要别人给我排位置。”', '来人把纸收回去，笑了一下：“会有第二次的。”'], faction: { lindong: { standing: -20 } }, flags: { lindong_refused: true }, fame: 6, minutes: 40 }),
      },
    ],
  },

  /* ================= 第 15 天：势力竞争 ================= */
  d15_pressure: {
    id: 'd15_pressure', title: '两边都在看你', kind: 'story', day: 15, once: true, priority: 80,
    text: () => '早上，单元门口停着两拨人。\n\n左边是凛冬城的巡查队，臂章整齐，手里拿着登记表。\n右边是三个穿皮衣的，靠墙站着，什么也不拿——他们不需要。\n\n“登记，或者交东西。”巡查队说。\n“或者两边都别给。”皮衣里的人说，“给我们就行。”',
    choices: [
      {
        id: 'register', label: '登记，站到凛冬城这边', hint: '获得秩序与保护，得罪掠夺者',
        resolve: () => ({ notes: ['你在登记表上写了楼号、人数、储备。', '皮衣的人把这一页记了下来。'], faction: { lindong: { standing: 20 }, raiders: { standing: -20 } }, base: { defense: 1 }, flags: { sided_lindong: true }, minutes: 90, toast: { text: '站队：凛冬城', kind: 'warn' } }),
      },
      {
        id: 'pay_raiders', label: '给掠夺者交东西，换他们走', hint: '消耗物资，保住短期安全',
        enabled: (s) => (s.currency >= 50 || has(s, 'fuel', 1) ? true : '没有可交的东西（需要 50 货币 或 燃油×1）'),
        resolve: (s) => (s.currency >= 50
          ? { notes: ['你把钱递过去。他们数都没数。', '“这栋楼这个月不来了。”'], currency: -50, faction: { raiders: { standing: 20 }, lindong: { standing: -8 } }, flags: { paid_raiders: true }, minutes: 60 }
          : { notes: ['一桶油。领头的人用脚踢了踢，算是收了。'], items: { fuel: -1 }, faction: { raiders: { standing: 20 }, lindong: { standing: -8 } }, flags: { paid_raiders: true }, minutes: 60 }),
      },
      {
        id: 'stand_alone', label: '两边都拒，自己扛', hint: '保持独立，风险最高，锋芒最高',
        resolve: () => ({ notes: ['“这栋楼的事，我们自己管。”', '两边的人对视了一眼，都笑了。'], fame: 14, faction: { lindong: { standing: -12 }, raiders: { standing: -25 } }, aid: { morale: 15 }, flags: { stood_alone: true }, minutes: 70, toast: { text: '锋芒 +14：两边都记住了你', kind: 'warn' } }),
      },
    ],
  },
  d15_resource_war: {
    id: 'd15_resource_war', title: '同一个物资点', kind: 'story', day: 15, once: true, priority: 70,
    text: () => '你和另一队人同时到了城西的仓库。他们把车横在门口，下来四个人。\n\n“这地方我们先看到的。”\n\n仓库里堆着几吨建材和一整排柴油桶。谁拿到，谁这个冬天就有余量。',
    choices: [
      { id: 'fight_them', label: '直接抢', hint: '进入战斗，胜利独占物资', resolve: () => ({ notes: ['你把手套摘了。'], battle: 'raider_elite', minutes: 20, fame: 10, flags: { won_resource_war: true } }) },
      {
        id: 'split', label: '提议对半分', hint: '各退一步，拿到一半物资且不结仇',
        resolve: () => ({ notes: ['“建材归你们，油归我们。”', '他们商量了两分钟，同意了。'], items: { fuel: 2, parts: 2 }, faction: { raiders: { standing: 10 } }, flags: { split_resource_war: true }, minutes: 120, stats: { energy: -10 } }),
      },
      {
        id: 'yield_ground', label: '退让，另找地方', hint: '避免冲突，失去这次机会',
        resolve: () => ({ notes: ['你后退了几步，把路让开。', '他们搬东西的时候一直没背对你。'], faction: { raiders: { standing: 5 } }, stats: { mind: -6 }, minutes: 40, flags: { yielded_resource_war: true } }),
      },
    ],
  },

  /* ================= 第 16 天：医院与林晚 ================= */
  d16_hospital: {
    id: 'd16_hospital', title: '还在运转的医院', kind: 'story', day: 16, once: true, priority: 85,
    text: () => '市立医院三楼亮着灯。门诊大厅被隔成三块：红、黄、绿。\n\n墙上贴着三张手写规则表，边角用胶带压得很平。\n\n一个穿白大褂的女人正在给一个冻伤的孩子换药，头也没抬：“物资放门口，人站到黄线外面。要说话就说重点。”',
    choices: [
      {
        id: 'offer_supplies', label: '先把物资放在门口，说明来意', hint: '消耗医疗/食物，换取信任',
        enabled: (s) => (countCategory(s, 'food') >= 2 || has(s, 'bandage', 2) ? true : '没有可提供的物资（需要 食物×2 或 绷带×2）'),
        resolve: () => ({ notes: ['你把东西放在指定的方框里，退到黄线外。', '她换完药才走过来看你，先看你放下的东西，再看你的手。'], items: { canned: -2 }, npc: { linwan: { favor: 25, trust: 20, loyalty: 10, stress: -10 } }, flags: { met_linwan: true, hospital_contact: true }, minutes: 90, toast: { text: '林晚：认可', kind: 'good' } }),
      },
      {
        id: 'ask_help', label: '直接问能不能收治楼里的病人', hint: '效率优先，可能被拒',
        resolve: () => ({ notes: ['“床位十八张，现在躺着三十一个。”她说，“你要送人，可以。你要插队，不行。”'], npc: { linwan: { favor: 5, trust: 8 } }, flags: { met_linwan: true, hospital_contact: true }, minutes: 60, stats: { mind: -3 } }),
      },
      {
        id: 'raid_hospital', label: '药房就在一楼，直接拿', hint: '大量药品，永久损失医疗线',
        resolve: () => ({ notes: ['你撬开药房的锁。整个过程里，走廊尽头有人一直在看。', '她记住了你的脸。'], items: { medicine: 3, bandage: 2, frostbite_salve: 1 }, npc: { linwan: { favor: -40, trust: -35, stress: 35 } }, faction: { lindong: { standing: -10 } }, fame: 12, flags: { met_linwan: true, hospital_raided: true }, stats: { mind: -15 }, minutes: 120, toast: { text: '林晚：拒绝往来（医疗线关闭）', kind: 'bad' } }),
      },
    ],
  },
  d16_pact: {
    id: 'd16_pact', title: '台账', kind: 'story', day: 16, once: true, priority: 65,
    condition: (s) => s.flags.hospital_contact === true && s.flags.hospital_raided !== true,
    text: () => '林晚从抽屉里拿出一本硬皮台账，翻到新的一页，在顶上写了日期。\n\n“每月一次，你送药和补给来，我按量给你配额。”\n“我不接受赊账，也不接受人情。写在这儿，谁都看得见。”',
    choices: [
      {
        id: 'sign_pact', label: '签下这份协议', hint: '建立长期医疗线，每日医疗产出',
        enabled: (s) => (has(s, 'medicine', 1) || has(s, 'bandage', 2) ? true : '首次交付需要 消炎药×1 或 绷带×2'),
        resolve: (s) => (has(s, 'medicine', 1)
          ? { notes: ['你在台账上签了名。她把第一配额推过来：两盒药、一包绷带。'], items: { medicine: -1, bandage: 2 }, npc: { linwan: { favor: 20, trust: 25, loyalty: 15 } }, base: { medical: 1 }, flags: { linwan_pact: true }, minutes: 120, toast: { text: '医疗协议生效：医疗区 +1', kind: 'good' } }
          : { notes: ['你用两包绷带换了个开头。台账上多了一行你的名字。'], items: { bandage: -2, medicine: 1 }, npc: { linwan: { favor: 15, trust: 18, loyalty: 10 } }, base: { medical: 1 }, flags: { linwan_pact: true }, minutes: 120, toast: { text: '医疗协议生效：医疗区 +1', kind: 'good' } }),
      },
      {
        id: 'refuse_pact', label: '只做单次交换', hint: '保持自由，没有长期收益',
        resolve: () => ({ notes: ['“那就一次一清。”她把台账翻回去。'], items: { bandage: 1 }, npc: { linwan: { favor: 5, trust: 5 } }, minutes: 60 }),
      },
      {
        id: 'ask_join', label: '请她加入互助网', hint: '她不会搬走，但可能提供远程支持',
        resolve: () => ({ notes: ['“我走不了，这里有人等我。”她说，“但你可以把这里当成一个点。”', '你在光脑上把医院标成了一个安全点。'], faction: { aidnet: { standing: 8 } }, base: { medical: 1 }, npc: { linwan: { favor: 12, trust: 15 } }, flags: { hospital_ally: true }, minutes: 90, toast: { text: '医院成为互助网点', kind: 'good' } }),
      },
    ],
  },

  /* ================= 第 17 天：感染者迁徙 ================= */
  d17_migration: {
    id: 'd17_migration', title: '迁徙', kind: 'story', day: 17, once: true, priority: 90,
    text: () => '凌晨三点，光脑把所有人叫醒。\n\n「检测到大规模生物移动。方向：南→北，预计两小时后经过本街区。」\n「数量：无法精确计数。」\n\n从窗户往下看，街道尽头有一条缓慢移动的黑线，宽得看不到边。它们不快，但一直在走。',
    choices: [
      {
        id: 'seal_all', label: '封死所有入口，全楼静默', hint: '消耗建材，消耗大量时间',
        enabled: (s) => (afford(s, { metal: 2, wood: 2 }) === true ? true : '缺少 金属×2 与 木材×2'),
        resolve: () => ({ notes: ['你们用钢板和木方把一楼所有出入口从内侧焊死。', '六个小时里，没有人说话，只有墙外的拖行声。'], items: { metal: -2, wood: -2 }, base: { defense: 2 }, aid: { morale: 8 }, stats: { energy: -22, warmth: -6 }, flags: { survived_migration: true, building_sealed: true }, minutes: 300, toast: { text: '全楼封闭：尸群通过', kind: 'good' } }),
      },
      {
        id: 'lure_away', label: '点燃废车与油桶，把它们引向别处', hint: '消耗燃油，风险转移到别的街区',
        enabled: (s) => (has(s, 'fuel', 1) ? true : '没有燃油'),
        resolve: () => ({ notes: ['你把油倒在街对面的两辆废车上，退到楼道口点火。', '火光把整条街照亮了。黑线开始偏转。'], items: { fuel: -1 }, stats: { warmth: 6, mind: -8 }, aid: { morale: 10 }, faction: { lindong: { standing: -10 }, raiders: { standing: -5 } }, flags: { survived_migration: true, lured_horde: true }, fame: 10, minutes: 180, toast: { text: '尸群被引向城北', kind: 'warn' } }),
      },
      {
        id: 'fight_horde', label: '带上武器，正面清理前队', hint: '极高风险，高额晶核与战利品',
        resolve: () => ({ notes: ['你把能带的人都叫上了。', '尸群的前队不长——但后面还有。'], battle: 'horde', minutes: 30, fame: 15, flags: { fought_horde: true } }),
      },
      {
        id: 'shelter_only', label: '只顾自己这层，锁门不动', hint: '低消耗，但楼里的信任受损',
        resolve: () => ({ notes: ['你把自己家那道门锁死，把走廊的灯全关了。', '天亮时你会发现，一楼的铁丝网被撞开了两个口子。'], base: { defense: -1 }, aid: { morale: -20 }, faction: { aidnet: { standing: -15 } }, stats: { mind: -10 }, flags: { survived_migration: true, ignored_migration: true }, minutes: 120 }),
      },
    ],
  },
  d17_mutant: {
    id: 'd17_mutant', title: '变异体', kind: 'story', day: 17, once: true, priority: 75,
    text: () => '尸群过完之后，街上留下了一些没走的东西。\n\n其中一只不太一样：它没有随着群体移动，而是站在路中间，慢慢转头，像在辨认什么。它的左臂比右臂粗一圈。\n\n它看见你了。',
    choices: [
      {
        id: 'kill_mutant', label: '趁它还没跑起来，先动手', hint: '进入战斗，掉落晶核',
        resolve: () => ({ notes: ['你从侧面切进去。'], battle: 'mutant_infected', minutes: 15, fame: 8, flags: { mutant_known: true } }),
      },
      {
        id: 'retreat_mutant', label: '退回楼里，别招惹', hint: '安全，但晶核线索推迟',
        resolve: () => ({ notes: ['你退进楼道，把门顶住。', '它跟到门口，站了很久才离开。'], stats: { mind: -5, energy: -6 }, flags: { mutant_known: true, mutant_avoided: true }, minutes: 40 }),
      },
      {
        id: 'study_mutant', label: '隔着门观察它的行动规律', hint: '消耗时间，换取晶核与弱点情报',
        resolve: () => ({ notes: ['它每走十七步会停一次，转头时会露出颈侧的一块硬皮。', '光脑把这段记录标成了「有价值」——那硬皮底下有结晶。'], mind: { xp: 60 }, flags: { mutant_known: true, mutant_weakness: true, core_lead: true }, stats: { energy: -8, mind: -4 }, minutes: 150, toast: { text: '发现晶核：变异体颈侧', kind: 'mind' } }),
      },
    ],
  },

  /* ================= 第 18 天：冲突 ================= */
  d18_standoff: {
    id: 'd18_standoff', title: '对峙', kind: 'story', day: 18, once: true, priority: 85,
    text: () => '下午，小区门口摆开了阵势。\n\n凛冬城的人和掠夺者联盟在同一个物资点前撞上，双方各十几个人，都没有先动手。\n\n“四号楼的人。”凛冬城那边喊，“过来登记，站到线这边。”\n“或者过来帮我们搬东西，搬完分你三成。”皮衣那边也喊。\n\n两边都空着一只手，看着你。',
    choices: [
      {
        id: 'side_lindong', label: '站到凛冬城那条线后面', hint: '势力冲突正式站队',
        resolve: () => ({ notes: ['你带着人走到了线那边。', '皮衣的人开始往后退——他们在数人。'], faction: { lindong: { standing: 25 }, raiders: { standing: -25 } }, base: { defense: 1 }, aid: { morale: 12 }, flags: { sided_lindong: true, conflict_resolved: true }, fame: 8, minutes: 120 }),
      },
      {
        id: 'side_raiders', label: '接下掠夺者的活', hint: '物资丰厚，但彻底站到对立面',
        resolve: () => ({ notes: ['你带着人过去搬了六个小时。', '东西分到手的时候，凛冬城那边的人一直在看你。'], items: { fuel: 2, metal: 3, parts: 2 }, currency: 40, faction: { raiders: { standing: 30 }, lindong: { standing: -30 } }, aid: { morale: -12 }, flags: { sided_raiders: true, conflict_resolved: true }, fame: 10, minutes: 300, stats: { energy: -20 } }),
      },
      {
        id: 'mediate', label: '站到中间，提议按需分配', hint: '需要威望与关系，成功则两边都不得罪',
        enabled: (s) => (s.fame >= 40 || (s.factions.lindong?.standing ?? 0) >= 25 ? true : '你在两边都还没有说话的分量（需要 锋芒 ≥ 40 或 凛冬城 ≥ 25）'),
        resolve: () => ({ notes: ['你走到两队人中间，把雪踩实了一块，蹲下来画了一张分配图。', '“按人口分，谁不服谁先动手。”', '僵了十分钟，两边各退了一步。'], faction: { lindong: { standing: 15 }, raiders: { standing: 10 }, aidnet: { standing: 15 } }, fame: 18, aid: { morale: 15 }, flags: { mediated_conflict: true, conflict_resolved: true }, minutes: 240, stats: { energy: -14, mind: -6 }, toast: { text: '调停成功：双方立场上升', kind: 'good' } }),
      },
    ],
  },
  d18_challenge_2: {
    id: 'd18_challenge_2', title: '第二场', kind: 'story', day: 18, once: true, priority: 70,
    condition: (s) => s.flags.challenge_line === true && s.flags.challenge_declined !== true,
    text: () => '体育馆的人送来了口信，只有一句：\n\n「第二场。对手你自己挑，或者我们替你挑。」',
    choices: [
      { id: 'accept_2', label: '接第二场', hint: '进入战斗，胜利推进挑战线', resolve: () => ({ notes: ['你把外套又搭在了同一根绳子上。'], battle: 'champion', minutes: 25, fame: 10, flags: { challenge_2: true } }) },
      {
        id: 'pick_easy', label: '挑一个看起来普通的对手', hint: '难度低，收益也低',
        resolve: () => ({ notes: ['你指了一个站在边上的年轻人。他愣了一下才上台。'], battle: 'challenger', minutes: 20, fame: 4, flags: { challenge_2: true, challenge_picked_easy: true } }),
      },
      { id: 'skip_2', label: '这一场跳过', hint: '挑战线回到起点', resolve: () => ({ notes: ['你摇了摇头，转身走了。', '身后没有人喊你。'], fame: -6, flags: { challenge_declined: true }, minutes: 30 }) },
    ],
  },

  /* ================= 第 19 天：站队的代价 ================= */
  d19_consequences: {
    id: 'd19_consequences', title: '代价', kind: 'story', day: 19, once: true, priority: 80,
    text: () => '前几天的选择开始收账。\n\n据点门口多了一堆东西：两个冻伤的、一个断了肋骨的，还有三户把家当搬来的人。\n他们不说自己从哪儿来，只说“听说这栋楼还行”。',
    choices: [
      {
        id: 'take_all_in', label: '全部收下', hint: '人口与士气上升，消耗大幅增加',
        enabled: (s) => (countCategory(s, 'food') >= 5 ? true : '食物不足（需要 5 份）'),
        resolve: () => ({ notes: ['你把储藏间全部腾空，铺上所有能铺的东西。', '当晚楼里有十九个人吃饭，锅不够用。'], items: { canned: -5 }, aid: { members: 3, morale: 25 }, faction: { aidnet: { standing: 20 } }, base: { shelter: 1 }, flags: { accepted_refugees: true }, fame: 10, minutes: 180, stats: { energy: -16 }, toast: { text: '互助网扩张：成员 +3', kind: 'good' } }),
      },
      {
        id: 'screen_refugees', label: '按能力筛选，优先能干活和带物资的', hint: '效率优先，人心有损',
        resolve: () => ({ notes: ['你在门口摆了一张桌子，一个一个问。', '有两个人被留下，其余的人领了一顿饭，被指去了凛冬城。'], items: { canned: -2 }, aid: { members: 1, morale: -6 }, faction: { lindong: { standing: 10 }, aidnet: { standing: -5 } }, flags: { screened_refugees: true }, minutes: 150, mind: { xp: 20 } }),
      },
      {
        id: 'close_gate', label: '关门，一个都不收', hint: '资源安全，声望受损',
        resolve: () => ({ notes: ['你把门关上，让光脑循环播放“本楼已满”。', '夜里有人在楼下坐着，天亮才走。'], fame: -10, aid: { morale: -18 }, faction: { aidnet: { standing: -20 } }, stats: { mind: -12 }, flags: { closed_gate: true }, minutes: 60 }),
      },
    ],
  },
  d19_longjiuxing_duel: {
    id: 'd19_longjiuxing_duel', title: '她的仇人', kind: 'story', day: 19, once: true, priority: 75,
    condition: (s) => s.flags.longjiuxing_joined === true || s.flags.longjiuxing_allied === true,
    text: () => '龙九星把刀磨了一整个下午。\n\n“体育馆那帮人里，有个当年把我丢在楼里的人。他今天在城里。”\n“我自己去。你要是来，就是帮我收尸；你要是不来，这也正常。”',
    choices: [
      { id: 'go_together', label: '一起去', hint: '进入战斗，双方关系大幅提升', resolve: () => ({ notes: ['你把外套穿上，跟在她后面半步。', '她没回头，但脚步慢了。'], battle: 'champion', minutes: 30, fame: 10, npc: { longjiuxing: { favor: 25, trust: 25, loyalty: 30, stress: -20 } }, flags: { longjiuxing_duel: true } }) },
      {
        id: 'let_her_go', label: '让她自己去，你在楼里等', hint: '尊重她的规矩，关系小幅上升',
        resolve: () => ({ notes: ['“行。”她只说了一个字。', '她回来的时候天已经黑了，刀上有血，不是她的。'], npc: { longjiuxing: { favor: 12, trust: 15, loyalty: 8, stress: -10 } }, stats: { mind: -6 }, flags: { longjiuxing_duel_solo: true }, minutes: 60 }),
      },
      {
        id: 'stop_her', label: '劝她先别去——现在不是时候', hint: '保住战力，关系受损',
        resolve: () => ({ notes: ['“等过了这个月。”你说。', '她把刀插回鞘里，动作很慢：“你跟我以前那个队长说话一模一样。”'], npc: { longjiuxing: { favor: -15, trust: -10, loyalty: -8, stress: 20 } }, stats: { mind: -4 }, flags: { stopped_duel: true }, minutes: 60 }),
      },
    ],
  },

  /* ================= 第 20 天：前夜 ================= */
  d20_prep: {
    id: 'd20_prep', title: '在它来之前', kind: 'story', day: 20, once: true, priority: 85,
    text: () => '光脑给出了一条冷冰冰的预测：\n\n「依据气温曲线、尸群活动频率与周边势力调动，未来十天内发生大规模冲突的概率：高。」\n「建议：在进入极夜之前完成防御与储备。」\n\n楼下，凛冬城的车一天过三趟。街对面的皮衣也开始成群出现。',
    choices: [
      {
        id: 'fortify_hard', label: '把资源全砸进防御', hint: '消耗大量建材，防御大幅提升',
        enabled: (s) => (afford(s, { metal: 3, wood: 3 }) === true ? true : '缺少 金属×3 与 木材×3'),
        resolve: () => ({ notes: ['你们把所有出入口改成双层，楼顶架了观察位。', '老周在墙上写了值班表，一共排到第三十天。'], items: { metal: -3, wood: -3 }, base: { defense: 2, shelter: 1 }, aid: { morale: 15 }, flags: { fortified_for_endgame: true }, minutes: 360, stats: { energy: -24 }, toast: { text: '防御 +2 / 住所 +1：为终局做准备', kind: 'good' } }),
      },
      {
        id: 'stock_food', label: '优先囤够食物与燃料', hint: '消耗货币，换取储备',
        enabled: (s) => (s.currency >= 80 ? true : '货币不足（需要 80）'),
        resolve: () => ({ notes: ['你用钱在三个点分别换了东西，不放在一处。', '光脑把总储备算了一遍：够二十六个人吃四十天。'], currency: -80, items: { canned: 6, charcoal: 4, fuel: 1 }, aid: { morale: 12 }, flags: { stocked_for_endgame: true }, minutes: 240, stats: { energy: -14 } }),
      },
      {
        id: 'diplomacy', label: '把两个势力都请来谈一次', hint: '需要关系基础，成功则降低终局压力',
        enabled: (s) => (((s.factions.lindong?.standing ?? 0) >= 10 || (s.factions.raiders?.standing ?? 0) >= 10) ? true : '你和两边都还没有可以谈的关系'),
        resolve: () => ({ notes: ['你把两边的人约在体育馆看台，中间隔了六个座位。', '谈成了两件事：物资点划界、伤员互换。'], faction: { lindong: { standing: 15 }, raiders: { standing: 15 }, aidnet: { standing: 10 } }, fame: 12, flags: { endgame_pact: true }, minutes: 300, stats: { energy: -12, mind: -8 }, toast: { text: '终局前达成默契', kind: 'good' } }),
      },
      {
        id: 'ignore_prep', label: '照常过日子，来什么应付什么', hint: '不消耗资源，风险自担',
        resolve: () => ({ notes: ['你把预测关掉，继续做每天该做的事。'], stats: { mind: 5 }, aid: { morale: -8 }, flags: { ignored_prep: true }, minutes: 40 }),
      },
    ],
  },
  d20_challenge_final: {
    id: 'd20_challenge_final', title: '终场', kind: 'story', day: 20, once: true, priority: 75,
    condition: (s) => s.flags.challenge_2 === true || s.flags.challenge_1 === true,
    text: () => '体育馆的看台坐满了人。这是入冬以来最大的一次集会。\n\n“第三场。”那个拎铁链的男人站在擂台边上，“赢了，城北的资源点、通行权、还有一句话——以后这片的规矩由你来定。”\n\n对面站着的不是一个人。',
    choices: [
      { id: 'final_fight', label: '上擂台', hint: '终场之战，胜利极大提升战力与排名', resolve: () => ({ notes: ['你把外套脱下来，搭在绳上，和第一次同一个位置。'], battle: 'horde', minutes: 30, fame: 20, flags: { challenge_final: true, challenge_complete: true } }) },
      {
        id: 'final_duel', label: '要求一对一', hint: '规则内的挑战，难度可控',
        resolve: () => ({ notes: ['“一对一。”你说。看台上安静了两秒，然后是敲击看台的声音。'], battle: 'champion', minutes: 25, fame: 14, flags: { challenge_final: true, challenge_complete: true } }),
      },
      { id: 'final_decline', label: '当着所有人拒绝', hint: '放弃挑战线，保住实力', resolve: () => ({ notes: ['“我不需要靠这个证明什么。”', '你转身走下看台，身后没有嘘声，也没有掌声。'], fame: -12, flags: { challenge_declined: true, challenge_final_declined: true }, minutes: 60 }) },
    ],
  },

  /* ================= 第 11—20 天新增地点的地点事件 ================= */
  gym_ring: {
    id: 'gym_ring', title: '擂台的规矩', kind: 'location', location: 'gym', once: true, dayRange: [12, 30],
    text: () => '擂台边钉着一块木牌：\n\n「上台者自负生死。认输即止。不许带人。」\n\n牌子下面绑着一根红绳，挂着七八个写名字的木牌——大多是划掉的。',
    choices: [
      { id: 'sign_up', label: '把自己的名字挂上去', hint: '进入战斗，提升锋芒与排名', resolve: () => ({ notes: ['你在木牌上写了编号，挂在红绳中间。'], battle: 'challenger', minutes: 20, fame: 8, flags: { gym_signed: true } }) },
      { id: 'watch_ring', label: '先看两场，学规矩', hint: '消耗时间换取情报', resolve: () => ({ notes: ['擂台上的规矩只有三条，但三条都被人用血验证过。', '光脑把这些记进了战斗模型。'], mind: { xp: 40 }, stats: { energy: -5, warmth: -3 }, flags: { gym_observed: true }, minutes: 120 }) },
      { id: 'take_names', label: '把木牌上的名字抄下来', hint: '获得人物情报', resolve: () => ({ notes: ['划掉的名字里有三个你听过——都是「榜上」的人。'], flags: { gym_names: true }, mind: { xp: 30 }, minutes: 60 }) },
    ],
  },
  gym_strongman: {
    id: 'gym_strongman', title: '器材室里的强者', kind: 'location', location: 'gym', once: true, dayRange: [13, 30],
    text: () => '器材室里堆着杠铃片和几袋水泥。一个男人把两百斤的杠铃片一块块往包里装，动作很稳。\n\n“你也来搬？”他说，“一起搬，一起分。”',
    choices: [
      { id: 'share_work', label: '一起搬，按人头分', hint: '稳定获得建材', resolve: () => ({ notes: ['两个人搬了三个小时，谁也没多拿。'], items: { metal: 2, parts: 1 }, minutes: 180, stats: { energy: -18 }, npc: { longjiuxing: { favor: 4 } }, flags: { gym_partner: true } }) },
      { id: 'take_first', label: '先下手，抢下最重的那几块', hint: '更多物资，关系变差', resolve: () => ({ notes: ['你先把最重的三块塞进包里。他看了你一眼，没说话，继续搬自己的。'], items: { metal: 3, parts: 1 }, fame: 6, minutes: 120, stats: { energy: -16 }, flags: { gym_grabbed: true } }) },
      { id: 'challenge_him', label: '跟他比一场', hint: '高风险，高回报', resolve: () => ({ notes: ['“比就比。”他把手上的灰拍掉。'], battle: 'challenger', minutes: 25, fame: 6 }) },
    ],
  },
  hospital_triage: {
    id: 'hospital_triage', title: '分诊区', kind: 'location', location: 'hospital', once: true, dayRange: [16, 30],
    text: () => '红色的区域里躺着三个人，其中一个在低声说话，说的都是同一句话：“我不去后面。”\n\n林晚在黄线上写今天的分配，字很小，很密。',
    choices: [
      { id: 'volunteer', label: '留下来帮忙抬人、递药', hint: '消耗体力和时间，换取林晚的信任', resolve: () => ({ notes: ['你干了一下午，手上磨破了，但学会了怎么给冻伤分级。'], stats: { energy: -20, hp: -3 }, npc: { linwan: { favor: 20, trust: 18, stress: -12 } }, mind: { xp: 30 }, base: { medical: 1 }, minutes: 240, flags: { hospital_volunteer: true }, toast: { text: '林晚：认可（医疗区 +1）', kind: 'good' } }) },
      { id: 'bring_supply', label: '回楼里取药品再送过来', hint: '消耗药品，换取配额', enabled: (s) => (has(s, 'medicine', 1) || has(s, 'bandage', 2) ? true : '没有可送的药品'), resolve: (s) => (has(s, 'medicine', 1)
        ? { notes: ['两小时后你带着药回来了。她只说了句“登记在那本上”。'], items: { medicine: -1, bandage: 2 }, npc: { linwan: { favor: 15, trust: 15 } }, minutes: 180, stats: { energy: -12, warmth: -5 } }
        : { notes: ['两包绷带换了两盒药。她把多的那盒推回来：“按价。”'], items: { bandage: -2, medicine: 1 }, npc: { linwan: { favor: 12, trust: 12 } }, minutes: 180, stats: { energy: -10 } }) },
      { id: 'leave_triage', label: '不参与，只取自己需要的', hint: '保留资源', resolve: () => ({ notes: ['你从侧廊绕过去，没有经过分诊区。'], stats: { mind: -5 }, minutes: 60 }) },
    ],
  },
  hospital_pharmacy: {
    id: 'hospital_pharmacy', title: '药房的锁', kind: 'location', location: 'hospital', once: true, dayRange: [16, 30],
    text: () => '一楼药房的铁门是新换的锁，锁旁边贴着一张纸：「药品由分诊处统一调配，私自取用者不再收治。」',
    choices: [
      { id: 'respect_lock', label: '按规矩去分诊处申请', hint: '获得正式配额', resolve: () => ({ notes: ['你在窗口填了申请单，等了四十分钟。', '配额不多，但是干净的。'], items: { medicine: 1, bandage: 1 }, npc: { linwan: { favor: 10, trust: 12 } }, minutes: 90, flags: { pharmacy_formal: true } }) },
      { id: 'break_lock', label: '撬开锁，能拿多少拿多少', hint: '大量药品，医疗线终止', resolve: () => ({ notes: ['锁是新的，好撬。你在里面待了二十分钟。', '出来的时候，走廊尽头站着两个人，一直看着你走。'], items: { medicine: 3, frostbite_salve: 2, bandage: 2 }, npc: { linwan: { favor: -45, trust: -40, stress: 30 } }, fame: 10, stats: { mind: -14 }, flags: { hospital_raided: true }, minutes: 120, toast: { text: '医疗线关闭：林晚拒绝往来', kind: 'bad' } }) },
      { id: 'leave_pharmacy', label: '看一眼就走', resolve: () => ({ notes: ['你记住了锁的型号，然后离开了。'], flags: { pharmacy_scouted: true }, minutes: 30 }) },
    ],
  },
  substation_grid: {
    id: 'substation_grid', title: '还有一条活线', kind: 'location', location: 'substation', once: true, dayRange: [17, 30],
    text: () => '控制室的两盏指示灯里，有一盏在缓慢地闪。\n\n线路图上，那条线通向城北——凛冬城的方向。他们那边有电，而你们这栋楼没有。',
    choices: [
      {
        id: 'reconnect', label: '试着把这条线接到自己楼里', hint: '消耗零件与时间，建成能源节点',
        enabled: (s) => (afford(s, { parts: 2, battery: 1 }) === true ? true : '缺少 零件×2 与 电池×1'),
        resolve: () => ({ notes: ['你和老周在配电柜里干了四个小时。', '晚上七点，四号楼的楼道灯亮了——整条街只有这一栋。'], items: { parts: -2, battery: -1 }, base: { power: 1 }, aid: { morale: 18 }, faction: { lindong: { standing: -8 } }, flags: { powered_building: true }, minutes: 300, stats: { energy: -24 }, toast: { text: '能源 +1：全楼通电', kind: 'good' } }),
      },
      {
        id: 'sabotage', label: '把这条线切断，谁都别想有电', hint: '掠夺性选择，资源与立场变化',
        resolve: () => ({ notes: ['你把主线缆剪断，火花在手套外面炸了一下。', '城北整片暗下去的那一刻，你在控制室里听见了自己的呼吸。'], items: { parts: 2, battery: 2 }, faction: { lindong: { standing: -25 }, raiders: { standing: 10 } }, fame: 10, stats: { mind: -12 }, flags: { cut_grid: true }, minutes: 120, toast: { text: '城北断电：凛冬城立场 −25', kind: 'bad' } }),
      },
      { id: 'report_grid', label: '把线路图抄下来带走', hint: '情报优先', resolve: () => ({ notes: ['你抄了三页线路图。回楼之后，光脑把它们变成了可以计算的路径。'], items: { blueprint: 1 }, mind: { xp: 45 }, minutes: 120, flags: { grid_intel: true } }) },
    ],
  },
  substation_trespass: {
    id: 'substation_trespass', title: '也在偷电的人', kind: 'location', location: 'substation', once: true, dayRange: [18, 30],
    text: () => '柴油机房里有人。两个，正在把发电机拆成零件往袋子里装。\n\n他们看见你，动作没停：“先来后到。你要是也想拆，东边那台还没动。”',
    choices: [
      { id: 'cooperate', label: '一起拆，各拿一半', hint: '稳定获得零件与燃油', resolve: () => ({ notes: ['三个人拆了一下午，谁也没多拿一块。'], items: { parts: 3, fuel: 1 }, minutes: 240, stats: { energy: -20 }, faction: { raiders: { standing: 8 } }, flags: { split_substation: true } }) },
      { id: 'drive_off', label: '把他们赶走', hint: '进入战斗，独占领地', resolve: () => ({ notes: ['你拎起了撬棍。'], battle: 'raider_pair', minutes: 20, fame: 6 }) },
      { id: 'withdraw_sub', label: '退出去，换个地方', hint: '避免冲突', resolve: () => ({ notes: ['你退回雪地里，把脚印盖掉。'], minutes: 40, flags: { substation_left: true } }) },
    ],
  },

  /* ================= 第 11 天起的随机事件池 ================= */
  random_challenger: {
    id: 'random_challenger', title: '挑战者上门', kind: 'random', weight: 4, dayRange: [11, 30],
    condition: (s) => s.fame >= 35 || (s.day >= 11 && s.power >= 45),
    text: () => '有人站在楼下喊你的编号，喊了三遍。\n\n“榜单上你的位置不对。”他说，“下来，我们把它校准一下。”',
    choices: [
      { id: 'accept_duel', label: '下楼应战', resolve: () => ({ notes: ['你把手套戴上，走进了雪地。'], battle: 'challenger', minutes: 20, fame: 8 }) },
      { id: 'ignore_call', label: '不开门，让他在楼下站着', resolve: () => ({ notes: ['他喊了半小时，最后把一张写着时间和地点的纸条塞进门缝。'], fame: -8, stats: { mind: -4 }, minutes: 40, flags: { ignored_challenge: true } }) },
      { id: 'send_ally', label: '让队友下去处理', hint: '需要队友', enabled: (s) => ((s.allies ?? 0) > 0 ? true : '没有可以出面的队友'), resolve: () => ({ notes: ['龙九星把刀往腰上一挂就下楼了。', '十分钟后她回来，说：“以后这种别叫我。”'], npc: { longjiuxing: { favor: -5, stress: 8 } }, fame: 4, minutes: 40 }) },
    ],
  },
  random_faction_patrol: {
    id: 'random_faction_patrol', title: '巡查队', kind: 'random', weight: 3, dayRange: [14, 30],
    condition: (s) => s.flags.left_home === true,
    text: () => '四个人臂章一样，沿街走得很整齐。他们手里有登记表，也有武器。\n\n“楼号、人数、储备。”领头的人停在你面前，“配合一下。”',
    choices: [
      {
        id: 'cooperate_patrol', label: '如实登记', resolve: () => ({ notes: ['你把数字报了出去。他记下，点头，继续往前走。'], faction: { lindong: { standing: 10, known: true } }, flags: { lindong_known: true }, minutes: 30 }),
      },
      {
        id: 'lie_patrol', label: '报一个假数字', hint: '需要光脑等级支撑，被识破会恶化关系',
        resolve: (s) => (s.mindLevel >= 2
          ? { notes: ['你报了一个刚好低于征收线的数字。他看了你两秒，写了下来。'], faction: { lindong: { standing: -5, known: true } }, flags: { lied_to_lindong: true }, mind: { xp: 25 }, minutes: 40 }
          : { notes: ['你报的数字前后不一致，被当场指出来。', '“下次再问，我要看仓库。”'], faction: { lindong: { standing: -15, known: true } }, flags: { lied_to_lindong: true, lindong_suspicious: true }, stats: { mind: -6 }, minutes: 40 }),
      },
      { id: 'refuse_patrol', label: '不配合，让他们走', resolve: () => ({ notes: ['“那你就是不愿意登记。”他在表上画了个圈。'], faction: { lindong: { standing: -12, known: true } }, fame: 5, minutes: 30, flags: { lindong_known: true } }) },
    ],
  },
  random_core_cache: {
    id: 'random_core_cache', title: '结晶的痕迹', kind: 'random', weight: 3, dayRange: [17, 30],
    condition: (s) => s.flags.mutant_known === true || s.kills.mutant_infected > 0,
    text: () => '你在雪地里发现一片暗红色的碎屑，沿着拖痕一直延伸到一栋半塌的楼里。\n\n光脑判断：变异体聚集地，结晶密度高。',
    choices: [
      { id: 'clear_nest', label: '清理里面的变异体', hint: '高额晶核，高风险', resolve: () => ({ notes: ['你数了数：里面至少两只。'], battle: 'mutant_infected', minutes: 25, fame: 8, flags: { cleared_nest: true } }) },
      { id: 'mark_nest', label: '只做标记，回头再来', resolve: () => ({ notes: ['光脑在地图上打了一个红点。'], flags: { nest_marked: true }, mind: { xp: 25 }, minutes: 60 }) },
      { id: 'leave_nest', label: '绕开', resolve: () => ({ notes: ['你选择了不冒这个险。'], minutes: 20 }) },
    ],
  },
  random_blackout: {
    id: 'random_blackout', title: '断电之夜', kind: 'random', weight: 3, dayRange: [11, 30],
    condition: (s) => s.time >= 1080,
    text: () => '晚上八点，楼里的灯全灭了。\n\n光脑提示：「备用电源耗尽。当前照明剩余：0 小时。」\n\n楼道里有人开始喊。',
    choices: [
      { id: 'use_battery', label: '换上备用电池，先把灯点起来', enabled: (s) => (has(s, 'battery', 1) ? true : '没有电池'), resolve: () => ({ notes: ['灯亮起来的一瞬间，楼道里的声音停了。'], items: { battery: -1 }, aid: { morale: 10 }, stats: { mind: 6 }, minutes: 40, flags: { blackout_fixed: true } }) },
      { id: 'candles', label: '点蜡烛，安排人守夜', resolve: () => ({ notes: ['七根蜡烛，两个人一组。这一夜没人睡好。'], aid: { morale: 4 }, stats: { energy: -8, mind: -4 }, base: { defense: 1 }, minutes: 90 }) },
      { id: 'sleep_dark', label: '摸黑睡，明天再说', resolve: () => ({ notes: ['黑暗里什么都可能发生。你把手电放在枕头边。'], stats: { mind: -8 }, aid: { morale: -6 }, minutes: 40, flags: { dark_night: true } }) },
    ],
  },
  random_refugee_wave: {
    id: 'random_refugee_wave', title: '往北走的人', kind: 'random', weight: 3, dayRange: [15, 30],
    condition: (s) => s.flags.left_home === true,
    text: () => '路上遇到一队人，八个，都背着东西，往城北走。\n\n“广播说那边有铺位。”一个中年女人说，“你们这边呢？这边有位置吗？”',
    choices: [
      { id: 'recruit_them', label: '告诉他们四号楼还收人', hint: '人口增加，消耗增加', resolve: () => ({ notes: ['她回头和同伴商量了两分钟。', '最后有五个人跟你走了。'], aid: { members: 2, morale: 12 }, faction: { aidnet: { standing: 10 }, lindong: { standing: -5 } }, flags: { recruited_refugees: true }, minutes: 90, stats: { energy: -8 }, toast: { text: '互助网：成员 +2', kind: 'good' } }) },
      { id: 'point_north', label: '给他们指路，让他们去城北', resolve: () => ({ notes: ['你把路线画在雪地上，还标了哪里能避风。'], faction: { lindong: { standing: 8 } }, npc: { li_ayi: { favor: -5 } }, minutes: 60, stats: { mind: -3 } }) },
      { id: 'walk_past', label: '不搭话，继续走', resolve: () => ({ notes: ['你们擦肩而过，谁也没看谁。'], stats: { mind: -5 }, minutes: 20 }) },
    ],
  },
  random_horde_wander: {
    id: 'random_horde_wander', title: '街尾的黑线', kind: 'random', weight: 4, dayRange: [17, 30],
    condition: (s) => s.flags.left_home === true,
    text: () => '街尾又出现了一条缓慢移动的黑线，比上次短，但方向正对着你。',
    choices: [
      { id: 'duck_inside', label: '就近躲进楼里', resolve: () => ({ notes: ['你撞开一扇没锁的单元门，贴着墙站了二十分钟。'], stats: { warmth: -5, mind: -4, energy: -4 }, minutes: 60, flags: { hid_from_horde: true } }) },
      { id: 'thin_them', label: '从侧翼削掉前队', hint: '进入战斗，掉落晶核', resolve: () => ({ notes: ['你从侧面的巷子绕到前队斜前方。'], battle: 'horde', minutes: 25, fame: 10 }) },
      { id: 'run_home', label: '直接往回跑', resolve: () => ({ notes: ['你跑了整整一公里，进门时腿在抖。'], stats: { energy: -18, warmth: -8, hp: -4 }, minutes: 90 }) },
    ],
  },

  /* ================= 第 21 天：交易区开放 ================= */
  d21_market_open: {
    id: 'd21_market_open', title: '交易区', kind: 'story', day: 21, once: true, priority: 85,
    text: () => '体育馆西侧的棚子底下，二十几个人在做买卖。\n\n布告板上写着规矩：只认货币和实物，不认人情；抢东西的人，两边一起打。\n\n光脑更新了行情：「交易区已开放。价格随日期、库存与你的名声波动。」',
    choices: [
      {
        id: 'first_deal', label: '先把多余的建材卖掉换货币', hint: '确认交易区可用，换回流动资金',
        enabled: (s) => (has(s, 'metal', 2) ? true : '没有可以卖的建材（需要 金属×2）'),
        resolve: () => ({ notes: ['两捆钢筋换了一叠纸币。收钱的人称了重量，压了价。', '“第一次？”他说，“以后带燃料来，那个值钱。”'], items: { metal: -2 }, currency: 45, flags: { traded: true, market_known: true }, minutes: 90, toast: { text: '完成第一笔交易：货币 +45', kind: 'good' } }),
      },
      {
        id: 'watch_market', label: '先只看行情，不急着出手', hint: '消耗时间，掌握价格规律',
        resolve: () => ({ notes: ['你在布告板前站了两个小时，记下每种东西的报价。', '规律很清楚：燃料和药最贵，建材最不值钱。'], flags: { market_known: true, market_intel: true }, mind: { xp: 40 }, minutes: 120, stats: { energy: -6 }, toast: { text: '掌握行情规律', kind: 'mind' } }),
      },
      {
        id: 'long_term', label: '找一个固定卖家谈长期供货', hint: '建立稳定渠道（需要凛冬城关系）',
        enabled: (s) => ((s.factions.lindong?.standing ?? 0) >= 20 ? true : '需要与凛冬城有往来（≥ 20）'),
        resolve: () => ({ notes: ['你和柜台后面那个姓刘的谈成了：每周固定供货，价格按平价算。', '他在本子上给你留了一行位置。'], faction: { lindong: { standing: 10 } }, flags: { market_supplier: true, traded: true }, currency: 20, minutes: 150, stats: { energy: -8 }, toast: { text: '获得长期供货渠道（价格更稳）', kind: 'good' } }),
      },
    ],
  },
  d21_price_shock: {
    id: 'd21_price_shock', title: '行情', kind: 'story', day: 21, once: true, priority: 65,
    text: () => '中午，布告板上的燃料报价被划掉，改成了一个高出一半的数字。\n\n“城北那边把油全收了。”有人在人群里说。\n\n所有人都明白这意味着什么：谁手里有油，谁这个冬天说了算。',
    choices: [
      {
        id: 'stock_fuel', label: '趁还没涨到位，把燃料囤下来', hint: '消耗货币，换取战略储备',
        enabled: (s) => (s.currency >= 70 ? true : '货币不足（需要 70）'),
        resolve: () => ({ notes: ['你连着跑了三个摊位，把能买的油都买了。', '最后一桶的价格比第一桶贵了两成。'], currency: -70, items: { fuel: 3 }, flags: { hoarded_fuel: true }, minutes: 180, stats: { energy: -12 }, toast: { text: '燃油 +3：赶在涨价前', kind: 'good' } }),
      },
      {
        id: 'sell_high', label: '把手里多余的东西趁高价卖掉', hint: '消耗物资，换回大量货币',
        enabled: (s) => (has(s, 'insulation', 2) || has(s, 'medicine', 2) ? true : '没有可以卖的高价物资（需要 保温材料×2 或 消炎药×2）'),
        resolve: (s) => (has(s, 'insulation', 2)
          ? { notes: ['保温材料今天翻了倍。你把两卷都卖了。'], items: { insulation: -2 }, currency: 60, flags: { traded: true }, minutes: 120 }
          : { notes: ['两盒药换了一叠钱。柜台后面的人笑得很轻。'], items: { medicine: -2 }, currency: 70, flags: { traded: true }, minutes: 120 }),
      },
      {
        id: 'cap_price', label: '当众把价格压回去', hint: '需要威望，成功则全场受益',
        enabled: (s) => (s.fame >= 45 ? true : '你在交易区还没有说话的份量（需要 锋芒 ≥ 45）'),
        resolve: () => ({ notes: ['“今天按昨天的价，明天随你们。”你把手按在布告板上。', '僵了半分钟，姓刘的先点了头。'], fame: 8, faction: { lindong: { standing: 8 }, raiders: { standing: -5 }, aidnet: { standing: 8 } }, aid: { morale: 12 }, flags: { market_price_capped: true }, minutes: 120, mind: { xp: 30 }, toast: { text: '压价成功：交易区立场 +8', kind: 'good' } }),
      },
      {
        id: 'wait_it_out', label: '什么都不做，等明天再看行情', hint: '主线事件永远有出路：不参与也是一种选择',
        resolve: () => ({ notes: ['你在人群外面站了一会儿，把今天的报价记进光脑。', '涨也好跌也好，你手里的东西不会因为报价而变多。'], flags: { market_intel: true }, mind: { xp: 20 }, minutes: 60 }),
      },
    ],
  },

  /* ================= 第 22 天：线人与晶矿 ================= */
  d22_laomao: {
    id: 'd22_laomao', title: '线人', kind: 'story', day: 22, once: true, priority: 80,
    text: () => '有人在你的门缝里塞了一张纸条，上面只有一个时间和一个地点。\n\n棚子最里面，一个戴墨镜的男人在数钱，头也没抬：“坐下。想听什么，先看价目。”\n\n纸条背面是价目表：晶矿坐标 45，两边人头 40，尸潮动向 55，城里的裂缝 70。',
    choices: [
      {
        id: 'buy_now', label: '记下价目，回去再决定买哪条', hint: '解锁线人：之后可在人物页购买情报',
        resolve: () => ({ notes: ['你把价目记在光脑里，没有付钱。', '“想好了再来。”他把纸条收回去，“纸条别丢，凭纸条打折。”'], flags: { met_laomao: true }, minutes: 30, toast: { text: '老猫登场：可在人物页购买情报', kind: 'mind' } }),
      },
      {
        id: 'size_him', label: '先弄清他是谁的人', hint: '消耗时间，换取折扣与关系',
        resolve: () => ({ notes: ['你跟他聊了四十分钟，什么也没买。', '他最后说：“你是第一个不花钱还坐着的人。下次给你减五块。”'], npc: { laomao: { favor: 12, trust: 8 } }, flags: { met_laomao: true, laomao_discount: true }, mind: { xp: 35 }, minutes: 60 }),
      },
      {
        id: 'refuse_laomao', label: '不跟这种人打交道', resolve: () => ({ notes: ['你站起来走了。他在你背后说：“你会回来的。”'], flags: { met_laomao: true, refused_laomao: true }, minutes: 20, stats: { mind: -3 } }),
      },
    ],
  },
  d22_mine_open: {
    id: 'd22_mine_open', title: '城北矿脉', kind: 'story', day: 22, once: true, priority: 70,
    text: () => '光脑把一份扫描结果推到面板最前面：\n\n「城北废弃矿区检测到高密度结晶矿脉。地表温度异常偏高。」\n「提示：结晶的经济与强化价值极高，采集风险同样高。」\n\n“那就是说，里面有我们缺的东西。”龙九星把刀往腰上一挂。',
    choices: [
      { id: 'mine_team', label: '组队下矿', hint: '进入晶矿，收益与风险同时放大', resolve: () => ({ notes: ['你们带了头灯、绳索和三天的口粮。'], battle: 'mine_wretch', minutes: 30, flags: { mine_open: true, knows_mine: true }, fame: 6 }) },
      { id: 'mine_scout', label: '先在井口侦察', hint: '低风险，换取矿区情报', resolve: () => ({ notes: ['你在井口蹲了一下午，记下了进出的人和变异体的活动路线。', '光脑判断：矿道第二层有结晶堆积。'], flags: { mine_open: true, knows_mine: true, mine_scouted: true }, mind: { xp: 45 }, minutes: 180, stats: { warmth: -6, energy: -10 }, toast: { text: '获得矿区情报', kind: 'mind' } }) },
      { id: 'mine_skip', label: '先不去，眼下有更要紧的事', resolve: () => ({ notes: ['“矿又不会跑。”你说。'], minutes: 30, flags: { mine_delayed: true } }) },
    ],
  },

  /* ================= 第 23 天：地下通道与潜伏准备 ================= */
  d23_tunnel_map: {
    id: 'd23_tunnel_map', title: '地图上没有的路', kind: 'story', day: 23, once: true, priority: 75,
    text: () => '光脑把小学教务室那张平面图和这几天的地形数据叠在一起，标出一条线：\n\n「六十年代防空通道，南北贯通。两端出口分别位于城北与老城区。」\n「这条路线不在任何公共地图上。」',
    choices: [
      {
        id: 'map_it', label: '亲自走一遍，把通道测准', hint: '消耗时间与体力，完成潜伏路线的前置',
        resolve: () => ({ notes: ['你在通道里走了六个小时，来回三趟。', '有几段塌了，但都能绕过去。'], flags: { corridor_lead: true, tunnel_mapped: true }, mind: { xp: 50 }, minutes: 360, stats: { energy: -24, warmth: -6 }, toast: { text: '获得通道线路：潜伏路线前置完成', kind: 'good' } }),
      },
      {
        id: 'send_team', label: '派人去测，自己在楼里盯防线', hint: '省体力，但需要队友或人手',
        enabled: (s) => ((s.allies ?? 0) > 0 || (s.aid.members ?? 0) >= 3 ? true : '没有可以派出去的人'),
        resolve: () => ({ notes: ['小吴带着两个邻居去了。回来的时候画了一张比光脑还细的图。'], flags: { corridor_lead: true, tunnel_mapped: true }, aid: { morale: 6 }, minutes: 240, mind: { xp: 35 } }),
      },
      { id: 'ignore_map', label: '先不管，眼下防线更要紧', resolve: () => ({ notes: ['你把平面图压回抽屉最下面。'], minutes: 20, flags: { corridor_delayed: true } }) },
    ],
  },
  d23_infiltration: {
    id: 'd23_infiltration', title: '身份', kind: 'story', day: 23, once: true, priority: 70,
    condition: (s) => s.flags.corridor_lead === true || s.flags.intel_corridor === true,
    text: () => '老猫把一个布制臂章和一个编号牌推过来。\n\n“凛冬城的搬运工，第七组。登记表上真有这个编号。”\n“进去以后别说话，搬东西就行。你要找的人在三号库房。”\n\n他伸手要价。',
    choices: [
      {
        id: 'pay_identity', label: '付钱拿身份', hint: '消耗货币，获得潜入资格',
        enabled: (s) => (s.currency >= 80 ? true : '货币不足（需要 80）'),
        resolve: () => ({ notes: ['你把钱数了两遍递过去。', '“编号记牢。”他说，“念错一次你就出不来了。”'], currency: -80, flags: { lindong_pass: true }, npc: { laomao: { favor: 8 } }, minutes: 60, toast: { text: '获得凛冬城通行身份', kind: 'good' } }),
      },
      {
        id: 'work_way_in', label: '不用钱，去城北干两天活换身份', hint: '消耗体力与时间，不花钱',
        resolve: () => ({ notes: ['你在城北的料场搬了两天水泥，管事的随手给了你一个臂章。', '“明天还来。”'], flags: { lindong_pass: true }, faction: { lindong: { standing: 5, known: true } }, minutes: 600, stats: { energy: -35, hunger: -12, warmth: -8 }, toast: { text: '获得凛冬城通行身份（用劳力换的）', kind: 'good' } }),
      },
      { id: 'skip_infiltration', label: '不做这种事', resolve: () => ({ notes: ['“你会后悔的。”老猫把臂章收回去。'], flags: { infiltration_refused: true }, minutes: 20, stats: { mind: -3 } }) },
    ],
  },

  /* ================= 第 24 天：城内的裂缝 ================= */
  d24_inside_job: {
    id: 'd24_inside_job', title: '三号库房', kind: 'story', day: 24, once: true, priority: 80,
    condition: (s) => s.flags.lindong_pass === true,
    text: () => '三号库房里堆着成箱的罐头和整排的柴油桶。角落里坐着三个人，其中一个你认得——是广播里念过编号的那个女人。\n\n“你是老猫的人。”她说，“我们不说废话：城里有一半人不想再这样分下去。我们缺一条不问来路的路。”',
    choices: [
      {
        id: 'open_corridor', label: '把地下通道给他们', hint: '完成潜伏路线：改变凛冬城格局',
        enabled: (s) => (s.flags.tunnel_mapped === true ? true : '你还没有画准这条通道'),
        resolve: () => ({ notes: ['你把通道的路线画在纸上，标了三个避风点和一个出口。', '她把纸折好放进内衣口袋：“以后这条路上的人，都记你一次。”'], flags: { corridor_route: true, corridor_opened: true }, faction: { lindong: { standing: 20 }, raiders: { standing: -10 }, aidnet: { standing: 10 } }, npc: { laomao: { favor: 10 } }, fame: 12, minutes: 180, stats: { energy: -8, mind: -4 }, toast: { text: '潜伏路线完成：双城记条件达成', kind: 'good' } }),
      },
      {
        id: 'take_ledger', label: '只要布防图，别的不掺和', hint: '获得战术情报，不改变格局',
        resolve: () => ({ notes: ['她犹豫了一下，把一张布防图推过来。', '“你不想站队，我理解。但通道的事，你再想想。”'], items: { blueprint: 1 }, flags: { lindong_battlemap: true }, base: { defense: 1 }, minutes: 150, mind: { xp: 40 }, toast: { text: '获得凛冬城布防图：防御 +1', kind: 'good' } }),
      },
      {
        id: 'report_them', label: '把这件事报给王大伟', hint: '换取凛冬城信任，彻底断掉潜伏路线',
        resolve: () => ({ notes: ['你把三号库房的位置告诉了王大伟。', '他沉默了很久：“谢谢你。真的。”', '当天下午，三号库房换了锁。'], faction: { lindong: { standing: 30 }, aidnet: { standing: -10 } }, npc: { wangdawei: { favor: 20, trust: 25 } }, flags: { corridor_betrayed: true, infiltration_refused: true }, currency: 80, stats: { mind: -10 }, minutes: 120, toast: { text: '凛冬城立场 +30', kind: 'warn' } }),
      },
    ],
  },
  d24_faction_task: {
    id: 'd24_faction_task', title: '委托', kind: 'story', day: 24, once: true, priority: 65,
    text: () => '一张委托单送到门口，上面盖着凛冬城的章：\n\n「任务：护送一批医疗物资由体育馆至市立医院。报酬：燃油两桶、药品配额一周。」\n\n委托单背面还有另一行手写的字，是掠夺者的笔迹：「同样的活，我们给三桶。」',
    choices: [
      {
        id: 'escort_lindong', label: '接凛冬城的活', hint: '稳定报酬与立场，路上有风险',
        resolve: () => ({ notes: ['你带着人推板车走了两个小时。路上遇到两拨人，看到臂章都让开了。'], items: { fuel: 2, medicine: 1 }, faction: { lindong: { standing: 15 } }, npc: { linwan: { favor: 10, trust: 10 } }, minutes: 300, stats: { energy: -18, warmth: -6 }, flags: { escorted_supplies: true }, toast: { text: '护送完成：燃油 +2 / 药品 +1', kind: 'good' } }),
      },
      {
        id: 'escort_raiders', label: '接掠夺者的活', hint: '报酬更高，凛冬城会记恨',
        resolve: () => ({ notes: ['你把人送到了城北的废弃仓库。收货的人检查得很仔细。', '回程的时候，你绕了远路。'], items: { fuel: 3 }, faction: { raiders: { standing: 15 }, lindong: { standing: -20 } }, minutes: 300, stats: { energy: -20, warmth: -8 }, flags: { ran_for_raiders: true }, toast: { text: '报酬：燃油 +3', kind: 'warn' } }),
      },
      {
        id: 'refuse_task', label: '两边都不接，守自己的楼', hint: '保留体力，专心防守',
        resolve: () => ({ notes: ['你在委托单上写了“不便参加”，压在门缝里。'], base: { defense: 1 }, aid: { morale: 8 }, minutes: 180, stats: { energy: -12 }, flags: { refused_tasks: true } }),
      },
    ],
  },

  /* ================= 第 25 天：预兆 ================= */
  d25_horde_warning: {
    id: 'd25_horde_warning', title: '预兆', kind: 'story', day: 25, once: true, priority: 90,
    text: () => '光脑的预测第一次用了红色。\n\n「城北结晶密度持续上升，感染者聚集速度加快。」\n「预计 3—5 日内发生大规模尸潮。规模：约为第 17 天的三倍。」\n「建议：完成防线加固、弹药储备与人员分工。」',
    choices: [
      {
        id: 'fortify_all', label: '把所有人动员起来加固防线', hint: '消耗建材与体力，防御大幅提升',
        enabled: (s) => afford(s, { metal: 2, wood: 2 }),
        resolve: () => ({ notes: ['焊枪、角钢、沙袋，所有能用的都用上了。', '李阿姨把值班表排到了第三十一天。'], items: { metal: -2, wood: -2 }, base: { defense: 2 }, aid: { morale: 18 }, flags: { fortified_for_horde: true }, minutes: 360, stats: { energy: -26 }, toast: { text: '防线加固：防御 +2', kind: 'good' } }),
      },
      {
        id: 'stock_ammo', label: '全力囤弹药与燃料', hint: '消耗货币，换取战斗资源',
        enabled: (s) => (s.currency >= 60 ? true : '货币不足（需要 60）'),
        resolve: () => ({ notes: ['你在交易区把能买的弹药都买了，又换了两桶油。', '“准备打仗？”姓刘的问。你没回答。'], currency: -60, items: { ammo: 4, fuel: 2 }, flags: { stocked_for_horde: true }, base: { defense: 1 }, minutes: 240, stats: { energy: -12 }, toast: { text: '弹药 +4 / 燃油 +2', kind: 'good' } }),
      },
      {
        id: 'evacuate_plan', label: '准备撤离方案，不硬拼', hint: '保留实力，降低声望',
        resolve: () => ({ notes: ['你在大厅里画了一张撤离图：三条路线，两个集合点。', '有人问：“那不走的人呢？”你没答上来。'], aid: { morale: -12 }, flags: { evac_plan: true }, base: { shelter: 1 }, minutes: 180, stats: { energy: -10, mind: -6 } }),
      },
    ],
  },
  d25_shelter_upgrade: {
    id: 'd25_shelter_upgrade', title: '最后一轮基建', kind: 'story', day: 25, once: true, priority: 65,
    text: () => '工具摊了一地。这是入冬以来最后一次能安稳施工的机会。\n\n“先修哪儿？”老周问。楼下的人在等一个答案。',
    choices: [
      {
        id: 'build_medical', label: '先把医疗区做起来', hint: '提升救治能力（需要药品与木料）',
        enabled: (s) => afford(s, { wood: 2, medicine: 1 }),
        resolve: () => ({ notes: ['隔出一间小屋，铺上干净的布，药品按种类码好。', '林晚路过时看了一眼，说：“比医院三楼整齐。”'], items: { wood: -2, medicine: -1 }, base: { medical: 2 }, npc: { linwan: { favor: 12, trust: 10 } }, aid: { morale: 10 }, minutes: 300, stats: { energy: -20 }, toast: { text: '医疗区 +2', kind: 'good' } }),
      },
      {
        id: 'build_greenhouse', label: '把温室扩到能过冬', hint: '农业路线（需要保温材料与零件）',
        enabled: (s) => afford(s, { insulation: 2, parts: 2 }),
        resolve: () => ({ notes: ['你们把三层的朝南房改成育苗间，四壁贴满保温层，顶上挂了两盏灯。', '第一排苗已经绿了。'], items: { insulation: -2, parts: -2 }, base: { greenhouse: 2, power: 1 }, flags: { agri_plan: true }, aid: { morale: 14 }, minutes: 360, stats: { energy: -24 }, toast: { text: '温室 +2：农业路线推进', kind: 'good' } }),
      },
      {
        id: 'build_defense', label: '继续加固一层与地下室', hint: '防御优先（需要金属与木材）',
        enabled: (s) => afford(s, { metal: 2, wood: 2 }),
        resolve: () => ({ notes: ['一层所有窗户加了钢板，地下室入口做了两道门。', '“进不来的。”小吴说。他自己也不太信。'], items: { metal: -2, wood: -2 }, base: { defense: 2, shelter: 1 }, aid: { morale: 8 }, minutes: 300, stats: { energy: -22 }, toast: { text: '防御 +2 / 住所 +1', kind: 'good' } }),
      },
      {
        id: 'no_build', label: '材料不够，先把现有的东西盘清楚', hint: '主线事件永远有出路：不动工也能推进',
        resolve: () => ({ notes: ['你把所有材料摊在地上数了一遍，发现能做的只有两件小事：把窗户缝再压一遍，把药品重新分箱。', '“等料来了再说。”老周把工具收回箱子。'], base: { medical: 1 }, aid: { morale: 4 }, flags: { build_deferred: true }, stats: { mind: 4 }, minutes: 120, mind2: undefined }),
      },
    ],
  },

  /* ================= 第 26 天：绿色黎明 ================= */
  d26_winter_crop: {
    id: 'd26_winter_crop', title: '极寒农业', kind: 'story', day: 26, once: true, priority: 70,
    condition: (s) => s.base.greenhouse >= 1 || s.flags.agri_plan === true,
    text: () => '育苗盘里的第一排叶子开始发黄——温度不够，光也不够。\n\n“要在极夜里种出东西，得给它造一个假的白天。”林晚说这话的时候，正把一支温度计插进土里。\n\n她缺燃料，你缺产出的稳定。',
    choices: [
      {
        id: 'build_grow_light', label: '用电力给温室造人工白天', hint: '消耗零件与燃油，完成极寒农业路线',
        enabled: (s) => afford(s, { parts: 2, fuel: 1 }),
        resolve: () => ({ notes: ['你和老周把两盏灯挂在育苗架上方，接上发电机的余量。', '第三天早上，第一排叶子重新立了起来。'], items: { parts: -2, fuel: -1 }, base: { greenhouse: 2, power: 1 }, flags: { agri_route: true, grow_light: true }, aid: { morale: 20 }, npc: { linwan: { favor: 15, trust: 15 } }, faction: { aidnet: { standing: 12 } }, minutes: 360, stats: { energy: -22 }, toast: { text: '极寒农业路线完成：绿色黎明条件达成', kind: 'good' } }),
      },
      {
        id: 'swap_with_hospital', label: '把育苗盘挪到医院，换他们的电', hint: '与林晚合作，温室加成略低',
        resolve: () => ({ notes: ['你把育苗盘抬到三楼的老手术室。那里全天有电。', '林晚在门口贴了张纸：“非工作人员不得入内。”'], base: { greenhouse: 1, medical: 1 }, npc: { linwan: { favor: 20, trust: 18, loyalty: 12 } }, flags: { agri_route: true, hospital_greenhouse: true }, aid: { morale: 12 }, minutes: 300, stats: { energy: -18 }, toast: { text: '极寒农业路线完成（医院合作）', kind: 'good' } }),
      },
      { id: 'give_up_crop', label: '放弃育苗，把资源投到防御上', hint: '放弃农业路线', resolve: () => ({ notes: ['你把育苗盘搬到角落，把灯拆下来装到了楼道。'], items: { parts: 1 }, base: { defense: 1 }, flags: { agri_abandoned: true }, aid: { morale: -8 }, minutes: 180, stats: { energy: -12 } }) },
    ],
  },

  /* ================= 第 27 天：极夜 ================= */
  d27_polar_night: {
    id: 'd27_polar_night', title: '极夜', kind: 'story', day: 27, once: true, priority: 90,
    text: () => '太阳没有升起来。\n\n上午十点，天色和凌晨三点没有区别。气温停在 −42℃ 不动，风也停了——安静得能听见楼体结冰的声音。\n\n光脑：「极夜开始。最终寒潮倒计时：72 小时。尸潮预计同时抵达。」',
    choices: [
      {
        id: 'power_ration', label: '重新分配电力：保供暖，放弃照明', hint: '体温优先，夜间视野下降',
        resolve: () => ({ notes: ['你把照明线路全部断开，把电全部给供暖泵。', '楼道里点了蜡烛，一排排摆到三楼。'], base: { heating: 1 }, stats: { warmth: 14 }, aid: { morale: 8 }, flags: { polar_heat_first: true }, minutes: 90, toast: { text: '供暖 +1：体温 +14', kind: 'good' } }),
      },
      {
        id: 'centralize', label: '所有人搬到一个大房间，共用热源', hint: '需要保温材料，效率最高',
        enabled: (s) => afford(s, { insulation: 1 }),
        resolve: () => ({ notes: ['大厅被清空，地上铺了所有能铺的东西，炉子放在正中间。', '十九个人挤在一起，呼吸让空气变得潮湿。'], items: { insulation: -1 }, stats: { warmth: 24, mind: 10 }, aid: { morale: 20 }, flags: { polar_centralized: true }, minutes: 180, toast: { text: '集中供暖：全员体温 +24', kind: 'good' } }),
      },
      {
        id: 'keep_guard', label: '保留照明与警戒，供暖只能维持基础', hint: '安全优先',
        resolve: () => ({ notes: ['你保留了楼道照明和四个观察位。', '代价是屋里始终只有零上一点点。'], base: { defense: 1 }, stats: { warmth: -6, mind: 4 }, aid: { morale: 6 }, flags: { polar_guard_first: true }, minutes: 120 }),
      },
    ],
  },
  d27_last_supply: {
    id: 'd27_last_supply', title: '最后一次出门', kind: 'story', day: 27, once: true, priority: 70,
    text: () => '入夜前，光脑给出了最后一组数字：\n\n「按当前消耗，储备可维持 11 天。尸潮之后是否还有补给点，无法预测。」\n\n外面是 −42℃ 的极夜。这是最后一次机会。',
    choices: [
      { id: 'raid_mine', label: '带人去晶矿做最后一次采集', hint: '高风险高回报：晶核与建材', resolve: () => ({ notes: ['极夜里下矿比白天更危险——头灯是你唯一的方向感。'], battle: 'mine_wretch', minutes: 30, flags: { last_supply_mine: true } }) },
      {
        id: 'buy_bulk', label: '去交易区把货币全部换成物资', hint: '消耗全部货币，换取最大储备',
        enabled: (s) => (s.currency >= 100 ? true : '货币不足（需要 100）'),
        resolve: () => ({ notes: ['你把钱全部拍在柜台上：“按这个数，能拿多少拿多少。”', '姓刘的没还价，还多塞了两包绷带。'], currency: -100, items: { canned: 5, charcoal: 4, bandage: 2, ammo: 2 }, aid: { morale: 10 }, flags: { last_supply_market: true }, minutes: 240, stats: { energy: -14, warmth: -8 }, toast: { text: '储备大幅补充', kind: 'good' } }),
      },
      {
        id: 'stay_in', label: '不出门，把现有的东西盘清楚', hint: '零风险，零收益',
        resolve: () => ({ notes: ['你把仓库清点了一遍，列了一张精确到份的表。', '数字不好看，但至少是准的。'], flags: { last_supply_none: true, stocktake: true }, aid: { morale: 4 }, minutes: 120, mind: { xp: 30 } }),
      },
    ],
  },

  /* ================= 第 28 天：尸潮第一波 ================= */
  d28_first_wave: {
    id: 'd28_first_wave', title: '第一波', kind: 'story', day: 28, once: true, priority: 100,
    text: () => '凌晨两点，观察位敲了三下铁管——三下是最高警报。\n\n街道尽头，黑线比第 17 天宽出一倍。它们走得不快，但整条街都在动。\n\n“前队十分钟就到。”小吴的手在抖，但他没走。',
    choices: [
      {
        id: 'hold_line', label: '全体上墙，正面守住', hint: '依靠防御与人数硬扛',
        resolve: () => ({ notes: ['所有能站的人都站上了二楼窗口和楼顶。', '第一只撞上门的时候，整栋楼响了一下。'], battle: 'swarm', minutes: 40, flags: { horde_wave_1: true }, fame: 8 }),
      },
      {
        id: 'fire_barrier', label: '点燃街面障碍，用火隔开', hint: '消耗燃油，大幅降低冲击',
        enabled: (s) => (has(s, 'fuel', 1) ? true : '没有燃油'),
        resolve: () => ({ notes: ['油顺着雪地铺开，火光把整条街照成橘色。', '前队停下来，开始绕着火光打转。'], items: { fuel: -1 }, stats: { warmth: 8 }, aid: { morale: 12 }, flags: { horde_wave_1: true, fire_barrier: true }, minutes: 240, toast: { text: '火障成功：尸潮绕过正面', kind: 'good' } }),
      },
      {
        id: 'seal_deep', label: '所有人退进地下室，封死入口', hint: '保存实力，放弃一层',
        resolve: () => ({ notes: ['你们退到地下二层，把两道门依次封上。', '上面传来拖行声、撞击声，还有玻璃碎掉的声音。'], items: { wood: -1, metal: -1 }, stats: { mind: -10 }, aid: { morale: -6 }, base: { shelter: 1 }, flags: { horde_wave_1: true, sealed_deep: true }, minutes: 300 }),
      },
    ],
  },
  d28_after_wave: {
    id: 'd28_after_wave', title: '第一波之后', kind: 'story', day: 28, once: true, priority: 80,
    text: () => '天亮（如果那算天亮）的时候，街上安静了。\n\n一层的大门被撞出一个凹坑，铁丝网撕开了两处。楼里有四个人受伤，一个伤得很重。\n\n光脑：「第二波预计 24 小时内抵达。规模更大。」',
    choices: [
      {
        id: 'patch_and_heal', label: '先补门，再救人', hint: '消耗建材与药品，恢复防御与状态',
        enabled: (s) => afford(s, { metal: 1 }),
        resolve: () => ({ notes: ['你们用钢板把凹坑补上，然后把伤员抬到医疗区。', '重伤的那个撑到了下午。'], items: { metal: -1, medicine: -1 }, base: { defense: 1, medical: 1 }, aid: { morale: 16 }, stats: { energy: -20, hp: 4 }, flags: { patched_after_wave: true }, minutes: 300, toast: { text: '防线修复 + 全员恢复', kind: 'good' } }),
      },
      {
        id: 'hunt_stragglers', label: '趁间隙清理街上的落单者', hint: '进入战斗，换取晶核与安全距离',
        resolve: () => ({ notes: ['你带着两个人沿街清理。雪地上全是拖痕。'], battle: 'mutant_infected', minutes: 30, flags: { cleared_street: true }, fame: 6 }),
      },
      {
        id: 'rest_only', label: '什么都不修，让所有人睡一觉', hint: '恢复精力，防线维持原状',
        resolve: () => ({ notes: ['你让所有人回屋睡觉。门上的凹坑就那么留着。'], stats: { energy: 22, mind: 10 }, aid: { morale: 6 }, minutes: 420, flags: { rested_after_wave: true } }),
      },
    ],
  },

  /* ================= 第 29 天：第二波与头目 ================= */
  d29_second_wave: {
    id: 'd29_second_wave', title: '第二波', kind: 'story', day: 29, once: true, priority: 100,
    text: () => '它们比预报的早到了六个小时。\n\n这次没有试探。整条街的黑线直接压过来，走在最前面的东西比同类高出一个头。\n\n“那是头目。”龙九星把刀横在身前，“打掉它，后面的会散。”',
    choices: [
      {
        id: 'fight_alpha', label: '带人突出去打头目', hint: '终极战斗：决定尸潮走向',
        resolve: () => ({ notes: ['你们从侧门出去，贴着墙根向那个方向切。'], battle: 'horde_alpha', minutes: 40, flags: { horde_wave_2: true, alpha_faced: true }, fame: 20 }),
      },
      {
        id: 'mine_trap', label: '把矿道入口炸塌，改道分流', hint: '消耗零件与燃油，把尸潮引向地下',
        enabled: (s) => afford(s, { parts: 2, fuel: 1 }),
        resolve: () => ({ notes: ['你们在通道中段埋了炸药，把主路引向矿道。', '爆炸声之后，黑线开始往地下走。'], items: { parts: -2, fuel: -1 }, base: { defense: 1 }, aid: { morale: 14 }, stats: { energy: -22 }, flags: { horde_wave_2: true, diverted_horde: true }, minutes: 360, toast: { text: '尸潮改道：防线压力下降', kind: 'good' } }),
      },
      {
        id: 'team_rearguard', label: '让队友断后，主力撤回地下室', hint: '需要队友，保人但损关系',
        enabled: (s) => ((s.allies ?? 0) > 0 ? true : '没有可以断后的队友'),
        resolve: () => ({ notes: ['“我带人垫后。”龙九星只说了这一句。', '她没有回头。'], stats: { mind: -12 }, aid: { morale: -10 }, npc: { longjiuxing: { favor: -15, trust: -10, stress: 25 } }, flags: { horde_wave_2: true, ally_rearguard: true }, minutes: 120 }),
      },
    ],
  },
  d29_last_night: {
    id: 'd29_last_night', title: '最后一夜', kind: 'story', day: 29, once: true, priority: 85,
    text: () => '地下二层的灯只剩下两盏。十九个人的呼吸声挤在一起。\n\n李阿姨在数人头，数到第三遍停了下来。\n\n光脑：「外部活动强度下降。预计 6 小时后进入平稳期。」\n「储备评估：食物 4 天，饮水 3 天，燃料 1 天。」',
    choices: [
      {
        id: 'share_last', label: '把最后的食物分给所有人', hint: '士气大涨，储备见底',
        enabled: (s) => (countCategory(s, 'food') >= 3 ? true : '食物不足（需要 3 份）'),
        resolve: () => ({ notes: ['你打开所有箱子，说“吃吧，明天再说”。', '有人哭了，有人笑，有人只是低头吃。'], items: { canned: -3 }, aid: { morale: 30, members: 1 }, faction: { aidnet: { standing: 15 } }, stats: { mind: 16 }, flags: { last_supper: true }, minutes: 120, toast: { text: '互助网士气 +30', kind: 'good' } }),
      },
      {
        id: 'ration_hard', label: '按人头定量，保证能撑到黎明', hint: '士气受损，储备延长',
        resolve: () => ({ notes: ['你把每份食物称了重量，写在纸上贴出来。', '没人反对。也没人吃饭的时候说话。'], aid: { morale: -8 }, flags: { strict_ration: true }, minutes: 90, mind: { xp: 25 } }),
      },
      {
        id: 'stand_watch', label: '自己守最后一班岗', hint: '消耗体力，换取情报与安全',
        resolve: () => ({ notes: ['你在观察位坐到天亮，把每一波移动都记在本子上。', '凌晨四点，活动强度确实掉下去了。'], stats: { energy: -20, hp: -4 }, mind: { xp: 50 }, base: { defense: 1 }, flags: { watched_last_night: true }, minutes: 420, toast: { text: '守夜完成：防御 +1', kind: 'good' } }),
      },
    ],
  },

  /* ================= 第 30 天：黎明 ================= */
  d30_dawn: {
    id: 'd30_dawn', title: '黎明', kind: 'story', day: 30, once: true, priority: 110,
    text: () => '天亮了。\n\n不是极夜结束的那种亮——只是云层薄了一点，天是灰的，雪停了。街上到处是凝固的痕迹，但没有东西在动。\n\n光脑安静了很久，然后显示出一行字：\n\n「第三十天。生存周期完成。开始结算。」',
    choices: [
      {
        id: 'walk_out', label: '走出门，去看看这座城市还剩什么', hint: '进入结局结算',
        resolve: () => ({ notes: ['你把门推开。冷空气涌进来，但比昨天温和。', '外面很静。'], flags: { dawn_walked_out: true, dawn_choice: true, survived_to_dawn: true }, stats: { mind: 12 }, minutes: 120 }),
      },
      {
        id: 'count_everything', label: '先清点所有的东西和所有的人', hint: '进入结局结算',
        resolve: () => ({ notes: ['你从地下二层走到楼顶，一层层数过去。', '十九个人，十四个还站着。', '仓库里剩下的东西，够这些人再撑半个月。'], flags: { dawn_stocktake: true, dawn_choice: true, survived_to_dawn: true }, aid: { morale: 10 }, minutes: 180, mind: { xp: 40 } }),
      },
      {
        id: 'sleep_first', label: '先睡一觉。剩下的醒来再说', hint: '进入结局结算',
        resolve: () => ({ notes: ['你把外套盖在脸上，睡了过去。', '醒来的时候，楼道里有人在煮东西——三十天里第一次闻到这个味道。'], flags: { dawn_slept: true, dawn_choice: true, survived_to_dawn: true }, stats: { energy: 20, mind: 12 }, minutes: 300 }),
      },
    ],
  },

  /* ================= 第 21—30 天新增地点的地点事件 ================= */
  mine_collapse: {
    id: 'mine_collapse', title: '矿道塌方', kind: 'location', location: 'mine', once: true, dayRange: [22, 30],
    text: () => '顶板在响。碎石先是零星掉下来，然后是整片——前面三米的主矿道正在合拢。\n\n左边有一个废弃的侧巷，右边是回程的路。',
    choices: [
      { id: 'brace_it', label: '用木料撑住顶板，继续前进', hint: '消耗木材，直面矿道里的东西', enabled: (s) => afford(s, { wood: 1 }), resolve: () => ({ notes: ['你把木撑打进裂缝，顶板停住了。'], items: { wood: -1 }, minutes: 240, stats: { energy: -18 }, flags: { mine_pushed: true }, battle: 'mine_wretch' }) },
      { id: 'side_tunnel', label: '钻侧巷绕过去', hint: '低风险，可能有发现', resolve: () => ({ notes: ['侧巷很窄，你侧着身子走了很久。', '出来的时候，头灯照到了一整面结晶。'], items: { metal: 2, parts: 1 }, minutes: 300, stats: { energy: -20, warmth: -4 }, flags: { mine_side: true } }) },
      { id: 'pull_back', label: '原路撤回', resolve: () => ({ notes: ['你退出去的时候，身后传来整段矿道合拢的声音。'], minutes: 90, flags: { mine_retreated: true } }) },
    ],
  },
  mine_vein: {
    id: 'mine_vein', title: '矿脉', kind: 'location', location: 'mine', once: true, dayRange: [22, 30],
    text: () => '第二层尽头，结晶顺着岩壁长成一条河。\n\n但它们不是长在石头上——是长在几只还站着的东西身上。它们贴着岩壁，一动不动，像在冬眠。',
    choices: [
      { id: 'harvest_fast', label: '趁它们不动，快速采集', hint: '高额晶核，可能惊醒它们', resolve: () => ({ notes: ['你们用铁钎撬下最外层结晶，动作压到最轻。'], items: { metal: 2 }, cores: 2, minutes: 180, stats: { energy: -18, warmth: -4 }, flags: { harvested_vein: true }, toast: { text: '晶核 +2', kind: 'mind' } }) },
      { id: 'clear_nest', label: '先把它们清掉再采', hint: '进入战斗，安全采集', resolve: () => ({ notes: ['你把铁钎换成了刀。'], battle: 'mine_wretch', minutes: 25, flags: { harvested_vein: true } }) },
      { id: 'mark_vein', label: '只做标记，回去组织人手', hint: '安全，收益延后', resolve: () => ({ notes: ['你在岩壁上砸了个记号，把坐标存进光脑。'], mind: { xp: 40 }, flags: { vein_marked: true }, minutes: 120 }) },
    ],
  },
  tunnel_echo: {
    id: 'tunnel_echo', title: '通道里的回声', kind: 'location', location: 'tunnel', once: true, dayRange: [23, 30],
    text: () => '你的脚步在通道里传出来两次。第二次不是回声——慢了半拍。\n\n头灯扫过去，什么都没有。但地上的脚印是新的，而且不止一双。',
    choices: [
      { id: 'sneak_past', label: '灭灯，贴墙过去', hint: '潜行，保留体力', resolve: () => ({ notes: ['你按灭头灯，手扶着管壁走了两百米。', '背后有人也在走，但你始终没有回头。'], stats: { energy: -10, mind: -6 }, minutes: 90, flags: { tunnel_sneaked: true } }) },
      { id: 'call_out_tunnel', label: '喊话：“凛冬城的，别误会”', hint: '可能换来通行', resolve: () => ({ notes: ['黑暗里有人回了话：“哪个编号？”', '你报了一个数字。对面沉默了几秒，然后说：“走吧。”'], flags: { tunnel_pass: true }, faction: { lindong: { standing: 5 } }, minutes: 60 }) },
      { id: 'retreat_tunnel', label: '退回去', resolve: () => ({ notes: ['你原路返回，走得比来时快。'], minutes: 60, stats: { energy: -6 } }) },
    ],
  },
  tunnel_crossing: {
    id: 'tunnel_crossing', title: '穿越', kind: 'location', location: 'tunnel', once: true, dayRange: [23, 30],
    text: () => '通道在这里分成两支：左边通向城北，右边通向老城区的医院后门。\n\n路牌上的字已经被烟熏黑了，但还认得出。',
    choices: [
      { id: 'cross_north', label: '走城北，去看凛冬城的底细', hint: '降低潜入成本', resolve: () => ({ notes: ['你从通道北口出来，正好在体育馆后面的一条巷子里。'], flags: { lindong_pass: true, north_exit_known: true }, faction: { lindong: { known: true } }, mind: { xp: 35 }, minutes: 240, stats: { energy: -14 } }) },
      { id: 'cross_hospital', label: '走医院后门，把药送过去', hint: '提升林晚关系', resolve: () => ({ notes: ['你从后门进医院的时候，林晚正蹲在走廊里给一个孩子包扎。', '她抬头看了你一眼，第一次先说了“谢谢”。'], npc: { linwan: { favor: 18, trust: 15, stress: -10 } }, items: { bandage: 1 }, base: { medical: 1 }, minutes: 240, stats: { energy: -14 }, flags: { hospital_backdoor: true }, toast: { text: '林晚：信任上升', kind: 'good' } }) },
      { id: 'map_exits', label: '把两个出口都记下来', hint: '情报优先', resolve: () => ({ notes: ['光脑把两个出口的坐标和通道长度都记了下来。'], flags: { corridor_lead: true, tunnel_mapped: true }, mind: { xp: 45 }, minutes: 180, stats: { energy: -10 } }) },
    ],
  },

  /* ================= 第 21 天起的随机事件池 ================= */
  random_market_boom: {
    id: 'random_market_boom', title: '行情波动', kind: 'random', weight: 3, dayRange: [21, 30],
    text: () => '交易区的布告板前围了一圈人。有人一口气买走了所有绷带，然后当场把价格牌翻了个面。',
    choices: [
      { id: 'flip_fast', label: '抢在他之前把需要的买下来', hint: '消耗货币，抢到物资', enabled: (s) => (s.currency >= 40 ? true : '货币不足（需要 40）'), resolve: () => ({ notes: ['你挤到柜台前把钱拍下去。柜台后面的人愣了一下，还是收了。'], currency: -40, items: { bandage: 3, medicine: 1 }, flags: { traded: true }, minutes: 90 }) },
      { id: 'sell_into_it', label: '不买，把手里的同类物资卖掉', hint: '高抛换货币', enabled: (s) => (has(s, 'bandage', 2) ? true : '没有可以卖的绷带（需要 2）'), resolve: () => ({ notes: ['你把多余的绷带全卖了。买的人急着要，没还价。'], items: { bandage: -2 }, currency: 45, flags: { traded: true }, minutes: 60 }) },
      { id: 'watch_boom', label: '只看不动', resolve: () => ({ notes: ['你站在人群外面看完了整个过程。'], flags: { market_intel: true }, mind: { xp: 20 }, minutes: 60 }) },
    ],
  },
  random_informant_tip: {
    id: 'random_informant_tip', title: '免费的一条', kind: 'random', weight: 3, dayRange: [22, 30],
    condition: (s) => s.flags.met_laomao === true && s.flags.refused_laomao !== true,
    text: () => '老猫在路口等你，没戴墨镜。\n\n“这条不收钱。”他说，“回头你活着，记得我提过。”',
    choices: [
      { id: 'take_tip', label: '听他说完', resolve: () => ({ notes: ['“尸潮之后，城北那片会空出来。谁先到谁定规矩。”'], flags: { tip_endgame: true }, mind: { xp: 30 }, minutes: 40 }) },
      { id: 'pay_him_anyway', label: '还是给他钱', hint: '维持关系', enabled: (s) => (s.currency >= 20 ? true : '货币不足（需要 20）'), resolve: () => ({ notes: ['“不收就是不收。”他把钱推回来，但笑了一下。'], currency: -20, npc: { laomao: { favor: 15, trust: 12 } }, flags: { tip_endgame: true }, minutes: 40, toast: { text: '老猫 好感 +15', kind: 'good' } }) },
      { id: 'walk_off_tip', label: '不感兴趣', resolve: () => ({ notes: ['你从他旁边走过去。'], npc: { laomao: { favor: -5 } }, minutes: 20 }) },
    ],
  },
  random_horde_scout: {
    id: 'random_horde_scout', title: '前哨', kind: 'random', weight: 4, dayRange: [25, 30],
    condition: (s) => s.flags.left_home === true,
    text: () => '街角有三只，动作和普通感染者不一样——它们在探路，走几步就回头。\n\n后面很远的地方，是那条黑线。',
    choices: [
      { id: 'kill_scouts', label: '处理掉前哨', hint: '进入战斗，减少尸潮规模', resolve: () => ({ notes: ['三只，逐个解决。'], battle: 'swarm', minutes: 20, fame: 8, flags: { cleared_scouts: true } }) },
      { id: 'report_scouts', label: '记下数量和方向，回楼里报告', resolve: () => ({ notes: ['光脑据此修正了尸潮规模预测。', '李阿姨把观察位的值班改成了两人一组。'], flags: { scout_intel: true }, base: { defense: 1 }, mind: { xp: 40 }, minutes: 60 }) },
      { id: 'avoid_scouts', label: '绕开', resolve: () => ({ notes: ['你贴着墙根退回去。'], stats: { warmth: -4 }, minutes: 60 }) },
    ],
  },
  random_alpha_sighting: {
    id: 'random_alpha_sighting', title: '它站在路中间', kind: 'random', weight: 3, dayRange: [27, 30],
    condition: (s) => s.flags.left_home === true,
    text: () => '一整条街，只有它站在路中间。\n\n比同类高出一个头，颈侧的结晶长到了肩膀。它没有动，只是朝着你这栋楼的方向。',
    choices: [
      { id: 'watch_alpha', label: '保持距离，观察它的行动', hint: '情报优先', resolve: () => ({ notes: ['它在同一个位置站了四十分钟，然后转向了城北。', '光脑记下了它的步幅和转向习惯。'], flags: { alpha_intel: true }, mind: { xp: 55 }, minutes: 90, stats: { warmth: -6 } }) },
      { id: 'engage_alpha', label: '提前打掉它', hint: '终极战斗提前开打', resolve: () => ({ notes: ['你不想等到它带着一整条街过来。'], battle: 'horde_alpha', minutes: 30, fame: 15 }) },
      { id: 'hide_alpha', label: '关灯，别让它记住这栋楼', resolve: () => ({ notes: ['整栋楼在三分钟内暗下来。它站了很久，走了。'], stats: { mind: -6 }, aid: { morale: -4 }, minutes: 60 }) },
    ],
  },
  random_shelter_leak: {
    id: 'random_shelter_leak', title: '地下二层渗水', kind: 'random', weight: 3, dayRange: [21, 30],
    text: () => '地下二层的墙角在渗水，水一出来就结成冰，把货架顶得往外鼓。\n\n再冻两天，这一片的储备就得报废。',
    choices: [
      { id: 'fix_leak', label: '连夜处理', hint: '消耗建材与体力，保住储备', enabled: (s) => afford(s, { wood: 1, metal: 1 }), resolve: () => ({ notes: ['你把货架挪开，用木撑和钢板把渗水点压住。', '天亮前，冰没有再长。'], items: { wood: -1, metal: -1 }, base: { shelter: 1 }, aid: { morale: 8 }, stats: { energy: -20, warmth: -6 }, minutes: 240, flags: { leak_fixed: true }, toast: { text: '住所 +1：储备保住了', kind: 'good' } }) },
      { id: 'move_stock', label: '先把东西搬走', resolve: () => ({ notes: ['十九个人搬了两个小时，把所有箱子挪到干的一侧。'], stats: { energy: -16 }, aid: { morale: 4 }, minutes: 180, flags: { leak_moved: true } }) },
      { id: 'ignore_leak', label: '先不管', resolve: () => ({ notes: ['你用一块塑料布盖住，转身走了。冰还在长。'], items: { canned: -2 }, stats: { mind: -6 }, minutes: 30, flags: { leak_ignored: true } }) },
    ],
  },
  random_last_convoy: {
    id: 'random_last_convoy', title: '最后一辆车', kind: 'random', weight: 2, dayRange: [24, 30],
    condition: (s) => s.flags.left_home === true,
    text: () => '一辆柴油卡车卡在路口，车斗里是没卸完的物资。司机在车底下敲敲打打，旁边站着两个拿枪的人。',
    choices: [
      {
        id: 'trade_convoy', label: '用货币买他们车上的东西', hint: '消耗货币换燃油', enabled: (s) => (s.currency >= 60 ? true : '货币不足（需要 60）'), resolve: () => ({ notes: ['司机从车底爬出来，数了钱，从车斗里拎出两桶油。'], currency: -60, items: { fuel: 2 }, faction: { raiders: { standing: 5 } }, minutes: 90, flags: { traded: true } }),
      },
      { id: 'guard_convoy', label: '帮忙推车，换一点报酬', hint: '消耗体力换物资', resolve: () => ({ notes: ['你和他们一起把车从冰坑里推出来，手上全是血口子。', '司机扔给你一箱压缩食品。'], items: { compressed: 3 }, stats: { energy: -22, hp: -3 }, faction: { raiders: { standing: 8 } }, minutes: 180 }) },
      { id: 'ambush_convoy', label: '等天黑再回来抢', hint: '高风险，高物资', resolve: () => ({ notes: ['你退回巷子里，记住了车牌和人数。'], flags: { convoy_marked: true }, fame: 5, minutes: 60 }) },
    ],
  },
};

/** 第二轮补充剧情：同构事件，合并进同一张表（脚本按天排队，随机事件进随机池）。 */
Object.assign(EVENTS, EXTRA_EVENTS);

export const EVENT_LIST = Object.values(EVENTS);
export const event = (id) => EVENTS[id];
