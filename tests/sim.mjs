// 自动模拟一局：node tests/sim.mjs <seed> [seed2 ...]
// 用简单策略跑满 10 年，输出每年关键指标，用于数值校准（tech-spec V9）
import { createNewState, getYear, getWeekOfYear } from '../src/state.js';
import { bootstrap, advanceWeek } from '../src/systems/clock.js';
import { startProject, releaseGame, resolveEvent } from '../src/systems/project.js';
import { availablePlatforms } from '../src/systems/market.js';
import { staffCap, hireStaff } from '../src/systems/staff.js';
import { installFactor } from '../src/data/platforms.js';
import { GENRES, FIT_MATRIX } from '../src/data/genres.js';

function bestChoice(state) {
  const year = getYear(state);
  const platforms = availablePlatforms(state);
  const platform = platforms.reduce((a, b) => (installFactor(b, year) > installFactor(a, year) ? b : a));
  const genre = GENRES.reduce((a, b) => ((state.genreHeat[b.id] || 1) > (state.genreHeat[a.id] || 1) ? b : a));
  const themes = Object.keys(FIT_MATRIX[genre.id]);
  const theme = themes.reduce((a, b) => (FIT_MATRIX[genre.id][b] > FIT_MATRIX[genre.id][a] ? b : a));
  return { platform: platform.id, genre: genre.id, theme };
}

function playSeed(seed) {
  const state = createNewState(seed);
  bootstrap(state);
  const yearly = [];
  let guard = 0;

  while (!state.ended && state.week <= 520 && guard < 2000) {
    guard += 1;

    if (state.pendingEvent) {
      resolveEvent(state, 0);
      continue;
    }

    // 招聘：现金宽裕且有位置就补人
    if (state.staff.length < staffCap(state) && state.cash > 160 && state.candidates.length) {
      const best = state.candidates.reduce((a, b) => {
        const av = a.stats[a.role === 'programmer' ? 'code' : a.role === 'artist' ? 'art' : a.role === 'sound' ? 'sound' : 'design'];
        const bv = b.stats[b.role === 'programmer' ? 'code' : b.role === 'artist' ? 'art' : b.role === 'sound' ? 'sound' : 'design'];
        return bv > av ? b : a;
      });
      if (state.cash > best.signing + 80) hireStaff(state, best.id);
    }

    if (!state.project && state.cash > 25) {
      const choice = bestChoice(state);
      startProject(state, choice);
    }

    if (state.project && state.project.status === 'releasing') {
      const tier = state.cash > 120 ? 2 : state.cash > 40 ? 1 : 0;
      releaseGame(state, tier);
    }

    const before = getYear(state);
    advanceWeek(state);
    if (getWeekOfYear(state) === 52 || state.ended) {
      yearly.push({
        year: before,
        cash: Math.round(state.cash),
        fans: state.fans,
        level: state.level,
        released: state.released.length,
        best: state.stats.bestScore,
        awards: state.awards.filter((a) => a.won).length,
      });
    }
  }

  return { seed, ended: state.ended, reason: state.endReason, cash: Math.round(state.cash), yearly, state };
}

const seeds = process.argv.slice(2).map(Number).filter((n) => !Number.isNaN(n));
const list = seeds.length ? seeds : [1, 2, 3];

for (const seed of list) {
  const r = playSeed(seed);
  console.log(`\n=== 种子 ${r.seed} ===`);
  console.log('年份  现金    粉丝   等级  作品  最佳评分  大奖');
  for (const y of r.yearly) {
    console.log(
      `${String(y.year).padStart(3)}  ${String(y.cash).padStart(5)}  ${String(y.fans).padStart(6)}  ${String(y.level).padStart(3)}  ${String(y.released).padStart(4)}  ${String(y.best).padStart(7)}  ${String(y.awards).padStart(3)}`,
    );
  }
  console.log(`结局：${r.reason || '未结束'} · 最终现金 ${r.cash} 万 · 发行 ${r.state.released.length} 部`);
}
