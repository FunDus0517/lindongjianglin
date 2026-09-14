/**
 * 更新公告弹层：把 changelog.js 里的版本条目按"人话"列出来。
 * 服务器上有更新时优先用**服务器那份**（这样老版本也能看到新版本改了什么）。
 * @module ui/notes
 */
import { h } from '../core/dom.js';
import { btn, sheet, tag } from './components.js';
import { VERSION, BUILD } from '../data/build.js';
import { CHANGELOG } from '../data/changelog.js';

/**
 * @param {{version?:string,build?:string,title?:string,notes?:string[],history?:object[],hasUpdate?:boolean}} info
 * @param {{onUpdate?:Function}} handlers
 */
export function showNotes(info = {}, { onUpdate } = {}) {
  const history = Array.isArray(info.history) && info.history.length ? info.history : CHANGELOG;
  const body = [
    h('div', { class: 'row between' },
      h('span', { class: 'small muted' }, `当前版本 ${VERSION} · 构建 ${BUILD}`),
      info.hasUpdate ? tag(`服务器已更新到 ${info.version}`, 'good') : tag('已是最新', '')),
    h('div', { class: 'col', style: { gap: '14px', marginTop: '12px' } }, history.map((entry, i) => h('div', null,
      h('div', { class: 'row between' },
        h('span', { class: 'strong small' }, `${entry.version ?? ''} ${entry.title ?? ''}`.trim()),
        h('span', { class: 'xs muted' }, String(entry.build ?? entry.date ?? ''))),
      h('div', { class: 'col', style: { gap: '5px', marginTop: '6px' } },
        (entry.notes ?? []).map((n) => h('div', { class: 'small' }, `· ${n}`))),
      i < history.length - 1 ? h('div', { class: 'divider', style: { marginTop: '12px' } }) : null))),
  ];
  if (info.hasUpdate) {
    body.push(h('div', { class: 'btn-group', style: { marginTop: '14px' } },
      btn('立即更新到最新版', { kind: 'primary', block: true, onClick: () => { onUpdate?.(); } })));
  }
  return sheet({ title: '更新公告', body });
}

export default showNotes;
