# orders

一个零依赖的 Node 订单命令行工具，用来演示 [autoteam](https://github.com/autoteam-ai/autoteam)：这个仓库的功能由 Planner / Implementer / Reviewer / Auditor 四个 agent 开发，人只负责提需求和批准任务。

```bash
node bin/orders.mjs list                 # 列出 data/orders.json 里的订单
node bin/orders.mjs list --file x.json   # 指定订单文件
```

## 开发

| 命令 | 作用 |
|---|---|
| `make check` | 语法检查 + 单元测试（CI 的 gate 只调它） |
| `make dev` | 检查 Node 版本、跑一次冒烟命令，可以重复执行 |
| `make deploy` | 打包并发布 GitHub Release，只在 GitHub Actions 里运行 |

需要 Node 20 以上，没有 npm 依赖。

## 线上

这个项目的“线上”就是最新的 GitHub Release：合并到 main 后 deploy 工作流会发布一个新版本。验证线上行为：

```bash
gh release download --repo autoteam-ai/autoteam-example --pattern 'orders-*.tgz' --dir /tmp/orders-release
tar -xzf /tmp/orders-release/orders-*.tgz -C /tmp/orders-release
node /tmp/orders-release/bin/orders.mjs list
```
