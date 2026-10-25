# CLI 命令与 Skill 维护（commands）

> 用途：dev-workflow CLI（`scripts/workflow.py`，Python 3 标准库单文件）的用法与错误处理，以及本 Skill 安装到目标项目与更新的方法。命令行为规格来源：`docs/tech-spec.md` §5；统一入口 `python3 scripts/workflow.py`（下文简写 `workflow …`），须在被管理项目内运行。

## CLI 命令用法

共五组命令：`init` / `task new` / `task sync` / `status` / `phase next|set`。

### 1. `workflow init` — 初始化项目骨架

建目录（`docs/templates`、`tasks`、`scripts`、`.workflow`）+ 生成约定文件与三套模板 + `git init`（main 分支）+ 写 `.workflow/state.json`（阶段 1）。**幂等：已存在的文件跳过不覆盖**（tech-spec §5）。

```bash
python3 scripts/workflow.py init
```

```text
[生成] AGENTS.md
[生成] docs/templates/prd-template.md
[生成] docs/templates/tech-spec-template.md
[生成] docs/templates/task-template.md
[git] 已初始化仓库（main 分支）
[状态] 已写入 .workflow/state.json（阶段 1）
init 完成
```

（已存在的文件输出 `[跳过] <路径> 已存在`。）

### 2. `workflow task new` — 新建 Task

按 `docs/templates/task-template.md` 生成下一个 `tasks/T-xxx-<slug>.md`，id 自动取现有最大值 +1（tech-spec §5）。

| 参数 | 必填 | 说明 |
|---|---|---|
| `--title` | 是 | 中文标题 |
| `--module` | 是 | 模块名（scripts / docs / skill / …），并发分组依据 |
| `--deps` | 否 | 依赖的 Task id，逗号分隔 |

```bash
python3 scripts/workflow.py task new --title 编写 Skill 内容 --module skill --deps T-002,T-003
# 已创建 tasks/T-004-编写-Skill-内容.md（T-004）
```

### 3. `workflow task sync` — Task → GitHub Issues 单向同步

扫描 `tasks/`：为无 `issue` 编号的 Task 创建 Issue（标题 `[T-xxx] 标题`、标签 `task` + `module:<模块>`、正文含 Task 全字段）并回填编号；`status=done` 的关闭对应 Issue；末尾输出同步汇总（tech-spec §5、§4.3）。同步方向仅 **本地 → 远端**，远端编辑不回写本地（PRD FR-6）。

```bash
python3 scripts/workflow.py task sync
```

```text
[创建] T-004 → Issue #4
[回填] T-005 ← 已存在 Issue #5
[关闭] T-001 → Issue #1

同步汇总：新建 1 / 回填 1 / 关闭 1 / 异常跳过 0
```

### 4. `workflow status` — 状态汇总（只读）

输出当前阶段、GitHub 仓库、并发上限、异常 Task、各状态 Task 计数、未同步（无 Issue 编号）项、blocked 项与并行分组预览（tech-spec §5）。

```bash
python3 scripts/workflow.py status
```

```text
项目阶段: 4（Task/Issue 拆解）
GitHub 仓库: RexYoung000/dev-workflow
并发上限: 3

Task 统计: 共 5 | todo 2 | in-progress 1 | review 0 | done 2 | blocked 0
未同步（无 Issue 编号）: T-004, T-005
blocked: 无

并行分组预览（上限 3）:
  - skill: T-004
  - docs: T-005
  → 2 个模块组，可并行
```

### 5. `workflow phase next` / `phase set N` — 阶段推进

- `phase next`：进入下一阶段，按 tech-spec §5.1 校验门槛，失败拒绝并列出缺口（规则明细见 `phases.md`）。
- `phase set N`：直接设置阶段（1-6）；**前进校验门槛，回退免校验**（迭代回流）。

```bash
python3 scripts/workflow.py phase next
# 门槛校验通过，已进入阶段 2（技术规范）

python3 scripts/workflow.py phase set 1
# 已回退到阶段 1（需求/PRD）（迭代回流，无需校验）
```

校验失败示例：

```text
无法进入阶段 5（Agent 执行），未满足门槛：
  - 以下 Task 未回填 Issue 编号: T-004, T-005
```

## 错误处理

总约定（tech-spec §5 / §5.1）：**不静默失败，非零退出码 + 中文报错**。

| 场景 | 表现与处置 |
|---|---|
| `gh` 未登录 / 无网络 | 非零退出码 + 中文报错（提示检查 `gh auth status` 与网络连接）；处置后重跑 `task sync` |
| `gh` 未安装 | 报「未找到 gh 命令，请先安装 GitHub CLI」 |
| Task 必填字段缺失 / status 非法 | 列出缺失字段并**跳过该 Task**，继续处理其余；补齐字段后重跑 |
| sync 中断 | **可安全重跑**：以 front-matter `issue` 字段去重 + Issue 标题 `[T-xxx]` 二次校验，不产生重复 Issue |
| 不在 workflow 项目内运行 | 报「未找到 .workflow/state.json」，提示先 `workflow init` |
| `phase set` 编号越界 | 报「阶段编号必须是 1-6」；已在阶段 6 时 `phase next` 提示无下一步 |

## Skill 安装与更新

本 Skill 随 dev-workflow 仓库版本化（PRD FR-10 / D9，tech-spec §8）。

**安装**（目标项目首次使用）：

1. 将本仓库 `skill/dev-workflow/` **整目录**（含 `SKILL.md` 与 `references/`）复制到目标项目的 Trae 项目级技能目录：`.trae/skills/dev-workflow/`。
2. 若 Trae 实际生效路径与上述不同，以实际生效路径为准（tech-spec §8：确切路径以实测确认为准）。
3. 在目标项目**新开会话**，用触发词验证生效（如「用 dev-workflow 开始新项目」）；触发后按 `SKILL.md` 的标准使用流程执行。

**更新**（dev-workflow 仓库中 Skill 有新版本时）：

1. 重新复制 `skill/dev-workflow/` 整目录**覆盖**目标项目中的旧版本。
2. 新开会话验证触发与内容为最新（旧会话可能仍用旧内容）。

注意：Skill 文件只提供流程指引与手册，不含 CLI 实现；CLI 脚本 `scripts/workflow.py` 属于被管理项目仓库的一部分（目录结构见 tech-spec §3）。
