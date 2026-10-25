// 纯函数与结算测试：node tests/run.mjs
import assert from 'node:assert/strict';
import { createNewState, getYear, getWeekOfYear } from '../src/state.js';
import { computeScore, computeUnits } from '../src/systems/sales.js';
import { startProject, tickProject, resolveEvent, releaseGame } from '../src/systems/project.js';
import { advanceWeek, bootstrap } from '../src/systems/clock.js';
import { getPlatform, platformState } from '../src/data/platforms.js';
import { fitOf } from '../src/data/genres.js';

let passed = 0;
const failures = [];

function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`  ok  ${name}`);
  } catch (err) {
    failures.push({ name, err });
    console.log(`FAIL  ${name}\n      ${err.message}`);
  }
}

console.log('\n[1] 新档基础数值');

test('起始现金 100 万、2 名员工、等级 1', () => {
  const s = createNewState(42);
  assert.equal(s.cash, 100);
  assert.equal(s.staff.length, 2);
  assert.equal(s.level, 1);
  assert.equal(s.week, 1);
  assert.equal(getYear(s), 1);
  assert.equal(getWeekOfYear(s), 1);
});

console.log('\n[2] 评分公式');

test('两条 6 能力线 + 天作之合，首年评分 = 18', () => {
  const s = createNewState(42);
  const r = startProject(s, { platform: 'fc800', genre: 'rpg', theme: 'fantasy' });
  assert.equal(r.ok, true);
  const { score, lines } = computeScore(s, s.project);
  assert.equal(lines.fun, 9);
  assert.equal(lines.art, 9);
  assert.equal(lines.design, 0);
  assert.equal(lines.sound, 0);
  assert.equal(score, 18);
});

test('契合度 0.6 会压低评分', () => {
  const bad = createNewState(42);
  startProject(bad, { platform: 'fc800', genre: 'rpg', theme: 'sports' });
  const badScore = computeScore(bad, bad.project).score;
  const good = createNewState(42);
  startProject(good, { platform: 'fc800', genre: 'rpg', theme: 'fantasy' });
  const goodScore = computeScore(good, good.project).score;
  assert.ok(badScore < goodScore, `低契合 ${badScore} 应低于高契合 ${goodScore}`);
});

console.log('\n[3] 销量公式');

test('销量随评分单调递增（固定随机因子）', () => {
  const s = createNewState(7);
  const project = { platform: 'fc800', genre: 'rpg', marketing: 0 };
  const low = computeUnits(s, project, 15, 1);
  const high = computeUnits(s, project, 30, 1);
  assert.ok(high > low * 3, `30 分销量应显著高于 15 分：${high} vs ${low}`);
});

test('平台世代系数：退市平台销量衰减到 0.3', () => {
  const fc = getPlatform('fc800');
  const peak = platformState(fc, 2);
  const retired = platformState(fc, 6);
  assert.equal(peak.phase, 'peak');
  assert.equal(retired.phase, 'retired');
  assert.ok(retired.factor < peak.factor);
});

console.log('\n[4] 立项与发行闭环');

test('立项扣企划费，开发完成后发行入账并清空项目', () => {
  const s = createNewState(42);
  bootstrap(s);
  const cashBefore = s.cash;
  const r = startProject(s, { platform: 'fc800', genre: 'rpg', theme: 'fantasy' });
  assert.equal(r.ok, true);
  assert.ok(s.cash < cashBefore, '应扣企划费');
  assert.equal(s.project.dpNeed, 100);

  let guard = 0;
  while (s.project && s.project.dp < s.project.dpNeed && guard < 60) {
    tickProject(s);
    guard += 1;
  }
  assert.ok(s.project.dp >= s.project.dpNeed, 'DP 应达到需求');

  const before = s.cash;
  const rel = releaseGame(s, 0);
  assert.equal(rel.ok, true);
  assert.equal(s.project, null);
  assert.equal(s.released.length, 1);
  assert.ok(s.released[0].score >= 0 && s.released[0].score <= 40);
  assert.ok(s.released[0].units > 0);
  assert.equal(s.cash, before, '收入按 6 周入账，发行当周不到账');
});

test('现金不足无法立项', () => {
  const s = createNewState(42);
  s.cash = 1;
  const r = startProject(s, { platform: 'fc800', genre: 'rpg', theme: 'fantasy' });
  assert.equal(r.ok, false);
});

test('已退市平台不能立项', () => {
  const s = createNewState(42);
  s.week = 6 * 52 + 1;
  const r = startProject(s, { platform: 'fc800', genre: 'rpg', theme: 'fantasy' });
  assert.equal(r.ok, false);
});

console.log('\n[5] 周推进与年度节奏');

test('推进 52 周触发年度结算与次年年初事件', () => {
  const s = createNewState(42);
  bootstrap(s);
  for (let i = 0; i < 52; i += 1) {
    const r = advanceWeek(s);
    assert.equal(r.ok, true);
    if (s.pendingEvent) resolveEvent(s, 0);
  }
  assert.equal(s.week, 53);
  assert.equal(getYear(s), 2);
  assert.equal(s.awards.length, 1);
  assert.ok(s.lastYearSummary);
});

test('破产：现金为负即结束', () => {
  const s = createNewState(42);
  s.cash = 1;
  s.week = 3;
  const r = advanceWeek(s);
  assert.equal(r.ok, true);
  assert.equal(s.ended, true);
  assert.equal(s.endReason, 'bankrupt');
});

test('事件待处理时禁止推进', () => {
  const s = createNewState(42);
  bootstrap(s);
  startProject(s, { platform: 'fc800', genre: 'rpg', theme: 'fantasy' });
  s.pendingEvent = { id: 'x', eventId: 'inspiration', options: ['接受'], defaultOption: 0 };
  const r = advanceWeek(s);
  assert.equal(r.ok, false);
  resolveEvent(s, 0);
  assert.equal(advanceWeek(s).ok, true);
});

console.log('\n[6] 契合度矩阵完整性');

test('7 类型 × 8 主题全部有值且落在合法档位', () => {
  const genres = ['rpg', 'action', 'sim', 'adv', 'puzzle', 'racing', 'love'];
  const themes = ['fantasy', 'scifi', 'school', 'history', 'sports', 'horror', 'mystery', 'daily'];
  const legal = [0.6, 0.8, 1.0, 1.2, 1.5];
  for (const g of genres) {
    for (const t of themes) {
      const fit = fitOf(g, t);
      assert.ok(legal.includes(fit), `${g}×${t} = ${fit} 不在合法档位`);
    }
  }
});

console.log(`\n结果：${passed} 通过 / ${failures.length} 失败`);
if (failures.length) process.exit(1);
