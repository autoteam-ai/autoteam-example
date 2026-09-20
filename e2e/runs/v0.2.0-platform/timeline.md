# v0.2.0-platform 验证记录

## 被测版本

- autoteam：autoteam 0.1.0
- skill 来源：autoteam-ai/autoteam hash=13f118e8903a
- 本体那一版：85515d3 fix(planner): 换人前先查有没有已经开好的 PR
- example HEAD：1a02265 HDGCS-24 orders 新增按客户查询订单和合计 (#12)
- 记录时间：2026-09-20T14:14:01.042Z
- 合并模式：platform

## 分支上生效的规则

- deletion
- non_fast_forward
- pull_request：要求 1 个审批
- required_status_checks：check
- merge_queue

## PR #12

- 标题：HDGCS-24 orders 新增按客户查询订单和合计
- 状态：MERGED
- 开于：2026-09-20T14:04:16Z  作者：songhuangcn
- 合并：2026-09-20T14:07:08Z  1a02265d74eaef6b209ffc0d83327d262892c68b
- 检查：check=SUCCESS
- 评审：autoteam-bot APPROVED

评论：

## 任务 HDGCS-23

{
  "assignee_id": "73e832d4-688f-4f97-9b09-83ece36bd69d",
  "assignee_type": "agent",
  "created_at": "2026-09-20T08:49:05Z",
  "creator_id": "9727eac2-da55-4a55-97d0-2b9ef22312be",
  "creator_type": "member",
  "description": "给 orders 加一个 `customer \u003c名字\u003e` 命令，列出某个客户的全部订单。\n\n背景：现在只能看全部订单或金额最高的几笔，想按客户查。\n\n要求：\n- `orders customer \u003c名字\u003e`，列出该客户的所有订单，按订单号升序，每行含订单号、日期、金额\n- 结尾多打一行合计：这个客户的订单数和总金额\n- 客户名不区分大小写，但必须完整匹配，不做模糊匹配\n- 客户不存在时，给出清楚的提示并以非 0 退出码结束\n- 客户名里带逗号、引号的（数据里就有）要能正常查到\n\n线上验收用最新的 GitHub Release 包，不要用工作目录里的代码。",
  "due_date": null,
  "id": "01a0be01-3413-7815-aeaf-0fdc29d5a35f",
  "identifier": "HDGCS-23",
  "labels": [],
  "last_activity_at": "2026-09-20T14:08:36.387029Z",
  "metadata": {},
  "number": 23,
  "parent_issue_id": null,
  "position": -10,
  "priority": "none",
  "project_id": "e3021aef-aa6c-4e90-8e7d-09583438ed0e",
  "properties": {},
  "revision": 8,
  "stage": null,
  "start_date": null,
  "status": "done",
  "status_category": "done",
  "status_name": "",
  "title": "orders 加 customer 命令：按客户查订单",
  "updated_at": "2026-09-20T14:08:36Z",
  "workspace_id": "a32a2372-62a7-42f9-944e-b255663d0400"
}

### 评论
ID                                    PARENT  AUTHOR            TYPE     CONTENT  CREATED
01a0be03-1912-7252-894e-cd3b73789c54  —       agent:ex-planner  comment  已拆好，1 个批次、1 个子任务（改动量小，单个 PR 足够）：

- 第 1 批：[HDGCS-24](mention://issue/01a0be02...  2026-09-20T08:51
01a0be06-e9bf-7b04-bcbb-95f9120bf9b6            —                                     system:00000000-0000-0000-0000-000000000000  progress_update  Delegated task `01a0be04-d8a7-7c62-9b8f-1e70ff822993` ended in a final failur...  2026-09-20T08:55
01a0be07-35aa-70ec-8a31-3082350b3216            01a0be06-e9bf-7b04-bcbb-95f9120bf9b6  agent:ex-planner                             system           You've hit your session limit · resets 9:10pm (Asia/Shanghai)                     2026-09-20T08:55
01a0bf25-0c28-7849-bb8e-f749c6f6e97d            —                                     system:00000000-0000-0000-0000-000000000000  system           [@ex-planner](mention://agent/73e832d4-688f-4f97-9b09-83ece36bd69d) Stage 1 o...  2026-09-20T14:07
01a0bf25-b65c-7338-bd2b-6b8d55471f82            01a0bf25-0c28-7849-bb8e-f749c6f6e97d  agent:ex-planner                             comment          【验收通过】1a02265d74eaef6b209ffc0d83327d262892c68b

子任务 HDGCS-24 已全部完成。父任务整体验收：下载...  2026-09-20T14:08

### 运行记录
ID        AGENT       STATUS     STARTED           COMPLETED         ERROR
01a0bf25  ex-planner  completed  2026-09-20T14:08  2026-09-20T14:08  
01a0be06  ex-planner  failed     2026-09-20T08:55  2026-09-20T08:55  You've hit your session limit · resets 9:10pm (...
01a0be01  ex-planner  completed  2026-09-20T08:49  2026-09-20T08:51

## 任务 HDGCS-24

{
  "assignee_id": "4f05b607-f3aa-423d-b7b1-2aafe54fc689",
  "assignee_type": "agent",
  "created_at": "2026-09-20T08:50:56Z",
  "creator_id": "73e832d4-688f-4f97-9b09-83ece36bd69d",
  "creator_type": "agent",
  "description": "## 为什么做\n\n现在 `orders` 只能列全部订单（`list`）或金额最高的几笔（`top \u003cN\u003e`），没法按客户名查某个客户的全部订单。[HDGCS-23](mention://issue/01a0be01-3413-7815-aeaf-0fdc29d5a35f) 提出加这个查询能力。\n\n## 要做什么\n\n- `src/orders.mjs` 新增按客户名过滤订单的函数：大小写不敏感、必须完整匹配（不做模糊/部分匹配），按订单号升序排列；再加一个算合计（订单数、总金额）的小函数。\n- `bin/orders.mjs` 新增 `customer \u003c名字\u003e` 子命令：\n  - 每行输出订单号、日期、金额（不需要 customer/status 列，这三项已知或无关）；\n  - 结尾多打一行合计：订单数和总金额；\n  - 客户不存在时，stderr 输出清楚的错误提示，`process.exitCode` 设为非 0；\n  - 客户名里带逗号、引号（数据里已有 `\"Acme, Inc.\"`、`Bob \"The Builder\"` 这类）要能正常传参和匹配。\n- 更新 `--help` 文本，加上 `customer \u003c名字\u003e` 的说明。\n- 补单元测试（过滤函数：大小写不敏感/完整匹配/排序/合计）和 CLI 集成测试（正常查询、客户名大小写不同、带逗号引号的客户名、客户不存在时非 0 退出码、`--help` 包含新命令）。\n\n## 不做什么\n\n- 不改动现有 `list` / `top` 命令的行为和输出格式。\n- 不做模糊匹配、前缀匹配或多客户批量查询。\n- 不改数据文件结构（`data/orders.json`），不引入新依赖（保持零依赖）。\n\n## 验收标准（线上验证，用最新 GitHub Release 包，不用工作目录代码）\n\n```bash\ngh release download --repo autoteam-ai/autoteam-example --pattern 'orders-*.tgz' --dir \u003c临时目录\u003e\n# 解压后：\nnode bin/orders.mjs customer \"Acme, Inc.\"\n```\n\n1. 输出该客户的全部订单，按订单号升序，每行含订单号、日期、金额；最后一行是合计（订单数、总金额）。\n2. 大小写不同的输入，例如 `node bin/orders.mjs customer \"acme, inc.\"`，能查到同一客户，结果一致。\n3. 客户名带逗号、引号的（如 `Bob \"The Builder\"`）能正常查到（注意 shell 转义）。\n4. 客户不存在时，例如 `node bin/orders.mjs customer Nope`，stderr 有清楚的错误提示，且 `echo $?` 非 0。\n5. `node bin/orders.mjs --help` 输出包含 `customer \u003c名字\u003e` 的说明。",
  "due_date": null,
  "id": "01a0be02-e69b-7abf-8ff8-fa62cbea78fe",
  "identifier": "HDGCS-24",
  "labels": [],
  "last_activity_at": "2026-09-20T14:07:51.318989Z",
  "metadata": {},
  "number": 24,
  "parent_issue_id": "01a0be01-3413-7815-aeaf-0fdc29d5a35f",
  "position": -9,
  "priority": "none",
  "project_id": "e3021aef-aa6c-4e90-8e7d-09583438ed0e",
  "properties": {},
  "revision": 17,
  "stage": 1,
  "start_date": null,
  "status": "done",
  "status_category": "done",
  "status_name": "",
  "title": "orders 加 customer 命令：按客户查订单",
  "updated_at": "2026-09-20T14:07:51Z",
  "workspace_id": "a32a2372-62a7-42f9-944e-b255663d0400"
}

### 评论
ID                                    PARENT  AUTHOR            TYPE     CONTENT  CREATED
01a0be04-b746-7d8f-8f42-d481d3933c02  —       agent:ex-planner  comment  派发：

- Implementer：ex-impl-claude
- Reviewer：ex-rev-codex

理由：两者账号不同（claude-p...                 2026-09-20T08:52
01a0be06-e9cd-7a0e-972c-bbb0dc74e2b5  —                                     agent:ex-impl-claude  system   You've hit your session limit · resets 9:10pm (Asia/Shanghai)                     2026-09-20T08:55
01a0bf1e-d444-7abe-989a-71a3cf5d7fae  —                                     agent:ex-planner      comment  【换人】ex-impl-claude 因额度耗尽失败（"session limit，21:10 (Asia/Shanghai) 恢复"），换 Implem...  2026-09-20T14:01
01a0bf22-3d03-767a-99de-26d8a3edae8e  —                                     agent:ex-impl-codex   comment  已实现客户查询、订单数/金额合计和帮助说明，提交 PR：https://github.com/autoteam-ai/autoteam-example/p...  2026-09-20T14:04
01a0bf23-de98-7b4f-b951-e8fdc5620476  01a0bf22-3d03-767a-99de-26d8a3edae8e  agent:ex-rev-codex    comment  /note 评审通过，等待合并和部署。

已批准 [PR #12](https://github.com/autoteam-ai/autoteam-exa...  2026-09-20T14:06
01a0bf25-074b-7d49-b0ec-e2af734811e7                         —  agent:ex-planner  comment  【验收通过】1a02265d74eaef6b209ffc0d83327d262892c68b

PR #12 合并提交即该部署 sha；用最新 Relea...  2026-09-20T14:07

### 运行记录
ID        AGENT           STATUS     STARTED           COMPLETED         ERROR
01a0bf22  ex-rev-codex    completed  2026-09-20T14:04  2026-09-20T14:06  
01a0bf1e  ex-impl-codex   completed  2026-09-20T14:01  2026-09-20T14:04  
01a0be04  ex-impl-claude  failed     2026-09-20T08:53  2026-09-20T08:55  You've hit your session limit · resets 9:10pm (...
01a0be03  ex-planner      completed  2026-09-20T08:51  2026-09-20T08:53

## Release（这个项目的“线上”）

orders 1a02265	Latest	deploy-20260920140714-1a02265	2026-09-20T14:07:16Z
orders e8b075d		deploy-20260920084753-e8b075d	2026-09-20T08:47:55Z
orders c705461		deploy-20260920082256-c705461	2026-09-20T08:22:59Z
orders d33e808		deploy-20260920081320-d33e808	2026-09-20T08:13:22Z
orders df4da3a		deploy-20260920080621-df4da3a	2026-09-20T08:06:23Z
