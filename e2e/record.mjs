#!/usr/bin/env node
// 给一轮 autoteam 版本验证留证据：GitHub 页面截图 + CLI 导出的文本时间线。
//
// 为什么要留：跑完一轮很难凭记忆说清"闸门到底拦住了没有""这个绿勾是这次的还是上次的"。
// 截图记录当时页面上的样子，时间线带 sha 和时间戳，两样合起来能直接对账。
//
// 用法：
//   node e2e/record.mjs --run v0.2.0 --pr 8 --pr 9 --issue HDGCS-21
//   node e2e/record.mjs --login            # 只打开浏览器登录，不截图
//
// 公开仓库不用登录就能截 PR、检查、Release 页面。只有要截 Settings 里的规则集页
// （需要 admin），才先跑一次 --login，登录态存在 e2e/.auth/（已 gitignore）。
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const authDir = join(root, 'e2e', '.auth');

function parseArgs(argv) {
  const out = { prs: [], issues: [], run: null, login: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--run') out.run = argv[++i];
    else if (a === '--pr') out.prs.push(argv[++i]);
    else if (a === '--issue') out.issues.push(argv[++i]);
    else if (a === '--login') out.login = true;
    else if (a === '-h' || a === '--help') out.help = true;
    else throw new Error(`不认识的参数：${a}`);
  }
  return out;
}

const sh = (cmd, args, opts = {}) =>
  execFileSync(cmd, args, { cwd: root, encoding: 'utf8', ...opts }).trim();
const shOrEmpty = (cmd, args) => {
  try {
    return sh(cmd, args, { stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    return '';
  }
};

function conf(key) {
  const line = shOrEmpty('sed', ['-n', `s/^${key}=//p`, 'ops/agents/autoteam.conf']);
  return line.split('\n').pop()?.trim() ?? '';
}

// ---- 文本证据：能 grep、能 diff，判断"是不是这轮跑的"比截图可靠 ----
function collectTimeline({ repo, prs, issues }) {
  const L = [];
  const add = (h, body) => L.push(`## ${h}\n\n${body.trim() || '（无）'}\n`);

  // 被测版本要能唯一定位到一次提交：只写 "0.1.0" 分不清是哪天装的那一版
  const skill = '.claude/skills/autoteam/scripts/autoteam';
  add('被测版本', [
    `- autoteam：${shOrEmpty('bash', [skill, 'version']) || '未安装'}`,
    `- skill 装的是：${shOrEmpty('jq', ['-r', '.skills.autoteam | "\\(.source)@\\(.commit // .version // "?")"', 'skills-lock.json']) || '（没有 skills-lock.json，按上面的版本号算）'}`,
    `- example HEAD：${shOrEmpty('git', ['rev-parse', '--short', 'HEAD'])} ${shOrEmpty('git', ['log', '-1', '--format=%s'])}`,
    `- 记录时间：${new Date().toISOString()}`,
    `- 合并模式：${shOrEmpty('bash', ['ops/agents/scripts/merge-mode.sh'])}`,
  ].join('\n'));

  add('分支上生效的规则', shOrEmpty('gh', [
    'api', `repos/${repo}/rules/branches/${conf('AUTOTEAM_DEFAULT_BRANCH') || 'main'}`,
    '--jq', '[.[] | "- \\(.type)\\(if .parameters.required_approving_review_count != null then "：要求 \\(.parameters.required_approving_review_count) 个审批" else "" end)\\(if .parameters.required_status_checks then "：\\(.parameters.required_status_checks | map(.context) | join(", "))" else "" end)"] | join("\\n")',
  ]));

  for (const n of prs) {
    const meta = shOrEmpty('gh', ['pr', 'view', n, '--repo', repo, '--json',
      'number,title,state,isDraft,mergedAt,mergeCommit,author,createdAt,reviews,statusCheckRollup',
      '--jq', [
        '"- 标题：\\(.title)"',
        '"- 状态：\\(.state)\\(if .isDraft then "（draft）" else "" end)"',
        '"- 开于：\\(.createdAt)  作者：\\(.author.login)"',
        '"- 合并：\\(.mergedAt // "未合并")  \\(.mergeCommit.oid // "")"',
        '"- 检查：\\([.statusCheckRollup[]? | "\\(.name)=\\(.conclusion // .status)"] | join(", "))"',
        '"- 评审：\\([.reviews[]? | "\\(.author.login) \\(.state)"] | join(", "))"',
      ].join(', ')]);
    const events = shOrEmpty('gh', ['pr', 'view', n, '--repo', repo, '--json', 'comments',
      '--jq', '[.comments[]? | "  - \\(.createdAt) \\(.author.login)：\\(.body | split("\\n")[0] | .[0:100])"] | join("\\n")']);
    add(`PR #${n}`, `${meta}\n\n评论：\n${events}`);
  }

  for (const key of issues) {
    const view = shOrEmpty('multica', ['issue', 'view', key]);
    const comments = shOrEmpty('multica', ['issue', 'comment', 'list', key]);
    const runs = shOrEmpty('multica', ['issue', 'runs', key]);
    add(`任务 ${key}`, [view, '', '### 评论', comments, '', '### 运行记录', runs].join('\n'));
  }

  add('Release（这个项目的“线上”）', shOrEmpty('gh', ['release', 'list', '--repo', repo, '--limit', '5']));
  return L.join('\n');
}

// ---- 截图：Playwright 按需加载，不进 package.json 的运行时依赖 ----
async function capture({ repo, prs, outDir, loginOnly }) {
  let chromium;
  try {
    ({ chromium } = await import('playwright'));
  } catch {
    console.error('缺 playwright。先装：npm i -D playwright && npx playwright install chromium');
    process.exit(1);
  }

  // 公开仓库的 PR、检查、Release 页面不登录就能看，所以默认无头直接截。
  // 登录只在两种情况下需要：私有仓库，或者想截 Settings 里的规则集页（要 admin）。
  const ctx = await chromium.launchPersistentContext(authDir, {
    headless: !loginOnly,
    viewport: { width: 1440, height: 900 },
  });
  const page = ctx.pages()[0] ?? (await ctx.newPage());

  if (loginOnly) {
    console.log('\n在弹出的浏览器里登录 GitHub，登录完这里会自动继续（最多等 5 分钟）。\n');
    await page.goto('https://github.com/login', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-login]', { timeout: 300_000 });
    console.log('登录成功，登录态已存在 e2e/.auth/');
    await ctx.close();
    return;
  }

  await page.goto('https://github.com/', { waitUntil: 'domcontentloaded' });
  const logged = (await page.locator('[data-login]').count()) > 0;
  console.log(logged ? '  （已登录，能截 Settings 页）' : '  （未登录，只截公开页面；要截规则集页先跑 --login）');

  const shots = [
    ['releases', `https://github.com/${repo}/releases`, 'Release 列表（这个项目的线上）'],
    ...(logged ? [['rules', `https://github.com/${repo}/settings/rules`, '仓库规则集列表']] : []),
    ...prs.flatMap((n) => [
      [`pr-${n}`, `https://github.com/${repo}/pull/${n}`, `PR #${n} 概览`],
      [`pr-${n}-checks`, `https://github.com/${repo}/pull/${n}/checks`, `PR #${n} 检查`],
    ]),
  ];

  const index = [];
  for (const [name, url, desc] of shots) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      await page.waitForTimeout(1500);
      const file = `${name}.png`;
      await page.screenshot({ path: join(outDir, file), fullPage: true });
      index.push(`- [${desc}](${file}) — ${url}`);
      console.log(`  截图 ${file}`);
    } catch (e) {
      index.push(`- ${desc} — 截图失败：${e.message.split('\n')[0]}`);
      console.error(`  ${name} 失败：${e.message.split('\n')[0]}`);
    }
  }
  await ctx.close();
  return index.join('\n');
}

const args = parseArgs(process.argv.slice(2));
if (args.help) {
  console.log(sh('sed', ['-n', '2,16p', 'e2e/record.mjs']).replace(/^\/\/ ?/gm, ''));
  process.exit(0);
}

const repo = conf('AUTOTEAM_REPO') || sh('gh', ['repo', 'view', '--json', 'nameWithOwner', '--jq', '.nameWithOwner']);

if (args.login) {
  await capture({ repo, prs: [], outDir: null, loginOnly: true });
  process.exit(0);
}
if (!args.run) {
  console.error('要 --run <id>，例如 --run v0.2.0。加 -h 看用法。');
  process.exit(1);
}

const outDir = join(root, 'e2e', 'runs', args.run);
mkdirSync(outDir, { recursive: true });
console.log(`记录到 e2e/runs/${args.run}/`);

const timeline = collectTimeline({ repo, prs: args.prs, issues: args.issues });
writeFileSync(join(outDir, 'timeline.md'), `# ${args.run} 验证记录\n\n${timeline}`);
console.log('  写入 timeline.md');

const shotIndex = await capture({ repo, prs: args.prs, outDir, loginOnly: false });
writeFileSync(join(outDir, 'README.md'), [
  `# ${args.run}`,
  '',
  `${new Date().toISOString()} 在 ${repo} 上跑的一轮 autoteam 验证。`,
  '',
  '## 截图',
  '',
  shotIndex ?? '（无）',
  '',
  '## 详细时间线',
  '',
  '见 [timeline.md](timeline.md)。',
  '',
  '## 结论',
  '',
  '<!-- 跑完自己补：闸门是否生效、发现了什么问题 -->',
  '',
].join('\n'));
console.log('  写入 README.md');
