/**
 * 任务（项目书 §16 六大类：主线 / 支线 / 人物 / 生存 / 隐藏 / 紧急）。
 * check(state) 判定完成，progress(state) 给出 [当前, 目标] 用于进度条。
 * 任务页必须展示：目标、进度、奖励、剩余时间、前置、状态。
 * @module data/quests
 */
import { count, countCategory } from '../systems/Inventory.js';

export const QUESTS = {
  /* 第 1 天：教程任务链（通过实际操作完成教学，项目书 §20） */
  q_open_warehouse: {
    id: 'q_open_warehouse', kind: '生存', title: '查看仓库', desc: '弄清楚自己手里到底有什么。', day: 1,
    reward: { items: { canned: 1 }, mindXp: 10 },
    check: (s) => s.flags.opened_warehouse === true,
    progress: (s) => [s.flags.opened_warehouse ? 1 : 0, 1],
  },
  q_heat: {
    id: 'q_heat', kind: '生存', title: '开启热源', desc: '在体温掉下去之前，让屋里有点温度。', day: 1,
    reward: { items: { charcoal: 1 }, mindXp: 10 },
    check: (s) => s.base.heating >= 1 || s.flags.heat_on === true,
    progress: (s) => [s.base.heating >= 1 || s.flags.heat_on ? 1 : 0, 1],
  },
  q_check_mind: {
    id: 'q_check_mind', kind: '主线', title: '查看光脑', desc: '打开父亲留下的终端，看看它想说什么。', day: 1,
    reward: { mindXp: 15 },
    check: (s) => s.flags.opened_mind === true,
    progress: (s) => [s.flags.opened_mind ? 1 : 0, 1],
  },
  q_prepare_out: {
    id: 'q_prepare_out', kind: '生存', title: '准备外出', desc: '穿够衣服再出门，冻伤比饥饿来得更快。', day: 1,
    reward: { items: { bandage: 1 }, mindXp: 10 },
    check: (s) => s.flags.prepared_out === true,
    progress: (s) => [s.flags.prepared_out ? 1 : 0, 1],
  },
  q_first_night: {
    id: 'q_first_night', kind: '主线', title: '熬过第一晚', desc: '活着看到第二天的 06:00。', day: 1,
    reward: { currency: 20, mindXp: 30 },
    check: (s) => s.day >= 2,
    progress: (s) => [s.day >= 2 ? 1 : 0, 1],
  },

  /* 第 2 天 */
  q_food_stock: {
    id: 'q_food_stock', kind: '生存', title: '储备食物', desc: '攒够 6 份食物，三天不出门也饿不死。', day: 2,
    reward: { currency: 15, fame: 2 },
    check: (s) => countCategory(s, 'food') >= 6,
    progress: (s) => [Math.min(countCategory(s, 'food'), 6), 6],
  },
  q_water_stock: {
    id: 'q_water_stock', kind: '生存', title: '储备饮水', desc: '攒够 5 份饮水。断水比断粮更快致命。', day: 2,
    reward: { currency: 15, mindXp: 20 },
    check: (s) => countCategory(s, 'water') >= 5,
    progress: (s) => [Math.min(countCategory(s, 'water'), 5), 5],
  },
  q_observe_wang: {
    id: 'q_observe_wang', kind: '人物', title: '反常的邻居', desc: '弄清 402 为什么在夏天囤货。', day: 2,
    reward: { mindXp: 40, fame: 3 },
    check: (s) => s.flags.saw_his_hoard === true,
    progress: (s) => [s.flags.saw_his_hoard ? 1 : 0, 1],
  },

  /* 第 3 天 */
  q_insulate: {
    id: 'q_insulate', kind: '生存', title: '加固保暖', desc: '把供暖设施升到 1 级，或封住所有窗缝。', day: 3,
    reward: { items: { insulation: 1 }, mindXp: 25 },
    check: (s) => s.base.heating >= 1 || s.flags.sealed_window === true,
    progress: (s) => [s.base.heating >= 1 || s.flags.sealed_window ? 1 : 0, 1],
  },
  q_survive_cold: {
    id: 'q_survive_cold', kind: '紧急', title: '守住体温', desc: '在 18:00 之前把体温维持在 40 以上。', day: 3,
    reward: { items: { frostbite_salve: 1 }, fame: 3 },
    check: (s) => s.time >= 1080 && s.stats.warmth >= 40,
    progress: (s) => [Math.round(s.stats.warmth), 40],
  },
  q_raider: {
    id: 'q_raider', kind: '紧急', title: '击退掠夺者', desc: '让盯上你的人知道你不划算。', day: 3,
    reward: { currency: 30, fame: 6, mindXp: 30 },
    check: (s) => s.flags.raider_defeated === true,
    progress: (s) => [s.flags.raider_defeated ? 1 : 0, 1],
  },
  /* 第 4 天：资源与人情 */
  q_aid_decision: {
    id: 'q_aid_decision', kind: '主线', title: '资源与人情', desc: '给楼里一个说法：帮，还是不帮。', day: 4,
    reward: { currency: 20, mindXp: 25 },
    check: (s) => s.flags.mutual_aid === true || s.flags.aid_refused === true,
    progress: (s) => [s.flags.mutual_aid || s.flags.aid_refused ? 1 : 0, 1],
  },
  q_recruit_wu: {
    id: 'q_recruit_wu', kind: '人物', title: '一楼的小吴', desc: '决定怎么处理这个想干活换饭的年轻人。', day: 4,
    reward: { mindXp: 20, items: { canned: 1 } },
    check: (s) => s.flags.xiao_wu_joined === true || s.flags.xiao_wu_trial === true || s.flags.xiao_wu_refused === true,
    progress: (s) => [s.flags.xiao_wu_joined || s.flags.xiao_wu_trial || s.flags.xiao_wu_refused ? 1 : 0, 1],
  },

  /* 第 5 天：掠夺者 */
  q_defense_one: {
    id: 'q_defense_one', kind: '生存', title: '把门守住', desc: '防御设施达到 1 级。', day: 5,
    reward: { items: { metal: 1 }, mindXp: 20 },
    check: (s) => s.base.defense >= 1,
    progress: (s) => [Math.min(s.base.defense, 1), 1],
  },
  q_wang_deal: {
    id: 'q_wang_deal', kind: '人物', title: '402 的提议', desc: '与王大伟达成一个明确的安排。', day: 5,
    reward: { currency: 25, mindXp: 25 },
    check: (s) => s.flags.wang_alliance === true || s.flags.wang_declined === true || s.flags.gas_intel === true,
    progress: (s) => [s.flags.wang_alliance || s.flags.wang_declined || s.flags.gas_intel ? 1 : 0, 1],
  },

  /* 第 6 天：区域扩大 */
  q_new_frontier: {
    id: 'q_new_frontier', kind: '生存', title: '新区域', desc: '进入地下停车场、加油站或社区小学中的任意一处。', day: 6,
    reward: { currency: 30, mindXp: 30 },
    check: (s) => ['parking', 'gas_station', 'school'].some((id) => (s.visited?.[id] ?? 0) > 0),
    progress: (s) => [['parking', 'gas_station', 'school'].filter((id) => (s.visited?.[id] ?? 0) > 0).length, 1],
  },
  q_blueprint: {
    id: 'q_blueprint', kind: '隐藏', title: '图纸与档案', desc: '获得蓝图，或发现隐藏线索。', day: 6,
    reward: { items: { parts: 1 }, mindXp: 35 },
    check: (s) => count(s, 'blueprint') >= 1 || s.flags.found_archive === true,
    progress: (s) => [count(s, 'blueprint') >= 1 || s.flags.found_archive ? 1 : 0, 1],
  },

  /* 第 7 天：感染者 */
  q_infected_kill: {
    id: 'q_infected_kill', kind: '紧急', title: '清理危险', desc: '处理掉至少一个感染者。', day: 7,
    reward: { currency: 35, fame: 5, mindXp: 30 },
    check: (s) => (s.kills.infected ?? 0) + (s.kills.infected_pack ?? 0) >= 1,
    progress: (s) => [Math.min((s.kills.infected ?? 0) + (s.kills.infected_pack ?? 0), 1), 1],
  },
  q_lockdown: {
    id: 'q_lockdown', kind: '生存', title: '封锁楼道', desc: '封死单元门或加固二楼。', day: 7,
    reward: { items: { insulation: 1 }, mindXp: 25 },
    check: (s) => s.flags.lockdown === true || s.flags.floor2_sealed === true,
    progress: (s) => [s.flags.lockdown || s.flags.floor2_sealed ? 1 : 0, 1],
  },

  /* 第 8 天：互助体系 */
  q_aid_formed: {
    id: 'q_aid_formed', kind: '主线', title: '建立互助体系', desc: '互助成员达到 2 人。', day: 8,
    reward: { currency: 40, fame: 5, mindXp: 35 },
    check: (s) => s.aid.members >= 2,
    progress: (s) => [Math.min(s.aid.members, 2), 2],
  },
  q_aid_li: {
    id: 'q_aid_li', kind: '人物', title: '李阿姨的认可', desc: '把与李阿姨的关系推到“认可”以上。', day: 8,
    reward: { mindXp: 30, items: { canned: 1 } },
    check: (s) => s.npcs.li_ayi.favor >= 25,
    progress: (s) => [Math.min(Math.max(s.npcs.li_ayi.favor, 0), 25), 25],
  },

  /* 第 9 天：人性事件 */
  q_theft_handled: {
    id: 'q_theft_handled', kind: '主线', title: '处理失窃', desc: '对偷窃事件做出决定。', day: 9,
    reward: { currency: 35, mindXp: 30 },
    check: (s) => s.flags.theft_pardoned === true || s.flags.theft_punished === true || s.flags.theft_quiet === true,
    progress: (s) => [s.flags.theft_pardoned || s.flags.theft_punished || s.flags.theft_quiet ? 1 : 0, 1],
  },
  q_child_aid: {
    id: 'q_child_aid', kind: '人物', title: '发烧的孩子', desc: '给四楼的孩子一个结果。', day: 9,
    reward: { mindXp: 30, fame: 3 },
    check: (s) => s.flags.child_saved === true || s.flags.child_isolated === true || s.flags.child_refused === true,
    progress: (s) => [s.flags.child_saved || s.flags.child_isolated || s.flags.child_refused ? 1 : 0, 1],
  },
  q_morale: {
    id: 'q_morale', kind: '生存', title: '人心不散', desc: '互助体系士气达到 40。', day: 9,
    reward: { currency: 30, mindXp: 25 },
    check: (s) => s.aid.morale >= 40,
    progress: (s) => [Math.min(Math.round(s.aid.morale), 40), 40],
  },

  /* 第 10 天：强寒潮与能源 */
  q_heat_two: {
    id: 'q_heat_two', kind: '紧急', title: '撑过强寒潮', desc: '供暖设施达到 2 级，或储备 4 份以上燃料。', day: 10,
    reward: { items: { charcoal: 2 }, mindXp: 35 },
    check: (s) => s.base.heating >= 2 || count(s, 'charcoal') + count(s, 'firewood') >= 4,
    progress: (s) => [Math.min(s.base.heating >= 2 ? 2 : count(s, 'charcoal') + count(s, 'firewood'), 4), 4],
  },
  q_power: {
    id: 'q_power', kind: '生存', title: '能源节点', desc: '建成 1 级能源设施，保证照明与光脑运算。', day: 10,
    reward: { items: { fuel: 1 }, mindXp: 30 },
    check: (s) => s.base.power >= 1,
    progress: (s) => [Math.min(s.base.power, 1), 1],
  },
  q_survive_d10: {
    id: 'q_survive_d10', kind: '主线', title: '活着看到第 11 天', desc: '在第 10 天的强寒潮里活下来。', day: 10,
    reward: { currency: 60, fame: 8, mindXp: 60 },
    check: (s) => s.day >= 11,
    progress: (s) => [s.day >= 11 ? 1 : 0, 1],
  },

  /* 第 11 天：战力榜 */
  q_board_seen: {
    id: 'q_board_seen', kind: '主线', title: '战力榜', desc: '看清自己在榜单上的位置，并决定要不要公开。', day: 11,
    reward: { currency: 40, mindXp: 40 },
    check: (s) => s.flags.board_public === true || s.flags.board_hidden === true || s.flags.board_intel === true,
    progress: (s) => [s.flags.board_public || s.flags.board_hidden || s.flags.board_intel ? 1 : 0, 1],
  },
  q_board_rank: {
    id: 'q_board_rank', kind: '隐藏', title: '挤进前十', desc: '把综合战力推到 60 以上。', day: 11,
    reward: { currency: 50, fame: 5, mindXp: 50 },
    check: (s) => s.power >= 60,
    progress: (s) => [Math.min(s.power, 60), 60],
  },

  /* 第 12 天：挑战线 */
  q_longjiuxing: {
    id: 'q_longjiuxing', kind: '人物', title: '擂台边的人', desc: '与龙九星建立关系（好感 ≥ 25 或救过她）。', day: 12,
    reward: { items: { knife: 1 }, mindXp: 40 },
    check: (s) => s.npcs.longjiuxing.favor >= 25 || s.flags.saved_longjiuxing === true,
    progress: (s) => [Math.min(Math.max(s.npcs.longjiuxing.favor, 0), 25), 25],
  },
  q_challenge_start: {
    id: 'q_challenge_start', kind: '主线', title: '挑战线', desc: '在体育馆擂台上完成第一场，或先摸清规矩。', day: 12,
    reward: { currency: 50, fame: 5, mindXp: 40 },
    check: (s) => s.flags.challenge_1 === true || s.flags.challenge_observed === true,
    progress: (s) => [s.flags.challenge_1 || s.flags.challenge_observed ? 1 : 0, 1],
  },

  /* 第 13 天：强敌与队友 */
  q_champion: {
    id: 'q_champion', kind: '紧急', title: '榜上的人', desc: '应付找上门的榜上强者。', day: 13,
    reward: { currency: 60, fame: 6, mindXp: 40 },
    check: (s) => s.flags.champion_debt === true || s.flags.hid_from_champion === true || (s.kills.champion ?? 0) >= 1,
    progress: (s) => [s.flags.champion_debt || s.flags.hid_from_champion || (s.kills.champion ?? 0) >= 1 ? 1 : 0, 1],
  },
  q_ally: {
    id: 'q_ally', kind: '人物', title: '队友', desc: '让龙九星正式入队（或至少达成合作）。', day: 13,
    reward: { currency: 40, fame: 6, mindXp: 40 },
    check: (s) => s.flags.longjiuxing_joined === true || s.flags.longjiuxing_allied === true,
    progress: (s) => [s.flags.longjiuxing_joined || s.flags.longjiuxing_allied ? 1 : 0, 1],
  },

  /* 第 14 天：凛冬城 */
  q_lindong: {
    id: 'q_lindong', kind: '主线', title: '凛冬城', desc: '确认广播的来源与规模。', day: 14,
    reward: { currency: 40, mindXp: 45 },
    check: (s) => s.flags.lindong_known === true,
    progress: (s) => [s.flags.lindong_known ? 1 : 0, 1],
  },
  q_recruit_terms: {
    id: 'q_recruit_terms', kind: '主线', title: '招募条件', desc: '对凛冬城的条件给出明确答复。', day: 14,
    reward: { currency: 50, fame: 5, mindXp: 40 },
    check: (s) => s.flags.lindong_member === true || s.flags.lindong_trade_only === true || s.flags.lindong_refused === true,
    progress: (s) => [s.flags.lindong_member || s.flags.lindong_trade_only || s.flags.lindong_refused ? 1 : 0, 1],
  },

  /* 第 15 天：势力竞争 */
  q_side: {
    id: 'q_side', kind: '主线', title: '站队', desc: '在两股势力之间做出站位。', day: 15,
    reward: { currency: 60, fame: 8, mindXp: 50 },
    check: (s) => s.flags.sided_lindong === true || s.flags.paid_raiders === true || s.flags.stood_alone === true,
    progress: (s) => [s.flags.sided_lindong || s.flags.paid_raiders || s.flags.stood_alone ? 1 : 0, 1],
  },
  q_resource_war: {
    id: 'q_resource_war', kind: '生存', title: '同一个物资点', desc: '处理与另一队的资源争夺。', day: 15,
    reward: { items: { fuel: 1 }, currency: 40, mindXp: 40 },
    check: (s) => s.flags.won_resource_war === true || s.flags.split_resource_war === true || s.flags.yielded_resource_war === true,
    progress: (s) => [s.flags.won_resource_war || s.flags.split_resource_war || s.flags.yielded_resource_war ? 1 : 0, 1],
  },

  /* 第 16 天：医院 */
  q_hospital: {
    id: 'q_hospital', kind: '主线', title: '还在运转的医院', desc: '与市立医院建立接触。', day: 16,
    reward: { items: { medicine: 1 }, mindXp: 50 },
    check: (s) => s.flags.hospital_contact === true,
    progress: (s) => [s.flags.hospital_contact ? 1 : 0, 1],
  },
  q_linwan: {
    id: 'q_linwan', kind: '人物', title: '林晚的台账', desc: '让林晚认可你（好感 ≥ 25 或签下协议）。', day: 16,
    reward: { items: { bandage: 2 }, currency: 40, mindXp: 45 },
    check: (s) => s.npcs.linwan.favor >= 25 || s.flags.linwan_pact === true || s.flags.hospital_ally === true,
    progress: (s) => [Math.min(Math.max(s.npcs.linwan.favor, 0), 25), 25],
  },

  /* 第 17 天：迁徙 */
  q_migration: {
    id: 'q_migration', kind: '紧急', title: '熬过迁徙', desc: '让尸群从街区过去，而楼还在。', day: 17,
    reward: { currency: 80, fame: 10, mindXp: 60 },
    check: (s) => s.flags.survived_migration === true,
    progress: (s) => [s.flags.survived_migration ? 1 : 0, 1],
  },
  q_mutant: {
    id: 'q_mutant', kind: '主线', title: '变异体', desc: '弄清变异感染者的弱点。', day: 17,
    reward: { currency: 40, mindXp: 50 },
    check: (s) => s.flags.mutant_known === true,
    progress: (s) => [s.flags.mutant_known ? 1 : 0, 1],
  },
  q_cores: {
    id: 'q_cores', kind: '隐藏', title: '晶核', desc: '从变异体身上取得第一枚晶核。', day: 17,
    reward: { currency: 60, mindXp: 60 },
    check: (s) => (s.cores ?? 0) >= 1,
    progress: (s) => [Math.min(s.cores ?? 0, 1), 1],
  },

  /* 第 18 天：冲突 */
  q_conflict: {
    id: 'q_conflict', kind: '主线', title: '对峙', desc: '让小区门口的对峙收场。', day: 18,
    reward: { currency: 70, fame: 10, mindXp: 60 },
    check: (s) => s.flags.conflict_resolved === true,
    progress: (s) => [s.flags.conflict_resolved ? 1 : 0, 1],
  },
  q_challenge_2: {
    id: 'q_challenge_2', kind: '主线', title: '第二场', desc: '完成或明确拒绝挑战线第二场。', day: 18,
    reward: { currency: 60, fame: 8, mindXp: 50 },
    check: (s) => s.flags.challenge_2 === true || s.flags.challenge_declined === true,
    progress: (s) => [s.flags.challenge_2 || s.flags.challenge_declined ? 1 : 0, 1],
  },

  /* 第 19 天：代价 */
  q_refugees: {
    id: 'q_refugees', kind: '人物', title: '门口的人', desc: '给投奔的人一个结果。', day: 19,
    reward: { currency: 50, fame: 6, mindXp: 45 },
    check: (s) => s.flags.accepted_refugees === true || s.flags.screened_refugees === true || s.flags.closed_gate === true,
    progress: (s) => [s.flags.accepted_refugees || s.flags.screened_refugees || s.flags.closed_gate ? 1 : 0, 1],
  },
  q_duel: {
    id: 'q_duel', kind: '人物', title: '她的仇人', desc: '陪龙九星去，或者给她一个交代。', day: 19,
    reward: { items: { ammo: 2 }, currency: 50, mindXp: 50 },
    check: (s) => s.flags.longjiuxing_duel === true || s.flags.longjiuxing_duel_solo === true || s.flags.stopped_duel === true,
    progress: (s) => [s.flags.longjiuxing_duel || s.flags.longjiuxing_duel_solo || s.flags.stopped_duel ? 1 : 0, 1],
  },

  /* 第 20 天：终局前夜 */
  q_endgame_prep: {
    id: 'q_endgame_prep', kind: '紧急', title: '在它来之前', desc: '为十天内的大规模冲突做一次实质准备。', day: 20,
    reward: { currency: 80, fame: 8, mindXp: 60 },
    check: (s) => s.flags.fortified_for_endgame === true || s.flags.stocked_for_endgame === true || s.flags.endgame_pact === true,
    progress: (s) => [s.flags.fortified_for_endgame || s.flags.stocked_for_endgame || s.flags.endgame_pact ? 1 : 0, 1],
  },
  q_challenge_final: {
    id: 'q_challenge_final', kind: '主线', title: '终场', desc: '给挑战线一个收尾。', day: 20,
    reward: { currency: 100, fame: 12, mindXp: 80 },
    check: (s) => s.flags.challenge_final === true || s.flags.challenge_final_declined === true,
    progress: (s) => [s.flags.challenge_final || s.flags.challenge_final_declined ? 1 : 0, 1],
  },
  q_enhance: {
    id: 'q_enhance', kind: '隐藏', title: '晶核强化', desc: '用晶核完成一次强化。', day: 11,
    reward: { currency: 60, mindXp: 50 },
    check: (s) => Object.values(s.enhance ?? {}).reduce((a, b) => a + b, 0) >= 1,
    progress: (s) => [Math.min(Object.values(s.enhance ?? {}).reduce((a, b) => a + b, 0), 1), 1],
  },
  q_survive_d20: {
    id: 'q_survive_d20', kind: '主线', title: '活着看到第 21 天', desc: '带着势力、队友与储备进入终局。', day: 20,
    reward: { currency: 120, fame: 10, mindXp: 100 },
    check: (s) => s.day >= 21,
    progress: (s) => [s.day >= 21 ? 1 : 0, 1],
  },

  /* 第 21 天：交易区 */
  q_market: {
    id: 'q_market', kind: '主线', title: '交易区', desc: '在交易区完成第一次买卖，或先摸清行情。', day: 21,
    reward: { currency: 60, mindXp: 50 },
    check: (s) => s.flags.market_known === true || s.flags.traded === true,
    progress: (s) => [s.flags.market_known || s.flags.traded ? 1 : 0, 1],
  },
  q_market_intel: {
    id: 'q_market_intel', kind: '隐藏', title: '价格规律', desc: '掌握行情波动，或当众把价格压回去。', day: 21,
    reward: { currency: 80, mindXp: 45 },
    check: (s) => s.flags.market_intel === true || s.flags.market_price_capped === true,
    progress: (s) => [s.flags.market_intel || s.flags.market_price_capped ? 1 : 0, 1],
  },

  /* 第 22 天：线人与晶矿 */
  q_laomao: {
    id: 'q_laomao', kind: '人物', title: '线人', desc: '接触到城北的线人。', day: 22,
    reward: { currency: 40, mindXp: 40 },
    check: (s) => s.flags.met_laomao === true,
    progress: (s) => [s.flags.met_laomao ? 1 : 0, 1],
  },
  q_mine: {
    id: 'q_mine', kind: '主线', title: '城北矿脉', desc: '进入或侦察城北晶矿。', day: 22,
    reward: { currency: 70, mindXp: 60 },
    check: (s) => s.flags.mine_open === true || s.flags.knows_mine === true,
    progress: (s) => [s.flags.mine_open || s.flags.knows_mine ? 1 : 0, 1],
  },

  /* 第 23 天：通道与身份 */
  q_corridor_lead: {
    id: 'q_corridor_lead', kind: '隐藏', title: '地图上没有的路', desc: '把地下通道测出来。', day: 23,
    reward: { currency: 60, mindXp: 60 },
    check: (s) => s.flags.corridor_lead === true,
    progress: (s) => [s.flags.corridor_lead ? 1 : 0, 1],
  },
  q_pass: {
    id: 'q_pass', kind: '主线', title: '身份', desc: '拿到凛冬城的通行身份，或明确拒绝。', day: 23,
    reward: { currency: 60, fame: 5, mindXp: 50 },
    check: (s) => s.flags.lindong_pass === true || s.flags.infiltration_refused === true,
    progress: (s) => [s.flags.lindong_pass || s.flags.infiltration_refused ? 1 : 0, 1],
  },

  /* 第 24 天：潜伏与委托 */
  q_corridor: {
    id: 'q_corridor', kind: '隐藏', title: '城里的裂缝', desc: '完成潜伏路线，改变凛冬城格局。', day: 24,
    reward: { currency: 120, fame: 10, mindXp: 90 },
    check: (s) => s.flags.corridor_route === true,
    progress: (s) => [s.flags.corridor_route ? 1 : 0, 1],
  },
  q_faction_task: {
    id: 'q_faction_task', kind: '人物', title: '委托', desc: '对两边的委托给出答复。', day: 24,
    reward: { currency: 70, mindXp: 50 },
    check: (s) => s.flags.escorted_supplies === true || s.flags.ran_for_raiders === true || s.flags.refused_tasks === true,
    progress: (s) => [s.flags.escorted_supplies || s.flags.ran_for_raiders || s.flags.refused_tasks ? 1 : 0, 1],
  },

  /* 第 25 天：预兆 */
  q_horde_prep: {
    id: 'q_horde_prep', kind: '紧急', title: '预兆', desc: '为即将到来的尸潮做一次实质准备。', day: 25,
    reward: { currency: 100, fame: 8, mindXp: 70 },
    check: (s) => s.flags.fortified_for_horde === true || s.flags.stocked_for_horde === true || s.flags.evac_plan === true,
    progress: (s) => [s.flags.fortified_for_horde || s.flags.stocked_for_horde || s.flags.evac_plan ? 1 : 0, 1],
  },
  q_final_build: {
    id: 'q_final_build', kind: '生存', title: '最后一轮基建', desc: '把医疗区、温室或防线推到终局水平。', day: 25,
    reward: { currency: 90, mindXp: 60 },
    check: (s) => s.base.medical >= 2 || s.base.greenhouse >= 2 || s.base.defense >= 4,
    progress: (s) => [Math.min(Math.max(s.base.medical, s.base.greenhouse, Math.floor(s.base.defense / 2)), 2), 2],
  },

  /* 第 26 天：绿色黎明 */
  q_agri_route: {
    id: 'q_agri_route', kind: '隐藏', title: '极寒农业', desc: '在极夜里种出东西。', day: 26,
    reward: { currency: 120, fame: 8, mindXp: 100 },
    check: (s) => s.flags.agri_route === true,
    progress: (s) => [s.flags.agri_route ? 1 : 0, 1],
  },

  /* 第 27 天：极夜 */
  q_polar: {
    id: 'q_polar', kind: '紧急', title: '极夜', desc: '在极夜里安排全楼的取暖方式。', day: 27,
    reward: { currency: 100, mindXp: 70 },
    check: (s) => s.flags.polar_heat_first === true || s.flags.polar_centralized === true || s.flags.polar_guard_first === true,
    progress: (s) => [s.flags.polar_heat_first || s.flags.polar_centralized || s.flags.polar_guard_first ? 1 : 0, 1],
  },
  q_last_supply: {
    id: 'q_last_supply', kind: '生存', title: '最后一次出门', desc: '在尸潮之前完成最后一次补给。', day: 27,
    reward: { currency: 90, mindXp: 60 },
    check: (s) => s.flags.last_supply_mine === true || s.flags.last_supply_market === true || s.flags.last_supply_none === true,
    progress: (s) => [s.flags.last_supply_mine || s.flags.last_supply_market || s.flags.last_supply_none ? 1 : 0, 1],
  },

  /* 第 28 天：第一波 */
  q_wave1: {
    id: 'q_wave1', kind: '紧急', title: '第一波', desc: '撑过尸潮第一波。', day: 28,
    reward: { currency: 140, fame: 12, mindXp: 100 },
    check: (s) => s.flags.horde_wave_1 === true,
    progress: (s) => [s.flags.horde_wave_1 ? 1 : 0, 1],
  },
  q_after_wave: {
    id: 'q_after_wave', kind: '生存', title: '第一波之后', desc: '修复防线、清理街道或让所有人休息。', day: 28,
    reward: { currency: 110, mindXp: 80 },
    check: (s) => s.flags.patched_after_wave === true || s.flags.cleared_street === true || s.flags.rested_after_wave === true,
    progress: (s) => [s.flags.patched_after_wave || s.flags.cleared_street || s.flags.rested_after_wave ? 1 : 0, 1],
  },

  /* 第 29 天：第二波与头目 */
  q_wave2: {
    id: 'q_wave2', kind: '紧急', title: '第二波', desc: '撑过规模更大的第二波。', day: 29,
    reward: { currency: 160, fame: 15, mindXp: 120 },
    check: (s) => s.flags.horde_wave_2 === true,
    progress: (s) => [s.flags.horde_wave_2 ? 1 : 0, 1],
  },
  q_alpha: {
    id: 'q_alpha', kind: '主线', title: '头目', desc: '处理尸潮头目：击杀、改道或让队友断后。', day: 29,
    reward: { currency: 150, fame: 15, mindXp: 110 },
    check: (s) => (s.kills.horde_alpha ?? 0) >= 1 || s.flags.diverted_horde === true || s.flags.ally_rearguard === true,
    progress: (s) => [(s.kills.horde_alpha ?? 0) >= 1 || s.flags.diverted_horde || s.flags.ally_rearguard ? 1 : 0, 1],
  },
  q_last_night: {
    id: 'q_last_night', kind: '人物', title: '最后一夜', desc: '决定最后一夜怎么过。', day: 29,
    reward: { currency: 120, mindXp: 90 },
    check: (s) => s.flags.last_supper === true || s.flags.strict_ration === true || s.flags.watched_last_night === true,
    progress: (s) => [s.flags.last_supper || s.flags.strict_ration || s.flags.watched_last_night ? 1 : 0, 1],
  },

  /* 第 30 天：黎明 */
  q_dawn: {
    id: 'q_dawn', kind: '主线', title: '黎明', desc: '走到第 30 天，完成生存周期。', day: 30,
    reward: { currency: 200, fame: 10, mindXp: 150 },
    check: (s) => s.flags.dawn_choice === true || s.day > 30,
    progress: (s) => [s.flags.dawn_choice || s.day > 30 ? 1 : 0, 1],
  },
  q_survive_30: {
    id: 'q_survive_30', kind: '主线', title: '活下去', desc: '活到第三十天结束。', day: 30,
    reward: { currency: 300, fame: 20, mindXp: 200 },
    check: (s) => s.day >= 31 || s.ending !== null,
    progress: (s) => [(s.day >= 31 || s.ending) ? 1 : 0, 1],
  },
};
export const QUEST_LIST = Object.values(QUESTS);
export const quest = (id) => QUESTS[id];
export const KIND_ORDER = ['主线', '紧急', '生存', '人物', '支线', '隐藏'];
