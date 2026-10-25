// 弹层：立项 / 培训 / 事件 / 发行 / 年度小结 / 终局 / 重开确认
import { availablePlatforms } from '../systems/market.js';
import { GENRES, THEMES, fitOf, fitLabel, getGenre, getTheme } from '../data/genres.js';
import { planningFee, projectDpNeed, weeklyDp } from '../systems/project.js';
import { MARKETING_TIERS, TRAIN_FEE_PER_POINT, STAT_MAX, TOTAL_YEARS } from '../data/balance.js';
import { STAT_LABELS } from '../data/staff.js';
import { finalSummary } from '../systems/progression.js';
import { getYear } from '../state.js';
import { platformState, PHASE_LABEL } from '../data/platforms.js';

let current = null;

export function openModal(modal) { current = modal; }
export function closeModal() { current = null; }
export function getModal() { return current; }

function wrap(title, body, extraClass = '') {
  return `
    <div class="modal-backdrop">
      <div class="modal ${extraClass}">
        <div class="modal-head"><h2>${title}</h2></div>
        <div class="modal-body">${body}</div>
      </div>
    </div>
  `;
}

function eventModal(state) {
  const ev = state.pendingEvent;
  const options = ev.options.map((label, i) => `
    <button class="btn ${i === 0 ? 'primary' : ''}" data-action="event-option" data-index="${i}">${label}</button>
  `).join('');
  return wrap('突发事件：' + ev.title, `
    <p>${ev.text}</p>
    <div class="modal-actions column">${options}</div>
  `, 'event-modal');
}

function projectModal(state) {
  const year = getYear(state);
  const platforms = availablePlatforms(state);
  const pOpts = platforms.map((p) => {
    const phase = platformState(p, year).phase;
    return `<option value="${p.id}">${p.name}（授权 ${p.fee} 万 · 成本 ×${p.costFactor}）· ${PHASE_LABEL[phase]}</option>`;
  }).join('');
  const gOpts = GENRES.map((g) => `<option value="${g.id}">${g.name}</option>`).join('');
  const tOpts = THEMES.map((t) => `<option value="${t.id}">${t.name}</option>`).join('');
  return wrap('立项：选平台、类型、主题', `
    <div class="form-row"><label>平台</label><select id="p-platform">${pOpts}</select></div>
    <div class="form-row"><label>类型</label><select id="p-genre">${gOpts}</select></div>
    <div class="form-row"><label>主题</label><select id="p-theme">${tOpts}</select></div>
    <div id="p-estimate" class="estimate"></div>
    <div class="modal-actions">
      <button class="btn ghost" data-action="close-modal">取消</button>
      <button class="btn primary" data-action="confirm-project">确认立项</button>
    </div>
  `);
}

// 立项弹层实时预估（main.js 绑定 change 事件后调用）
export function updateProjectEstimate(state) {
  const platformEl = document.getElementById('p-platform');
  const genreEl = document.getElementById('p-genre');
  const themeEl = document.getElementById('p-theme');
  const box = document.getElementById('p-estimate');
  if (!platformEl || !genreEl || !themeEl || !box) return;
  const platform = availablePlatforms(state).find((p) => p.id === platformEl.value);
  const genre = getGenre(genreEl.value);
  const theme = getTheme(themeEl.value);
  if (!platform || !genre || !theme) return;
  const year = getYear(state);
  const fee = planningFee(platform);
  const dpNeed = projectDpNeed(genre, platform, year);
  const dp = Math.max(1, weeklyDp(state));
  const weeks = Math.max(1, Math.ceil(dpNeed / dp));
  const fit = fitOf(genre.id, theme.id);
  // 只警告本局（10 年）内真的会退市的平台；retireYear=99 是「长期活跃」的哨兵值
  const retiringSoon = platformState(platform, year).phase === 'declining'
    && platform.retireYear <= TOTAL_YEARS;
  const retireWarn = retiringSoon
    ? `<div class="retire-warning">该平台将于第 ${platform.retireYear} 年退市（当前第 ${year} 年）</div>`
    : '';
  box.innerHTML = `
    <div class="estimate-line">企划费 <b>${fee}</b> 万 · 需求 <b>${dpNeed}</b> DP · 约 <b>${weeks}</b> 周</div>
    <div class="estimate-line">相性：<b class="fit-${fitClass(fit)}">${fitLabel(fit)} ×${fit}</b>（${theme.name} × ${genre.name}）</div>
    ${retireWarn}
  `;
}

function fitClass(fit) {
  if (fit >= 1.5) return 'best';
  if (fit >= 1.2) return 'good';
  if (fit >= 1.0) return 'normal';
  return 'bad';
}

function trainModal(state, staff) {
  const rows = Object.keys(STAT_LABELS).map((key) => {
    const value = staff.stats[key] || 0;
    const cost = value * TRAIN_FEE_PER_POINT;
    const maxed = value >= STAT_MAX;
    return `
      <div class="train-row">
        <span>${STAT_LABELS[key]} <b>${value}</b>/${STAT_MAX}</span>
        <span class="tiny muted">${maxed ? '已满' : `花费 ${cost} 万`}</span>
        <button class="btn tiny" data-action="train-stat" data-id="${staff.id}" data-stat="${key}"
          ${maxed || state.cash < cost ? 'disabled' : ''}>+1</button>
      </div>
    `;
  }).join('');
  return wrap(`培训：${staff.name}`, `
    <div class="train-list">${rows}</div>
    <div class="modal-actions"><button class="btn ghost" data-action="close-modal">关闭</button></div>
  `);
}

function releaseModal(state) {
  const tiers = MARKETING_TIERS.map((t) => `
    <label class="tier-row">
      <input type="radio" name="tier" value="${t.tier}" ${t.tier === 0 ? 'checked' : ''} ${state.cash < t.cost ? 'disabled' : ''}>
      <span>${t.label}</span>
      <span class="tiny muted">${t.cost > 0 ? `花费 ${t.cost} 万` : '不花钱'} · 销量 ×${t.factor}</span>
    </label>
  `).join('');
  return wrap('发行准备：营销预算', `
    <p class="tiny muted">评分将在发行后揭晓。营销只影响销量，不影响评分。</p>
    <div class="tier-list">${tiers}</div>
    <div class="modal-actions">
      <button class="btn ghost" data-action="close-modal">再等等</button>
      <button class="btn primary" data-action="confirm-release">确认发行</button>
    </div>
  `);
}

function yearModal(state) {
  const s = state.lastYearSummary;
  if (!s) return '';
  return wrap(`第 ${s.year} 年 · 年度小结`, `
    <div class="summary-grid">
      <div><span class="tiny muted">本年发行</span><b>${s.games} 部</b></div>
      <div><span class="tiny muted">本年收入</span><b>${Math.round(s.revenue)} 万</b></div>
      <div><span class="tiny muted">现金变化</span><b class="${s.cashDelta < 0 ? 'neg' : ''}">${s.cashDelta > 0 ? '+' : ''}${s.cashDelta} 万</b></div>
      <div><span class="tiny muted">最佳评分</span><b>${s.bestScore}/40</b></div>
    </div>
    <p class="${s.won ? 'award-win' : 'muted'}">${s.won ? '年度最佳游戏是我们的！' : `年度大奖被竞品拿下（竞品最高 ${s.competitorBest} 分）。`}</p>
    <div class="modal-actions"><button class="btn primary" data-action="close-modal">继续</button></div>
  `);
}

function endModal(state) {
  const s = finalSummary(state);
  const title = s.bankrupt ? '破产结算' : '十年总决算';
  return wrap(title, `
    <div class="grade grade-${s.grade}">${s.grade}</div>
    <div class="summary-grid">
      <div><span class="tiny muted">最终现金</span><b>${s.cash} 万</b></div>
      <div><span class="tiny muted">粉丝</span><b>${s.fans.toLocaleString()}</b></div>
      <div><span class="tiny muted">发行作品</span><b>${s.released} 部</b></div>
      <div><span class="tiny muted">总销量</span><b>${s.totalUnits} 万份</b></div>
    </div>
    <p>${s.bestGame ? `最佳作品：《${s.bestGame.title}》${s.bestGame.score}/40` : '没有拿得出手的作品。'}</p>
    <p class="tiny muted">获得年度大奖 ${s.awards} 次</p>
    <div class="modal-actions">
      <button class="btn primary" data-action="restart">再来一局</button>
    </div>
  `);
}

function restartModal() {
  return wrap('重开一局？', `
    <p>当前存档会被清空。真要重开吗？</p>
    <div class="modal-actions">
      <button class="btn ghost" data-action="close-modal">算了</button>
      <button class="btn danger" data-action="confirm-restart">确认重开</button>
    </div>
  `);
}

export function renderModal(state) {
  if (state.pendingEvent) return eventModal(state);
  if (!current) return '';
  switch (current.type) {
    case 'project': return projectModal(state);
    case 'train': {
      const staff = state.staff.find((s) => s.id === current.staffId);
      return staff ? trainModal(state, staff) : '';
    }
    case 'release': return releaseModal(state);
    case 'year': return yearModal(state);
    case 'end': return endModal(state);
    case 'restart': return restartModal();
    default: return '';
  }
}
