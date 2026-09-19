# AGENTS.md

orders：一个零依赖的 Node 命令行工具，用来演示 ai-workflow。

- 只用 Node 标准库，不引入 npm 依赖：这样 `make check` 不需要安装步骤，任何机器上都能直接跑。
- 业务逻辑放 `src/`，`bin/orders.mjs` 只做参数解析和输出：`src/` 里的函数才方便写单元测试。新增命令也按这个分法。
- 日期一律按 `YYYY-MM-DD` 字符串比较，不要用 `new Date()` 解析：时区会让边界上的日期差一天。
- 线上就是最新的 GitHub Release。验收时下载最新发布包运行，不要用工作目录里的代码代替：
  `gh release download --repo songhuangcn/ai-workflow-example --pattern 'orders-*.tgz' --dir <临时目录>`，解压后 `node bin/orders.mjs ...`。

<!-- >>> ai-workflow >>> -->
## AI 团队工作流

本仓库由 Planner / Implementer / Reviewer / Auditor 四个 agent 协作开发，角色指令和配置在 `ops/agents/`。

- 全部检查只用 `make check`（CI 也只调它）；起环境用 `make dev`，可以重复执行。
- 不要声称验证通过，除非你真的跑了；因故没跑，就写明没跑什么、为什么。
- PR 标题以任务编号开头（如 `HDGCS-123 按日期导出订单`），不写 `Closes` / `Fixes` 等关闭关键字：任务要等线上验收通过才算完成。
- `.github/`、`ops/agents/`、`Makefile`、`.jscpd.json` 是约束 agent 的规则文件，只能由人批准修改；需要改时写进评论的“范围外发现”。
<!-- <<< ai-workflow <<< -->
