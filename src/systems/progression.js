// 成长线与年度结算：粉丝、经验、等级、大奖、终局（PRD FR-7）
import { getYear, addLog, addNews, clamp } from '../state.js';
import { LEVEL_THRESHOLDS, LEVEL_STAFF_CAP, AWARD_CASH, AWARD_FANS, AWARD_EXP, COMPETITOR_SCORE_MIN, COMPETITOR_SCORE_MAX } from '../data/balance.js';
import { randInt } from '../rng.js';

export function addFans(state, delta) {
  state.fans = Math.max(0, Math.round(state.fans + delta));
}

export function levelCap(level) {
  return LEVEL_STAFF_CAP[clamp(level - 1, 0, LEVEL_STAFF_CAP.length - 1)];
}

export function addExp(state, amount) {
  state.exp += amount;
  const levelUps = [];
  while (state.level < 5 && state.exp >= LEVEL_THRESHOLDS[state.level]) {
    state.level += 1;
    levelUps.push(state.level);
    addLog(state, `工作室升到 ${state.level} 级！员工位上限提升到 ${levelCap(state.level)} 人。`, 'levelup');
    addNews(state, `「像素工房」升级为 ${state.level} 级工作室。`, 'studio');
  }
  return levelUps;
}

// 年末结算：年度大奖 + 年度小结
export function settleYear(state) {
  const year = getYear(state);
  const yearStartWeek = (year - 1) * 52 + 1;
  const games = state.released.filter(
    (g) => g.releasedWeek >= yearStartWeek && g.releasedWeek < yearStartWeek + 52,
  );
  const best = games.length ? games.reduce((a, b) => (b.score > a.score ? b : a)) : null;

  // 竞品水平随年份水涨船高（每年 +1 分），后期拿奖更难
  const compMin = COMPETITOR_SCORE_MIN + (year - 1);
  const compMax = Math.min(40, COMPETITOR_SCORE_MAX + (year - 1));
  const competitorScores = [randInt(state, compMin, compMax), randInt(state, compMin, compMax)];
  const competitorBest = Math.max(...competitorScores);
  state.competitorBest = competitorBest;

  const won = !!best && best.score > competitorBest;
  if (won) {
    state.cash += AWARD_CASH;
    addFans(state, AWARD_FANS);
    addExp(state, AWARD_EXP);
    best.awarded = true;
    addLog(state, `《${best.title}》拿下第 ${year} 年度最佳游戏！+${AWARD_CASH} 万、+${AWARD_FANS} 粉丝。`, 'award');
    addNews(state, `年度大奖揭晓：《${best.title}》击败竞品，拿下年度最佳游戏。`, 'award');
  } else if (best) {
    addLog(state, `年度大奖被竞品拿走（竞品最高 ${competitorBest} 分，我方最佳《${best.title}》${best.score} 分）。`, 'award');
    addNews(state, `年度大奖揭晓：竞品以 ${competitorBest} 分获奖，我方最高 ${best.score} 分。`, 'award');
  } else {
    addLog(state, `第 ${year} 年没有发行作品，年度大奖旁落（竞品 ${competitorBest} 分）。`, 'award');
    addNews(state, `年度大奖揭晓：竞品以 ${competitorBest} 分获奖。`, 'award');
  }

  const summary = {
    year,
    revenue: state.yearlyFinance ? state.yearlyFinance.revenue : 0,
    cashDelta: state.yearStartCash != null ? Math.round(state.cash - state.yearStartCash) : 0,
    games: games.length,
    bestScore: best ? best.score : 0,
    competitorBest,
    won,
  };
  state.awards.push({ year, gameId: best ? best.id : null, playerScore: best ? best.score : 0, competitorBest, won });
  state.lastYearSummary = summary;
  return summary;
}

export function checkEnd(state) {
  if (state.ended) return state.endReason;
  if (state.week > 520) {
    state.ended = true;
    state.endReason = 'finished';
    return 'finished';
  }
  if (state.cash < 0) {
    state.ended = true;
    state.endReason = 'bankrupt';
    return 'bankrupt';
  }
  return '';
}

export function finalSummary(state) {
  const totalUnits = state.released.reduce((s, g) => s + g.units, 0);
  const best = state.released.reduce((a, b) => (!a || b.score > a.score ? b : a), null);
  const wins = state.awards.filter((a) => a.won).length;
  let grade = 'D';
  if (wins >= 5 || state.cash > 20000) grade = 'S';
  else if (wins >= 2 || state.cash > 5000) grade = 'A';
  else if (wins >= 1 || state.cash > 1000) grade = 'B';
  else if (state.cash > 300) grade = 'C';
  return {
    grade,
    cash: Math.round(state.cash),
    fans: state.fans,
    released: state.released.length,
    totalUnits: Math.round(totalUnits),
    bestGame: best ? { title: best.title, score: best.score } : null,
    awards: wins,
    bankrupt: state.endReason === 'bankrupt',
  };
}
