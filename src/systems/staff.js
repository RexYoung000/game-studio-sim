// 员工系统：招聘、体力、培训、薪水（PRD FR-5）
import { ROLES, NAMES, roleById } from '../data/staff.js';
import { LEVEL_STAFF_CAP, HIRE_FEE_PER_STAT, TRAIN_FEE_PER_POINT, STAT_MAX, MAX_SALARY_FAILURES } from '../data/balance.js';
import { randInt, pickRandom, nextRandom } from '../rng.js';
import { addLog, addNews, clamp } from '../state.js';

export function staffCap(state) {
  return LEVEL_STAFF_CAP[clamp(state.level - 1, 0, LEVEL_STAFF_CAP.length - 1)];
}

function makeCandidate(state, index) {
  const role = pickRandom(state, ROLES);
  const main = randInt(state, 3, 7);
  const stats = {
    code: randInt(state, 1, 4),
    art: randInt(state, 1, 4),
    sound: randInt(state, 1, 4),
    design: randInt(state, 1, 4),
  };
  stats[role.stat] = main;
  const salary = Math.max(2, Math.round(main * 0.6 + 1));
  const name = NAMES[randInt(state, 0, NAMES.length - 1)];
  return {
    id: `c${state.week}_${index}`,
    name,
    role: role.id,
    roleName: role.name,
    stats,
    salary,
    signing: main * HIRE_FEE_PER_STAT,
  };
}

export function refreshCandidates(state) {
  state.candidates = [0, 1, 2].map((i) => makeCandidate(state, i));
}

export function hireStaff(state, candidateId) {
  const candidate = state.candidates.find((c) => c.id === candidateId);
  if (!candidate) return { ok: false, error: '该候选人已不在市场' };
  if (state.staff.length >= staffCap(state)) {
    return { ok: false, error: `员工位已满（上限 ${staffCap(state)} 人），升级工作室才能再招` };
  }
  if (state.cash < candidate.signing) return { ok: false, error: '现金不足，付不起签约金' };

  state.cash -= candidate.signing;
  state.staff.push({
    id: `s_${candidate.id}`,
    name: candidate.name,
    role: candidate.role,
    roleName: candidate.roleName,
    stats: { ...candidate.stats },
    fatigue: 100,
    salary: candidate.salary,
    status: 'idle',
    level: 1,
    exp: 0,
    hiredWeek: state.week,
  });
  state.candidates = state.candidates.filter((c) => c.id !== candidateId);
  addLog(state, `${candidate.name}（${candidate.roleName}）入职，签约金 ${candidate.signing} 万。`, 'staff');
  return { ok: true };
}

export function trainStaff(state, staffId, statKey) {
  const staff = state.staff.find((s) => s.id === staffId);
  if (!staff) return { ok: false, error: '找不到该员工' };
  const value = staff.stats[statKey] || 0;
  if (value >= STAT_MAX) return { ok: false, error: '该能力已达上限 10' };
  const cost = value * TRAIN_FEE_PER_POINT;
  if (state.cash < cost) return { ok: false, error: `现金不足，培训需要 ${cost} 万` };

  state.cash -= cost;
  staff.stats[statKey] = value + 1;
  addLog(state, `${staff.name} 的${statLabel(statKey)}能力提升到 ${value + 1}（花费 ${cost} 万）。`, 'staff');
  return { ok: true };
}

export function restStaff(state, staffId) {
  const staff = state.staff.find((s) => s.id === staffId);
  if (!staff) return { ok: false, error: '找不到该员工' };
  if (staff.status === 'resting') return { ok: false, error: '他已经在休息了' };
  staff.status = 'resting';
  addLog(state, `${staff.name} 开始休息一周。`, 'staff');
  return { ok: true };
}

// 每周体力结算：在研 -8，休息 +40，闲置 +10
export function tickFatigue(state) {
  for (const staff of state.staff) {
    if (staff.status === 'resting') {
      staff.fatigue = clamp(staff.fatigue + 40, 0, 100);
      staff.status = 'idle';
    } else if (state.project) {
      staff.fatigue = clamp(staff.fatigue - 8, 0, 100);
    } else {
      staff.fatigue = clamp(staff.fatigue + 10, 0, 100);
    }
    staff.skipWeek = false;
  }
}

// 强制休息：体力 < 10 的员工自动休息（PRD FR-5）
export function enforceRest(state) {
  const forced = [];
  for (const staff of state.staff) {
    if (staff.fatigue < 10 && staff.status !== 'resting') {
      staff.status = 'resting';
      forced.push(staff.name);
    }
  }
  if (forced.length) addLog(state, `${forced.join('、')} 体力见底，被迫休息。`, 'warn');
}

export function paySalaries(state) {
  const total = state.staff.reduce((s, st) => s + st.salary, 0);
  if (state.cash < total) {
    state.salaryFailures += 1;
    const shortfall = total - state.cash;
    addLog(state, `发薪失败：还差 ${shortfall} 万，第 ${state.salaryFailures} 次欠薪（累计 ${MAX_SALARY_FAILURES} 次破产）。`, 'warn');
    addNews(state, `工作室第 ${state.salaryFailures} 次发不出薪水，员工开始担心下个月的账单。`, 'warn');
    return { ok: false, total, failed: true, shortfall, failures: state.salaryFailures };
  }
  state.cash -= total;
  state.salaryFailures = 0;
  addLog(state, `发薪：${state.staff.length} 人共 ${total} 万。`, 'money');
  return { ok: true, total, failed: false };
}

function statLabel(key) {
  return { code: '程序', art: '美术', sound: '音效', design: '企划' }[key] || key;
}

// 事件用：随机在研员工
export function randomWorkingStaff(state) {
  const list = state.staff.filter((s) => s.status !== 'resting');
  if (!list.length) return null;
  return list[Math.floor(nextRandom(state) * list.length)];
}
