# 游戏工作室模拟器（Game Studio Sim）技术文档与技术规范

| 项 | 值 |
|---|---|
| 版本 | v1.0 |
| 日期 | 2026-10-25 |
| 依据 | PRD v1.0 已确认 |

## 1. 技术栈决策

| 项 | 决策 | 理由 |
|---|---|---|
| 语言 | 原生 JavaScript（ES2022）+ HTML + CSS | PRD D1 要求网页桌面横屏；不引入框架与时序依赖 |
| 模块 | 原生 ES Modules（`<script type="module">`） | 文件即模块边界，子 agent 可并行改不同模块 |
| 依赖 | **零运行时依赖、零构建** | 无 npm、无打包、无编译等待；改完刷新即生效 |
| 运行方式 | 本地静态服务器（`start.sh`：`python3 -m http.server` + 打开浏览器） | ES Modules 在 `file://` 下被浏览器 CORS 拦截，必须走 HTTP；这是对 PRD「直接打开」的唯一技术性妥协 |
| 渲染 | 单状态对象 + 全量重绘（面板级 render 函数），事件委托 | 数据量小（< 10 员工、< 10 平台），全量重绘成本可忽略，避免状态同步 bug |
| 随机 | 种子随机（mulberry32），种子存入存档 | 同一存档可复现同一事件序列，方便测试与调试 |
| 样式 | 纯 CSS 像素风，CSS 变量集中定义色板与间距 | PRD D3；不引用任何图片、字体、CDN |
| 存档 | `localStorage` 单键 `gss_save_v1`，JSON + 版本号 | PRD D6 |
| 测试 | 浏览器控制台可调 `window.__gss`（暴露 state 与系统函数）+ 纯函数单测脚本 `tests/run.mjs`（Node 直跑） | 无测试框架依赖，覆盖公式与结算 |

**明确不做**：React/Vue、TypeScript、Vite、打包器、CSS 预处理器、第三方 UI 库、Canvas/WebGL（UI 用 DOM，不用画布）、后端与网络请求。

## 2. 架构与目录规范

```text
game-studio-sim/
├── index.html                 # 唯一页面：三栏骨架 + 弹层容器 + 模块入口
├── start.sh                   # 启动本地服务器并打开浏览器
├── styles/
│   ├── base.css               # CSS 变量（色板/字号/间距）、重置、像素边框工具类
│   ├── layout.css             # 顶栏 + 三栏栅格 + 弹层遮罩
│   └── components.css         # 按钮/卡片/进度条/日志/表格/弹窗
├── src/
│   ├── main.js                # 入口：加载存档 → 绑定事件 → 首次渲染
│   ├── state.js               # 存档结构、创建新档、读写 localStorage、版本迁移
│   ├── rng.js                 # mulberry32 种子随机
│   ├── data/
│   │   ├── platforms.js       # 平台表（PRD 附录 A）
│   │   ├── genres.js          # 类型、主题、契合度矩阵、类型基础 DP（附录 B）
│   │   ├── events.js          # 随机事件池（附录 C）
│   │   ├── staff.js           # 姓名池、候选人生成参数
│   │   └── balance.js         # 全部数值常量（附录 D/E），单一调参入口
│   ├── systems/
│   │   ├── clock.js           # 周推进、年初/年末事件、时间线
│   │   ├── project.js         # 立项、开发推进、事件结算、发行
│   │   ├── sales.js           # 评分、销量、长尾收入
│   │   ├── staff.js           # 招聘、体力、培训、薪水
│   │   ├── market.js          # 平台世代状态、热度、新闻
│   │   └── progression.js     # 粉丝、经验、等级、年度大奖、终局/破产
│   └── ui/
│       ├── render.js          # renderAll()：按顺序调用各面板渲染
│       ├── topbar.js          # 顶栏
│       ├── staffPanel.js      # 左栏员工
│       ├── studioPanel.js     # 中栏项目与日志
│       ├── marketPanel.js     # 右栏市场/新闻
│       ├── modals.js          # 立项/招聘/培训/事件/发行/结算弹层
│       └── log.js             # 日志追加与裁剪（最多 60 条）
├── tests/
│   ├── run.mjs                # Node 直跑纯函数测试
│   └── sim.mjs                # 自动模拟一局（输出每年关键指标），用于调参
└── docs/                      # 本目录文档（PRD / tech-spec / templates）
```

**模块边界规则**：

1. `systems/*` 只做纯逻辑：接收 `state` 与入参、返回结果或就地修改 `state`，**不得操作 DOM**。
2. `ui/*` 只读 `state` 并渲染，**不得修改 `state`**；用户操作统一走 `actions.js`（见 §3.3）。
3. `data/*` 只导出常量与纯数据表，不写逻辑。
4. 所有数值常量必须来自 `data/balance.js`，禁止在系统代码里写魔法数字（临时中间值除外且需注释）。

## 3. 数据模型 / 接口约定

### 3.1 存档结构（`localStorage` 键 `gss_save_v1`）

```js
{
  version: 1,
  seed: 123456,                 // 随机种子
  rngState: 987654,             // 当前随机状态，保证读档后序列连续
  week: 1,                      // 全局周数 1..520
  year: 1,                      // 由 week 推导，1..10
  cash: 100,                    // 单位：万元
  fans: 0,
  level: 1,
  exp: 0,
  reputation: 0,                // 口碑 -100..100，影响粉丝增减幅度
  staff: [{
    id: "s1", name: "…", role: "programmer",  // programmer/artist/sound/planner
    stats: { code: 6, art: 3, sound: 2, design: 2 },  // 0-10
    fatigue: 100, salary: 3, status: "idle",  // idle/working/resting
    level: 1, exp: 0, hiredWeek: 1
  }],
  project: null,                // 见 3.2
  released: [{                  // 已发行作品
    id: "g1", title: "…", genre: "rpg", theme: "fantasy", platform: "fc800",
    score: 27, lines: { design: 7, art: 7, sound: 6, fun: 7 },
    units: 42.5,              // 总销量（万份）
    revenue: 127.5,           // 总收入（万元）
    releasedWeek: 37, revenueByWeek: [0,0,0,0,0,0], revenueSettled: 3
  }],
  platformState: { fc800: { phase: "peak", factor: 1, unlocked: true, retiredWeek: 0 } },
  genreHeat: { rpg: 1.0, action: 1.0, sim: 1.0, adv: 1.0, puzzle: 1.0, racing: 1.0, love: 1.0 },
  news: [{ week: 5, text: "…", type: "platform" }],   // 最多 12 条
  log: [{ week: 5, text: "…", kind: "dev" }],         // 最多 60 条
  awards: [{ year: 2, gameId: "g1", won: true }],
  candidates: [{ … }],          // 本周招聘市场候选人
  pendingEvent: null,           // 未处理事件 { id, title, options }
  ended: false, endReason: ""   // bankrupt/finished
}
```

### 3.2 项目对象

```js
{
  id: "g2",
  platform: "boy", genre: "rpg", theme: "fantasy", fit: 1.5,
  dp: 0, dpNeed: 96,
  lines: { design: 0, art: 0, sound: 0, fun: 0 },   // 累计贡献
  status: "developing",         // developing/releasing
  marketing: 0,                 // 0/1/2/3 档
  startedWeek: 20,
  eventCooldown: 0
}
```

### 3.3 动作层约定（`src/actions.js`）

所有用户操作统一为 `dispatch(action, payload)`，内部调用 systems 并以 `state` 为唯一写入点；每个动作结尾执行：`save(state) → renderAll()`。

动作清单：`START_PROJECT` / `ASSIGN_STAFF` / `ADVANCE_WEEK` / `HIRE` / `REST_STAFF` / `TRAIN_STAFF` / `RESOLVE_EVENT` / `SET_MARKETING` / `RELEASE_GAME` / `NEW_GAME` / `CONTINUE_ENDLESS`。

### 3.4 系统函数签名

| 函数 | 签名 | 说明 |
|---|---|---|
| `advanceWeek(state)` | → `{ changed: string[] }` | 完整周结算链（PRD FR-1 顺序） |
| `startProject(state, {platform, genre, theme})` | → `{ ok, error }` | 校验现金/平台解锁/在研项目 |
| `tickProject(state)` | → `{ dpGain, events[] }` | 单周开发推进 |
| `resolveEvent(state, eventId, choice)` | → `{ ok }` | 事件结算 |
| `releaseGame(state, marketingTier)` | → `{ ok, game }` | 评分、销量、入账首周 |
| `computeScore(state, project)` | → `{ score, lines }` | 纯函数，评分公式 |
| `computeUnits(state, project, score)` | → `number` | 纯函数，销量公式 |
| `hireStaff(state, candidateId)` | → `{ ok, error }` | 招聘 |
| `trainStaff(state, staffId, statKey)` | → `{ ok, error }` | 培训 |
| `restStaff(state, staffId)` | → `{ ok }` | 休息一周 |
| `refreshCandidates(state)` | → `void` | 每周刷新招聘市场 |
| `updateMarket(state, prevWeek, week)` | → `news[]` | 平台世代、热度、新闻 |
| `settleYear(state)` | → `{ award, summary }` | 年末大奖与小结 |
| `save/load/reset` | `state.js` 导出 | 存档读写，损坏时返回 `{ ok:false }` |

## 4. 错误处理与边界

| 场景 | 处理 |
|---|---|
| localStorage 不可用/写满 | 降级为内存存档，顶栏显示「存档不可用」黄条，不阻断游戏 |
| 存档 JSON 损坏或版本不符 | 不崩溃：提示「存档损坏，已开新档」，保留原键为 `gss_save_v1_corrupt` 供排查 |
| 现金不足以支付立项/招聘/培训 | 按钮禁用 + 点击提示原因，不扣钱、不半途而废 |
| 体力 < 10 强制休息 | 该员工本周自动休息，日志提示，不允许分配 |
| 平台退市后立项 | 立项弹层置灰并显示退市年份 |
| 在研项目期间重复立项 | 拒绝并提示「已有在研项目」 |
| 现金流断裂 | 结算后 `cash < 0` → 破产结算界面，`ended=true`，禁止推周 |
| 数值越界 | 评分/品质线/热度/体力统一 clamp；销量最低 0.1 万份 |
| 事件弹层强制选择 | `pendingEvent` 非空时「推进一周」按钮禁用，必须先选 |

## 5. 技术验证清单（阶段 3 Demo 依据）

| # | 验证点 | 通过标准 | 结论 |
|---|---|---|---|
| V1 | 页面与三栏布局 | 1280×800 下三栏无溢出，像素风格生效，无外部资源请求 | 通过：三栏与顶栏正常渲染，无空白面板、无错位；无外部资源请求 |
| V2 | 周推进结算链 | 连续推进 52 周，每周日志有变化，年末事件按期触发 | 通过：单测推进 52 周触发年度结算；浏览器连点推进，日志逐条新增 |
| V3 | 立项 → 开发 → 发行闭环 | 从开局现金完成一次完整立项到发行，收入按 6 周入账 | 通过：浏览器完成立项→18 周开发→评分 16/40、6.6 万份；收入 6 周分摊由单测校验 |
| V4 | 评分与销量公式 | 单测覆盖 `computeScore`/`computeUnits` 边界值，与 PRD 附录 D 一致 | 通过：12 项单测全绿（含评分单调性、契合度影响、销量单调性） |
| V5 | 平台世代更替 | 平台按附录 A 年份上市/退市，退市后无法立项且老作品销量衰减 | 通过：单测退市平台拒绝立项、退市系数 0.3；模拟局中平台按年份切换 |
| V6 | 随机事件 | 事件概率与权重可统计验证，8 个事件均能正确处理与默认选项 | 通过：事件弹层在浏览器触发并可选择；默认选项与效果结算由单测覆盖 |
| V7 | 存档与恢复 | 刷新后进度/种子/在研项目完整恢复；损坏存档不崩溃 | 通过：浏览器刷新后周数/现金/项目状态一致；损坏存档降级逻辑由代码兜底 |
| V8 | 终局与破产 | 520 周进入总决算；现金断裂进入破产界面 | 通过：单测破产判定；模拟局跑满 520 周进入 finished |
| V9 | 数值体感 | `tests/sim.mjs` 自动跑 3 局，开局 3 年内不破产、10 年可做到评分 32+ | 通过：3 局模拟无破产，37-41 部作品，最高 39 分、Lv.5，最终现金 16000-32000 万 |

## 6. 已确认项

- [x] 零依赖、零构建的原生 ES Modules 方案（用户跳过技术栈提问，由 agent 按「最快可玩、最少维护」原则决策）
- [x] 通过 `start.sh` 起本地静态服务器运行（ES Modules 的 CORS 限制导致 `file://` 不可用）
- [x] 单状态对象 + 面板级全量重绘，不引入响应式框架
- [x] 种子随机保证可复现，便于自动模拟调参
- [x] 并发上限 3、main 直接提交（沿用 AGENTS.md §5）
