// 市场：平台世代、类型热度、年度新闻（PRD FR-6）
import { PLATFORMS, platformState } from '../data/platforms.js';
import { GENRES, getGenre } from '../data/genres.js';
import { addNews, clamp, getYear } from '../state.js';
import { nextRandom, randInt, pickRandom } from '../rng.js';
import { COMPETITOR_SCORE_MIN, COMPETITOR_SCORE_MAX } from '../data/balance.js';

// 可立项平台（已上市且未退市）
export function availablePlatforms(state) {
  const year = getYear(state);
  return PLATFORMS.filter((p) => {
    const st = platformState(p, year);
    return st.unlocked;
  });
}

// 最新一代平台（世代修正用）
export function latestPlatform(state) {
  const active = availablePlatforms(state);
  if (!active.length) return null;
  return active.reduce((a, b) => (b.launchYear > a.launchYear ? b : a));
}

export function refreshHeat(state) {
  for (const g of GENRES) {
    const cur = state.genreHeat[g.id] || 1.0;
    state.genreHeat[g.id] = clamp(cur + (nextRandom(state) * 0.3 - 0.15), 0.8, 1.3);
  }
}

const COMPETITOR_TITLES = ['星海远征', '街头狂飙', '迷城侦探', '像素农场', '深渊回响', '校园物语', '极速纪元'];

// 年初事件：热度刷新 + 平台上市/退市预告 + 竞品动态
export function yearStart(state) {
  const year = getYear(state);
  state.yearStartCash = state.cash;
  state.yearlyFinance = { revenue: 0 };
  refreshHeat(state);

  for (const p of PLATFORMS) {
    if (p.launchYear === year) {
      addNews(state, `${p.name} 正式上市！主打类型热度上升。`, 'platform');
      state.genreBoost[p.mainGenre] = { amount: 0.15, untilWeek: state.week + 8 };
    }
    if (p.retireYear === year + 1) {
      addNews(state, `${p.name} 宣布将于明年退市，抓紧最后机会。`, 'platform');
    }
  }

  const releases = randInt(state, 2, 3);
  for (let i = 0; i < releases; i += 1) {
    const genre = pickRandom(state, GENRES);
    const score = randInt(state, COMPETITOR_SCORE_MIN, COMPETITOR_SCORE_MAX);
    const title = COMPETITOR_TITLES[Math.floor(nextRandom(state) * COMPETITOR_TITLES.length)];
    addNews(state, `竞品《${title}》（${genre.name}）发售，媒体评分 ${score}/40。`, 'competitor');
  }
}

export function hottestGenre(state) {
  let best = GENRES[0];
  for (const g of GENRES) {
    if ((state.genreHeat[g.id] || 1) > (state.genreHeat[best.id] || 1)) best = g;
  }
  return { genre: best, heat: state.genreHeat[best.id] };
}

export function genreHeatLabel(heat) {
  if (heat >= 1.15) return '火热';
  if (heat <= 0.9) return '冷清';
  return '平稳';
}

export function genreNameOf(id) {
  const g = getGenre(id);
  return g ? g.name : id;
}
