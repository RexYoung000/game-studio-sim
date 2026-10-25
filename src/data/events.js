// 开发期随机事件池（PRD 附录 C）。effects 为声明式字段，由 systems/project.js 统一结算。
// 字段含义：
//   dpPct        本周/当前进度百分比变化
//   fatigueAll   全员体力变化
//   fatigueOne   随机一名在研员工体力变化
//   qualityMax   最高品质线 +N
//   qualityMin   最低品质线 +N
//   qualityRandom 随机一条品质线 +N（可为负）
//   skipStaffWeek 该员工本周不产出
//   quitStaff    随机一名在研员工离职
//   salaryPct    随机一名在研员工薪水 ×(1+N)
//   cash         现金变化（万元）
//   fans         粉丝变化
export const EVENTS = [
  {
    id: 'inspiration', title: '灵感爆发', weight: 18,
    text: '凌晨三点，有人突然想通了一个绝妙的点子。',
    options: [{ label: '接受灵感', effects: { qualityMax: 1 } }],
    defaultOption: 0,
  },
  {
    id: 'overtime', title: '员工要求加班', weight: 15,
    text: '进度不等人，团队主动提出这周多干一点。',
    options: [
      { label: '准了，加班冲进度', effects: { dpPct: 0.3, fatigueAll: -15 } },
      { label: '拒绝，身体要紧', effects: {} },
    ],
    defaultOption: 1,
  },
  {
    id: 'equipment', title: '设备故障', weight: 12,
    text: '开发机的硬盘发出临终的咔哒声。',
    options: [
      { label: '花钱修，别误事', effects: { cash: -8 } },
      { label: '硬扛，先备份', effects: { dpPct: -0.15 } },
    ],
    defaultOption: 1,
  },
  {
    id: 'sick', title: '员工感冒', weight: 12,
    text: '有人咳得像台老式调制解调器。',
    options: [
      { label: '送医，扣钱但保人', effects: { cash: -3, fatigueOne: 20 } },
      { label: '硬撑，他还能写', effects: { fatigueOne: -20, skipStaffWeek: true } },
    ],
    defaultOption: 1,
  },
  {
    id: 'media', title: '媒体探班', weight: 10,
    text: '一家游戏杂志想来拍几张开发中的照片。',
    options: [
      { label: '接受采访，涨点名气', effects: { fans: 300, dpPct: -0.08 } },
      { label: '拒绝，保密项目', effects: {} },
    ],
    defaultOption: 1,
  },
  {
    id: 'poach', title: '人才被挖角', weight: 8, lateWeight: 16,
    text: '同业公司开出了让人心动的价码。',
    options: [
      { label: '加薪留人', effects: { salaryPct: 0.2 } },
      { label: '好聚好散', effects: { quitStaff: true } },
    ],
    defaultOption: 0,
  },
  {
    id: 'compat', title: '平台兼容问题', weight: 8, lateWeight: 16,
    text: '新平台的底层接口和旧代码打了起来。',
    options: [
      { label: '付费适配', effects: { cash: -12 } },
      { label: '先不管，砍点效果', effects: { qualityRandom: -1 } },
    ],
    defaultOption: 1,
  },
  {
    id: 'beta', title: '内测玩家吐槽', weight: 15,
    text: '内测反馈里全是「这手感怪怪的」。',
    options: [
      { label: '采纳意见，回炉调整', effects: { qualityMin: 1, dpPct: -0.05 } },
      { label: '忽略，玩家不懂', effects: {} },
    ],
    defaultOption: 0,
  },
];

export function eventById(id) {
  return EVENTS.find((e) => e.id === id) || null;
}
