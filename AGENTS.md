# AGENTS.md — dev-workflow agent 操作手册

> 任何 agent 进入本仓库，先读本文件。本仓库是 dev-workflow 的本体：一套「约定 + 模板 + CLI 脚本」的 agent 开发流程管理系统（PRD §2）。本手册是你的唯一流程入口。

## 1. 使命与事实源原则

**使命**：管理一个项目从需求到交付的完整生命周期（6 阶段），让任意 coding agent 都能按同一套约定协作，不绑定特定 agent 平台（PRD §2、§3）。

**事实源原则**（PRD §3 信任原则 + tech-spec §2）：

1. **本地文件是唯一事实源；GitHub 是单向镜像存档**。Issue 仅由本地单向创建/关闭，远端对 Issue 的编辑不回写本地（PRD FR-6）。
2. **Task 状态唯一事实源 = `tasks/*.md` front-matter 的 `status` 字段**。任何状态判断以 Task 文件为准。
3. `.workflow/state.json` **只存项目阶段与配置**（`phase` / `repo` / `config.max_parallel`），不存任何 Task 状态；Task 汇总统计由 `workflow status` 实时扫描 `tasks/` 计算，从根上消除双源不一致（tech-spec §2）。

## 2. 文件地图

目录结构规范见 tech-spec §3。

| 路径 | 作用 |
|---|---|
| `AGENTS.md` | 本手册：流程入口、文件地图、规则引用 |
| `docs/prd.md` | 唯一 PRD 事实源（含已确认决策记录） |
| `docs/tech-spec.md` | 技术规范：CLI 规格、阶段门槛、数据模型、commit/并发规则 |
| `docs/templates/` | prd / tech-spec / task 三套模板 |
| `tasks/` | Task 文件（`T-xxx-<slug>.md`），front-matter `status` 为状态事实源 |
| `scripts/workflow.py` | 单文件流程 CLI（Python 标准库，用法见 §4） |
| `.workflow/state.json` | 项目阶段与配置（`phase` / `repo` / `config.max_parallel`） |
| `skill/dev-workflow/` | Trae 项目级 Skill 源码（`SKILL.md` + `references/`），随仓库版本化（tech-spec §8） |

## 3. 六阶段流程指引

流程：1 需求/PRD → 2 技术规范 → 3 Demo 验证 → 4 Task/Issue 拆解 → 5 Agent 执行 → 6 测试与验收。**严格门槛：不通过不得进入下一阶段**（PRD §5、D10）。推进动作 = `workflow phase next`，由 CLI 按 tech-spec §5.1 规则自动校验，失败即拒绝并列出缺口。

| 阶段 | 一句话定义（依据 PRD §5） | 完成门槛 |
|---|---|---|
| 1 需求/PRD | 以逐题 + 选项卡的头脑风暴把用户想法固化为 `docs/prd.md` | 用户明确确认 PRD |
| 2 技术规范 | 确定技术栈、撰写 `docs/tech-spec.md` 并建立约定文件体系 | 用户确认技术方案与规范 |
| 3 Demo 验证 | 实现最小闭环 Demo，逐项给出技术验证点结论 | Demo 跑通、验证点全有结论，用户确认继续 |
| 4 Task/Issue 拆解 | 把 PRD 与技术方案拆为含验收标准的 Task，sync 建 Issue 并回填编号 | 所有 Task 均有 Issue 编号 |
| 5 Agent 执行 | 按 Task 分派 agent 执行，逐个 commit + push 并同步状态 | 所有 Task `done` 且已推送 |
| 6 测试与验收 | agent 测试复查 → 用户实际体验验收 | 用户验收通过（缺陷回阶段 5，新需求回流阶段 1） |

阶段推进的机器校验规则明细见 tech-spec §5.1；迭代回流（6 → 1）免校验（tech-spec §5.1）。

## 4. CLI 速查

统一入口 `python3 scripts/workflow.py`（命令行为、幂等策略与错误处理完整规格见 tech-spec §5）：

```bash
python3 scripts/workflow.py init                    # 初始化项目骨架（幂等，已存在文件跳过）
python3 scripts/workflow.py task new --title 标题 --module 模块 [--deps T-002,T-003]   # 按模板新建 Task
python3 scripts/workflow.py task sync               # 单向同步 Issue：无编号的创建并回填，done 的关闭
python3 scripts/workflow.py status                  # 只读汇总：阶段、各状态 Task 计数、未同步、blocked、并行分组
python3 scripts/workflow.py phase next              # 进入下一阶段（校验 tech-spec §5.1 门槛）
python3 scripts/workflow.py phase set 3             # 直接设置阶段（前进校验门槛，回退免校验）
```

异常约定（tech-spec §5）：`gh` 未登录 / 无网络 → 非零退出码 + 中文报错，不静默失败；Task 必填字段缺失 → 列出缺失字段并跳过该 Task 继续；sync 中断可安全重跑，不产生重复 Issue。

## 5. 关键规则

### 5.1 commit 与分支（tech-spec §6 / PRD FR-7）

- 分支：单人单机，**main 直接提交**，不设分支矩阵。
- 格式：`<type>(<module>): 中文描述 #<Issue号>`，type ∈ feat / fix / docs / refactor / test / chore。
- 时机：Task 进入 review 或 done 即 commit + push。
- 禁止：force push、跳过 hooks；push 失败必须重试或报告，不得静默丢弃。

### 5.2 Task 状态机（PRD FR-5、§8；tech-spec §4.1）

- 主链路：`todo → in-progress → review → done`；`blocked` 任意时刻可进入。
- Task 正文 `## 验收标准` 的 checkbox **全部勾选才允许置 done**。
- Task 置 done 后由 `task sync` 关闭对应 Issue（tech-spec §4.3）。

### 5.3 并发规则（PRD FR-8；tech-spec §7）

1. 只有**不同模块且无依赖**（deps 无交集）的 Task 才可并行分派给多个子 agent。
2. 并发上限读 `.workflow/state.json` 的 `config.max_parallel`（默认 3，用户可随时改；上限变更不影响已分派中的 Task）。
3. **同一时间修改同一文件集的 Task 不得并行**（文件隔离按 module 维度约束）。
4. **git commit 由主 agent 串行执行**：子 agent 只完成各自 Task 的工作，完成一个由主 agent 提交一个，规避 git index 竞争。
5. 子 agent 开工前**必读**：本文件（AGENTS.md）、`docs/prd.md`、`docs/tech-spec.md` 与所认领的 Task 文件。

## 6. 新 agent 上下文恢复最短路径

中途接手项目（PRD §9），按序执行：

1. 读本文件（AGENTS.md）。
2. 读 `.workflow/state.json`：确认当前 `phase`、远端仓库、并发上限。
3. 读 `docs/prd.md` 与 `docs/tech-spec.md`。
4. 跑 `python3 scripts/workflow.py status`：获取当前阶段、各状态 Task 计数、blocked 项与并行分组预览。
5. 需要推进阶段时跑 `python3 scripts/workflow.py phase next`（门槛由 CLI 自动校验）。
6. 认领或继续 Task：打开对应 `tasks/*.md`，核对 front-matter `status` 与 `deps`，置 `in-progress` 后开工。

## 7. Skill 使用入口

`skill/dev-workflow/` 是 Trae 项目级 Skill 源码，随本仓库版本化；在目标项目中使用时将其复制安装到该项目的技能目录（tech-spec §8）。CLI 命令的详细用法与错误处理说明由 `skill/dev-workflow/references/commands.md` 承担。
