/**
 * NPC 对战（商业化升级追加需求：战力系统要能"跟 NPC 打架"）。
 *
 * 真人 PVP 需要服务端，目前没做成 App，所以对手全部是 NPC：
 * 人类阵营（掠夺者、凛冬城守卫、战力榜挑战者）与感染者/尸潮。
 * 每个对手只提供**名册 + 赌注 + 解锁条件**，真正的回合制战斗仍然走 systems/Battle.js，
 * 后果通过 Battle.start 的 stake 在胜利结算里合并（阵营立场、人物冲突、Flag）。
 * @module systems/Duel
 */
import { ENEMIES } from '../data/battle.js';
import * as Battle from './Battle.js';

export const SIDES = { raider: '掠夺者', lindong: '凛冬城', infected: '感染者', board: '战力榜' };

/**
 * 对战名册。
 * unlock(state) 返回 true 或"不能打"的原因；每天每个对手只能打一次（防止刷物资）。
 * stake.win 是胜利后的额外结算，直接合并进 Outcome。
 */
export const ROSTER = [
  {
    id: 'infected_hunt', enemy: 'infected', side: 'infected', name: '感染者（单个）',
    desc: '最基础的对手，用来试手。',
    unlock: (s) => s.day >= 1 || '随时可以',
    stake: { win: { faction: { lindong: { standing: 1 } }, flags: { duel_first_win: true } } },
  },
  {
    id: 'raider_squad', enemy: 'raider_band', side: 'raider', name: '掠夺者小队',
    desc: '主动找他们的麻烦。赢了有物资，也会被他们记住。',
    unlock: (s) => (s.day >= 5 ? true : '第 5 天之后才会在这片区域出现'),
    stake: {
      win: {
        faction: { raiders: { standing: -10, known: true }, lindong: { standing: 3, known: true } },
        flags: { duel_raiders: true },
        notes: ['凛冬城的人后来听说了这件事。'],
      },
    },
  },
  {
    id: 'lindong_guard', enemy: 'faction_guard', side: 'lindong', name: '凛冬城守卫',
    desc: '打他们等于和凛冬城翻脸——除非你已经不打算进城了。',
    unlock: (s) => (s.day >= 8 ? true : '第 8 天之后城里才有巡逻'),
    stake: {
      win: {
        faction: { lindong: { standing: -14, known: true } },
        flags: { attacked_lindong: true },
        notes: ['你抢下了他们的装备，也抢下了他们的敌意。'],
      },
    },
  },
  {
    id: 'board_challenger', enemy: 'challenger', side: 'board', name: '排名挑战者',
    desc: '战力榜上盯着你位置的人。赢了他，下面的人会安静一阵。',
    unlock: (s) => (s.day >= 11 ? true : '战力榜第 11 天开放'),
    stake: { win: { fame: 6, flags: { duel_challenger: true } } },
  },
  {
    id: 'zombie_pack', enemy: 'infected_pack', side: 'infected', name: '感染者群',
    desc: '四五个一起上来。清理它们能换到药品和一点口碑。',
    unlock: (s) => (s.day >= 4 ? true : '第 4 天之后感染者开始成群'),
    stake: { win: { faction: { lindong: { standing: 2 } }, flags: { duel_pack: true } } },
  },
  {
    id: 'mutant_hunt', enemy: 'mutant_infected', side: 'infected', name: '变异感染者',
    desc: '身上长着晶核的那种。风险高，回报也高。',
    unlock: (s) => (s.day >= 10 ? true : '第 10 天之后才出现'),
    stake: { win: { faction: { lindong: { standing: 2 } }, flags: { duel_mutant: true } } },
  },
  {
    id: 'raider_boss', enemy: 'raider_elite', side: 'raider', name: '掠夺者头目',
    desc: '他们的头。打赢他，掠夺者短时间内不会再招惹你。',
    unlock: (s) => (s.day >= 14 ? (Battle.playerAtk(s) >= 12 ? true : '战力不够（攻击力需 ≥ 12）') : '第 14 天之后才会露面'),
    stake: {
      win: {
        faction: { raiders: { standing: -18 }, lindong: { standing: 6 } },
        flags: { duel_raider_boss: true, raiders_cowed: true },
        notes: ['剩下的人短时间内不敢再靠近你的楼。'],
      },
    },
  },
  {
    id: 'board_champion', enemy: 'champion', side: 'board', name: '榜上强者',
    desc: '榜单前几的人。这一战基本决定你在这座城里的位置。',
    unlock: (s) => (s.day >= 18 ? (Battle.playerAtk(s) >= 18 ? true : '战力不够（攻击力需 ≥ 18）') : '第 18 天之后才会接受挑战'),
    stake: { win: { fame: 12, flags: { duel_champion: true } } },
  },
  {
    id: 'swarm_front', enemy: 'swarm', side: 'infected', name: '尸潮前锋',
    desc: '尸潮最前面那几只，跑得比同类快。',
    unlock: (s) => (s.day >= 21 ? true : '第 21 天尸潮才会压到这片区域'),
    stake: { win: { faction: { lindong: { standing: 3 } }, flags: { duel_swarm: true } } },
  },
  {
    id: 'horde_leader', enemy: 'horde_alpha', side: 'infected', name: '尸潮头目',
    desc: '颈侧结晶长到肩膀的那一只。没有把握就别去。',
    unlock: (s) => (s.day >= 26 ? (Battle.playerAtk(s) >= 28 ? true : '战力不够（攻击力需 ≥ 28）') : '第 26 天之后才会出现'),
    stake: {
      win: {
        cores: 3, fame: 20,
        faction: { lindong: { standing: 6 } },
        flags: { duel_alpha: true, alpha_slain: true },
        notes: ['整个街区都听见了那一声。'],
      },
    },
  },
];

export const duel = (id) => ROSTER.find((d) => d.id === id) ?? null;
export const enemyOf = (id) => ENEMIES[duel(id)?.enemy] ?? null;

/** 今天是否已经打过这个对手（一人一天一次）。 */
export const usedToday = (state, id) => Boolean(state.flags?.[`duel_${id}_d${state.day}`]);

/** 是否可打；true 或不可打的原因。 */
export function available(state, id) {
  const d = duel(id);
  if (!d) return '没有这个对手';
  const lock = d.unlock(state);
  if (lock !== true) return lock;
  if (usedToday(state, id)) return '今天已经打过这个对手了';
  if (state.battle && !state.battle.over) return '正在战斗中';
  return true;
}

/**
 * 战力对比：用真实的战斗公式给出"能不能打"的判断与预计掉血，
 * 不猜谜——玩家看到的数字和回合制里用的是同一套。
 */
export function odds(state, id) {
  const d = duel(id);
  const e = enemyOf(id);
  if (!d || !e) return null;
  const atk = Battle.playerAtk(state);
  const def = Battle.playerDef(state);
  const dmgOut = Math.max(1, atk - e.def);
  const rounds = Math.ceil(e.hp / dmgOut);
  const dmgIn = Math.max(1, Math.round(e.atk - def));
  const taken = Math.min(state.stats.hp, dmgIn * Math.max(0, rounds - 1));
  const verdict = atk * 4 >= e.hp * 1.6 ? '稳赢'
    : atk * 4 >= e.hp ? '有把握'
    : atk * 4 >= e.hp * 0.7 ? '五五开'
    : '送死';
  return {
    atk, def, enemyHp: e.hp, enemyAtk: e.atk, rounds, dmgOut, dmgIn,
    expectedLoss: taken, verdict,
    kind: verdict === '稳赢' || verdict === '有把握' ? 'good' : verdict === '五五开' ? 'warn' : 'bad',
  };
}

/** 发起对战：返回一个 Outcome，战斗由 effects 统一启动。 */
export function challenge(state, id) {
  const d = duel(id);
  if (!d) return { ok: false, reason: '没有这个对手' };
  const ok = available(state, id);
  if (ok !== true) return { ok: false, reason: ok };
  return {
    ok: true,
    minutes: 20,
    indoor: false,
    battle: { enemy: d.enemy, stake: d.stake, source: `duel:${d.id}` },
    notes: [`你主动朝${d.name}走过去。`],
    flags: { [`duel_${d.id}_d${state.day}`]: true, [`fought_${d.id}`]: true },
    toast: { text: `对战开始：${d.name}`, kind: 'warn' },
  };
}

/** 界面视图：名册 + 可用状态 + 战力对比。 */
export function view(state) {
  return ROSTER.map((d) => {
    const lock = available(state, d.id);
    return { ...d, locked: lock !== true, lockReason: lock === true ? null : lock, odds: odds(state, d.id), done: usedToday(state, d.id) };
  });
}

export { Battle, ENEMIES };
