#!/usr/bin/env bash
# 等某个任务上没有 running/queued 的运行（或超时），然后打印运行记录和最新评论
# 用法：./wait-runs.sh <任务> [超时秒数，默认 3600]
here=$(cd "$(dirname "$0")" && pwd)
issue=$1; timeout=${2:-3600}; start=$(date +%s)
sleep 30
while :; do
  busy=$("$here/mc.sh" issue runs "$issue" --active --output json 2>/dev/null | jq "length")
  [ "$busy" = 0 ] && break
  [ $(( $(date +%s) - start )) -gt "$timeout" ] && { echo "超时，仍有 $busy 个运行"; break; }
  sleep 30
done
"$here/mc.sh" issue runs "$issue"
"$here/mc.sh" issue get "$issue" --output json | jq '{identifier, status, assignee_id}'
