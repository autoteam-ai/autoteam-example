# 团队书架。check / dev / deploy 是 autoteam 约定的三个入口：
# gate.yml 只调 `make check`；deploy.yml、rollback.yml 调 `make deploy`。
.PHONY: check dev deploy

NODE ?= node
PORT ?= 4173
REPO ?= $(or $(GITHUB_REPOSITORY),autoteam-ai/autoteam-example)
SITE_URL ?= https://autoteam-ai.github.io/autoteam-example

check: ## 全部检查：指令预算、Node 版本、语法检查、单元测试、完整构建一次
	@bash .autoteam/scripts/check-instruction-budget.sh
	@$(NODE) -e 'if (+process.versions.node.split(".")[0] < 22) { console.error("需要 Node 22 以上，当前 " + process.version); process.exit(1) }'
	@for f in $$(find bin src test -name '*.mjs'); do $(NODE) --check $$f || exit 1; done
	$(NODE) --test test/*.test.mjs
	@out=$$(mktemp -d) && $(NODE) bin/build.mjs --out "$$out/dist" && rm -rf "$$out"

dev: ## 构建 dist/ 并在后台起预览 http://localhost:$(PORT)/；可以重复执行（先停掉上一次的）
	@$(NODE) bin/build.mjs
	@if [ -f .dev-server.pid ]; then kill "$$(cat .dev-server.pid)" 2>/dev/null || true; rm -f .dev-server.pid; sleep 0.5; fi
	@nohup $(NODE) bin/serve.mjs --port $(PORT) > .dev-server.log 2>&1 & echo $$! > .dev-server.pid
	@for i in 1 2 3 4 5 6 7 8 9 10; do curl -fsS -o /dev/null http://localhost:$(PORT)/ 2>/dev/null && break; sleep 0.5; done
	@curl -fsS -o /dev/null http://localhost:$(PORT)/ || { cat .dev-server.log >&2; exit 1; }
	@echo "预览：http://localhost:$(PORT)/（停止：kill \$$(cat .dev-server.pid)）"

# 线上是 GitHub Pages（gh-pages 分支）。Pages 发布有延迟、CDN 还有 10 分钟缓存，
# 所以推完要轮询线上的 version.json（带查询参数绕过缓存），换成本次提交才算部署成功：
# 这样 deploy.yml 通知 Planner 时，线上一定已经是新版本。
deploy: ## 发布当前提交到 GitHub Pages，等线上生效；只在 GitHub Actions 里运行
	@test -n "$$GH_TOKEN" || { echo "需要 GH_TOKEN：请在 GitHub Actions 里运行 make deploy" >&2; exit 1; }
	@set -e; sha=$$(git rev-parse HEAD); \
	  GITHUB_SHA=$$sha $(NODE) bin/build.mjs --out dist; \
	  cd dist; git init -q -b gh-pages; git add -A; \
	  git -c user.name='github-actions[bot]' -c user.email='41898282+github-actions[bot]@users.noreply.github.com' \
	    commit -q -m "部署 $$sha"; \
	  git push -q --force "https://x-access-token:$$GH_TOKEN@github.com/$(REPO).git" gh-pages; \
	  echo "已推送 gh-pages，等待 Pages 发布 $$sha"; \
	  for i in $$(seq 1 60); do \
	    live=$$(curl -fsS "$(SITE_URL)/version.json?t=$$(date +%s)" 2>/dev/null | sed -n 's/.*"sha": *"\([0-9a-f]*\)".*/\1/p'); \
	    if [ "$$live" = "$$sha" ]; then echo "线上已是 $$sha：$(SITE_URL)/"; exit 0; fi; \
	    sleep 10; \
	  done; \
	  echo "10 分钟内线上没有更新到 $$sha（现在是 $${live:-无法访问}）" >&2; exit 1
