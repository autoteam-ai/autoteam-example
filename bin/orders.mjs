#!/usr/bin/env node
// orders：订单命令行工具。参数解析和输出在这里，业务逻辑在 src/。
import { fileURLToPath } from 'node:url';
import { loadOrders, formatTable, topOrders, ordersByCustomer, summarizeOrders } from '../src/orders.mjs';

const DEFAULT_FILE = fileURLToPath(new URL('../data/orders.json', import.meta.url));

const HELP = `用法：orders <命令> [选项]

命令：
  list            列出订单
  top <N>         列出金额最高的 N 个订单（N 超过总数时列出全部）
  customer <名字> 列出某个客户的全部订单（大小写不敏感，需完整匹配客户名）

选项：
  --file <路径>  订单文件（默认 data/orders.json）
  -h, --help     显示帮助`;

/** 把订单格式化成 id/date/amount 三列对齐的文本行（customer 命令用，不含表头）。 */
function formatCustomerLines(orders) {
  const rows = orders.map((o) => [o.id, o.date, o.amount.toFixed(2)]);
  const widths = [0, 1, 2].map((i) => Math.max(...rows.map((r) => String(r[i]).length)));
  return rows.map((r) => r.map((c, i) => String(c).padEnd(widths[i])).join('  ').trimEnd());
}

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
  } else if (command === 'customer') {
    if (!args._[1]) {
      console.error('orders：customer 需要一个客户名参数');
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
  } else if (command === 'customer') {
    const matched = ordersByCustomer(orders, args._[1]);
    if (matched.length === 0) {
      console.error(`orders：找不到客户 "${args._[1]}"`);
      process.exitCode = 1;
      return;
    }
    const { count, total } = summarizeOrders(matched);
    console.log(formatCustomerLines(matched).join('\n'));
    console.log(`合计：${count} 笔订单，总金额 ${total.toFixed(2)}`);
  } else {
    console.log(formatTable(orders));
  }
}

main().catch((err) => {
  console.error(`orders：${err.message}`);
  process.exitCode = 1;
});
