# 团队书架

一个零依赖的 Node 静态网站生成器：把 `data/books.json` 里的书单生成成网页和 JSON 接口。

它是 [autoteam](https://github.com/autoteam-ai/autoteam) 的官方示例项目：接入 autoteam 之后，这个仓库的功能由 Planner / Implementer / Reviewer / Auditor 四个 agent 开发，人只负责提需求和批准任务。

```bash
npm test        # 单元测试
npm run build   # 生成 dist/：index.html、api/books.json、version.json
npm start       # 生成并在 http://localhost:4173/ 预览
```

需要 Node 22 以上，没有 npm 依赖。

## 书单格式

`data/books.json` 是一个数组，每本书：

| 字段 | 说明 |
|---|---|
| `id` | 小写字母、数字和连字符，全书单唯一，也是页面里的锚点 |
| `title`、`author` | 书名、作者 |
| `year` | 出版年份，整数 |
| `status` | `reading`（在读）/ `want`（想读）/ `done`（读完） |
| `added` | 加入书单的日期，`YYYY-MM-DD` |
| `note` | 可选，一句话备注 |

数据不合法时构建直接失败，不会生成缺字段的页面。
