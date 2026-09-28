# AGENTS.md

团队书架：零依赖的 Node 静态网站生成器，`data/books.json` → `dist/`。

- 只用 Node 标准库，不引入 npm 依赖：构建和测试不需要安装步骤，任何有 Node 22 的机器都能直接跑。
- 业务逻辑放 `src/`（数据校验、排序在 `books.mjs`，渲染在 `html.mjs`，写文件在 `build.mjs`），`bin/` 只做参数解析和 IO：`src/` 里的纯函数才好写单元测试。
- 页面里所有来自数据的文本都要经过 `escapeHtml`：书名、作者、备注里会有 `'`、`&`、`<` 这类字符。
- 页面里的链接一律用相对路径，不要以 `/` 开头：站点部署在子路径下，绝对路径会指到别的站点。
- 日期一律是 `YYYY-MM-DD` 字符串，按字符串比较，不要用 `new Date()` 解析：时区会让边界上的日期差一天。
- 书单数据有错时要让构建失败（`validateBooks` 抛错），不要静默跳过。
- 线上是 GitHub Pages：<https://autoteam-ai.github.io/autoteam-example/>。合并到 main 后 `make deploy` 把站点推到 `gh-pages` 分支，等线上 `version.json` 变成这次的提交才算部署成功。`gh-pages` 只由部署写，不要手工改，也不要基于它开 PR；`dist/` 是构建产物，不入库。
- 验收看线上，不要用工作目录里的构建代替。Pages 有 10 分钟 CDN 缓存，每个请求都带查询参数：先 `curl -fsS "https://autoteam-ai.github.io/autoteam-example/version.json?t=$(date +%s)"` 确认 sha 是要验收的提交，再用同样的方式查页面和 `api/*.json`。

<!-- >>> autoteam >>> -->
## AI 团队工作流

本仓库由 Planner / Implementer / Reviewer / Auditor 四个 agent 协作开发，角色指令和配置在 `.autoteam/`。

- 全部检查只用 `make check`（CI 也只调它）；起环境用 `make dev`，可以重复执行。
- 不要声称验证通过，除非你真的跑了；因故没跑，就写明没跑什么、为什么。
- PR 标题以任务编号开头（如 `AUTO-123 按日期导出订单`），不写 `Closes` / `Fixes` 等关闭关键字：任务要等线上验收通过才算完成。
- 约束 agent 的规则文件以目标分支的 CODEOWNERS 为准，改动须由相应 codeowner 批准才能合并。Implementer 只在任务明确要求时才改这些文件并提 PR；没有任务要求就不要顺手改，发现问题写进评论的“范围外发现”。
<!-- <<< autoteam <<< -->
