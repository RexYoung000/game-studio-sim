// 存档结构与读写（tech-spec §3.1）
import { SAVE_KEY, SAVE_VERSION, START_CASH, START_LEVEL, START_FANS, WEEKS_PER_YEAR, TOTAL_WEEKS } from './data/balance.js';
import { STARTER_STAFF, roleById } from './data/staff.js';
import { GENRES } from './data/genres.js';

export function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

export function getYear(state) {
  return Math.floor((state.week - 1) / WEEKS_PER_YEAR) + 1;
}

export function getWeekOfYear(state) {
  return ((state.week - 1) % WEEKS_PER_YEAR) + 1;
}

export function maxWeeks() {
  return TOTAL_WEEKS;
}

export function createNewState(seed = Date.now() % 1000000) {
  const genreHeat = {};
  for (const g of GENRES) genreHeat[g.id] = 1.0;

  return {
    version: SAVE_VERSION,
    seed,
    rngState: seed,
    week: 1,
    cash: START_CASH,
    fans: START_FANS,
    level: START_LEVEL,
    exp: 0,
    reputation: 0,
    staff: STARTER_STAFF.map((s, i) => ({
      id: `s${i + 1}`,
      name: s.name,
      role: s.role,
      stats: { ...s.stats },
      fatigue: 100,
      salary: s.salary,
      status: 'idle',
      level: 1,
      exp: 0,
      hiredWeek: 1,
      roleName: roleById(s.role).name,
    })),
    project: null,
    released: [],
    genreHeat,
    genreBoost: {},
    news: [{
      week: 1,
      type: 'info',
      text: '像素工房成立。账上 100 万，两个人，一台旧电脑。',
    }],
    log: [{
      week: 1,
      kind: 'info',
      text: '工作室开张。先做个项目吧——立项按钮在中间面板。',
    }],
    awards: [],
    candidates: [],
    pendingEvent: null,
    competitorBest: 0,
    stats: { releasedCount: 0, bestScore: 0, totalRevenue: 0 },
    ended: false,
    endReason: '',
    lastWeek: null,
  };
}

export function addLog(state, text, kind = 'dev') {
  state.log.push({ week: state.week, text, kind });
  if (state.log.length > 60) state.log.splice(0, state.log.length - 60);
}

export function addNews(state, text, type = 'info') {
  state.news.push({ week: state.week, type, text });
  if (state.news.length > 12) state.news.splice(0, state.news.length - 12);
}

function storageAvailable() {
  try {
    return typeof localStorage !== 'undefined';
  } catch {
    return false;
  }
}

export function saveState(state) {
  if (!storageAvailable()) return false;
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function loadState() {
  if (!storageAvailable()) return { ok: false, reason: 'no-storage', state: null };
  let raw;
  try {
    raw = localStorage.getItem(SAVE_KEY);
  } catch {
    return { ok: false, reason: 'no-storage', state: null };
  }
  if (!raw) return { ok: false, reason: 'empty', state: null };
  try {
    const data = JSON.parse(raw);
    if (!data || data.version !== SAVE_VERSION) {
      localStorage.setItem(`${SAVE_KEY}_corrupt`, raw);
      return { ok: false, reason: 'version', state: null };
    }
    return { ok: true, state: data };
  } catch {
    try { localStorage.setItem(`${SAVE_KEY}_corrupt`, raw); } catch { /* 忽略 */ }
    return { ok: false, reason: 'corrupt', state: null };
  }
}

export function resetSave() {
  if (!storageAvailable()) return;
  try { localStorage.removeItem(SAVE_KEY); } catch { /* 忽略 */ }
}
