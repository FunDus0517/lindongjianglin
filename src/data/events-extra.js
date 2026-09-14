/**
 * 补充剧情（第二轮内容扩充）：补齐第 12—26 天原本只有 1—2 段的空档，
 * 并新增一批**随机池事件**（无尽模式主要靠它们撑内容）。
 *
 * 与 events.js 完全同构，分开存放只是为了让主文件别继续膨胀。
 * 字段约定见 data/events.js 头部注释；这里的每条都遵守同一套约束：
 *   - 每个事件至少有一个**无条件可选**的选项（否则队列会卡住）
 *   - 每个选项都必须真实改变点什么（时间 + 资源/状态/关系/Flag 至少一项）
 *   - 只引用真实存在的物品、敌人、人物与势力
 * @module data/events-extra
 */
import { chance, randInt } from '../core/util.js';
import { count, has } from '../systems/Inventory.js';
import { item } from './items.js';

const afford = (state, need) => {
  for (const [id, n] of Object.entries(need)) {
    if (!has(state, id, n)) return `缺少 ${item(id).name}×${n}`;
  }
  return true;
};

export const EXTRA_EVENTS = {
  /* ---------------- 第 12 天 ---------------- */
  d12_radio: {
    id: 'd12_radio', title: '还能开机的收音机', kind: 'story', day: 12, once: true, priority: 60,
    text: () => '楼上那户人家的门虚掩着，屋里比楼道还冷。客厅柜子上摆着一台老式收音机，你拧了一下开关，它竟然亮了——电池只剩最后一格。\n\n频率里只有一个女声，在重复同一句话：「凛冬城，环城路十七号，凭物资登记。名额有限。」\n\n她没有说截止到哪天。',
    choices: [
      {
        id: 'listen', label: '坐下来听完整段广播', hint: '弄清规则再说',
        resolve: () => ({ notes: ['你听了四十分钟，把能记的都记下来了：登记要带物资、要报人数、不接受带病的人。', '最后那句她说了三遍：「我们不养闲人。」'], flags: { heard_broadcast_early: true, knows_lindong_rules: true }, minutes: 40, stats: { mind: -2 }, mind: { xp: 12 } }),
      },
      {
        id: 'strip', label: '拆掉它，把电池和零件拿走', hint: '物资比消息实在',
        resolve: () => ({ notes: ['你把后盖撬开，取出一节还有电的电池和两块还算完整的零件。', '收音机在你手里最后一次响了一声，然后彻底哑了。'], items: { battery: 1, parts: 1 }, minutes: 30, flags: { stripped_radio: true } }),
      },
      {
        id: 'leave', label: '关掉，不掺和', hint: '少知道一件事，少一个念头',
        resolve: () => ({ notes: ['你按下开关，房间重新安静下来。'], minutes: 5, stats: { warmth: -1 } }),
      },
    ],
  },
  d12_water_line: {
    id: 'd12_water_line', title: '接水的队伍', kind: 'story', day: 12, once: true, priority: 55,
    text: () => '小区中间那口消防栓被人砸开了，水一直往外冒，在地上结成了冰坡。\n\n二十几个人排着队，没人说话，只有塑料桶磕在水泥地上的声音。队尾有个人在咳嗽，咳得很深。',
    choices: [
      {
        id: 'queue', label: '排到队尾，老老实实等', hint: '两小时，但最稳',
        resolve: () => ({ notes: ['你站了两小时。轮到你的时候，水已经小了一半，桶底冻了一层。'], items: { purified: 2 }, minutes: 120, stats: { warmth: -4, energy: -8 } }),
      },
      {
        id: 'boil', label: '不排了，回家烧雪', hint: '需要木柴',
        enabled: (s) => afford(s, { firewood: 1 }),
        resolve: () => ({ notes: ['你回家把雪装进锅里，守着炉子等它化开。屋里难得暖了一阵。'], items: { firewood: -1, purified: 2 }, minutes: 60, stats: { warmth: 2 } }),
      },
      {
        id: 'trade', label: '用一罐罐头跟前面的人换位置', hint: '花钱买时间',
        enabled: (s) => afford(s, { canned: 1 }),
        resolve: () => ({ notes: ['那人盯着罐头看了两秒，把桶提起来让开了。', '你十分钟就接满了水。'], items: { canned: -1, purified: 3 }, minutes: 20, flags: { bought_water_spot: true } }),
      },
    ],
  },

  /* ---------------- 第 13 天 ---------------- */
  d13_frostbite: {
    id: 'd13_frostbite', title: '右脚的小趾', kind: 'story', day: 13, once: true, priority: 60,
    text: () => '你脱下袜子的时候，发现右脚小趾已经没有知觉了。颜色像蜡，按下去不回弹。\n\n你在书上见过这个词：冻伤。再往下就是发黑、脱落。',
    choices: [
      {
        id: 'salve', label: '用冻伤药处理，慢慢复温', hint: '需要冻伤药',
        enabled: (s) => afford(s, { frostbite_salve: 1 }),
        resolve: () => ({ notes: ['你把药膏抹开，用温水一点点复温。半小时后，脚趾开始刺痛——疼是好事。'], items: { frostbite_salve: -1 }, minutes: 60, stats: { hp: 4, warmth: 6 }, flags: { frostbite_treated: true } }),
      },
      {
        id: 'bandage', label: '用绷带裹紧，先扛过去', hint: '需要绷带',
        enabled: (s) => afford(s, { bandage: 1 }),
        resolve: () => ({ notes: ['你裹了三层，走路的时候有点像踩在别人的脚上。'], items: { bandage: -1 }, minutes: 20, stats: { hp: -3 }, flags: { frostbite_light: true } }),
      },
      {
        id: 'tough', label: '不管它，明天再说', hint: '现在没空',
        resolve: () => ({ notes: ['你把袜子重新穿上，站起来的时候差点没站稳。'], minutes: 5, stats: { hp: -8, energy: -5 }, flags: { frostbite_untreated: true } }),
      },
    ],
  },
  d13_board_rumor: {
    id: 'd13_board_rumor', title: '榜上第三的人', kind: 'story', day: 13, once: true, priority: 55,
    text: () => '老周在楼道里拦住你，压低声音：「榜上第三那个，昨天一个人挑了掠夺者一整队。听说是用冰镐。」\n\n他顿了一下：「你说他图什么？」',
    choices: [
      {
        id: 'ask', label: '追问细节', hint: '情报也是战力',
        resolve: () => ({ notes: ['「冰镐，近身，专挑膝盖。」老周比划了一下，「他们跑不了，他也不用跑。」', '你把这个细节记住了。'], minutes: 20, mind: { xp: 14 }, npc: { laozhou: { favor: 3, trust: 2 } }, flags: { knows_ice_axe_style: true } }),
      },
      {
        id: 'train', label: '回屋练手，把武器重新握一遍', hint: '消耗精力换取状态',
        resolve: () => ({ notes: ['你在客厅里把钢管抡了两百下。手掌磨破了一点，但握感回来了。'], minutes: 90, stats: { energy: -18, hp: -2, mind: 3 }, flags: { trained_weapon: true } }),
      },
      {
        id: 'shrug', label: '「图活着。」然后走开', hint: '不评价别人',
        resolve: () => ({ notes: ['老周笑了一下，没再说话。'], minutes: 5, stats: { mind: 2 } }),
      },
    ],
  },

  /* ---------------- 第 15 天 ---------------- */
  d15_kid_request: {
    id: 'd15_kid_request', title: '小武敲门', kind: 'story', day: 15, once: true, priority: 60,
    text: () => '小武站在门口，帽子上全是雪。他没进屋，只是把手插在袖子里，看着地面。\n\n「李阿姨咳得厉害。」他说，「我不是来要东西的。」\n\n他说完就走了，走得很快。',
    choices: [
      {
        id: 'food', label: '追出去，塞给他一罐罐头', hint: '需要罐头',
        enabled: (s) => afford(s, { canned: 1 }),
        resolve: () => ({ notes: ['他把罐头抱在怀里，说了一声谢谢，跑上楼了。', '你站在门口，风从楼道里穿过去。'], items: { canned: -1 }, minutes: 10, npc: { xiao_wu: { favor: 10, trust: 5, stress: -8 } }, fame: 2, stats: { mind: 4 }, flags: { helped_kid: true } }),
      },
      {
        id: 'medicine', label: '把消炎药拿给他', hint: '需要消炎药',
        enabled: (s) => afford(s, { medicine: 1 }),
        resolve: () => ({ notes: ['你把药塞进他手里，告诉他一天两片。', '他重复了一遍「一天两片」，像在背课文。'], items: { medicine: -1 }, minutes: 10, npc: { xiao_wu: { favor: 8, trust: 8, stress: -10 }, li_ayi: { favor: 6, trust: 6 } }, fame: 3, flags: { helped_kid: true, gave_medicine_to_li: true } }),
      },
      {
        id: 'refuse', label: '什么也没做，关上门', hint: '你自己也不够',
        resolve: () => ({ notes: ['你听见他下楼的声音，一层一层，很轻。', '你告诉自己这是对的选择，然后重复了三遍。'], minutes: 5, stats: { mind: -6 }, npc: { xiao_wu: { favor: -4, conflict: 8 }, li_ayi: { conflict: 5 } }, flags: { refused_kid: true } }),
      },
    ],
  },
  d15_hoarders: {
    id: 'd15_hoarders', title: '一整间屋子的燃料', kind: 'story', day: 15, once: true, priority: 55,
    text: () => '三单元二楼那户人家，窗帘后面堆到天花板的木柴和木炭，是你这两天听到最多的话。\n\n他们不开门。门缝里透出的热气，在楼道里凝成一条白雾。',
    choices: [
      {
        id: 'threaten', label: '把门砸响，说清楚后果', hint: '会把人得罪死',
        resolve: () => ({ notes: ['门开了一条缝。一只手指着楼梯口：「拿两捆，赶紧走。」', '你听见门后有人在哭。'], items: { firewood: 2, charcoal: 1 }, minutes: 45, npc: { wangdawei: { conflict: 12, favor: -6, stress: 10 } }, stats: { mind: -4 }, flags: { threatened_hoarder: true } }),
      },
      {
        id: 'trade', label: '拿金属跟他们换', hint: '需要金属',
        enabled: (s) => afford(s, { metal: 2 }),
        resolve: () => ({ notes: ['你把两段角钢靠在门上，退后三步。', '门开了一条缝，一只手把角钢拖了进去，然后推出来三捆柴。'], items: { metal: -2, firewood: 3 }, minutes: 30, npc: { wangdawei: { favor: 2, trust: 3, conflict: -4 } }, flags: { traded_hoarder: true } }),
      },
      {
        id: 'walk', label: '算了，绕开这扇门', hint: '不值得',
        resolve: () => ({ notes: ['你从三楼阳台翻回家，少走一段楼道。'], minutes: 20, stats: { warmth: -3, energy: -5 } }),
      },
    ],
  },

  /* ---------------- 第 17 天 ---------------- */
  d17_migration_watch: {
    id: 'd17_migration_watch', title: '整条街在往北走', kind: 'story', day: 17, once: true, priority: 60,
    text: () => '从窗口能看到，整条街的人都在往北走。他们不慌，也不说话，像被什么推着。\n\n有人推着自行车，车后座绑着被子。有个女人一直回头看，但脚步没停。',
    choices: [
      {
        id: 'follow', label: '跟出去一段，弄清他们去哪', hint: '冒风险换情报',
        resolve: () => ({ notes: ['你跟了两公里。队伍在一个路口停住，然后齐齐转向东边——那是城北的方向。', '你注意到地上有新踩出来的印子，不是人的。'], minutes: 120, stats: { warmth: -6, energy: -12 }, mind: { xp: 18 }, flags: { saw_migration: true, horde_warning: true } }),
      },
      {
        id: 'fortify', label: '回家加固门窗', hint: '先把家守住',
        resolve: () => ({ notes: ['你把木板横着钉在门框上，钉到手掌发麻。', '至少今天晚上，门后面是安全的。'], minutes: 120, stats: { energy: -20 }, base: { defense: 1 }, flags: { fortified_early: true } }),
      },
      {
        id: 'warn', label: '挨家敲门，让人别往北去', hint: '会花掉半天',
        resolve: () => ({ notes: ['你敲了七扇门，有五扇没开。开门的两个人都说「知道了」，然后继续收拾东西。', '但李阿姨记住了你。'], minutes: 180, npc: { li_ayi: { favor: 6, trust: 5 } }, fame: 3, stats: { energy: -22, mind: -2 }, flags: { warned_neighbors: true } }),
      },
    ],
  },
  d17_generator: {
    id: 'd17_generator', title: '发电机还能救', kind: 'story', day: 17, once: true, priority: 55,
    text: () => '地下室那台发电机被人拆了一半，线头裸露着。铭牌上写着 5kW，转子看上去还是好的。\n\n把它修起来，需要零件，也需要燃料——但修起来之后，你就有电了。',
    choices: [
      {
        id: 'fix', label: '修好它', hint: '需要零件与燃油',
        enabled: (s) => afford(s, { parts: 2, fuel: 1 }),
        resolve: () => ({ notes: ['你花了三个小时接线、清油路。第一次拉动的时候它咳了两声，第二次就转起来了。', '地下一层的灯亮了。'], items: { parts: -2, fuel: -1 }, minutes: 180, base: { power: 1 }, stats: { energy: -25, mind: 6 }, toast: { text: '发电设施 +1 级', kind: 'good' } }),
      },
      {
        id: 'scavenge', label: '拆零件走人', hint: '不指望它了',
        resolve: () => ({ notes: ['你把还能用的都拆了下来：两组零件，一段铜线。', '发电机在你身后彻底散架。'], items: { parts: 2, metal: 1 }, minutes: 60, stats: { energy: -12 }, flags: { stripped_generator: true } }),
      },
    ],
  },

  /* ---------------- 第 19 天 ---------------- */
  d19_sides: {
    id: 'd19_sides', title: '两边都在等你回话', kind: 'story', day: 19, once: true, priority: 60,
    text: () => '凛冬城的人在楼下等，掠夺者的口信塞在门缝里。\n\n两句话是同一个意思：站过来，或者别挡路。\n\n没人给你第三个选项——但你可以什么都不说。',
    choices: [
      {
        id: 'lindong', label: '跟凛冬城登记', hint: '换一个稳定的后方',
        resolve: () => ({ notes: ['你在登记簿上写下自己的编号：一百五十三。', '发下来一件旧棉衣，硬得像纸板。'], minutes: 120, faction: { lindong: { standing: 14, known: true }, raiders: { standing: -12, known: true } }, stats: { warmth: 4 }, flags: { joined_lindong: true } }),
      },
      {
        id: 'raiders', label: '接掠夺者的口信', hint: '换一条不问来路的路',
        resolve: () => ({ notes: ['来的人在雪里蹲了很久，只说了三句：路线、时间、暗号。', '他没有问你的名字。'], minutes: 90, faction: { raiders: { standing: 14, known: true }, lindong: { standing: -10, known: true } }, items: { fuel: 1 }, flags: { joined_raiders: true } }),
      },
      {
        id: 'silent', label: '谁都不回，继续过自己的', hint: '不站队也有代价',
        resolve: () => ({ notes: ['你把口信烧了，也没下楼。', '当天晚上，你的门被人从外面划了一道。'], minutes: 30, faction: { lindong: { standing: -4 }, raiders: { standing: -4 } }, fame: -3, stats: { mind: 3 }, flags: { stayed_neutral: true } }),
      },
    ],
  },
  d19_traitor: {
    id: 'd19_traitor', title: '有人在夜里开门', kind: 'story', day: 19, once: true, priority: 55,
    text: () => '凌晨两点，你听见楼下有铁门被拉开的声音，很轻，像有人用手托着。\n\n你从楼梯缝里看下去，看见一个背影。你认得那件外套——是楼里人的。',
    choices: [
      {
        id: 'expose', label: '第二天当面揭穿他', hint: '会结下死仇',
        resolve: () => ({ notes: ['你把话摆在楼道里说的，所有人都听见了。', '他没有反驳，只是看着你，看了很久。'], minutes: 60, npc: { laozhou: { conflict: 14, favor: -10 }, li_ayi: { trust: 6 } }, fame: 4, stats: { mind: -3 }, flags: { exposed_traitor: true } }),
      },
      {
        id: 'keep', label: '把这件事咽下去', hint: '留着这张牌',
        resolve: () => ({ notes: ['你什么也没说。第二天他给你送来半袋米，什么也没解释。'], items: { rice: 1 }, minutes: 20, npc: { laozhou: { favor: 8, trust: 6 } }, flags: { kept_traitor_secret: true } }),
      },
      {
        id: 'sell', label: '把消息卖给老猫', hint: '消息能换钱',
        resolve: () => ({ notes: ['老猫听完，点了点头，数出一沓票子。', '「你这个人，」他说，「比我想的会做生意。」'], minutes: 60, currency: 55, npc: { laomao: { favor: 6, trust: 3 }, laozhou: { conflict: 8 } }, flags: { sold_traitor_info: true } }),
      },
    ],
  },

  /* ---------------- 第 20 天 ---------------- */
  d20_checkup: {
    id: 'd20_checkup', title: '林晚的手术室', kind: 'story', day: 20, once: true, priority: 60,
    text: () => '林晚把你按在椅子上，用手电照你的眼睛，又捏了捏你的手指。\n\n「你比自己以为的糟。」她说，「但你还能走。想不想花点代价，把这具身体修一修？」',
    choices: [
      {
        id: 'full', label: '认真处理一遍', hint: '需要消炎药',
        enabled: (s) => afford(s, { medicine: 1 }),
        resolve: () => ({ notes: ['她给你清创、上药、重新包扎，还逼你躺着睡了一觉。', '醒来的时候，你觉得这是这个月最像人的一天。'], items: { medicine: -1 }, minutes: 180, stats: { hp: 28, mind: 8 }, npc: { linwan: { favor: 8, trust: 8 } }, flags: { treated_by_linwan: true } }),
      },
      {
        id: 'quick', label: '简单处理，赶时间', hint: '半小时',
        resolve: () => ({ notes: ['她叹了口气，动作很快。', '「下次来的时候，别是为了救命。」'], minutes: 30, stats: { hp: 10 }, npc: { linwan: { favor: 3 } } }),
      },
      {
        id: 'refuse', label: '「我没时间。」', hint: '省下这段时间',
        resolve: () => ({ notes: ['她把器械收进盒子里，没有再看你。'], minutes: 5, stats: { mind: -4 }, npc: { linwan: { favor: -3, conflict: 4 } }, flags: { refused_checkup: true } }),
      },
    ],
  },
  d20_train_wreck: {
    id: 'd20_train_wreck', title: '停在桥上的列车', kind: 'story', day: 20, once: true, priority: 55,
    text: () => '货运列车停在城东的高架桥上，一半车厢悬在外面。风从桥下灌上来，把雪卷成一条斜线。\n\n车厢门是开着的。里面没有动，但也没有安静很久的样子。',
    choices: [
      {
        id: 'enter', label: '进去，把能拿的都拿上', hint: '里面可能有别的东西',
        resolve: () => ({ notes: ['你钻进去，手电扫过一排排货架。', '第三排后面有东西动了一下——不止一个。'], items: { metal: 2, parts: 1 }, minutes: 90, stats: { warmth: -6 }, battle: 'infected_pack', flags: { looted_train: true } }),
      },
      {
        id: 'edge', label: '只在外侧车厢翻，不往里走', hint: '收益低但安全',
        resolve: () => ({ notes: ['你在最外面那节翻到几段角钢和一只还能用的头灯。', '往里看的时候，你听见货架被人碰了一下。'], items: { metal: 2, headlamp: 1 }, minutes: 60, stats: { energy: -14, warmth: -4 }, flags: { looted_train_edge: true } }),
      },
      {
        id: 'skip', label: '桥太滑，不上去', hint: '命比货重要',
        resolve: () => ({ notes: ['你看着那节悬空的车厢，想象它掉下去的样子。', '然后回家了。'], minutes: 20, stats: { warmth: -2 } }),
      },
    ],
  },

  /* ---------------- 第 21 天 ---------------- */
  d21_haggle: {
    id: 'd21_haggle', title: '第一笔生意', kind: 'story', day: 21, once: true, priority: 60,
    text: () => '交易区第一个来跟你搭话的是个中年人，手里拎着两罐罐头，眼神一直在打量你的货。\n\n「兄弟，」他说，「两罐换你一箱水，怎么样？」',
    choices: [
      {
        id: 'hard', label: '咬死价格，不松口', hint: '可能谈崩',
        resolve: () => ({ notes: ['你报了一个他明显不喜欢的数字。他沉默了十秒，然后掏钱了。', '「下次别这么硬。」他说，「这儿的人记仇。」'], items: { canned: -2 }, currency: 34, minutes: 45, fame: 1, flags: { haggled_hard: true } }),
      },
      {
        id: 'fair', label: '按行情来，成交', hint: '稳稳的收益与名声',
        resolve: () => ({ notes: ['你按市价成交，两边都点头。', '旁边有人记下了你的摊位位置。'], items: { canned: -2 }, currency: 24, minutes: 30, fame: 3, flags: { traded_fair: true } }),
      },
      {
        id: 'gift', label: '多送他一罐，交个朋友', hint: '用物资换人脉',
        resolve: () => ({ notes: ['他愣了一下，然后把自己的手套摘下来塞给你。', '「你这种人，」他说，「在这儿活得久。」'], items: { canned: -3 }, currency: 12, minutes: 30, fame: 5, npc: { laomao: { favor: 4, trust: 4 } }, stats: { mind: 4 }, flags: { traded_generous: true } }),
      },
    ],
  },

  /* ---------------- 第 22 天 ---------------- */
  d22_collapse: {
    id: 'd22_collapse', title: '矿道塌了', kind: 'story', day: 22, once: true, priority: 60,
    text: () => '你还没走出矿道，身后就传来一声闷响，紧接着是整条通道的呼吸声——灰尘涌过来，把灯照出的光柱填满。\n\n前面还有一条岔路。手电的电量指示在闪。',
    choices: [
      {
        id: 'dig', label: '自己刨，把东西带出去', hint: '费体力，危险',
        resolve: () => ({ notes: ['你用冰镐刨了四十分钟，指甲翻了一个。', '爬出来的时候，怀里抱着两块带着结晶的矿石。'], items: { metal: 2 }, cores: 2, minutes: 120, stats: { hp: -8, energy: -26, warmth: -6 }, flags: { mined_under_collapse: true } }),
      },
      {
        id: 'help', label: '喊龙九星，两个人一起清', hint: '欠他一个人情',
        resolve: () => ({ notes: ['他来得比你想的快，一句话没说就开始搬石头。', '清完之后他坐在地上喘气，说：「下次别一个人下矿。」'], cores: 1, minutes: 180, npc: { longjiuxing: { favor: 8, trust: 6 } }, stats: { hp: -3, energy: -20 }, flags: { mined_with_longjiuxing: true } }),
      },
      {
        id: 'abandon', label: '扔下背包，先爬出去', hint: '空手，但活着',
        resolve: () => ({ notes: ['你把背包留在里面，只带着手电和冰镐爬了出来。', '回头看的时候，那条通道已经完全黑了。'], minutes: 60, stats: { hp: -4, energy: -16, mind: -5 }, flags: { abandoned_haul: true } }),
      },
    ],
  },

  /* ---------------- 第 23 天 ---------------- */
  d23_checkpoint: {
    id: 'd23_checkpoint', title: '城里的关卡', kind: 'story', day: 23, once: true, priority: 60,
    text: () => '通往内城的路口被两辆卡车堵死了，中间只留一个人宽。\n\n守卫戴着一样的臂章，动作也是一样的。他们不看你的脸，只看你背着什么。',
    choices: [
      {
        id: 'bribe', label: '递钱，按规矩过', hint: '需要货币',
        enabled: (s) => s.currency >= 40,
        resolve: () => ({ notes: ['你把票子折了两折，压在证件下面递过去。', '他数了数，抬了抬下巴——你可以过了。'], currency: -40, minutes: 60, flags: { passed_checkpoint: true }, faction: { lindong: { standing: 3 } } }),
      },
      {
        id: 'sneak', label: '绕后面的排水沟进去', hint: '需要防毒面具',
        enabled: (s) => afford(s, { gas_mask: 1 }),
        resolve: () => ({ notes: ['沟里的气味让面具第一次派上用场。你爬了十分钟，从一家废弃洗衣房的后门钻了出来。', '衣服上是洗不掉的味。'], minutes: 120, stats: { energy: -18, mind: -4 }, flags: { passed_checkpoint: true, sneaked_in: true } }),
      },
      {
        id: 'fight', label: '不绕了，直接打过去', hint: '会彻底得罪凛冬城',
        resolve: () => ({ notes: ['你先动的手。', '这是你第一次主动打穿制服的人。'], minutes: 30, battle: 'faction_guard', flags: { attacked_checkpoint: true } }),
      },
    ],
  },

  /* ---------------- 第 24 天 ---------------- */
  d24_contact: {
    id: 'd24_contact', title: '接头', kind: 'story', day: 24, once: true, priority: 60,
    text: () => '洗衣房后门，凌晨四点。来人穿的是凛冬城的制服，但没戴臂章。\n\n「我不代表城里，」他说，「也不代表外面。我只代表我自己——和我认识的一批人。」',
    choices: [
      {
        id: 'meet', label: '听他说完', hint: '打开一条新路',
        resolve: () => ({ notes: ['他说了四十分钟，给你画了一张图：三条不问来路的通道，两个可以落脚的仓库。', '「路给你。」他说，「用不用是你的事。」'], minutes: 90, flags: { corridor_lead: true, met_contact: true, intel_corridor: true }, mind: { xp: 25 }, faction: { lindong: { standing: 4, known: true } } }),
      },
      {
        id: 'double', label: '先答应，再把消息卖出去', hint: '两头吃，风险高',
        resolve: () => ({ notes: ['你答应了，转身把接头地点写在纸上，塞进了老猫的门缝。', '第二天，那个位置空了。'], minutes: 120, currency: 70, npc: { laomao: { favor: 8, trust: 4 } }, flags: { double_agent: true, corridor_lead: true }, stats: { mind: -8 }, faction: { lindong: { standing: -6 } } }),
      },
      {
        id: 'refuse', label: '「我不掺和这些。」', hint: '守住自己',
        resolve: () => ({ notes: ['他点点头，把图收了回去。', '「那就当我没来过。」他消失在雪里。'], minutes: 30, stats: { mind: 3 }, flags: { refused_contact: true } }),
      },
    ],
  },

  /* ---------------- 第 25 天 ---------------- */
  d25_defense_drill: {
    id: 'd25_defense_drill', title: '守夜演练', kind: 'story', day: 25, once: true, priority: 60,
    text: () => '王大伟拿着一张手画的图挨家通知：今晚十点，全楼演练一次。\n\n「上次是三个人。」他说，「这次可能是三十个。你们得知道自己在哪一层、拿什么东西。」',
    choices: [
      {
        id: 'full', label: '认真参加，把流程走完', hint: '花两小时换防御',
        resolve: () => ({ notes: ['你被分到二楼楼梯口，任务是「把第一个上来的推下去」。', '演练结束的时候，每个人的位置都对了一遍。'], minutes: 120, base: { defense: 1 }, stats: { energy: -20 }, npc: { wangdawei: { favor: 6, trust: 5, stress: -8 } }, flags: { drilled_defense: true } }),
      },
      {
        id: 'supply', label: '不站岗，去把物资搬上楼', hint: '出力不出人',
        resolve: () => ({ notes: ['你来回搬了十几趟，把楼下的燃料和罐头全挪到了三楼。', '有人给你递了一杯热水。'], minutes: 150, items: { charcoal: 1 }, stats: { energy: -24, mind: 3 }, npc: { wangdawei: { favor: 4 } }, flags: { stocked_upstairs: true } }),
      },
      {
        id: 'skip', label: '不参加，守好自己的门', hint: '省下时间',
        resolve: () => ({ notes: ['你听着楼下的脚步声来回走了两个小时。', '没人来敲你的门。'], minutes: 30, stats: { mind: -3 }, npc: { wangdawei: { favor: -3, conflict: 4 } }, flags: { skipped_drill: true } }),
      },
    ],
  },
  d25_pipe_burst: {
    id: 'd25_pipe_burst', title: '水管冻裂了', kind: 'story', day: 25, once: true, priority: 55,
    text: () => '半夜一声脆响，像有人在墙里掰断了一根骨头。\n\n你打开手电，看见厨房墙角在往外渗水，很快就结成了冰。上水管的接头裂了——正是最冷的那一段。',
    choices: [
      {
        id: 'repair', label: '拆掉重接，顺便包上保温层', hint: '需要零件与保温材料',
        enabled: (s) => afford(s, { parts: 1, insulation: 1 }),
        resolve: () => ({ notes: ['你把裂口锯掉，换上一段新管，外面裹了两层保温棉。', '天亮的时候，水流通了，墙面开始化霜。'], items: { parts: -1, insulation: -1 }, minutes: 120, base: { heating: 1 }, stats: { energy: -20, warmth: 2 }, toast: { text: '供暖设施 +1 级', kind: 'good' } }),
      },
      {
        id: 'patch', label: '先用胶带和布缠上', hint: '需要木柴生火',
        enabled: (s) => afford(s, { firewood: 1 }),
        resolve: () => ({ notes: ['你烧了一盆炭，把接头处的冰烤化，然后缠了五圈胶带。', '它滴得很慢，但还在滴。'], items: { firewood: -1 }, minutes: 90, stats: { warmth: 3, energy: -12 }, flags: { patched_pipe: true } }),
      },
      {
        id: 'ignore', label: '关掉总阀，明天再说', hint: '今晚先睡',
        resolve: () => ({ notes: ['你摸黑找到总阀，拧死。', '屋子里安静下来了，但比刚才更冷。'], minutes: 20, stats: { warmth: -8 }, flags: { no_water_heating: true } }),
      },
    ],
  },

  /* ---------------- 第 26 天 ---------------- */
  d26_seed_vault: {
    id: 'd26_seed_vault', title: '种子库', kind: 'story', day: 26, once: true, priority: 60,
    text: () => '农技站的地下室锁着，门上的封条是去年的。\n\n里面是一排排铁柜，抽屉上贴着标签：小白菜、萝卜、土豆、还有一种你认不出来的豆子。\n\n大部分已经冻坏了，但有几抽屉还是干的。',
    choices: [
      {
        id: 'take', label: '挑最好的两抽屉带走', hint: '为温室做准备',
        resolve: () => ({ notes: ['你挑了萝卜和那种认不出来的豆子。', '标签背面写着种植周期：四十五天。'], items: { seeds: 2, fertilizer: 2 }, minutes: 90, stats: { energy: -14 }, flags: { agri_route: true, took_seeds: true }, toast: { text: '农业路线已开启', kind: 'good' } }),
      },
      {
        id: 'all', label: '把还能用的全搬回来', hint: '费时，但一劳永逸',
        resolve: () => ({ notes: ['你来回搬了六趟，把四个抽屉整个拆下来运回家。', '最后一趟的时候，天已经亮了。'], items: { seeds: 4, fertilizer: 3, produce: 2 }, minutes: 240, stats: { energy: -32, warmth: -6 }, flags: { agri_route: true, hoarded_seeds: true }, toast: { text: '农业路线已开启（大量种子）', kind: 'good' } }),
      },
      {
        id: 'seal', label: '不动它，重新封上', hint: '留给以后的人',
        resolve: () => ({ notes: ['你把门重新关上，用铁丝绕了三圈。', '标签上的字，你都记住了。'], minutes: 45, stats: { mind: 8 }, flags: { sealed_vault: true } }),
      },
    ],
  },

  /* ---------------- 随机池（无尽模式主要靠这些撑内容） ---------------- */
  rnd_clear_sky: {
    id: 'rnd_clear_sky', title: '难得的好天气', kind: 'random', weight: 1.4,
    condition: (s) => s.weather === 'clear',
    text: () => '太阳出来了。天蓝得不像这个冬天该有的样子，雪面反光刺眼。\n\n能见度好得离谱——对面楼的人在阳台上晾被子。',
    choices: [
      {
        id: 'forage', label: '趁天气好，多跑一趟', hint: '搜刮效率更高',
        resolve: () => ({ notes: ['你一口气跑了三个单元，把能翻的地方都翻了一遍。', '没有风的时候，冷是可以忍的。'], minutes: 120, items: { metal: 1, wood: 2 }, stats: { warmth: 2, energy: -16 }, flags: { foraged_clear_day: true } }),
      },
      {
        id: 'dry', label: '把湿衣服和被褥拿出去晒', hint: '恢复状态',
        resolve: () => ({ notes: ['你把所有潮的东西都摊在阳台上。', '下午收回来的时候，它们带着一点太阳的味道。'], minutes: 60, stats: { warmth: 6, mind: 6, hp: 3 } }),
      },
    ],
  },
  rnd_lost_in_storm: {
    id: 'rnd_lost_in_storm', title: '在暴雪里走岔了', kind: 'random', weight: 1.2,
    condition: (s) => s.weather === 'blizzard' || s.weather === 'extreme_cold',
    text: () => '雪把路标盖掉了。你走了二十分钟，才发现自己一直在同一栋楼旁边绕。\n\n手指开始不听话了。',
    choices: [
      {
        id: 'push', label: '凭记忆硬走回去', hint: '快，但会受伤',
        resolve: () => ({ notes: ['你顶着风走了四十分钟，撞在自家单元门上。', '门把手是铁的，握上去的时候没有感觉。'], minutes: 60, stats: { warmth: -8, hp: -6, energy: -14 }, flags: { lost_in_storm: true } }),
      },
      {
        id: 'shelter', label: '找最近的楼道先躲', hint: '慢，但安全',
        resolve: () => ({ notes: ['你钻进一栋没人的楼，坐在楼梯上等了两个小时，等风小一点才出来。', '等待的时候，你把这个冬天重新算了一遍。'], minutes: 150, stats: { warmth: -3, mind: -4, energy: -6 } }),
      },
    ],
  },
  rnd_gear_cache: {
    id: 'rnd_gear_cache', title: '一个没锁的储物柜', kind: 'random', weight: 1.0,
    condition: (s) => s.day >= 6,
    text: () => '体育馆更衣室的储物柜有一排没锁。大部分是空的，或者只剩几件烂掉的衣服。\n\n第七个柜子里，有东西被帆布包着。',
    choices: [
      {
        id: 'open', label: '打开看看', hint: '可能是装备',
        resolve: (s) => {
          const roll = chance(s, 0.5);
          return {
            notes: [roll ? '帆布里是一件皮草大衣，内衬缝着名字，字迹被洗掉了。' : '帆布里是一盏头灯和几节电池，还有一卷绝缘胶带。'],
            items: roll ? { fur_coat: 1 } : { headlamp: 1, battery: 1 },
            minutes: 30,
            stats: { energy: -6 },
            flags: { looted_gear_cache: true },
          };
        },
      },
      {
        id: 'sell', label: '不拆，整包拿去交易区', hint: '换成货币',
        resolve: () => ({ notes: ['你把帆布包原样提走了。老猫掂了掂重量，直接给了个数。'], currency: 32, minutes: 60, flags: { sold_gear_cache: true } }),
      },
      {
        id: 'leave', label: '不碰，怕有主', hint: '少一事',
        resolve: () => ({ notes: ['你把柜门推回去，让它虚掩着，像没人来过。'], minutes: 10 }),
      },
    ],
  },
  rnd_stranger: {
    id: 'rnd_stranger', title: '一个路过的人', kind: 'random', weight: 1.0,
    condition: (s) => s.day >= 4,
    text: () => '有人在楼下叫你。他背着一个明显不属于他的登山包，鞋上全是泥。\n\n「兄弟，」他说，「换点吃的行不行？我有东西。」',
    choices: [
      {
        id: 'share', label: '给他一罐，不收东西', hint: '换名声',
        enabled: (s) => afford(s, { canned: 1 }),
        resolve: () => ({ notes: ['他接过罐头，站在原地吃完了，然后说了句「十七号楼，我记着」。', '你不知道这句话有什么用，但你记住了。'], items: { canned: -1 }, minutes: 20, fame: 4, stats: { mind: 5 }, flags: { helped_stranger: true } }),
      },
      {
        id: 'trade', label: '看他的背包，换实物', hint: '需要罐头',
        enabled: (s) => afford(s, { canned: 1 }),
        resolve: () => ({ notes: ['他从包里掏出两段铜线和一把折叠刀。', '「跟你换的。」他说，走的时候没回头。'], items: { canned: -1, metal: 1, knife: 1 }, minutes: 30, flags: { traded_stranger: true } }),
      },
      {
        id: 'rob', label: '把他按在墙上，把包拿走', hint: '会被人记住',
        resolve: () => ({ notes: ['他没怎么反抗，只是一直看着你。', '包里有一件羽绒服、两罐罐头，和一张小女孩的照片。'], items: { down_jacket: 1, canned: 2 }, minutes: 30, stats: { mind: -10 }, fame: -4, faction: { raiders: { standing: 4, known: true } }, npc: { li_ayi: { conflict: 8 } }, flags: { robbed_stranger: true } }),
      },
    ],
  },
  rnd_duel_callout: {
    id: 'rnd_duel_callout', title: '有人点名找你', kind: 'random', weight: 0.9,
    condition: (s) => s.fame >= 20 && s.day >= 11,
    text: () => '楼下站着一个人，没带包，手插在口袋里。\n\n「听说你最近挺能打。」他说，「我来确认一下。」',
    choices: [
      {
        id: 'fight', label: '下楼，接受挑战', hint: '赢了涨榜，输了掉状态',
        resolve: () => ({ notes: ['你把外套脱了挂在门上——打完还要穿。'], minutes: 20, stats: { energy: -6 }, battle: 'challenger', flags: { accepted_callout: true } }),
      },
      {
        id: 'talk', label: '隔着窗户跟他聊', hint: '不打，也能有收获',
        resolve: () => ({ notes: ['他仰着头跟你说了二十分钟。', '临走前他说：「你比我聪明。」'], minutes: 30, mind: { xp: 16 }, fame: 2, npc: { laozhou: { trust: 3 } }, flags: { talked_down_callout: true } }),
      },
      {
        id: 'ignore', label: '拉上窗帘，不理他', hint: '名声会掉一点',
        resolve: () => ({ notes: ['他在楼下站了半个小时才走。', '这件事当天就传开了。'], minutes: 10, fame: -4, stats: { mind: 2 } }),
      },
    ],
  },
  rnd_night_noise: {
    id: 'rnd_night_noise', title: '墙外面有动静', kind: 'random', weight: 1.1,
    condition: (s) => s.time >= 1200 || s.time < 300,
    text: () => '你被声音吵醒。不是风——风不会停顿。\n\n它一下一下地撞在单元门上，很有耐心。',
    choices: [
      {
        id: 'check', label: '拿上武器，开门去看', hint: '可能是物资，也可能是麻烦',
        resolve: () => ({ notes: ['你拉开门的时候，它正低着头。', '它抬起头，你看清了那张脸——是楼上的老张。'], minutes: 15, battle: 'infected', stats: { energy: -8 }, flags: { night_visitor: true } }),
      },
      {
        id: 'wait', label: '顶住门，等它走', hint: '安全，但睡不好',
        resolve: () => ({ notes: ['你把柜子推到门后，坐到天亮。', '声音在四点左右停了，你没有再睡着。'], minutes: 240, stats: { energy: -14, mind: -6 }, flags: { barricaded_night: true } }),
      },
    ],
  },
  rnd_memory: {
    id: 'rnd_memory', title: '想起来了', kind: 'random', weight: 0.8,
    text: () => '你在收拾一间空屋子的时候，摸到窗台上有一盆死掉的绿萝。\n\n你突然想起六月十九号那天下午，你在做什么。那天你本来是要去取快递的。',
    choices: [
      {
        id: 'remember', label: '坐下来，把那天想完', hint: '花时间换精神',
        resolve: () => ({ notes: ['你坐了很久，把那天从早上想到晚上。', '想起最后一件想不起的事的时候，你哭了一下，然后就好了。'], minutes: 60, stats: { mind: 12, energy: -6 }, flags: { processed_grief: true } }),
      },
      {
        id: 'push', label: '把花盆扔了，继续收拾', hint: '不回头看',
        resolve: () => ({ notes: ['花盆在楼下的雪里碎了。', '你回去继续翻抽屉。'], minutes: 10, stats: { mind: -3, energy: 3 } }),
      },
    ],
  },

  /* ---------------- 凌晨灾害（方案 §八：凌晨可能发生灾害） ----------------
   * kind: 'night' 的事件不进随机池，只在睡觉时按天数确定性地抽一条，
   * 玩家醒来就得处理：维修 / 节能 / 承担人员伤亡风险。 */
  night_heating_fail: {
    id: 'night_heating_fail', title: '供暖停了', kind: 'night',
    text: () => '凌晨三点，你被冻醒。屋里比外面暖不了多少——供暖管路的压力表指针压在零上。\n\n外面是零下四十度。你大概有两个小时可以做决定。',
    choices: [
      {
        id: 'repair', label: '立刻修，拆东墙补西墙', hint: '需要零件与金属',
        enabled: (s) => afford(s, { parts: 1, metal: 1 }),
        resolve: () => ({ notes: ['你把手电叼在嘴里，跪在管井里换了一段管。', '四点十分，压力表回到了绿色区间。'], items: { parts: -1, metal: -1 }, minutes: 120, stats: { energy: -22, warmth: -6, hp: -2 }, flags: { fixed_heating_night: true }, toast: { text: '供暖抢修成功', kind: 'good' } }),
      },
      {
        id: 'throttle', label: '把燃料全烧掉，先保住这一晚', hint: '费燃料，但不冻人',
        enabled: (s) => afford(s, { charcoal: 2 }) || afford(s, { firewood: 3 }),
        resolve: (s) => {
          const useCharcoal = afford(s, { charcoal: 2 }) === true;
          return {
            notes: [useCharcoal ? '你把两箱无烟木炭全倒进炉子，火苗一下窜到半米高。' : '你把三捆木柴塞进炉膛，火声盖过了风声。', '这一晚保住了，但燃料见底了。'],
            items: useCharcoal ? { charcoal: -2 } : { firewood: -3 },
            minutes: 60,
            stats: { warmth: 4, energy: -8 },
            flags: { burned_reserve_night: true },
          };
        },
      },
      {
        id: 'endure', label: '裹紧被子，硬扛到天亮', hint: '不动物资，但有人会撑不住',
        resolve: () => ({ notes: ['你把所有能盖的都盖上，靠墙坐到天亮。', '早上清点的时候，李阿姨的手已经肿了——她在自己屋里没舍得烧柴。'], minutes: 180, stats: { warmth: -14, hp: -6, mind: -5 }, npc: { li_ayi: { injured: 1, stress: 12 }, xiao_wu: { stress: 10 } }, flags: { endured_cold_night: true } }),
      },
    ],
  },
  night_zombie_knock: {
    id: 'night_zombie_knock', title: '深夜有人敲门', kind: 'night',
    text: () => '凌晨两点，单元门被撞了一下。停顿。又撞了一下。\n\n不是风。风不会等。',
    choices: [
      {
        id: 'fight', label: '抄起武器下去', hint: '直接解决',
        resolve: () => ({ notes: ['你下楼的时候它们已经在门厅里了。'], minutes: 20, battle: 'infected_pack', stats: { energy: -8 }, flags: { fought_night_raid: true } }),
      },
      {
        id: 'barricade', label: '把柜子推过去顶住，等它们走', hint: '不出门',
        resolve: () => ({ notes: ['你和衣坐在门后，听得见指甲刮铁皮的声音。', '四点左右，声音散了。'], minutes: 180, stats: { energy: -14, mind: -8 }, flags: { barricaded_door: true } }),
      },
      {
        id: 'trap', label: '打开一楼的电闸，用走廊的灯把它们引走', hint: '需要能源设施',
        enabled: (s) => (s.base?.power ?? 0) >= 1,
        resolve: () => ({ notes: ['你合上闸，走廊的灯亮了一排。', '它们被光引向了另一头。电费又少了一截。'], minutes: 40, base: { power: 0 }, items: { fuel: -1 }, stats: { mind: 3 }, flags: { lured_away: true } }),
      },
    ],
  },
  night_fire: {
    id: 'night_fire', title: '楼下起火了', kind: 'night',
    text: () => '烟味先到的。你打开门，楼道里有橘色的跳动的光。\n\n有人在楼下喊，但听不清喊的是谁的名字。',
    choices: [
      {
        id: 'bucket', label: '拎水桶下去扑', hint: '烧雪取水，费时间',
        resolve: () => ({ notes: ['你来回跑了十几趟，把雪装进桶里提到火边上。', '火在一楼单元门口停住了。'], minutes: 120, items: { purified: -2 }, stats: { energy: -26, hp: -4, warmth: -8 }, npc: { wangdawei: { favor: 8, trust: 6 } }, fame: 4, flags: { fought_fire: true } }),
      },
      {
        id: 'smother', label: '用湿被子捂住火头', hint: '需要绷带/布料类物资',
        enabled: (s) => afford(s, { bandage: 2 }),
        resolve: () => ({ notes: ['你把两条被子泡透，压在火最旺的地方。', '手背被燎掉一块皮。'], items: { bandage: -2 }, minutes: 60, stats: { hp: -6, energy: -14 }, flags: { fought_fire: true } }),
      },
      {
        id: 'up', label: '把楼上的门都敲开，先让人往顶楼撤', hint: '救人优先',
        resolve: () => ({ notes: ['你一层一层往上敲，把人往天台赶。', '天亮的时候，火自己烧完了半条楼道。没有人死。'], minutes: 150, stats: { energy: -18, mind: 4 }, npc: { li_ayi: { favor: 6, trust: 6 }, xiao_wu: { favor: 5 } }, fame: 5, aid: { morale: 6 }, flags: { saved_neighbors_fire: true } }),
      },
    ],
  },
  night_roof_collapse: {
    id: 'night_roof_collapse', title: '雪把顶压塌了', kind: 'night',
    text: () => '一声闷响，天花板掉下来一层雪和灰。你睡觉的位置正上方露出了木梁。\n\n外面的雪还在下。',
    choices: [
      {
        id: 'shovel', label: '上天台把雪清掉', hint: '体力活，但治本',
        resolve: () => ({ notes: ['你在天台铲了三个小时，手冻得握不住铲子把。', '天亮的时候，屋顶不再往下弯了。'], minutes: 180, stats: { energy: -30, warmth: -12, hp: -4 }, base: { shelter: 0 }, flags: { cleared_roof: true } }),
      },
      {
        id: 'prop', label: '用木头把梁撑起来', hint: '需要木材',
        enabled: (s) => afford(s, { wood: 2 }),
        resolve: () => ({ notes: ['你竖了两根木柱，把梁顶回去。', '屋里终于不漏雪了。'], items: { wood: -2 }, minutes: 90, stats: { energy: -18 }, flags: { propped_roof: true } }),
      },
      {
        id: 'move', label: '带着东西挪到别的房间去睡', hint: '不修，先保人',
        resolve: () => ({ notes: ['你把床垫拖进里屋，用柜子挡住那面墙。', '塌的那块地方，后来再没进去过。'], minutes: 90, stats: { energy: -16, warmth: -6, mind: -3 }, flags: { abandoned_room: true } }),
      },
    ],
  },
};
