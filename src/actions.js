// 唯一写入入口：用户操作 → 系统函数 → 存档 → 渲染（tech-spec §3.3）
import { advanceWeek } from './systems/clock.js';
import { startProject, releaseGame, resolveEvent, assignStaff } from './systems/project.js';
import { hireStaff, trainStaff, restStaff } from './systems/staff.js';

export function dispatch(state, action, payload = {}) {
  switch (action) {
    case 'ADVANCE_WEEK':
      return advanceWeek(state);
    case 'START_PROJECT':
      return startProject(state, payload);
    case 'ASSIGN_STAFF':
      return assignStaff(state, payload.id, payload.role);
    case 'HIRE':
      return hireStaff(state, payload.id);
    case 'TRAIN':
      return trainStaff(state, payload.id, payload.stat);
    case 'REST':
      return restStaff(state, payload.id);
    case 'RESOLVE_EVENT':
      return resolveEvent(state, payload.option);
    case 'RELEASE':
      return releaseGame(state, payload.tier);
    default:
      return { ok: false, error: `未知操作：${action}` };
  }
}
