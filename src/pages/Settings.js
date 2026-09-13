/**
 * 系统设置页（项目书 §11 系统、§21 存档系统、附录C 系统设置页 / 历史记录页）。
 * 包含手动存档、存档导出/导入与损坏恢复、玩法帮助、设备与游戏信息。
 * @module pages/Settings
 */
import { h } from '../core/dom.js';
import { btn, card, confirmDanger, modal, sectionTitle, sheet, tag } from '../ui/components.js';
import { fmtClock, fmtDuration } from '../core/util.js';
import * as Save from '../systems/Save.js';
import * as audio from '../core/audio.js';
import * as prefs from '../core/prefs.js';

export function SettingsPage(ctx) {
  const state = ctx.state;
  const meta = Save.summary();

  return h('div', { class: 'col' },
    card([
      sectionTitle('显示与声音'),
      h('div', { class: 'col', style: { gap: '10px' } },
        h('div', { class: 'row between' },
          h('div', { class: 'grow' },
            h('div', { class: 'small strong' }, '界面音效'),
            h('div', { class: 'xs muted' }, '点击、选择、奖励与危险的合成提示音（无音频素材，零体积）')),
          btn(prefs.get().sound ? '已开启' : '已关闭', {
            sm: true, kind: prefs.get().sound ? 'mind' : '',
            onClick: () => { prefs.toggle('sound'); audio.setEnabled(prefs.get().sound); ctx.refresh(); },
          })),
        h('div', { class: 'row between' },
          h('div', { class: 'grow' },
            h('div', { class: 'small strong' }, '完整动效'),
            h('div', { class: 'xs muted' }, '关闭后页面切换与卡片入场不再有位移与淡入')),
          btn(prefs.get().motion ? '已开启' : '已关闭', {
            sm: true, kind: prefs.get().motion ? 'mind' : '',
            onClick: () => { prefs.toggle('motion'); ctx.refresh(); },
          }))),
      h('div', { class: 'xs muted', style: { marginTop: '8px' } },
        '偏好保存在本机，不随存档重置；系统级“减弱动态效果”设置也会自动生效。'),
    ], { cls: 'flat' }),

    card([
      sectionTitle('存档管理'),
      h('div', { class: 'col', style: { gap: '4px' } },
        h('div', { class: 'row between' }, h('span', { class: 'xs muted' }, '存档状态'), h('span', { class: 'xs' }, meta ? `第 ${meta.day} 天 · ${meta.chapter}` : '无存档')),
        h('div', { class: 'row between' }, h('span', { class: 'xs muted' }, '最近保存'), h('span', { class: 'xs' }, state.lastSave ? `第 ${state.lastSave.at.day} 天 ${fmtClock(state.lastSave.at.time)} · ${state.lastSave.reason}` : '尚未保存')),
        h('div', { class: 'row between' }, h('span', { class: 'xs muted' }, '自动保存'), h('span', { class: 'xs' }, '每日 06:00 / 关键选择 / 战斗结束'))),
      h('div', { class: 'btn-group', style: { marginTop: '12px' } },
        btn('立即保存', { kind: 'primary', onClick: () => ctx.saveNow() }),
        btn('读取存档', { onClick: () => ctx.continueGame() }),
        btn('导出存档', { kind: 'ghost', onClick: () => exportSave(ctx) }),
        btn('导入存档', { kind: 'ghost', onClick: () => importSave(ctx) })),
      h('div', { class: 'btn-group', style: { marginTop: '8px' } },
        btn('删除存档', { kind: 'danger', sm: true, onClick: () => confirmDanger({
          title: '删除存档？',
          text: '删除后无法恢复。建议先导出存档备份。',
          confirmLabel: '删除',
          onConfirm: () => { Save.clear(); ctx.refresh(); },
        }) }),
        btn('重新开始一局', { kind: 'danger', sm: true, onClick: () => confirmDanger({
          title: '重新开始？',
          text: '当前进度会被新的第 1 天覆盖。',
          confirmLabel: '重新开始',
          onConfirm: () => ctx.newGame(),
        }) })),
    ], { cls: 'mind' }),

    card([
      sectionTitle('系统'),
      h('div', { class: 'btn-group' },
        btn('玩法帮助', { onClick: () => helpSheet() }),
        btn('光脑', { onClick: () => ctx.go('mind') }),
        btn('返回首页', { kind: 'ghost', onClick: () => ctx.go('home') })),
    ], { cls: 'flat' }),

    card([
      sectionTitle('本局记录'),
      h('div', { class: 'col', style: { gap: '4px' } },
        h('div', { class: 'row between' }, h('span', { class: 'xs muted' }, '第几天'), h('span', { class: 'xs' }, `第 ${state.day} 天 ${fmtClock(state.time)}`)),
        h('div', { class: 'row between' }, h('span', { class: 'xs muted' }, '游戏时长'), h('span', { class: 'xs' }, fmtDuration(state.playtime))),
        h('div', { class: 'row between' }, h('span', { class: 'xs muted' }, '行动次数'), h('span', { class: 'xs' }, String(state.actions))),
        h('div', { class: 'row between' }, h('span', { class: 'xs muted' }, '触发事件'), h('span', { class: 'xs' }, String(state.eventsSeen))),
        h('div', { class: 'row between' }, h('span', { class: 'xs muted' }, '存档版本'), h('span', { class: 'xs' }, `v${state.version}`))),
      state.log.length > 0
        ? h('div', { class: 'col', style: { marginTop: '10px' } },
          sectionTitle('最近记录'),
          h('div', { class: 'log' }, state.log.slice(-12).reverse().map((e) => h('div', { class: 'log-item' },
            h('span', { class: 't' }, `D${e.day}`), e.text))))
        : null,
    ], { cls: 'flat' }),

    card([
      sectionTitle('关于'),
      h('div', { class: 'small muted' }, '《凛冬降临》纯文字点击式末世生存游戏 · V3.0 项目 · M1 里程碑构建'),
      h('div', { class: 'xs muted', style: { marginTop: '6px' } }, '数据驱动 SPA：剧情、事件、物品、人物、任务与结局全部由 /data 描述，UI 与逻辑分离。'),
    ], { cls: 'flat' }),
  );
}

function helpSheet() {
  sheet({
    title: '玩法帮助',
    body: [
      h('div', { class: 'col' },
        h('div', { class: 'narrative small' },
          '目标：活到第 30 天，或在此之前成为这座城市里最不该被惹的人。\n\n时间：每天 06:00 刷新，22:00 后可休息。任何行动都会消耗时间，时间推进会影响天气、温度、人物状态和事件触发。\n\n生存：生命归零即结束。体温低于 35 会持续掉血；饥饿与饮水见底会更快致命；精力限制每日行动次数；精神影响部分选择与事件。\n\n行动：在地点卡上选择搜索、深入探索、搜救、战斗、潜行、撤退、交易或调查。危险越高的地点收益越大，遇敌概率也越高。\n\n仓库：所有资源消耗即时同步，容量不足时新增物资带不回来。升级仓库设施可提升容量。\n\n光脑：小管家提示风险，情报查询天气与地点，强化消耗晶核永久提升数值，战力榜与交易区按天数开放。\n\n存档：每日 06:00、关键剧情选择、战斗结束与手动保存都会写入本地存档，刷新页面自动恢复。'),
        h('div', { class: 'row wrap', style: { gap: '6px' } },
          tag('自动保存', 'good'), tag('本地存档', 'good'), tag('移动端单手可玩', 'mind')),
      ),
    ],
  });
}

function exportSave(ctx) {
  const text = Save.serialize(ctx.state);
  modal({
    title: '导出存档',
    body: [
      h('div', { class: 'xs muted' }, '复制下面的文本并自行保存，可用于迁移或从损坏中恢复。'),
      h('textarea', {
        class: 'search', style: { height: '180px', padding: '10px', fontFamily: 'monospace', fontSize: '11px' },
        readonly: true, value: text,
      }),
    ],
  });
}

function importSave(ctx) {
  const area = h('textarea', {
    class: 'search', style: { height: '180px', padding: '10px', fontFamily: 'monospace', fontSize: '11px' },
    placeholder: '粘贴导出的存档 JSON',
  });
  const m = modal({
    title: '导入存档',
    body: [
      h('div', { class: 'xs muted' }, '粘贴存档文本后载入。格式错误会被拒绝，当前进度不受影响。'),
      area,
      btn('校验并载入', {
        kind: 'primary', block: true,
        onClick: () => { m.close(); ctx.importSave(area.value); },
      }),
    ],
  });
}

export default SettingsPage;
