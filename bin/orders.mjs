#!/usr/bin/env node
// orders：订单命令行工具。参数解析和输出在这里，业务逻辑在 src/。
import { fileURLToPath } from 'node:url';
import { loadOrders, formatTable, topOrders } from '../src/orders.mjs';

const DEFAULT_FILE = fileURLToPath(new URL('../data/orders.json', import.meta.url));

const HELP = `用法：orders <命令> [选项]

命令：
  list          列出订单
  top <N>       列出金额最高的 N 个订单（N 超过总数时列出全部）

选项：
  --file <路径>  订单文件（默认 data/orders.json）
  -h, --help     显示帮助`;

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '-h' || arg === '--help') {
      args.help = true;
    } else if (arg.startsWith('--')) {
      args[arg.slice(2)] = argv[i + 1];
      i += 1;
    } else {
      args._.push(arg);
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const [command] = args._;
  if (args.help || !command) {
    console.log(HELP);
    return;
  }
  if (command === 'top') {
    const raw = args._[1];
    const n = Number(raw);
    if (!/^\d+$/.test(raw ?? '') || n <= 0) {
      console.error(`orders：top 需要一个正整数参数，收到 "${raw ?? ''}"`);
      process.exitCode = 1;
      return;
    }
  } else if (command !== 'list') {
    console.error(`未知命令：${command}\n\n${HELP}`);
    process.exitCode = 1;
    return;
  }
  const orders = await loadOrders(args.file ?? DEFAULT_FILE);
  if (command === 'top') {
    console.log(formatTable(topOrders(orders, Number(args._[1]))));
  } else {
    console.log(formatTable(orders));
  }
}

main().catch((err) => {
  console.error(`orders：${err.message}`);
  process.exitCode = 1;
});
