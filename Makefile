# orders 示例项目。check / dev / deploy 是 autoteam 约定的三个入口。
.PHONY: check dev deploy

NODE ?= node
FILES := $(shell find bin src test -name '*.mjs')

check: ## 全部检查：语法检查 + 单元测试
	@$(NODE) --version
	@for f in $(FILES); do $(NODE) --check $$f || exit 1; done
	$(NODE) --test test/*.test.mjs

dev: ## 准备本地环境：检查 Node 版本，跑一次冒烟命令（可以重复执行）
	@$(NODE) -e 'if (Number(process.versions.node.split(".")[0]) < 20) { console.error("需要 Node 20 以上"); process.exit(1) }'
	@$(NODE) bin/orders.mjs list > /dev/null && echo "dev 环境就绪：node bin/orders.mjs list"

deploy: ## 发布到 GitHub Release（本项目的“线上”），在 GitHub Actions 里运行
	@test -n "$$GH_TOKEN" || { echo "需要 GH_TOKEN：请在 GitHub Actions 里运行 make deploy" >&2; exit 1; }
	@sha=$$(git rev-parse HEAD); short=$$(git rev-parse --short HEAD); tag="deploy-$$(date -u +%Y%m%d%H%M%S)-$$short"; \
	  mkdir -p dist && tar -czf "dist/orders-$$short.tgz" bin src data package.json README.md && \
	  gh release create "$$tag" "dist/orders-$$short.tgz" --target "$$sha" --title "orders $$short" \
	    --notes "部署提交 $$sha" --latest && echo "已发布 $$tag"
