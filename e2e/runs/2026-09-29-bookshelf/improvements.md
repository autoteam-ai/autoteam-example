# 用户侧可改进的流程（示例验证过程中记录）

> 末尾另有「做得好的地方」，写官方示例文档时可以直接用。

被测版本：autoteam main `af7a544`（`npx skills add autoteam-ai/autoteam --skill autoteam`，2026-09-29）。
示例：autoteam-ai/autoteam-example（团队书架，线上是 GitHub Pages），Multica 工作区 `autoteam`。

每条写清楚：用户在哪一步、遇到了什么、为什么是问题、建议怎么改。按严重程度标：
**bug**（行为错误）/ **坑**（能跑但用户容易出错）/ **体验**（多花时间或看不懂）。

## 安装和配置

### 1. [bug] `autoteam multica --apply` 偶发报「默认 profile 没有配置服务器」

- 哪一步：第 5 步 `autoteam multica --apply`。同一台机器上刚跑过的预览是好的，apply 立刻失败，重跑又好了。
- 原因：`bin/autoteam` 开了 `set -o pipefail`，`lib/multica.sh:58` 用 `multica config show | grep -Eq '^server_url:...'` 判断默认 profile。`grep -q` 读到第 2 行就退出，multica 还在往管道写，收到 SIGPIPE，管道返回非 0，被 `!` 当成「没配置」。在 devcontainer 里复现：开 pipefail 时 200 次误判 28 次，关掉 0 次。
- 为什么是问题：约 14% 的概率在第一次 apply 就失败，错误信息指向「没配置服务器」，用户会去重跑 `multica setup`，方向完全错了。
- 建议：先把输出存进变量再匹配（`out=$(multica config show 2>/dev/null); grep -Eq ... <<<"$out"`）。同样写法还有 `multica.sh:750`、`github.sh:365`、`doctor.sh:196`（`gh secret list | grep -qx`，输出短，概率低，但同一类问题）。可以加一条 shellcheck 之外的 lint：pipefail 下禁止 `| grep -q`。

### 2. [坑] 一个 Multica 工作区放两个项目，apply 会改掉另一个项目的 autopilot

- 哪一步：最初想复用自举项目所在的工作区 `hdgcs`，apply 前读代码发现的，没有实际触发。
- 原因：`multica.sh` 的 `multica_autopilot` 和 `doctor.sh` 按 **标题** 在整个工作区找 autopilot，不看 `project_id`。第二个项目 apply 时会找到第一个项目的「推进巡检」等 10 个 autopilot，把它们改绑到自己的项目和 agent 上；「部署结果」的 webhook 也会误报「已存在」（如果仓库里还留着旧 secret，doctor 还会显示 ✅）。
- 这次的做法：新建工作区 `autoteam` 绕开。
- 建议：按 `(title, project_id)` 匹配；或者至少在文档和 `autoteam multica` 预览里明确「一个工作区只放一个 autoteam 项目」，预览时发现同名 autopilot 绑在别的项目上就报 ❌。agent 名字直接取 registry 键名，同一工作区也会撞名，文档要说明加前缀。

### 3. [坑] `npx skills add` 装的 skill 目录没进 `.gitignore`，提交了会被自己的 gate 拦下

- 哪一步：第 3 步提交。`npx skills add ... -a claude-code` 把 skill 复制到 `.claude/skills/autoteam/`（约 3000 行 shell），同时生成 `skills-lock.json`。
- 为什么是问题：quickstart 和 SKILL.md 都没说这两样要不要提交。`git add -A` 的用户会把 skill 一起提交，gate 的 `pr-size` 不排除 `.claude/**`，接入 PR 直接超过 400 行上限；jscpd 也会扫到它。
- 建议：`autoteam init` 的 `.gitignore` 受管块加上 `.claude/skills/`、`.agents/skills/`（或者在文档里写清楚：skill 是本机工具不入库，`skills-lock.json` 入库记版本）。

### 4. [体验] 多个仓库共用一组 GitHub App 时，`autoteam github` 的三条 ⚠️ 没法消除

- 哪一步：第 4 步预览。三个 App 装在整个组织上（autoteam 主仓库也在用），预览提示「改成只选 autoteam-example」。
- 为什么是问题：照做会让主仓库的 agent 失去权限。这是正当的多仓库用法，但每次预览和 doctor 都会亮黄灯，用户分不清是该处理还是可以忽略。
- 建议：提示改成「装在组织全部仓库上：如果这组 App 只给部分仓库用，改成 Only select repositories 并勾选它们」；或者装在「选定的多个仓库」上时不报警。

### 5. [体验] 生成的 AGENTS.md 受管块里，PR 标题例子还是旧示例的「按日期导出订单」

- 哪一步：第 1 步 `init` 后看 AGENTS.md。例子 `AUTO-123 按日期导出订单` 来自旧的订单示例，和新项目无关。
- 建议：换成中性的例子（如 `AUTO-123 修复登录页跳转`），或者只写格式 `<任务编号> <一句话说明>`。

### 6. [体验] `make deploy` 在「推完」和「线上生效」之间有延迟，模板和适配指南都没提

- 哪一步：第 2 步适配 `make deploy`。GitHub Pages 推完 `gh-pages` 还要等发布，CDN 还有 10 分钟缓存。
- 为什么是问题：`deploy.yml` 在 `make deploy` 结束后立刻通知 Planner。如果 `make deploy` 只是「推上去」，Planner 被叫醒时线上还是旧版本，验收会误判为不通过（或者拿旧版本当新版本验收）。CDN、K8s 滚动发布、Pages、Vercel 都有这个问题。
- 这次的做法：`make deploy` 推完后轮询线上 `version.json`（带查询参数绕过缓存），换成本次提交才返回成功。
- 建议：`references/adapt-make.md` 和 `docs/setup/repo.md` 加一条原则：「`make deploy` 要等线上真的换成这个提交才返回成功」，并建议项目暴露一个版本接口（`/version.json`、`/healthz` 带 sha），Planner 验收第一步就是核对它。

### 7. [体验] 定时任务一 apply 就全部开始跑，没有「只开部署结果」的试跑档位

- 哪一步：第 5 步。默认频率下推进巡检每 2 小时一次、每日摘要每天 9 点，apply 完立刻生效。
- 为什么是问题：第一次演练只想验证一条需求，却要承担所有定时任务的额度；`--paused` 会把「部署结果」webhook 也停掉，Planner 就收不到部署通知。
- 建议：加一个 `--trial-run`（或 `--paused` 保留 webhook 类 autopilot），只让「部署结果」和「推进巡检」生效；演练结束用 `autoteam stop --apply` 收尾。文档的 first-run 最后补一步「演练完不打算继续用就 `autoteam stop --apply`」。

### 8. [体验] 命令输出里没有 Multica 网页链接

- 哪一步：第 5、6 步。apply 和 doctor 只打印 ID，用户要自己拼 `https://multica.ai/<工作区>/agents`、`/autopilots` 去看（直接开 `https://multica.ai/<工作区>` 是 404）。
- 建议：apply 结束时打印工作区的 agents / autopilots / 项目看板链接；doctor 的 ❌ 附上对应页面链接。

### 9. [体验] doctor 对远端 runtime 的私钥提示重复 6 行

- 哪一步：第 7 步 doctor。6 个 agent 都在同一台远端机器上，每个 agent 打一行「不在本机，私钥要到那台机器上检查」。
- 建议：按 runtime 机器聚合成一行：「devcontainer-cloud 上的 6 个 agent 用到 implementer / reviewer / planner 三把私钥，到那台机器上跑 `autoteam doctor` 检查」。

### 10. [体验] autoteam 必须和「已登录的 multica」在同一台机器上跑，文档没点明

- 哪一步：第 0 步。我的 host 上 multica 没登录，登录态在 devcontainer 里；gh 两边都有。
- 为什么是问题：第 0 步只写「`multica version` 能用」，版本能打印不代表登录了；在 host 上跑 `autoteam multica` 会报 profile 没配置（和第 1 条的误报信息一模一样，更难分辨）。
- 建议：第 0 步改成 `multica auth status` 能看到用户；报错信息区分「没登录」和「没配置服务器」。

## 运行（跑需求）

### 11. [bug，阻塞] 普通项目里没有 `./autoteam`，所有 agent 都卡在「开工先检查暂停」

- 哪一步：第 7 步提第一个需求（AUTO-2）。Planner 41 秒就结束了，评论说 `bash ./autoteam status --check` 报 `No such file or directory`，按规则停止并报告给人，什么都没做。
- 原因：`instructions/_preamble.md` 要求每个角色、每个 autopilot 开工前跑 `bash ./autoteam status --check`；planner.md、deploy-result.md 部署后同步指令也写的是 `bash ./autoteam multica --apply`。只有 autoteam 自己的仓库根目录有 `./autoteam`（软链到 `skills/autoteam/bin/autoteam`），`autoteam init` 不生成它，文档也没提。**自举验证发现不了这个问题**，因为那个仓库恰好有这个文件。
- 为什么严重：接入完 doctor 全绿，第一个需求就卡死；而且所有 agent 都要先过这个检查，Implementer 也开不了工，没法让团队自己修，只能人来改（又要走「App 推、人批」的绕行流程，见第 13 条）。
- 这次的做法：示例仓库根目录加一个 `./autoteam` 入口（PR #15）：优先用本机 skill，没有就按固定提交从 codeload 下载到 `~/.cache/autoteam/cli/<提交>`；CODEOWNERS 在受管块外保护它。
- 建议：`autoteam init` 生成这个入口（模板里固定当前版本的提交，`autoteam upgrade` 负责更新），CODEOWNERS 受管块加上 `/autoteam`；doctor 加一项「仓库里的 `./autoteam` 能跑 `status --check`」。另外，指令里的 `./autoteam` 最好能被 runtime 上预装的 CLI 替代（比如先找 `./autoteam`，再找 PATH 上的 `autoteam`），避免每个 checkout 都依赖下载。

### 12. [体验] agent 的语言不统一：Planner 第一条评论是英文，Codex 的提交信息是英文

- 哪一步：AUTO-2 的第一条评论。需求、AGENTS.md、角色指令全是中文，Planner（Claude Code）回复是英文（之后的评论又变回中文）；impl-codex 的提交信息是 `feat: add book tags and tag API` 这种英文 conventional commit，而 PR 标题和描述是中文。
- 为什么是问题：人要在 Multica 里读所有报告和提问，语言不一致增加负担；团队成员不一定都读英文。
- 建议：`autoteam.conf` 加 `AUTOTEAM_LANGUAGE`（默认跟 init 时的系统语言），前言里写一句「评论、PR 描述用 <语言>」。

### 13. [体验] 人改规则文件要「App 推、人批」，没有现成命令

- 哪一步：第 11 条的修复。规则集开了 `require_last_push_approval` 和 Code Owner 审批，人自己推的 PR 只有人能批，而人又是推送者，合不进去。
- 这次的做法：按 troubleshooting 的说明，另开一个 clone，`gh-app-token.sh --setup-git implementer`，用 Implementer App 身份提交、推送、`--run implementer gh pr create`，再用人的账号批准、进合并队列。
- 为什么是问题：步骤多，要懂凭据助手和 App token；troubleshooting 里是报错之后才看得到的一行说明。接入后第一次需要人改规则的场合（比如本次）用户就会卡住。
- 建议：提供 `autoteam propose`（或 `open-pr.sh --as implementer`）：把当前工作区的改动用 Implementer App 身份开成 PR，人只需批准。first-run 文档里说明「人改规则文件怎么走」。

### 14. [体验] 「按优先级派发」的适用范围写得有歧义，同一个 Planner 前后两次运行说法相反

- 哪一步：AUTO-3（第 1 批）验收通过后。「部署结果」那次运行里 Planner 说「AUTO-4 是 medium，按规则等下次巡检再派」；一分钟后，Multica 的批次屏障唤醒了父任务 AUTO-2 的 Planner，它又直接把 AUTO-4 派发了。
- 原因：planner.md 的「按优先级派发」（medium / low 等下次巡检）写在「放行分级」（自主放行）一节里；「派发」一节只说「多个可派发任务时按它排先后」。两次运行对「人批准的 medium 任务要不要推迟」理解不同。
- 为什么是问题：这次靠批次屏障的唤醒兜住了，只耽搁 2 分钟；但如果只有部署结果那次运行（比如父任务没有分批），medium 任务会白等到下次巡检（默认每 2 小时）。用户在评论里看到「等下次巡检」也会困惑。
- 建议：写明「人批准的任务、前一批完成后解锁的任务，被叫醒时直接派发；按优先级推迟只用于自主放行的任务」，或者把这条规则挪到「派发」一节，写清对谁生效。

### 15. [体验] 最后一批验收后，两个 Planner 运行并发做了同一次整体验收

- 哪一步：AUTO-4（最后一批）上线后。00:02 的「部署结果」运行验收完 AUTO-4，顺手做了父任务 AUTO-2 的整体验收并设为 done；00:03 Multica 的批次屏障又唤醒了父任务的 Planner，它把整体验收重做了一遍。AUTO-2 上 24 秒内出现两条【验收通过】。
- 为什么是问题：重复花了一次 Planner（最强模型）的额度；人收到两条 @ 通知，内容还略有出入（一条写「每本 2 个标签」，一条写「每本 1～3 个」），会怀疑哪条是准的。
- 建议：约定整体验收只在一个入口做：「部署结果」只验收子任务，父任务的整体验收交给批次屏障唤醒的那次运行；或者开工先查父任务是否已经 done、是否已有【验收通过】评论，有就跳过。

### 16. [体验] 暂停后的 autopilot 在列表里仍显示「下次运行」时间

- 哪一步：`autoteam stop --apply` 之后。10 个 autopilot 都是 paused，但 `multica autopilot list` 的 NEXT_RUN 列仍显示「推进巡检 1 小时后」「每日摘要 46 分钟后」；到点之后变成「5 分钟前」「1 小时前」。
- 已核实：暂停是生效的。推进巡检（10:00）、每日摘要（09:00）到点都没有运行，Planner 最后一次运行是 stop 之前的 08:09。
- 也核实了 webhook：暂停期间合并 PR #18，deploy 通知照常发出、没有报错，但「部署结果」没有产生运行。也就是说**暂停期间的部署通知会被直接丢掉**，resume 之后也不会补跑，待上线的任务只能等巡检补查。
- 为什么是问题：用户做完 stop，最关心的就是「还会不会跑、还会不会花额度」，这一列让人不敢确定，只能等到点再查运行记录。
- 建议：`autoteam stop --apply` 结束时明确说「暂停的 autopilot 不会按计划运行，列表里的下次运行时间可以忽略；暂停期间的部署通知会丢失，resume 后巡检会补查待上线的任务」；`autoteam status` 列出每个 autopilot 的状态和最后一次运行时间，让人一眼确认停住了。（NEXT_RUN 的显示本身是 Multica 的问题，可以反馈给 Multica。）

### 17. [体验] `autoteam stop` 的预览把同一批 autopilot 列了两遍

- 哪一步：`autoteam stop` 预览。「停止前 active 的 autopilot」和「将暂停的 autopilot」是同样的 10 行。
- 建议：只列一次；两者不同时（比如有原本就 paused 的）再分开列。

### 18. [体验] 任务的 token 统计不含挂在 autopilot 名下的运行

- 哪一步：演练结束统计额度。`multica issue usage` 只统计挂在任务上的运行；「部署结果」「推进巡检」这类 run_only autopilot 的运行（包括这次两个子任务的线上验收）不在任何任务名下，按任务加起来会少算。
- 建议：每日摘要或成绩单里按 agent 汇总用量，并单独列出 autopilot 运行的用量；文档的 metrics 页说明这个口径。


## 做得好的地方（写文档时可以强调）

- **接入过程很顺**：`init` → 适配 → PR → `github --apply` → `multica --apply` → `doctor`，除去两个 bug，半小时内完成；预览输出把要改的东西一条条列清楚，适合截图放进文档。
- **检查失败就停、报告给人**：`./autoteam` 缺失时 Planner 没有硬着头皮继续，而是 41 秒内停下，写清楚原因和两个方案，并推荐其中一个。
- **拆分质量高**：两个子任务都有「为什么做 / 要做什么 / 不做什么 / 验收标准」，验收写成带防缓存参数的线上 curl 命令，第 2 批还提前点出了「tags/ 子目录下相对路径」这个坑。
- **从需求到上线 32 分钟，全程只有一次人工批准**：07:31 提需求，08:03 父任务整体验收通过（其中 8 分钟卡在第 11 条）。两批子任务都是评审一次通过、线上验收一次通过。
- **经验在批次间传递**：派发第 2 批时，Planner 把第 1 批评审里的建议（`validateBooks` 要传 `tags`）作为提示转给了 Implementer。
- **验收很扎实**：Planner 先核对线上 `version.json` 的 sha 是合并提交，再逐条跑验收命令；整体验收时数了首页和标签页的 102 个 `href`，并逐个请求站内链接确认返回 200。
- **人工反馈回原任务**：人在 backlog 上提了一处修改，Planner 在原任务上改描述、同步父任务的验收标准，没有新建任务。
