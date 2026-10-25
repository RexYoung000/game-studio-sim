// 时间推进：完整周结算链（PRD FR-1）
import { getWeekOfYear, addLog, addNews } from '../state.js';
import { tickFatigue, enforceRest, paySalaries, refreshCandidates } from './staff.js';
import { tickProject, rollEvent } from './project.js';
import { yearStart } from './market.js';
import { settleYear, checkEnd } from './progression.js';
import { SALARY_INTERVAL, TOTAL_WEEKS } from '../data/balance.js';

export function advanceWeek(state) {
  if (state.ended) return { ok: false, error: '本局已结束' };
  if (state.pendingEvent) return { ok: false, error: '先处理完手上这个事件' };

  state.week += 1;
  const weekOfYear = getWeekOfYear(state);
  const changes = [];

  // 1. 体力
  tickFatigue(state);
  enforceRest(state);

  // 2. 年初事件 / 年度市场
  if (weekOfYear === 1) {
    yearStart(state);
    changes.push('年初事件');
  }

  // 3. 项目开发推进
  if (state.project) {
    const { dpGain } = tickProject(state);
    if (dpGain > 0) changes.push('开发推进');
  }

  // 4. 开发期随机事件
  if (state.project) {
    const ev = rollEvent(state);
    if (ev) changes.push('随机事件');
  }

  // 5. 长尾收入
  let income = 0;
  for (const game of state.released) {
    if (game.revenueSettled < game.revenueByWeek.length) {
      const amount = game.revenueByWeek[game.revenueSettled];
      state.cash += amount;
      income += amount;
      game.revenueSettled += 1;
    }
  }
  if (income > 0) {
    state.yearlyFinance.revenue += income;
    addLog(state, `本周游戏收入 +${income.toFixed(1)} 万。`, 'money');
    changes.push('收入入账');
  }

  // 6. 薪水
  if (state.week % SALARY_INTERVAL === 0) {
    paySalaries(state);
    changes.push('发薪');
  }

  // 7. 年末结算
  if (weekOfYear === 52) {
    settleYear(state);
    changes.push('年度结算');
  }

  // 8. 招聘市场刷新
  refreshCandidates(state);

  // 9. 终局 / 破产判定
  const end = checkEnd(state);
  if (end) changes.push(end);

  if (state.week > TOTAL_WEEKS) {
    addNews(state, '十年经营结束，工作室进入总决算。', 'studio');
  }

  return { ok: true, changes, ended: state.ended, endReason: state.endReason };
}

// 新档初始化：首年年初事件 + 招聘市场
export function bootstrap(state) {
  yearStart(state);
  refreshCandidates(state);
}
