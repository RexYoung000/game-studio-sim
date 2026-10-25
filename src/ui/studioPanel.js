// 中栏：当前项目 + 开发日志
import { getPlatform, platformState } from '../data/platforms.js';
import { getGenre, getTheme, fitLabel } from '../data/genres.js';
import { qualityLines, LINE_KEYS } from '../systems/sales.js';
import { estimateWeeks } from '../systems/project.js';
import { LINE_LABELS } from '../data/staff.js';
import { getYear } from '../state.js';
import { renderLog } from './log.js';

function qualityBar(state, project, key) {
  const lines = qualityLines(state, project);
  const value = Math.round(lines[key]);
  return `
    <div class="stat-row">
      <span class="tiny">${LINE_LABELS[key]}</span>
      <div class="bar slim"><div class="bar-fill ${value >= 8 ? 'great' : value >= 5 ? 'good' : 'meh'}" style="width:${value * 10}%"></div></div>
      <span class="tiny num">${value}</span>
    </div>
  `;
}

function projectCard(state) {
  const p = state.project;
  const platform = getPlatform(p.platform);
  const genre = getGenre(p.genre);
  const theme = getTheme(p.theme);
  const pct = Math.round((p.dp / p.dpNeed) * 100);
  const done = p.dp >= p.dpNeed;
  const weeks = estimateWeeks(state);
  return `
    <div class="project-card">
      <div class="project-head">
        <div>
          <h3>《${theme.name}${genre.name}》</h3>
          <p class="tiny muted">${platform.name} · 相性「${fitLabel(p.fit)}」×${p.fit}</p>
        </div>
        <span class="tag ${done ? 'ok' : ''}">${done ? '开发完成' : '开发中'}</span>
      </div>
      <div class="stat-row">
        <span class="tiny">进度 ${pct}%</span>
        <div class="bar"><div class="bar-fill accent" style="width:${pct}%"></div></div>
        <span class="tiny num">${Math.round(p.dp)}/${p.dpNeed}</span>
      </div>
      <div class="stats">
        ${LINE_KEYS.map((k) => qualityBar(state, p, k)).join('')}
      </div>
      <div class="project-foot">
        <span class="tiny muted">预计还需 ${weeks} 周</span>
        <button class="btn primary" data-action="release" ${done ? '' : 'disabled'}>${done ? '发行游戏' : '开发中…'}</button>
      </div>
    </div>
  `;
}

function emptyState(state) {
  const year = getYear(state);
  const platforms = ['fc800', 'boy', 'neo', 'boy2', 'neo2', 'boy3']
    .map((id) => getPlatform(id))
    .filter((p) => platformState(p, year).unlocked);
  return `
    <div class="empty-project">
      <h3>工作室闲着</h3>
      <p class="muted">当前可选平台：${platforms.map((p) => p.name).join(' / ') || '无'}</p>
      <button class="btn primary big" data-action="new-project">立项新游戏</button>
    </div>
  `;
}

export function renderStudioPanel(state) {
  return `
    <div class="panel-head">
      <h2>工作室</h2>
      <span class="tiny muted">${state.project ? '1 个项目在研' : '空闲'}</span>
    </div>
    <div class="studio-main">
      ${state.project ? projectCard(state) : emptyState(state)}
    </div>
    <div class="panel-subhead">
      <h3>开发日志</h3>
    </div>
    <div class="log-area">
      ${renderLog(state)}
    </div>
  `;
}
