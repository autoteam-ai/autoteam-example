#!/usr/bin/env node
// orders：订单命令行工具。参数解析和输出在这里，业务逻辑在 src/。
import { fileURLToPath } from 'node:url';
import { loadOrders, formatTable, isValidDate, filterOrders, toCsv } from '../src/orders.mjs';

const DEFAULT_FILE = fileURLToPath(new URL('../data/orders.json', import.meta.url));

const HELP = `用法：orders <命令> [选项]

命令：
  list          列出订单
  export        按日期范围导出订单为 CSV（输出到 stdout）

选项：
  --file <路径>    订单文件（默认 data/orders.json）
  -h, --help       显示帮助

export 专属选项：
  --from <日期>    起始日期（含），格式 YYYY-MM-DD，必填
  --to <日期>      结束日期（含），格式 YYYY-MM-DD，必填
  --status <状态>  只导出该状态的订单（可选）`;

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
  switch (command) {
    case 'list': {
      const orders = await loadOrders(args.file ?? DEFAULT_FILE);
      console.log(formatTable(orders));
      break;
    }
    case 'export': {
      if (!args.from || !args.to) {
        console.error('export：--from 和 --to 都是必填项（格式 YYYY-MM-DD）');
        process.exitCode = 1;
        return;
      }
      if (!isValidDate(args.from)) {
        console.error(`export：--from 不是合法的日期（YYYY-MM-DD）：${args.from}`);
        process.exitCode = 1;
        return;
      }
      if (!isValidDate(args.to)) {
        console.error(`export：--to 不是合法的日期（YYYY-MM-DD）：${args.to}`);
        process.exitCode = 1;
        return;
      }
      if (args.from > args.to) {
        console.error(`export：--from（${args.from}）不能晚于 --to（${args.to}）`);
        process.exitCode = 1;
        return;
      }
      const orders = await loadOrders(args.file ?? DEFAULT_FILE);
      const filtered = filterOrders(orders, { from: args.from, to: args.to, status: args.status });
      console.log(toCsv(filtered));
      break;
    }
    default:
      console.error(`未知命令：${command}\n\n${HELP}`);
      process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(`orders：${err.message}`);
  process.exitCode = 1;
});
