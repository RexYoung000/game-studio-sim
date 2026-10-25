// 员工姓名池与岗位定义（PRD FR-5）
export const ROLES = [
  { id: 'programmer', name: '程序员', stat: 'code', mainLine: 'fun', color: '#7bd88f' },
  { id: 'artist', name: '美术', stat: 'art', mainLine: 'art', color: '#f2a65a' },
  { id: 'sound', name: '音效', stat: 'sound', mainLine: 'sound', color: '#8ab6f9' },
  { id: 'planner', name: '策划', stat: 'design', mainLine: 'design', color: '#e58fb1' },
];

export const STAT_LABELS = {
  code: '程序',
  art: '美术',
  sound: '音效',
  design: '企划',
};

export const LINE_LABELS = {
  design: '创意',
  art: '画面',
  sound: '音效',
  fun: '耐玩',
};

export const NAMES = [
  '佐藤', '田中', '铃木', '高桥', '渡边', '伊藤', '山本', '中村',
  '小林', '加藤', '吉田', '山田', '佐佐木', '松本', '井上', '木村',
  '林', '清水', '山崎', '森', '池田', '桥本', '石川', '前田',
];

export const TITLE_PREFIX = ['游戏工作室', '像素工房', '小作坊'];

export function roleById(id) {
  return ROLES.find((r) => r.id === id) || ROLES[0];
}

// 开局员工模板（PRD 附录 E）
export const STARTER_STAFF = [
  { name: '佐藤', role: 'programmer', stats: { code: 6, art: 3, sound: 2, design: 2 }, salary: 3 },
  { name: '田中', role: 'artist', stats: { code: 2, art: 6, sound: 3, design: 2 }, salary: 3 },
];
