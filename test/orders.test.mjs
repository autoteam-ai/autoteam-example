import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { loadOrders, formatTable } from '../src/orders.mjs';

const SAMPLE = fileURLToPath(new URL('../data/orders.json', import.meta.url));
const CLI = fileURLToPath(new URL('../bin/orders.mjs', import.meta.url));

test('loadOrders 读取样例数据', async () => {
  const orders = await loadOrders(SAMPLE);
  assert.equal(orders.length, 10);
  assert.deepEqual(Object.keys(orders[0]).sort(), ['amount', 'customer', 'date', 'id', 'status']);
});

test('formatTable 按列对齐，金额保留两位小数', () => {
  const out = formatTable([{ id: 'A1', date: '2026-09-01', customer: 'x', amount: 1, status: 'paid' }]);
  const [header, row] = out.split('\n');
  assert.ok(header.startsWith('id  date'));
  assert.match(row, /^A1\s+2026-09-01\s+x\s+1\.00\s+paid$/);
});

test('orders list 输出表头和全部订单', () => {
  const out = execFileSync(process.execPath, [CLI, 'list'], { encoding: 'utf8' });
  const lines = out.trim().split('\n');
  assert.equal(lines.length, 11);
  assert.ok(lines[0].startsWith('id'));
});

test('未知命令返回非 0', () => {
  assert.throws(() => execFileSync(process.execPath, [CLI, 'nope'], { stdio: 'pipe' }));
});
