// 渲染调度：面板级全量重绘
import { renderTopbar } from './topbar.js';
import { renderStaffPanel } from './staffPanel.js';
import { renderStudioPanel } from './studioPanel.js';
import { renderMarketPanel } from './marketPanel.js';
import { renderModal } from './modals.js';

export function renderAll(state) {
  const topbar = document.getElementById('topbar');
  const staff = document.getElementById('staff-panel');
  const studio = document.getElementById('studio-panel');
  const market = document.getElementById('market-panel');
  const modal = document.getElementById('modal-root');
  if (!topbar || !staff || !studio || !market || !modal) return;

  topbar.innerHTML = renderTopbar(state);
  staff.innerHTML = renderStaffPanel(state);
  studio.innerHTML = renderStudioPanel(state);
  market.innerHTML = renderMarketPanel(state);
  modal.innerHTML = renderModal(state);
  document.body.classList.toggle('modal-open', modal.innerHTML.trim() !== '');
}

let toastTimer = null;
export function toast(message, kind = 'info') {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    document.body.appendChild(el);
  }
  el.className = `toast show ${kind}`;
  el.textContent = message;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.className = 'toast'; }, 2600);
}
