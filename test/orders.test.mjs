import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadOrders, formatTable, topOrders } from '../src/orders.mjs';

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

test('topOrders 按金额降序取前 N 个', async () => {
  const orders = await loadOrders(SAMPLE);
  const top3 = topOrders(orders, 3);
  assert.deepEqual(
    top3.map((o) => o.id),
    ['SO-1007', 'SO-1006', 'SO-1004'],
  );
});

test('topOrders N 等于或超过总数时返回全部', async () => {
  const orders = await loadOrders(SAMPLE);
  assert.equal(topOrders(orders, orders.length).length, orders.length);
  assert.equal(topOrders(orders, orders.length + 5).length, orders.length);
});

test('topOrders 金额相同时按订单号升序排列', () => {
  const orders = [
    { id: 'SO-2', date: '2026-01-01', customer: 'b', amount: 100, status: 'paid' },
    { id: 'SO-1', date: '2026-01-01', customer: 'a', amount: 100, status: 'paid' },
    { id: 'SO-3', date: '2026-01-01', customer: 'c', amount: 50, status: 'paid' },
  ];
  assert.deepEqual(
    topOrders(orders, 3).map((o) => o.id),
    ['SO-1', 'SO-2', 'SO-3'],
  );
});

test('orders top <N> 输出金额最高的 N 个订单', () => {
  const out = execFileSync(process.execPath, [CLI, 'top', '3'], { encoding: 'utf8' });
  const lines = out.trim().split('\n');
  assert.equal(lines.length, 4);
  assert.ok(lines[1].startsWith('SO-1007'));
});

test('orders top <N> 当 N 超过总数时列出全部，不报错', () => {
  const out = execFileSync(process.execPath, [CLI, 'top', '999'], { encoding: 'utf8' });
  const lines = out.trim().split('\n');
  assert.equal(lines.length, 11);
});

for (const bad of ['0', '-1', '1.5', 'abc']) {
  test(`orders top ${bad} 返回非 0 并在 stderr 报错`, () => {
    assert.throws(() => execFileSync(process.execPath, [CLI, 'top', bad], { stdio: 'pipe' }));
  });
}

test('orders top <N> 金额并列时按订单号排序（构造数据文件验证）', () => {
  const dir = mkdtempSync(join(tmpdir(), 'orders-test-'));
  const file = join(dir, 'orders.json');
  writeFileSync(
    file,
    JSON.stringify([
      { id: 'SO-2', date: '2026-01-01', customer: 'b', amount: 100, status: 'paid' },
      { id: 'SO-1', date: '2026-01-01', customer: 'a', amount: 100, status: 'paid' },
    ]),
  );
  const out = execFileSync(process.execPath, [CLI, 'top', '2', '--file', file], { encoding: 'utf8' });
  const lines = out.trim().split('\n');
  assert.ok(lines[1].startsWith('SO-1'));
  assert.ok(lines[2].startsWith('SO-2'));
});

test('--help 输出包含 top 命令说明', () => {
  const out = execFileSync(process.execPath, [CLI, '--help'], { encoding: 'utf8' });
  assert.match(out, /top <N>/);
});
