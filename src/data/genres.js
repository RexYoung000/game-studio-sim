// 类型、主题与契合度矩阵（PRD 附录 B）。baseDp：类型基础开发点数。
export const GENRES = [
  { id: 'rpg', name: 'RPG', baseDp: 100 },
  { id: 'action', name: '动作', baseDp: 85 },
  { id: 'sim', name: '模拟', baseDp: 95 },
  { id: 'adv', name: '冒险', baseDp: 80 },
  { id: 'puzzle', name: '益智', baseDp: 60 },
  { id: 'racing', name: '竞速', baseDp: 75 },
  { id: 'love', name: '恋爱', baseDp: 70 },
];

export const THEMES = [
  { id: 'fantasy', name: '幻想' },
  { id: 'scifi', name: '科幻' },
  { id: 'school', name: '校园' },
  { id: 'history', name: '历史' },
  { id: 'sports', name: '运动' },
  { id: 'horror', name: '恐怖' },
  { id: 'mystery', name: '推理' },
  { id: 'daily', name: '日常' },
];

export const FIT_MATRIX = {
  rpg: { fantasy: 1.5, scifi: 1.2, school: 0.8, history: 1.2, sports: 0.6, horror: 1.0, mystery: 0.8, daily: 0.6 },
  action: { fantasy: 1.2, scifi: 1.2, school: 0.6, history: 0.8, sports: 1.5, horror: 1.0, mystery: 0.6, daily: 0.6 },
  sim: { fantasy: 0.8, scifi: 1.2, school: 1.0, history: 1.0, sports: 1.0, horror: 0.6, mystery: 0.8, daily: 1.5 },
  adv: { fantasy: 1.5, scifi: 1.2, school: 1.0, history: 1.2, sports: 0.6, horror: 1.2, mystery: 1.5, daily: 0.8 },
  puzzle: { fantasy: 0.6, scifi: 0.8, school: 1.2, history: 0.6, sports: 0.8, horror: 0.6, mystery: 1.2, daily: 1.2 },
  racing: { fantasy: 0.8, scifi: 1.2, school: 0.8, history: 0.6, sports: 1.5, horror: 0.6, mystery: 0.6, daily: 0.6 },
  love: { fantasy: 1.0, scifi: 0.8, school: 1.5, history: 1.0, sports: 1.0, horror: 0.8, mystery: 0.8, daily: 1.2 },
};

export function getGenre(id) {
  return GENRES.find((g) => g.id === id) || null;
}

export function getTheme(id) {
  return THEMES.find((t) => t.id === id) || null;
}

export function fitOf(genreId, themeId) {
  const row = FIT_MATRIX[genreId];
  return row && row[themeId] ? row[themeId] : 1.0;
}

// 契合度等级文字（用于立项界面提示）
export function fitLabel(fit) {
  if (fit >= 1.5) return '天作之合';
  if (fit >= 1.2) return '契合良好';
  if (fit >= 1.0) return '中规中矩';
  if (fit >= 0.8) return '略显勉强';
  return '强行拼凑';
}
