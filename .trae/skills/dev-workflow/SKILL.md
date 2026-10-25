---
name: dev-workflow
description: "dev-workflow 开发流程的触发器与操作手册：当用户点名 dev-workflow，或请求开始新项目、继续项目、写 PRD、拆 Task、同步 Issue 等与项目流程相关的操作时使用。本 Skill 只负责触发流程并指引 agent 按手册推进，不复制事实内容；事实源始终是项目仓库内的 AGENTS.md、docs/ 与 tasks/。"
---

# dev-workflow Skill

## 定位

本 Skill 是 dev-workflow 开发流程的**触发器与操作手册**：识别流程意图、指引 agent 按约定流程推进项目，不复制事实内容。

## 触发方式

- **用户点名**：用户在对话中直接提及 dev-workflow，例如「用 dev-workflow 开始新项目」「用 dev-workflow 继续当前项目」。
- **语义匹配**：用户请求与 description 中的触发场景匹配时自动调用，例如要求开始新项目、继续项目、写 PRD、拆 Task、同步 Issue。

## 使用前置

- 进入被管理的项目后，**必须先读取项目根目录的 `AGENTS.md`**，再按其指引获取流程与规则；本 Skill 不重复其内容。

## 标准使用流程

1. **触发**：按「触发方式」识别流程意图，进入本流程。
2. **读目标项目 `AGENTS.md`**：获取流程规则、文件地图与关键规则（若项目尚未初始化，先运行 `python3 scripts/workflow.py init` 建立骨架）。
3. **确认阶段**：运行 `python3 scripts/workflow.py status`（用法见 `references/commands.md`），确认当前阶段、Task 计数与并行分组；中途接手再按 AGENTS.md「上下文恢复最短路径」补读 PRD 与技术规范。
4. **按当前阶段行动**：
   - 阶段 1 需求/PRD：按 `references/questioning.md` 逐题 + 选项卡提问，产出并请用户确认 `docs/prd.md`。
   - 阶段 2 技术规范：确定技术栈、撰写 `docs/tech-spec.md`、建立约定文件体系。
   - 阶段 3 Demo 验证：实现最小闭环 Demo，逐项给出技术验证点结论。
   - 阶段 4 Task/Issue 拆解：`task new` 拆 Task，`task sync` 建 Issue 并回填编号。
   - 阶段 5 Agent 执行：按 Task 分派执行（并发规则见 AGENTS.md），逐个 commit + push 并同步状态。
   - 阶段 6 测试与验收：agent 测试复查 → 用户验收；缺陷回阶段 5，新需求回流阶段 1。
   - 六阶段定义与门槛细则见 `references/phases.md`。
5. **门槛由 CLI 校验**：推进阶段一律运行 `python3 scripts/workflow.py phase next`，由 CLI 自动校验，失败按提示补齐缺口后重试；不得手工编辑 `.workflow/state.json` 绕过校验。

## 参考文件索引

| 文件 | 用途 |
|---|---|
| `references/phases.md` | 六阶段流程定义与阶段门槛检查清单 |
| `references/questioning.md` | 需求阶段的逐题 + 选项卡提问规范 |
| `references/commands.md` | CLI 命令用法、错误处理，以及本 Skill 的安装与更新方法 |
