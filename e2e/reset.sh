#!/usr/bin/env bash
# 把这个仓库重置回 baseline，开始新一轮 autoteam 版本验证。
#
# 为什么需要：上一轮留下的代码、规则文件、分支和 PR 会让人分不清"这次跑出来的"
# 和"上次剩下的"。重置之后 main 上只剩 orders 的基础功能，autoteam 生成的文件
# 全部由这一轮重新生成。
#
# e2e/ 目录不动——框架和历史证据要跨轮保留。
# Multica 侧不自动清理，只列出还没关闭的任务，由人决定取消还是留着。
#
# 用法：e2e/reset.sh [--yes]
set -euo pipefail

cd "$(dirname "$0")/.."
yes=${1:-}

repo=$(gh repo view --json nameWithOwner --jq .nameWithOwner)
branch=$(gh api "repos/$repo" --jq .default_branch)
prefix=$(sed -n 's/^AUTOTEAM_ISSUE_PREFIX=//p' ops/agents/autoteam.conf 2>/dev/null | tail -n 1 | tr -d '[:space:]')

if [ -n "$(git status --porcelain)" ]; then
  echo "工作树不干净，先提交或丢弃改动" >&2
  exit 1
fi

echo "== 将要重置 $repo =="
echo "  · main 回到 baseline tag 的内容（只保留 e2e/）"
open_prs=$(gh pr list --repo "$repo" --state open --json number --jq '[.[].number] | join(" ")')
[ -n "$open_prs" ] && echo "  · 关闭未合并的 PR：$open_prs"
stale=$(gh api "repos/$repo/branches" --jq "[.[] | select(.name != \"$branch\") | .name] | join(\" \")")
[ -n "$stale" ] && echo "  · 删除分支：$stale"

if [ "$yes" != --yes ]; then
  printf '继续？[y/N] '
  read -r ans
  [ "$ans" = y ] || [ "$ans" = Y ] || exit 1
fi

for n in $open_prs; do
  gh pr close "$n" --repo "$repo" --comment "E2E 重置：开始新一轮验证" >/dev/null
  echo "  关闭 PR #$n"
done
for b in $stale; do
  gh api -X DELETE "repos/$repo/git/refs/heads/$b" >/dev/null 2>&1 && echo "  删除分支 $b"
done

git fetch -q --prune origin
git checkout -q "$branch"
git pull -q

work="chore/e2e-reset-$(date -u +%Y%m%d%H%M%S)"
git checkout -q -b "$work"
git checkout baseline -- .
# baseline 里没有、又不属于 e2e 的，都是上一轮 autoteam init 生成的
git ls-files | grep -v '^e2e/' | while read -r f; do
  git cat-file -e "baseline:$f" 2>/dev/null || git rm -q --ignore-unmatch "$f"
done

if git diff --cached --quiet && [ -z "$(git status --porcelain)" ]; then
  echo "已经是基线状态，不用改"
  git checkout -q "$branch" && git branch -qD "$work"
else
  git add -A
  git commit -q -m "chore: 重置到 E2E 基线

删掉的是上一轮 autoteam init 生成的文件，这一轮会用新版本重新生成。"
  git push -q -u origin "$work"
  url=$(gh pr create --repo "$repo" --base "$branch" --head "$work" \
    --title "重置到 E2E 基线" \
    --body "开始新一轮 autoteam 版本验证。删掉的是上一轮生成的规则文件，这一轮重新生成。")
  echo "  $url"
  echo "  等 gate 跑完后合并…"
  gh pr checks "$url" --watch >/dev/null 2>&1 || true
  gh pr merge "$url" --squash >/dev/null && echo "  已合并（有合并队列时会排队，稍后自动合并）"
  git checkout -q "$branch"
fi

if [ -n "$prefix" ]; then
  echo
  echo "== Multica 里还没关闭的任务（自己决定要不要取消）=="
  multica issue list --status-category unstarted --status-category started 2>/dev/null |
    grep -E "^$prefix-" | head -20 || echo "  （查不到，跳过）"
fi

echo
echo "重置完成。下一步：装新版 autoteam，重新 init，然后跑一个需求。"
