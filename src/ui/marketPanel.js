// 右栏：平台世代、类型热度、新闻
import { PLATFORMS, platformState, PHASE_LABEL } from '../data/platforms.js';
import { GENRES } from '../data/genres.js';
import { getYear } from '../state.js';
import { genreHeatLabel } from '../systems/market.js';

function platformRow(platform, year) {
  const st = platformState(platform, year);
  const retire = platform.retireYear <= 10 ? `第 ${platform.retireYear} 年退市` : '长期活跃';
  return `
    <li class="platform-row ${st.phase}">
      <span class="platform-name">${platform.name}</span>
      <span class="tag phase-${st.phase}">${PHASE_LABEL[st.phase]}</span>
      <span class="tiny muted">${st.phase === 'locked' ? `第 ${platform.launchYear} 年上市` : retire}</span>
    </li>
  `;
}

function heatRow(state, genre) {
  const heat = state.genreHeat[genre.id] || 1;
  const label = genreHeatLabel(heat);
  const cls = heat >= 1.15 ? 'hot' : heat <= 0.9 ? 'cold' : 'normal';
  return `
    <li class="heat-row">
      <span>${genre.name}</span>
      <span class="heat-value ${cls}">${heat.toFixed(2)} <span class="tiny">${label}</span></span>
    </li>
  `;
}

function newsList(state) {
  if (!state.news.length) return '<p class="tiny muted">暂无新闻。</p>';
  return state.news.slice().reverse().map((n) => `
    <li class="news-item news-${n.type}">
      <span class="log-week">W${n.week}</span>
      <span>${n.text}</span>
    </li>
  `).join('');
}

export function renderMarketPanel(state) {
  const year = getYear(state);
  return `
    <div class="panel-head">
      <h2>市场</h2>
      <span class="tiny muted">第 ${year} 年</span>
    </div>
    <div class="panel-subhead"><h3>平台世代</h3></div>
    <ul class="platform-list">
      ${PLATFORMS.map((p) => platformRow(p, year)).join('')}
    </ul>
    <div class="panel-subhead"><h3>类型热度</h3></div>
    <ul class="heat-list">
      ${GENRES.map((g) => heatRow(state, g)).join('')}
    </ul>
    <div class="panel-subhead"><h3>新闻</h3></div>
    <ul class="news-list">
      ${newsList(state)}
    </ul>
  `;
}
