/**
 * 人物页与人物详情（项目书 §14、附录C 人物页 / 人物详情页）。
 * 联系人式卡片：好感度、信任度、忠诚度、压力值、目标、性格、当前状态、专属剧情 Flag。
 * @module pages/Characters
 */
import { h } from '../core/dom.js';
import { btn, card, empty, progress, sectionTitle, sheet, tag } from '../ui/components.js';
import * as Inventory from '../systems/Inventory.js';
import * as NPC from '../systems/NPC.js';

const KIND_LABEL = { favor: '好感度', trust: '信任度', loyalty: '忠诚度', stress: '压力值', conflict: '冲突' };
const KIND_CLS = { favor: 'energy', trust: 'mind', loyalty: 'warm', stress: 'hp', conflict: 'hunger' };

function openNpc(ctx, id) {
  const state = ctx.state;
  const c = NPC.character(id);
  const r = NPC.rel(state, id);
  const line = NPC.line(state, id);
  const food = Inventory.list(state, { cat: 'food' })[0];
  const inAid = NPC.inAid(state, id);
  const canInvite = NPC.aidCandidates(state).some((x) => x.id === id);
  const s = sheet({
    title: `${c.portrait} ${c.name} · ${c.title}`,
    body: [
      h('div', { class: 'col' },
        h('div', { class: 'row wrap', style: { gap: '6px' } },
          c.tags.map((t) => tag(t)),
          tag(NPC.relationBand(state, id), (r.conflict ?? 0) >= NPC.CONFLICT_REFUSE ? 'bad' : r.favor >= 25 ? 'good' : ''),
          inAid ? tag('互助成员', 'mind') : null),
        h('div', { class: 'narrative small' }, c.desc),
        line ? h('div', { class: 'line' }, h('span', { class: 'ic' }, '💬'), h('div', { class: 'grow small' }, line)) : null,
        sectionTitle('关系'),
        h('div', { class: 'col', style: { gap: '8px' } }, NPC.KEYS.map((k) => progress(r[k], 100, { cls: KIND_CLS[k], showText: true, label: KIND_LABEL[k] }))),
        sectionTitle('档案'),
        h('div', { class: 'col', style: { gap: '4px' } },
          h('div', { class: 'row between' }, h('span', { class: 'xs muted' }, '性格'), h('span', { class: 'xs', style: { maxWidth: '68%', textAlign: 'right' } }, c.personality)),
          h('div', { class: 'row between' }, h('span', { class: 'xs muted' }, '目标'), h('span', { class: 'xs', style: { maxWidth: '68%', textAlign: 'right' } }, c.goal)),
          h('div', { class: 'row between' }, h('span', { class: 'xs muted' }, '当前状态'), h('span', { class: 'xs' }, r.stress > 60 ? '濒临崩溃' : r.met ? '已接触' : '未接触')),
          h('div', { class: 'row between' }, h('span', { class: 'xs muted' }, '剧情 Flag'), h('span', { class: 'xs' }, Object.keys(state.flags).filter((f) => f.includes(id.slice(0, 5))).length + ' 项'))),
        sectionTitle('互动'),
        h('div', { class: 'col', style: { gap: '6px' } },
          btn('交谈（20 分钟）', { block: true, onClick: () => { s.close(); ctx.apply(NPC.talk(state, id)); } }),
          btn(`赠予 ${food ? food.name : '食物'}（好感 +8）`, {
            block: true, disabled: !food, reason: food ? null : '仓库里没有食物可以送',
            onClick: () => { s.close(); ctx.apply(NPC.give(state, id, food.id)); },
          }),
          btn('观察（40 分钟，获得情报）', { block: true, onClick: () => { s.close(); ctx.apply(NPC.observe(state, id)); } }),
          btn(inAid ? '已在互助体系' : '邀请加入互助体系（40 分钟）', {
            block: true,
            kind: inAid ? 'ghost' : 'primary',
            disabled: inAid || !canInvite,
            reason: inAid ? '对方已经加入' : canInvite ? null : '关系不足（需要好感 + 信任 ≥ 15）',
            onClick: () => { s.close(); ctx.apply(NPC.inviteAid(state, id)); },
          })),
      ),
    ],
  });
}

export function CharactersPage(ctx) {
  const state = ctx.state;
  const list = NPC.active(state);
  const known = list.filter((c) => NPC.met(state, c.id));
  const aid = NPC.aidStatus(state);

  return h('div', { class: 'col' },
    card([
      h('div', { class: 'row between' },
        h('span', { class: 'strong' }, '联系人'),
        tag(`已接触 ${known.length}/${list.length}`, 'mind')),
      h('div', { class: 'xs muted', style: { marginTop: '6px' } }, '人物会根据你的行为主动产生事件，关系变化会反馈到剧情与结局判定。'),
    ], { cls: 'mind' }),

    card([
      h('div', { class: 'row between' },
        h('span', { class: 'strong' }, `互助体系 · ${aid.label}`),
        tag(`${aid.members} 人｜士气 ${aid.morale}`, aid.morale >= 40 ? 'good' : aid.morale >= 20 ? 'warn' : 'bad')),
      h('div', { class: 'xs muted', style: { marginTop: '6px' } }, aid.desc),
      aid.members === 0
        ? h('div', { class: 'xs', style: { marginTop: '6px', color: 'var(--c-warn)' } }, '关系达标后可在人物详情里邀请对方加入（好感 + 信任 ≥ 15）。')
        : null,
    ], { cls: 'flat' }),

    list.length === 0 ? empty('目前还没有遇到任何人。') :
      h('div', { class: 'col' }, list.map((c) => {
        const r = NPC.rel(state, c.id);
        const inAid = NPC.inAid(state, c.id);
        return h('div', { class: 'item', role: 'button', tabindex: '0', onClick: () => openNpc(ctx, c.id) },
          h('span', { class: 'ic', style: { fontSize: '20px' } }, c.portrait),
          h('div', { class: 'grow' },
            h('div', { class: 'row between' },
              h('span', { class: 'strong small' }, c.name),
              tag(r.met ? NPC.relationBand(state, c.id) : '尚未接触', (r.conflict ?? 0) >= NPC.CONFLICT_REFUSE ? 'bad' : r.favor >= 25 ? 'good' : '')),
            h('div', { class: 'row wrap', style: { gap: '4px', marginTop: '2px' } },
              tag(`好感 ${r.favor}`, r.favor >= 25 ? 'good' : ''),
              r.stress > 60 ? tag('压力高', 'bad') : null,
              (r.conflict ?? 0) > 0 ? tag(`冲突 ${r.conflict}`, (r.conflict ?? 0) >= NPC.CONFLICT_REFUSE ? 'bad' : 'warn') : null,
              inAid ? tag('互助成员', 'mind') : null,
              h('span', { class: 'xs muted' }, c.title))),
          h('span', { class: 'xs muted' }, '›'));
      })),

    card([
      sectionTitle('关系说明'),
      h('div', { class: 'small muted' },
        '好感度决定对方是否愿意与你合作；信任度决定他是否会透露关键信息；忠诚度决定危机时是否站在你这边；'
        + `压力值过高会触发失控事件；冲突值会自己长（长期高压 + 低好感），到 ${NPC.CONFLICT_REFUSE} 就不理你了，`
        + `到 ${NPC.CONFLICT_LEAVE} 会退出互助体系。赠予物资可以压冲突。`),
    ], { cls: 'flat' }),
  );
}

export default CharactersPage;
