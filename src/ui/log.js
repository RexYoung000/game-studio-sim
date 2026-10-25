// 日志渲染：倒序显示最近 60 条
export function renderLog(state) {
  const items = state.log.slice().reverse().map((entry) => `
    <li class="log-item log-${entry.kind || 'info'}">
      <span class="log-week">W${entry.week}</span>
      <span class="log-text">${entry.text}</span>
    </li>
  `).join('');
  return `<ul class="log-list">${items}</ul>`;
}
