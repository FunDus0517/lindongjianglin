/**
 * 敌人（项目书 §15 文字战斗系统）。
 * 数值：hp 生命、atk 攻击、def 防御、level 危险等级、drops 掉落表。
 * @module data/battle
 */
export const ENEMIES = {
  raider: {
    id: 'raider', name: '掠夺者', icon: '🥊', hp: 42, atk: 9, def: 2, level: 2,
    intro: '他把撬棍换到另一只手，脚在雪地上碾了两下。',
    drops: [['pipe', 0, 1, 0.5], ['ammo', 0, 1, 0.3], ['currency', 0, 12, 0.6]],
  },
  raider_pair: {
    id: 'raider_pair', name: '掠夺者二人组', icon: '🥊', hp: 66, atk: 11, def: 3, level: 3,
    intro: '两个人分开站位，一个在前，一个绕向你的侧面。',
    drops: [['knife', 0, 1, 0.35], ['metal', 1, 2, 0.5], ['currency', 5, 25, 0.7]],
  },
  scavenger_trio: {
    id: 'scavenger_trio', name: '拾荒者三人', icon: '⛏️', hp: 84, atk: 12, def: 4, level: 4,
    intro: '他们人多，但每个人都在看别人的脸色。',
    drops: [['metal', 1, 3, 0.7], ['parts', 0, 2, 0.5], ['currency', 10, 40, 0.6]],
  },

  /* ---------------- 第 4—10 天：危险升级 ---------------- */
  raider_band: {
    id: 'raider_band', name: '掠夺者小队', icon: '🪓', hp: 118, atk: 15, def: 5, level: 5,
    intro: '领头的人穿着军大衣，身后三个人散成扇形，堵住了两个方向。',
    drops: [['knife', 0, 1, 0.45], ['ammo', 1, 3, 0.6], ['fuel', 0, 1, 0.35], ['currency', 20, 70, 0.7]],
  },
  infected: {
    id: 'infected', name: '感染者', icon: '🧟', hp: 38, atk: 11, def: 1, level: 3,
    intro: '他曾经是这栋楼的住户。现在他的动作不再像人。',
    drops: [['bandage', 0, 1, 0.4], ['medicine', 0, 1, 0.3], ['currency', 0, 15, 0.5]],
  },
  infected_pack: {
    id: 'infected_pack', name: '感染者群', icon: '🧟', hp: 96, atk: 14, def: 3, level: 6,
    intro: '至少四五个。它们没有队形，但也不退。',
    drops: [['medicine', 0, 2, 0.5], ['bandage', 0, 2, 0.5], ['currency', 10, 45, 0.6]],
  },
  wild_dogs: {
    id: 'wild_dogs', name: '野化犬群', icon: '🐕', hp: 44, atk: 10, def: 1, level: 3,
    intro: '三只肋骨分明的狗，不叫，只是缓慢地绕圈。',
    drops: [['frozen_meat', 1, 2, 0.7], ['bandage', 0, 1, 0.25]],
  },

  /* ---------------- 第 11—20 天：挑战线、势力与迁徙 ---------------- */
  challenger: {
    id: 'challenger', name: '挑战者', icon: '🥋', hp: 62, atk: 14, def: 4, level: 5,
    intro: '他先在雪地上把鞋底蹭干净，才抬眼看你——这是练过的人的习惯。',
    drops: [['ammo', 0, 2, 0.5], ['currency', 15, 45, 0.6], ['knife', 0, 1, 0.3]],
  },
  champion: {
    id: 'champion', name: '榜上强者', icon: '🏅', hp: 96, atk: 17, def: 7, level: 7,
    intro: '他身后跟着两个人，只看不动手。他自己甚至连外套都没脱。',
    drops: [['ammo', 1, 3, 0.6], ['currency', 30, 90, 0.7], ['cores', 1, 1, 0.25]],
  },
  raider_elite: {
    id: 'raider_elite', name: '掠夺者头目', icon: '🪓', hp: 124, atk: 18, def: 6, level: 7,
    intro: '他手里是改装过的消防斧，刃口磨得发亮。',
    drops: [['knife', 0, 1, 0.5], ['fuel', 0, 2, 0.45], ['currency', 40, 110, 0.7]],
  },
  faction_guard: {
    id: 'faction_guard', name: '凛冬城守卫', icon: '🛡️', hp: 92, atk: 15, def: 8, level: 6,
    intro: '两个人的臂章是一样的，动作也是一样的——他们受过同一套训练。',
    drops: [['medicine', 1, 2, 0.5], ['parts', 0, 1, 0.4], ['currency', 20, 60, 0.6]],
  },
  mutant_infected: {
    id: 'mutant_infected', name: '变异感染者', icon: '🧟‍♂️', hp: 78, atk: 16, def: 4, level: 6,
    intro: '它的左臂比右臂粗一圈，皮肤下像有东西在动。它跑得比人快。',
    drops: [['cores', 1, 2, 0.4], ['medicine', 0, 1, 0.35], ['bandage', 0, 2, 0.4]],
  },
  horde: {
    id: 'horde', name: '迁徙尸群', icon: '🧟', hp: 148, atk: 18, def: 5, level: 8,
    intro: '它们从街口涌过来，像一条不会停下来的河。',
    drops: [['cores', 1, 3, 0.5], ['ammo', 0, 3, 0.5], ['currency', 20, 80, 0.6]],
  },

  /* ---------------- 第 21—30 天：终局 ---------------- */
  swarm: {
    id: 'swarm', name: '尸潮前锋', icon: '🧟', hp: 112, atk: 17, def: 4, level: 7,
    intro: '它们跑得比同类快，冲在最前面的几只已经不像人了。',
    drops: [['cores', 1, 2, 0.45], ['ammo', 0, 2, 0.5], ['medicine', 0, 1, 0.3]],
  },
  horde_alpha: {
    id: 'horde_alpha', name: '尸潮头目', icon: '👹', hp: 196, atk: 22, def: 8, level: 10,
    intro: '它比别人高出一个头，颈侧的结晶已经长到肩膀。它认得你。',
    drops: [['cores', 2, 4, 0.7], ['fuel', 0, 2, 0.4], ['currency', 40, 120, 0.7]],
  },
  mine_wretch: {
    id: 'mine_wretch', name: '矿洞变异体', icon: '🕷️', hp: 88, atk: 15, def: 6, level: 7,
    intro: '它从矿道顶上倒挂下来，关节的方向和人不一样。',
    drops: [['cores', 2, 3, 0.6], ['parts', 0, 2, 0.5], ['metal', 1, 2, 0.5]],
  },
};

/** 战斗指令（项目书 §15）：攻击 / 潜行 / 远程 / 队友协助 / 特殊技能 / 撤退。 */
export const BATTLE_MOVES = {
  attack:  { id: 'attack', label: '攻击', minutes: 5, desc: '直接造成伤害' },
  sneak:   { id: 'sneak', label: '潜行', minutes: 10, desc: '降低暴露和受伤概率' },
  ranged:  { id: 'ranged', label: '远程', minutes: 5, desc: '消耗弹药并保持距离', needs: { ammo: 1 } },
  ally:    { id: 'ally', label: '队友协助', minutes: 5, desc: '根据人物状态产生不同效果' },
  skill:   { id: 'skill', label: '特殊技能', minutes: 5, desc: '消耗精力换取高伤害', cost: { energy: 20 } },
  retreat: { id: 'retreat', label: '撤退', minutes: 10, desc: '减少损失并结束战斗' },
};

export const enemy = (id) => ENEMIES[id];
