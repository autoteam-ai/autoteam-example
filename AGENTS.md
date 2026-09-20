# AGENTS.md

orders：一个零依赖的 Node 命令行工具，用来演示 ai-workflow。

- 只用 Node 标准库，不引入 npm 依赖：这样 `make check` 不需要安装步骤，任何机器上都能直接跑。
- 业务逻辑放 `src/`，`bin/orders.mjs` 只做参数解析和输出：`src/` 里的函数才方便写单元测试。新增命令也按这个分法。
- 日期一律按 `YYYY-MM-DD` 字符串比较，不要用 `new Date()` 解析：时区会让边界上的日期差一天。
- 线上就是最新的 GitHub Release。验收时下载最新发布包运行，不要用工作目录里的代码代替：
  `gh release download --repo songhuangcn/ai-workflow-example --pattern 'orders-*.tgz' --dir <临时目录>`，解压后 `node bin/orders.mjs ...`。
