# e2e：每轮 autoteam 验证的重置和留证

这个目录跨轮保留，`reset.sh` 不会动它。

## 一轮验证的流程

```bash
e2e/reset.sh                      # 1. main 回到 baseline，关掉旧 PR、删掉旧分支
npx skills add autoteam-ai/autoteam --skill autoteam -a claude-code -y
bash .claude/skills/autoteam/scripts/autoteam init --workspace hdgcs --human Song
                                  # 2. 用新版本重新生成规则文件，适配后开 PR 合并
bash .claude/skills/autoteam/scripts/autoteam github --apply --trial
bash .claude/skills/autoteam/scripts/autoteam multica --apply
                                  # 3. 跑一个真实需求，观察各角色流转
node e2e/record.mjs --run v0.2.0 --pr 8 --pr 9 --issue HDGCS-21
                                  # 4. 留证：截图 + 文本时间线
```

## 为什么要重置

上一轮留下的代码、规则文件、分支和 PR 会让人分不清"这次跑出来的"和"上次剩下的"。
`baseline` tag 指向只有 orders 基础功能的那个提交，重置后 main 回到它，autoteam
生成的文件全部由这一轮重新生成。

Multica 侧不自动清理——历史任务有参考价值，`reset.sh` 只列出还没关闭的，由人决定。

## 留下什么证据

| 文件 | 内容 | 为什么 |
|---|---|---|
| `runs/<id>/timeline.md` | 被测版本、分支上生效的规则、每个 PR 的状态和评论、Multica 任务的评论和运行记录、Release 列表 | 带 sha 和时间戳，能 grep 能 diff，判断"是不是这轮跑的"比截图可靠 |
| `runs/<id>/*.png` | 规则集页、PR 概览、PR 检查、Release 列表 | 记录当时页面上的样子：闸门到底拦住了没有、绿勾是怎么来的 |
| `runs/<id>/README.md` | 索引和结论 | 跑完自己补结论 |

## 截图的登录

`record.mjs` 用 Playwright 的持久化登录态（`e2e/.auth/`，已 gitignore）。首次运行会
弹出有头浏览器让你登录 GitHub，之后都是无头。随时可以重新登录：

```bash
node e2e/record.mjs --login
```

Playwright 是 devDependency，`make check` 不依赖它，这个项目运行时仍然零依赖。

## 证据目录会长大

每轮留下一份 `runs/<id>/`，里面有几张整页截图（每张几百 KB）。留最近两三轮够用了，
更早的直接删目录——历史在 git 里还能翻到。
