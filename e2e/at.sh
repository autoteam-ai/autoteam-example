#!/usr/bin/env bash
# 在 devcontainer 里跑本仓库的 autoteam（multica 只在容器里登录），输出同时写进日志文件。
# 用法：e2e/at.sh <日志文件> <autoteam 参数...>
#   例：e2e/at.sh e2e/runs/<本轮>/logs/05-github-preview.log github
# 容器名、容器里的仓库路径按本机改：E2E_CONTAINER、E2E_CONTAINER_REPO
set -o pipefail
log=$1; shift
container=${E2E_CONTAINER:-workspace-devcontainer-app-1}
repo=${E2E_CONTAINER_REPO:-/workspace/autoteam-ai/autoteam-example}
mkdir -p "$(dirname "$log")"
docker exec -u ubuntu -w "$repo" "$container" \
  bash -lc 'NO_COLOR=1 bash ./autoteam "$@"' _ "$@" 2>&1 | tee "$log"
