#!/usr/bin/env node
// 给 autoteam 验证截图。登录态存在 e2e/.auth/（GitHub、Multica 共用一个浏览器配置，已 gitignore）。
//
//   node e2e/shoot.mjs login                               # 有头浏览器，人登录 GitHub 和 Multica 后关掉窗口
//   node e2e/shoot.mjs shot <输出路径> <URL> [选项]          # 无头截一张，路径相对当前目录
//   node e2e/shoot.mjs check <URL>                         # 打印页面标题和最终地址，看登录态是否有效
//
// shot 的选项：
//   --full             整页截图（默认只截视口）
//   --width/--height   视口大小，默认 1440x900
//   --scale            设备像素比，默认 2（文档里缩小显示更清晰）
//   --wait <毫秒>      加载完再等多久，默认 1500（Multica 是 SPA，数据异步加载）
//   --selector <css>   只截这个元素
//   --wait-for <css>   等这个元素出现再截
//   --scroll <css>     先把这个元素滚动到视口里
//   --anon             不带登录态，截公开页面
//   --click <css>      截图前先点这个元素（可重复）
//   --click-at <x,y>   截图前先点这个坐标（按钮没有可用的选择器时用，可重复）
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const here = dirname(fileURLToPath(import.meta.url));
const authDir = join(here, '.auth');

const [cmd, ...rest] = process.argv.slice(2);

async function open({ headless, width = 1440, height = 900, scale = 2, anon = false }) {
  const opts = {
    viewport: { width, height },
    deviceScaleFactor: scale,
    locale: 'zh-CN',
    timezoneId: 'Asia/Shanghai',
    colorScheme: 'light',
  };
  // --anon：不带登录态（公开页面；登录浏览器开着时 .auth/ 被占用也能截）
  if (anon) {
    const browser = await chromium.launch({ headless });
    const ctx = await browser.newContext(opts);
    ctx.on('close', () => browser.close());
    return ctx;
  }
  return chromium.launchPersistentContext(authDir, { headless, ...opts });
}

if (cmd === 'login') {
  const ctx = await open({ headless: false, scale: 1 });
  const gh = ctx.pages()[0] ?? (await ctx.newPage());
  await gh.goto('https://github.com/login');
  const mc = await ctx.newPage();
  await mc.goto('https://multica.ai/');
  console.log('在弹出的浏览器里登录 GitHub 和 Multica，登录完关掉浏览器窗口即可。');
  await new Promise((r) => ctx.on('close', r));
} else if (cmd === 'check') {
  const ctx = await open({ headless: true, scale: 1 });
  const page = await ctx.newPage();
  await page.goto(rest[0], { waitUntil: 'networkidle' }).catch(() => {});
  await page.waitForTimeout(1500);
  console.log(JSON.stringify({ url: page.url(), title: await page.title() }));
  await ctx.close();
} else if (cmd === 'shot') {
  const { values, positionals } = parseArgs({
    args: rest,
    allowPositionals: true,
    options: {
      full: { type: 'boolean', default: false },
      width: { type: 'string', default: '1440' },
      height: { type: 'string', default: '900' },
      scale: { type: 'string', default: '2' },
      wait: { type: 'string', default: '1500' },
      selector: { type: 'string' },
      'wait-for': { type: 'string' },
      scroll: { type: 'string' },
      anon: { type: 'boolean', default: false },
      click: { type: 'string', multiple: true, default: [] },
      'click-at': { type: 'string', multiple: true, default: [] },
    },
  });
  const [file, url] = positionals;
  if (!file || !url) throw new Error('用法：node e2e/shoot.mjs shot <输出路径> <URL> [选项]');
  const out = resolve(file);
  mkdirSync(dirname(out), { recursive: true });
  const ctx = await open({
    headless: true, width: Number(values.width), height: Number(values.height), scale: Number(values.scale),
    anon: values.anon,
  });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'networkidle' }).catch(() => {});
  if (values['wait-for']) await page.waitForSelector(values['wait-for'], { timeout: 20000 });
  await page.waitForTimeout(Number(values.wait));
  for (const sel of values.click) { await page.locator(sel).first().click(); await page.waitForTimeout(800); }
  for (const xy of values['click-at']) {
    const [x, y] = xy.split(',').map(Number);
    await page.mouse.click(x, y);
    await page.waitForTimeout(800);
  }
  if (values.scroll) await page.locator(values.scroll).first().scrollIntoViewIfNeeded();
  if (values.selector) await page.locator(values.selector).first().screenshot({ path: out });
  else await page.screenshot({ path: out, fullPage: values.full });
  console.log(`${out}  ←  ${page.url()}`);
  await ctx.close();
} else {
  console.error('用法：node e2e/shoot.mjs login | check <URL> | shot <输出路径> <URL> [选项]');
  process.exitCode = 1;
}
