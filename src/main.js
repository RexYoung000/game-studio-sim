// 入口：加载存档 → 事件委托 → 渲染（tech-spec §2）
import { createNewState, loadState, saveState, resetSave } from './state.js';
import { bootstrap } from './systems/clock.js';
import { dispatch } from './actions.js';
import { renderAll, toast } from './ui/render.js';
import { openModal, closeModal, updateProjectEstimate } from './ui/modals.js';

let state;

function persistAndRender() {
  const saved = saveState(state);
  renderAll(state);
  if (!saved) toast('存档不可用，本局进度仅保存在内存中', 'warn');
}

function afterAction(result) {
  if (!result || result.ok === false) {
    if (result && result.error) toast(result.error, 'warn');
    return result;
  }
  persistAndRender();
  return result;
}

function boot() {
  const loaded = loadState();
  if (loaded.ok) {
    state = loaded.state;
    toast('存档已读取', 'info');
  } else {
    state = createNewState();
    bootstrap(state);
    if (loaded.reason === 'corrupt' || loaded.reason === 'version') {
      toast('存档损坏或版本不符，已开新档（原档已备份）', 'warn');
    }
    saveState(state);
  }
  renderAll(state);
  if (state.ended) openModal({ type: 'end' });
}

document.addEventListener('click', (evt) => {
  const btn = evt.target.closest('[data-action]');
  if (!btn) return;
  const action = btn.dataset.action;

  switch (action) {
    case 'advance': {
      const result = afterAction(dispatch(state, 'ADVANCE_WEEK'));
      if (!result || result.ok === false) return;
      if (result.ended) {
        openModal({ type: 'end' });
        renderAll(state);
      } else if (result.changes.includes('年度结算')) {
        openModal({ type: 'year' });
        renderAll(state);
      }
      break;
    }
    case 'new-project':
      openModal({ type: 'project' });
      renderAll(state);
      updateProjectEstimate(state);
      break;
    case 'close-modal':
      closeModal();
      renderAll(state);
      break;
    case 'confirm-project': {
      const platform = document.getElementById('p-platform');
      const genre = document.getElementById('p-genre');
      const theme = document.getElementById('p-theme');
      if (!platform || !genre || !theme) return;
      const result = afterAction(dispatch(state, 'START_PROJECT', {
        platform: platform.value,
        genre: genre.value,
        theme: theme.value,
      }));
      if (result.ok) {
        closeModal();
        renderAll(state);
      }
      break;
    }
    case 'hire':
      afterAction(dispatch(state, 'HIRE', { id: btn.dataset.id }));
      break;
    case 'rest':
      afterAction(dispatch(state, 'REST', { id: btn.dataset.id }));
      break;
    case 'train':
      openModal({ type: 'train', staffId: btn.dataset.id });
      renderAll(state);
      break;
    case 'train-stat':
      afterAction(dispatch(state, 'TRAIN', { id: btn.dataset.id, stat: btn.dataset.stat }));
      break;
    case 'event-option':
      afterAction(dispatch(state, 'RESOLVE_EVENT', { option: Number(btn.dataset.index) }));
      break;
    case 'release':
      openModal({ type: 'release' });
      renderAll(state);
      break;
    case 'confirm-release': {
      const checked = document.querySelector('input[name="tier"]:checked');
      const tier = checked ? Number(checked.value) : 0;
      const result = afterAction(dispatch(state, 'RELEASE', { tier }));
      if (result.ok) {
        closeModal();
        renderAll(state);
      }
      break;
    }
    case 'restart':
      openModal({ type: 'restart' });
      renderAll(state);
      break;
    case 'confirm-restart':
      resetSave();
      state = createNewState();
      bootstrap(state);
      closeModal();
      saveState(state);
      renderAll(state);
      toast('新的一局开始了', 'info');
      break;
    default:
      break;
  }
});

document.addEventListener('change', (evt) => {
  if (evt.target.matches('#p-platform, #p-genre, #p-theme')) {
    updateProjectEstimate(state);
  }
});

// 调试入口（tech-spec §1）
window.__gss = {
  get state() { return state; },
  advance: (n = 1) => {
    for (let i = 0; i < n; i += 1) {
      const r = dispatch(state, 'ADVANCE_WEEK');
      if (!r.ok) break;
    }
    renderAll(state);
    return state;
  },
};

boot();
