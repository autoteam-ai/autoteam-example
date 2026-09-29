# e2e：验证 autoteam 的工具和每轮的证据

这个目录不是书架的业务代码，是人用来验证 autoteam 本身的：工具放在这里，每轮验证的截图、日志和结论放在 `runs/<日期>-<说明>/`。它受 CODEOWNERS 保护，agent 不改它，gate 的行数上限和重复代码检查也不算它。

## 每一轮

| 轮次 | 被测版本 | 结论 |
|---|---|---|
| [2026-09-29-bookshelf](runs/2026-09-29-bookshelf/) | autoteam `af7a544` | 从零接入到第一个需求上线 32 分钟；发现 1 个阻塞 bug（普通项目缺 `./autoteam`）和 17 条可改进的地方，见 [improvements.md](runs/2026-09-29-bookshelf/improvements.md) |

每轮目录里：

| 文件 | 内容 |
|---|---|
| `README.md` | 这一轮的完整过程，也是 autoteam 文档「官方示例」的草稿 |
| `improvements.md` | 从用户侧记录的问题和改进建议，以及做得好的地方 |
| `timeline.md` | 带时间的事件记录，每行对应到截图或日志 |
| `requirement.md` | 提给 Planner 的需求原文 |
| `shots/` | 截图 |
| `logs/` | autoteam 各命令的完整输出 |
| `evidence/` | PR、任务、评论、运行记录、Actions 的 JSON 导出（邮箱已替换、会话 ID 和本机路径已删掉） |

为什么截图和文本都要：跑完一轮很难凭记忆说清「闸门到底拦没拦」「这个绿勾是这次的还是上次的」。截图记录当时页面的样子，文本带 sha 和时间戳，能 grep、能 diff，两样合起来才对得上账。

## 工具

| | 做什么 |
|---|---|
| `shoot.mjs` | Playwright 截图：`node e2e/shoot.mjs shot <输出路径> <URL> [--full] [--width 2560] [--click-at x,y] [--anon]` |
| `at.sh` | 在 devcontainer 里跑 `./autoteam`，输出同时写日志：`e2e/at.sh <日志文件> github` |
| `mc.sh` | 对示例项目的 Multica 工作区执行 multica 命令 |
| `wait-runs.sh` | 等某个任务上的运行都结束，打印运行记录 |
| `wait-issue.sh` | 等任务满足条件：`e2e/wait-issue.sh AUTO-4 '.status == "shipping"'` |

第一次用先装依赖、登录（Playwright 只在这里用，是 `e2e/` 自己的 devDependency，项目本身仍然零依赖）：

```bash
cd e2e && npm ci && npx playwright install chromium
node shoot.mjs login     # 弹出浏览器，登录 GitHub 和 Multica 后关掉窗口
```

登录态存在 `e2e/.auth/`，已 gitignore。公开页面（PR、线上站点）加 `--anon` 不用登录；规则集页和 Multica 需要登录。

`at.sh`、`mc.sh` 默认的容器名、容器里的仓库路径、Multica 工作区 ID 是这台机器上的值，换机器用 `E2E_CONTAINER`、`E2E_CONTAINER_REPO`、`E2E_WORKSPACE_ID` 覆盖。

## 下一轮从哪开始

- 书架的初始版本是 `baseline` tag（f95c63c），接入 autoteam 之前的样子。
- 上一个示例（订单命令行，旧版布局）在 `archive/orders-v0.2` 分支。
- 示例项目的 autopilot 已用 `autoteam stop --apply` 暂停，要继续用就 `./autoteam resume --apply`。
