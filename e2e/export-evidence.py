#!/usr/bin/env python3
"""导出一轮验证的证据到 <本轮目录>/evidence/：任务、评论、运行、时间线、agent 运行、PR、Actions。
邮箱替换成 <redacted>，删掉 session_id、work_dir 等本机信息。

用法：e2e/export-evidence.py <本轮目录> <开始 UTC> <结束 UTC> <任务,...> [PR,...]
  例：e2e/export-evidence.py e2e/runs/2026-10-01-bookshelf 2026-09-30T23:25:00Z 2026-10-01T00:05:00Z AUTO-8,AUTO-9 23
agent 运行和 Actions 只导出开始、结束时间之间的。"""
import json, re, subprocess, sys, os

if len(sys.argv) < 5:
    sys.exit(__doc__)
MC = os.path.join(os.path.dirname(os.path.abspath(__file__)), "mc.sh")
OUT = os.path.join(sys.argv[1], "evidence")
SINCE, UNTIL = sys.argv[2], sys.argv[3]
ISSUES = sys.argv[4].split(",")
PRS = sys.argv[5].split(",") if len(sys.argv) > 5 and sys.argv[5] else []
REPO = os.environ.get("E2E_REPO", "autoteam-ai/autoteam-example")

EMAIL = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
DROP = {"session_id", "work_dir", "relative_work_dir"}

def clean(x):
    if isinstance(x, dict):
        return {k: clean(v) for k, v in x.items() if k not in DROP}
    if isinstance(x, list):
        return [clean(v) for v in x]
    if isinstance(x, str):
        return EMAIL.sub("<redacted>", x)
    return x

def run(cmd):
    return json.loads(subprocess.run(cmd, capture_output=True, text=True, check=True, timeout=300).stdout)

def mc(*a):
    return run([MC, *a, "--output", "json"])

def save(name, data):
    with open(os.path.join(OUT, name), "w") as f:
        json.dump(clean(data), f, ensure_ascii=False, indent=1)
        f.write("\n")

os.makedirs(OUT, exist_ok=True)
for i in ISSUES:
    save(f"{i}.json", mc("issue", "get", i))
    save(f"{i}.comments.json", mc("issue", "comment", "list", i))
    save(f"{i}.runs.json", mc("issue", "runs", i))
    save(f"{i}.timeline.json", mc("issue", "timeline", i))

for a in mc("agent", "list"):
    tasks = [t for t in mc("agent", "tasks", a["id"]) if SINCE <= t["created_at"] <= UNTIL]
    save(f"agent-{a['name']}.tasks.json", tasks)

for p in PRS:
    save(f"pr-{p}.json", run(["gh", "pr", "view", p, "-R", REPO, "--json",
                              "number,title,author,state,createdAt,mergedAt,mergeCommit,additions,deletions,changedFiles,reviews,statusCheckRollup,body"]))

runs = run(["gh", "run", "list", "-R", REPO, "--limit", "40", "--json",
            "databaseId,workflowName,displayTitle,event,status,conclusion,createdAt,updatedAt,headSha"])
save("actions-runs.json", [r for r in runs if SINCE <= r["createdAt"] <= UNTIL])
print("exported to", OUT)
