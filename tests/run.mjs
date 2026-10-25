// 纯函数与结算测试：node tests/run.mjs
import assert from 'node:assert/strict';
import { createNewState, getYear, getWeekOfYear, loadState } from '../src/state.js';
import { computeScore, computeUnits, fatigueFactor } from '../src/systems/sales.js';
import {
  startProject, tickProject, resolveEvent, releaseGame,
  staffContribution, weeklyDp, assignStaff, coordinationFactor,
} from '../src/systems/project.js';
import { advanceWeek, bootstrap } from '../src/systems/clock.js';
import { paySalaries, addStaffExp, restStaff } from '../src/systems/staff.js';
import { checkEnd } from '../src/systems/progression.js';
import { getPlatform, platformState } from '../src/data/platforms.js';
import { fitOf } from '../src/data/genres.js';
import {
  MAX_SALARY_FAILURES, STAFF_LEVEL_THRESHOLDS, STAFF_SALARY_LEVEL_RATE,
  DP_PER_STAT, CROSS_ROLE_FACTOR,
} from '../src/data/balance.js';

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
  assert.equal(s.salaryFailures, 0);
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

test('发薪日现金不足：不破产，只记一次欠薪', () => {
  const s = createNewState(42);
  s.cash = 1;
  s.week = 3;
  const r = advanceWeek(s);
  assert.equal(r.ok, true);
  assert.equal(s.cash, 1, '欠薪不应把现金扣成负数');
  assert.equal(s.salaryFailures, 1);
  assert.equal(s.ended, false);
  assert.equal(s.endReason, '');
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

console.log('\n[6] 薪水扣款失败与破产（T-002）');

test('现金不足时发薪不产生负现金，salaryFailures +1，写 warn 日志与新闻', () => {
  const s = createNewState(42);
  s.cash = 1;
  const newsBefore = s.news.length;
  const r = paySalaries(s);
  assert.equal(r.ok, false);
  assert.equal(r.failed, true);
  assert.equal(s.cash, 1);
  assert.equal(s.salaryFailures, 1);
  assert.equal(checkEnd(s), '');
  assert.equal(s.ended, false);
  assert.ok(s.log.some((l) => l.kind === 'warn' && l.text.includes('欠薪')), '应写 warn 日志');
  assert.equal(s.news.length, newsBefore + 1, '应发一条欠薪新闻');
});

test('连续两次欠薪后 salaryFailures 达到阈值，checkEnd 返回 bankrupt', () => {
  const s = createNewState(42);
  s.cash = 1;
  s.week = 3;
  advanceWeek(s); // 第 4 周发薪：第一次失败
  assert.equal(s.salaryFailures, 1);
  assert.equal(s.ended, false);

  s.week = 7;
  const r = advanceWeek(s); // 第 8 周发薪：第二次失败
  assert.equal(s.salaryFailures, MAX_SALARY_FAILURES);
  assert.equal(s.cash, 1);
  assert.equal(r.ended, true);
  assert.equal(s.ended, true);
  assert.equal(s.endReason, 'bankrupt');
});

test('成功发薪会把 salaryFailures 归零', () => {
  const s = createNewState(42);
  s.salaryFailures = 1;
  s.week = 3;
  advanceWeek(s); // 第 4 周发薪：现金充足
  assert.equal(s.salaryFailures, 0);
  assert.equal(s.cash, 94);
  assert.equal(s.ended, false);
});

test('现金为负但欠薪未达阈值时不提前结束', () => {
  const s = createNewState(42);
  s.cash = -5;
  s.salaryFailures = 1;
  assert.equal(checkEnd(s), '');
  assert.equal(s.ended, false);
});

test('旧存档缺少 salaryFailures 时按 0 读取', () => {
  const fresh = createNewState(42);
  const { salaryFailures, ...legacy } = fresh;
  assert.equal(salaryFailures, 0);
  const prev = globalThis.localStorage;
  globalThis.localStorage = {
    getItem: () => JSON.stringify(legacy),
    setItem: () => {},
    removeItem: () => {},
  };
  try {
    const r = loadState();
    assert.equal(r.ok, true);
    assert.equal(r.state.salaryFailures, 0);
  } finally {
    if (prev === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = prev;
  }
});

console.log('\n[7] 员工经验与等级成长（T-003）');

test('参与开发按当周实际贡献累计经验，休息/跳过周/体力见底不涨', () => {
  const s = createNewState(42);
  bootstrap(s);
  startProject(s, { platform: 'fc800', genre: 'rpg', theme: 'fantasy' });
  const worker = s.staff[0];
  const rester = s.staff[1];
  restStaff(s, rester.id);

  tickProject(s);
  const afterWeek1 = worker.exp;
  assert.ok(afterWeek1 > 0, '在研员工应获得经验');

  worker.skipWeek = true;
  tickProject(s);
  assert.equal(worker.exp, afterWeek1, 'skipWeek 不涨经验');
  worker.skipWeek = false;

  worker.fatigue = 0;
  tickProject(s);
  assert.equal(worker.exp, afterWeek1, '体力为 0 无产出不涨经验');

  assert.equal(rester.exp, 0, '休息员工不涨经验');
  assert.equal(rester.level, 1);
});

test('经验分批累积到门槛升级，薪水按比例上涨并写 staff 日志', () => {
  const s = createNewState(42);
  const staff = s.staff[0];
  const need = STAFF_LEVEL_THRESHOLDS[0];
  const salaryBefore = staff.salary;

  assert.equal(addStaffExp(s, staff, need - 1), 0);
  assert.equal(staff.level, 1);
  assert.equal(staff.exp, need - 1);

  assert.equal(addStaffExp(s, staff, 1), 1);
  assert.equal(staff.level, 2);
  assert.equal(staff.exp, 0);
  const raise = Math.max(1, Math.round(salaryBefore * STAFF_SALARY_LEVEL_RATE));
  assert.equal(staff.salary, salaryBefore + raise, '升级应按比例涨薪');
  assert.ok(staff.salary > salaryBefore);
  assert.ok(s.log.some((l) => l.kind === 'staff' && l.text.includes('升到 Lv.2')), '应写升级日志');
});

test('等级上限 5，满级后继续加经验不再升级、不涨薪', () => {
  const s = createNewState(42);
  const staff = s.staff[0];
  for (let i = 0; i < STAFF_LEVEL_THRESHOLDS.length; i += 1) {
    assert.equal(addStaffExp(s, staff, STAFF_LEVEL_THRESHOLDS[i]), 1);
  }
  assert.equal(staff.level, 5);
  const salaryAtMax = staff.salary;

  assert.equal(addStaffExp(s, staff, 9999), 0);
  assert.equal(staff.level, 5);
  assert.equal(staff.salary, salaryAtMax);
  assert.equal(staff.exp, 0);
});

console.log('\n[8] 契合度矩阵完整性');

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

console.log('\n[9] 岗位匹配系数与调岗（T-004）');

test('未指派时按本职岗位贡献，公式与改动前一致', () => {
  const s = createNewState(42);
  bootstrap(s);
  startProject(s, { platform: 'fc800', genre: 'rpg', theme: 'fantasy' });
  assert.deepEqual(s.project.assignment, {}, '新项目默认无指派');

  const first = s.staff[0];
  const c = staffContribution(s, first, {});
  assert.equal(c.role.id, 'programmer');
  assert.equal(c.line, 'fun');
  assert.equal(c.crossRole, false);
  assert.equal(c.gain, first.stats.code * DP_PER_STAT * fatigueFactor(first));

  // weeklyDp 仍等于旧公式：各人主能力 × 0.7 × 体力系数之和 × 协调系数
  const legacyRaw = s.staff.reduce((sum, st) => {
    const stat = st.role === 'programmer' ? 'code' : st.role === 'artist' ? 'art' : st.role === 'sound' ? 'sound' : 'design';
    return sum + st.stats[stat] * DP_PER_STAT * fatigueFactor(st);
  }, 0);
  assert.ok(Math.abs(weeklyDp(s) - legacyRaw * coordinationFactor(2)) < 1e-9);
});

test('跨岗指派 gain 恰为本职的 CROSS_ROLE_FACTOR 倍，并计入被指派岗位品质线', () => {
  const s = createNewState(42);
  bootstrap(s);
  startProject(s, { platform: 'fc800', genre: 'rpg', theme: 'fantasy' });
  const staff = s.staff[0];
  staff.stats.art = staff.stats.code; // 同能力，便于直接比较岗位系数

  const home = staffContribution(s, staff, {});
  assert.equal(assignStaff(s, staff.id, 'artist').ok, true);
  assert.equal(s.project.assignment[staff.id], 'artist');

  const cross = staffContribution(s, staff);
  assert.equal(cross.line, 'art', '产出应计入美术的品质线');
  assert.equal(cross.crossRole, true);
  assert.ok(Math.abs(cross.gain - home.gain * CROSS_ROLE_FACTOR) < 1e-9);
  assert.equal(CROSS_ROLE_FACTOR, 0.5);
});

test('跨岗员工的实际推进只进被指派岗位品质线', () => {
  const s = createNewState(42);
  bootstrap(s);
  startProject(s, { platform: 'fc800', genre: 'rpg', theme: 'fantasy' });
  assignStaff(s, s.staff[0].id, 'artist'); // 程序员去顶美术
  tickProject(s);
  assert.equal(s.project.lines.fun, 0, '耐玩线不应再得到程序员产出');
  assert.ok(s.project.lines.art > 0, '画面线应得到产出');
});

test('weeklyDp 与一周 tickProject 的 DP 增量一致（含跨岗）', () => {
  const s = createNewState(42);
  bootstrap(s);
  startProject(s, { platform: 'fc800', genre: 'rpg', theme: 'fantasy' });
  assignStaff(s, s.staff[0].id, 'artist');

  const expected = weeklyDp(s);
  const before = s.project.dp;
  tickProject(s);
  assert.ok(Math.abs((s.project.dp - before) - expected) < 1e-6, `预计 ${expected} 实际 ${s.project.dp - before}`);
});

test('调岗错误路径：无在研项目 / 员工不存在 / 岗位非法', () => {
  const s = createNewState(42);
  assert.equal(assignStaff(s, s.staff[0].id, 'artist').ok, false, '无项目应失败');
  bootstrap(s);
  startProject(s, { platform: 'fc800', genre: 'rpg', theme: 'fantasy' });
  assert.equal(assignStaff(s, 'nope', 'artist').ok, false, '员工不存在应失败');
  assert.equal(assignStaff(s, s.staff[0].id, 'ceo').ok, false, '岗位非法应失败');
});

test('指派随项目保存；发行后项目清空，重新立项 assignment 为空', () => {
  const s = createNewState(42);
  bootstrap(s);
  startProject(s, { platform: 'fc800', genre: 'rpg', theme: 'fantasy' });
  assignStaff(s, s.staff[0].id, 'artist');
  assert.deepEqual(s.project.assignment, { [s.staff[0].id]: 'artist' });

  let guard = 0;
  while (s.project.dp < s.project.dpNeed && guard < 120) {
    tickProject(s);
    guard += 1;
  }
  assert.equal(releaseGame(s, 0).ok, true);
  assert.equal(s.project, null, '发行后项目应置空（指派随之清空）');

  assert.equal(startProject(s, { platform: 'fc800', genre: 'rpg', theme: 'fantasy' }).ok, true);
  assert.deepEqual(s.project.assignment, {}, '重新立项不应继承旧指派');
});

console.log(`\n结果：${passed} 通过 / ${failures.length} 失败`);
if (failures.length) process.exit(1);
