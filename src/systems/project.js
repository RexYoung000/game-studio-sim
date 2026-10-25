// 立项 / 开发推进 / 事件结算 / 发行（PRD FR-2、FR-3、FR-4）
import { getPlatform, platformState } from '../data/platforms.js';
import { getGenre, getTheme, fitOf } from '../data/genres.js';
import { EVENTS, eventById } from '../data/events.js';
import { roleById } from '../data/staff.js';
import { computeScore, computeUnits, fatigueFactor, LINE_KEYS } from './sales.js';
import { randomWorkingStaff } from './staff.js';
import { addFans, addExp } from './progression.js';
import { addLog, addNews, clamp, getYear } from '../state.js';
import { chance, weightedPick, nextRandom } from '../rng.js';
import {
  EVENT_CHANCE, DP_PER_STAT, PLAN_FEE_RATE, PRICE_PER_UNIT, REVENUE_SPLIT,
  MARKETING_TIERS, FANS_PER_UNIT, COORDINATION_PENALTY, DP_YEAR_SCALE,
} from '../data/balance.js';

export function planningFee(platform) {
  return Math.round(platform.fee * PLAN_FEE_RATE);
}

// DP 需求随年份增长（PRD 附录 D 校准值）
export function projectDpNeed(genre, platform, year = 1) {
  return Math.round(genre.baseDp * platform.costFactor * (1 + DP_YEAR_SCALE * (year - 1)));
}

// 团队规模惩罚：人越多协调成本越高（最低 0.6）
export function coordinationFactor(staffCount) {
  return Math.max(0.6, 1 - COORDINATION_PENALTY * (staffCount - 1));
}

export function weeklyDp(state) {
  const active = state.staff.filter((s) => s.status !== 'resting');
  let raw = 0;
  for (const staff of active) {
    const role = roleById(staff.role);
    raw += (staff.stats[role.stat] || 0) * DP_PER_STAT * fatigueFactor(staff);
  }
  return raw * coordinationFactor(active.length);
}

export function estimateWeeks(state) {
  if (!state.project) return 0;
  const dp = Math.max(1, weeklyDp(state));
  return Math.max(1, Math.ceil((state.project.dpNeed - state.project.dp) / dp));
}

export function startProject(state, { platform: platformId, genre: genreId, theme: themeId }) {
  if (state.project) return { ok: false, error: '已有在研项目，先把手上的做完' };
  const platform = getPlatform(platformId);
  const genre = getGenre(genreId);
  const theme = getTheme(themeId);
  if (!platform || !genre || !theme) return { ok: false, error: '立项参数不完整' };
  if (getYear(state) < platform.launchYear) return { ok: false, error: '该平台还没上市' };
  if (platformState(platform, getYear(state)).retired) return { ok: false, error: '该平台已退市，不能立项' };
  const fee = planningFee(platform);
  if (state.cash < fee) return { ok: false, error: `现金不足，企划费需要 ${fee} 万` };

  state.cash -= fee;
  const dpNeed = projectDpNeed(genre, platform, getYear(state));
  state.project = {
    id: `g${state.released.length + 1}`,
    platform: platform.id,
    genre: genre.id,
    theme: theme.id,
    fit: fitOf(genre.id, theme.id),
    dp: 0,
    dpNeed,
    lines: { design: 0, art: 0, sound: 0, fun: 0 },
    lineBonus: { design: 0, art: 0, sound: 0, fun: 0 },
    status: 'developing',
    marketing: 0,
    startedWeek: state.week,
    eventCooldown: 0,
    title: `${theme.name}${genre.name}`,
  };
  addLog(state, `立项：${theme.name}×${genre.name}（${platform.name}），企划费 ${fee} 万，需要 ${dpNeed} DP。相性「${fitText(state.project.fit)}」。`, 'project');
  return { ok: true, project: state.project };
}

function fitText(fit) {
  if (fit >= 1.5) return '天作之合';
  if (fit >= 1.2) return '契合良好';
  if (fit >= 1.0) return '中规中矩';
  if (fit >= 0.8) return '略显勉强';
  return '强行拼凑';
}

// 单周开发推进
export function tickProject(state) {
  const project = state.project;
  if (!project) return { dpGain: 0, done: false };

  let dpGain = 0;
  const activeCount = state.staff.filter((s) => s.status !== 'resting').length;
  const coord = coordinationFactor(activeCount);
  for (const staff of state.staff) {
    if (staff.status === 'resting' || staff.skipWeek) continue;
    const role = roleById(staff.role);
    const mainStat = staff.stats[role.stat] || 0;
    const gain = mainStat * DP_PER_STAT * fatigueFactor(staff) * coord;
    if (gain <= 0) continue;
    dpGain += gain;
    project.lines[role.mainLine] += gain;
  }

  project.dp = clamp(project.dp + dpGain, 0, project.dpNeed);
  const done = project.dp >= project.dpNeed;
  if (done) {
    project.status = 'releasing';
    addLog(state, `《${project.title}》开发完成，可以发行了。`, 'project');
  } else {
    addLog(state, `开发推进 +${Math.round(dpGain)} DP（${Math.round((project.dp / project.dpNeed) * 100)}%）。`, 'dev');
  }
  return { dpGain, done };
}

// 开发期随机事件：每周 8%（PRD 附录 C）
export function rollEvent(state) {
  if (!state.project || state.pendingEvent) return null;
  if (!chance(state, EVENT_CHANCE)) return null;
  const year = getYear(state);
  const pool = EVENTS;
  const picked = weightedPick(state, pool, (e) => (year >= 5 && e.lateWeight ? e.lateWeight : e.weight));
  state.pendingEvent = {
    id: `ev${state.week}`,
    eventId: picked.id,
    title: picked.title,
    text: picked.text,
    options: picked.options.map((o) => o.label),
    defaultOption: picked.defaultOption != null ? picked.defaultOption : 0,
  };
  return state.pendingEvent;
}

export function resolveEvent(state, optionIndex) {
  const pending = state.pendingEvent;
  if (!pending) return { ok: false, error: '没有待处理事件' };
  const event = eventById(pending.eventId);
  if (!event) {
    state.pendingEvent = null;
    return { ok: false, error: '事件数据缺失' };
  }
  const index = optionIndex != null ? optionIndex : event.defaultOption;
  const option = event.options[Math.min(index, event.options.length - 1)];
  applyEffects(state, event, option);
  addLog(state, `事件「${event.title}」→ ${option.label}`, 'event');
  state.pendingEvent = null;
  return { ok: true };
}

function applyEffects(state, event, option) {
  const project = state.project;
  const effects = option.effects || {};
  if (typeof effects.cash === 'number') {
    state.cash += effects.cash;
  }
  if (typeof effects.fans === 'number') {
    addFans(state, effects.fans);
  }
  if (project && typeof effects.dpPct === 'number') {
    project.dp = clamp(project.dp + project.dpNeed * effects.dpPct, 0, project.dpNeed);
  }
  if (typeof effects.fatigueAll === 'number') {
    for (const staff of state.staff) {
      staff.fatigue = clamp(staff.fatigue + effects.fatigueAll, 0, 100);
    }
  }
  const target = randomWorkingStaff(state);
  if (target && typeof effects.fatigueOne === 'number') {
    target.fatigue = clamp(target.fatigue + effects.fatigueOne, 0, 100);
  }
  if (target && effects.skipStaffWeek) {
    target.skipWeek = true;
    addLog(state, `${target.name} 这周状态不佳，产出为 0。`, 'warn');
  }
  if (project && effects.qualityMax) {
    const bestLine = LINE_KEYS.reduce((a, b) => (project.lines[b] > project.lines[a] ? b : a), LINE_KEYS[0]);
    project.lineBonus[bestLine] += effects.qualityMax;
    addLog(state, `「${lineLabel(bestLine)}」品质 +${effects.qualityMax}。`, 'dev');
  }
  if (project && effects.qualityMin) {
    const worstLine = LINE_KEYS.reduce((a, b) => (project.lines[b] < project.lines[a] ? b : a), LINE_KEYS[0]);
    project.lineBonus[worstLine] += effects.qualityMin;
    addLog(state, `「${lineLabel(worstLine)}」品质 +${effects.qualityMin}。`, 'dev');
  }
  if (project && effects.qualityRandom) {
    const key = LINE_KEYS[Math.floor(nextRandom(state) * LINE_KEYS.length)];
    project.lineBonus[key] += effects.qualityRandom;
    addLog(state, `「${lineLabel(key)}」品质 ${effects.qualityRandom > 0 ? '+' : ''}${effects.qualityRandom}。`, 'dev');
  }
  if (target && typeof effects.salaryPct === 'number') {
    target.salary = Math.max(1, Math.round(target.salary * (1 + effects.salaryPct)));
    addLog(state, `${target.name} 薪水涨到 ${target.salary} 万/月。`, 'staff');
  }
  if (target && effects.quitStaff) {
    state.staff = state.staff.filter((s) => s.id !== target.id);
    addLog(state, `${target.name} 被挖走了，团队少了一个人。`, 'warn');
  }
}

function lineLabel(key) {
  return { design: '创意', art: '画面', sound: '音效', fun: '耐玩' }[key] || key;
}

// 发行：评分 → 销量 → 6 周长尾入账
export function releaseGame(state, marketingTier) {
  const project = state.project;
  if (!project) return { ok: false, error: '没有可发行的项目' };
  if (project.dp < project.dpNeed) return { ok: false, error: '开发还没完成' };
  const tier = clamp(marketingTier || 0, 0, MARKETING_TIERS.length - 1);
  const cost = MARKETING_TIERS[tier].cost;
  if (state.cash < cost) return { ok: false, error: `现金不足，营销需要 ${cost} 万` };

  state.cash -= cost;
  project.marketing = tier;
  const { score, lines } = computeScore(state, project);
  const units = computeUnits(state, project, score);
  const revenue = units * PRICE_PER_UNIT;
  const revenueByWeek = REVENUE_SPLIT.map((r) => revenue * r);

  const game = {
    id: project.id,
    title: project.title,
    platform: project.platform,
    genre: project.genre,
    theme: project.theme,
    fit: project.fit,
    score,
    lines,
    units,
    revenue,
    revenueByWeek,
    revenueSettled: 0,
    marketing: tier,
    releasedWeek: state.week,
    awarded: false,
  };
  state.released.push(game);
  state.stats.releasedCount += 1;
  state.stats.bestScore = Math.max(state.stats.bestScore, score);
  state.stats.totalRevenue += revenue;

  const fanGain = Math.round(units * FANS_PER_UNIT + Math.sqrt(units) * 100);
  if (score >= 32) {
    addFans(state, fanGain + 1500);
    addNews(state, `《${game.title}》口碑爆棚，评分 ${score}/40。`, 'release');
  } else if (score <= 15) {
    addFans(state, -Math.round(state.fans * 0.15));
    addNews(state, `《${game.title}》评价惨淡，评分 ${score}/40。`, 'release');
  } else {
    addFans(state, fanGain);
    addNews(state, `《${game.title}》发售，评分 ${score}/40，首批 ${units.toFixed(1)} 万份。`, 'release');
  }
  addExp(state, score + Math.round(units / 10));

  addLog(state, `《${game.title}》发行：评分 ${score}/40，销量 ${units.toFixed(1)} 万份，预计收入 ${revenue.toFixed(0)} 万（6 周入账）。`, 'release');
  state.project = null;
  return { ok: true, game };
}
