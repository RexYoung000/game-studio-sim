// 左栏：员工与招聘
import { STAT_LABELS, roleById } from '../data/staff.js';
import { STAFF_LEVEL_THRESHOLDS } from '../data/balance.js';
import { staffCap, STAFF_LEVEL_MAX } from '../systems/staff.js';

function fatigueClass(v) {
  if (v < 10) return 'bar-fill danger';
  if (v < 30) return 'bar-fill warn';
  return 'bar-fill ok';
}

function levelLabel(staff) {
  const level = staff.level || 1;
  if (level >= STAFF_LEVEL_MAX) return `Lv.${level} MAX`;
  const need = STAFF_LEVEL_THRESHOLDS[level - 1];
  return `Lv.${level} · 经验 ${Math.floor(staff.exp || 0)}/${need}`;
}

function staffCard(staff) {
  const role = roleById(staff.role);
  return `
    <div class="staff-card">
      <div class="staff-head">
        <span class="staff-name">${staff.name}</span>
        <span class="staff-role" style="color:${role.color}">${staff.roleName}</span>
        ${staff.status === 'resting' ? '<span class="tag">休息中</span>' : ''}
      </div>
      <div class="tiny muted">${levelLabel(staff)}</div>
      <div class="fatigue">
        <div class="bar"><div class="${fatigueClass(staff.fatigue)}" style="width:${staff.fatigue}%"></div></div>
        <span class="tiny">体力 ${Math.round(staff.fatigue)}</span>
      </div>
      <div class="stats">
        ${Object.keys(STAT_LABELS).map((k) => `
          <div class="stat-row">
            <span class="tiny">${STAT_LABELS[k]}</span>
            <div class="bar slim"><div class="bar-fill ${statsClass(staff.stats[k])}" style="width:${staff.stats[k] * 10}%"></div></div>
            <span class="tiny num">${staff.stats[k]}</span>
          </div>
        `).join('')}
      </div>
      <div class="staff-foot">
        <span class="tiny">月薪 ${staff.salary} 万</span>
        <div class="row-actions">
          <button class="btn tiny" data-action="train" data-id="${staff.id}" ${staff.status === 'resting' ? 'disabled' : ''}>培训</button>
          <button class="btn tiny" data-action="rest" data-id="${staff.id}" ${staff.status === 'resting' ? 'disabled' : ''}>休息</button>
        </div>
      </div>
    </div>
  `;
}

function statsClass(v) {
  if (v >= 8) return 'great';
  if (v >= 5) return 'good';
  return 'meh';
}

function candidateCard(state, c) {
  return `
    <div class="staff-card candidate">
      <div class="staff-head">
        <span class="staff-name">${c.name}</span>
        <span class="staff-role">${c.roleName}</span>
      </div>
      <div class="stats compact">
        ${Object.keys(STAT_LABELS).map((k) => `<span class="tiny">${STAT_LABELS[k]} ${c.stats[k]}</span>`).join('')}
      </div>
      <div class="staff-foot">
        <span class="tiny">签约 ${c.signing} 万 · 月薪 ${c.salary} 万</span>
        <button class="btn tiny primary" data-action="hire" data-id="${c.id}" ${state.cash < c.signing ? 'disabled' : ''}>雇佣</button>
      </div>
    </div>
  `;
}

export function renderStaffPanel(state) {
  const cap = staffCap(state);
  return `
    <div class="panel-head">
      <h2>团队 <span class="muted">${state.staff.length}/${cap}</span></h2>
    </div>
    <div class="scroll-area">
      ${state.staff.map(staffCard).join('')}
    </div>
    <div class="panel-subhead">
      <h3>招聘市场</h3>
      <span class="tiny muted">每周刷新</span>
    </div>
    <div class="candidates">
      ${state.candidates.length ? state.candidates.map((c) => candidateCard(state, c)).join('') : '<p class="tiny muted">本周没人来应聘。</p>'}
      ${state.staff.length >= cap ? `<p class="tiny warn-text">员工位已满（上限 ${cap}），升级工作室可扩容。</p>` : ''}
    </div>
  `;
}
