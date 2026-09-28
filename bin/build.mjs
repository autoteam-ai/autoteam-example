#!/usr/bin/env node
// 生成静态站点：node bin/build.mjs [--data data/books.json] [--out dist]
import { execFileSync } from 'node:child_process';
import { parseArgs } from 'node:util';
import { build } from '../src/build.mjs';

const { values } = parseArgs({
  options: {
    data: { type: 'string', default: 'data/books.json' },
    out: { type: 'string', default: 'dist' },
  },
});

// GitHub Actions 里用 GITHUB_SHA；本地取当前提交，不在 git 仓库里就是 dev
function currentSha() {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA;
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return 'dev';
  }
}

try {
  const files = await build({ dataFile: values.data, outDir: values.out, sha: currentSha() });
  console.log(`已生成 ${values.out}/：${files.join('、')}`);
} catch (err) {
  console.error(`构建失败：${err.message}`);
  process.exitCode = 1;
}
