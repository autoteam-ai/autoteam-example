import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { loadOrders, formatTable, isValidDate, filterOrders, toCsv } from '../src/orders.mjs';

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

test('isValidDate 校验格式和真实存在的日期', () => {
  assert.equal(isValidDate('2026-09-30'), true);
  assert.equal(isValidDate('2026-09-31'), false);
  assert.equal(isValidDate('2026-9-30'), false);
  assert.equal(isValidDate('not-a-date'), false);
  assert.equal(isValidDate(''), false);
});

test('filterOrders 按日期闭区间过滤', () => {
  const orders = [
    { id: 'A', date: '2026-08-30', status: 'paid' },
    { id: 'B', date: '2026-08-31', status: 'paid' },
    { id: 'C', date: '2026-09-30', status: 'paid' },
    { id: 'D', date: '2026-10-01', status: 'paid' },
  ];
  const out = filterOrders(orders, { from: '2026-08-31', to: '2026-09-30' });
  assert.deepEqual(out.map((o) => o.id), ['B', 'C']);
});

test('filterOrders 按 status 精确过滤', () => {
  const orders = [
    { id: 'A', date: '2026-09-01', status: 'paid' },
    { id: 'B', date: '2026-09-02', status: 'pending' },
  ];
  const out = filterOrders(orders, { from: '2026-01-01', to: '2026-12-31', status: 'paid' });
  assert.deepEqual(out.map((o) => o.id), ['A']);
});

test('toCsv 输出表头，金额两位小数', () => {
  const out = toCsv([{ id: 'A1', date: '2026-09-01', customer: 'x', amount: 1, status: 'paid' }]);
  const [header, row] = out.split('\n');
  assert.equal(header, 'id,date,customer,amount,status');
  assert.equal(row, 'A1,2026-09-01,x,1.00,paid');
});

test('toCsv 按 RFC 4180 转义逗号和双引号', () => {
  const out = toCsv([
    { id: 'SO-1002', date: '2026-08-31', customer: 'Acme, Inc.', amount: 89, status: 'paid' },
    { id: 'SO-1005', date: '2026-09-05', customer: 'Bob "The Builder"', amount: 15.99, status: 'refunded' },
  ]);
  const lines = out.split('\n');
  assert.equal(lines[1], 'SO-1002,2026-08-31,"Acme, Inc.",89.00,paid');
  assert.equal(lines[2], 'SO-1005,2026-09-05,"Bob ""The Builder""",15.99,refunded');
});

test('orders export 按日期范围输出 CSV', () => {
  const out = execFileSync(process.execPath, [CLI, 'export', '--from', '2026-08-31', '--to', '2026-09-30'], {
    encoding: 'utf8',
  });
  const lines = out.trim().split('\n');
  assert.equal(lines[0], 'id,date,customer,amount,status');
  assert.equal(lines.length, 9);
});

test('orders export 支持 --status 过滤', () => {
  const out = execFileSync(
    process.execPath,
    [CLI, 'export', '--from', '2026-08-31', '--to', '2026-09-30', '--status', 'paid'],
    { encoding: 'utf8' },
  );
  const lines = out.trim().split('\n');
  assert.equal(lines.length, 6);
  assert.ok(lines.slice(1).every((line) => line.endsWith(',paid')));
});

test('orders export 缺少 --from/--to 报错且非 0 退出', () => {
  assert.throws(() => execFileSync(process.execPath, [CLI, 'export'], { stdio: 'pipe' }));
});

test('orders export 日期不存在时报错且非 0 退出', () => {
  assert.throws(() =>
    execFileSync(process.execPath, [CLI, 'export', '--from', '2026-09-31', '--to', '2026-10-01'], {
      stdio: 'pipe',
    }),
  );
});

test('orders export --from 晚于 --to 时报错且非 0 退出', () => {
  assert.throws(() =>
    execFileSync(process.execPath, [CLI, 'export', '--from', '2026-09-30', '--to', '2026-09-01'], {
      stdio: 'pipe',
    }),
  );
});
