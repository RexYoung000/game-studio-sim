// 评分与销量（PRD FR-4 / 附录 D）
import { PLATFORMS, getPlatform, installFactor } from '../data/platforms.js';
import { getGenre } from '../data/genres.js';
import { roleById } from '../data/staff.js';
import { clamp, getYear } from '../state.js';
import { nextRandom } from '../rng.js';
import {
  FATIGUE_LOW, FATIGUE_CRITICAL, BASE_UNITS, MARKETING_TIERS, QUALITY_SCALE, STAT_MAX,
} from '../data/balance.js';

export const LINE_KEYS = ['design', 'art', 'sound', 'fun'];

export function fatigueFactor(staff) {
  if (staff.fatigue >= FATIGUE_LOW) return 1;
  if (staff.fatigue >= FATIGUE_CRITICAL) return 0.5;
  return 0;
}

// 世代修正：当前最新可立项平台 +5%，其余 -5%（PRD FR-6）
export function eraFactor(state, platformId) {
  const year = getYear(state);
  const active = PLATFORMS.filter((p) => year >= p.launchYear && year < p.retireYear);
  if (!active.length) return 0.95;
  const latest = active.reduce((a, b) => (b.launchYear > a.launchYear ? b : a));
  return platformId === latest.id ? 1.05 : 0.95;
}

// 每条品质线的贡献者平均能力（按本周产出加权）
export function lineAverages(state, project) {
  const buckets = { design: [], art: [], sound: [], fun: [] };
  for (const staff of state.staff) {
    if (staff.status === 'resting' || staff.skipWeek) continue;
    const role = roleById(staff.role);
    const mainStat = staff.stats[role.stat] || 0;
    buckets[role.mainLine].push({ stat: mainStat, weight: Math.max(0.01, mainStat * fatigueFactor(staff)) });
  }
  const result = {};
  for (const key of LINE_KEYS) {
    const list = buckets[key];
    if (!list.length) {
      result[key] = 0;
      continue;
    }
    const wsum = list.reduce((s, i) => s + i.weight, 0);
    result[key] = list.reduce((s, i) => s + i.stat * i.weight, 0) / wsum;
  }
  return result;
}

// 品质线 = 平均主能力 × 契合度 × 世代修正 + 事件加成，钳制 0-10
export function qualityLines(state, project) {
  const avg = lineAverages(state, project);
  const era = eraFactor(state, project.platform);
  const bonus = project.lineBonus || {};
  const lines = {};
  for (const key of LINE_KEYS) {
    const raw = (avg[key] / STAT_MAX) * QUALITY_SCALE * project.fit * era + (bonus[key] || 0);
    lines[key] = clamp(raw, 0, QUALITY_SCALE);
  }
  return lines;
}

export function computeScore(state, project) {
  const lines = qualityLines(state, project);
  const rounded = {};
  let score = 0;
  for (const key of LINE_KEYS) {
    rounded[key] = Math.round(lines[key]);
    score += rounded[key];
  }
  return { score: clamp(score, 0, 40), lines: rounded, exactLines: lines };
}

export function heatFactor(state, genreId) {
  let heat = state.genreHeat[genreId] || 1.0;
  const boost = state.genreBoost[genreId];
  if (boost && state.week <= boost.untilWeek) heat += boost.amount;
  return clamp(heat, 0.8, 1.45);
}

export function fanFactor(fans) {
  return 1 + Math.log10(1 + fans) / 8;
}

// 销量（万份）。rngFactor 传入固定值可做确定性测试。
export function computeUnits(state, project, score, rngFactor = null) {
  const platform = getPlatform(project.platform);
  if (!platform) return 0.1;
  const pFactor = installFactor(platform, getYear(state));
  const marketing = MARKETING_TIERS[project.marketing || 0].factor;
  const heat = heatFactor(state, project.genre);
  const randomFactor = rngFactor != null ? rngFactor : 0.85 + nextRandom(state) * 0.3;
  const units = Math.pow(score / 10, 2) * BASE_UNITS * pFactor * fanFactor(state.fans) * marketing * heat * randomFactor;
  return Math.max(0.1, units);
}

export function genreName(genreId) {
  const g = getGenre(genreId);
  return g ? g.name : genreId;
}
