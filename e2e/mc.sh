#!/usr/bin/env bash
# 在 devcontainer 里对示例项目的 Multica 工作区执行 multica 命令。
# 工作区 ID、容器名按本机改：E2E_WORKSPACE_ID、E2E_CONTAINER
exec docker exec -i -u ubuntu \
  -e MULTICA_WORKSPACE_ID="${E2E_WORKSPACE_ID:-a46cb0a2-9a39-4b53-81bd-f305cb5112d4}" \
  "${E2E_CONTAINER:-workspace-devcontainer-app-1}" multica "$@"
