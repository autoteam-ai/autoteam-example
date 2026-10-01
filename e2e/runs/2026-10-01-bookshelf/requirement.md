现在只能按标签找书，同一位作者的书散在各处，也看不出谁写了哪几本。

要做的：

- 作者从每本书的 `author` 字段拆出来：多位作者用英文逗号分隔（比如 `Gene Kim, Kevin Behr, George Spafford`），拆开后去掉首尾空格。每位作者一个 id，由名字生成：小写字母、数字和连字符，标点去掉（比如 `martin-kleppmann`、`david-r-ohallaron`）。两位不同的作者生成了同一个 id，构建要失败。
- 首页：每本书的每位作者都能点，进到这位作者的页面。
- 每位作者一个页面 `authors/<id>.html`：标题是作者名，列出他参与的书（排序和首页一致），能回到首页。
- 接口：`api/books.json` 里每本书带上 `authors`（每位作者的 id 和名字）；新增 `api/authors.json`，列出每位作者的 id、名字和书数，按书数从多到少排，书数相同按名字排。

在线上验收：https://autoteam-ai.github.io/autoteam-example/
