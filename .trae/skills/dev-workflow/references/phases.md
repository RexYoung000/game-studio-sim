# 六阶段流程与门槛检查（phases）

> 用途：定义被管理项目从需求到验收的六个阶段，以及进入下一阶段前必须通过的门槛检查。事实来源为项目仓库的 `AGENTS.md` §3、`docs/prd.md` §5 与 `docs/tech-spec.md` §5.1；本文件只做提炼与操作指引，与事实源冲突时以事实源为准。

## 六阶段定义

流程主线（PRD §5）：1 需求/PRD → 2 技术规范 → 3 Demo 验证 → 4 Task/Issue 拆解 → 5 Agent 执行 → 6 测试与验收。**严格门槛：不通过不得进入下一阶段**（PRD §5、决策 D10）。

| 阶段 | 一句话定义（PRD §5） | 入口条件 | 完成门槛 |
|---|---|---|---|
| 1 需求/PRD | 以逐题 + 选项卡的头脑风暴把用户想法固化为 `docs/prd.md` | 用户提出新项目想法，或对现有项目提出新一轮需求 | 用户明确确认 PRD |
| 2 技术规范 | 确定技术栈、撰写 `docs/tech-spec.md` 并建立约定文件体系 | PRD 已确认 | 用户确认技术方案与规范 |
| 3 Demo 验证 | 实现最小闭环 Demo，逐项给出技术验证点结论 | 技术方案已确认 | Demo 跑通、验证点全部有结论，用户确认继续 |
| 4 Task/Issue 拆解 | 把 PRD 与技术方案拆为含验收标准的 Task，`task sync` 建 Issue 并回填编号 | Demo 验证通过 | 所有 Task 均有 Issue 编号 |
| 5 Agent 执行 | 按 Task 分派 agent 执行，逐个 commit + push 并同步状态 | Task 已拆解完毕 | 所有 Task `done` 且已推送 |
| 6 测试与验收 | agent 测试复查 → 用户实际体验验收 | 全部 Task 完成 | 用户验收通过，项目归档；否则循环（缺陷回阶段 5，新需求回流阶段 1） |

各阶段「动作与产出」明细见 PRD §5；commit / Task 状态机 / 并发规则见 AGENTS.md §5；阶段 1 的提问方式按 `questioning.md` 执行。

## 阶段门槛检查清单

推进动作 = `python3 scripts/workflow.py phase next`，由 CLI 按 tech-spec §5.1 自动校验；**校验失败会拒绝推进并列出缺口，补齐后重跑即可**。不得手工编辑 `.workflow/state.json` 绕过校验。

以目标阶段为准逐项核对（来源：tech-spec §5.1）：

- [ ] **目标 ≥2**：`docs/prd.md` 存在
- [ ] **目标 ≥3**：`docs/tech-spec.md` 存在
- [ ] **目标 ≥4**：`tasks/` 下至少 1 个 Task，且 `docs/prd.md`、`docs/tech-spec.md` 齐备
- [ ] **目标 ≥5**：全部 Task 的 `issue` 字段已回填
- [ ] **目标 ≥6**：全部 Task `status=done`
- [ ] **回流免校验**：阶段 1 允许从任意阶段回退（迭代回流），无需校验

补充约定：

- CLI 校验为**累积式**：进入阶段 N 会同时检查 ≥2…≥N 的全部规则（实现见 `scripts/workflow.py`）。
- `phase set N` 前进同样校验门槛，回退免校验；已在阶段 6 时 `phase next` 提示无下一步。
- 上表为机器可校验部分；各阶段完成门槛中的「用户确认」（确认 PRD / 技术方案 / Demo / 验收）须由 agent 在对话中取得用户明确确认后才执行推进。
