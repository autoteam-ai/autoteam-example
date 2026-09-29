#!/usr/bin/env bash
# 等任务满足条件（jq 表达式作用于 issue get 的 JSON），或超时
# 用法：./wait-issue.sh <任务> '<jq 条件>' [超时秒数，默认 3600]
here=$(cd "$(dirname "$0")" && pwd)
issue=$1; cond=$2; timeout=${3:-3600}; start=$(date +%s)
while :; do
  json=$("$here/mc.sh" issue get "$issue" --output json 2>/dev/null)
  if [ -n "$json" ] && jq -e "$cond" >/dev/null 2>&1 <<<"$json"; then break; fi
  [ $(( $(date +%s) - start )) -gt "$timeout" ] && { echo "超时"; break; }
  sleep 30
done
jq '{identifier, status, assignee_id, updated_at}' <<<"$json"
"$here/mc.sh" issue runs "$issue"
