// 平台固定时间线（PRD 附录 A）。装机量单位：万。
export const PLATFORMS = [
  { id: 'fc800', name: 'FC-800 家用电脑', launchYear: 0, peakYear: 2, retireYear: 6, peakInstalled: 60, fee: 5, costFactor: 1.0, mainGenre: 'adv' },
  { id: 'boy', name: '掌机 BOY', launchYear: 2, peakYear: 4, retireYear: 8, peakInstalled: 200, fee: 10, costFactor: 0.9, mainGenre: 'puzzle' },
  { id: 'neo', name: 'NEO 家用机', launchYear: 3, peakYear: 5, retireYear: 9, peakInstalled: 500, fee: 20, costFactor: 1.2, mainGenre: 'action' },
  { id: 'boy2', name: '掌机 BOY2', launchYear: 5, peakYear: 7, retireYear: 10, peakInstalled: 800, fee: 25, costFactor: 1.1, mainGenre: 'rpg' },
  { id: 'neo2', name: 'NEO-2 家用机', launchYear: 6, peakYear: 8, retireYear: 99, peakInstalled: 1200, fee: 40, costFactor: 1.35, mainGenre: 'action' },
  { id: 'boy3', name: '掌机 BOY3', launchYear: 8, peakYear: 10, retireYear: 99, peakInstalled: 2000, fee: 60, costFactor: 1.15, mainGenre: 'sim' },
];

export function getPlatform(id) {
  return PLATFORMS.find((p) => p.id === id) || null;
}

// 平台在指定年份的状态：locked / launch / growing / peak / declining / retired
export function platformState(platform, year) {
  if (year < platform.launchYear) {
    return { phase: 'locked', factor: 0, unlocked: false, retired: false };
  }
  if (year >= platform.retireYear) {
    return { phase: 'retired', factor: 0.3, unlocked: false, retired: true };
  }
  if (year === platform.launchYear) {
    return { phase: 'launch', factor: 0.45, unlocked: true, retired: false };
  }
  if (year === platform.launchYear + 1) {
    return { phase: 'growing', factor: 0.75, unlocked: true, retired: false };
  }
  if (year === platform.peakYear) {
    return { phase: 'peak', factor: 1.0, unlocked: true, retired: false };
  }
  const yearsPastPeak = year - platform.peakYear;
  return { phase: 'declining', factor: Math.max(0.3, Math.pow(0.6, yearsPastPeak)), unlocked: true, retired: false };
}

// 装机系数：sqrt(峰值装机 / 100万)（PRD 附录 D）
export function installFactor(platform, year) {
  const st = platformState(platform, year);
  return Math.sqrt(platform.peakInstalled / 100) * st.factor;
}

export const PHASE_LABEL = {
  locked: '未上市',
  launch: '上市首年',
  growing: '增长期',
  peak: '巅峰期',
  declining: '衰退期',
  retired: '已退市',
};
