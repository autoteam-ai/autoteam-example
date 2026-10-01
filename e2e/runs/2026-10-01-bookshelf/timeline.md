# 验证时间线（UTC+8）

| 时间 | 事件 | 证据 |
|---|---|---|
| 10-01 00:22 | `autoteam propose --apply`：规则文件的改动由 Implementer App 推送并开 PR #22，人批准，进合并队列 | logs/08-propose-apply.log、evidence/pr-22.json |
| 00:25 | PR #22 部署成功；部署任务清单为 `[]`，没有通知 Planner，Multica 上的指令没有同步（改进 #1） | Actions run 36744015619 |
| 07:28 | `autoteam setup`：预览 GitHub 和 Multica，两边都已是最新；三个 App 装在整个组织上各一条 ⚠️ | logs/05-setup-preview.log |
| 07:29 | `autoteam setup --apply`：执行两边，自动跑 doctor，没有错误（5 条提醒是项目当时处于暂停） | logs/06-setup-apply.log |
| 07:31 | `autoteam resume --apply`；启用的是默认的 5 个 autopilot | shots/21-multica-agents.png、22-multica-autopilots.png |
| 07:32:42 | 提需求 AUTO-8「书架加作者页，按作者浏览」，指派给 Planner | logs/10-requirement.json、requirement.md |
| 07:33:19 | Planner 拆成一个子任务 AUTO-9，放进 backlog，请人批准（40 秒） | shots/31-board-backlog.png、32-auto8-split.png |
| 07:35:26 | `autoteam approve AUTO-8` 预览，再 `--apply`：AUTO-9 放行，确认 Planner 的运行已生成 | logs/11-approve-preview.log、12-approve-apply.log |
| 07:36:10 | Planner 派发：impl-claude 实现、rev-codex 评审（跨厂商），理由写在评论里（26 秒，没有跑完整 doctor） | evidence/AUTO-9.comments.json |
| 07:37:15 | impl-claude 开 PR #23（+121 −9，5 个文件），打开自动合并，@rev-codex；AUTO-9 → 审核中 | shots/40-pr23.png、36-board-in-review.png、42-pr23-files.png |
| 07:39:44 | rev-codex 批准，进合并队列 | evidence/pr-23.json |
| 07:41:50 | PR #23 合并（a507e8b） | — |
| 07:42:25 | deploy 成功（31 秒，`make deploy` 等到线上 `version.json` 变成 a507e8b）；通知 Planner，清单 `["AUTO-9"]` | shots/44-deploy-notify.png、Actions run 36792411241 |
| 07:42:56 | 「部署结果」：Planner 线上逐条验收 AUTO-9，【验收通过】→ 已完成（39 秒） | shots/35-auto9-accepted.png |
| 07:43:19 | 批次屏障叫醒 Planner，父任务 AUTO-8 整体验收，【验收通过】→ 已完成，@Song 告知 | shots/53-auto8-done.png、50-52 线上、55-board-done.png |
| 07:48:52 | 手动触发「推进巡检」：`next --check` 清单为空，「本轮无事可做」，23 秒，不发评论 | shots/56-patrol-empty.png |
| 07:50:17 | 手动触发「周度健康报告」，建出 AUTO-10 交给 Auditor | — |
| 07:53:50 | Auditor 出报告：整合审计、agent 成绩单、老代码巡检、规格对账四节 | shots/60-auto10-health-report.png |
| 07:54:31 | Planner 拆出 AUTO-11（标签页和作者页共用列表页渲染，low）放进 backlog，不放行；把「同一本书不允许重复作者」补进 AUTO-9 的验收标准 | shots/61-auto10-planner-reply.png |
| 08:00:07 | 定时的「推进巡检」：本轮无事可做，19 秒 | evidence/agent-planner.tasks.json |
| 08:01 | `autoteam stop --apply`：暂停 5 个 autopilot，没有要取消的运行；`autoteam status` 列出每个 autopilot 的状态 | logs/13-stop-preview.log、14-stop-apply.log、15-status.log |

## 用量

这个需求（07:32～07:44）里各 agent 的运行，数字来自 evidence/agent-*.tasks.json：

| agent | 运行 | 输出 token | 读入上下文 | 用时 | 模型 |
|---|---|---|---|---|---|
| planner | 4（拆分、派发、验收、整体验收） | 8.8k | 136 万 | 2.5 分钟 | claude-sonnet-5-5 |
| impl-claude | 1 | 8.1k | 74 万 | 1.5 分钟 | claude-sonnet-5-5 |
| rev-codex | 1 | 2.4k | 40 万 | 2.7 分钟 | gpt-6-sol |

Planner 的 4 次运行都有产出，没有空跑。
