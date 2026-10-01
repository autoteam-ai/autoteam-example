# 用户侧可改进的流程（示例验证过程中记录）

> 末尾另有「做得好的地方」，写官方示例文档时可以直接用。

被测版本：autoteam main `f1dc4b5`（`npx skills add autoteam-ai/autoteam --skill autoteam`，2026-10-01）。
示例：autoteam-ai/autoteam-example（团队书架，线上是 GitHub Pages），Multica 工作区 `autoteam`。

每条写清楚：用户在哪一步、遇到了什么、为什么是问题、建议怎么改。按严重程度标：
**bug**（行为错误）/ **坑**（能跑但用户容易出错）/ **体验**（多花时间或看不懂）。已提给 autoteam 自举团队的，标了任务编号。

## 规则文件和 autopilot

### 1. [bug] 规则文件的 PR 没有任务编号，合并部署后不会同步指令（HDGCS-164）

- 哪一步：人改 `.autoteam/` 下的文件，用 `autoteam propose` 开 PR（本轮 PR #22），批准、合并、部署。
- 现象：部署运行 36744015619 的通知步骤输出「部署任务清单: []，没有相关任务，跳过通知 Planner」。Planner 没被叫醒，Multica 上 6 个 agent 的指令一直是旧的，直到人手工运行 `autoteam multica --apply`。
- 原因：`deploy.yml` 只在清单非空时通知；而「部署结果」和 `progress` runbook 都写着「触及 `.autoteam/` 或指令源的部署，即使清单为空也要同步」。`propose` 开的 PR 标题默认不带任务编号，正好落在这个缝里。巡检的 `next --check` 也不查指令漂移，所以没人会发现。
- 建议：部署触及 `.autoteam/` 或指令源时，清单为空也通知（带「需要同步」标记）；或者让 `next --check` 查出指令漂移交给巡检。在修好之前，文档里要写明：规则文件 PR 合并后自己跑一次 `autoteam multica --apply`。

### 2. [bug] 项目暂停时运行 `autoteam multica --apply`，新建的 autopilot 是启用的（HDGCS-166）

- 哪一步：项目处于 `autoteam stop` 状态时同步配置。
- 现象：新建的「周度健康报告」状态是 active，项目明明停着它却会按时运行；它又不在 stop 的记录里，`autoteam resume` 也不会管它。
- 建议：项目暂停时，新建的 autopilot 一律暂停并加进暂停记录，resume 时一起恢复。

### 3. [坑] 包里已经不再定义的 autopilot 没有任何提示，resume 还会把它们重新打开（HDGCS-165）

- 哪一步：升级 autoteam 之后同步，再 `autoteam resume`。
- 现象：包里删掉定义的 autopilot（本工作区有 6 个）在 `multica` 预览、apply、doctor 里都看不到；resume 按 stop 时记下的 ID 恢复，把它们也重新打开了，要手工再暂停。
- 建议：预览、apply、doctor 列出本项目里「包里已没有定义」的 autopilot，启用中的报 ⚠️；resume 跳过它们。

### 4. [体验] 项目暂停时，doctor 对每个 autopilot 报一条「paused 状态」

- 哪一步：`autoteam setup` 末尾的 doctor。
- 现象：5 条 ⚠️「autopilot「…」是 paused 状态」，没说这是 `autoteam stop` 造成的，也没说用 `autoteam resume --apply` 恢复。
- 建议：项目有暂停标记时，合成一条「项目已暂停（时间、操作人），autopilot 都是暂停的，恢复用 autoteam resume --apply」。

## 需求和日常运行

### 5. [体验] Planner 请人批准时，说的是「把 AUTO-9 改成 todo」

- 哪一步：拆分完成后 Planner 在父任务上的评论。
- 为什么是问题：拖卡片逐个改状态正是 `autoteam approve` 要替代的做法。一个拆分有多批时，逐个改到 `todo` 还会在后续批次上多叫醒 Planner。
- 建议：intake runbook 里请人批准的话术改成「运行 `autoteam approve AUTO-8 --apply`，或者在界面把子任务改成 todo」。

### 6. [体验] autopilot 指令开头的粗体在任务描述里不生效

- 哪一步：「周度健康报告」建出的任务 AUTO-10，描述第一行显示成 `**开工先检查暂停：**先取得…`。
- 原因：收尾的 `**` 前面是全角冒号、后面紧跟汉字，按 CommonMark 规则不算闭合。autopilot 详情页的渲染器能显示，任务描述的不能。
- 建议：前言改成 `**开工先检查暂停**：先取得…`（冒号放到粗体外面）。

### 7. [体验] Planner 评论里的任务链接指错了

- 哪一步：Planner 处理健康报告后的回复，「拆成 [AUTO-11](…)」的链接 ID 是报告任务 AUTO-10 自己的。
- 建议：intake runbook 里写明建完任务后用返回的 ID 生成链接；或者只写编号，让 Multica 自己识别。

### 8. [体验] 报告任务的标题日期是 UTC

- 哪一步：北京时间 10-01 早上触发的健康报告，任务标题是「周度健康报告 2026-09-30」。
- 原因：Multica 的 `{{date}}` 只按 UTC 展开，和 `AUTOTEAM_TIMEZONE` 无关。
- 建议：在 Multica 那边支持时区；autoteam 这边可以在文档里说明。

## 安装

### 9. [体验] `autoteam init` 结尾的下一步还是三条分开的命令（HDGCS-171）

- 现象：「4. autoteam github … 5. autoteam multica … 6. autoteam doctor」，没有提到一条就能做完的 `autoteam setup`。`autoteam.conf` 模板注释还写着「App 由人创建和安装（autoteam 只核对，不能代建）」，和 `autoteam github --create-apps` 矛盾。
- 建议：下一步改成 `autoteam setup`，分步写法放进进阶说明；注释改成指向 `--create-apps`。

### 10. [坑] 铸 App token 的请求没有超时（HDGCS-170）

- 哪一步：本轮 `autoteam propose` 第一次运行时，开发容器的网络刚恢复，`gh-app-token.sh` 里的 curl 一直挂着，十几分钟没有返回也没有报错。
- 建议：curl 加 `--max-time`，失败时说明是网络问题。

## 做得好的地方

- **从提需求到上线 11 分钟**，人只做了两件事：提需求、运行一次 `autoteam approve AUTO-8 --apply`。
- **拆分 40 秒**：一个子任务，写明为什么做、做什么、不做什么，验收标准全部是带防缓存参数的线上检查。
- **派发 26 秒**：只核对选中的两个 agent 的 runtime 和最近运行，不再跑完整 doctor；Implementer 和 Reviewer 选了不同厂商，理由写在评论里。
- **`approve` 自己核对唤醒**：放行后确认 Planner 的运行已生成，人不用去看。
- **部署通知带任务清单**：deploy.yml 算出这次上线的是 `["AUTO-9"]`，Planner 只验收它；父任务的整体验收只在批次屏障那一次做，没有重复。
- **不需要自定义状态**：评审通过后停在「审核中」，线上验收通过直接「已完成」，看板就是 Multica 自带的几列。
- **空巡检很便宜**：`autoteam next --check` 先判断，清单为空时 23 秒结束，输出 524 token，不发评论。
- **一份健康报告顶四份**：整合审计、agent 成绩单、老代码巡检、规格对账合在一起，4 分钟出完。规格对账找出了「做了但标准没写」的一处，Planner 当场补进验收标准；重复代码拆成一个 low 优先级任务放进待审核，已有的 AUTO-7 不重复建。
- **`autoteam setup` 一条命令**：两边预览一次，确认后执行，最后自动跑 doctor。
- **`autoteam propose`**：人改规则文件不用再手工铸 App token，PR 由 Implementer App 开出，人只批准。
