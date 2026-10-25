// 全局数值常量：唯一调参入口（PRD 附录 D/E，tech-spec §2 约定 4）
export const START_CASH = 100;          // 万元
export const START_LEVEL = 1;
export const START_FANS = 0;
export const WEEKS_PER_YEAR = 52;
export const TOTAL_YEARS = 10;
export const TOTAL_WEEKS = WEEKS_PER_YEAR * TOTAL_YEARS;

export const WEEKLY_FATIGUE = 8;
export const REST_RECOVERY = 40;
export const FATIGUE_LOW = 30;          // 低体力阈值：贡献减半
export const FATIGUE_CRITICAL = 10;     // 强制休息阈值
export const SALARY_INTERVAL = 4;       // 每 4 周发薪

export const DP_PER_STAT = 0.7;         // 单员工周 DP = 主能力 × 0.7 × 体力系数 × 岗位匹配
export const CROSS_ROLE_FACTOR = 0.5;
export const QUALITY_SCALE = 10;        // 品质线 0-10
export const EVENT_CHANCE = 0.08;       // 开发期每周事件概率

export const BASE_UNITS = 5;            // 销量基数（万份）
export const PRICE_PER_UNIT = 3;        // 每万份收入（万元）
export const REVENUE_SPLIT = [0.30, 0.25, 0.20, 0.12, 0.08, 0.05];
export const MARKETING_TIERS = [
  { tier: 0, label: '无营销', cost: 0, factor: 1.0 },
  { tier: 1, label: '小规模', cost: 10, factor: 1.15 },
  { tier: 2, label: '中规模', cost: 30, factor: 1.35 },
  { tier: 3, label: '大规模', cost: 80, factor: 1.6 },
];

export const AWARD_CASH = 50;
export const AWARD_FANS = 2000;
export const AWARD_EXP = 30;
export const COMPETITOR_SCORE_MIN = 20;
export const COMPETITOR_SCORE_MAX = 33;

export const LEVEL_THRESHOLDS = [0, 120, 320, 650, 1000];   // 达到等级 N 所需累计经验
export const LEVEL_STAFF_CAP = [3, 4, 5, 6, 8];
export const PLAN_FEE_RATE = 0.5;       // 企划费 = 平台授权费 × 0.5
export const HIRE_FEE_PER_STAT = 4;     // 签约金 = 主能力和 × 4 万
export const TRAIN_FEE_PER_POINT = 5;   // 培训费 = 当前能力 × 5 万
export const STAT_MAX = 10;

export const FANS_PER_UNIT = 2;         // 每万份销量带来的基础粉丝（叠加 sqrt(销量)×100 的爆款加成）
export const COORDINATION_PENALTY = 0.04; // 团队每多 1 人，总产出 -4%（最低 0.6）
export const DP_YEAR_SCALE = 0.1;       // 项目 DP 需求每年 +10%
export const FANS_ON_AWARD = AWARD_FANS;

export const SAVE_KEY = 'gss_save_v1';
export const SAVE_VERSION = 1;
