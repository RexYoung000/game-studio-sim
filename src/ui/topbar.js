// 顶栏渲染
import { getYear, getWeekOfYear } from '../state.js';
import { LEVEL_THRESHOLDS } from '../data/balance.js';

function expInfo(state) {
  if (state.level >= 5) return 'MAX';
  const need = LEVEL_THRESHOLDS[state.level] || 0;
  return `${state.exp}/${need}`;
}

export function renderTopbar(state) {
  const blocked = !!state.pendingEvent;
  const disabled = state.ended || blocked;
  return `
    <div class="topbar-left">
      <span class="brand">像素工房</span>
      <span class="clock">第 <b>${getYear(state)}</b> 年 · 第 <b>${getWeekOfYear(state)}</b> 周</span>
    </div>
    <div class="topbar-mid">
      <span class="stat">现金 <b class="cash ${state.cash < 0 ? 'neg' : ''}">${Math.round(state.cash)}</b> 万</span>
      <span class="stat">粉丝 <b>${state.fans.toLocaleString()}</b></span>
      <span class="stat">等级 <b>Lv.${state.level}</b> <span class="muted">(${expInfo(state)})</span></span>
    </div>
    <div class="topbar-right">
      ${blocked ? '<span class="warn-text">有事件待处理</span>' : ''}
      <button class="btn primary" data-action="advance" ${disabled ? 'disabled' : ''}>推进一周</button>
      <button class="btn ghost small" data-action="restart">重开</button>
    </div>
  `;
}
